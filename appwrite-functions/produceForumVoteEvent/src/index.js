const { Fluvioclient, ConnectorConfig } = require('@fluvio/client');
const sdk = require('node-appwrite');

const safeJsonStringify = (obj) => {
     try { return JSON.stringify(obj); }
     catch (e) { console.error("Stringify Error:", e); return null; }
};

module.exports = async ({ req, res, log, error }) => {
    // --- Appwrite Setup ---
    const client = new sdk.Client();
    const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT;
    const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
    const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY; // Function level API Key

    if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
        error('Missing Appwrite environment variables.');
        return res.json({ success: false, error: 'Appwrite configuration missing.' }, 500);
    }
    client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

    // --- Fluvio Setup ---
    let fluvio;
    const FLUVIO_ACCESS_KEY = process.env.FLUVIO_ACCESS_KEY; // Get the key from env vars
    if (!FLUVIO_ACCESS_KEY) {
        error('Missing Fluvio Access Key environment variable.');
        return res.json({ success: false, error: 'Fluvio configuration missing.' }, 500);
    }
    // Construct the specific WebSocket Gateway URL with the access key
    const fluvioGatewayUrl = `wss://infinyon.cloud/wsr/v1/fluvio?access_key=${FLUVIO_ACCESS_KEY}`;


    try {
        log('produceForumPostEvent function triggered.');
        const payload = JSON.parse(req.payload ?? '{}'); // Event data from Appwrite trigger
        log(`Processing post creation ID: ${payload.$id}`);

        // Basic validation of incoming payload
        if (!payload.$id || !payload.topicId || !payload.userId) {
            error('Payload missing essential fields ($id, topicId, userId).');
            return res.json({ success: false, error: 'Missing essential data.' }, 400);
        }

        // Prepare the event data to send to Fluvio
        const eventData = {
            type: 'new_post', // Indicate event type
            postId: payload.$id,
            topicId: payload.topicId,
            userId: payload.userId,
            userName: payload.userName || 'Anonymous', // Include user display name
            createdAt: payload.$createdAt, // Include timestamp
            // Optional: content snippet for immediate display?
            // contentSnippet: payload.content?.substring(0, 50) + (payload.content?.length > 50 ? '...' : ''),
        };
        const eventDataString = safeJsonStringify(eventData);
        if (!eventDataString) {
             error('Failed to stringify event data.');
             return res.json({ success: false, error: 'Internal error stringifying data.'}, 500);
        }

        // Configure Fluvio connection (TLS handled by wss://)
        const config = new ConnectorConfig(); // Basic config, no explicit auth needed with Access Key URL

        log(`Connecting to Fluvio WebSocket Gateway...`);
        fluvio = await Fluvioclient.connect(fluvioGatewayUrl, config); // Connect to the Gateway URL
        log('Connected to Fluvio Gateway.');

        const producer = await fluvio.topicProducer('forum-votes');
        log('Got producer for forum-posts.');

        await producer.send(null, eventDataString); // Key null, send stringified data
        log(`Sent new_post event to Fluvio for post ID: ${eventData.postId}`);

        return res.json({ success: true, message: 'Event sent.' });

    } catch (err) {
        error(`Error in produceForumPostEvent: ${err.message || 'Unknown error'}`);
        error(err.stack); // Log full stack trace for debugging
        return res.json({ success: false, error: err.message || 'Failed to process event.' }, 500);
    } finally {
        if (fluvio) {
            try {
                await fluvio.disconnect();
                log('Fluvio disconnected.');
            } catch (disconnectErr) {
                error(`Error disconnecting Fluvio: ${disconnectErr.message}`);
            }
        }
    }
};