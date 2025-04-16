// src/lib/groqProduct.ts

import Groq from 'groq-sdk';

// --- SDK Type Imports ---
import {
    ChatCompletionCreateParamsNonStreaming,
    ChatCompletionCreateParamsStreaming,
    ChatCompletionCreateParamsBase,
    ChatCompletionMessageParam,
    ChatCompletion
} from 'groq-sdk/resources/chat/completions';

// --- Appwrite Type Imports ---
import { UserProfile } from './appwrite'; // Adjust path if necessary

// --- Local Type Definitions ---

// Define valid product categories
export const VALID_PRODUCT_CATEGORIES = [
    "Comfort", "Nutrition", "Health & Wellness", "Baby Gear",
    "Clothing", "Self-Care", "Books & Education"
] as const; // Use 'as const' for literal types

export type ProductCategory = typeof VALID_PRODUCT_CATEGORIES[number];

// UPDATED: Added optional 'reasoning' field
export interface ProductRecommendation {
  id: string;
  name: string;
  description: string;
  category?: ProductCategory | string;
  searchKeywords?: string;
  reasoning?: string; // Optional field for AI explanation
}

type ChatCompletionCreateParams = ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming;

// --- Configuration ---
const API_KEY: string | undefined = import.meta.env.VITE_PUBLIC_GROQ_API_KEY;
const COMPLEX_MODEL_NAME: ChatCompletionCreateParamsBase['model'] = "llama3-70b-8192"; // For personalized/prompt-based
const SIMPLER_MODEL_NAME: ChatCompletionCreateParamsBase['model'] = "llama3-8b-8192";  // For general

if (!API_KEY) {
    console.error("CRITICAL ERROR: VITE_PUBLIC_GROQ_API_KEY missing.");
    // In a real app, you might want to throw an error or disable features relying on this.
}

const groq: Groq | null = API_KEY ? new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true }) : null;

const generationConfig = {
    temperature: 0.5,
    max_tokens: 4096, // Kept higher for potentially longer reasoning strings + 25 items
    top_p: 0.9,
};

// --- Helper Function: Create Prompts ---

// UPDATED: Added 'reasoning' to instructions and example
const BASE_JSON_INSTRUCTIONS = `
**Output Format:**
Provide the response STRICTLY as a valid JSON array string. Each object must have keys "name", "description", "category", "searchKeywords", and optionally "reasoning".
- **name:** Product name (string).
- **description:** Brief explanation (1-2 sentences) why it's helpful (string).
- **category:** Assign ONE category from this list: ${VALID_PRODUCT_CATEGORIES.join(', ')} (string).
- **searchKeywords:** 2-3 relevant search keywords (string).
- **reasoning:** (Optional) Briefly explain (max 15 words) *why* this product is relevant based on the user context/prompt provided (e.g., "Good for 3rd trimester back support", "Matches dietary preference: vegetarian", "Addresses user query about sleep"). (string).
**ALL keys and ALL string values MUST be enclosed in double quotes ("").** Ensure correct JSON syntax (commas between objects, no trailing commas).

**Example JSON Object:**
{
  "name": "Example Product Name",
  "description": "Relevant description.",
  "category": "Example Category",
  "searchKeywords": "keyword1, keyword2",
  "reasoning": "Helpful for [specific context aspect]."
}

**CRITICAL OUTPUT REQUIREMENTS:**
- **Output ONLY the JSON array string.**
- **NO introductory/concluding text.**
- **Ensure valid JSON syntax.**
`;

/**
 * Creates prompt for PERSONALIZED recommendations.
 * @param profile - User's profile.
 * @param categoryFocus - Optional category to focus on.
 * @returns The prompt string.
 */
const createPersonalizedPrompt = (profile: UserProfile, categoryFocus?: ProductCategory | string): string => {
    const weeks = profile.weeksPregnant ?? 'unknown';
    const activity = profile.activityLevel ?? 'unspecified';
    const conditions = profile.preExistingConditions?.trim() || 'none specified';
    const deliveryPref = profile.deliveryPreference ?? 'undecided';
    const diet = profile.dietaryPreferences?.join(', ') || 'none specified';

    let context = `User Profile Context:\n`;
    context += `- Pregnancy Stage: Approximately ${weeks} weeks\n`;
    context += `- Activity Level: ${activity}\n`;
    context += `- Pre-existing Conditions: ${conditions}\n`;
    context += `- Delivery Preference: ${deliveryPref}\n`;
    context += `- Dietary Preferences: ${diet}\n`;

    let focusInstruction = categoryFocus
        ? `\n**Focus exclusively on products within the '${categoryFocus}' category.** Do not suggest products from other categories.`
        : '';

    // Request up to 25 products
    return `
You are a helpful assistant specializing in pregnancy products. Based on the user context, suggest **up to 25** relevant products. Include a brief 'reasoning' field explaining the relevance based on the context.
${focusInstruction}

${context}

${BASE_JSON_INSTRUCTIONS}
`;
};

/**
 * Creates prompt for GENERAL recommendations. Reasoning is less relevant here.
 * @param categoryFocus - Optional category to focus on.
 * @returns The prompt string.
 */
const createGeneralPrompt = (categoryFocus?: ProductCategory | string): string => {
     let focusInstruction = categoryFocus
        ? `\n**Focus exclusively on products within the '${categoryFocus}' category.** Do not suggest products from other categories.`
        : '';

    // Request up to 25 products - Reasoning field is optional and less likely to be useful here.
    return `
You are a helpful assistant specializing in pregnancy and baby products.
Suggest **up to 25** generally useful and popular products for expectant mothers across different pregnancy stages.
${focusInstruction}

${BASE_JSON_INSTRUCTIONS}
`;
};

/**
 * Creates prompt based on USER'S specific query. Ask for reasoning based on prompt.
 * @param userPrompt - The user's text query.
 * @param categoryFocus - Optional category to focus on.
 * @returns The prompt string.
 */
const createPromptBasedPrompt = (userPrompt: string, categoryFocus?: ProductCategory | string): string => {
     let focusInstruction = categoryFocus
        ? `\n**Focus exclusively on products within the '${categoryFocus}' category related to the user's request.**`
        : '';

    // Request up to 25 products and reasoning based on the prompt.
    return `
You are a helpful assistant specializing in pregnancy products.
The user is asking for product suggestions related to: "${userPrompt}"
Suggest **up to 25** relevant products based *specifically* on the user's request. Include a brief 'reasoning' field explaining how the suggestion addresses the user's query.
${focusInstruction}

${BASE_JSON_INSTRUCTIONS}
`;
};


// --- Helper Function: Parse and Validate JSON ---
/**
 * Parses the AI response string and validates the structure.
 * @param responseText - The raw text response from the AI.
 * @param context - String indicating the type of request for logging.
 * @returns An array of validated ProductRecommendation objects.
 * @throws An error if parsing or validation fails.
 */
const parseAndValidateRecommendations = (responseText: string, context: string): ProductRecommendation[] => {
    let cleanedJsonString = responseText.trim();
    const jsonStartIndex = cleanedJsonString.indexOf('[');
    const jsonEndIndex = cleanedJsonString.lastIndexOf(']');

    if (jsonStartIndex === -1 || jsonEndIndex === -1 || jsonEndIndex < jsonStartIndex) {
        console.error(`[${context}] Could not find valid JSON array structure in response:`, responseText);
        throw new Error(`AI response for ${context} recommendations did not contain a recognizable JSON array.`);
    }
    cleanedJsonString = cleanedJsonString.substring(jsonStartIndex, jsonEndIndex + 1);

    try {
        const parsedData: unknown = JSON.parse(cleanedJsonString);
        if (!Array.isArray(parsedData)) {
            console.error(`[${context}] Parsed Groq response is not an array:`, parsedData);
            throw new Error(`AI response for ${context} recommendations was not in the expected JSON array format after cleaning.`);
        }

        const validatedRecommendations: ProductRecommendation[] = parsedData
            .map((item: unknown, index: number): ProductRecommendation | null => {
                if (typeof item !== 'object' || item === null) {
                    console.warn(`[${context}] Recommendation item ${index} is not an object:`, item);
                    return null;
                }
                const record = item as Record<string, unknown>;
                const name = record.name;
                const description = record.description;
                if (typeof name !== 'string' || !name.trim()) {
                    console.warn(`[${context}] Item ${index} missing or invalid 'name':`, item); return null;
                }
                if (typeof description !== 'string' || !description.trim()) {
                    console.warn(`[${context}] Item ${index} missing or invalid 'description':`, item); return null;
                }

                // Handle optional fields safely
                const category = record.category;
                const searchKeywords = record.searchKeywords;
                const reasoning = record.reasoning; // Extract optional reasoning

                const finalCategory = (typeof category === 'string' && category.trim()) ? category.trim() : undefined;
                const finalKeywords = (typeof searchKeywords === 'string' && searchKeywords.trim()) ? searchKeywords.trim() : undefined;
                const finalReasoning = (typeof reasoning === 'string' && reasoning.trim()) ? reasoning.trim() : undefined; // Validate reasoning

                if (finalCategory && !VALID_PRODUCT_CATEGORIES.includes(finalCategory as ProductCategory)) {
                     console.warn(`[${context}] Item ${index} has unexpected category '${finalCategory}':`, item);
                }

                return {
                    id: `${context.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${index}`,
                    name: name.trim(),
                    description: description.trim(),
                    category: finalCategory,
                    searchKeywords: finalKeywords,
                    reasoning: finalReasoning, // Add validated reasoning
                };
            })
            .filter((item): item is ProductRecommendation => item !== null);

        if (validatedRecommendations.length === 0 && parsedData.length > 0) {
            throw new Error(`AI response items for ${context} recommendations lacked required fields or had invalid types.`);
        }
        console.log(`Successfully parsed ${validatedRecommendations.length} valid ${context} recommendations.`);
        return validatedRecommendations;

    } catch (parseError: unknown) {
        console.error(`Failed to parse ${context} Groq JSON response:`, parseError);
        console.error(`Cleaned ${context} JSON string attempt:`, cleanedJsonString);
        console.error(`Original ${context} response text received:`, responseText);
        throw new Error(`Failed to parse AI recommendations (${context}). ${parseError instanceof Error ? `Error: ${parseError.message}` : 'Invalid format received.'}`);
    }
};


// --- Private Helper: Core Fetch Logic ---
/**
 * Internal function to handle the actual API call and parsing.
 */
const _fetchAndParseGroqRecommendations = async (
    prompt: string,
    modelName: string,
    contextLabel: string
): Promise<ProductRecommendation[]> => {
     if (!groq) {
        throw new Error(`Product recommendation service (${contextLabel}) is not available. Check API Key.`);
    }
    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: prompt }];
    const params: ChatCompletionCreateParams = {
        messages: messages,
        model: modelName,
        temperature: generationConfig.temperature,
        max_tokens: generationConfig.max_tokens,
        top_p: generationConfig.top_p,
        stream: false,
        // response_format: { type: "json_object" }, // Keep commented unless support confirmed
    };

     try {
        console.log(`Sending ${contextLabel} recommendation request to Groq model: ${modelName}...`);
        const chatCompletion: ChatCompletion = await groq.chat.completions.create(params);
        console.log(`Received ${contextLabel} recommendation response.`);
        const choice = chatCompletion.choices?.[0];
        const responseText = choice?.message?.content;
        const finishReason = choice?.finish_reason;
        console.log(`Groq ${contextLabel} recommendations finished. Reason: ${finishReason}.`);

        if (finishReason !== 'stop' && finishReason !== 'length') {
             if (typeof finishReason === 'string' && finishReason.toLowerCase().includes('filter')) {
                 throw new Error(`AI generation blocked (${contextLabel}) due to content filtering (${finishReason}).`);
             }
            throw new Error(`AI generation stopped unexpectedly (${contextLabel}, ${finishReason}).`);
        }
        if (!responseText) {
            throw new Error(`AI returned empty content for ${contextLabel} recommendations.`);
        }
        // Use the updated helper function for parsing and validation
        return parseAndValidateRecommendations(responseText, contextLabel);

    } catch (error: unknown) {
        console.error(`Error during ${contextLabel} Groq fetch/parse:`, error);
        if (error instanceof Groq.APIError) {
            if (error.status === 429) {
                 throw new Error(`Product recommendation service (${contextLabel}) is temporarily unavailable due to rate limits (Code: ${error.status}). Please try again shortly.`);
            }
            const status = error.status ?? 'N/A';
            const message = error.message || 'Unknown API error';
            throw new Error(`Product recommendation service error (${status}, ${contextLabel}): ${message}`);
        } else if (error instanceof Error) {
            throw error;
        } else {
            throw new Error(`An unexpected error occurred while fetching ${contextLabel} product recommendations.`);
        }
    }
};


// --- Public API Functions ---

/**
 * Fetches PERSONALIZED product recommendations based on user profile.
 */
export const getPersonalizedRecommendations = async (
    profile: UserProfile, // Changed to non-null, as personalization requires a profile
    categoryFocus?: ProductCategory | string
): Promise<ProductRecommendation[]> => {
    // Add a check if needed, although TypeScript enforces it now
    if (!profile) {
        throw new Error("User profile is required for personalized recommendations.");
    }
    const prompt = createPersonalizedPrompt(profile, categoryFocus);
    return _fetchAndParseGroqRecommendations(prompt, COMPLEX_MODEL_NAME, 'personalized');
};

/**
 * Fetches GENERAL product recommendations (not profile-specific).
 */
export const getGeneralRecommendations = async (
    categoryFocus?: ProductCategory | string
): Promise<ProductRecommendation[]> => {
    const prompt = createGeneralPrompt(categoryFocus);
    return _fetchAndParseGroqRecommendations(prompt, SIMPLER_MODEL_NAME, 'general');
};

/**
 * Fetches product recommendations based on a specific USER PROMPT.
 */
export const getPromptBasedRecommendations = async (
    userPrompt: string,
    categoryFocus?: ProductCategory | string
): Promise<ProductRecommendation[]> => {
     if (!userPrompt?.trim()) {
        throw new Error("User prompt cannot be empty for recommendations.");
    }
    const prompt = createPromptBasedPrompt(userPrompt.trim(), categoryFocus);
    return _fetchAndParseGroqRecommendations(prompt, COMPLEX_MODEL_NAME, 'prompt-based');
};


// --- Optional: Export Service Object ---
export const groqProductService = {
    getPersonalizedRecommendations,
    getGeneralRecommendations,
    getPromptBasedRecommendations,
};