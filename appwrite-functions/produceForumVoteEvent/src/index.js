// produceForumVoteEvent/src/index.js

// Use require for CommonJS environment
const { default: Fluvio } = require('@fluvio/client'); // Correct import for default export
const sdk = require('node-appwrite');

// Helper to safely stringify JSON
const safeJsonStringify = (obj) => {
     try { return JSON.stringify(obj); }
     catch (e) { console.error("Stringify Error:", e); return null; }
};

// Helper to get vote counts for a target
// Note: This requires indexes on targetId and voteType in your forumVotes collection
const getVoteCounts = async (databases, databaseId, votesCollectionId, targetId) => {
    try {
        log(`Fetching vote counts for targetId: ${targetId}`);
        // Count upvotes
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
        throw countError; // Re-throw to be caught by the main handler
    }
};


module.exports = async ({ req, res, log, error }) => {
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
        return res.json({ success: false, error: 'Appwrite configuration missing.' }, 500);
    }
    client.setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);

    // --- Fluvio Setup ---
    let fluvioClientInstance;
    const FLUVIO_ACCESS_KEY = process.env.FLUVIO_ACCESS_KEY;
    if (!FLUVIO_ACCESS_KEY) {
        error('Missing Fluvio Access Key environment variable.');
        return res.json({ success: false, error: 'Fluvio configuration missing.' }, 500);
    }
    const fluvioGatewayUrl = `wss://infinyon.cloud/wsr/v1/fluvio?access_key=${FLUVIO_ACCESS_KEY}`;
    const FLUVIO_TARGET_TOPIC = 'forum-votes'; // Correct topic for vote events

    try {
        log('produceForumVoteEvent function triggered.');

        // Ensure payload exists and is parsed
        if (!req.payload) {
             error('Request payload is missing.');
             return res.json({ success: false, error: 'Missing event payload.' }, 400);
        }
        const payload = JSON.parse(req.payload); // Event data from Appwrite trigger (the vote document itself)
        log(`Processing event for vote document ID: ${payload.$id}`);

        // Validate essential fields from the vote payload
        if (!payload.$id || !payload.targetId || !payload.targetType || !payload.userId) {
            error('Vote payload missing essential fields ($id, targetId, targetType, userId). Payload:', safeJsonStringify(payload));
            return res.json({ success: false, error: 'Missing essential vote data in payload.' }, 400);
        }

        const targetId = payload.targetId;
        const targetType = payload.targetType;

        // --- Recalculate Vote Counts for the Target ---
        // This is crucial because the event only tells us about *one* vote change.
        // We need the *total* current counts for the targetId.
        const voteCounts = await getVoteCounts(databases, APPWRITE_DATABASE_ID, FORUM_VOTES_COLLECTION_ID, targetId);

        // --- Prepare Event Data for Fluvio ---
        const eventData = {
            type: 'vote_update', // Indicate event type
            targetId: targetId,
            targetType: targetType,
            voteCounts: voteCounts, // Send the calculated counts
        };

        const eventDataString = safeJsonStringify(eventData);
        if (!eventDataString) {
             error('Failed to stringify vote event data.');
             return res.json({ success: false, error: 'Internal error stringifying vote data.'}, 500);
        }

        // --- Connect to Fluvio ---
        log(`Connecting to Fluvio WebSocket Gateway...`);
        const connectOptions = { addr: fluvioGatewayUrl };
        fluvioClientInstance = await Fluvio.connect(connectOptions);
        log('Connected to Fluvio Gateway.');

        // --- Produce to Fluvio ---
        const producer = await fluvioClientInstance.topicProducer(FLUVIO_TARGET_TOPIC);
        log(`Got producer for topic: ${FLUVIO_TARGET_TOPIC}.`);

        // Send the stringified vote update data
        // Use targetId as key for potential partitioning later
        await producer.send(targetId, eventDataString);
        log(`Sent vote_update event to Fluvio topic '${FLUVIO_TARGET_TOPIC}' for target ID: ${targetId}`);

        return res.json({ success: true, message: 'Vote event sent successfully.' });

    } catch (err) {
        error(`Error in produceForumVoteEvent: ${err.message || 'Unknown error'}`);
        if (err.stack) {
             error(err.stack);
        } else {
             error(JSON.stringify(err));
        }
        return res.json({ success: false, error: err.message || 'Failed to process vote event.' }, 500);
    } finally {
        // --- Disconnect Fluvio ---
        if (fluvioClientInstance) {
            try {
                fluvioClientInstance = null; // Clear reference
                log('Cleared Fluvio client reference.');
            } catch (disconnectErr) {
                error(`Error during Fluvio cleanup: ${disconnectErr.message}`);
            }
        }
    }
};