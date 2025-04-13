// momcare-backend/src/index.ts
import dotenv from 'dotenv';
import { serve, ServerWebSocket, WebSocketHandler, WebSocketServeOptions } from 'bun'; // Ensure WebSocketServeOptions is imported

// Import Appwrite types if you need to strongly type the messages
import type { ForumPost, VoteCounts } from './lib/appwrite.ts'; // Add .ts extension

// Import Fluvio service functions
import { connectFluvio, consumeTopic, disconnectFluvio } from './lib/fluvioService';
import type { RecordProcessor, FluvioRecord } from './lib/fluvioService'; // Import types

// Load environment variables from .env file
dotenv.config();

const WEBSOCKET_PORT = parseInt(process.env.WEBSOCKET_PORT || '3001', 10);
const FLUVIO_POST_TOPIC = 'forum-posts'; // Match frontend constant
const FLUVIO_VOTE_TOPIC = 'forum-votes'; // Match frontend constant

// --- WebSocket Management ---
// Store connected clients
const connectedClients = new Set<ServerWebSocket<unknown>>();

// Function to broadcast messages to all connected clients
function broadcast(message: object) {
    const messageString = JSON.stringify(message);
    console.log(`[WS Broadcast] Sending message: ${messageString.substring(0, 100)}...`);
    let disconnectedCount = 0;
    connectedClients.forEach((ws) => {
        try {
            // Check readyState before sending (optional but good practice)
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(messageString);
            } else {
                // Client disconnected unexpectedly
                disconnectedCount++;
                connectedClients.delete(ws); // Remove from set
            }
        } catch (error) {
            console.error('[WS Broadcast] Error sending message to client:', error);
            connectedClients.delete(ws); // Remove faulty client
            disconnectedCount++;
        }
    });
     if (disconnectedCount > 0) {
        console.log(`[WS Broadcast] Removed ${disconnectedCount} disconnected client(s).`);
     }
}

// --- Fluvio Message Handlers ---

// Define the structure for messages sent to the frontend
interface WebSocketMessage {
    type: 'new_post' | 'vote_update' | 'error' | 'info';
    payload: any; // Type this more strictly if possible
}

// Handler for new posts from Fluvio
const handleFluvioPost: RecordProcessor<ForumPost> = (postData, record) => {
    console.log(`[Fluvio] Received post from topic '${FLUVIO_POST_TOPIC}':`, postData.$id);
    // Broadcast the new post data to connected clients
    broadcast({
        type: 'new_post',
        payload: postData,
    } as WebSocketMessage);
};

// Handler for vote updates from Fluvio
type FluvioVoteUpdatePayload = { targetId: string; targetType: 'topic' | 'post'; voteCounts: VoteCounts };
const handleFluvioVote: RecordProcessor<FluvioVoteUpdatePayload> = (voteData, record) => {
    console.log(`[Fluvio] Received vote update from topic '${FLUVIO_VOTE_TOPIC}':`, voteData);
    // Broadcast the vote update data to connected clients
    broadcast({
        type: 'vote_update',
        payload: voteData,
    } as WebSocketMessage);
};

// Handler for errors from Fluvio consumers
const handleFluvioError = (error: Error) => {
    console.error('[Fluvio Consumer Error]', error.message);
    // Optionally broadcast an error message to clients
    // broadcast({ type: 'error', payload: { message: 'Fluvio connection issue.' } });
};

// --- Start Fluvio Consumers ---
async function startFluvioConsumers() {
    try {
        console.log('[Fluvio] Attempting initial connection...');
        await connectFluvio(); // Establish connection first
        console.log('[Fluvio] Connection successful. Starting consumers...');

        // Consume Posts Topic
        await consumeTopic<ForumPost>(
            FLUVIO_POST_TOPIC,
            handleFluvioPost,
            handleFluvioError
        );

        // Consume Votes Topic
        await consumeTopic<FluvioVoteUpdatePayload>(
            FLUVIO_VOTE_TOPIC,
            handleFluvioVote,
            handleFluvioError
        );

        console.log('[Fluvio] Consumers initialized.');

    } catch (error) {
        console.error('[Fluvio] CRITICAL: Failed to connect or initialize Fluvio consumers:', error);
        // Decide how to handle this - retry? exit?
        // process.exit(1); // Example: exit if Fluvio connection fails on startup
    }
}

// --- WebSocket Server Implementation ---
const websocketHandler: WebSocketHandler<unknown> = {
    open(ws) {
        connectedClients.add(ws);
        console.log(`[WS Server] Client connected. Total clients: ${connectedClients.size}`);
        ws.send(JSON.stringify({ type: 'info', payload: 'Connected to MomCare real-time service.' }));
    },
    message(ws, message) {
        console.log('[WS Server] Received message (ignored):', message);
    },
    close(ws, code, reason) {
        connectedClients.delete(ws);
        console.log(`[WS Server] Client disconnected. Code: ${code}, Reason: ${reason}. Total clients: ${connectedClients.size}`);
    },
    // drain(ws) { // Optional
    //     console.log('[WS Server] WebSocket backpressure drain.');
    // }
};

// --- Start the Server ---
console.log(`[Server] Starting WebSocket server on port ${WEBSOCKET_PORT}...`);
serve({
    port: WEBSOCKET_PORT,
    fetch(req, server) {
        if (server.upgrade(req)) {
            return; // Bun handles the upgrade
        }
        if (req.url.endsWith('/health')) {
            return new Response("OK", { status: 200 });
        }
        return new Response("Upgrade failed or invalid path", { status: 400 });
    },
    // Define the websocket object explicitly matching WebSocketServeOptions['websocket']
    websocket: {
        ...websocketHandler, // Spread the compatible handlers (open, message, close, drain)
        // Ensure other required methods from WebSocketServeOptions['websocket'] are present if any
        // For Bun v1.x, 'open', 'message', 'close', 'drain', 'error' are the primary ones.
    } satisfies WebSocketServeOptions<unknown>['websocket'], // Use 'satisfies' for type checking
    // Define the 'error' handler directly here at the top level of serve options
    error(error: Error): void | Promise<void> {
        console.error('[Server] Serve error:', error);
        // Handle server-level errors (e.g., port binding issues)
        // Depending on the error, you might want to exit or attempt recovery
    },
});

console.log(`[Server] WebSocket server listening on ws://localhost:${WEBSOCKET_PORT}`);

// Start Fluvio consumers after the server starts listening
startFluvioConsumers();

// Optional: Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('\n[Server] Shutting down...');
    await disconnectFluvio();
    // Close WebSocket connections gracefully if needed (Bun might handle this)
    connectedClients.forEach(ws => ws.close(1000, 'Server shutting down'));
    process.exit(0);
});