// src/lib/groqSym.ts

import { UserProfile } from "./appwrite"; // Import UserProfile type

// --- Helper Function: Get Trimester Info ---
/**
 * Calculates the trimester based on the week of pregnancy.
 * @param weeks - The number of weeks pregnant (can be number, string, undefined, or null).
 * @returns A string describing the trimester or stage.
 */
const getTrimesterInfo = (weeks: number | string | undefined | null): string => {
    // Attempt to parse the input into a number
    const numWeeks = parseInt(String(weeks), 10);

    // Handle invalid or non-positive week numbers
    if (isNaN(numWeeks) || numWeeks < 1) {
        return "Pregnancy stage unknown";
    }

    // Determine trimester based on standard ranges
    if (numWeeks <= 13) return "First trimester";
    if (numWeeks <= 27) return "Second trimester";
    // Allow slightly beyond 40 weeks for post-term calculation
    if (numWeeks <= 42) return "Third trimester";

    // Handle cases significantly beyond the typical range
    return "Post-term or invalid weeks";
};

// --- Helper: Format ALL profile details for context ---
/**
 * Formats the UserProfile object into a readable string for the AI context.
 * Handles missing or undefined fields gracefully, marking them as "N/A" or "None specified".
 * Intentionally omits highly sensitive fields like email/phone/address for this specific context.
 *
 * @param profile - The user's profile data (nullable).
 * @returns A formatted multi-line string containing the relevant user profile context.
 */
const formatProfileContext = (profile: UserProfile | null): string => {
    // Return a default message if no profile data is available
    // console.log("Formatting user profile for Groq:", profile);
    if (!profile) {
        return "[User Profile Context]\n- Profile data not available.\n";
    }

    // Helper function to format optional fields consistently
    const formatOptional = (value: string | number | string[] | undefined | null, label: string): string => {
        if (value === undefined || value === null) return `${label}: N/A`;
        if (typeof value === 'string' && value.trim() === '') return `${label}: N/A`;
        // Handle empty arrays specifically for dietary preferences etc.
        if (Array.isArray(value) && value.length === 0) return `${label}: None specified`;
        // Join array elements into a comma-separated string
        if (Array.isArray(value)) return `${label}: ${value.join(', ')}`;
        // Default case for strings and numbers
        return `${label}: ${value}`;
    };

    // Build the context string field by field using the helper
    let context = "[User Profile Context]\n";
    context += `- ${formatOptional(profile.name, 'Name')}\n`;
    context += `- ${formatOptional(profile.age, 'Age')}\n`;
    context += `- ${formatOptional(profile.gender, 'Gender')}\n`;

    // Special handling for weeksPregnant to include trimester info
    const weeks = profile.weeksPregnant;
    if (weeks !== undefined && weeks !== null && weeks >= 0) {
        // Display week and calculated trimester
        context += `- Weeks Pregnant: ${weeks} (${getTrimesterInfo(weeks)})\n`;
    } else {
        // Indicate if weeks pregnant is not available
        context += `- Weeks Pregnant: N/A\n`;
    }

    // Include other relevant profile fields
    context += `- ${formatOptional(profile.preExistingConditions, 'Pre-existing Conditions')}\n`;
    context += `- ${formatOptional(profile.dietaryPreferences, 'Dietary Preferences')}\n`;
    context += `- ${formatOptional(profile.activityLevel, 'Activity Level')}\n`;
    context += `- ${formatOptional(profile.previousPregnancies, 'Previous Pregnancies')}\n`;
    context += `- ${formatOptional(profile.deliveryPreference, 'Delivery Preference')}\n`;
    context += `- ${formatOptional(profile.partnerSupport, 'Partner Support Level')}\n`;
    context += `- ${formatOptional(profile.workSituation, 'Work Situation')}\n`;
    context += `- ${formatOptional(profile.chatTonePreference, 'Preferred Chat Tone')}\n`;

    // Note: Intentionally omitted fields like email, phoneNumber, address for privacy in this specific symptom context.

    return context;
};

// --- Symptom Checker Prompt Function ---

/**
 * Creates the detailed system prompt for the Groq API for the Symptom Checker feature.
 * This prompt instructs the AI on its specific role for this task, critical safety rules,
 * how to use the provided context, and the required output format. It emphasizes
 * providing general information only, forbidding diagnosis, and mandating disclaimers.
 *
 * @param symptoms - The symptoms description provided by the user.
 * @param profile - The user's profile data (nullable), used by formatProfileContext.
 * @returns The complete system prompt string ready to be sent to the Groq API.
 */
export const createSymptomCheckerPrompt = (
    symptoms: string,
    profile: UserProfile | null
): string => {
    // --- Generate Comprehensive User Profile Context ---
    // Use the helper function to format all relevant profile data
    const profileContext = formatProfileContext(profile);

    // --- Clearly delimit the user's input symptoms ---
    const symptomsSection = `\n[User's Reported Symptoms/Concerns]\n"${symptoms.trim()}"\n`;

    // --- Define AI Role, Strict Safety Rules, and Output Format ---
    // This section is crucial for guiding the AI's behavior safely and effectively.
    const personaAndRules = `
[AI Persona & Role]
You are MomCare AI, an informational assistant. Your role for this specific request is to provide **general information** about common pregnancy-related symptoms based ONLY on the user's description and their provided pregnancy stage context. You are **explicitly NOT a medical professional** and **CANNOT provide diagnosis, medical advice, or treatment recommendations.** Your primary goal is safety and directing the user to consult professionals.

[CRITICAL SAFETY RULES & OUTPUT FORMAT for Symptom Information Request]
1.  **Acknowledge Symptoms:** Start your response by briefly acknowledging the main symptoms the user described (e.g., "Regarding the headache and nausea you mentioned...").
2.  **Provide General Information ONLY:** Based *strictly* on the described symptoms and the provided pregnancy context (especially weeks pregnant), list **common, generally benign possibilities** or explanations for such symptoms *during that stage of pregnancy*. Focus on typical physiological changes associated with pregnancy.
    *   Example: If user mentions "mild headache" in the first trimester, you could mention that hormonal changes are a common cause of headaches early in pregnancy. If "back pain" in the third trimester, mention posture changes and increased weight as common contributing factors.
    *   **DO NOT** list rare, complex, or serious conditions, even if they *could* technically cause the symptom. Stick to the most common and generally non-alarming explanations related to pregnancy itself.
    *   **DO NOT** interpret the severity described by the user (e.g., "mild," "severe") beyond acknowledging it.
    *   **DO NOT** ask follow-up diagnostic questions (e.g., "Is the pain sharp or dull?").
    *   **DO NOT** suggest specific treatments, medications (including over-the-counter), or supplements. You MAY suggest general, universally accepted comfort measures IF they are extremely common and low-risk (e.g., "Staying hydrated and getting adequate rest can sometimes help with general discomfort," but avoid linking it directly as a *treatment* for the specific symptom). Prefer *not* suggesting comfort measures unless very generic.
3.  **MANDATORY DISCLAIMER (Include VERBATIM at the END):** After providing any general information (or immediately if following the Emergency Protocol), you **MUST** conclude with the following disclaimer exactly as written:
    "---
    **Disclaimer:** This information is for general knowledge and informational purposes only, and does not constitute medical advice. It is essential to consult with a qualified healthcare provider (like your doctor) for any health concerns or before making any decisions related to your health or treatment. They can provide a proper diagnosis and advice tailored to your specific situation."
4.  **DO NOT DIAGNOSE:** Under absolutely no circumstances should you attempt to diagnose the user's condition or suggest a specific diagnosis. Do not use phrases like "you might have...", "this sounds like...", "it could be...", "this is likely due to...". Stick to objective statements like "Common causes for [symptom] during this stage *can* include..." or "Hormonal changes during the first trimester *are often associated* with...".
5.  **EMERGENCY PROTOCOL (Highest Priority - Overrides Rule 2 & 3 Structure):** If the user's *described symptoms* (in the "[User's Reported Symptoms/Concerns]" section) clearly indicate a potential emergency (examples include, but are not limited to: "heavy bleeding," "severe constant abdominal pain," "loss of consciousness," "can't feel baby move for hours," "sudden gush of fluid," "thoughts of harming myself or baby," "seizure," "vision loss"), **STOP** generating general information. Your *entire* response should be ONLY the following instruction:
    "**Based on the symptoms you described, please seek urgent medical attention immediately. Contact your doctor, go to the nearest emergency room, or call your local emergency number (like 911 or 102) without delay.**"
    *Do not add the standard disclaimer or any other text if the Emergency Protocol is triggered.*
6.  **Output Format:** Present the information clearly using Markdown (paragraphs, bullet points are acceptable for listing common causes). The structure should be: Acknowledgement -> General Info (if applicable) -> Mandatory Disclaimer (unless Emergency Protocol triggered). Keep the response concise and focused. Avoid overly conversational filler.
`;

    // --- Assemble the final prompt ---
    // Combine the persona/rules, the formatted profile context, and the user's symptoms section.
    return `${personaAndRules}\n\n${profileContext}\n${symptomsSection}\n\n[AI Response - General Information & Disclaimer Only Following Rules Above]:`;
};

// --- Service Object Export ---
// Encapsulates the symptom-checker-specific Groq logic for cleaner imports elsewhere.
export const groqSymptomService = {
    createSymptomCheckerPrompt,
    // NOTE: The actual API call (`groqService.sendMessage`) remains in `groq.ts`
    // This service only provides the specialized prompt generation logic.
};

// Default export can also be used if preferred by your project structure
// export default groqSymptomService;