import Groq from 'groq-sdk';
import { format, parseISO } from 'date-fns';

// --- *** SDK Type Definitions *** ---
// Import base response/chunk types via namespace (these usually work)
type ChatCompletionMessageParam = Groq.Chat.Completions.ChatCompletionMessageParam;
type ChatCompletionContentPart = Groq.Chat.Completions.ChatCompletionContentPart;
type ImageContentPart = Groq.Chat.Completions.ChatCompletionContentPartImage; // Correct type for image part
type ChatCompletion = Groq.Chat.Completions.ChatCompletion;
type ChatCompletionChunk = Groq.Chat.Completions.ChatCompletionChunk;

// CORRECTED AGGRESSIVE FIX: Import specific param types directly with correct names
// Adjust the path '/resources/' if your node_modules structure differs slightly (e.g., '/dist/resources/')
import {
    ChatCompletionCreateParamsNonStreaming, // Correct Name
    ChatCompletionCreateParamsStreaming,  // Correct Name
    ChatCompletionCreateParamsBase      // Correct Name
} from 'groq-sdk/resources/chat/completions'; // <--- Direct import path

// CORRECTED AGGRESSIVE FIX: Create local union type for params using correct names
type ChatCompletionCreateParams = ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming;

// Import Stream class for the type assertion fix
import { Stream } from 'groq-sdk/lib/streaming';


// --- *** IMPORT Appwrite types *** ---
import {
    UserProfile,
    BloodPressureReading,
    BloodSugarReading,
    WeightReading,
    Appointment
} from "./appwrite"; // Adjust path if needed

// --- Type Definitions Specific to Interaction ---
export interface UserPreferences {
    feeling?: string;
    age?: number;
    weeksPregnant?: number;
    preExistingConditions?: string;
    specificConcerns?: string;
}
export interface AdditionalChatContext {
    latestBp: BloodPressureReading | null;
    latestSugar: BloodSugarReading | null;
    latestWeight: WeightReading | null;
    upcomingAppointments: (Appointment & { dateTime?: Date | null })[];
    previousConcerns: string[];
}

// --- Configuration ---
const API_KEY: string | undefined = import.meta.env.VITE_PUBLIC_GROQ_API_KEY;
// Use the correctly imported Base type to correctly type the model property
// Ensure this model supports vision and doesn't have the system prompt restriction, or handle as done in ChatPage.
const MODEL_NAME: ChatCompletionCreateParamsBase['model'] = "meta-llama/llama-4-maverick-17b-128e-instruct";


if (!API_KEY) {
    // console.error("CRITICAL: VITE_PUBLIC_GROQ_API_KEY environment variable is not set. Groq service will be unavailable.");
}

// --- Initialization ---
const groq: Groq | null = API_KEY ? new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true }) : null;

// --- Generation Configuration ---
const generationConfig = {
    temperature: 0.7,
    max_tokens: 4096,
    top_p: 0.95,
    stop: null as string | string[] | null, // Explicitly type null
};

// --- Helper Functions ---
const formatDateSafe = (dateString: string | undefined | null): string => {
    if (!dateString) return 'unknown date';
    try {
        // Attempt parsing assuming ISO format (common from databases)
        const date = parseISO(dateString);
        // Check if parsing was successful
        if (isNaN(date.getTime())) return 'invalid date';
        return format(date, 'MMM d, yyyy');
    } catch (error) {
        // console.warn(`Error formatting date "${dateString}":`, error);
        return 'error formatting date';
    }
};

const formatReadingForContext = (reading: BloodPressureReading | BloodSugarReading | WeightReading | null, type: 'BP' | 'Sugar' | 'Weight'): string => {
    if (!reading) return `No recent ${type} reading available.`;
    const dateStr = formatDateSafe(reading?.recordedAt); // Use optional chaining

    let readingStr = '';
    // Use type guards for safer property access
    if (type === 'BP' && reading && 'systolic' in reading && 'diastolic' in reading) {
        readingStr = `BP: ${reading.systolic ?? 'N/A'}/${reading.diastolic ?? 'N/A'} mmHg`;
    } else if (type === 'Sugar' && reading && 'level' in reading) {
        readingStr = `Blood Sugar: ${reading.level ?? 'N/A'} mg/dL (${reading.measurementType || 'unspecified'})`;
    } else if (type === 'Weight' && reading && 'weight' in reading) {
        readingStr = `Weight: ${reading.weight ?? 'N/A'} ${reading.unit || 'units'}`;
    } else {
        // Handle cases where reading exists but doesn't match expected structure for the type
        return `Recent ${type} reading data is incomplete or unavailable.`;
    }

    // Check for missing essential values after formatting
    if (readingStr.includes('N/A')) {
       return `Recent ${type} reading data is incomplete. (Logged on ${dateStr})`;
    }

    return `${readingStr} (Logged on ${dateStr}. For context only, do not interpret medically.)`;
};

const formatAppointmentsForContext = (appointments: (Appointment & { dateTime?: Date | null })[]): string => {
    if (!appointments || appointments.length === 0) return 'No upcoming appointments logged.';
    return `Upcoming Appointments:\n${appointments.map(app => {
        const type = app.appointmentType?.replace(/_/g, ' ') || 'General appointment';
        // Format dateTime if available and valid, otherwise fallback to date/time fields
        const dateTimeFormatted = app.dateTime && !isNaN(app.dateTime.getTime())
            ? format(app.dateTime, 'MMM d, yyyy h:mm a')
            : `${formatDateSafe(app.date)}${app.time ? ` at ${app.time}` : ''}`;
        return `- ${type} on ${dateTimeFormatted}`;
    }).join('\n')}`;
};

const formatPreviousConcernsForContext = (concerns: string[]): string => {
    if (!concerns || concerns.length === 0) return 'No specific recent concerns noted in chat history.';
    // Limit the number and length of concerns shown
    return `Recent Topics/Concerns (Memory Aid):\n${concerns.slice(-3).map(c => `- "${c.substring(0, 100)}${c.length > 100 ? '...' : ''}"`).join('\n')}`;
};

// Function to create the system prompt
export const createSystemPrompt = (
    userPrefs: UserPreferences,
    profileData: UserProfile | null,
    additionalContext: AdditionalChatContext
): string => {
    const name = profileData?.name || 'User';
    const age = userPrefs.age ?? profileData?.age;
    const weeks = userPrefs.weeksPregnant ?? profileData?.weeksPregnant;

    // Build Context String
    let contextString = "[User Context]\n";
    contextString += `- Name: ${name}\n`;
    if (age) contextString += `- Age: ${age}\n`;
    if (weeks !== undefined && weeks !== null) contextString += `- Weeks Pregnant: ${weeks}\n`;
    if (userPrefs.feeling) contextString += `- Current Feeling: ${userPrefs.feeling}\n`;
    const conditions = userPrefs.preExistingConditions ?? profileData?.preExistingConditions;
    if (conditions && conditions.toLowerCase() !== 'none') contextString += `- Pre-existing Conditions: ${conditions}\n`;
    if (userPrefs.specificConcerns) contextString += `- Specific Concerns Today: ${userPrefs.specificConcerns}\n`;

    // Add Health Readings
    contextString += "\n[Recent Health Readings (Context Only - DO NOT Interpret Medically)]\n";
    contextString += `${formatReadingForContext(additionalContext.latestBp, 'BP')}\n`;
    contextString += `${formatReadingForContext(additionalContext.latestSugar, 'Sugar')}\n`;
    contextString += `${formatReadingForContext(additionalContext.latestWeight, 'Weight')}\n`;

    // Add Appointments
    contextString += "\n[Upcoming Schedule Context]\n";
    contextString += `${formatAppointmentsForContext(additionalContext.upcomingAppointments)}\n`;

    // Add Previous Concerns
    contextString += "\n[Recent Chat Context (Memory Aid)]\n";
    contextString += `${formatPreviousConcernsForContext(additionalContext.previousConcerns)}\n`;

    // Define Persona and Rules
    const personaInstructions = `[AI Persona & Role]
You are MomCare AI. Your **sole function** when presented with an image by the user is to act as an **Optical Character Recognition (OCR) and Transcription assistant.** Your task is to **read and transcribe ALL visible text content** from the image accurately and completely. After transcription, you may offer simple explanations of terms *found in the transcription*, if helpful. Maintain a neutral, factual tone for transcription. You are explicitly NOT a medical professional.`;

const safetyRules = `[CRITICAL RULES FOR TRANSCRIPTION]

**CORE TASK: Complete and Accurate Transcription of VISIBLE Text**
Your absolute priority is to **READ and TRANSCRIBE ALL text that is VISIBLE in the image the user provided.** The user has uploaded this image and expects a full transcription of its visible contents.

1.  **MANDATORY Full Transcription:**
    *   You **MUST** transcribe **ALL** readable text content, including any names, dates, addresses, medical terms, test results, notes, identifiers, etc., *exactly as they appear in the image*. Output the text you see.
    *   You are **STRICTLY FORBIDDEN** from omitting visible text or using placeholder phrases like "Not specified", "redacted", "possibly redacted for privacy", "information withheld", "[data removed]", or any similar statement implying information is missing *when it is visible in the image*.
    *   If text is genuinely unreadable in the image (blurry, cut off), state specifically what part is unreadable (e.g., "DOB: 16 Ma... [rest illegible]"). Do not generalize illegibility to the entire field or document.

2.  **Explanation Limited to Transcribed Text:**
    *   If you provide explanations, they **MUST** be directly related to terms or phrases *present in your transcription*. Do not introduce external medical knowledge or interpretations beyond defining transcribed terms.

3.  **Final Mandatory Disclaimer (CRUCIAL):**
    *   **AFTER** providing the transcription (and any limited explanation), you **MUST ALWAYS** conclude with a clear disclaimer advising the user to consult their qualified healthcare provider. Use a phrase similar to: "--- \n**Disclaimer:** The text above is transcribed directly from the image you provided. It is for informational purposes only. Please consult your doctor or healthcare provider for any medical interpretation, diagnosis, or advice."

4.  **EMERGENCY PROTOCOL:** (Unchanged - Overrides all other rules)
    *   If the user's message (not the document) mentions severe symptoms (heavy bleeding, severe pain, loss of consciousness, thoughts of self-harm/harming baby), **STOP** transcription and immediately instruct them to seek URGENT medical attention (call 911/local equivalent, go to hospital).

5.  **Acknowledge Source:**
    *   Start your response by confirming you are processing the user's image, e.g., "Okay, transcribing the visible text from the image you provided:"

6.  **User-Provided Data:**
    *   Remember, the user has explicitly provided this image for transcription. Your task is to fulfill that request accurately with the visible data.`;
    // Combine all parts
    return `${personaInstructions}\n\n${contextString}\n\n${safetyRules}`;
};


// Function to convert a File object to the Groq API's image part format
export const fileToApiImagePart = async (file: File): Promise<ImageContentPart> => {
    // Validate file type again just before processing
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
     if (!allowedTypes.includes(file.type)) {
        throw new Error(`Unsupported file type: ${file.type}. Please use JPG, PNG, WEBP, GIF, HEIC, or HEIF.`);
    }

    // Validate size again (Groq limit is 20MB)
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`Image file too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${maxSize / 1024 / 1024}MB.`);
    }

    // Read file as Base64 data URL
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result as string;
            // Extract base64 data after the comma
            const base64Data = dataUrl.split(',')[1];
            if (base64Data) {
                resolve(base64Data);
            } else {
                reject(new Error("Failed to extract Base64 data from Data URL."));
            }
        };
        reader.onerror = (error) => reject(error || new Error("FileReader error occurred."));
        reader.readAsDataURL(file);
    });

    try {
        const base64Data = await base64EncodedDataPromise;
        // Use the file's MIME type directly as it was validated
        const mimeType = file.type;

        // Construct the ImageContentPart object
        return {
            type: "image_url",
            image_url: {
                url: `data:${mimeType};base64,${base64Data}`
                // Optional detail parameter: 'low', 'high', 'auto' (defaults to 'auto')
                // detail: "auto"
            }
        };
    } catch (error: unknown) {
        // console.error("Error processing file for API:", error);
        throw new Error(`Failed to process image file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};


// --- Core API Functions ---

// Function to initialize a chat session (returns initial messages including system prompt)
export const startChat = (
    userPrefs: UserPreferences,
    profileData: UserProfile | null,
    additionalContext: AdditionalChatContext
): ChatCompletionMessageParam[] => {
    if (!groq) {
        // This case should ideally be handled earlier (e.g., disable chat feature if API key missing)
        // console.error("Groq service not initialized in startChat.");
        // Return a minimal history or throw, depending on desired behavior
        // Throwing might be better to signal a configuration issue clearly.
        throw new Error('Groq service not initialized. Cannot start chat.');
    }
    try {
        // 1. Create the system prompt
        const systemPromptText = createSystemPrompt(userPrefs, profileData, additionalContext);
        const systemMessage: ChatCompletionMessageParam = { role: "system", content: systemPromptText };

        // 2. Create the initial user message based on pre-chat info
        const name = profileData?.name || 'User';
        const feeling = userPrefs.feeling || 'reaching out';
        const weeksPregnant = userPrefs.weeksPregnant ?? profileData?.weeksPregnant; // Use provided or profile weeks
        const weekMention = (weeksPregnant !== undefined && weeksPregnant !== null) ? ` at ${weeksPregnant} weeks pregnant` : '';
        const concernMention = userPrefs.specificConcerns ? ` I also wanted to mention I have some concerns about: ${userPrefs.specificConcerns}.` : '';
        const initialUserText = `Hi, I'm ${name}. I'm feeling ${feeling}${weekMention}.${concernMention} What should I know or do right now?`;
        const userMessage: ChatCompletionMessageParam = { role: "user", content: initialUserText };

        // 3. Create a plausible initial assistant response acknowledging the user
        const concernAck = concernMention ? ' and have noted your specific concerns' : '';
        const initialAssistantText = `Hello ${name}! Thanks for reaching out. I understand you're feeling ${feeling}${weekMention}${concernAck}. I've noted the context you provided (like age${weeksPregnant !== undefined ? ', weeks pregnant,' : ','} etc.). Remember, I'm here for general information and support, not medical advice. Always talk to your doctor or midwife about any health questions or symptoms. How can I assist you today?`;
        const assistantMessage: ChatCompletionMessageParam = { role: "assistant", content: initialAssistantText };

        // Return the initial sequence: System -> User -> Assistant
        return [systemMessage, userMessage, assistantMessage];

    } catch (error: unknown) {
        // console.error('Error preparing initial Groq messages:', error);
        // Check for specific API key errors if possible, otherwise throw a generic error
        if (error instanceof Error && (error.message.includes('API key') || error.message.includes('authentication'))) {
            throw new Error('Failed to start chat: Invalid or missing Groq API Key.');
        }
        throw new Error('Failed to prepare initial chat messages due to an internal error.');
    }
};


// Function to send messages and get a non-streaming response (less used in chat UI)
export const sendMessage = async (
    messages: ChatCompletionMessageParam[]
): Promise<string> => {
    if (!groq) throw new Error("Groq service not available. Check API Key.");
    if (!messages?.length) {
        // console.warn("sendMessage called with empty history.");
        return "[No message history provided]";
    }

    // Filter out system messages if history contains an image (mirroring stream logic for consistency)
    const historyContainsImage = messages.some(msg =>
        Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url')
    );
    const messagesToSend = historyContainsImage ? messages.filter(msg => msg.role !== 'system') : messages;

    if (messagesToSend.length === 0 && historyContainsImage) {
        //  console.warn("sendMessage: History contained only system message and image(s). Cannot send empty history.");
         return "[Cannot process system message with image in non-streaming mode]";
    }

    // console.log(`Sending ${messagesToSend.length} messages to Groq (non-streaming). Image in history: ${historyContainsImage}`);

    try {
        // Use the CORRECTLY DEFINED local ChatCompletionCreateParams type
        const params: ChatCompletionCreateParams = {
            messages: messagesToSend, // Send potentially filtered messages
            model: MODEL_NAME,
            temperature: generationConfig.temperature,
            max_tokens: generationConfig.max_tokens,
            top_p: generationConfig.top_p,
            stop: generationConfig.stop,
            stream: false, // Explicitly non-streaming
        };

        const chatCompletion: ChatCompletion = await groq.chat.completions.create(params);

        const responseChoice = chatCompletion.choices[0];
        const responseContent = responseChoice?.message?.content;
        const finishReason = responseChoice?.finish_reason;

        // console.log(`Groq non-streaming response received. Finish Reason: ${finishReason}`);

        // Handle different finish reasons and null content
        if (responseContent === null) {
            // console.warn(`Groq response content is null. Finish reason: ${finishReason}`);
            if (finishReason === 'tool_calls') return "[Assistant used a tool - response not displayed.]";
            if (finishReason === 'stop') return ""; // Stop usually means valid empty response
            // Other reasons (length, content_filter) with null content are problematic
            throw new Error(`AI completed with null content and unexpected reason: ${finishReason}.`);
        } else if (!responseContent && finishReason !== 'stop') {
             // Content is empty string or undefined, but reason wasn't 'stop'
            //  console.warn(`Groq response content is empty/missing. Finish reason: ${finishReason}`);
             if (finishReason === 'length') return "[Response may be truncated due to length limit]";
             if (finishReason === 'content_filter' as string) return "[Response blocked by content filter]";
             throw new Error(`AI provided no valid response content. Finish Reason: ${finishReason}`);
        }

        // Return the valid response content
        return responseContent || ""; // Return empty string if content is validly empty

    } catch (error: unknown) {
        //  console.error('Error sending non-streaming message to Groq:', error);
         if (error instanceof Groq.APIError) {
             // Provide more specific error messages based on status
             if (error.status === 400) throw new Error(`Groq API Error (400): Bad Request. ${error.message}. Check input format/content.`);
             if (error.status === 401) throw new Error(`Groq API Error (401): Authentication Failed. Check API Key.`);
             if (error.status === 429) throw new Error(`Groq API Error (429): Rate Limit Exceeded.`);
             throw new Error(`Groq API Error: ${error.message} (Status: ${error.status})`);
         } else if (error instanceof Error) {
             // Handle network or other client-side errors
             throw new Error(`Failed to get non-streaming response: ${error.message}`);
         }
         // Fallback for unknown errors
         throw new Error('Unknown error communicating with AI service.');
    }
};


// Function to send messages and handle a streaming response
export const sendMessageStream = async (
    messages: ChatCompletionMessageParam[],
    onChunk: (chunk: string) => void,
    onError: (error: Error) => void,
    onComplete: () => void
): Promise<void> => {
    if (!groq) { onError(new Error("Groq service not initialized. Check API Key.")); return; }
    // Allow sending even if history only contains system message + user message (start of chat)
    if (!messages?.length) { onError(new Error("Cannot send empty message history for streaming.")); return; }

    // Note: Filtering based on image+system incompatibility is now handled *before* calling this function (in ChatPage.tsx)
    // This function receives the already prepared `historyForThisApiCall`.

    // console.log(`Sending ${messages.length} messages to Groq (streaming).`);
    // console.log("Messages being sent:", JSON.stringify(messages, null, 2)); // Verbose logging if needed

    let accumulatedText = "";
    let errorOccurred = false;
    let streamClosedNormally = false; // Track if 'stop' reason was received

    try {
        // Use the CORRECTLY DEFINED local ChatCompletionCreateParams type
        const params: ChatCompletionCreateParams = {
            messages: messages, // Send the prepared history
            model: MODEL_NAME,
            temperature: generationConfig.temperature,
            max_tokens: generationConfig.max_tokens,
            top_p: generationConfig.top_p,
            stop: generationConfig.stop,
            stream: true, // Explicitly streaming
        };

        // Type assertion needed because the SDK's default create signature might not guarantee Stream<Chunk>
        const stream = await groq.chat.completions.create(params) as unknown as Stream<ChatCompletionChunk>;

        // Process the stream chunk by chunk
        for await (const chunk of stream) {
             // Extract text content from the chunk's delta
             const chunkText = chunk.choices[0]?.delta?.content;
             if (chunkText) {
                 accumulatedText += chunkText;
                 onChunk(chunkText); // Pass the chunk to the UI callback
             }

             // Check for finish reason in the chunk (often in the last chunk for a choice)
             const chunkFinishReason = chunk.choices[0]?.finish_reason;
             if (chunkFinishReason) {
                //   console.log(`Groq stream chunk finished choice with reason: ${chunkFinishReason}`);
                  streamClosedNormally = (chunkFinishReason === 'stop'); // 'stop' is the normal successful completion

                  // Handle potentially problematic finish reasons
                  if (chunkFinishReason === 'content_filter') {
                      errorOccurred = true;
                      onError(new Error("Response stream blocked by content filter."));
                      break; // Stop processing the stream
                  } else if (!streamClosedNormally && chunkFinishReason !== 'tool_calls') {
                      // Warn if stopped for other reasons like length limit
                      let warningMessage = `\n[AI stream ended unexpectedly: ${chunkFinishReason}]`;
                      if (chunkFinishReason === 'length') {
                          warningMessage = "\n[AI response may be incomplete due to length limit]";
                      }
                      // Send warning as a chunk to UI if desired
                      // onChunk(warningMessage);
                    //    console.warn(`Stream ended with reason: ${chunkFinishReason}`);
                  }
             }
        } // End of for await loop

        // --- Stream processing finished ---

        if (!errorOccurred) {
             // Handle cases where the stream finished without errors but might be empty
              if (accumulatedText.trim().length === 0 && streamClosedNormally) {
                   // Stream finished normally ('stop') but produced no text
                //    console.warn("Groq stream completed normally but produced no text content.");
                   // Check if the last message sent *by the user* contained an image
                   const lastUserMessageContent = messages[messages.length - 1]?.content;
                   const hadImageInput = Array.isArray(lastUserMessageContent) && lastUserMessageContent.some(p => p.type === 'image_url');
                   // Provide specific feedback if an image was likely involved
                   // onChunk(hadImageInput ? "[Image received. No further text generated.]" : "[AI response was empty]");
               } else if (!streamClosedNormally && accumulatedText.trim().length === 0){
                   // Stream ended for other reasons (e.g., length) without text
                //    console.warn("Groq stream ended abnormally without producing text.");
               }
            //    console.log("Groq stream processing finished successfully.");
               onComplete(); // Signal normal completion
        }
        // If errorOccurred is true, onError was already called, so no need for else block here.

    } catch (error: unknown) {
        //  console.error('Error processing Groq stream:', error);
         errorOccurred = true; // Ensure error state is set
         let userFriendlyError: Error;

         // Handle specific Groq API errors
         if (error instanceof Groq.APIError) {
             const errorMessage = error.message || "Unknown API Error";
             if (error.status === 400) {
                 // Check if the error message indicates the known incompatibility
                 if (errorMessage.includes('prompting with images is incompatible') || errorMessage.includes('system message')) {
                     userFriendlyError = new Error("Cannot process images and system context together. API Limitation.");
                 } else {
                    userFriendlyError = new Error(`Stream failed (400 Bad Request): ${errorMessage}. Check input data/format.`);
                 }
             }
             else if (error.status === 401) userFriendlyError = new Error('Authentication error during streaming (401). Check API key.');
             else if (error.status === 429) userFriendlyError = new Error('API rate limit reached during streaming (429).');
             else if (error.status === 500) userFriendlyError = new Error('Groq server error during streaming (500). Please try again later.');
             else userFriendlyError = new Error(`Groq API Error (Stream): ${errorMessage} (Status: ${error.status})`);
         }
         // Handle potential client-side/network errors
         else if (error instanceof Error) {
            if (error.name === 'AbortError' || error.message.includes('timed out')) userFriendlyError = new Error('Streaming request timed out.');
            // Checking for common fetch/network error messages
            else if (error.message.toLowerCase().includes('networkerror') || error.message.toLowerCase().includes('failed to fetch')) {
                userFriendlyError = new Error('Network error during streaming. Check connection.');
            }
            else userFriendlyError = new Error(`Streaming failed: ${error.message}`);
         }
         // Fallback for completely unknown errors
         else {
             userFriendlyError = new Error('Unknown error during AI stream.');
         }
         onError(userFriendlyError); // Pass the processed error to the callback
         // Ensure onComplete is NOT called if there was an error
    }
};

// --- Service Object Export ---
// Group functions into a service object for cleaner imports
const groqService = {
    startChat,
    sendMessage,
    sendMessageStream,
    fileToApiImagePart,
    createSystemPrompt, // Export if needed elsewhere, e.g., for debugging
};

export default groqService;

// --- Type Re-exports ---
// Re-export types needed by components using this service
export type {
    ChatCompletionMessageParam,
    ChatCompletionContentPart,
    ImageContentPart,
    ChatCompletion,
    ChatCompletionChunk,
    ChatCompletionCreateParams // Export the local union type
};

// Re-export Groq namespace if needed for other type access
export { Groq };