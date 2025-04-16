// src/lib/groqf.ts

import Groq from 'groq-sdk';
// Import necessary types from the SDK
import {
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionCreateParamsStreaming,
    ChatCompletionCreateParamsBase,
    ChatCompletionMessageParam,
    ChatCompletion
} from 'groq-sdk/resources/chat/completions';

// Define a local union type for ChatCompletionCreateParams for convenience
type ChatCompletionCreateParams = ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming;

// --- Configuration ---
// Retrieve the Groq API key from environment variables
const API_KEY: string | undefined = import.meta.env.VITE_PUBLIC_GROQ_API_KEY;

// --- Model Selection ---
// Consider using a more capable model like Llama 3 70b for potentially better instruction following and formatting nuance.
// Keep 8b as a faster/cheaper option if needed.
const MODEL_NAME: ChatCompletionCreateParamsBase['model'] = "llama3-70b-8192"; // Recommended for better formatting
// const MODEL_NAME: ChatCompletionCreateParamsBase['model'] = "llama3-8b-8192"; // Faster/cheaper alternative

// Check if the API key is configured
if (!API_KEY) {
    // console.error("CRITICAL: VITE_PUBLIC_GROQ_API_KEY environment variable is not set. Groq formatting service will be unavailable.");
    // Depending on application requirements, you might throw an error here to halt execution
    // or allow the application to continue with degraded functionality.
    // throw new Error("Groq API Key is missing. Formatting feature disabled.");
}

// --- Initialization ---
// Initialize the Groq client only if the API key is available.
// dangerouslyAllowBrowser: true is necessary for client-side usage but ensure security implications are understood.
const groq: Groq | null = API_KEY ? new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true }) : null;

// Standard generation configuration for the model.
// Lower temperature promotes consistency and predictability in formatting tasks.
const generationConfig = {
    temperature: 0.15, // Lower temperature for more deterministic formatting results
    top_p: 0.9,       // Nucleus sampling parameter
    max_tokens: 4096, // Maximum number of tokens to generate in the completion
};

// Note: Groq's API handles safety filtering server-side.
// We monitor the 'finish_reason' in the response to understand why generation stopped.

/**
 * Constructs a detailed prompt for the Groq API to format text into high-quality Markdown.
 * Emphasizes structure, common elements (GFM), and includes explicit negative constraints.
 *
 * @param rawText - The unformatted text input by the user.
 * @returns The detailed prompt string.
 */
const createFormattingPrompt = (rawText: string): string => {
    // Escape characters within the examples that might confuse TypeScript or the LLM
    // Use backslashes to escape backticks, brackets, and parentheses within the examples
    // Note: These backslashes are for the JavaScript string literal. The final prompt
    // sent to the AI will contain the literal characters `[`, `]`, `(`, `)`, etc.
    return `
You are a highly meticulous text formatting assistant specializing in GitHub Flavored Markdown (GFM).
Your sole task is to convert the provided raw text into clean, readable, well-structured, and semantically accurate Markdown.

Apply the following formatting rules diligently and intelligently:

1.  **Headings:**
    *   Use Markdown headings (#, ##, ###, etc.) for titles and section breaks.
    *   Infer logical heading levels (e.g., use ## or ### for main sections, deeper levels for sub-sections). Avoid skipping levels (e.g., # directly to ###).
    *   If the text seems to have one main title, use a single # for it and subsequent sections start with ##.
2.  **Paragraphs:**
    *   Ensure distinct paragraphs are separated by exactly one blank line.
    *   Do NOT use multiple blank lines between paragraphs.
    *   Preserve meaningful line breaks within paragraphs *only* if the context strongly suggests it (e.g., poetry, addresses). Avoid adding double spaces for line breaks unless essential.
3.  **Lists:**
    *   Format bulleted lists using hyphens (-) or asterisks (*). Be consistent within a single list.
    *   Format numbered lists using '1.', '2.', '3.'. Restart numbering for separate lists.
    *   Correctly handle nested lists by indenting them with 2 or 4 spaces. Ensure consistent indentation for nested items.
4.  **Emphasis:**
    *   Use bold (**text**) for strong emphasis, key terms, definitions, or inline subheadings/labels (e.g., "**Ingredients:**").
    *   Use italics (*text*) for mild emphasis, titles of works (books, articles), foreign words, or defining a term inline.
    *   Use strikethrough (~~text~~) only if the raw text explicitly indicates deletion or obsolescence.
5.  **Code:**
    *   Use backticks (\`) for inline code snippets, commands, or technical terms. Escape inline backticks like \\\`\\\`.
    *   Use fenced code blocks (\`\`\`language ... \`\`\`) for multi-line code examples. Infer the language (e.g., \`\`\`javascript) if obvious, otherwise use \`\`\`text or just \`\`\`.
6.  **Blockquotes:**
    *   Use '>' for blockquotes. Apply '>' consistently to each line within the quote, including blank lines if they are part of the quoted text.
7.  **Horizontal Rules:**
    *   Use '---' on a line by itself to create thematic breaks *only* where a clear separation between major sections is needed and headings are not used or appropriate. Use sparingly.
8.  **Links & Images:**
    *   If the raw text contains URLs, preserve them as plain text unless the surrounding text *clearly* indicates it should be a Markdown link (e.g., "See more at [http://example.com]"). Avoid guessing link text.
    *   If the raw text already contains valid Markdown for links like '[text](url)' or images like '![alt](url)', preserve them exactly. Do not escape them in the output.
9.  **Tables:**
    *   If the raw text clearly represents tabular data (e.g., using consistent separators like pipes | or multiple spaces/tabs), format it as a GFM table with headers.
    *   If the structure isn't obviously a table, leave it as preformatted text or lists.
10. **Whitespace:**
    *   Remove unnecessary leading/trailing whitespace from all lines.
    *   Ensure consistent indentation, particularly for lists and code blocks.
11. **Content Integrity:**
    *   Maintain the original meaning, intent, and ALL information precisely.
    *   Do NOT add, remove, or summarize any content.
    *   Correct obvious, unambiguous typos ONLY if essential for readability (e.g., 'teh' -> 'the'). Be extremely conservative; prioritize preservation.

**CRITICAL OUTPUT REQUIREMENTS:**
- **Output ONLY the formatted Markdown text.**
- **ABSOLUTELY NO introductory phrases** (like "Here is the formatted Markdown:", "Okay, here's the text:").
- **ABSOLUTELY NO concluding remarks** or explanations about the formatting applied.
- **Do NOT wrap the entire output in a Markdown code block** unless the input raw text itself was clearly intended to be a single code block.

Raw Text to Format:
---
${rawText}
---

Formatted Markdown Output:
`;
}; // End of createFormattingPrompt function definition


/**
 * Sends raw text to the Groq API and returns intelligently formatted Markdown.
 * Uses a detailed prompt and handles potential API issues according to TypeScript rules.
 *
 * @param rawText - The plain text content to format.
 * @returns A Promise resolving to the formatted Markdown string.
 * @throws An error if the API key is missing, the API call fails, content is blocked, or formatting fails unexpectedly.
 */
export const formatContentWithGroq = async (rawText: string): Promise<string> => {
    // 1. Check Initialization and Input
    if (!groq) {
        // console.error("Groq AI client is not initialized. Formatting unavailable.");
        // Throwing an error here is appropriate as the function cannot proceed.
        throw new Error("Groq AI client is not initialized. Check API Key.");
    }
    // Use optional chaining and trim for robust input checking
    const trimmedInput = rawText?.trim();
    if (!trimmedInput) {
        // console.warn("formatContentWithGroq called with empty or whitespace-only input.");
        // Return empty string for empty input, fulfilling the Promise<string> return type.
        return "";
    }

    // 2. Prepare Prompt and API Request
    const prompt = createFormattingPrompt(trimmedInput);
    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: prompt }];

    const params: ChatCompletionCreateParams = {
        messages: messages,
        model: MODEL_NAME,
        temperature: generationConfig.temperature,
        max_tokens: generationConfig.max_tokens,
        top_p: generationConfig.top_p,
        stream: false, // Formatting is typically a non-streaming task
        // 'stop' sequences are usually not needed if max_tokens is sufficient and prompt is clear
    };

    // 3. Execute API Call and Handle Response
    try {
        // console.log(`Sending formatting request to Groq model: ${MODEL_NAME}...`);
        const chatCompletion: ChatCompletion = await groq.chat.completions.create(params);
        // console.log("Received formatting response from Groq.");

        // Validate the response structure
        const choice = chatCompletion.choices?.[0]; // Use optional chaining

        if (!choice) {
            // console.error("Groq Formatting Error: No choices array or first choice missing in the response.", chatCompletion);
            throw new Error("AI formatter returned an invalid response structure (no choices).");
        }

        const finishReason = choice.finish_reason;
        // Use optional chaining for message and content access
        const formattedText = choice.message?.content;

        // console.log(`Groq formatting finished. Reason: ${finishReason}. Content received: ${formattedText !== null && formattedText !== undefined}`);

        // --- Analyze Finish Reason and Content ---

        // Handle potential content filtering or other non-standard stops first
        if (finishReason !== 'stop' && finishReason !== 'length') {
            if (typeof finishReason === 'string' && finishReason.toLowerCase().includes('filter')) {
                // console.warn(`Groq Formatting Blocked: Finish reason suggests content filtering (${finishReason}).`);
                throw new Error(`Content formatting was blocked due to safety or content guidelines.`);
            } else if (finishReason === 'tool_calls') {
                // console.warn(`Groq Formatting Warning: Model unexpectedly attempted tool usage.`);
                throw new Error(`Formatting failed: AI model attempted an unexpected action (tool use).`);
            } else {
                // Handle other unexpected non-stop reasons
                // console.error(`Groq Formatting Error: Unexpected finish reason: ${finishReason}`);
                throw new Error(`Formatting stopped unexpectedly. Reason: ${finishReason}.`);
            }
        }

        // Handle potential length truncation (still return partial content if available)
        if (finishReason === 'length') {
            // console.warn("Groq Formatting Warning: Output may be truncated because the maximum token limit was reached.");
        }

        // --- Validate Formatted Content ---
        // Check strictly for null or undefined, as an empty string "" is a valid response
        if (formattedText === null || formattedText === undefined) {
            // console.warn("Groq Formatting Warning: Response received successfully, but the message content is null or undefined.");
            // Throw an error as we expect a string, even if empty
            throw new Error("AI formatter returned empty content unexpectedly.");
        }

        // If the model returns an empty string or only whitespace, respect it, but log a warning.
        const trimmedOutput = formattedText.trim();
        if (trimmedOutput.length === 0 && formattedText.length > 0) {
            // console.warn("Groq Formatting Warning: Formatted content consists only of whitespace.");
            return ""; // Return empty string if only whitespace
        } else if (trimmedOutput.length === 0) {
            // console.warn("Groq Formatting Warning: Formatted content is an empty string.");
            return ""; // Return empty string if truly empty
        }

        // --- Success ---
        // console.log("Groq formatting successful.");
        // Return the trimmed, formatted Markdown.
        return trimmedOutput;

    // 4. Handle Errors during API Call
    } catch (error: unknown) {
        // Log the raw error for debugging purposes
        // console.error('Error during Groq formatting API call:', error);

        // Type checking for specific error types
        if (error instanceof Groq.APIError) {
            // Handle specific Groq API errors more granularly
            const status = error.status ?? 'N/A'; // Use nullish coalescing for potentially undefined status
            const errName = error.name ?? 'Unknown API Error';
            const errMessage = error.message ?? 'No message provided.';
            // console.error(`Groq API Error: Status ${status}, Type: ${errName}, Message: ${errMessage}`);

            // Provide user-friendly error messages based on status code
            if (status === 401 || status === 403) {
                throw new Error('Groq Formatting Failed: Authentication Error. Please check your API key.');
            } else if (status === 429) {
                throw new Error('Groq Formatting Failed: API Rate Limit Reached. Please try again later.');
            } else if (status === 400) {
                throw new Error(`Groq Formatting Failed: Bad Request (400). Check model name or input data. Details: ${errMessage}`);
            } else if (status >= 500) {
                throw new Error(`Groq Formatting Failed: Server Error (${status}) on Groq's end. Please try again later.`);
            }
            // General API error catch-all
            throw new Error(`Groq Formatting Failed: API Error (${status} ${errName}).`);

        } else if (error instanceof Error) {
            // Handle standard JavaScript errors (network errors, timeouts, errors thrown above)
            if (error.name === 'AbortError') { // Check for timeout errors
                throw new Error('Groq Formatting Failed: The request timed out.');
            }
            // Check for common network error indicators in the message
            if (error.message.includes('fetch') || error.message.toLowerCase().includes('network error')) {
                throw new Error('Groq Formatting Failed: Network error. Please check your internet connection.');
            }
            // Re-throw specific errors already processed (like content blocked) or other standard errors
            // This preserves the original error type and message if it was intentionally thrown earlier.
            throw error;
        } else {
            // Catch-all for non-standard error types (e.g., strings thrown)
            // console.error('An unknown error type was caught:', error);
            throw new Error('An unexpected error occurred during content formatting.');
        }
    }
}; // End of formatContentWithGroq function

// Optional: Export the service if needed elsewhere (useful for organization)
// export const groqFormattingService = {
//     formatContentWithGroq
// };