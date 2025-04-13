// produceForumVoteEvent/src/index.js

const WebSocket = require('ws'); // Use the standard WebSocket client library
const sdk = require('node-appwrite');

// Helper to safely stringify JSON
const safeJsonStringify = (obj) => {
     try { return JSON.stringify(obj); }
     catch (e) {
         // Use console.error directly as 'error' function might not be available here
         console.error("Stringify Error:", e);
         return null;
     }
};

// Helper to get vote counts for a target
// Note: This requires indexes on targetId and voteType in your forumVotes collection
// Pass log/error from the main function context
const getVoteCounts = async (databases, databaseId, votesCollectionId, targetId, log, error) => {
    // Basic validation of inputs to the helper
    if (!databases || !databaseId || !votesCollectionId || !targetId) {
         error("getVoteCounts missing required parameters.");
         throw new Error("Internal configuration error in getVoteCounts.");
    }
    try {
        log(`Fetching vote counts for targetId: ${targetId}`);
        // Count upvotes
        // Use limit(1) to get total count efficiently without fetching all documents
        const upvoteQuery = [sdk.Query.equal('targetId', targetId), sdk.Query.equal('voteType', 'up'), sdk.Query.limit(1)];
        const upvotesResult = await databases.listDocuments(databaseId, votesCollectionId, upvoteQuery);

        // Count downvotes
        const downvoteQuery = [sdk.Query.equal('targetId', targetId), sdk.Query.equal('voteType', 'down'), sdk.Query.limit(1)];
        const downvotesResult = await databases.listDocuments(databaseId, votesCollectionId, downvoteQuery);

        const counts = {
            upvotes: upvotesResult.total,
            downvotes: downvotesResult.total,
            score: upvotesResult.total - downvotesResult.total,
        };
        log(`Calculated counts for ${targetId}: ${safeJsonStringify(counts)}`);
        return counts;
    } catch (countError) {
        error(`Error fetching vote counts for target ${targetId}: ${countError.message}`);
        // Log the specific Appwrite error if available
        if (countError.response) {
            error(`Appwrite vote count error details: ${safeJsonStringify(countError.response)}`);
        }
        throw countError; // Re-throw to be caught by the main handler
    }
};


module.exports = async ({ req, res, log, error }) => {
    log('produceForumVoteEvent function triggered.'); // Log entry immediately

    // --- Detailed Request Logging ---
    const eventType = req.headers['x-appwrite-event']; // Get the specific event header
    log(`Event Type Header: ${eventType}`);
    log(`Raw Payload Type: ${typeof req.payload}`);
    log(`Raw Payload Value: ${req.payload}`); // Log the raw payload

    // --- Appwrite Setup ---
    const client = new sdk.Client();
    const databases = new sdk.Databases(client); // Initialize Databases service
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID; // Need the Database ID
    const FORUM_VOTES_COLLECTION_ID = process.env.FORUM_VOTES_COLLECTION_ID; // Need Votes Collection ID

    // --- Configuration Validation ---
    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_DATABASE_ID || !FORUM_VOTES_COLLECTION_ID) {
        error('Missing Appwrite environment variables (ENDPOINT, PROJECT_ID, API_KEY, DATABASE_ID, FORUM_VOTES_COLLECTION_ID).');
        return res.json({ success: false, error: 'Appwrite configuration missing.' }, 500); // Use 500 for config errors
    }
    client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

    // --- Fluvio Gateway URL & Topic ---
    const FLUVIO_ACCESS_KEY = process.env.FLUVIO_ACCESS_KEY;
    if (!FLUVIO_ACCESS_KEY) {
        error('Missing Fluvio Access Key environment variable.');
        return res.json({ success: false, error: 'Fluvio configuration missing.' }, 500);
    }
    const fluvioGatewayUrl = `wss://infinyon.cloud/wsr/v1/fluvio?access_key=${FLUVIO_ACCESS_KEY}`;
    const FLUVIO_TARGET_TOPIC = 'forum-votes'; // Correct topic for vote events

    let ws; // WebSocket instance variable

    try {
        // --- Get Document ID and Action from Event Header ---
        // Example event: databases.[DB_ID].collections.[COLL_ID].documents.[DOC_ID].[ACTION]
        const eventParts = eventType?.split('.') ?? [];
        // Correct indices: ID is at index 4, Action is at index 5
        const documentId = eventParts.length > 4 ? eventParts[4] : null;
        const action = eventParts.length > 5 ? eventParts[5] : null;

        if (!documentId) {
            error(`Could not extract document ID from event header: ${eventType}`);
            return res.json({ success: false, error: 'Could not identify document from event.' }, 400);
        }
        log(`Extracted document ID: ${documentId}, Action: ${action}`);


        // --- Fetch Document Data or Handle Delete ---
        let targetId;
        let targetType;
        let voteDocument; // Keep track of the fetched/parsed document if available

        // Try parsing payload first, as it *should* be there if permissions are correct
        let payload;
        if (req.payload && typeof req.payload === 'string' && req.payload.trim() !== '') {
             try {
                 payload = JSON.parse(req.payload);
                 log(`Successfully parsed req.payload: ${safeJsonStringify(payload)}`);
                 // If payload exists and has the needed info, use it directly
                 if (payload.targetId && payload.targetType) {
                     targetId = payload.targetId;
                     targetType = payload.targetType;
                     voteDocument = payload; // Use payload as the source document info
                     log(`Using target info from payload: targetId=${targetId}, targetType=${targetType}`);
                 } else {
                      log('Payload parsed but missing targetId or targetType. Will attempt fetch.');
                 }
             } catch (parseError) {
                 error(`Failed to parse req.payload JSON: ${parseError.message}. Raw: ${req.payload}. Will attempt fetch.`);
                 // Continue to fetch attempt
             }
        } else {
             log('Request payload is missing or empty. Will attempt fetch.');
        }


        // If target info wasn't in the payload, fetch the document (unless it's a delete event)
        if ((!targetId || !targetType) && action !== 'delete') {
             try {
                 log(`Fetching vote document because payload lacked target info: ${documentId}`);
                 voteDocument = await databases.getDocument(APPWRITE_DATABASE_ID, FORUM_VOTES_COLLECTION_ID, documentId);
                 log(`Fetched vote document: ${safeJsonStringify(voteDocument)}`);
                 targetId = voteDocument.targetId;
                 targetType = voteDocument.targetType;
             } catch (fetchError) {
                 if (fetchError.code === 404) {
                     error(`Vote document ${documentId} not found during fetch. Skipping Fluvio event.`);
                     return res.json({ success: true, message: 'Document not found, skipping event.' });
                 }
                 error(`Error fetching vote document ${documentId}: ${fetchError.message}`);
                 throw fetchError; // Rethrow other fetch errors
             }
        } else if (action === 'delete' && (!targetId || !targetType)) {
             // Handle delete when payload was missing - This is the difficult case
             error(`Cannot process delete event ${documentId} without targetId/targetType (payload was empty). Cannot update counts accurately.`);
             // Option: You could try parsing the event string, but it's brittle.
             // Example (FRAGILE - USE WITH CAUTION):
             // const dbIdPattern = /databases\.(\w+)\./;
             // const collIdPattern = /collections\.(\w+)\./;
             // const docIdPattern = /documents\.(\w+)\./;
             // const dbMatch = eventType.match(dbIdPattern);
             // const collMatch = eventType.match(collIdPattern);
             // const docMatch = eventType.match(docIdPattern);
             // log(`Attempting to parse event string: DB=${dbMatch?.[1]}, Coll=${collMatch?.[1]}, Doc=${docMatch?.[1]}`);
             // If you previously stored targetId/Type elsewhere upon vote creation, fetch that instead.
             return res.json({ success: false, error: 'Cannot process delete event without payload or alternative target info.' }, 400);
        }

        // Final validation that we have the target info
        if (!targetId || !targetType) {
            error('Could not determine targetId or targetType for the vote event after fetch attempt.');
            return res.json({ success: false, error: 'Missing target information for vote.' }, 500);
        }
        log(`Processing vote event for target ID: ${targetId}, target type: ${targetType}`);


        // --- Recalculate Vote Counts ---
        const voteCounts = await getVoteCounts(databases, APPWRITE_DATABASE_ID, FORUM_VOTES_COLLECTION_ID, targetId, log, error);

        // --- Prepare Event Data for Fluvio ---
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
                        ws.close(1000, "Message sent"); // Close normally after sending
                        resolve(); // Success
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
                    if (code !== 1000 && code !== 1005 /* No Status Received */) {
                         reject(new Error(`WebSocket closed unexpectedly with code ${code}: ${reasonString}`));
                    }
                    // If resolved previously in 'open', this is fine.
                });

                 // Timeout for the connection attempt
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