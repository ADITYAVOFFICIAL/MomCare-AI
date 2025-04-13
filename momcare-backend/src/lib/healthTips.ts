// src/lib/healthTips.ts

/**
 * Defines the possible stages of pregnancy for health tips.
 * N/A is used when conception date isn't set.
 * Error is used if calculation fails.
 */
export type Trimester = "Pre-conception" | "First" | "Second" | "Third" | "Post-term" | "N/A" | "Error";

/**
 * Defines the structure for a single health tip.
 */
export interface HealthTip {
    id: string; // Unique identifier for the tip (e.g., 't1w5-nausea')
    title: string; // Short, catchy title for the tip
    description: string; // Detailed advice or information
    category: 'Nutrition' | 'Exercise' | 'Symptoms' | 'Preparation' | 'Wellbeing' | 'Provider' | 'General'; // Category for potential filtering or icons
    weeks?: { start: number; end: number }; // Optional week range for specificity (inclusive)
}

// --- Health Tips Data ---
// Organized by Trimester. Tips can be general or week-specific.

const healthTipsData: Map<Trimester, HealthTip[]> = new Map([
    // --- Pre-conception ---
    ["Pre-conception", [
        { id: 'pc-folic', title: "Start Folic Acid", description: "Begin taking a prenatal vitamin with at least 400-800mcg of folic acid daily to support early neural development.", category: 'Nutrition' },
        { id: 'pc-habits', title: "Adopt Healthy Habits", description: "Focus on a balanced diet, regular moderate exercise, adequate sleep, and reducing stress.", category: 'Wellbeing' },
        { id: 'pc-checkup', title: "Pre-conception Check-up", description: "Discuss your health history and any concerns with your healthcare provider.", category: 'Provider' },
        { id: 'pc-substances', title: "Avoid Harmful Substances", description: "Stop smoking, drinking alcohol, and using recreational drugs. Discuss necessary medications with your doctor.", category: 'General' },
    ]],

    // --- First Trimester (Weeks 1-13) ---
    ["First", [
        // Week-specific examples
        { id: 't1w4-confirm', title: "Confirm Pregnancy", description: "If you haven't already, confirm your pregnancy with a test or healthcare provider.", category: 'Provider', weeks: { start: 4, end: 6 } },
        { id: 't1w6-nausea', title: "Manage Morning Sickness", description: "Try small, frequent meals, ginger, vitamin B6, or acupressure bands. Stay hydrated even if nauseous.", category: 'Symptoms', weeks: { start: 6, end: 12 } },
        { id: 't1w8-firstvisit', title: "Schedule First Prenatal Visit", description: "Your first major check-up usually happens around 8-10 weeks. Prepare questions!", category: 'Provider', weeks: { start: 7, end: 10 } },
        { id: 't1w10-fatigue', title: "Combat Fatigue", description: "Listen to your body and rest when needed. Early pregnancy fatigue is common due to hormonal changes.", category: 'Symptoms', weeks: { start: 5, end: 13 } },
        // General First Trimester
        { id: 't1-folic', title: "Continue Folic Acid", description: "Folic acid remains crucial for neural tube development throughout the first trimester.", category: 'Nutrition' },
        { id: 't1-hydration', title: "Stay Hydrated", description: "Aim for 8-10 glasses of water daily. It helps with nutrient transport, digestion, and preventing constipation.", category: 'Nutrition' },
        { id: 't1-foodsafety', title: "Practice Food Safety", description: "Avoid raw/undercooked meats, eggs, certain fish (high mercury), unpasteurized dairy, and deli meats unless heated.", category: 'Nutrition' },
        { id: 't1-gentle-exercise', title: "Gentle Movement", description: "If feeling up to it, continue or start gentle exercises like walking or prenatal yoga, as approved by your provider.", category: 'Exercise' },
    ]],

    // --- Second Trimester (Weeks 14-27) ---
    ["Second", [
        // Week-specific examples
        { id: 't2w16-movement', title: "Feeling Movement?", description: "You might start feeling 'quickening' (baby's first movements) between weeks 16-25. It feels like flutters!", category: 'Symptoms', weeks: { start: 16, end: 25 } },
        { id: 't2w20-scan', title: "Anatomy Scan", description: "Usually performed around 18-22 weeks to check baby's development and organs.", category: 'Provider', weeks: { start: 18, end: 22 } },
        { id: 't2w24-glucose', title: "Glucose Screening Prep", description: "Your provider will likely schedule a glucose screening test between 24-28 weeks to check for gestational diabetes.", category: 'Provider', weeks: { start: 23, end: 27 } },
        // General Second Trimester
        { id: 't2-energy', title: "Enjoy the Energy Boost", description: "Many experience less nausea and fatigue. Use this time for planning or gentle activity.", category: 'Wellbeing' },
        { id: 't2-nutrition', title: "Focus on Balanced Nutrition", description: "Include lean protein, whole grains, fruits, vegetables, and calcium-rich foods. Iron intake becomes more important.", category: 'Nutrition' },
        { id: 't2-exercise', title: "Moderate Exercise", description: "Continue safe exercises like swimming, walking, or prenatal yoga. Avoid activities with a high risk of falling.", category: 'Exercise' },
        { id: 't2-hydration', title: "Keep Hydrating", description: "Continue drinking plenty of water throughout the day.", category: 'Nutrition' },
        { id: 't2-sleep', title: "Comfortable Sleep", description: "As your bump grows, try sleeping on your side (preferably left) with pillows for support.", category: 'Wellbeing' },
    ]],

    // --- Third Trimester (Weeks 28-40+) ---
    ["Third", [
        // Week-specific examples
        { id: 't3w28-kickcounts', title: "Monitor Fetal Movement", description: "Start paying attention to 'kick counts' daily as advised by your provider. Note any significant decrease.", category: 'Symptoms', weeks: { start: 28, end: 42 } },
        { id: 't3w32-breathing', title: "Practice Breathing", description: "Baby is practicing breathing movements. You might feel short of breath; practice deep, slow breathing.", category: 'Symptoms', weeks: { start: 32, end: 36 } },
        { id: 't3w36-visits', title: "More Frequent Visits", description: "Prenatal appointments often become weekly or bi-weekly from around week 36.", category: 'Provider', weeks: { start: 36, end: 40 } },
        { id: 't3w37-laborprep', title: "Prepare for Labor", description: "Pack your hospital bag, finalize birth preferences, and learn the signs of labor.", category: 'Preparation', weeks: { start: 35, end: 40 } },
        // General Third Trimester
        { id: 't3-rest', title: "Prioritize Rest", description: "Listen to your body and rest frequently. Naps can help combat fatigue.", category: 'Wellbeing' },
        { id: 't3-discomfort', title: "Manage Discomfort", description: "Address back pain, swelling, and heartburn with provider-approved methods (e.g., support belts, elevation, antacids).", category: 'Symptoms' },
        { id: 't3-nutrition', title: "Nutrient-Dense Foods", description: "Continue focusing on nutrient-dense foods to support baby's rapid growth.", category: 'Nutrition' },
        { id: 't3-birthplan', title: "Review Birth Plan", description: "Discuss your birth preferences with your provider and partner.", category: 'Preparation' },
    ]],

    // --- Post-term (Weeks 41+) ---
    ["Post-term", [
        { id: 'pt-monitoring', title: "Increased Monitoring", description: "Expect closer monitoring of you and baby (e.g., non-stress tests, ultrasounds) to ensure well-being.", category: 'Provider' },
        { id: 'pt-induction', title: "Discuss Induction", description: "Stay in close contact with your provider about the possibility and timing of labor induction if needed.", category: 'Provider' },
        { id: 'pt-movement', title: "Continue Kick Counts", description: "Remain vigilant about monitoring fetal movement and report any changes immediately.", category: 'Symptoms' },
        { id: 'pt-rest', title: "Rest and Wait", description: "Continue to rest, stay hydrated, and watch for signs of labor.", category: 'Wellbeing' },
    ]],

    // --- N/A or Error ---
    ["N/A", [
        { id: 'na-profile', title: "Update Your Profile", description: "Add your estimated month of conception or current weeks pregnant to your profile to receive personalized tips and track your journey.", category: 'General' }, // Updated description slightly
        { id: 'na-general', title: "General Wellness", description: "Focus on overall health: eat nutritious foods, stay hydrated, get adequate rest, and consult your provider for personalized advice.", category: 'General' },
    ]],
    ["Error", [
        { id: 'err-contact', title: "Consult Provider", description: "There was an issue calculating pregnancy stage. Please consult your healthcare provider for personalized advice.", category: 'Provider' },
        { id: 'err-general', title: "General Wellness", description: "Focus on overall health: eat nutritious foods, stay hydrated, and get adequate rest.", category: 'General' },
    ]],
]);

// --- Default Tip ---
// Used as an absolute fallback if no other tip is found
export const defaultHealthTip: HealthTip = {
    id: 'default-hydrate',
    title: "Stay Healthy",
    description: "Stay hydrated and eat nutritious foods. Always consult your healthcare provider for personalized advice specific to your pregnancy.",
    category: 'General',
};

/**
 * Selects the most relevant health tip based on trimester and week.
 * Prioritizes:
 * 1. Week-specific tips for the current trimester and week.
 * 2. General tips for the current trimester (without week constraints).
 * 3. Fallback tips (N/A, Error, or Default).
 *
 * @param trimester The current calculated trimester.
 * @param week The current calculated week of pregnancy (defaults to 0 if not provided).
 * @returns A single HealthTip object.
 */
export const selectHealthTip = (trimester: Trimester, week: number = 0): HealthTip => {
    // Determine the list of tips for the given trimester, falling back to N/A or an empty array
    const potentialTips = healthTipsData.get(trimester) ?? healthTipsData.get("N/A") ?? [];

    // If no tips found for the trimester (even N/A), return default immediately
    if (potentialTips.length === 0) {
        return defaultHealthTip;
    }

    // 1. Find week-specific tips applicable to the current week
    const weekSpecificTips = potentialTips.filter(tip =>
        tip.weeks && week >= tip.weeks.start && week <= tip.weeks.end
    );

    if (weekSpecificTips.length > 0) {
        // If multiple week-specific tips match, pick one (e.g., the first one)
        // You could add logic here to randomize or prioritize if needed
        return weekSpecificTips[0];
    }

    // 2. Find general tips for the trimester (those without a 'weeks' property)
    const generalTrimesterTips = potentialTips.filter(tip => !tip.weeks);

    if (generalTrimesterTips.length > 0) {
        // If multiple general tips exist, pick one (e.g., the first one)
        // You could add logic here to randomize or prioritize if needed
        return generalTrimesterTips[0];
    }

    // 3. If no week-specific or general tips were found for the *specific* trimester,
    //    fall back to the first tip listed under that trimester (could be N/A's first tip)
    //    or the absolute default if the list was somehow empty after the initial get.
    return potentialTips[0] ?? defaultHealthTip;
};