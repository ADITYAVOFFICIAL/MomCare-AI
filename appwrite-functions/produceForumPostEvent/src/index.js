// produceForumPostEvent/src/index.js

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

module.exports = async ({ req, res, log, error }) => {
    log('produceForumPostEvent function triggered.'); // Log entry immediately

    // --- Detailed Request Logging ---
    const eventType = req.headers['x-appwrite-event'];
    log(`Event Type: ${eventType}`);
    log(`Raw Payload Type: ${typeof req.payload}`);
    log(`Raw Payload Value: ${req.payload}`); // Log the raw payload

    // --- Appwrite Setup ---
    const client = new sdk.Client();
    const databases = new sdk.Databases(client); // Initialize Databases service
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID; // Need the Database ID
    const FORUM_POSTS_COLLECTION_ID = process.env.FORUM_POSTS_COLLECTION_ID; // Need Posts Collection ID

    // --- Configuration Validation ---
    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY || !APPWRITE_DATABASE_ID || !FORUM_POSTS_COLLECTION_ID) {
        error('Missing Appwrite environment variables (ENDPOINT, PROJECT_ID, API_KEY, DATABASE_ID, FORUM_POSTS_COLLECTION_ID).');
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
    const FLUVIO_TARGET_TOPIC = 'forum-posts'; // Correct topic for post events

    let ws; // WebSocket instance variable

    try {
        // --- Get Document ID from Event Header ---
        // Example event: databases.[DB_ID].collections.[COLL_ID].documents.[DOC_ID].create
        const eventParts = eventType?.split('.') ?? [];
        const documentId = eventParts.length >= 5 ? eventParts[4] : null;
        const action = eventParts.length >= 6 ? eventParts[5] : null; // create, update, delete

        // This function should only react to 'create' events for posts
        if (action !== 'create') {
             log(`Ignoring event action '${action}' for produceForumPostEvent.`);
             return res.json({ success: true, message: `Ignoring action: ${action}` });
        }

        if (!documentId) {
            error(`Could not extract document ID from event header: ${eventType}`);
            return res.json({ success: false, error: 'Could not identify document from event.' }, 400);
        }
        log(`Extracted document ID from event: ${documentId}`);

        // --- Fetch the Post Document Manually ---
        // Since the payload might be missing, fetch the document using the ID
        let postDocument;
        try {
            log(`Fetching post document: ${documentId}`);
            postDocument = await databases.getDocument(APPWRITE_DATABASE_ID, FORUM_POSTS_COLLECTION_ID, documentId);
            log(`Fetched post document successfully.`); // Don't log full content unless debugging
        } catch (fetchError) {
            error(`Error fetching post document ${documentId}: ${fetchError.message}`);
            // If fetch fails even on create, something is wrong (permissions, timing?)
            if (fetchError.response) {
                 error(`Appwrite fetch error details: ${safeJsonStringify(fetchError.response)}`);
            }
            throw fetchError; // Rethrow fetch errors to be caught by the main handler
        }

        // --- Validate Fetched Document ---
        // Ensure the fetched document has the necessary fields
        if (!postDocument || !postDocument.$id || !postDocument.topicId || !postDocument.userId || !postDocument.content || !postDocument.$createdAt) {
            error('Fetched post document missing essential fields ($id, topicId, userId, content, $createdAt).');
            return res.json({ success: false, error: 'Fetched post data invalid.' }, 500); // Internal error state
        }
        log(`Processing valid post event for post ID: ${postDocument.$id}`);

        // --- Prepare Event Data ---
        // Use the fetched document data as the payload
        const eventData = {
            // type: 'new_post', // Type is implicit via topic/handled by backend consumer
            ...postDocument // Spread the entire fetched Appwrite document payload
        };
        const eventDataString = safeJsonStringify(eventData);
        if (!eventDataString) {
             error('Failed to stringify post event data.');
             return res.json({ success: false, error: 'Internal error stringifying post data.'}, 500);
        }

        // --- Connect and Send via WebSocket ---
        log(`Connecting to Fluvio Gateway via standard WebSocket: ${fluvioGatewayUrl}`);

        await new Promise((resolve, reject) => {
            let connectionTimeout;
            try {
                ws = new WebSocket(fluvioGatewayUrl);

                ws.on('open', () => {
                    clearTimeout(connectionTimeout);
                    log('WebSocket connection opened to Fluvio Gateway.');
                    try {
                        // Construct the message Fluvio Gateway expects: Topic\nPayload
                        const messageToSend = `${FLUVIO_TARGET_TOPIC}\n${eventDataString}`;
                        ws.send(messageToSend);
                        log(`Sent new_post event via WebSocket for post ID: ${postDocument.$id}`);
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
                    // If code is not 1000 (Normal Closure), consider it an error if not already handled
                    if (code !== 1000 && code !== 1005 /* No Status Received */) {
                         // Avoid rejecting if already resolved/rejected
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
                 }, 10000); // 10 seconds

            } catch (initError) {
                 // Catch errors during WebSocket constructor itself
                 error(`WebSocket initialization error: ${initError.message}`);
                 reject(initError);
            }

        }); // End of Promise

        log(`Successfully processed post event for post ${postDocument.$id}`);
        return res.json({ success: true, message: 'Post event sent via WebSocket.' });

    } catch (err) {
        error(`Error in produceForumPostEvent: ${err.message || 'Unknown error'}`);
        if (err.stack) error(err.stack);
        // Ensure WS is closed if an error occurred before or during the promise
        if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            ws.close(1011, "Function error");
        }
        // Return 500 for internal errors during processing
        return res.json({ success: false, error: err.message || 'Failed to process post event.' }, 500);
    }
};