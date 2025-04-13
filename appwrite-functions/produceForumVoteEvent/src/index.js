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
    if (!databases || !databaseId || !votesCollectionId || !targetId) {
         error("getVoteCounts missing required parameters.");
         throw new Error("Internal configuration error in getVoteCounts.");
    }
    try {
        log(`Fetching vote counts for targetId: ${targetId}`);
        // Count upvotes
        const upvoteQuery = [sdk.Query.equal('targetId', targetId), sdk.Query.equal('voteType', 'up'), sdk.Query.limit(1)]; // limit(1) gets total count efficiently
        const upvotesResult = await databases.listDocuments(databaseId, votesCollectionId, upvoteQuery);

        // Count downvotes
        const downvoteQuery = [sdk.Query.equal('targetId', targetId), sdk.Query.equal('voteType', 'down'), sdk.Query.limit(1)]; // limit(1) gets total count efficiently
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
        throw countError; // Re-throw to be caught by the main handler
    }
};


module.exports = async ({ req, res, log, error }) => {
    log('produceForumVoteEvent function triggered.'); // Log entry immediately

    // --- Detailed Request Logging ---
    log(`Request Method: ${req.method}`);
    log(`Request Headers: ${safeJsonStringify(req.headers)}`);
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
        // --- Payload Parsing and Validation ---
        let payload;
        if (req.payload && typeof req.payload === 'string' && req.payload.trim() !== '') {
            try {
                payload = JSON.parse(req.payload);
                log(`Parsed Payload: ${safeJsonStringify(payload)}`);
            } catch (parseError) {
                error(`Failed to parse req.payload JSON: ${parseError.message}. Raw payload: ${req.payload}`);
                return res.json({ success: false, error: 'Invalid event payload format.' }, 400);
            }
        } else {
            // Handle cases where payload might be missing for certain events (like delete?)
            // For votes, we generally expect a payload on create/update/delete
            error('Request payload is missing, empty, or not a string.');
            return res.json({ success: false, error: 'Missing event payload.' }, 400);
        }

        // Validate essential fields *after* successful parsing
        // These fields are expected from the vote document itself
        if (!payload || !payload.$id || !payload.targetId || !payload.targetType || !payload.userId) {
            error('Parsed payload missing essential fields ($id, targetId, targetType, userId).');
            return res.json({ success: false, error: 'Missing essential vote data in payload.' }, 400);
        }
        log(`Processing valid vote event for vote ID: ${payload.$id}, target ID: ${payload.targetId}`);

        const targetId = payload.targetId;
        const targetType = payload.targetType;

        // --- Recalculate Vote Counts ---
        // This ensures the broadcasted message reflects the *current* state after the change
        const voteCounts = await getVoteCounts(databases, APPWRITE_DATABASE_ID, FORUM_VOTES_COLLECTION_ID, targetId, log, error);

        // --- Prepare Event Data for Fluvio ---
        const eventData = {
            type: 'vote_update', // Explicitly set type for frontend consumer
            targetId: targetId,
            targetType: targetType,
            voteCounts: voteCounts, // Send the newly calculated counts
        };
        const eventDataString = safeJsonStringify(eventData);
        if (!eventDataString) {
             error('Failed to stringify vote event data.');
             return res.json({ success: false, error: 'Internal error stringifying vote data.'}, 500);
        }

        // --- Connect and Send via WebSocket ---
        log(`Connecting to Fluvio Gateway via standard WebSocket: ${fluvioGatewayUrl}`);

        await new Promise((resolve, reject) => {
            let connectionTimeout;
            try {
                ws = new WebSocket(fluvioGatewayUrl);

                ws.on('open', () => {
                    clearTimeout(connectionTimeout); // Clear timeout on successful open
                    log('WebSocket connection opened to Fluvio Gateway.');
                    try {
                        // Construct the message Fluvio Gateway expects: Topic\nPayload
                        const messageToSend = `${FLUVIO_TARGET_TOPIC}\n${eventDataString}`;
                        ws.send(messageToSend);
                        log(`Sent vote_update event via WebSocket for target ID: ${targetId}`);
                        // Close connection after sending
                        ws.close(1000, "Message sent");
                        resolve(); // Resolve the promise on successful send
                    } catch (sendError) {
                         error(`WebSocket send error: ${sendError.message}`);
                         if (ws && ws.readyState !== WebSocket.CLOSED) ws.close(1011, "Send error");
                         reject(sendError); // Reject the promise
                    }
                });

                ws.on('error', (err) => {
                    clearTimeout(connectionTimeout);
                    error(`WebSocket error: ${err.message}`);
                    // Ensure close is attempted even on error before open
                    if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                       ws.close(1011, "WebSocket error");
                    }
                    reject(err); // Reject the promise
                });

                ws.on('close', (code, reason) => {
                    clearTimeout(connectionTimeout);
                    const reasonString = reason?.toString() || 'No reason provided';
                    log(`WebSocket closed. Code: ${code}, Reason: ${reasonString}`);
                    // If the promise wasn't resolved (e.g., closed before open/send), reject it.
                    // If code is not 1000 (Normal Closure), consider it an error.
                    if (code !== 1000 && code !== 1005 /* No Status Received */) {
                         // Avoid rejecting if already resolved/rejected
                         // A simple check might be needed if the promise could resolve *and* close fires later
                         reject(new Error(`WebSocket closed unexpectedly with code ${code}: ${reasonString}`));
                    }
                    // If resolved previously in 'open', this is fine.
                });

                 // Timeout for the connection attempt
                 connectionTimeout = setTimeout(() => {
                     error("WebSocket connection timed out.");
                     if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                        ws.terminate(); // Force close
                     }
                     reject(new Error("WebSocket connection timeout"));
                 }, 10000); // 10 second timeout

            } catch (initError) {
                 // Catch errors during WebSocket constructor itself
                 error(`WebSocket initialization error: ${initError.message}`);
                 reject(initError);
            }

        }); // End of Promise

        log(`Successfully processed vote event for target ${targetId}`);
        return res.json({ success: true, message: 'Vote event sent via WebSocket.' });

    } catch (err) {
        error(`Error in produceForumVoteEvent: ${err.message || 'Unknown error'}`);
        if (err.stack) error(err.stack);
        // Ensure WS is closed if an error occurred before or during the promise
        if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            ws.close(1011, "Function error");
        }
        // Return 500 for internal errors during processing
        return res.json({ success: false, error: err.message || 'Failed to process vote event.' }, 500);
    }
    // No finally block needed for ws.close as it's handled within the promise/catch
};