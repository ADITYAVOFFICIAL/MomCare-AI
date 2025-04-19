// src/pages/DashboardPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, compareAsc, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown'; // <-- Import ReactMarkdown
import remarkGfm from 'remark-gfm';       // <-- Import remarkGfm
import rehypeRaw from 'rehype-raw';         // <-- Import rehypeRaw
import {
    Calendar, Clock, Baby, Activity, FilePlus, MessageSquare, ArrowRight,
    AlertTriangle, Heart, Stethoscope, Salad, User, Edit, Trash2, Loader2, ListChecks,
    Bike, GraduationCap, Inbox, Pill, PlusCircle, BarChart3, Utensils, Dumbbell,
    BookOpen, CheckSquare, Sparkles, RefreshCw // <-- Added Sparkles & RefreshCw
} from 'lucide-react';

// --- UI Components ---
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // <-- Import Alert components
import { Skeleton } from '@/components/ui/skeleton'; // <-- Import Skeleton
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AppointmentItem from '@/components/appointments/AppointmentItem';
import EditAppointmentModal from '@/components/appointments/EditAppointmentModal';
import MedCharts from '@/components/dashboard/MedCharts';
import MedReminder from '@/components/dashboard/MedReminder';
import AddMedReminderModal from '@/components/dashboard/AddMedReminderModal';

// --- State Management & Hooks ---
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

// --- Appwrite SDK & Types ---
import {
    UserProfile, getUserProfile,
    Appointment, getUserAppointments, updateAppointment, deleteAppointment,
    BloodPressureReading, BloodSugarReading, WeightReading,
    getBloodPressureReadings, getBloodSugarReadings, getWeightReadings,
    MedicationReminder, CreateMedicationReminderData,
    getMedicationReminders, createMedicationReminder, deleteMedicationReminder,
} from '@/lib/appwrite';

// --- Custom Health Utilities ---
import { Trimester, HealthTip, selectHealthTip, defaultHealthTip } from '@/lib/healthTips';

// --- NEW: Import Groq Dashboard Service ---
import { generateDashboardFeed } from '@/lib/groqDash'; // <-- Import the new service

// --- Helper Component: User Stats (Keep existing component) ---
const UserStatsCards: React.FC<{ profile: UserProfile | null; appointmentsCount: number }> = ({ profile, appointmentsCount }) => {
    const profileCompleteness = useMemo(() => {
        if (!profile) return 0;
        const essentialFields: (keyof UserProfile)[] = ['name', 'age', 'gender', 'weeksPregnant', 'phoneNumber'];
        const extendedFields: (keyof UserProfile)[] = [
            'address', 'preExistingConditions', 'previousPregnancies',
            'deliveryPreference', 'workSituation', 'activityLevel',
            'partnerSupport', 'dietaryPreferences', 'chatTonePreference'
        ];
        const completedEssential = essentialFields.filter(field => {
            const value = profile[field];
            if (field === 'weeksPregnant' || field === 'age' || field === 'previousPregnancies') {
                return typeof value === 'number' && value >= 0;
            }
            return value !== null && value !== undefined && String(value).trim() !== '';
        }).length;
        const completedExtended = extendedFields.filter(field => {
            const value = profile[field];
            if (field === 'dietaryPreferences') return Array.isArray(value) && value.length > 0;
            if (field === 'previousPregnancies') return typeof value === 'number' && value >= 0;
            return value !== null && value !== undefined && String(value).trim() !== '';
        }).length;
        const essentialWeight = 0.6; const extendedWeight = 0.4;
        const essentialPercentage = essentialFields.length > 0 ? (completedEssential / essentialFields.length) * essentialWeight * 100 : 0;
        const extendedPercentage = extendedFields.length > 0 ? (completedExtended / extendedFields.length) * extendedWeight * 100 : 0;
        return Math.round(essentialPercentage + extendedPercentage);
    }, [profile]);

    const missingFields = useMemo(() => {
        if (!profile) return { essential: [], extended: [] };
        const essential: string[] = []; const extended: string[] = [];
        if (!profile.name || String(profile.name).trim() === '') essential.push('Full Name');
        if (profile.age === null || profile.age === undefined || (typeof profile.age === 'number' && profile.age < 0)) essential.push('Age');
        if (!profile.gender || String(profile.gender).trim() === '') essential.push('Gender');
        if (profile.weeksPregnant === null || profile.weeksPregnant === undefined || (typeof profile.weeksPregnant === 'number' && profile.weeksPregnant < 0)) essential.push('Current Weeks Pregnant');
        if (!profile.phoneNumber || String(profile.phoneNumber).trim() === '') essential.push('Phone Number');
        if (!profile.address || String(profile.address).trim() === '') extended.push('Address');
        if (!profile.preExistingConditions || String(profile.preExistingConditions).trim() === '') extended.push('Pre-existing Medical Conditions');
        if (profile.previousPregnancies === null || profile.previousPregnancies === undefined || (typeof profile.previousPregnancies === 'number' && profile.previousPregnancies < 0)) extended.push('Number of Previous Pregnancies');
        if (!profile.deliveryPreference || String(profile.deliveryPreference).trim() === '') extended.push('Delivery Preference');
        if (!profile.workSituation || String(profile.workSituation).trim() === '') extended.push('Work Situation');
        if (!profile.activityLevel || String(profile.activityLevel).trim() === '') extended.push('Activity Level');
        if (!profile.partnerSupport || String(profile.partnerSupport).trim() === '') extended.push('Partner Support Level');
        if (!Array.isArray(profile.dietaryPreferences) || profile.dietaryPreferences.length === 0) extended.push('Dietary Preferences');
        if (!profile.chatTonePreference || String(profile.chatTonePreference).trim() === '') extended.push('Chat Tone Preference');
        return { essential, extended };
    }, [profile]);

    const essentialFieldNames: string[] = useMemo(() => ['Full Name', 'Age', 'Gender', 'Current Weeks Pregnant', 'Phone Number'], []);

    return (
        <Card className="border border-gray-200 bg-white mt-4 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="p-3 bg-gray-50 border-b dark:bg-gray-700/50 dark:border-gray-600">
                <CardTitle className="flex items-center text-gray-700 text-sm font-medium dark:text-gray-300">
                    <User className="mr-1.5 h-4 w-4 text-momcare-primary" /> Profile & Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs space-y-2 dark:text-gray-400">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-400">Profile Complete:</span>
                    <span className={`font-semibold ${profileCompleteness === 0 ? "text-amber-500" : "text-momcare-primary dark:text-momcare-accent"}`}>{profileCompleteness}%</span>
                </div>
                <Progress value={profileCompleteness} className="h-1 [&>*]:bg-momcare-primary dark:[&>*]:bg-momcare-accent" aria-label={`Profile completeness: ${profileCompleteness}%`} />
                {profileCompleteness < 100 && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                        {(profileCompleteness === 0 || missingFields.essential.length > 0) && (
                            <>
                                <p className="text-amber-600 dark:text-amber-400 font-medium mb-1">
                                    {profileCompleteness === 0 ? "Start by completing these essential fields:" : "Please complete these essential fields:"}
                                </p>
                                <ul className="list-disc list-inside space-y-0.5 text-gray-600 dark:text-gray-400">
                                    {(profileCompleteness === 0 ? essentialFieldNames : missingFields.essential).map((field, index) => (<li key={`essential-${index}`}>{field}</li>))}
                                </ul>
                            </>
                        )}
                        {missingFields.extended.length > 0 && profileCompleteness > 0 && (
                            <>
                                <p className="text-gray-500 dark:text-gray-500 font-medium mb-1 mt-2">Optional fields to reach 100%:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-gray-400 dark:text-gray-500">
                                    {missingFields.extended.map((field, index) => (<li key={`extended-${index}`}>{field}</li>))}
                                </ul>
                            </>
                        )}
                    </div>
                )}
                <div className="text-right pt-1">
                    <Button variant="link" size="sm" asChild className="text-xs h-auto p-0 text-momcare-primary dark:text-momcare-accent hover:underline">
                        <a href="/profile">Edit Profile</a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};


// --- Helper Function: Parse Appointment DateTime (Keep existing function) ---
const parseAppointmentDateTime = (app: Appointment): Date | null => {
    if (!app?.date || !app?.time) return null;
    try {
        const datePart = app.date.split('T')[0];
        const baseDate = parseISO(`${datePart}T00:00:00`);
        if (isNaN(baseDate.getTime())) return null;
        const timeMatch = app.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!timeMatch) return null;
        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3]?.toUpperCase();
        if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) return null;
        if (period) {
            if (hours < 1 || hours > 12) return null;
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0;
        } else {
            if (hours < 0 || hours > 23) return null;
        }
        const combinedDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);
        return isNaN(combinedDate.getTime()) ? null : combinedDate;
    } catch (error) {
        return null;
    }
};

// --- Main Dashboard Component ---
const DashboardPage: React.FC = () => {
    // --- Existing State ---
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [upcomingDoctorAppointments, setUpcomingDoctorAppointments] = useState<Appointment[]>([]);
    const [upcomingClassAppointments, setUpcomingClassAppointments] = useState<Appointment[]>([]);
    const [bpReadings, setBpReadings] = useState<BloodPressureReading[]>([]);
    const [sugarReadings, setSugarReadings] = useState<BloodSugarReading[]>([]);
    const [weightReadings, setWeightReadings] = useState<WeightReading[]>([]);
    const [medReminders, setMedReminders] = useState<MedicationReminder[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
    const [isLoadingAppointments, setIsLoadingAppointments] = useState<boolean>(true);
    const [isLoadingHealthData, setIsLoadingHealthData] = useState<boolean>(true);
    const [isLoadingMedReminders, setIsLoadingMedReminders] = useState<boolean>(true);
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
    const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);
    const [isMedModalOpen, setIsMedModalOpen] = useState<boolean>(false);
    const [deletingMedReminderId, setDeletingMedReminderId] = useState<string | null>(null);
    const [isDeleteMedReminderDialogOpen, setIsDeleteMedReminderDialogOpen] = useState<boolean>(false);
    const [medReminderToDelete, setMedReminderToDelete] = useState<string | null>(null);

    // --- NEW State for Dashboard Feed ---
    const [dashboardFeedContent, setDashboardFeedContent] = useState<string | null>(null);
    const [isLoadingFeed, setIsLoadingFeed] = useState<boolean>(false);
    const [feedError, setFeedError] = useState<string | null>(null);

    // --- Hooks ---
    const { user, isAuthenticated } = useAuthStore();
    const { toast } = useToast();

    // --- Constants & Memos ---
    const doctorTypes = useMemo(() => ['doctor', 'lab_test', undefined, null, ''] as const, []);
    const classTypes = useMemo(() => ['yoga_class', 'childbirth_class', 'fitness_class'] as const, []);
    type ClassAppointmentType = typeof classTypes[number];

    // --- Combined Data Fetching ---
    const fetchData = useCallback(async (options: { forceFeedRefresh?: boolean } = {}) => {
        if (!isAuthenticated || !user?.$id) {
            // Reset all states if not authenticated
            setIsLoading(false); setIsLoadingProfile(false); setIsLoadingAppointments(false);
            setIsLoadingHealthData(false); setIsLoadingMedReminders(false); setIsLoadingFeed(false);
            setProfile(null); setUpcomingDoctorAppointments([]); setUpcomingClassAppointments([]);
            setBpReadings([]); setSugarReadings([]); setWeightReadings([]); setMedReminders([]);
            setDashboardFeedContent(null); setFeedError(null);
            return;
        }

        const currentUserId = user.$id;
        // Only set main loading true initially or if forcing refresh
        if (!profile || options.forceFeedRefresh) setIsLoading(true);

        // Set individual loading states
        setIsLoadingProfile(true); setIsLoadingAppointments(true);
        setIsLoadingHealthData(true); setIsLoadingMedReminders(true);
        // Reset feed state only if forcing refresh
        if (options.forceFeedRefresh) {
            setIsLoadingFeed(true);
            setDashboardFeedContent(null);
            setFeedError(null);
        }

        let fetchedProfile: UserProfile | null = null;
        let fetchedAppointments: Appointment[] = [];
        let fetchedBp: BloodPressureReading[] = [];
        let fetchedSugar: BloodSugarReading[] = [];
        let fetchedWeight: WeightReading[] = [];
        let fetchedReminders: MedicationReminder[] = [];

        try {
            // Fetch core data concurrently
            const coreDataResults = await Promise.allSettled([
                getUserProfile(currentUserId),
                getUserAppointments(currentUserId),
                getBloodPressureReadings(currentUserId, 1), // Only need latest for feed
                getBloodSugarReadings(currentUserId, 1),    // Only need latest for feed
                getWeightReadings(currentUserId, 1),       // Only need latest for feed
                getMedicationReminders(currentUserId),
            ]);

            // --- Process Core Data Results ---
            // Profile
            if (coreDataResults[0].status === 'fulfilled') {
                fetchedProfile = coreDataResults[0].value as UserProfile | null;
                setProfile(fetchedProfile);
            } else { console.error('Error fetching profile:', coreDataResults[0].reason); setProfile(null); toast({ title: "Profile Load Failed", variant: "destructive" }); }
            setIsLoadingProfile(false);

            // Appointments
            if (coreDataResults[1].status === 'fulfilled') {
                fetchedAppointments = coreDataResults[1].value as Appointment[] ?? [];
                const now = new Date();
                const allUpcoming = fetchedAppointments
                    .map(app => ({ ...app, dateTime: parseAppointmentDateTime(app) }))
                    .filter((app): app is Appointment & { dateTime: Date } => app.dateTime !== null && app.dateTime > now && !app.isCompleted)
                    .sort((a, b) => compareAsc(a.dateTime, b.dateTime));
                setUpcomingDoctorAppointments(allUpcoming.filter(app => doctorTypes.includes(app.appointmentType)));
                setUpcomingClassAppointments(allUpcoming.filter(app => app.appointmentType && classTypes.includes(app.appointmentType as ClassAppointmentType)));
            } else { console.error('Error fetching appointments:', coreDataResults[1].reason); setUpcomingDoctorAppointments([]); setUpcomingClassAppointments([]); toast({ title: "Appointments Load Failed", variant: "destructive" }); }
            setIsLoadingAppointments(false);

            // Health Readings (Only set state with latest for feed context, full data for charts if needed elsewhere)
            // Note: We fetched only the latest reading (limit 1)
            if (coreDataResults[2].status === 'fulfilled') fetchedBp = coreDataResults[2].value as BloodPressureReading[] ?? []; else console.error('Error fetching BP:', coreDataResults[2].reason);
            if (coreDataResults[3].status === 'fulfilled') fetchedSugar = coreDataResults[3].value as BloodSugarReading[] ?? []; else console.error('Error fetching Sugar:', coreDataResults[3].reason);
            if (coreDataResults[4].status === 'fulfilled') fetchedWeight = coreDataResults[4].value as WeightReading[] ?? []; else console.error('Error fetching Weight:', coreDataResults[4].reason);
            // Set state for charts (fetch full data separately if needed, or adjust limit above)
            // For now, we'll just use the potentially single reading for the charts too
            setBpReadings(fetchedBp);
            setSugarReadings(fetchedSugar);
            setWeightReadings(fetchedWeight);
            setIsLoadingHealthData(false);

            // Medication Reminders
            if (coreDataResults[5].status === 'fulfilled') {
                fetchedReminders = coreDataResults[5].value as MedicationReminder[] ?? [];
                setMedReminders(fetchedReminders);
            } else { console.error('Error fetching Reminders:', coreDataResults[5].reason); setMedReminders([]); toast({ title: "Reminders Load Failed", variant: "destructive" }); }
            setIsLoadingMedReminders(false);

            // --- Fetch Dashboard Feed Data (if profile loaded or forcing refresh) ---
            // Trigger feed generation only if profile is available OR if forcing a refresh
            if (fetchedProfile || options.forceFeedRefresh) {
                // Ensure isLoadingFeed is true before starting the fetch
                if(!isLoadingFeed) setIsLoadingFeed(true); // Set loading true if not already
                setFeedError(null); // Clear previous errors
                try {
                    // Pass the relevant LATEST data to the feed generator
                    const feedContent = await generateDashboardFeed(
                        fetchedProfile,
                        fetchedBp[0] || null,    // Pass latest BP or null
                        fetchedSugar[0] || null, // Pass latest Sugar or null
                        fetchedWeight[0] || null, // Pass latest Weight or null
                        // Pass the calculated upcoming appointments
                        [...upcomingDoctorAppointments, ...upcomingClassAppointments]
                            .filter((app): app is Appointment & { dateTime: Date } => app.dateTime != null)
                            .sort((a, b) => compareAsc(a.dateTime, b.dateTime))
                    );
                    setDashboardFeedContent(feedContent);
                } catch (feedGenError) {
                    console.error('Error generating dashboard feed:', feedGenError);
                    setFeedError(feedGenError instanceof Error ? feedGenError.message : "Could not load personalized insights.");
                    setDashboardFeedContent(null); // Clear content on error
                } finally {
                    setIsLoadingFeed(false); // Set loading false after feed attempt
                }
            } else if (!options.forceFeedRefresh) {
                 // If profile didn't load and not forcing refresh, skip feed generation
                 setIsLoadingFeed(false);
                 setFeedError("Profile data needed for personalized insights.");
            }

        } catch (error: unknown) {
            // Catch errors from Promise.allSettled itself (less likely)
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            console.error('Critical error during dashboard data fetch:', error);
            toast({ title: "Dashboard Load Failed", description: `${errorMessage}. Please refresh.`, variant: "destructive" });
            // Reset all states on critical failure
            setProfile(null); setUpcomingDoctorAppointments([]); setUpcomingClassAppointments([]);
            setBpReadings([]); setSugarReadings([]); setWeightReadings([]); setMedReminders([]);
            setDashboardFeedContent(null); setFeedError(null);
            setIsLoadingProfile(false); setIsLoadingAppointments(false); setIsLoadingHealthData(false);
            setIsLoadingMedReminders(false); setIsLoadingFeed(false);
        } finally {
            setIsLoading(false); // Final loading state update
        }
    }, [user, isAuthenticated, toast, doctorTypes, classTypes, profile, isLoadingFeed]); // Added profile and isLoadingFeed dependencies for refresh logic

    // Effect to fetch data on mount and auth changes
    useEffect(() => {
        fetchData(); // Initial fetch
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isAuthenticated]); // Run only when user/auth changes

    // --- Appointment Handlers (Keep existing) ---
    const handleEditAppointment = useCallback((appointment: Appointment) => { /* ... */ setEditingAppointment(appointment); setIsEditModalOpen(true); }, []);
    const handleDeleteAppointmentClick = useCallback((appointmentId: string) => { /* ... */ setAppointmentToDelete(appointmentId); setIsDeleteDialogOpen(true); }, []);
    const confirmDeleteAppointment = useCallback(async () => { /* ... */ if (!appointmentToDelete) return; setDeletingAppointmentId(appointmentToDelete); try { await deleteAppointment(appointmentToDelete); toast({ title: "Appointment Deleted" }); await fetchData(); } catch (error) { const msg = error instanceof Error ? error.message : "Could not delete."; toast({ title: "Deletion Failed", description: msg, variant: "destructive" }); } finally { setDeletingAppointmentId(null); setAppointmentToDelete(null); setIsDeleteDialogOpen(false); } }, [appointmentToDelete, fetchData, toast]);

    // --- Medication Reminder Handlers (Keep existing) ---
    const handleAddReminderClick = useCallback(() => { /* ... */ setIsMedModalOpen(true); }, []);
    const handleSaveReminder = useCallback(async (data: CreateMedicationReminderData) => { /* ... */ if (!user?.$id) { toast({ title: "Error", description: "User not found.", variant: "destructive" }); return; } try { await createMedicationReminder(user.$id, data); toast({ title: "Reminder Added" }); await fetchData(); } catch (error) { const msg = error instanceof Error ? error.message : "Could not save."; toast({ title: "Save Failed", description: msg, variant: "destructive" }); throw error; } }, [user?.$id, fetchData, toast]);
    const handleDeleteReminderClick = useCallback((reminderId: string) => { /* ... */ setMedReminderToDelete(reminderId); setIsDeleteMedReminderDialogOpen(true); }, []);
    const confirmDeleteReminder = useCallback(async () => { /* ... */ if (!medReminderToDelete) return; setDeletingMedReminderId(medReminderToDelete); try { await deleteMedicationReminder(medReminderToDelete); toast({ title: "Reminder Deleted" }); await fetchData(); } catch (error) { const msg = error instanceof Error ? error.message : "Could not delete."; toast({ title: "Deletion Failed", description: msg, variant: "destructive" }); } finally { setDeletingMedReminderId(null); setMedReminderToDelete(null); setIsDeleteMedReminderDialogOpen(false); } }, [medReminderToDelete, fetchData, toast]);

    // --- Milestone Getter (Keep existing) ---
    const getMilestone = useCallback((week: number): string => { /* ... keep existing logic ... */ const milestones: { [key: number]: string } = { 1: "Pregnancy begins...", 4: "Implantation occurs...", /* ... all other milestones ... */ 42: "Considered 'post term'..."}; if (week <= 0) return "Planning..."; if (week > 42) return "Anticipating arrival..."; const relevantWeeks = Object.keys(milestones).map(Number).filter(w => w <= week); const currentMilestoneWeek = relevantWeeks.length > 0 ? Math.max(...relevantWeeks) : 0; return currentMilestoneWeek > 0 ? `${milestones[currentMilestoneWeek]}` : "Early development stages."; }, []);

    // --- Formatting Helper (Keep existing) ---
    const formatAppointmentDate = useCallback((dateString: string | undefined, time: string | undefined): string => { /* ... keep existing logic ... */ if (!dateString || !time) return "Date/Time not set"; const appStub = { date: dateString, time: time } as Appointment; try { const dt = parseAppointmentDateTime(appStub); if (!dt) throw new Error("Invalid date/time"); return format(dt, "EEE, MMM d, yyyy 'at' h:mm a"); } catch { const dp = dateString.split('T')[0] || dateString; return `${dp} at ${time}`; } }, []);

    // --- Derived Values (Keep existing) ---
    const currentWeek = useMemo(() => profile?.weeksPregnant ?? 0, [profile?.weeksPregnant]);
    const pregnancyTrimester: Trimester = useMemo(() => { /* ... keep existing logic ... */ const week = currentWeek; if (week >= 1 && week <= 13) return "First"; if (week >= 14 && week <= 27) return "Second"; if (week >= 28 && week <= 40) return "Third"; if (week > 40) return "Post-term"; if (week === 0 && profile?.weeksPregnant !== undefined) return "Pre-conception"; return "N/A"; }, [currentWeek, profile?.weeksPregnant]);
    const pregnancyProgress = useMemo(() => { /* ... keep existing logic ... */ const effectiveWeek = Math.max(0, Math.min(currentWeek, 40)); return effectiveWeek > 0 ? Math.round((effectiveWeek / 40) * 100) : 0; }, [currentWeek]);
    const nextDoctorAppointment = useMemo(() => upcomingDoctorAppointments[0] || null, [upcomingDoctorAppointments]);
    const nextClassAppointment = useMemo(() => upcomingClassAppointments[0] || null, [upcomingClassAppointments]);
    const totalUpcomingAppointments = useMemo(() => upcomingDoctorAppointments.length + upcomingClassAppointments.length, [upcomingDoctorAppointments, upcomingClassAppointments]);
    const allSortedUpcomingAppointments = useMemo(() => { /* ... keep existing logic ... */ return [...upcomingDoctorAppointments, ...upcomingClassAppointments].filter((app): app is Appointment & { dateTime: Date } => app.dateTime != null).sort((a, b) => compareAsc(a.dateTime, b.dateTime)); }, [upcomingDoctorAppointments, upcomingClassAppointments]);

    // --- Render Logic ---
    return (
        <MainLayout requireAuth={true}>
            {/* Use HelmetProvider in App.tsx if not already */}
            {/* <Helmet><title>Dashboard - MomCare AI</title></Helmet> */}
            <div className="bg-gradient-to-b from-momcare-light via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-800 min-h-screen py-8 md:py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8 md:mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-momcare-dark dark:text-momcare-light mb-1 tracking-tight">
                            {isLoadingProfile ? 'Loading...' : `Hello, ${profile?.name || user?.name || 'User'}!`}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 text-base md:text-lg">
                            Here's your personalized dashboard and pregnancy overview.
                        </p>
                    </div>

                    {/* Main Loading State */}
                    {isLoading && !profile && ( // Show main loader only if everything is loading initially
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-momcare-primary" />
                            <span className="ml-4 text-lg text-gray-600 dark:text-gray-400">Loading Dashboard...</span>
                        </div>
                    )}

                    {/* Content Area - Render even if feed is loading, show skeletons inside */}
                    {!isLoading || profile ? ( // Render content if initial load done OR profile exists
                        <div className="space-y-8 md:space-y-10">

                             {/* --- NEW: Personalized Feed Section --- */}
                             <Card className="border border-momcare-secondary/30 shadow-sm bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-800 dark:via-gray-800/80 dark:to-gray-900/70 dark:border-gray-700">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-center">
                                        <CardTitle className="flex items-center text-momcare-primary dark:text-momcare-accent text-lg font-semibold">
                                            <Sparkles className="mr-2 h-5 w-5" /> For You Today
                                        </CardTitle>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => fetchData({ forceFeedRefresh: true })} // Force refresh feed
                                            disabled={isLoadingFeed}
                                            className="text-momcare-secondary dark:text-momcare-accent/80 hover:bg-momcare-secondary/10 dark:hover:bg-momcare-accent/10 hover:text-momcare-primary h-7 px-2"
                                            aria-label="Refresh personalized insights"
                                        >
                                            <RefreshCw className={`h-3.5 w-3.5 ${isLoadingFeed ? 'animate-spin' : ''}`} />
                                        </Button>
                                    </div>
                                    <CardDescription className="text-sm text-gray-500 dark:text-gray-400 pt-1">
                                        Personalized tips and insights based on your profile and progress.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-2 pb-5 px-5">
                                    {isLoadingFeed ? (
                                        <div className="space-y-2.5 animate-pulse">
                                            <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
                                            <Skeleton className="h-4 w-5/6 bg-gray-200 dark:bg-gray-700" />
                                            <Skeleton className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700" />
                                        </div>
                                    ) : feedError ? (
                                        <Alert variant="destructive" className="py-2 px-3 text-xs">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Error</AlertTitle>
                                            <AlertDescription>{feedError}</AlertDescription>
                                        </Alert>
                                    ) : dashboardFeedContent ? (
                                        <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 text-gray-700 dark:text-gray-300">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                rehypePlugins={[rehypeRaw]}
                                                components={{
                                                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-momcare-secondary hover:underline" />,
                                                    strong: ({node, ...props}) => <strong className="font-semibold text-momcare-dark dark:text-momcare-light" {...props} />,
                                                }}
                                            >
                                                {dashboardFeedContent}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-2">No insights generated currently. Try refreshing.</p>
                                    )}
                                </CardContent>
                            </Card>
                             {/* --- End Personalized Feed Section --- */}


                            {/* Top Row Info Cards (Pregnancy, Appointments, Health Summary) */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Pregnancy Journey Card (Keep existing) */}
                                <Card className="border border-momcare-primary/30 shadow-sm h-full bg-white dark:bg-gray-800 dark:border-gray-700">
                                     <CardHeader className="bg-momcare-primary/5 border-b border-momcare-primary/10 dark:bg-gray-700/30 dark:border-gray-600">
                                        <CardTitle className="flex items-center text-momcare-primary dark:text-momcare-light text-lg font-semibold">
                                            <Baby className="mr-2 h-5 w-5" />Pregnancy Journey
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 px-5 space-y-5">
                                        {isLoadingProfile ? ( <div className="flex justify-center items-center py-6"><Loader2 className="h-6 w-6 animate-spin text-momcare-primary" /></div> )
                                        : profile?.weeksPregnant !== undefined && profile.weeksPregnant >= 0 ? (
                                            <>
                                                {/* Progress Bar & Milestone */}
                                                <div>
                                                    <div className="flex justify-between items-baseline mb-2 text-sm">
                                                        <span className="font-semibold text-gray-800 dark:text-gray-200">Week {currentWeek}</span>
                                                        <span className="text-gray-600 dark:text-gray-400">{pregnancyTrimester} Trimester</span>
                                                    </div>
                                                    <Progress value={pregnancyProgress} className="h-2.5 [&>*]:bg-gradient-to-r [&>*]:from-momcare-primary [&>*]:to-momcare-secondary dark:[&>*]:from-momcare-accent dark:[&>*]:to-pink-500" aria-label={`Pregnancy progress: ${pregnancyProgress}%`} />
                                                    <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <span>{pregnancyProgress}% Complete</span>
                                                        <span>{currentWeek < 40 && currentWeek >= 0 ? `Approx. ${40 - currentWeek} weeks left` : currentWeek === 0 ? "Starting soon!" : "Due date!"}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-momcare-light/40 dark:bg-gray-700/50 p-3 rounded-lg border border-momcare-primary/10 dark:border-gray-600 text-sm text-gray-700 dark:text-gray-300">
                                                    <p><span className="font-medium text-momcare-dark dark:text-momcare-light">Milestone (Week {currentWeek}): </span>{getMilestone(currentWeek)}</p>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-6 flex flex-col items-center">
                                                <Baby className="h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                                                <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">Update profile with current weeks pregnant to track progress.</p>
                                                <Button asChild variant="outline" size="sm" className="text-momcare-primary border-momcare-primary/50 hover:bg-momcare-primary/5 dark:text-momcare-accent dark:border-momcare-accent/50 dark:hover:bg-momcare-accent/10">
                                                    <a href="/profile">Go to Profile</a>
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Upcoming Appointments Column (Keep existing) */}
                                <div className="space-y-6">
                                    {/* Next Doctor Visit Card */}
                                    <Card className="border border-momcare-primary/30 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
                                        <CardHeader className="bg-momcare-primary/5 border-b border-momcare-primary/10 dark:bg-gray-700/30 dark:border-gray-600">
                                            <CardTitle className="flex items-center text-momcare-primary dark:text-momcare-light text-lg font-semibold"><Stethoscope className="mr-2 h-5 w-5" />Next Doctor Visit</CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-5 px-5">
                                             {isLoadingAppointments ? ( <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-momcare-primary" /></div> )
                                             : nextDoctorAppointment ? ( /* ... existing render logic ... */
                                                <div className="space-y-3">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="mt-1 h-10 w-10 bg-momcare-primary/10 text-momcare-primary rounded-full flex items-center justify-center flex-shrink-0 dark:bg-momcare-light/10 dark:text-momcare-light"><Calendar className="h-5 w-5" /></div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{formatAppointmentDate(nextDoctorAppointment.date, nextDoctorAppointment.time)}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{nextDoctorAppointment.appointmentType?.replace(/_/g, ' ') || 'Check-up/Consultation'}</p>
                                                        </div>
                                                    </div>
                                                    {nextDoctorAppointment.notes && (<p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded border border-gray-200 dark:border-gray-600 line-clamp-2"><span className="font-medium">Notes:</span> {nextDoctorAppointment.notes}</p>)}
                                                    <div className="flex justify-end pt-1">
                                                        <Button asChild size="sm" variant="outline" className="text-momcare-primary border-momcare-primary/50 hover:bg-momcare-primary/10 hover:text-momcare-primary dark:text-momcare-light dark:border-momcare-light/50 dark:hover:bg-momcare-light/10 dark:hover:text-momcare-light text-xs px-3 py-1 h-auto"><a href="/appointment">Manage All</a></Button>
                                                    </div>
                                                </div>
                                             ) : ( /* ... existing placeholder ... */
                                                <div className="text-center py-4 flex flex-col items-center">
                                                    <Stethoscope className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
                                                    <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">No upcoming doctor visits.</p>
                                                    <Button asChild size="sm" className="bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-accent dark:hover:bg-pink-700"><a href="/appointment">Schedule Visit</a></Button>
                                                </div>
                                             )}
                                        </CardContent>
                                    </Card>
                                    {/* Next Class/Activity Card */}
                                    <Card className="border border-momcare-secondary/30 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
                                        <CardHeader className="bg-momcare-secondary/5 border-b border-momcare-secondary/10 dark:bg-gray-700/30 dark:border-gray-600">
                                            <CardTitle className="flex items-center text-momcare-secondary dark:text-blue-400 text-lg font-semibold"><GraduationCap className="mr-2 h-5 w-5" />Next Class/Activity</CardTitle>
                                        </CardHeader>
                                         <CardContent className="pt-5 px-5">
                                            {isLoadingAppointments ? ( <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-momcare-secondary" /></div> )
                                             : nextClassAppointment ? ( /* ... existing render logic ... */
                                                <div className="space-y-3">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="mt-1 h-10 w-10 bg-momcare-secondary/10 text-momcare-secondary rounded-full flex items-center justify-center flex-shrink-0 dark:bg-blue-500/10 dark:text-blue-400"><Bike className="h-5 w-5" /></div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{formatAppointmentDate(nextClassAppointment.date, nextClassAppointment.time)}</p>
                                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 capitalize">{nextClassAppointment.appointmentType?.replace(/_/g, ' ') || 'Class/Activity'}</p>
                                                        </div>
                                                    </div>
                                                    {nextClassAppointment.notes && (<p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded border border-gray-200 dark:border-gray-600 line-clamp-2"><span className="font-medium">Notes:</span> {nextClassAppointment.notes}</p>)}
                                                    <div className="flex justify-end pt-1">
                                                        <Button asChild size="sm" variant="outline" className="text-momcare-secondary border-momcare-secondary/50 hover:bg-momcare-secondary/10 hover:text-momcare-secondary dark:text-blue-400 dark:border-blue-400/50 dark:hover:bg-blue-400/10 dark:hover:text-blue-300 text-xs px-3 py-1 h-auto"><a href="/appointment">Manage All</a></Button>
                                                    </div>
                                                </div>
                                             ) : ( /* ... existing placeholder ... */
                                                <div className="text-center py-4 flex flex-col items-center">
                                                    <GraduationCap className="h-10 w-10 text-gray-400 dark:text-gray-500 mb-3" />
                                                    <p className="text-gray-500 dark:text-gray-400 mb-4 text-sm">No upcoming classes scheduled.</p>
                                                    <Button asChild size="sm" className="bg-momcare-secondary hover:bg-momcare-secondary/80 dark:bg-blue-500 dark:hover:bg-blue-600"><a href="/appointment">Schedule Class</a></Button>
                                                </div>
                                             )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Health Summary Column (Keep existing, includes UserStatsCards) */}
                                <Card className="border border-gray-200 shadow-sm h-full bg-white dark:bg-gray-800 dark:border-gray-700">
                                     <CardHeader className="bg-gray-50 border-b border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
                                        <CardTitle className="flex items-center text-gray-700 dark:text-gray-300 text-lg font-semibold">
                                            <Activity className="mr-2 h-5 w-5 text-momcare-primary" />Your Profile Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 px-5 space-y-4">
                                        {/* You might place the static health tip here OR let the AI feed handle tips */}
                                        {/* Noted Conditions */}
                                        {isLoadingProfile ? ( <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div> )
                                        : profile?.preExistingConditions && profile.preExistingConditions.toLowerCase() !== 'none' && (
                                            <div className="bg-amber-50 dark:bg-amber-900/30 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
                                                <h3 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center mb-1.5 text-sm"><AlertTriangle className="h-4 w-4 mr-1.5 text-amber-500 dark:text-amber-400" />Noted Conditions</h3>
                                                <p className="text-sm text-amber-700 dark:text-amber-400">{profile.preExistingConditions}</p>
                                                <div className="text-right mt-2">
                                                    <Button variant="link" size="sm" asChild className="text-xs h-auto p-0 text-amber-600 dark:text-amber-400 hover:underline"><a href="/profile">Edit</a></Button>
                                                </div>
                                            </div>
                                        )}
                                        {/* User Stats Card */}
                                         {isLoadingProfile || isLoadingAppointments ? ( <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-momcare-primary" /></div> )
                                         : ( <UserStatsCards profile={profile} appointmentsCount={totalUpcomingAppointments} /> )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* --- Other Sections Remain Below --- */}

                            {/* Medication Reminders Section */}
                             <MedReminder
                                reminders={medReminders}
                                isLoading={isLoadingMedReminders}
                                onAddReminder={handleAddReminderClick}
                                onDeleteReminder={handleDeleteReminderClick}
                                deletingReminderId={deletingMedReminderId}
                            />

                            {/* Health Readings Section */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center">
                                        <BarChart3 className="mr-2 h-5 w-5 text-momcare-accent" /> Health Readings Overview
                                    </h2>
                                     <Button variant="link" size="sm" asChild className="text-xs h-auto p-0 text-momcare-accent hover:underline">
                                         <a href="/profile">Add/Edit Readings</a>
                                     </Button>
                                </div>
                                <MedCharts
                                    bpReadings={bpReadings}
                                    sugarReadings={sugarReadings}
                                    weightReadings={weightReadings}
                                    isLoading={isLoadingHealthData}
                                    onDataRefreshNeeded={() => fetchData()} // Allow chart refresh if needed
                                />
                            </div>

                            {/* All Upcoming Appointments List */}
                            <Card className="border border-gray-200 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700 overflow-hidden">
                                <CardHeader className="bg-gray-50 border-b border-gray-200 dark:bg-gray-700/50 dark:border-gray-600">
                                    <CardTitle className="flex items-center text-gray-700 dark:text-gray-300 text-lg font-semibold">
                                        <ListChecks className="mr-2 h-5 w-5 text-momcare-primary" />All Upcoming Appointments ({isLoadingAppointments ? '...' : totalUpcomingAppointments})
                                    </CardTitle>
                                    <CardDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">Your scheduled visits and classes, sorted by date.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {isLoadingAppointments ? ( <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-momcare-primary" /></div> )
                                    : totalUpcomingAppointments > 0 ? (
                                        <div className="flow-root">
                                            <ul role="list" className="divide-y divide-gray-200 dark:divide-gray-700">
                                                {allSortedUpcomingAppointments.map((appointment) => (
                                                    <AppointmentItem
                                                        key={appointment.$id} appointment={appointment} onEdit={handleEditAppointment}
                                                        onDelete={handleDeleteAppointmentClick} isDeleting={deletingAppointmentId === appointment.$id}
                                                        type={appointment.appointmentType && classTypes.includes(appointment.appointmentType as ClassAppointmentType) ? 'class' : 'doctor'}
                                                    />
                                                ))}
                                            </ul>
                                        </div>
                                    ) : ( /* ... existing placeholder ... */
                                        <div className="text-center py-10 px-6">
                                            <Inbox className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 mb-3" />
                                            <p className="text-gray-500 dark:text-gray-400 font-medium">No upcoming appointments found.</p>
                                            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Use the 'Schedule Appointment' page to add new ones.</p>
                                            <Button asChild size="sm" className="mt-4 bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-accent dark:hover:bg-pink-700"><a href="/appointment">Schedule Now</a></Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Resources & Emergency Access */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Helpful Resources */}
                                <Card className="border border-gray-200 shadow-sm lg:col-span-2 bg-white dark:bg-gray-800 dark:border-gray-700">
                                    <CardHeader className="bg-gray-50 border-b border-gray-200 dark:bg-gray-700/50 dark:border-gray-600"><CardTitle className="text-gray-700 dark:text-gray-300 text-lg font-semibold">Helpful Resources</CardTitle><CardDescription className="text-sm text-gray-500 dark:text-gray-400 mt-1">Information to support your journey.</CardDescription></CardHeader>
                                    <CardContent className="pt-6 px-5">
                                        {/* ... existing resource links ... */}
                                         <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <a href="/resources?category=Health Checks" className="block bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-momcare-primary/30 dark:hover:border-momcare-light/30"><div className="flex items-center"><div className="flex-shrink-0 w-10 h-10 bg-momcare-primary/10 dark:bg-momcare-light/10 rounded-full flex items-center justify-center mr-3"><Stethoscope className="h-5 w-5 text-momcare-primary dark:text-momcare-light" /></div><div><h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Health Checks</h3><p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Key tests during pregnancy</p></div></div></a>
                                                <a href="/resources?category=Nutrition" className="block bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-momcare-secondary/30 dark:hover:border-blue-400/30"><div className="flex items-center"><div className="flex-shrink-0 w-10 h-10 bg-momcare-secondary/10 dark:bg-blue-500/10 rounded-full flex items-center justify-center mr-3"><Salad className="h-5 w-5 text-momcare-secondary dark:text-blue-400" /></div><div><h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Diet & Nutrition</h3><p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Eating well for two</p></div></div></a>
                                                <a href="/resources?category=Baby Development" className="block bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-momcare-accent/30 dark:hover:border-pink-400/30"><div className="flex items-center"><div className="flex-shrink-0 w-10 h-10 bg-momcare-accent/10 dark:bg-pink-500/10 rounded-full flex items-center justify-center mr-3"><Baby className="h-5 w-5 text-momcare-accent dark:text-pink-400" /></div><div><h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Baby Development</h3><p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Week-by-week guide</p></div></div></a>
                                                <a href="/resources?category=Self-Care" className="block bg-white dark:bg-gray-700/30 border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-green-200 dark:hover:border-green-400/30"><div className="flex items-center"><div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mr-3"><Heart className="h-5 w-5 text-green-600 dark:text-green-400" /></div><div><h3 className="font-semibold text-gray-800 dark:text-gray-200 text-sm">Self-Care</h3><p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">Taking care of yourself</p></div></div></a>
                                            </div>
                                            <div className="flex justify-center pt-2">
                                                <Button asChild variant="outline" size="sm" className="text-momcare-primary border-momcare-primary/50 hover:text-momcare-dark hover:bg-momcare-primary/5 dark:text-momcare-light dark:border-momcare-light/50 dark:hover:text-white dark:hover:bg-momcare-light/10"><a href="/resources" className="flex items-center">Browse All Resources<ArrowRight className="ml-1.5 h-4 w-4" /></a></Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                {/* Emergency Access Card */}
                                <Card className="border-2 border-red-400 dark:border-red-600/80 shadow-md lg:col-span-1 bg-red-50/50 dark:bg-red-900/30">
                                    <CardHeader className="bg-red-100/70 dark:bg-red-800/40 border-b border-red-300 dark:border-red-700"><CardTitle className="flex items-center text-red-700 dark:text-red-300 text-lg font-semibold"><AlertTriangle className="mr-2 h-5 w-5" />Emergency Info</CardTitle></CardHeader>
                                    <CardContent className="pt-5 px-5 space-y-4">
                                        <p className="text-gray-700 dark:text-gray-300 text-sm font-medium">Quick access for urgent situations.</p>
                                        <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white shadow-sm dark:hover:bg-red-500"><a href="/emergency" className="flex items-center justify-center"><AlertTriangle className="mr-2 h-4 w-4" />View Emergency Details</a></Button>
                                        <div className="bg-white dark:bg-gray-700/40 p-3 rounded-md border border-red-200 dark:border-red-600/50 shadow-inner">
                                            <p className="text-sm font-semibold text-red-600 dark:text-red-300 mb-1.5">Key Warning Signs:</p>
                                            <ul className="text-xs text-red-800 dark:text-red-200/90 space-y-1.5">
                                                {/* ... warning signs list ... */}
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400 mr-1.5 flex-shrink-0 mt-0.5" />Severe abdominal pain or cramping</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400 mr-1.5 flex-shrink-0 mt-0.5" />Heavy vaginal bleeding</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400 mr-1.5 flex-shrink-0 mt-0.5" />Significant decrease in fetal movement</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400 mr-1.5 flex-shrink-0 mt-0.5" />Sudden severe swelling (face/hands)</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400 mr-1.5 flex-shrink-0 mt-0.5" />Severe headache or vision changes</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 dark:text-red-400 mr-1.5 flex-shrink-0 mt-0.5" />Fever over 100.4°F (38°C)</li>
                                            </ul>
                                            <p className="text-xs text-red-900 dark:text-red-200 mt-2.5 font-semibold">If experiencing emergencies, call 102 or your provider immediately.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Quick Actions */}
                            <Card className="border border-gray-200 shadow-sm bg-white dark:bg-gray-800 dark:border-gray-700">
                                <CardHeader><CardTitle className="text-xl font-semibold text-momcare-dark dark:text-momcare-light">Quick Actions</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        {/* ... existing quick action buttons ... */}
                                        <Button asChild variant="outline" className="h-24 flex flex-col justify-center items-center text-center p-2 border-gray-300 dark:border-gray-600 hover:bg-momcare-light/50 dark:hover:bg-gray-700/50 hover:border-momcare-primary/50 dark:hover:border-momcare-light/50 group transition-all duration-150 ease-in-out hover:scale-105"><a href="/chat"><MessageSquare className="h-6 w-6 mb-1.5 text-momcare-primary dark:text-momcare-light transition-transform group-hover:scale-110" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Chat with AI</span></a></Button>
                                        <Button asChild variant="outline" className="h-24 flex flex-col justify-center items-center text-center p-2 border-gray-300 dark:border-gray-600 hover:bg-momcare-light/50 dark:hover:bg-gray-700/50 hover:border-momcare-primary/50 dark:hover:border-momcare-light/50 group transition-all duration-150 ease-in-out hover:scale-105"><a href="/appointment"><Calendar className="h-6 w-6 mb-1.5 text-momcare-primary dark:text-momcare-light transition-transform group-hover:scale-110" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Appointments</span></a></Button>
                                        <Button asChild variant="outline" className="h-24 flex flex-col justify-center items-center text-center p-2 border-gray-300 dark:border-gray-600 hover:bg-momcare-light/50 dark:hover:bg-gray-700/50 hover:border-momcare-primary/50 dark:hover:border-momcare-light/50 group transition-all duration-150 ease-in-out hover:scale-105"><a href="/medicaldocs"><FilePlus className="h-6 w-6 mb-1.5 text-momcare-primary dark:text-momcare-light transition-transform group-hover:scale-110" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">Medical Docs</span></a></Button>
                                        <Button asChild variant="outline" className="h-24 flex flex-col justify-center items-center text-center p-2 border-gray-300 dark:border-gray-600 hover:bg-momcare-light/50 dark:hover:bg-gray-700/50 hover:border-momcare-primary/50 dark:hover:border-momcare-light/50 group transition-all duration-150 ease-in-out hover:scale-105"><a href="/profile"><User className="h-6 w-6 mb-1.5 text-momcare-primary dark:text-momcare-light transition-transform group-hover:scale-110" /><span className="text-sm font-medium text-gray-700 dark:text-gray-300">My Profile</span></a></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    ) : null} {/* End: Content Area */}
                </div> {/* End: max-w-7xl */}
            </div> {/* End: background gradient */}

            {/* --- Modals & Dialogs (Keep existing) --- */}
            {editingAppointment && ( <EditAppointmentModal appointment={editingAppointment} isOpen={isEditModalOpen} onClose={() => { setIsEditModalOpen(false); setEditingAppointment(null); }} onAppointmentUpdated={async () => { setIsEditModalOpen(false); setEditingAppointment(null); await fetchData(); }} /> )}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}> {/* ... existing delete dialog ... */}
                 <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Confirm Appointment Deletion</AlertDialogTitle> <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={() => setAppointmentToDelete(null)}>Cancel</AlertDialogCancel> <AlertDialogAction onClick={confirmDeleteAppointment} className="bg-red-600 hover:bg-red-700" disabled={!!deletingAppointmentId} > {deletingAppointmentId === appointmentToDelete ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Appointment"} </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent>
            </AlertDialog>
            <AddMedReminderModal isOpen={isMedModalOpen} onClose={() => setIsMedModalOpen(false)} onSubmit={handleSaveReminder} />
            <AlertDialog open={isDeleteMedReminderDialogOpen} onOpenChange={setIsDeleteMedReminderDialogOpen}> {/* ... existing reminder delete dialog ... */}
                 <AlertDialogContent> <AlertDialogHeader> <AlertDialogTitle>Confirm Reminder Deletion</AlertDialogTitle> <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription> </AlertDialogHeader> <AlertDialogFooter> <AlertDialogCancel onClick={() => setMedReminderToDelete(null)}>Cancel</AlertDialogCancel> <AlertDialogAction onClick={confirmDeleteReminder} className="bg-red-600 hover:bg-red-700" disabled={!!deletingMedReminderId} > {deletingMedReminderId === medReminderToDelete ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Reminder"} </AlertDialogAction> </AlertDialogFooter> </AlertDialogContent>
            </AlertDialog>

        </MainLayout>
    );
};

export default DashboardPage;