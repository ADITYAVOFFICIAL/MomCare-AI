// produceForumVoteEvent/src/index.js

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
    log(`Raw Payload Value: ${req.payload || '(empty)'}`); // Log the raw payload

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
        error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
        return res.json({ success: false, error: `Appwrite/Fluvio configuration missing: ${missingEnvVars.join(', ')}` }, 500);
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
        const documentId = eventParts.length > 4 ? eventParts[4] : null;
        const action = eventParts.length > 5 ? eventParts[5] : null;

        if (!documentId || documentId === 'documents') { // Check for the specific incorrect extraction
            error(`Could not extract valid document ID from event header: ${eventType}. Extracted: '${documentId}'`);
            return res.json({ success: false, error: 'Could not identify document from event.' }, 400);
        }
        if (!action) {
            error(`Could not extract action from event header: ${eventType}`);
             return res.json({ success: false, error: 'Could not identify action from event.' }, 400);
        }
        log(`Extracted document ID: ${documentId}, Action: ${action}`);

        // --- Determine Target Info ---
        let targetId;
        let targetType;
        let voteDocument; // Store fetched/parsed doc

        // 1. Try parsing payload (best case if permissions are fixed)
        let payload;
        if (req.payload && typeof req.payload === 'string' && req.payload.trim() !== '') {
             try {
                 payload = JSON.parse(req.payload);
                 log(`Successfully parsed req.payload.`);
                 if (payload.targetId && payload.targetType) {
                     targetId = payload.targetId;
                     targetType = payload.targetType;
                     voteDocument = payload;
                     log(`Using target info from payload: targetId=${targetId}, targetType=${targetType}`);
                 } else {
                      log('Payload parsed but missing targetId or targetType. Will attempt fetch.');
                 }
             } catch (parseError) {
                 error(`Failed to parse req.payload JSON: ${parseError.message}. Raw: ${req.payload}. Will attempt fetch.`);
             }
        } else {
             log('Request payload is missing or empty. Will attempt fetch.');
        }

        // 2. Fetch document if needed (and not a delete action where payload was missing)
        if ((!targetId || !targetType) && action !== 'delete') {
             try {
                 log(`Fetching vote document because payload lacked target info: ${documentId}`);
                 voteDocument = await databases.getDocument(APPWRITE_DATABASE_ID, FORUM_VOTES_COLLECTION_ID, documentId);
                 log(`Fetched vote document successfully.`);
                 targetId = voteDocument.targetId;
                 targetType = voteDocument.targetType;
             } catch (fetchError) {
                 if (fetchError.code === 404) {
                     error(`Vote document ${documentId} not found during fetch (event: ${action}). Skipping Fluvio event.`);
                     return res.json({ success: true, message: 'Document not found, skipping event.' });
                 }
                 error(`Error fetching vote document ${documentId}: ${fetchError.message}`);
                 throw fetchError; // Rethrow other fetch errors
             }
        } else if (action === 'delete' && (!targetId || !targetType)) {
             // Handle delete when payload was missing
             error(`Cannot process delete event ${documentId} without targetId/targetType (payload was empty). Cannot update counts accurately.`);
             return res.json({ success: false, error: 'Cannot process delete event without payload.' }, 400);
        }

        // 3. Final validation
        if (!targetId || !targetType) {
            error('Could not determine targetId or targetType for the vote event after fetch attempt.');
            return res.json({ success: false, error: 'Missing target information for vote.' }, 500);
        }
        log(`Processing vote event for target ID: ${targetId}, target type: ${targetType}`);


        // --- Recalculate Vote Counts ---
        const voteCounts = await getVoteCounts(databases, APPWRITE_DATABASE_ID, FORUM_VOTES_COLLECTION_ID, targetId, log, error);

        // --- Prepare Event Data ---
        const eventData = { type: 'vote_update', targetId, targetType, voteCounts };
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
                         if (ws && ws.readyState !== WebSocket.CLOSED) ws.close(1011, "Send error");
                         reject(sendError);
                    }
                });

                ws.on('error', (err) => {
                    clearTimeout(connectionTimeout);
                    error(`WebSocket error: ${err.message}`);
                    if (ws && ws.readyState !== WebSocket.CLOSED) ws.close(1011, "WebSocket error");
                    reject(err);
                });

                ws.on('close', (code, reason) => {
                    clearTimeout(connectionTimeout);
                    const reasonString = reason?.toString() || 'No reason provided';
                    log(`WebSocket closed. Code: ${code}, Reason: ${reasonString}`);
                    if (code !== 1000 && code !== 1005) {
                         reject(new Error(`WebSocket closed unexpectedly with code ${code}: ${reasonString}`));
                    }
                });

                 connectionTimeout = setTimeout(() => {
                     error("WebSocket connection timed out.");
                     if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                        ws.terminate();
                     }
                     reject(new Error("WebSocket connection timeout"));
                 }, 10000); // 10 seconds

            } catch (initError) {
                 error(`WebSocket initialization error: ${initError.message}`);
                 reject(initError);
            }
        }); // End of Promise

        log(`Successfully processed vote event for target ${targetId}`);
        return res.json({ success: true, message: 'Vote event sent via WebSocket.' });

    } catch (err) {
        error(`Error in produceForumVoteEvent: ${err.message || 'Unknown error'}`);
        if (err.stack) error(err.stack);
        if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            ws.close(1011, "Function error");
        }
        return res.json({ success: false, error: err.message || 'Failed to process vote event.' }, 500);
    }
};