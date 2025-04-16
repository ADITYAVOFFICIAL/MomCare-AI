/**
 * Appwrite Function: produceForumPostEvent
 *
 * Triggered by: Creation of documents in the Forum Posts collection.
 * Purpose:
 *   1. Receives the event trigger for a new forum post.
 *   2. Extracts the new post's data (either from payload or by fetching).
 *   3. Sends the complete post data to a Fluvio topic ('forum-posts') via WebSocket Gateway.
 *   4. The backend service consumes this Fluvio topic and broadcasts the new post
 *      to connected WebSocket clients (frontend).
 */

const WebSocket = require('ws'); // Standard WebSocket client
const sdk = require('node-appwrite'); // Appwrite Node SDK

// Helper function to safely stringify JSON objects, preventing crashes
const safeJsonStringify = (obj) => {
     try {
         return JSON.stringify(obj);
     } catch (e) {
         // Use console.error as the 'error' function might not be available here
         console.error(`Stringify Error: ${e.message}`);
         return null; // Return null if stringification fails
     }
};

// Main function entry point for Appwrite execution
module.exports = async ({ req, res, log, error }) => {
    log('----- produceForumPostEvent Triggered -----'); // Clear entry log

    // --- Log Request Details for Debugging ---
    const eventType = req.headers['x-appwrite-event']; // The event that triggered the function
    log(`Event Type Header: ${eventType || 'Not Found'}`);
    log(`Raw Payload Type: ${typeof req.payload}`);
    // Log only a snippet of the payload to avoid excessively long logs
    log(`Raw Payload Value: ${req.payload ? req.payload.substring(0, 150) + (req.payload.length > 150 ? '...' : '') : '(empty)'}`);

    // --- Initialize Appwrite SDK ---
    const client = new sdk.Client();
    const databases = new sdk.Databases(client);

    // --- Retrieve Environment Variables ---
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY; // Needs read access to the posts collection
    const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
    const FORUM_POSTS_COLLECTION_ID = process.env.FORUM_POSTS_COLLECTION_ID;
    const FLUVIO_ACCESS_KEY = process.env.FLUVIO_ACCESS_KEY; // For connecting to Fluvio Gateway

    // --- Validate Required Environment Variables ---
    const missingEnvVars = [
        !APPWRITE_ENDPOINT && 'APPWRITE_ENDPOINT',
        !APPWRITE_PROJECT_ID && 'APPWRITE_PROJECT_ID',
        !APPWRITE_API_KEY && 'APPWRITE_API_KEY',
        !APPWRITE_DATABASE_ID && 'APPWRITE_DATABASE_ID',
        !FORUM_POSTS_COLLECTION_ID && 'FORUM_POSTS_COLLECTION_ID',
        !FLUVIO_ACCESS_KEY && 'FLUVIO_ACCESS_KEY'
    ].filter(Boolean); // Filter out null/false values

    if (missingEnvVars.length > 0) {
        const errorMsg = `Missing required environment variables: ${missingEnvVars.join(', ')}`;
        error(errorMsg); // Log the specific missing variables
        // Return a 500 error as the function cannot operate
        return res.json({ success: false, error: `Configuration missing: ${errorMsg}` }, 500);
    }

    // --- Configure Appwrite Client ---
    client
        .setEndpoint(APPWRITE_ENDPOINT)
        .setProject(APPWRITE_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);

    // --- Fluvio Configuration ---
    const fluvioGatewayUrl = `wss://infinyon.cloud/wsr/v1/fluvio?access_key=${FLUVIO_ACCESS_KEY}`;
    const FLUVIO_TARGET_TOPIC = 'forum-posts'; // The Fluvio topic to publish to

    let ws; // Declare WebSocket instance variable outside the try block

    try {
        // --- Parse Event Header to Get Document ID and Action ---
        // Appwrite event format: databases.[DB_ID].collections.[COLL_ID].documents.[DOC_ID].[ACTION]
        const eventParts = eventType?.split('.') ?? [];
        const expectedLength = 7; // Expected number of parts in the event string

        // Correct indices based on the standard format
        const documentId = eventParts.length >= expectedLength ? eventParts[5] : null; // Document ID is at index 5
        const action = eventParts.length >= expectedLength ? eventParts[6] : null;     // Action ('create', 'update', 'delete') is at index 6

        log(`Attempting to parse event: ${eventType}`);

        // Validate the extracted document ID
        if (!documentId || documentId === 'documents' || documentId.length < 5) { // Basic sanity check
            error(`Could not extract a valid document ID from event header: ${eventType}. Extracted ID: '${documentId}'`);
            return res.json({ success: false, error: 'Could not identify document ID from event.' }, 400);
        }

        // Validate the extracted action
        if (!action || !['create', 'update', 'delete'].includes(action)) {
            error(`Could not extract a valid action ('create', 'update', 'delete') from event header: ${eventType}. Extracted Action: '${action}'`);
            return res.json({ success: false, error: 'Could not identify action from event.' }, 400);
        }

        log(`Successfully Extracted - Document ID: ${documentId}, Action: ${action}`);

        // --- Filter for 'create' Action ---
        // This specific function should only process the creation of new posts.
        if (action !== 'create') {
             log(`Ignoring event action '${action}' for produceForumPostEvent because it only handles 'create' events.`);
             // Respond successfully as no action is needed for other event types here
             return res.json({ success: true, message: `Ignoring action: ${action}` });
        }

        // --- Obtain Post Document Data ---
        let postDocument = null; // Variable to hold the final post data
        let payloadData = null;  // Variable to hold parsed payload data

        // 1. Attempt to use the payload provided by the event trigger (most efficient)
        if (req.payload && typeof req.payload === 'string' && req.payload.trim() !== '') {
             try {
                 payloadData = JSON.parse(req.payload);
                 log('Successfully parsed req.payload JSON.');
                 // Validate essential fields expected in a ForumPost document
                 if (payloadData.$id && payloadData.topicId && payloadData.userId && payloadData.content && payloadData.$createdAt) {
                      log(`Using post data directly from payload for Document ID: ${payloadData.$id}`);
                      postDocument = payloadData; // Use payload data if valid
                 } else {
                      // Log which fields might be missing for easier debugging
                      const missingFields = [
                          !payloadData.$id && '$id',
                          !payloadData.topicId && 'topicId',
                          !payloadData.userId && 'userId',
                          !payloadData.content && 'content',
                          !payloadData.$createdAt && '$createdAt'
                      ].filter(Boolean).join(', ');
                      log(`Payload parsed but missing essential fields: [${missingFields}]. Will attempt to fetch the document manually.`);
                      payloadData = null; // Invalidate partial payload data
                 }
             } catch (parseError) {
                 // Log parsing errors, but don't fail yet, try fetching instead
                 error(`Failed to parse req.payload JSON: ${parseError.message}. Raw snippet: ${req.payload.substring(0,150)}... Will attempt manual fetch.`);
             }
        } else {
            log('Request payload was missing, empty, or not a string. Will attempt manual fetch.');
        }

        // 2. Fetch the document manually if payload was missing, invalid, or failed to parse
        //    (Only necessary if postDocument is still null)
        if (!postDocument) {
             try {
                 log(`Fetching post document manually using Document ID: ${documentId}`);
                 // Use the Appwrite SDK to get the document
                 postDocument = await databases.getDocument(
                     APPWRITE_DATABASE_ID,
                     FORUM_POSTS_COLLECTION_ID,
                     documentId
                 );
                 log(`Fetched post document manually successfully.`);
             } catch (fetchError) {
                 // Log detailed fetch error information
                 error(`Fatal: Error fetching post document ${documentId} after payload failure/absence: ${fetchError.message}`);
                 if (fetchError.response) {
                      // Log the Appwrite response body if available
                      error(`Appwrite fetch error details: ${safeJsonStringify(fetchError.response)}`);
                 }
                 // If fetching fails even for a 'create' event, something is seriously wrong
                 // (e.g., permissions, wrong collection ID, Appwrite issue)
                 // Throw the error to be caught by the main try...catch block
                 throw fetchError;
             }
        }

        // --- Final Validation of Post Data ---
        // After attempting payload and fetch, ensure we have a valid document
        if (!postDocument || !postDocument.$id || !postDocument.topicId || !postDocument.userId || !postDocument.content || !postDocument.$createdAt) {
            error('Fatal: Post document data is invalid or missing essential fields ($id, topicId, userId, content, $createdAt) even after fetch attempt.');
            // Log the data we *do* have for debugging
            error(`Problematic postDocument data: ${safeJsonStringify(postDocument)}`);
            return res.json({ success: false, error: 'Final post data validation failed.' }, 500); // Internal server error
        }

        log(`Successfully obtained valid data for post ID: ${postDocument.$id}. Preparing to send.`);

        // --- Prepare Event Data for Fluvio ---
        // The data sent will be the entire Appwrite document object
        const eventData = { ...postDocument };
        const eventDataString = safeJsonStringify(eventData);

        // Check if stringification failed
        if (!eventDataString) {
             error('Fatal: Failed to stringify the final post event data.');
             return res.json({ success: false, error: 'Internal error: Could not stringify post data.'}, 500);
        }

        // --- Connect to Fluvio and Send Message ---
        log(`Connecting to Fluvio Gateway via WebSocket: ${fluvioGatewayUrl}`);

        // Use a Promise to handle the asynchronous nature of WebSocket connections/messages
        await new Promise((resolve, reject) => {
            let connectionTimeout; // Timeout handle

            try {
                // Initialize the WebSocket connection
                ws = new WebSocket(fluvioGatewayUrl);

                // --- WebSocket Event Handlers ---

                // On successful connection opening
                ws.on('open', () => {
                    clearTimeout(connectionTimeout); // Clear the connection timeout
                    log('WebSocket connection opened successfully to Fluvio Gateway.');
                    try {
                        // Construct the message payload expected by Fluvio Gateway: TopicName\nJSONPayload
                        const messageToSend = `${FLUVIO_TARGET_TOPIC}\n${eventDataString}`;
                        ws.send(messageToSend); // Send the data
                        log(`Sent new_post event via WebSocket for post ID: ${postDocument.$id}`);

                        // Close the WebSocket connection gracefully after sending the message
                        ws.close(1000, "Message sent successfully"); // 1000 = Normal Closure
                        resolve(); // Resolve the Promise, indicating success
                    } catch (sendError) {
                         // Handle errors during the ws.send() call
                         error(`WebSocket send error: ${sendError.message}`);
                         // Attempt to close with an error code if possible
                         if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                            ws.close(1011, "Send error"); // 1011 = Internal Error
                         }
                         reject(sendError); // Reject the Promise
                    }
                });

                // On WebSocket error (connection issues, protocol errors, etc.)
                ws.on('error', (err) => {
                    clearTimeout(connectionTimeout); // Clear any pending timeout
                    error(`WebSocket connection error: ${err.message}`);
                    // Ensure close is attempted even if the 'open' event never fired
                    if (ws && ws.readyState !== WebSocket.CLOSED && ws.readyState !== WebSocket.CLOSING) {
                       ws.close(1011, "WebSocket error");
                    }
                    reject(err); // Reject the Promise
                });

                // On WebSocket connection closing
                ws.on('close', (code, reason) => {
                    clearTimeout(connectionTimeout); // Clear any pending timeout
                    const reasonString = reason?.toString() || 'No reason provided';
                    log(`WebSocket connection closed. Code: ${code}, Reason: ${reasonString}`);
                    // If the closure was not normal (code 1000) or expected (e.g., 1005 after normal close),
                    // and the promise hasn't already been settled, reject it.
                    // Note: A more robust implementation might use a state variable to track if resolved/rejected.
                    if (code !== 1000 && code !== 1005 /* No Status Received */) {
                        reject(new Error(`WebSocket closed unexpectedly. Code: ${code}, Reason: ${reasonString}`));
                    }
                    // If the promise was already resolved in 'open', this handler does nothing further.
                });

                 // --- Connection Timeout ---
                 // Set a timeout in case the connection hangs indefinitely
                 connectionTimeout = setTimeout(() => {
                     error("WebSocket connection attempt timed out after 10 seconds.");
                     // Check WebSocket state before acting
                     if (ws) {
                         if (ws.readyState === WebSocket.CONNECTING) {
                             ws.terminate(); // Force close if stuck connecting
                             reject(new Error("WebSocket connection timeout (stuck connecting)"));
                         } else if (ws.readyState === WebSocket.OPEN) {
                             log("Timeout occurred, but WebSocket was OPEN. Send/close might have failed.");
                             // The promise might have already been settled by an error or success
                             // Rejecting here might cause an 'unhandled rejection' if already resolved.
                             // Consider just logging and letting other handlers manage state.
                             // reject(new Error("WebSocket timeout after opening (send/close issue?)"));
                         } else {
                            // Already closing or closed, timeout is likely irrelevant now
                            log(`Timeout occurred, but WebSocket state was ${ws.readyState}.`);
                            // Avoid rejecting if already closed/handled.
                         }
                     } else {
                          reject(new Error("WebSocket timeout (instance not created?)"));
                     }
                 }, 10000); // 10 second timeout

            } catch (initError) {
                 // Catch errors during the 'new WebSocket()' call itself
                 error(`WebSocket initialization failed: ${initError.message}`);
                 reject(initError); // Reject the promise if initialization fails
            }
        }); // End of WebSocket Promise

        // --- Success ---
        log(`Successfully processed and sent event for post ${postDocument.$id}`);
        return res.json({ success: true, message: 'Post event successfully sent via WebSocket.' });

    } catch (err) {
        // --- Global Error Handler ---
        // Catch any errors thrown during the process (fetch errors, unhandled promise rejections)
        error(`Unhandled Error in produceForumPostEvent execution: ${err.message || 'Unknown error'}`);
        if (err.stack) {
            error("Error Stack Trace:");
            error(err.stack); // Log stack trace for better debugging
        }

        // Attempt to close the WebSocket if it exists and is open/connecting
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            log("Closing WebSocket due to function error.");
            ws.close(1011, "Function execution error");
        }

        // Return a 500 Internal Server Error response
        return res.json({ success: false, error: err.message || 'An unexpected error occurred processing the post event.' }, 500);
    }
};