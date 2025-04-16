const WebSocket = require('ws');
const sdk = require('node-appwrite');

// Helper to safely stringify JSON
const safeJsonStringify = (obj) => {
     try { return JSON.stringify(obj); }
     catch (e) { console.error(`Stringify Error: ${e.message}`); return null; } // Log error message
};

// Helper to get vote counts for a target
const getVoteCounts = async (databases, databaseId, votesCollectionId, targetId, log, error) => {
    if (!databases || !databaseId || !votesCollectionId || !targetId) {
         const missing = [!databases && 'databases', !databaseId && 'databaseId', !votesCollectionId && 'votesCollectionId', !targetId && 'targetId'].filter(Boolean).join(', ');
         error(`getVoteCounts missing required parameters: ${missing}.`);
         throw new Error("Internal configuration error in getVoteCounts.");
    }
    try {
        log(`Fetching vote counts for targetId: ${targetId}`);
        // Ensure sdk.Query is used correctly
        const upvoteQuery = [sdk.Query.equal('targetId', targetId), sdk.Query.equal('voteType', 'up'), sdk.Query.limit(1)];
        const downvoteQuery = [sdk.Query.equal('targetId', targetId), sdk.Query.equal('voteType', 'down'), sdk.Query.limit(1)];

        // Execute queries concurrently
        const [upvotesResult, downvotesResult] = await Promise.all([
            databases.listDocuments(databaseId, votesCollectionId, upvoteQuery),
            databases.listDocuments(databaseId, votesCollectionId, downvoteQuery)
        ]);

        const counts = {
            upvotes: upvotesResult.total,
            downvotes: downvotesResult.total,
            score: upvotesResult.total - downvotesResult.total,
        };
        log(`Calculated counts for ${targetId}: ${safeJsonStringify(counts)}`);
        return counts;
    } catch (countError) {
        error(`Error fetching vote counts for target ${targetId}: ${countError.message}`);
        if (countError.response) {
            error(`Appwrite vote count error details: ${safeJsonStringify(countError.response)}`);
        }
        // Check for common index errors
        if (countError.message && countError.message.toLowerCase().includes('index not found')) {
             error(`Potential missing index: Ensure indexes exist on 'targetId' and 'voteType' in collection '${votesCollectionId}'.`);
        }
        throw countError; // Re-throw to be caught by the main handler
    }
};


module.exports = async ({ req, res, log, error }) => {
    log('----- produceForumVoteEvent Triggered -----');

    // --- Detailed Request Logging ---
    const eventType = req.headers['x-appwrite-event'];
    log(`Event Type Header: ${eventType || 'Not Found'}`);
    log(`Raw Payload Value: ${req.payload ? req.payload.substring(0, 100) + '...' : '(empty)'}`); // Log snippet

    // --- Appwrite Setup ---
    const client = new sdk.Client();
    const databases = new sdk.Databases(client);
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
    const FORUM_VOTES_COLLECTION_ID = process.env.FORUM_VOTES_COLLECTION_ID;

    // --- Configuration Validation ---
    const missingEnvVars = [
        !APPWRITE_ENDPOINT && 'APPWRITE_ENDPOINT',
        !APPWRITE_PROJECT_ID && 'APPWRITE_PROJECT_ID',
        !APPWRITE_API_KEY && 'APPWRITE_API_KEY',
        !APPWRITE_DATABASE_ID && 'APPWRITE_DATABASE_ID',
        !FORUM_VOTES_COLLECTION_ID && 'FORUM_VOTES_COLLECTION_ID',
        !process.env.FLUVIO_ACCESS_KEY && 'FLUVIO_ACCESS_KEY'
    ].filter(Boolean);

    if (missingEnvVars.length > 0) {
        const errorMsg = `Missing environment variables: ${missingEnvVars.join(', ')}`;
        error(errorMsg);
        return res.json({ success: false, error: `Configuration missing: ${errorMsg}` }, 500);
    }
    client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

    // --- Fluvio Gateway URL & Topic ---
    const FLUVIO_ACCESS_KEY = process.env.FLUVIO_ACCESS_KEY;
    const fluvioGatewayUrl = `wss://infinyon.cloud/wsr/v1/fluvio?access_key=${FLUVIO_ACCESS_KEY}`;
    const FLUVIO_TARGET_TOPIC = 'forum-votes';

    let ws; // WebSocket instance variable

    try {
        // --- Get Document ID and Action from Event Header ---
        const eventParts = eventType?.split('.') ?? [];
        const expectedLength = 7; // databases.db.collections.col.documents.doc.action

        // **** CORRECT INDICES ****
        const documentId = eventParts.length >= expectedLength ? eventParts[5] : null; // Document ID is at index 5
        const action = eventParts.length >= expectedLength ? eventParts[6] : null;     // Action is at index 6
        // ************************

        log(`Attempting to parse event: ${eventType}`);

        if (!documentId || documentId === 'documents' || documentId.length < 5) { // Basic sanity check on ID format
            error(`Could not extract valid document ID from event header: ${eventType}. Extracted ID: '${documentId}'`);
            return res.json({ success: false, error: 'Could not identify document ID from event.' }, 400);
        }

        if (!action || !['create', 'update', 'delete'].includes(action)) {
            error(`Could not extract valid action from event header: ${eventType}. Extracted Action: '${action}'`);
            return res.json({ success: false, error: 'Could not identify action from event.' }, 400);
        }
        log(`Extracted - Document ID: ${documentId}, Action: ${action}`);

        // --- Determine Target Info (Crucial for Vote Events) ---
        let targetId = null;
        let targetType = null;
        let voteDocument = null; // Store fetched/parsed doc

        // 1. Try parsing payload (best case if permissions allow)
        let payloadData = null;
        if (req.payload && typeof req.payload === 'string' && req.payload.trim() !== '') {
             try {
                 payloadData = JSON.parse(req.payload);
                 log(`Successfully parsed req.payload.`);
                 // Check for essential fields from the vote document itself
                 if (payloadData.targetId && payloadData.targetType && payloadData.$id) {
                     targetId = payloadData.targetId;
                     targetType = payloadData.targetType;
                     voteDocument = payloadData; // Store the parsed data
                     log(`Using target info from payload: targetId=${targetId}, targetType=${targetType}`);
                 } else {
                      log('Payload parsed but missing targetId, targetType or $id. Will attempt fetch if needed.');
                 }
             } catch (parseError) {
                 error(`Failed to parse req.payload JSON: ${parseError.message}. Raw snippet: ${req.payload.substring(0,100)}... Will attempt fetch if needed.`);
             }
        } else {
             log('Request payload is missing or empty.');
        }

        // 2. Fetch document if needed (and possible)
        //    - Needed if payload failed or was missing target info
        //    - Possible only if action is NOT 'delete' (can't fetch deleted doc)
        if ((!targetId || !targetType) && action !== 'delete') {
             try {
                 log(`Fetching vote document because payload lacked target info (or failed parse): ${documentId}`);
                 voteDocument = await databases.getDocument(APPWRITE_DATABASE_ID, FORUM_VOTES_COLLECTION_ID, documentId);
                 log(`Fetched vote document successfully.`);
                 targetId = voteDocument.targetId;
                 targetType = voteDocument.targetType;
                 // Validate fetched data
                 if (!targetId || !targetType) {
                      error(`Fetched vote document ${documentId} is missing targetId or targetType.`);
                      // throw new Error('Fetched vote document invalid.'); // Let the final validation catch this
                 }
             } catch (fetchError) {
                 if (fetchError.code === 404) {
                     // This might happen in race conditions or if event delivery is delayed after deletion
                     error(`Vote document ${documentId} not found during fetch (event: ${action}). Cannot determine target. Skipping Fluvio event.`);
                     return res.json({ success: true, message: 'Document not found, skipping event.' });
                 }
                 error(`Error fetching vote document ${documentId}: ${fetchError.message}`);
                 if (fetchError.response) error(`Appwrite fetch error details: ${safeJsonStringify(fetchError.response)}`);
                 throw fetchError; // Rethrow other fetch errors
             }
        } else if (action === 'delete' && (!targetId || !targetType)) {
             // Handle delete when payload was missing/invalid
             // We *cannot* reliably determine the targetId/targetType to update counts.
             error(`Cannot process delete event for vote ${documentId} without targetId/targetType (payload was missing or invalid). Vote counts on the target may become stale until the next vote event for that target.`);
             // We choose to exit gracefully instead of failing, as the vote *was* deleted.
             return res.json({ success: true, message: 'Vote deleted, but count update skipped due to missing target info.' });
        }

        // 3. Final validation of target info
        if (!targetId || !targetType) {
            error(`Could not determine targetId or targetType for vote event (Doc ID: ${documentId}, Action: ${action}).`);
            return res.json({ success: false, error: 'Missing target information for vote.' }, 500);
        }
        log(`Processing vote event - Action: ${action}, Target ID: ${targetId}, Target Type: ${targetType}`);


        // --- Recalculate Vote Counts ---
        // This needs to run regardless of action (create, update, delete)
        // to ensure the target's count is always accurate based on the current state.
        const voteCounts = await getVoteCounts(databases, APPWRITE_DATABASE_ID, FORUM_VOTES_COLLECTION_ID, targetId, log, error);

        // --- Prepare Event Data ---
        const eventData = {
            type: 'vote_update', // Consistent type for consumers
            targetId,
            targetType,
            voteCounts // Send the latest calculated counts
        };
        const eventDataString = safeJsonStringify(eventData);
        if (!eventDataString) {
             error('Failed to stringify vote event data.');
             return res.json({ success: false, error: 'Internal error stringifying vote data.'}, 500);
        }

        // --- Connect and Send via WebSocket ---
        log(`Connecting to Fluvio Gateway via standard WebSocket...`);
        await new Promise((resolve, reject) => {
            let connectionTimeout;
            try {
                ws = new WebSocket(fluvioGatewayUrl);

                ws.on('open', () => {
                    clearTimeout(connectionTimeout);
                    log('WebSocket connection opened to Fluvio Gateway.');
                    try {
                        const messageToSend = `${FLUVIO_TARGET_TOPIC}\n${eventDataString}`;
                        ws.send(messageToSend);
                        log(`Sent vote_update event via WebSocket for target ID: ${targetId}`);
                        ws.close(1000, "Message sent");
                        resolve();
                    } catch (sendError) {
                         error(`WebSocket send error: ${sendError.message}`);
                         if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close(1011, "Send error");
                         reject(sendError);
                    }
                });

                ws.on('error', (err) => {
                    clearTimeout(connectionTimeout);
                    error(`WebSocket error: ${err.message}`);
                    if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close(1011, "WebSocket error");
                    reject(err);
                });

                ws.on('close', (code, reason) => {
                    clearTimeout(connectionTimeout);
                    const reasonString = reason?.toString() || 'No reason provided';
                    log(`WebSocket closed. Code: ${code}, Reason: ${reasonString}`);
                    if (code !== 1000 && code !== 1005 /* No Status Rcvd */) {
                         // Avoid rejecting already settled promise if possible
                         reject(new Error(`WebSocket closed unexpectedly with code ${code}: ${reasonString}`));
                    }
                });

                 connectionTimeout = setTimeout(() => {
                     error("WebSocket connection timed out.");
                     if (ws && ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CLOSING) {
                        ws.terminate();
                        reject(new Error("WebSocket connection timeout"));
                     } else if (ws && ws.readyState === WebSocket.OPEN) {
                         log("Connection timed out but WS was open.");
                     } else {
                        reject(new Error("WebSocket connection timeout (state unknown)."));
                     }
                 }, 10000); // 10 seconds

            } catch (initError) {
                 error(`WebSocket initialization error: ${initError.message}`);
                 reject(initError);
            }
        }); // End of Promise

        log(`Successfully processed vote event for target ${targetId}`);
        return res.json({ success: true, message: 'Vote event sent via WebSocket.' });

    } catch (err) {
        error(`Unhandled Error in produceForumVoteEvent: ${err.message || 'Unknown error'}`);
        if (err.stack) error(err.stack);
        if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            ws.close(1011, "Function error");
        }
        return res.json({ success: false, error: err.message || 'Failed to process vote event.' }, 500);
    }
};