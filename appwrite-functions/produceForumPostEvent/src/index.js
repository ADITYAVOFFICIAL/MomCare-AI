const WebSocket = require('ws');
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
    log('----- produceForumPostEvent Triggered -----'); // Clearer entry log

    // --- Detailed Request Logging ---
    const eventType = req.headers['x-appwrite-event']; // Get the specific event header
    log(`Event Type Header: ${eventType || 'Not Found'}`);
    log(`Raw Payload Type: ${typeof req.payload}`);
    log(`Raw Payload Value: ${req.payload ? req.payload.substring(0, 100) + '...' : '(empty)'}`); // Log snippet

    // --- Appwrite Setup ---
    const client = new sdk.Client();
    const databases = new sdk.Databases(client); // Initialize Databases service
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
    const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
    const FORUM_POSTS_COLLECTION_ID = process.env.FORUM_POSTS_COLLECTION_ID;

    // --- Configuration Validation ---
    const missingEnvVars = [
        !APPWRITE_ENDPOINT && 'APPWRITE_ENDPOINT',
        !APPWRITE_PROJECT_ID && 'APPWRITE_PROJECT_ID',
        !APPWRITE_API_KEY && 'APPWRITE_API_KEY',
        !APPWRITE_DATABASE_ID && 'APPWRITE_DATABASE_ID',
        !FORUM_POSTS_COLLECTION_ID && 'FORUM_POSTS_COLLECTION_ID',
        !process.env.FLUVIO_ACCESS_KEY && 'FLUVIO_ACCESS_KEY' // Added Fluvio key check
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
    const FLUVIO_TARGET_TOPIC = 'forum-posts'; // Correct topic for post events

    let ws; // WebSocket instance variable

    try {
        // --- Get Document ID and Action from Event Header ---
        // Example event: databases.[DB_ID].collections.[COLL_ID].documents.[DOC_ID].[ACTION]
        const eventParts = eventType?.split('.') ?? [];
        const expectedLength = 7; // databases.db.collections.col.documents.doc.action

        // **** CORRECT INDICES ****
        const documentId = eventParts.length >= expectedLength ? eventParts[5] : null; // Document ID is at index 5
        const action = eventParts.length >= expectedLength ? eventParts[6] : null;     // Action is at index 6
        // ************************

        log(`Attempting to parse event: ${eventType}`); // Log the full event string

        if (!documentId || documentId === 'documents' || documentId.length < 5) { // Basic sanity check on ID format
            error(`Could not extract valid document ID from event header: ${eventType}. Extracted ID: '${documentId}'`);
            return res.json({ success: false, error: 'Could not identify document ID from event.' }, 400);
        }

        if (!action || !['create', 'update', 'delete'].includes(action)) {
            error(`Could not extract valid action from event header: ${eventType}. Extracted Action: '${action}'`);
            return res.json({ success: false, error: 'Could not identify action from event.' }, 400);
        }

        log(`Extracted - Document ID: ${documentId}, Action: ${action}`);

        // --- This function only reacts to 'create' events for posts ---
        if (action !== 'create') {
             log(`Ignoring event action '${action}' for produceForumPostEvent (only handling 'create').`);
             return res.json({ success: true, message: `Ignoring action: ${action}` });
        }

        // --- Handle Payload vs. Fetch ---
        let postDocument;
        let payloadData = null;

        // 1. Try parsing payload
        if (req.payload && typeof req.payload === 'string' && req.payload.trim() !== '') {
             try {
                 payloadData = JSON.parse(req.payload);
                 log('Successfully parsed req.payload for post event.');
                 // Basic validation of payload data
                 if (payloadData.$id && payloadData.topicId && payloadData.userId && payloadData.content) {
                      log(`Using post data from payload for ID: ${payloadData.$id}`);
                      postDocument = payloadData;
                 } else {
                      log('Payload parsed but missing essential fields (e.g., $id, topicId, userId, content). Will attempt fetch.');
                      payloadData = null; // Clear invalid payload
                 }
             } catch (parseError) {
                 error(`Failed to parse req.payload JSON: ${parseError.message}. Raw snippet: ${req.payload.substring(0,100)}... Will attempt fetch.`);
             }
        } else {
            log('Request payload is missing or empty. Will attempt fetch.');
        }

        // 2. Fetch manually ONLY if payload wasn't available or valid
        if (!postDocument) {
             try {
                 log(`Fetching post document manually: ${documentId}`);
                 postDocument = await databases.getDocument(APPWRITE_DATABASE_ID, FORUM_POSTS_COLLECTION_ID, documentId);
                 log(`Fetched post document successfully.`);
             } catch (fetchError) {
                 error(`Error fetching post document ${documentId}: ${fetchError.message}`);
                 if (fetchError.response) {
                      error(`Appwrite fetch error details: ${safeJsonStringify(fetchError.response)}`);
                 }
                 // If fetch fails even on create, likely permissions or config issue
                 throw fetchError; // Rethrow fetch errors to be caught by the main handler
             }
        }

        // --- Validate Final Document ---
        // Ensure the document (from payload or fetch) has the necessary fields
        if (!postDocument || !postDocument.$id || !postDocument.topicId || !postDocument.userId || !postDocument.content || !postDocument.$createdAt) {
            error('Post document data is invalid or missing essential fields ($id, topicId, userId, content, $createdAt) after payload check and fetch attempt.');
            return res.json({ success: false, error: 'Fetched or parsed post data invalid.' }, 500); // Internal error state
        }
        log(`Processing valid 'create' event for post ID: ${postDocument.$id}`);

        // --- Prepare Event Data ---
        // Use the final postDocument data as the payload
        const eventData = {
            // Type is implicit via topic/handled by backend consumer
            ...postDocument // Spread the entire Appwrite document payload
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
                         if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) ws.close(1011, "Send error");
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
                    // Check if the promise was already settled
                    // If code is not 1000 (Normal Closure), consider it an error only if not already handled
                    if (code !== 1000 && code !== 1005 /* No Status Received */) {
                        // This might reject an already settled promise, which is generally okay but noisy.
                        // A more complex state machine could track if resolved/rejected already.
                        reject(new Error(`WebSocket closed unexpectedly with code ${code}: ${reasonString}`));
                    }
                    // If resolved previously in 'open', this is fine.
                });

                 // Timeout for the connection attempt
                 connectionTimeout = setTimeout(() => {
                     error("WebSocket connection timed out.");
                     if (ws && ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CLOSING) {
                        ws.terminate(); // Force close if stuck connecting
                        reject(new Error("WebSocket connection timeout"));
                     } else if (ws && ws.readyState === WebSocket.OPEN) {
                        log("Connection timed out but WS was open (likely send/close issue).");
                        // Might have already been handled by send error or close event
                     } else {
                         reject(new Error("WebSocket connection timeout (state unknown)."));
                     }
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
        error(`Unhandled Error in produceForumPostEvent: ${err.message || 'Unknown error'}`);
        if (err.stack) error(err.stack);
        // Ensure WS is closed if an error occurred before or during the promise
        if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            ws.close(1011, "Function error");
        }
        // Return 500 for internal errors during processing
        return res.json({ success: false, error: err.message || 'Failed to process post event.' }, 500);
    }
};