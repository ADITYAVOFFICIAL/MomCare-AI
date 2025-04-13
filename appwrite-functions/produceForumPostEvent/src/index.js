// produceForumPostEvent/src/index.js

// Use require for CommonJS environment
const { default: Fluvio } = require('@fluvio/client'); // Correct import for default export
const sdk = require('node-appwrite');

// Helper to safely stringify JSON
const safeJsonStringify = (obj) => {
     try { return JSON.stringify(obj); }
     catch (e) { console.error("Stringify Error:", e); return null; }
};

module.exports = async ({ req, res, log, error }) => {
    // --- Appwrite Setup ---
    const client = new sdk.Client();
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
        error('Missing Appwrite environment variables.');
        return res.json({ success: false, error: 'Appwrite configuration missing.' }, 500);
    }
    client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

    // --- Fluvio Setup ---
    let fluvioClientInstance; // Use a different variable name to avoid conflict with class name
    const FLUVIO_ACCESS_KEY = process.env.FLUVIO_ACCESS_KEY;
    if (!FLUVIO_ACCESS_KEY) {
        error('Missing Fluvio Access Key environment variable.');
        return res.json({ success: false, error: 'Fluvio configuration missing.' }, 500);
    }
    const fluvioGatewayUrl = `wss://infinyon.cloud/wsr/v1/fluvio?access_key=${FLUVIO_ACCESS_KEY}`;
    const FLUVIO_TARGET_TOPIC = 'forum-posts'; // Define target topic

    try {
        log('produceForumPostEvent function triggered.');

        // Ensure payload exists and is parsed
        if (!req.payload) {
             error('Request payload is missing.');
             return res.json({ success: false, error: 'Missing event payload.' }, 400);
        }
        const payload = JSON.parse(req.payload);
        log(`Processing event for document ID: ${payload.$id}`);

        // Validate essential fields from the payload (adjust based on your actual ForumPost structure)
        if (!payload.$id || !payload.topicId || !payload.userId || !payload.content || !payload.$createdAt) {
            error('Payload missing essential fields ($id, topicId, userId, content, $createdAt). Payload:', safeJsonStringify(payload));
            return res.json({ success: false, error: 'Missing essential data in payload.' }, 400);
        }

        // --- Prepare Event Data ---
        // Send the *entire* post document data as the payload
        // The backend service expects the full ForumPost structure
        const eventData = {
            // You could add an explicit type field if needed, but often the topic name is sufficient
            // type: 'new_post',
            ...payload // Spread the entire Appwrite document payload
        };

        const eventDataString = safeJsonStringify(eventData);
        if (!eventDataString) {
             error('Failed to stringify event data.');
             return res.json({ success: false, error: 'Internal error stringifying data.'}, 500);
        }

        // --- Connect to Fluvio ---
        log(`Connecting to Fluvio WebSocket Gateway...`);
        // Use the connection method identified earlier: { addr: url }
        const connectOptions = { addr: fluvioGatewayUrl };
        // Connect using the options object
        fluvioClientInstance = await Fluvio.connect(connectOptions);
        log('Connected to Fluvio Gateway.');

        // --- Produce to Fluvio ---
        const producer = await fluvioClientInstance.topicProducer(FLUVIO_TARGET_TOPIC);
        log(`Got producer for topic: ${FLUVIO_TARGET_TOPIC}.`);

        // Send the stringified full post data
        // Key can be null, or use postId/topicId if partitioning is relevant later
        await producer.send(payload.$id, eventDataString); // Using postId as key example
        log(`Sent event to Fluvio topic '${FLUVIO_TARGET_TOPIC}' for post ID: ${payload.$id}`);

        return res.json({ success: true, message: 'Event sent successfully.' });

    } catch (err) {
        // Log specific Fluvio errors if possible
        error(`Error in produceForumPostEvent: ${err.message || 'Unknown error'}`);
        if (err.stack) {
             error(err.stack);
        } else {
             error(JSON.stringify(err)); // Log the error object if no stack
        }
        return res.json({ success: false, error: err.message || 'Failed to process event.' }, 500);
    } finally {
        // --- Disconnect Fluvio ---
        if (fluvioClientInstance) {
            try {
                // Appwrite functions might time out before disconnect finishes,
                // but it's good practice to attempt it.
                // The Fluvio class itself doesn't have disconnect, clear the reference.
                // await fluvioClientInstance.disconnect(); // This method likely doesn't exist
                fluvioClientInstance = null; // Clear reference
                log('Cleared Fluvio client reference.');
            } catch (disconnectErr) {
                // Log disconnect errors but don't fail the function execution
                error(`Error during Fluvio cleanup: ${disconnectErr.message}`);
            }
        }
    }
};