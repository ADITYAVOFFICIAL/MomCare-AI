// src/lib/groqMod.ts

import Groq from 'groq-sdk';

// --- SDK Type Imports ---
import {
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionCreateParamsStreaming,
    ChatCompletionCreateParamsBase,
    ChatCompletionMessageParam,
    ChatCompletion
} from 'groq-sdk/resources/chat/completions'; // Adjust path if needed

// --- Local Type Definitions ---

/** Defines the possible moderation decisions. */
export enum ModerationDecision {
    ALLOW = "ALLOW", // Content seems acceptable.
    FLAG = "FLAG",   // Content might violate rules, requires human review.
    DENY = "DENY",   // Content clearly violates rules (use cautiously, often prefer FLAG).
    ERROR = "ERROR"  // An error occurred during moderation.
}

/** Defines the types of potential violations the AI can flag. */
export enum ModerationFlag {
    HATE_SPEECH = "HATE_SPEECH",
    HARASSMENT = "HARASSMENT",
    SPAM = "SPAM",
    PII = "PII", // Personally Identifiable Information
    MEDICAL_MISINFORMATION = "MEDICAL_MISINFORMATION",
    EXPLICIT_CONTENT = "EXPLICIT_CONTENT",
    VIOLENCE_THREATS = "VIOLENCE_THREATS",
    SELF_HARM = "SELF_HARM",
    OFF_TOPIC = "OFF_TOPIC",
    // Added a flag for potentially nonsensical/placeholder text if strict ALLOW isn't desired
    UNCLEAR_PLACEHOLDER = "UNCLEAR_PLACEHOLDER",
    OTHER = "OTHER"
}

/** Structure for the moderation result returned by the service. */
export interface ModerationResult {
    decision: ModerationDecision;
    reason?: string;
    flags: ModerationFlag[];
    originalContent: string;
}

/** Options for the moderation request. */
export interface ModerationOptions {
    contentType?: 'forum_title' | 'forum_post' | 'general_text';
}

// Local union type for Groq Chat Completion Create parameters
type ChatCompletionCreateParams = ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming;

// --- Configuration ---
const API_KEY: string | undefined = import.meta.env.VITE_PUBLIC_GROQ_API_KEY;
// Using 70b model might offer better nuance and reduce false positives compared to 8b
const MODEL_NAME: ChatCompletionCreateParamsBase['model'] = "llama3-70b-8192";
// const MODEL_NAME: ChatCompletionCreateParamsBase['model'] = "llama3-8b-8192"; // Faster alternative

// --- Initialization Check ---
if (!API_KEY) {
    // console.error("CRITICAL ERROR: VITE_PUBLIC_GROQ_API_KEY is missing. Content moderation service will be unavailable.");
}

// --- Groq Client Initialization ---
const groq: Groq | null = API_KEY ? new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true }) : null;

// --- Moderation Generation Configuration ---
const moderationGenConfig = {
    temperature: 0.1, // Keep low for consistency
    max_tokens: 512,
    top_p: 0.9,
};

// --- Helper Function: Create Moderation Prompt (IMPROVED) ---

const createModerationPrompt = (contentToModerate: string, options?: ModerationOptions): string => {
    const contentType = options?.contentType ?? 'general_text';
    const contextDescription = contentType.replace('_', ' ');

    // --- MODIFIED Moderation Rules ---
    const moderationRules = `
Moderation Guidelines for MomCare AI Forum (Pregnancy & Parenting Focus):
1.  **NO Hate Speech/Harassment:** Prohibit hate speech, harassment, or targeted abuse based on protected characteristics (e.g., race, religion, gender, nationality, or language). This includes any hate slurs, insults, or derogatory language targeting individuals or groups in ANY language, including slurs commonly used in Indian languages (e.g., Hindi, Tamil, Telugu, Bengali, Punjabi, Marathi, Kannada, Malayalam, etc.) [eg randi, lund, lawda, chootmarike, choot, chut, bhosada]or in any other language. Intent and targeting are key. Do not flag generic or neutral words used in benign contexts.
2.  **Handle Placeholder/Short Text:** Common placeholder words like "sample", "test", "placeholder", "asdf", or very short, context-free inputs (e.g., single neutral words) should generally be "ALLOW". Do not misinterpret these as violations unless combined with other prohibited content.
3.  **NO Spam/Excessive Promotion:** Deny unsolicited advertising, repetitive posts, irrelevant links (SPAM flag).
4.  **NO Personally Identifiable Information (PII):** Flag sharing or soliciting full names, specific addresses, phone numbers, personal emails. Use caution with dates of birth + names. (PII flag, FLAG decision).
5.  **NO Harmful Medical Misinformation:** Deny or Flag dangerous, unverified medical advice contradicting established consensus. Refer users to professionals. (MEDICAL_MISINFORMATION flag). General symptom discussion is okay.
6.  **NO Explicit/Graphic Content:** Deny pornography, excessive gore, or graphically violent content (EXPLICIT_CONTENT flag).
7.  **NO Threats/Incitement to Violence:** Deny clear threats of harm (VIOLENCE_THREATS flag).
8.  **FLAG Sensitive Self-Harm Content:** Content explicitly detailing methods or expressing immediate suicidal intent requires urgent human review. (SELF_HARM flag, FLAG decision).
9.  **FLAG Off-Topic Content:** Flag content clearly unrelated to pregnancy, parenting, baby care, women's health, or community support. (OFF_TOPIC flag, FLAG decision).
`;

    // --- MODIFIED Output Instructions (Emphasize context, add placeholder example) ---
    const outputInstructions = `
**Analysis Task:**
Analyze the user-submitted text (${contextDescription}) against the Moderation Guidelines. Consider the context (forum for parents/expectant mothers). Be particularly careful not to misinterpret placeholder text or short, neutral inputs as violations.

**Output Format:**
Respond ONLY with a single, valid JSON object string. NO other text, greetings, or explanations outside the JSON structure.
Keys: "decision", "reason", "flags".
- "decision": (string) "${ModerationDecision.ALLOW}", "${ModerationDecision.FLAG}", "${ModerationDecision.DENY}".
    - ALLOW: No guidelines violated, including common placeholders like "sample" or "test".
    - FLAG: Borderline content, potential PII, self-harm references, medical advice needing review, off-topic, or potentially inappropriate but not severe/targeted abuse.
    - DENY: Clear, severe violations: hate speech, threats, spam, explicit content, harmful medical misinformation, or *unambiguous, severe, targeted* insults/slurs (use HARASSMENT/HATE_SPEECH flag).
- "reason": (string) Brief explanation (max 30 words) for FLAG/DENY. "No issues found." or "Placeholder text detected." for ALLOW.
- "flags": (array of strings) Flags from [${Object.values(ModerationFlag).join(', ')}]. Empty array [] for ALLOW. Use HARASSMENT for severe targeted insults/slurs.

**Example 1 (Severe Abuse - DENY):**
Input Text: "[Severe targeted slur] go away!"
Output JSON:
{
  "decision": "DENY",
  "reason": "Severe targeted slur and abusive language.",
  "flags": ["${ModerationFlag.HARASSMENT}"]
}

**Example 2 (Potential PII - FLAG):**
Input Text: "My doctor, Dr. Anya Sharma, suggested I try..."
Output JSON:
{
  "decision": "FLAG",
  "reason": "Potential sharing of Personally Identifiable Information (doctor's name).",
  "flags": ["${ModerationFlag.PII}"]
}

**Example 3 (Placeholder Text - ALLOW):**
Input Text: "sample"
Output JSON:
{
  "decision": "ALLOW",
  "reason": "Placeholder text detected.",
  "flags": []
}

**Example 4 (Placeholder Text - ALLOW):**
Input Text: "sample title sample content"
Output JSON:
{
  "decision": "ALLOW",
  "reason": "Placeholder text detected.",
  "flags": []
}

**Example 5 (Allowed Question):**
Input Text: "Feeling really tired in the third trimester. Any tips?"
Output JSON:
{
  "decision": "ALLOW",
  "reason": "No issues found.",
  "flags": []
}

**CRITICAL:** Output ONLY the JSON object string. Focus on clear violations for DENY.
`;

    return `
You are a content moderation assistant for the MomCare AI forum (pregnancy/parenting focus). Analyze user text for compliance with guidelines, carefully distinguishing genuine violations from placeholder text or harmless inputs.

${moderationRules}
${outputInstructions}

**Text Content to Analyze:**
---
${contentToModerate}
---

**Moderation Result (JSON only):**
`;
};

// --- Helper Function: Parse and Validate API Response (No changes needed here) ---
const parseAndValidateModerationResult = (responseText: string | null | undefined, originalContent: string): ModerationResult => {
    const defaultErrorResult: ModerationResult = {
        decision: ModerationDecision.ERROR,
        reason: "Failed to get a valid response from the moderation service.",
        flags: [],
        originalContent: originalContent,
    };

    if (!responseText?.trim()) {
        // console.error("Moderation Error: Received empty or null response from Groq.");
        return { ...defaultErrorResult, reason: "Received empty response from AI." };
    }

    let cleanedJsonString = responseText.trim();
    if (cleanedJsonString.startsWith("```json") && cleanedJsonString.endsWith("```")) {
        cleanedJsonString = cleanedJsonString.substring(7, cleanedJsonString.length - 3).trim();
    } else if (cleanedJsonString.startsWith("`") && cleanedJsonString.endsWith("`")) {
         cleanedJsonString = cleanedJsonString.substring(1, cleanedJsonString.length - 1).trim();
    }

    let parsedData: unknown;
    try {
        parsedData = JSON.parse(cleanedJsonString);
    } catch (parseError: unknown) {
        // console.error("Moderation Error: Failed to parse AI JSON response:", parseError);
        // console.error("Received text:", responseText);
        return { ...defaultErrorResult, reason: `Invalid JSON format received from AI. ${parseError instanceof Error ? `Details: ${parseError.message}` : ''}` };
    }

    if (typeof parsedData !== 'object' || parsedData === null) {
        // console.error("Moderation Error: Parsed data is not an object.");
        return { ...defaultErrorResult, reason: "AI response was not a valid JSON object." };
    }

    const result = parsedData as Partial<ModerationResult>;

    const decision = result.decision;
    if (!decision || !Object.values(ModerationDecision).includes(decision as ModerationDecision)) {
        // console.error(`Moderation Error: Invalid or missing 'decision' field. Received: ${decision}`);
        return { ...defaultErrorResult, reason: `Invalid decision value received: ${decision}` };
    }

    const reason = typeof result.reason === 'string' ? result.reason.trim() : undefined;
    if (decision !== ModerationDecision.ALLOW && !reason) {
        // console.warn(`Moderation Warning: Decision is ${decision} but 'reason' field is missing or empty.`);
    }

    let flags: ModerationFlag[] = [];
    if (!Array.isArray(result.flags)) {
        if (decision !== ModerationDecision.ALLOW) { /*console.warn(`Moderation Warning: Decision is ${decision} but 'flags' field is missing or not an array.`);*/ }
        flags = [];
    } else {
        flags = result.flags.filter((flag: any): flag is ModerationFlag =>
            typeof flag === 'string' && Object.values(ModerationFlag).includes(flag as ModerationFlag)
        );
        if (flags.length < result.flags.length) { /*console.warn(`Moderation Warning: Filtered out invalid flag values.`);*/ }
    }

    if (decision === ModerationDecision.ALLOW && flags.length > 0) { /*console.warn(`Moderation Warning: Decision is ALLOW but flags array is not empty. Clearing flags.`);*/ flags = []; }
    // Allow FLAG decision even without flags/reason, although not ideal
    // if (decision !== ModerationDecision.ALLOW && flags.length === 0 && !reason) { console.warn(`Moderation Warning: Decision is ${decision} but both flags and reason are missing/empty.`); }

    const validatedResult: ModerationResult = {
        decision: decision as ModerationDecision,
        reason: reason || (decision === ModerationDecision.ALLOW ? "No issues found." : "No specific reason provided."),
        flags: flags,
        originalContent: originalContent,
    };

    // console.log("Moderation Result:", validatedResult);
    return validatedResult;
};


// --- Public API Function (No changes needed here) ---
export const moderateContent = async (
    contentToModerate: string,
    options?: ModerationOptions
): Promise<ModerationResult> => {
    if (!groq) {
        // console.error("Groq AI client (moderation) is not initialized.");
        return { decision: ModerationDecision.ERROR, reason: "Moderation service not configured.", flags: [], originalContent: contentToModerate };
    }

    const trimmedContent = contentToModerate?.trim();
    if (!trimmedContent) {
        return { decision: ModerationDecision.ALLOW, reason: "Content is empty.", flags: [], originalContent: contentToModerate };
    }

    const prompt = createModerationPrompt(trimmedContent, options);
    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: prompt }];
    const params: ChatCompletionCreateParams = {
        messages: messages, model: MODEL_NAME, temperature: moderationGenConfig.temperature,
        max_tokens: moderationGenConfig.max_tokens, top_p: moderationGenConfig.top_p, stream: false,
    };

    try {
        // console.log(`Sending moderation request to Groq model: ${MODEL_NAME}...`);
        const chatCompletion: ChatCompletion = await groq.chat.completions.create(params);
        // console.log("Received moderation response from Groq.");
        const choice = chatCompletion.choices?.[0];
        const responseText = choice?.message?.content;
        const finishReason = choice?.finish_reason;
        // console.log(`Groq moderation finished. Reason: ${finishReason}. Content received: ${!!responseText}`);

        if (finishReason !== 'stop' && finishReason !== 'length') {
             if (typeof finishReason === 'string' && finishReason.toLowerCase().includes('filter')) {
                //  console.warn(`Moderation Blocked by Content Filter: Finish reason: ${finishReason}. Flagging content.`);
                 return { decision: ModerationDecision.FLAG, reason: "Content potentially blocked by AI safety filters.", flags: [ModerationFlag.OTHER], originalContent: trimmedContent };
             } else {
                //  console.error(`Groq Moderation Error: Unexpected finish reason: ${finishReason}`);
                 return { decision: ModerationDecision.ERROR, reason: `Moderation stopped unexpectedly. Reason: ${finishReason}.`, flags: [], originalContent: trimmedContent };
             }
        }
         if (finishReason === 'length') {
            //  console.warn("Groq Moderation Warning: Output potentially truncated.");
         }

        return parseAndValidateModerationResult(responseText, trimmedContent);

    } catch (error: unknown) {
        // console.error('Error during Groq moderation API call:', error);
        let reason = "An unexpected error occurred during content moderation.";
        if (error instanceof Groq.APIError) {
            const status = error.status ?? 'N/A'; const errMessage = error.message ?? 'No message provided.';
            reason = `API Error (${status}): ${errMessage}.`;
            if (status === 401 || status === 403) reason += " Check API key.";
            if (status === 429) reason = "Moderation service busy (rate limit). Please try again shortly.";
            if (status === 400) reason = `API Bad Request (400): ${errMessage}. Check model/input.`;
            if (status >= 500) reason = `API Server Error (${status}). Please try again later.`;
        } else if (error instanceof Error) { reason = `Moderation failed: ${error.message}`; }
        return { decision: ModerationDecision.ERROR, reason: reason, flags: [], originalContent: trimmedContent };
    }
};

// --- Optional: Export Service Object ---
export const groqModService = {
    moderateContent,
};
