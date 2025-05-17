// src/lib/groqMeal.ts

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
// Assuming UserProfile is defined correctly elsewhere
export interface UserProfile {
  id: string;
  name?: string;
  email?: string;
  weeksPregnant?: number | string | null;
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'unspecified' | null;
  preExistingConditions?: string | null;
  dietaryPreferences?: string[] | null;
  // Add any other relevant fields from your Appwrite user profile
}


// --- Constants for Type Validation ---
export const VALID_MEAL_TYPES = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"] as const;
export type MealType = typeof VALID_MEAL_TYPES[number];

export const VALID_EXERCISE_INTENSITIES = ["Gentle", "Light", "Moderate"] as const;
export type ExerciseIntensity = typeof VALID_EXERCISE_INTENSITIES[number];

export const VALID_RECIPE_COMPLEXITY = ["Easy", "Medium", "Hard"] as const;
export type RecipeComplexity = typeof VALID_RECIPE_COMPLEXITY[number];

// --- Interface Definitions ---
export interface MealIdea {
  id: string;
  name: string;
  description: string;
  mealType: MealType | string;
  keyIngredients?: string[];
  dietaryNotes?: string[];
  prepTime?: string;
  cookingTime?: string;
  recipeComplexity?: RecipeComplexity | string;
  servingSize?: string;
  macros?: string;
  preparationSteps: string[];
  reasoning?: string;
}

export interface ExerciseSuggestion {
  id: string;
  name: string;
  description: string;
  intensity: ExerciseIntensity | string;
  durationReps?: string;
  focusArea?: string;
  safetyNotes: string;
  reasoning?: string;
}

export interface PersonalizedContent {
  meals: MealIdea[];
  exercises: ExerciseSuggestion[];
}

export interface GenerationOptions {
  contentType?: 'meals' | 'exercises' | 'both';
  count?: number;
  customPreference?: string;
}

type ChatCompletionCreateParams = ChatCompletionCreateParamsNonStreaming | ChatCompletionCreateParamsStreaming;

// --- Configuration ---
const API_KEY: string | undefined = import.meta.env.VITE_PUBLIC_GROQ_API_KEY;
const MODEL_NAME: ChatCompletionCreateParamsBase['model'] = "llama3-70b-8192";

if (!API_KEY) {
    console.error("CRITICAL ERROR: VITE_PUBLIC_GROQ_API_KEY is missing. Meal/Exercise generation will be unavailable.");
}

const groq: Groq | null = API_KEY ? new Groq({ apiKey: API_KEY, dangerouslyAllowBrowser: true }) : null;

const generationConfig = {
    temperature: 0.6,
    max_tokens: 4096,
    top_p: 0.9,
};

// --- Helper Functions ---
const getTrimesterInfo = (weeks: number | string | undefined | null): string => {
    const numWeeks = parseInt(String(weeks), 10);
    if (isNaN(numWeeks) || numWeeks < 1) return "Pregnancy stage unknown";
    if (numWeeks <= 13) return "First trimester";
    if (numWeeks <= 27) return "Second trimester";
    if (numWeeks <= 42) return "Third trimester";
    return "Post-term or invalid weeks";
};

const createPersonalizationPrompt = (profile: UserProfile, options: GenerationOptions = {}): string => {
    const { contentType = 'both', count = 3, customPreference } = options;

    const weeks = profile.weeksPregnant ?? 'unknown';
    const activity = profile.activityLevel ?? 'unspecified';
    const conditions = profile.preExistingConditions?.trim() || 'none specified';
    const diet = profile.dietaryPreferences?.length ? profile.dietaryPreferences.join(', ') : 'none specified';

    let userContext = `**User Context:**\n`;
    userContext += `- Pregnancy Stage: ${weeks} weeks (Implications: ${getTrimesterInfo(weeks)})\n`;
    userContext += `- Stated Activity Level: ${activity}\n`;
    userContext += `- Stated Dietary Preferences: ${diet}\n`;
    if (conditions !== 'none specified') {
        userContext += `- Stated Pre-existing Conditions: ${conditions} (Acknowledge for context only, DO NOT give medical advice related to these)\n`;
    }
    if (customPreference?.trim()) {
        userContext += `- User's Current Request/Focus: "${customPreference.trim()}"\n`;
    }
    if (weeks === 'unknown' && activity === 'unspecified' && diet === 'none specified' && conditions === 'none specified') {
        userContext += `- Note: User profile context is minimal. Provide generally safe and helpful pregnancy suggestions.\n`;
    }

    const safetyInstructions = `
**Safety & Role Definition:**
- You are MomCare AI, an informational assistant. You are **NOT** a medical professional. Your advice is not a substitute for professional consultation.
- **ALL suggestions are purely informational and MUST NOT be taken as medical or professional advice.**
- **CRITICAL (Exercise Safety):** For **every** exercise suggestion, the "safetyNotes" field **MUST** clearly state: "Consult your doctor or midwife before starting any new exercise during pregnancy. Listen to your body and stop immediately if you feel pain or discomfort." Add specific precautions for the exercise itself.
- **CRITICAL (Meal Safety):** For meal suggestions, the "description" or "reasoning" **MUST** mention it's a general idea and individual dietary needs vary. Advise consultation with a healthcare provider or dietitian. Macros are **estimates only**.
- Base suggestions on general pregnancy nutritional needs and safe exercise principles.
- **DO NOT** suggest specific supplement dosages or brands. Refer to healthcare provider.
- **DO NOT** diagnose, treat, or manage medical conditions.
`;

    const outputFormatInstructions = `
**Output Format Instructions:**
Respond STRICTLY with a single, valid JSON object. NO extra text, greetings, or explanations outside this JSON object.
The top-level JSON object structure depends on the requested 'contentType':
- If 'contentType' is 'meals', the JSON object MUST ONLY have a "meals" key (an array of meal objects).
- If 'contentType' is 'exercises', the JSON object MUST ONLY have an "exercises" key (an array of exercise objects).
- If 'contentType' is 'both' (default), the JSON object MUST have BOTH keys: "meals" and "exercises", each containing their respective arrays.

Generate approximately ${count} valid suggestions for each requested type.

**Meal Idea Object Structure (within "meals" array):**
All string values must be properly escaped for JSON.
- "name": (string) Catchy and descriptive name.
- "description": (string) 1-3 sentences. Use Markdown. Mention need for professional dietary advice.
- "mealType": (string) One of: ${VALID_MEAL_TYPES.join(', ')}.
- "keyIngredients": (array of strings) e.g., ["Chicken", "Broccoli"]. Empty array [] if none.
- "dietaryNotes": (array of strings, optional) e.g., ["Gluten-Free"]. Empty array [] if none.
- "prepTime": (string, optional) e.g., "Approx. 15 mins".
- "cookingTime": (string, optional) e.g., "Approx. 30 mins".
- "recipeComplexity": (string) One of: ${VALID_RECIPE_COMPLEXITY.join(', ')}.
- "servingSize": (string, optional) e.g., "Serves 2-3".
- "macros": (string, optional) Estimated, e.g., "Approx. P: 30g, C: 50g, F: 18g". **State these are estimates.**
- "preparationSteps": (array of strings) Step-by-step instructions. **Must be an array of strings, even if empty [].**
- "reasoning": (string, optional) Max 20 words on relevance.

**Exercise Suggestion Object Structure (within "exercises" array):**
All string values must be properly escaped for JSON.
- "name": (string) Clear name.
- "description": (string) 1-3 sentences. Use Markdown.
- "intensity": (string) One of: ${VALID_EXERCISE_INTENSITIES.join(', ')}.
- "durationReps": (string, optional) e.g., "15-20 minutes".
- "focusArea": (string, optional) e.g., "Pelvic Floor".
- "safetyNotes": (string) **MANDATORY.** Specific precautions + **explicit reminder to consult provider**.
- "reasoning": (string, optional) Max 20 words on relevance.

**Example Meal Object:**
{
  "name": "Quick Berry Yogurt Bowl",
  "description": "A simple and nutritious bowl, perfect for a quick energy boost. *Dietary needs vary; consult your provider.*",
  "mealType": "Snack",
  "keyIngredients": ["Greek Yogurt", "Mixed Berries", "Granola (optional)"],
  "dietaryNotes": [],
  "prepTime": "Approx. 5 mins",
  "cookingTime": "Approx. 0 mins",
  "recipeComplexity": "Easy",
  "servingSize": "Serves 1",
  "macros": "Estimated: P: 20g, C: 30g, F: 10g (Values are approximate)",
  "preparationSteps": [
    "Add Greek yogurt to a bowl.",
    "Top with mixed berries.",
    "Sprinkle with granola if desired."
  ],
  "reasoning": "Good source of protein and antioxidants."
}

**CRITICAL JSON Rules:**
- **The entire output MUST be a single JSON object string.**
- Adhere STRICTLY to the 'contentType' and object structures, including data types (string, array of strings).
- Ensure valid JSON syntax: double quotes for ALL keys and ALL string values, correct comma placement, valid arrays.
- Ensure all mandatory fields are present and non-empty. 'preparationSteps' for meals must be an array of strings.
`;

    let mainInstruction = "";
    if (contentType === 'meals') {
        mainInstruction = `Generate personalized meal ideas.`;
    } else if (contentType === 'exercises') {
        mainInstruction = `Generate personalized, pregnancy-safe exercise suggestions.`;
    } else { // 'both'
        mainInstruction = `Generate personalized meal ideas AND pregnancy-safe exercise suggestions.`;
    }

    return `
You are MomCare AI. Provide supportive, safe, general suggestions based on the user's profile.
${userContext}
${safetyInstructions}
${mainInstruction} Adhere precisely to the output format instructions below.
${outputFormatInstructions}
`;
};

const parseAndValidateContent = (
    responseText: string,
    requestedContentType: GenerationOptions['contentType'] = 'both'
): PersonalizedContent => {
    let jsonStringToParse = responseText.trim();

    if (jsonStringToParse.startsWith("```json")) {
        jsonStringToParse = jsonStringToParse.substring(7);
        if (jsonStringToParse.endsWith("```")) {
            jsonStringToParse = jsonStringToParse.substring(0, jsonStringToParse.length - 3);
        }
        jsonStringToParse = jsonStringToParse.trim();
    } else if (jsonStringToParse.startsWith("```")) {
        jsonStringToParse = jsonStringToParse.substring(3);
         if (jsonStringToParse.endsWith("```")) {
            jsonStringToParse = jsonStringToParse.substring(0, jsonStringToParse.length - 3);
        }
        jsonStringToParse = jsonStringToParse.trim();
    }

    if (!jsonStringToParse.startsWith('{') || !jsonStringToParse.endsWith('}')) {
        const jsonStartIndex = jsonStringToParse.indexOf('{');
        const jsonEndIndex = jsonStringToParse.lastIndexOf('}');
        if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
            console.warn("parseAndValidateContent: JSON response was likely wrapped in extra text. Extracted content between first '{' and last '}'. Original:", responseText);
            jsonStringToParse = jsonStringToParse.substring(jsonStartIndex, jsonEndIndex + 1);
        } else {
            console.error("Validation Error: Response missing JSON object structure or malformed wrapper:", responseText);
            throw new Error("AI response did not contain a recognizable JSON object structure.");
        }
    }

    let parsedData: unknown;
    try {
        parsedData = JSON.parse(jsonStringToParse);
    } catch (parseError: unknown) {
        console.error("Validation Error: Failed to parse AI JSON response.");
        console.error("Attempted to parse (after cleaning):", jsonStringToParse);
        console.error("Original response from AI:", responseText);
        let errorMessage = "Invalid JSON format.";
        if (parseError instanceof Error) {
            errorMessage += ` Details: ${parseError.message}`;
            const match = parseError.message.match(/position\s*(\d+)/i);
            // FIX for groqMeal.ts:267:43
            if (match && match[1]) { // Ensure match and the captured group exist
                const position = parseInt(match[1], 10); // Use match[1] for the captured group
                if (!isNaN(position)) {
                    const contextChars = 30;
                    const start = Math.max(0, position - contextChars);
                    const end = Math.min(jsonStringToParse.length, position + contextChars);
                    const errorSnippet = jsonStringToParse.substring(start, end);
                    console.error(`Approximate error location (char ${position}): ...${errorSnippet}...`);
                }
            }
        }
        throw new Error(`Failed to parse AI suggestions. ${errorMessage}`);
    }

    if (typeof parsedData !== 'object' || parsedData === null) {
        throw new Error("Validation Error: Parsed AI response is not a JSON object.");
    }

    const potentialContent = parsedData as Record<string, unknown>;
    const validatedOutput: PersonalizedContent = { meals: [], exercises: [] };

    if (requestedContentType === 'meals' || requestedContentType === 'both') {
        if (!potentialContent.hasOwnProperty('meals')) {
            if (requestedContentType === 'meals') {
                throw new Error("Validation Error: AI response missing required 'meals' array when only meals were requested.");
            }
            console.warn("Validation Warning: AI response missing 'meals' array or key when 'meals' or 'both' were expected.");
        } else if (!Array.isArray(potentialContent.meals)) {
            throw new Error(`Validation Error: AI response 'meals' field is not an array (Type: ${typeof potentialContent.meals}).`);
        } else {
            validatedOutput.meals = potentialContent.meals
                .map((item: unknown, index: number): MealIdea | null => {
                    if (typeof item !== 'object' || item === null) { console.warn(`Validation Warning: Meal item ${index} is not an object.`); return null; }
                    const meal = item as Record<string, unknown>;

                    if (typeof meal.name !== 'string' || !meal.name.trim()) { console.warn(`Validation Warning: Meal item ${index} ('${meal.name || 'UNKNOWN'}') invalid 'name'.`); return null; }
                    if (typeof meal.description !== 'string' || !meal.description.trim()) { console.warn(`Validation Warning: Meal item ${index} ('${meal.name}') invalid 'description'.`); return null; }
                    if (typeof meal.mealType !== 'string' || !VALID_MEAL_TYPES.includes(meal.mealType as MealType)) { console.warn(`Validation Warning: Meal item ${index} ('${meal.name}') invalid or missing 'mealType'. Defaulting to Snack.`); meal.mealType = "Snack"; }
                    if (!Array.isArray(meal.preparationSteps)) { console.warn(`Validation Warning: Meal item ${index} ('${meal.name}') missing or invalid 'preparationSteps' (must be an array).`); return null; }

                    const keyIngredients = Array.isArray(meal.keyIngredients) ? meal.keyIngredients.filter((k): k is string => typeof k === 'string' && !!k.trim()).map(k => k.trim()) : [];
                    const dietaryNotes = Array.isArray(meal.dietaryNotes) ? meal.dietaryNotes.filter((n): n is string => typeof n === 'string' && !!n.trim()).map(n => n.trim()) : [];
                    const prepTime = (typeof meal.prepTime === 'string' && meal.prepTime.trim()) ? meal.prepTime.trim() : undefined;
                    const cookingTime = (typeof meal.cookingTime === 'string' && meal.cookingTime.trim()) ? meal.cookingTime.trim() : undefined;
                    const recipeComplexity = (typeof meal.recipeComplexity === 'string' && VALID_RECIPE_COMPLEXITY.includes(meal.recipeComplexity as RecipeComplexity)) ? meal.recipeComplexity : "Easy";
                    const servingSize = (typeof meal.servingSize === 'string' && meal.servingSize.trim()) ? meal.servingSize.trim() : undefined;
                    const macros = (typeof meal.macros === 'string' && meal.macros.trim()) ? meal.macros.trim() : undefined;
                    const preparationSteps = meal.preparationSteps.filter((s): s is string => typeof s === 'string' && !!s.trim()).map(s => s.trim());
                    const reasoning = (typeof meal.reasoning === 'string' && meal.reasoning.trim()) ? meal.reasoning.trim() : undefined;

                    return {
                        id: `meal-${Date.now()}-${index}`,
                        name: meal.name.trim(),
                        description: meal.description.trim(),
                        mealType: meal.mealType as MealType,
                        keyIngredients, dietaryNotes, prepTime, cookingTime, recipeComplexity,
                        servingSize, macros, preparationSteps, reasoning,
                    };
                })
                .filter((item): item is MealIdea => item !== null);

            if (validatedOutput.meals.length < potentialContent.meals.length) {
                console.warn(`Validation Warning: Filtered out ${potentialContent.meals.length - validatedOutput.meals.length} invalid meal items.`);
            }
        }
    } else if (potentialContent.hasOwnProperty('meals')) {
         console.warn("Validation Warning: AI included 'meals' key when not requested (contentType was 'exercises').");
    }

     if (requestedContentType === 'exercises' || requestedContentType === 'both') {
        if (!potentialContent.hasOwnProperty('exercises')) {
            if (requestedContentType === 'exercises') {
                throw new Error("Validation Error: AI response missing required 'exercises' array when only exercises were requested.");
            }
            console.warn("Validation Warning: AI response missing 'exercises' array or key when 'exercises' or 'both' were expected.");
        } else if (!Array.isArray(potentialContent.exercises)) {
             throw new Error(`Validation Error: AI response 'exercises' field is not an array (Type: ${typeof potentialContent.exercises}).`);
        } else {
            validatedOutput.exercises = potentialContent.exercises
                .map((item: unknown, index: number): ExerciseSuggestion | null => {
                    if (typeof item !== 'object' || item === null) { console.warn(`Validation Warning: Exercise item ${index} not an object.`); return null; }
                    const ex = item as Record<string, unknown>;
                    if (typeof ex.name !== 'string' || !ex.name.trim()) { console.warn(`Validation Warning: Ex item ${index} ('${ex.name || 'UNKNOWN'}') invalid 'name'.`); return null; }
                    if (typeof ex.description !== 'string' || !ex.description.trim()) { console.warn(`Validation Warning: Ex item ${index} ('${ex.name}') invalid 'description'.`); return null; }
                    if (typeof ex.intensity !== 'string' || !VALID_EXERCISE_INTENSITIES.includes(ex.intensity as ExerciseIntensity)) { console.warn(`Validation Warning: Ex item ${index} ('${ex.name}') invalid or missing 'intensity'. Defaulting to Gentle.`); ex.intensity = "Gentle"; }
                    if (typeof ex.safetyNotes !== 'string' || !ex.safetyNotes.trim()) { console.warn(`Validation Warning: Ex item ${index} ('${ex.name}') invalid or missing 'safetyNotes'.`); return null; }

                    const durationReps = (typeof ex.durationReps === 'string' && ex.durationReps.trim()) ? ex.durationReps.trim() : undefined;
                    const focusArea = (typeof ex.focusArea === 'string' && ex.focusArea.trim()) ? ex.focusArea.trim() : undefined;
                    const reasoning = (typeof ex.reasoning === 'string' && ex.reasoning.trim()) ? ex.reasoning.trim() : undefined;

                    return {
                        id: `ex-${Date.now()}-${index}`, name: ex.name.trim(), description: ex.description.trim(),
                        intensity: ex.intensity as ExerciseIntensity, durationReps, focusArea, safetyNotes: ex.safetyNotes.trim(), reasoning,
                    };
                })
                .filter((item): item is ExerciseSuggestion => item !== null);

            if (validatedOutput.exercises.length < potentialContent.exercises.length) {
                console.warn(`Validation Warning: Filtered out ${potentialContent.exercises.length - validatedOutput.exercises.length} invalid exercise items.`);
            }
        }
    } else if (potentialContent.hasOwnProperty('exercises')) {
         console.warn("Validation Warning: AI included 'exercises' key when not requested (contentType was 'meals').");
    }

    if (requestedContentType === 'both' && validatedOutput.meals.length === 0 && validatedOutput.exercises.length === 0) {
        if (
            (potentialContent.hasOwnProperty('meals') && Array.isArray(potentialContent.meals) && potentialContent.meals.length > 0) ||
            (potentialContent.hasOwnProperty('exercises') && Array.isArray(potentialContent.exercises) && potentialContent.exercises.length > 0)
        ) {
            console.error("Validation Error: AI response for 'both' contained items, but all failed validation.");
        } else {
            console.warn("Validation Warning: AI response for 'both' resulted in no valid meals or exercises. Original response might have been empty or malformed at top level.");
        }
    }

    console.log(`Validation Complete: Found ${validatedOutput.meals.length} valid meals, ${validatedOutput.exercises.length} valid exercises.`);
    return validatedOutput;
};

// --- Public API Function ---
export const generatePersonalizedContent = async (
    profile: UserProfile,
    options: GenerationOptions = {}
): Promise<PersonalizedContent> => {
    if (!groq) {
        throw new Error("Meal/Exercise suggestion service unavailable (Groq client not initialized). Check API Key.");
    }

    const { contentType = 'both' } = options;
    const prompt = createPersonalizationPrompt(profile, options);
    const messages: ChatCompletionMessageParam[] = [{ role: 'user', content: prompt }];

    const params: ChatCompletionCreateParamsBase = {
        messages,
        model: MODEL_NAME,
        temperature: generationConfig.temperature,
        max_tokens: generationConfig.max_tokens,
        top_p: generationConfig.top_p,
        stream: false,
        response_format: { type: "json_object" },
    };

    try {
        console.log(`Sending personalization request to Groq (requesting: ${contentType}). Model: ${MODEL_NAME}`);
        const chatCompletion: ChatCompletion = await groq.chat.completions.create(
            params as ChatCompletionCreateParamsNonStreaming
        );
        console.log("Received personalization response from Groq.");

        // FIX for groqMeal.ts:425:xx (Identifier expected)
        const choice = chatCompletion.choices?.[0];
        const responseText = choice?.message?.content;
        const finishReason = choice?.finish_reason;

        console.log(`Groq generation finished. Reason: ${finishReason || 'N/A'}. Tokens used: ${chatCompletion.usage?.total_tokens || 'N/A'}`);
        if (chatCompletion.usage && chatCompletion.usage.completion_tokens === generationConfig.max_tokens) {
            console.warn("Groq response might be truncated: completion_tokens reached max_tokens limit.");
        }

        if (!responseText) {
            // FIX for groqMeal.ts:438:xx (Identifier expected, ';' expected)
            if (finishReason === 'stop' && choice?.message?.content === null) {
                 console.warn("AI returned null content with 'stop' reason. This might indicate the model chose not to respond or an issue with JSON generation despite json_object mode.");
                 return { meals: [], exercises: [] };
            }
            throw new Error(`AI returned empty or null content. Finish reason: ${finishReason || 'unknown'}.`);
        }
        
        return parseAndValidateContent(responseText, contentType);

    } catch (error: unknown) {
        console.error(`Error during Groq personalization fetch/parse (Type: ${contentType}):`, error);
        if (error instanceof Groq.APIError) {
            console.error("Groq API Error Details:", JSON.stringify(error, null, 2));
            const status = error.status ?? 'N/A';
            const message = error.message || 'Unknown API error.';
            let userMessage = `Personalization service API error (Status: ${status}): ${message}`;

            // FIX for groqMeal.ts:455:23 - Property 'code' does not exist
            // Check if 'code' exists on the error object, as Groq.APIError type might not strictly define it
            // for all specific error types, or the type definition might be out of sync.
            const errorCode = (error as any).code; // Use 'as any' to bypass strict type checking for this specific property
                                                 // or define a more specific error type if known.

            if (errorCode === 'json_validate_failed') {
                userMessage = "The AI failed to generate a correctly formatted response. Please try again. If the issue persists, the content might be too complex for the current settings.";
            } else if (status === 429) {
                userMessage = "The personalization service is currently busy. Please try again in a few moments.";
            }
            throw new Error(userMessage);
        } else if (error instanceof Error) {
            throw error;
        } else {
            throw new Error("An unexpected error occurred while fetching personalized content.");
        }
    }
};

// --- Service Object Export ---
export const groqMealService = {
    generatePersonalizedContent,
};