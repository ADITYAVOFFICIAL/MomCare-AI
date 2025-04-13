//produceForumPostEvent/src/index.js

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
    // --- Appwrite Setup ---
    const client = new sdk.Client();
    // No need for Databases service here unless you need to fetch extra data
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

    // --- Configuration Validation ---
    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
        error('Missing Appwrite environment variables (ENDPOINT, PROJECT_ID, API_KEY).');
        return res.json({ success: false, error: 'Appwrite configuration missing.' }, 500);
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
        log('produceForumPostEvent function triggered.');

        if (!req.payload) {
             error('Request payload is missing.');
             return res.json({ success: false, error: 'Missing event payload.' }, 400);
        }
        const payload = JSON.parse(req.payload); // The ForumPost document data
        log(`Processing event for post document ID: ${payload.$id}`);

        // Validate essential fields from the post payload
        if (!payload.$id || !payload.topicId || !payload.userId || !payload.content || !payload.$createdAt) {
            error('Post payload missing essential fields ($id, topicId, userId, content, $createdAt). Payload:', safeJsonStringify(payload));
            return res.json({ success: false, error: 'Missing essential post data in payload.' }, 400);
        }

        // --- Prepare Event Data ---
        // We want to send the full post data so the frontend doesn't need to re-fetch
        const eventData = {
            // type: 'new_post', // Type is implicit via topic/handled by backend consumer
            ...payload // Spread the entire Appwrite document payload
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
                    clearTimeout(connectionTimeout); // Clear timeout on successful open
                    log('WebSocket connection opened to Fluvio Gateway.');
                    try {
                        // Construct the message Fluvio Gateway expects: Topic\nPayload
                        const messageToSend = `${FLUVIO_TARGET_TOPIC}\n${eventDataString}`;
                        ws.send(messageToSend);
                        log(`Sent new_post event via WebSocket for post ID: ${payload.$id}`);
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
                    if (ws && ws.readyState !== WebSocket.CLOSED) ws.close(1011, "WebSocket error");
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
                        ws.terminate();
                     }
                     reject(new Error("WebSocket connection timeout"));
                 }, 10000); // 10 seconds

            } catch (initError) {
                 // Catch errors during WebSocket constructor itself
                 error(`WebSocket initialization error: ${initError.message}`);
                 reject(initError);
            }

        }); // End of Promise

        log(`Successfully processed post event for post ${payload.$id}`);
        return res.json({ success: true, message: 'Post event sent via WebSocket.' });

    } catch (err) {
        error(`Error in produceForumPostEvent: ${err.message || 'Unknown error'}`);
        if (err.stack) error(err.stack);
        // Ensure WS is closed if an error occurred before or during the promise
        if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
            ws.close(1011, "Function error");
        }
        return res.json({ success: false, error: err.message || 'Failed to process post event.' }, 500);
    }
    // No finally block needed for ws.close as it's handled within the promise/catch
};