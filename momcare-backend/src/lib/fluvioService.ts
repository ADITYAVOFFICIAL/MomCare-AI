// src/lib/fluvioService.ts
import Fluvio, {
    // FluvioClient, // Keep if needed for type hints elsewhere
    Offset,
    PartitionConsumer,
    // Rename the import to avoid conflict with the local interface
    Record as FluvioClientRecord,
} from '@fluvio/client';

// Construct the Gateway URL using the access key from environment variables
// Ensure this variable name matches your .env file
const FLUVIO_ACCESS_KEY = process.env.VITE_PUBLIC_FLUVIO_ACCESS_KEY;
const FLUVIO_GATEWAY_URL = FLUVIO_ACCESS_KEY
    ? `wss://infinyon.cloud/wsr/v1/fluvio?access_key=${FLUVIO_ACCESS_KEY}`
    : null;

let fluvioClientInstance: Fluvio | null = null; // Store the Fluvio instance

/**
 * Connects to the Fluvio cluster.
 * Uses WebSocket Gateway URL if VITE_PUBLIC_FLUVIO_ACCESS_KEY is set.
 * Note: The library's defined 'Options' type doesn't explicitly support 'addr'.
 * This relies on the underlying native implementation potentially handling it.
 *
 * @throws {Error} If the Fluvio Access Key is missing or connection fails.
 * @returns {Promise<Fluvio>} A promise resolving to the Fluvio client instance.
 */
export const connectFluvio = async (): Promise<Fluvio> => {
    if (!FLUVIO_GATEWAY_URL) {
        console.error("Fluvio Access Key (VITE_PUBLIC_FLUVIO_ACCESS_KEY) is missing in environment variables.");
        throw new Error("Fluvio configuration missing: VITE_PUBLIC_FLUVIO_ACCESS_KEY not set.");
    }

    if (fluvioClientInstance) {
        // Basic check: Assume instance is connected if it exists.
        return fluvioClientInstance;
    }

    try {
        console.log('Connecting to Fluvio WebSocket Gateway...');

        // Pass the URL within an options object.
        // Removed the incorrect 'ConnectOptions' type annotation.
        // TypeScript will infer the type as { addr: string }.
        // WARNING: The library's declared 'Options' type in index.d.ts does not include 'addr'.
        // This connection method might rely on undocumented behavior or specific native handling.
        const connectOptions = { addr: FLUVIO_GATEWAY_URL };

        // Use the static connect method
        // Cast to 'any' to bypass type mismatch, as 'addr' might be handled internally
        // despite not being in the declared 'Options' type.
        fluvioClientInstance = await Fluvio.connect(connectOptions as any);

        console.log('Fluvio Gateway connected successfully.');
        return fluvioClientInstance;
    } catch (error) {
        console.error('Failed to connect to Fluvio Gateway:', error);
        fluvioClientInstance = null; // Reset on failure
        // Re-throw the error for the caller to handle
        throw error;
    }
};

/**
 * Disconnects from Fluvio by clearing the client instance reference.
 * Note: The underlying library might not have an explicit disconnect method via WebSocket.
 */
export const disconnectFluvio = async () => {
    // Based on previous observation, no explicit disconnect method might be available for the JS client instance.
    if (fluvioClientInstance) {
        console.log('Clearing Fluvio client instance reference (disconnect may be implicit).');
        // If an explicit disconnect method is found in the future, call it here.
        // e.g., await fluvioClientInstance.disconnect(); // This method doesn't seem to exist on the Fluvio class/interface
        fluvioClientInstance = null; // Clear the reference
    }
};

/**
 * Type definition for the callback function that processes records from a Fluvio stream.
 * @template T The expected type of the parsed JSON data.
 * @param data The parsed data from the record's value.
 * @param record The raw Fluvio record.
 */
export type RecordProcessor<T = any> = (data: T, record: FluvioClientRecord | any) => void; // Adjust record type if needed
export interface FluvioRecord {
    offset: number; // Assuming offset is a direct property based on previous fixes
    valueString: () => Promise<string>; // Assuming async based on usage
    keyString: () => Promise<string | null>; // Assuming async based on usage
}

/**
 * Consumes messages from a specific Fluvio topic and partition.
 *
 * @template T The expected type of the JSON data within the records.
 * @param {string} topicName The name of the topic to consume from.
 * @param {RecordProcessor<T>} processor A callback function to process each received record.
 * @param {(error: Error) => void} onError A callback function to handle errors during connection or streaming.
 * @param {number} [partition=0] The partition index to consume from (defaults to 0).
 * @returns {Promise<PartitionConsumer | null>} A promise that resolves with the PartitionConsumer instance, or null if setup failed.
 */
export const consumeTopic = async <T>(
    topicName: string,
    processor: RecordProcessor<T>,
    onError: (error: Error) => void,
    partition: number = 0 // Default to partition 0
): Promise<PartitionConsumer | null> => {
    let consumer: PartitionConsumer | null = null;
    try {
        const client = await connectFluvio(); // Ensure connection

        // Get a consumer for the specified topic and partition
        // The Fluvio interface (client) returns a Promise<PartitionConsumer>
        consumer = await client.partitionConsumer(topicName, partition);

        console.log(`Starting stream listener for topic: ${topicName}, partition: ${partition}`);

        // Start streaming from the end of the partition.
        // Provide BOTH the Offset and the callback function as arguments.
        // This call is CORRECT according to index.d.ts.
        // If the TS2554 error ("Expected 0 arguments") persists here,
        // it strongly indicates an issue with the @fluvio/client type definitions
        // in your node_modules or a TS tooling bug.
        await consumer.stream(Offset.FromEnd(), async (record: FluvioClientRecord) => {
            try {
               // FIX: Access offset as a property, not a method, assuming the type definition might be inaccurate or the method doesn't exist.
               // Also, use the renamed FluvioClientRecord type if needed for casting, though direct access might work.
               const recordValue = await record.valueString(); // Get record value as string (ensure await if it's async)
               if (recordValue) {
                   // Attempt to parse JSON, handle potential errors
                   try {
                       const data = JSON.parse(recordValue) as T; // Parse JSON
                       // Pass the original record (which might be FluvioClientRecord type) to the processor
                       processor(data, record as any); // Cast record to 'any' or a compatible type for the processor
                   } catch (parseError) {
                        console.error(`Error parsing JSON record from ${topicName}, partition: ${partition}:`, parseError, `Raw value: "${recordValue}"`);
                        // Decide if JSON parsing errors should trigger the main onError
                        // onError(parseError instanceof Error ? parseError : new Error('JSON parsing error'));
                       }
                   } else {
                       // Access offset property directly
                    //    console.warn(`Received empty record value from ${topicName}, partition: ${partition}, offset: ${(record as any).offset}`); 
                   }
               } catch (processingError) {
               // Catch errors within the user's processor function or valueString() etc.
               console.error(`Error processing individual record callback for ${topicName}, partition: ${partition}:`, processingError);
               // Decide if these errors should trigger the main onError
               // onError(processingError instanceof Error ? processingError : new Error('Unknown record processing error'));
           }
       });

        console.log(`Stream listener setup complete for topic: ${topicName}, partition: ${partition}. Listening for new messages...`);
        // Note: The stream callback runs indefinitely in the background.

        return consumer; // Return the consumer instance

    } catch (error) {
        // Handle errors during connection or consumer/stream setup
        console.error(`Failed to create consumer or start stream for topic ${topicName}, partition: ${partition}:`, error);
        // Ensure an Error object is passed to the callback
        if (error instanceof Error) {
            onError(error);
        } else {
            onError(new Error(`Unknown error during consumer setup: ${String(error)}`));
        }
        return null; // Return null as consumer setup failed
    }
};

// --- Example Usage (Conceptual) ---
/*
async function main() {
    const handleData = (data: { message: string; count: number }, record: FluvioRecord) => {
        console.log(`Received [Offset: ${record.offset()}]: Message: ${data.message}, Count: ${data.count}`);
    };

    const handleError = (error: Error) => {
        console.error("Fluvio Consumer Error:", error.message);
        // Implement logic here: e.g., attempt reconnect, log critical error, exit process
        // Consider adding a delay before retrying connection/consumption
        process.exit(1); // Example: exit on error
    };

    const topic = 'your-topic-name'; // Replace with actual topic
    console.log(`Attempting to consume from topic "${topic}"`);

    try {
        const consumerInstance = await consumeTopic<{ message: string; count: number }>(
            topic,
            handleData,
            handleError
        );

        if (consumerInstance) {
            console.log(`Successfully started consumer for topic "${topic}". Waiting for messages...`);
            // Keep the process alive (e.g., in a server, this happens naturally)
            // For a simple script, you might need:
            // setInterval(() => {}, 1 << 30); // Keep alive hack
        } else {
            console.error(`Failed to start consumer for topic "${topic}".`);
            process.exit(1);
        }
    } catch (initialConnectError) {
         // Errors thrown by connectFluvio directly
         console.error("Failed to establish initial Fluvio connection:", initialConnectError);
         process.exit(1);
    }
}

// Graceful shutdown handler
const shutdown = async () => {
    console.log("\nShutting down Fluvio connection...");
    await disconnectFluvio();
    console.log("Fluvio connection closed.");
    process.exit(0);
};

process.on('SIGINT', shutdown); // Handle Ctrl+C
process.on('SIGTERM', shutdown); // Handle kill signals

// Start the consumer
// main();

*/