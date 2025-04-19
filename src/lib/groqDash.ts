// src/lib/groqDash.ts

import { format, parseISO } from 'date-fns';
import {
    UserProfile,
    Appointment,
    BloodPressureReading,
    BloodSugarReading,
    WeightReading
} from "./appwrite"; // Adjust path if necessary

// --- Import Groq types and potentially the service for API calls ---
// If groq.ts handles the actual API call, import it. Otherwise, initialize Groq here.
import groqService, { ChatCompletionMessageParam, ChatCompletionCreateParams, Groq } from './groq';

// --- Helper: Get Trimester Info ---
const getTrimesterInfo = (weeks: number | string | undefined | null): string => {
    const numWeeks = parseInt(String(weeks), 10);
    if (isNaN(numWeeks) || numWeeks < 1) return "Pregnancy stage unknown";
    if (numWeeks <= 13) return "First trimester";
    if (numWeeks <= 27) return "Second trimester";
    if (numWeeks <= 42) return "Third trimester";
    return "Post-term or invalid weeks";
};

// --- Helper: Format Profile Data for Feed Context ---
const formatProfileForFeed = (profile: UserProfile | null): string => {
    if (!profile) return "User Profile: Not available.";
    const weeks = profile.weeksPregnant;
    const trimester = getTrimesterInfo(weeks);
    let context = "[User Profile Summary]\n";
    context += `- Stage: ${weeks !== undefined && weeks !== null ? `${weeks} weeks (${trimester})` : 'Unknown'}\n`;
    if (profile.activityLevel) context += `- Activity Level: ${profile.activityLevel}\n`;
    if (profile.dietaryPreferences?.length) context += `- Dietary Preferences: ${profile.dietaryPreferences.join(', ')}\n`;
    if (profile.preExistingConditions && profile.preExistingConditions.toLowerCase() !== 'none') {
        context += `- Noted Conditions: ${profile.preExistingConditions}\n`;
    }
    // Add other relevant fields if desired, e.g., previous pregnancies, work situation
    return context;
};

// --- Helper: Format Recent Readings for Feed Context ---
const formatReadingsForFeed = (
    bp: BloodPressureReading | null,
    sugar: BloodSugarReading | null,
    weight: WeightReading | null
): string => {
    let context = "[Recent Health Readings (Context Only)]\n";
    let hasReadings = false;

    if (bp) {
        context += `- Latest BP: ${bp.systolic}/${bp.diastolic} mmHg (Recorded: ${formatDateSafe(bp.recordedAt)})\n`;
        hasReadings = true;
    }
    if (sugar) {
        context += `- Latest Sugar: ${sugar.level} mg/dL (${sugar.measurementType}) (Recorded: ${formatDateSafe(sugar.recordedAt)})\n`;
        hasReadings = true;
    }
    if (weight) {
        context += `- Latest Weight: ${weight.weight} ${weight.unit} (Recorded: ${formatDateSafe(weight.recordedAt)})\n`;
        hasReadings = true;
    }

    if (!hasReadings) {
        context += "- No recent health readings logged.\n";
    }
    return context;
};

// --- Helper: Format Upcoming Appointments for Feed Context ---
const formatAppointmentsForFeed = (appointments: (Appointment & { dateTime?: Date | null })[]): string => {
    if (!appointments || appointments.length === 0) return "[Upcoming Appointments]\n- None scheduled in the near future.\n";

    // Sort appointments by date (ensure dateTime is parsed correctly before calling)
    const sortedApps = appointments
        .filter(app => app.dateTime instanceof Date && !isNaN(app.dateTime.getTime())) // Ensure dateTime is a valid Date
        .sort((a, b) => {
            // Since we filtered for valid Dates, we can safely use getTime()
            // Added explicit type assertion for clarity, though filter should guarantee it.
            const timeA = (a.dateTime as Date).getTime();
            const timeB = (b.dateTime as Date).getTime();
            return timeA - timeB;
        });

    let context = "[Upcoming Appointments]\n";
    // Show only the next 1-2 appointments for brevity
    sortedApps.slice(0, 2).forEach(app => {
        const type = app.appointmentType?.replace(/_/g, ' ') || 'Appointment';
        // We know dateTime is a valid Date here due to the filter
        const dateStr = format(app.dateTime as Date, 'MMM d, yyyy h:mm a');
        context += `- ${type} on ${dateStr}\n`;
    });
    return context;
};

// --- Helper: Date Formatting ---
const formatDateSafe = (dateString: string | undefined | null): string => {
    if (!dateString) return 'unknown date';
    try {
        const date = parseISO(dateString);
        // Check if parsing was successful AND the date object is valid
        if (isNaN(date.getTime())) return 'invalid date';
        return format(date, 'MMM d'); // Format only valid dates
    } catch {
        return 'error formatting date';
    }
};


// --- Prompt Creation Function ---
/**
 * Creates the prompt for generating the personalized dashboard feed.
 *
 * @param profile - User's profile.
 * @param bp - Latest BP reading.
 * @param sugar - Latest Sugar reading.
 * @param weight - Latest Weight reading.
 * @param appointments - Array of upcoming appointments (already parsed with dateTime).
 * @returns The system prompt string.
 */
const createDashboardFeedPrompt = (
    profile: UserProfile | null,
    bp: BloodPressureReading | null,
    sugar: BloodSugarReading | null,
    weight: WeightReading | null,
    appointments: (Appointment & { dateTime?: Date | null })[]
): string => {

    const profileContext = formatProfileForFeed(profile);
    const readingsContext = formatReadingsForFeed(bp, sugar, weight);
    // Pass the original appointments array, formatAppointmentsForFeed handles filtering/sorting
    const appointmentsContext = formatAppointmentsForFeed(appointments);

    const personaAndInstructions = `
[AI Persona & Role]
You are MomCare AI, a supportive and informative companion for pregnancy. Your goal for this task is to generate a short, personalized, and encouraging message for the user's dashboard feed based on their current context. Focus on being positive, relevant, and providing gentle reminders or insights. You are NOT a medical professional.

[Instructions & Guidelines]
1.  **Review Context:** Analyze the provided User Profile, Recent Health Readings, and Upcoming Appointments.
2.  **Generate Content:** Create 1-3 short items (max 2-3 sentences each) for the feed. Mix and match from the following types:
    *   **Personalized Tip:** Offer a brief, relevant tip based on the pregnancy stage, activity level, diet preference, or upcoming appointments (e.g., "Since you're in the second trimester, consider incorporating gentle stretching like prenatal yoga.").
    *   **Affirmation/Encouragement:** Provide a positive affirmation related to pregnancy or self-care (e.g., "You're doing great nurturing your baby and yourself!").
    *   **Contextual Summary/Reminder:** Briefly summarize a key piece of context or provide a gentle reminder (e.g., "Remember your doctor's appointment on [Date]!" or "Staying hydrated is especially important during the third trimester.").
    *   **Reading Acknowledgment (Neutral):** If recent readings are available, neutrally acknowledge them without interpretation (e.g., "Your latest BP reading was logged on [Date]. Keep up the monitoring!"). **DO NOT interpret readings.**
3.  **Tone:** Maintain a warm, supportive, encouraging, and empathetic tone.
4.  **Safety First:**
    *   **ABSOLUTELY NO MEDICAL ADVICE OR DIAGNOSIS.** Do not interpret health readings or suggest treatments.
    *   All tips should be general knowledge and align with standard, safe pregnancy practices.
    *   **Include a brief, general disclaimer** at the end, like: "*Remember, this is general info. Always consult your healthcare provider for medical advice.*"
5.  **Brevity:** Keep each item concise and easy to read on a dashboard.
6.  **Variety:** Try to offer different types of content if generating multiple items.
7.  **Handle Missing Data:** If context is limited (e.g., no profile, no readings), provide more general pregnancy tips or affirmations appropriate for an unknown stage.

[Output Format]
-   Use Markdown for formatting (e.g., bullet points \`*\`, bold \`**\`).
-   Separate items clearly (e.g., using a horizontal rule \`---\` or just distinct paragraphs/bullet points).
-   End with the mandatory brief disclaimer.
-   Output ONLY the formatted Markdown content. No greetings or extra explanations.

[Example Output (assuming some context)]
*   Staying hydrated is key in the second trimester! Keep that water bottle handy. 💧
*   **Reminder:** Your glucose test appointment is coming up on Oct 25th.
*   You've got this, mama! Take a moment today to appreciate your amazing body. ✨
---
*Remember, this is general info. Always consult your healthcare provider for medical advice.*
`;

    // Combine all parts
    return `${personaAndInstructions}\n\n${profileContext}\n${readingsContext}\n${appointmentsContext}\n\n[AI Dashboard Feed Response (Markdown Format)]:\n`;
};


// --- Public API Function ---
/**
 * Generates personalized dashboard feed content using Groq.
 *
 * @param profile - User's profile.
 * @param bp - Latest BP reading.
 * @param sugar - Latest Sugar reading.
 * @param weight - Latest Weight reading.
 * @param appointments - Array of upcoming appointments (already parsed with dateTime).
 * @returns A Promise resolving to the generated Markdown string.
 * @throws Error if the Groq service is unavailable or the API call fails.
 */
export const generateDashboardFeed = async (
    profile: UserProfile | null,
    bp: BloodPressureReading | null,
    sugar: BloodSugarReading | null,
    weight: WeightReading | null,
    appointments: (Appointment & { dateTime?: Date | null })[]
): Promise<string> => {

    // Ensure Groq service and sendMessage function are available
    if (!groqService || typeof groqService.sendMessage !== 'function') {
        console.error("Groq service or sendMessage function is not available.");
        throw new Error("AI service configuration error.");
    }

    const systemPrompt = createDashboardFeedPrompt(profile, bp, sugar, weight, appointments);
    const messages: ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        // A simple user message to trigger the response based on the system prompt
        { role: 'user', content: "What's a helpful insight for my dashboard today?" }
    ];

    try {
        // Use the existing sendMessage function from groq.ts
        console.log("Requesting dashboard feed from Groq...");
        const response = await groqService.sendMessage(messages);
        console.log("Received dashboard feed response.");
        return response; // Return the generated Markdown string
    } catch (error) {
        console.error("Error generating dashboard feed:", error);
        // Re-throw the error to be handled by the calling component
        throw error;
    }
};

// --- Service Object Export ---
export const groqDashboardService = {
    generateDashboardFeed,
    // Export the prompt function if needed for debugging/testing elsewhere
    // createDashboardFeedPrompt
};