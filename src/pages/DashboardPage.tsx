// src/pages/DashboardPage.tsx

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { format, compareAsc, parseISO } from 'date-fns'; // Removed unused date-fns imports
import {
    Calendar, Clock, Baby, Activity, FilePlus, MessageSquare, ArrowRight,
    AlertTriangle, Heart, Stethoscope, Salad, User, Edit, Trash2, Loader2, ListChecks,
    Bike, GraduationCap, Inbox, Pill, PlusCircle, BarChart3, Utensils, Dumbbell, BookOpen, CheckSquare
} from 'lucide-react';

// --- UI Components ---
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AppointmentItem from '@/components/ui/AppointmentItem';
import EditAppointmentModal from '@/components/ui/EditAppointmentModal';
import MedCharts from '@/components/ui/MedCharts';
import MedReminder from '@/components/ui/MedReminder';
import AddMedReminderModal from '@/components/ui/AddMedReminderModal';

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

// --- Helper Component: User Stats (Updated with fix for 0% completeness) ---
const UserStatsCards: React.FC<{ profile: UserProfile | null; appointmentsCount: number }> = ({ profile, appointmentsCount }) => {
  const profileCompleteness = useMemo(() => {
      if (!profile) return 0;

      // Define essential fields (required for basic functionality)
      const essentialFields: (keyof UserProfile)[] = ['name', 'age', 'gender', 'weeksPregnant', 'phoneNumber'];

      // Define extended fields (recommended but optional)
      const extendedFields: (keyof UserProfile)[] = [
          'address', 'preExistingConditions', 'previousPregnancies',
          'deliveryPreference', 'workSituation', 'activityLevel',
          'partnerSupport', 'dietaryPreferences', 'chatTonePreference'
      ];

      // Calculate essential completion (weighted 60%)
      const completedEssential = essentialFields.filter(field => {
          const value = profile[field];
          if (field === 'weeksPregnant') {
              return typeof value === 'number' && value >= 0;
          }
          if (field === 'age' || field === 'previousPregnancies') {
              return typeof value === 'number' && value >= 0; // Ensure age/previousPregnancies are numbers >= 0
          }
          return value !== null && value !== undefined && String(value).trim() !== '';
      }).length;

      // Calculate extended completion (weighted 40%)
      const completedExtended = extendedFields.filter(field => {
          const value = profile[field];
          if (field === 'dietaryPreferences') {
              return Array.isArray(value) && value.length > 0;
          }
          if (field === 'previousPregnancies') {
              // This check is also in essential, ensure consistency or decide where it belongs primarily
              return typeof value === 'number' && value >= 0;
          }
          return value !== null && value !== undefined && String(value).trim() !== '';
      }).length;

      // Calculate weighted percentage
      const essentialWeight = 0.6;
      const extendedWeight = 0.4;

      const essentialPercentage = essentialFields.length > 0 ?
          (completedEssential / essentialFields.length) * essentialWeight * 100 : 0;

      const extendedPercentage = extendedFields.length > 0 ?
          (completedExtended / extendedFields.length) * extendedWeight * 100 : 0;

      return Math.round(essentialPercentage + extendedPercentage);
  }, [profile]);

  const missingFields = useMemo(() => {
    // Return empty arrays if profile is null (consistent with completeness calculation)
    if (!profile) return { essential: [], extended: [] };

    const essential = [];
    const extended = [];

    // Check essential fields (60% of score)
    if (!profile.name || String(profile.name).trim() === '') essential.push('Full Name');
    // Check if age is null, undefined, or not a non-negative number
    if (profile.age === null || profile.age === undefined || (typeof profile.age === 'number' && profile.age < 0)) essential.push('Age');
    if (!profile.gender || String(profile.gender).trim() === '') essential.push('Gender');
    // Check if weeksPregnant is null, undefined, or not a non-negative number
    if (profile.weeksPregnant === null || profile.weeksPregnant === undefined || (typeof profile.weeksPregnant === 'number' && profile.weeksPregnant < 0)) essential.push('Current Weeks Pregnant');
    if (!profile.phoneNumber || String(profile.phoneNumber).trim() === '') essential.push('Phone Number');

    // Check extended fields (40% of score)
    if (!profile.address || String(profile.address).trim() === '') extended.push('Address');
    if (!profile.preExistingConditions || String(profile.preExistingConditions).trim() === '') extended.push('Pre-existing Medical Conditions');
    // Check if previousPregnancies is null, undefined, or not a non-negative number
    if (profile.previousPregnancies === null || profile.previousPregnancies === undefined || (typeof profile.previousPregnancies === 'number' && profile.previousPregnancies < 0)) extended.push('Number of Previous Pregnancies');
    if (!profile.deliveryPreference || String(profile.deliveryPreference).trim() === '') extended.push('Delivery Preference');
    if (!profile.workSituation || String(profile.workSituation).trim() === '') extended.push('Work Situation');
    if (!profile.activityLevel || String(profile.activityLevel).trim() === '') extended.push('Activity Level');
    if (!profile.partnerSupport || String(profile.partnerSupport).trim() === '') extended.push('Partner Support Level');
    if (!Array.isArray(profile.dietaryPreferences) || profile.dietaryPreferences.length === 0) extended.push('Dietary Preferences');
    if (!profile.chatTonePreference || String(profile.chatTonePreference).trim() === '') extended.push('Chat Tone Preference');

    return { essential, extended };
  }, [profile]);

  // Define the user-friendly names for ALL essential fields
  // IMPORTANT: Make sure these exactly match the names pushed into missingFields.essential
  const essentialFieldNames: string[] = useMemo(() => [
      'Full Name',
      'Age',
      'Gender',
      'Current Weeks Pregnant',
      'Phone Number'
  ], []);

    return (
        <Card className="border border-gray-200 bg-white mt-4 shadow-sm">
            <CardHeader className="p-3 bg-gray-50 border-b">
                <CardTitle className="flex items-center text-gray-700 text-sm font-medium">
                    <User className="mr-1.5 h-4 w-4 text-momcare-primary" /> Profile & Activity
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 text-xs space-y-2">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600">Profile Complete:</span>
                    <span className={`font-semibold ${profileCompleteness === 0 ? "text-amber-500" : "text-momcare-primary"}`}>{profileCompleteness}%</span>
                </div>
                <Progress value={profileCompleteness} className="h-1 [&>*]:bg-momcare-primary" aria-label={`Profile completeness: ${profileCompleteness}%`} />

                {/* Section for Missing Fields */}
                {profileCompleteness < 100 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">

                        {/* --- Essential Fields Section --- */}
                        {/* Show this section if completeness is 0 OR if >0 and essential fields are missing */}
                        {(profileCompleteness === 0 || missingFields.essential.length > 0) && (
                            <>
                                {/* Message: Varies based on whether completeness is exactly 0 */}
                                <p className="text-amber-600 font-medium mb-1">
                                    {profileCompleteness === 0
                                        ? "Start by completing these essential fields:"
                                        : "Please complete these essential fields:"}
                                </p>

                                {/* List: Source of items varies based on whether completeness is 0 */}
                                <ul className="list-disc list-inside space-y-0.5 text-gray-600">
                                    {(profileCompleteness === 0 ? essentialFieldNames : missingFields.essential).map((field, index) => (
                                        <li key={`essential-${index}`}>{field}</li>
                                    ))}
                                </ul>
                            </>
                        )}

                        {/* --- Extended Fields Section --- */}
                        {/* Show this section ONLY if completeness > 0 AND extended fields are missing */}
                        {missingFields.extended.length > 0 && profileCompleteness > 0 && (
                            <>
                                <p className="text-gray-500 font-medium mb-1 mt-2">Optional fields to reach 100%:</p>
                                <ul className="list-disc list-inside space-y-0.5 text-gray-400">
                                    {missingFields.extended.map((field, index) => (
                                        <li key={`extended-${index}`}>{field}</li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                )}

                <div className="text-right pt-1">
                    <Button variant="link" size="sm" asChild className="text-xs h-auto p-0 text-momcare-primary hover:underline">
                        <a href="/profile">Edit Profile</a>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

// --- Helper Function: Parse Appointment DateTime (Unchanged) ---
const parseAppointmentDateTime = (app: Appointment): Date | null => {
    // Robust parsing, ensure it handles various time formats if necessary
    if (!app?.date || !app?.time) return null;
    try {
        // Handle date part (assuming ISO format like YYYY-MM-DDTHH:mm:ss.sssZ or just YYYY-MM-DD)
        const datePart = app.date.split('T')[0]; // Get YYYY-MM-DD part
        const baseDate = parseISO(`${datePart}T00:00:00`); // Use ISO format for reliable parsing
        if (isNaN(baseDate.getTime())) {
             console.warn(`Invalid date part encountered: ${app.date}`);
             return null;
        }

        // Handle time part (flexible: HH:mm, h:mm AM/PM)
        const timeMatch = app.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!timeMatch) {
            console.warn(`Invalid time format encountered: ${app.time}`);
            return null; // Or try other parsing methods if needed
        }

        let hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const period = timeMatch[3]?.toUpperCase(); // AM/PM

        if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) return null;

        // Adjust hours for AM/PM if present
        if (period) {
            if (hours < 1 || hours > 12) return null; // Invalid 12-hour format
            if (period === 'PM' && hours !== 12) hours += 12;
            if (period === 'AM' && hours === 12) hours = 0; // Midnight case
        } else {
            // Assume 24-hour format if no AM/PM
            if (hours < 0 || hours > 23) return null; // Invalid 24-hour format
        }

        // Combine date and time components
        const combinedDate = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), hours, minutes);

        return isNaN(combinedDate.getTime()) ? null : combinedDate;
    } catch (error) {
        console.error('Error parsing appointment date/time:', app.date, app.time, error);
        return null;
    }
};

// --- Main Dashboard Component ---
const DashboardPage: React.FC = () => {
    // --- State (remains largely the same) ---
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [upcomingDoctorAppointments, setUpcomingDoctorAppointments] = useState<Appointment[]>([]);
    const [upcomingClassAppointments, setUpcomingClassAppointments] = useState<Appointment[]>([]);
    const [bpReadings, setBpReadings] = useState<BloodPressureReading[]>([]);
    const [sugarReadings, setSugarReadings] = useState<BloodSugarReading[]>([]);
    const [weightReadings, setWeightReadings] = useState<WeightReading[]>([]);
    const [medReminders, setMedReminders] = useState<MedicationReminder[]>([]);

    // Loading States
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
    const [isLoadingAppointments, setIsLoadingAppointments] = useState<boolean>(true);
    const [isLoadingHealthData, setIsLoadingHealthData] = useState<boolean>(true);
    const [isLoadingMedReminders, setIsLoadingMedReminders] = useState<boolean>(true);

    // Appointment Modal/Dialog State
    const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
    const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
    const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

    // Medication Reminder Modal/Dialog State
    const [isMedModalOpen, setIsMedModalOpen] = useState<boolean>(false);
    const [deletingMedReminderId, setDeletingMedReminderId] = useState<string | null>(null);
    const [isDeleteMedReminderDialogOpen, setIsDeleteMedReminderDialogOpen] = useState<boolean>(false);
    const [medReminderToDelete, setMedReminderToDelete] = useState<string | null>(null);

    // Hooks
    const { user, isAuthenticated } = useAuthStore();
    const { toast } = useToast();

    // --- Constants & Memos (Appointment types remain) ---
    const doctorTypes = useMemo(() => ['doctor', 'lab_test', undefined, null, ''] as const, []);
    const classTypes = useMemo(() => ['yoga_class', 'childbirth_class', 'fitness_class'] as const, []);
    type ClassAppointmentType = typeof classTypes[number];

    // --- Data Fetching (Unchanged logic, just fetches profile with weeksPregnant now) ---
    const fetchData = useCallback(async () => {
        if (!isAuthenticated || !user?.$id) {
            setIsLoading(false); setIsLoadingProfile(false); setIsLoadingAppointments(false);
            setIsLoadingHealthData(false); setIsLoadingMedReminders(false);
            setProfile(null); setUpcomingDoctorAppointments([]); setUpcomingClassAppointments([]);
            setBpReadings([]); setSugarReadings([]); setWeightReadings([]); setMedReminders([]);
            return;
        }

        const currentUserId = user.$id;
        setIsLoading(true); setIsLoadingProfile(true); setIsLoadingAppointments(true);
        setIsLoadingHealthData(true); setIsLoadingMedReminders(true);

        let results: PromiseSettledResult<any>[] = [];

        try {
            results = await Promise.allSettled([
                getUserProfile(currentUserId),              // 0: Profile
                getUserAppointments(currentUserId),         // 1: Appointments
                getBloodPressureReadings(currentUserId),    // 2: BP
                getBloodSugarReadings(currentUserId),       // 3: Sugar
                getWeightReadings(currentUserId),           // 4: Weight
                getMedicationReminders(currentUserId),      // 5: Reminders
            ]);

            // Process Profile (Index 0) - Now contains weeksPregnant if set
            if (results[0].status === 'fulfilled') {
                setProfile(results[0].value as UserProfile | null);
            } else {
                console.error('Error fetching profile:', results[0].reason); setProfile(null);
                toast({ title: "Profile Load Failed", variant: "destructive" });
            }
            setIsLoadingProfile(false);

            // Process Appointments (Index 1) - Unchanged parsing logic
            if (results[1].status === 'fulfilled') {
                const allAppointmentsData = results[1].value as Appointment[] ?? [];
                const now = new Date();
                const allUpcoming = allAppointmentsData
                    .map(app => ({ ...app, dateTime: parseAppointmentDateTime(app) }))
                    .filter((app): app is Appointment & { dateTime: Date } =>
                        app.dateTime !== null && app.dateTime > now && !app.isCompleted // Use > instead of isAfter
                    )
                    .sort((a, b) => compareAsc(a.dateTime, b.dateTime));

                setUpcomingDoctorAppointments(allUpcoming.filter(app => doctorTypes.includes(app.appointmentType)));
                setUpcomingClassAppointments(allUpcoming.filter(app =>
                    app.appointmentType && classTypes.includes(app.appointmentType as ClassAppointmentType)
                ));
            } else {
                console.error('Error fetching appointments:', results[1].reason);
                setUpcomingDoctorAppointments([]); setUpcomingClassAppointments([]);
                toast({ title: "Appointments Load Failed", variant: "destructive" });
            }
            setIsLoadingAppointments(false);

            // Process Health Data (Indices 2, 3, 4) - Unchanged
            if (results[2].status === 'fulfilled') setBpReadings(results[2].value as BloodPressureReading[] ?? []);
            else { console.error('Error fetching BP:', results[2].reason); setBpReadings([]); }
            if (results[3].status === 'fulfilled') setSugarReadings(results[3].value as BloodSugarReading[] ?? []);
            else { console.error('Error fetching Sugar:', results[3].reason); setSugarReadings([]); }
            if (results[4].status === 'fulfilled') setWeightReadings(results[4].value as WeightReading[] ?? []);
            else { console.error('Error fetching Weight:', results[4].reason); setWeightReadings([]); }
            setIsLoadingHealthData(false);

            // Process Medication Reminders (Index 5) - Unchanged
            if (results[5].status === 'fulfilled') setMedReminders(results[5].value as MedicationReminder[] ?? []);
            else { console.error('Error fetching Reminders:', results[5].reason); setMedReminders([]);
                   toast({ title: "Reminders Load Failed", variant: "destructive" }); }
            setIsLoadingMedReminders(false);

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            console.error('Critical error setting up dashboard data fetch:', error);
            toast({ title: "Dashboard Load Failed", description: `${errorMessage}. Please refresh.`, variant: "destructive" });
            setProfile(null); setUpcomingDoctorAppointments([]); setUpcomingClassAppointments([]);
            setBpReadings([]); setSugarReadings([]); setWeightReadings([]); setMedReminders([]);
            setIsLoadingProfile(false); setIsLoadingAppointments(false); setIsLoadingHealthData(false); setIsLoadingMedReminders(false);
        } finally {
            setIsLoading(false);
        }
    }, [user, isAuthenticated, toast, doctorTypes, classTypes]);

    // Effect to fetch data on mount and auth changes
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Appointment Handlers (Unchanged) ---
    const handleEditAppointment = useCallback((appointment: Appointment) => {
        setEditingAppointment(appointment);
        setIsEditModalOpen(true);
    }, []);

    const handleDeleteAppointmentClick = useCallback((appointmentId: string) => {
        setAppointmentToDelete(appointmentId);
        setIsDeleteDialogOpen(true);
    }, []);

    const confirmDeleteAppointment = useCallback(async () => {
        if (!appointmentToDelete) return;
        setDeletingAppointmentId(appointmentToDelete);
        try {
            await deleteAppointment(appointmentToDelete);
            toast({ title: "Appointment Deleted", variant: "default" });
            await fetchData(); // Refetch all data
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Could not delete.";
            console.error('Error deleting appointment:', error);
            toast({ title: "Deletion Failed", description: errorMessage, variant: "destructive" });
        } finally {
            setDeletingAppointmentId(null); setAppointmentToDelete(null); setIsDeleteDialogOpen(false);
        }
    }, [appointmentToDelete, fetchData, toast]);

    // --- Medication Reminder Handlers (Unchanged) ---
    const handleAddReminderClick = useCallback(() => { setIsMedModalOpen(true); }, []);

    const handleSaveReminder = useCallback(async (data: CreateMedicationReminderData) => {
        if (!user?.$id) { toast({ title: "Error", description: "User not found.", variant: "destructive" }); return; }
        try {
            await createMedicationReminder(user.$id, data);
            toast({ title: "Reminder Added" });
            await fetchData(); // Refresh data
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Could not save.";
            console.error("Error saving reminder:", error);
            toast({ title: "Save Failed", description: errorMessage, variant: "destructive" });
            throw error;
        }
    }, [user?.$id, fetchData, toast]);

    const handleDeleteReminderClick = useCallback((reminderId: string) => {
        setMedReminderToDelete(reminderId);
        setIsDeleteMedReminderDialogOpen(true);
    }, []);

    const confirmDeleteReminder = useCallback(async () => {
        if (!medReminderToDelete) return;
        setDeletingMedReminderId(medReminderToDelete);
        try {
            await deleteMedicationReminder(medReminderToDelete);
            toast({ title: "Reminder Deleted", variant: "default" });
            await fetchData(); // Refresh data
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Could not delete.";
            console.error('Error deleting reminder:', error);
            toast({ title: "Deletion Failed", description: errorMessage, variant: "destructive" });
        } finally {
            setDeletingMedReminderId(null); setMedReminderToDelete(null); setIsDeleteMedReminderDialogOpen(false);
        }
    }, [medReminderToDelete, fetchData, toast]);

    // --- UPDATED Milestone Getter ---
    const getMilestone = useCallback((week: number): string => {
        // Enhanced milestones (Keep the existing milestones object)
        const milestones: { [key: number]: string } = {
             1: "Pregnancy begins (based on LMP). Fertilization may occur.",
             4: "Implantation occurs. Embryo forms layers. Size of a poppy seed.",
             6: "Heartbeat may be detectable via ultrasound. Neural tube closing. Size of a lentil.",
             8: "Arms and legs forming buds. Basic facial features appear. Size of a kidney bean.",
            10: "Now officially a fetus. Vital organs developing rapidly. Size of a prune.",
            12: "End of first trimester. Risk of miscarriage drops significantly. Fingers/toes defined.",
            14: "Start of second trimester. Lanugo (fine hair) appears. Size of a lemon.",
            16: "May start feeling 'quickening' (flutters). Skeleton hardening. Size of an avocado.",
            18: "Gender may be visible on ultrasound. Unique fingerprints forming.",
            20: "Anatomy scan typically performed. Baby can swallow. Size of a small banana.",
            22: "Vernix caseosa (waxy coating) covers skin. Eyes developed but fused shut.",
            24: "Viability milestone. Lungs developing surfactant. Responds to sound.",
            26: "Eyes begin to open. Practices breathing movements.",
            28: "Start of third trimester. Rapid brain development. Gains weight.",
            30: "Bones fully developed but soft. Baby fills more of the uterus.",
            32: "Practicing breathing, sucking, swallowing. May settle head-down.",
            34: "Lungs maturing quickly. Fingernails reach fingertips.",
            36: "Considered 'early term'. Shedding lanugo and vernix. May 'drop' lower.",
            38: "Considered 'full term'. Brain and lungs continue maturing.",
            39: "Ready for birth! Body fat increasing.",
            40: "Official due date! Labor could start anytime.",
            41: "Considered 'late term'. Monitoring increases.",
            42: "Considered 'post term'. Induction often discussed."
        };

        if (week <= 0) return "Planning or very early stages.";
        if (week > 42) return "Anticipating arrival or baby may have arrived!"; // Adjust max week if needed

        // Find the latest milestone week that is less than or equal to the current week
        const relevantWeeks = Object.keys(milestones).map(Number).filter(w => w <= week);
        const currentMilestoneWeek = relevantWeeks.length > 0 ? Math.max(...relevantWeeks) : 0;

        return currentMilestoneWeek > 0
            ? `${milestones[currentMilestoneWeek]}`
            : "Early development stages.";
    }, []); // No dependencies needed now

    // --- Formatting Helper (Unchanged) ---
    const formatAppointmentDate = useCallback((dateString: string | undefined, time: string | undefined): string => {
        if (!dateString || !time) return "Date/Time not set";
        const appointmentStub = { date: dateString, time: time } as Appointment;
        try {
            const dateTimeObj = parseAppointmentDateTime(appointmentStub);
            if (!dateTimeObj) throw new Error("Invalid date/time components from parsing");
            return format(dateTimeObj, "EEE, MMM d, yyyy 'at' h:mm a");
        } catch (error) {
            console.warn("Fallback formatting used for appointment:", dateString, time, error);
            const datePart = dateString.split('T')[0] || dateString;
            return `${datePart} at ${time}`;
        }
    }, []);

    // --- UPDATED Derived Values ---
    // Get current week directly from profile
    const currentWeek = useMemo(() => profile?.weeksPregnant ?? 0, [profile?.weeksPregnant]);

    // Calculate trimester based on currentWeek
    const pregnancyTrimester: Trimester = useMemo(() => {
      const week = currentWeek;
      if (week >= 1 && week <= 13) return "First";
      if (week >= 14 && week <= 27) return "Second";
      if (week >= 28 && week <= 40) return "Third";
      if (week > 40) return "Post-term";
      // Handle week 0 or undefined profile case
      if (week === 0 && profile?.weeksPregnant !== undefined) return "Pre-conception"; // If week is explicitly 0
      return "N/A"; // Default if no weeks are set or profile is null
  }, [currentWeek, profile?.weeksPregnant]);

    // Calculate progress based on currentWeek (assuming 40 weeks total)
    const pregnancyProgress = useMemo(() => {
        // Ensure week is within a reasonable range for progress calculation (e.g., 1-40)
        const effectiveWeek = Math.max(0, Math.min(currentWeek, 40));
        return effectiveWeek > 0 ? Math.round((effectiveWeek / 40) * 100) : 0;
    }, [currentWeek]);

    // Select health tip based on calculated trimester and currentWeek
    const currentHealthTip: HealthTip = useMemo(() => {
        // Pass "N/A" trimester if not applicable
        return selectHealthTip(pregnancyTrimester === "N/A" ? "N/A" : pregnancyTrimester, currentWeek);
    }, [pregnancyTrimester, currentWeek]);

    // Other derived values (remain the same)
    const nextDoctorAppointment = useMemo(() => upcomingDoctorAppointments[0] || null, [upcomingDoctorAppointments]);
    const nextClassAppointment = useMemo(() => upcomingClassAppointments[0] || null, [upcomingClassAppointments]);
    const totalUpcomingAppointments = useMemo(() => upcomingDoctorAppointments.length + upcomingClassAppointments.length, [upcomingDoctorAppointments, upcomingClassAppointments]);
    const allSortedUpcomingAppointments = useMemo(() => {
        return [...upcomingDoctorAppointments, ...upcomingClassAppointments]
            .filter((app): app is Appointment & { dateTime: Date } => app.dateTime != null)
            .sort((a, b) => compareAsc(a.dateTime, b.dateTime));
    }, [upcomingDoctorAppointments, upcomingClassAppointments]);

    // Helper to get an icon based on health tip category (Unchanged)
    const getTipCategoryIcon = (category: HealthTip['category']) => {
        const iconProps = { className: "h-4 w-4 mr-1.5 flex-shrink-0", "aria-hidden": true };
        switch (category) {
            case 'Nutrition': return <Utensils {...iconProps} color="text-green-600" />;
            case 'Exercise': return <Dumbbell {...iconProps} color="text-blue-600" />;
            case 'Symptoms': return <Heart {...iconProps} color="text-red-500" />;
            case 'Preparation': return <CheckSquare {...iconProps} color="text-purple-600" />;
            case 'Wellbeing': return <Heart {...iconProps} color="text-pink-500" />;
            case 'Provider': return <Stethoscope {...iconProps} color="text-cyan-600" />;
            case 'General': return <BookOpen {...iconProps} color="text-gray-600" />;
            default: return <Heart {...iconProps} color="text-gray-500" />;
        }
    };

    // --- Render Logic ---
    return (
        <MainLayout requireAuth={true}>
            <div className="bg-gradient-to-b from-momcare-light via-white to-gray-50 min-h-screen py-8 md:py-12">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    {/* Header */}
                    <div className="mb-8 md:mb-10">
                        <h1 className="text-3xl md:text-4xl font-bold text-momcare-dark mb-1 tracking-tight">
                            {isLoadingProfile ? 'Loading...' : `Hello, ${profile?.name || user?.name || 'User'}!`}
                        </h1>
                        <p className="text-gray-600 text-base md:text-lg">
                            Here's your pregnancy journey overview and upcoming schedule.
                        </p>
                    </div>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-12 w-12 animate-spin text-momcare-primary" />
                            <span className="ml-4 text-lg text-gray-600">Loading Dashboard...</span>
                        </div>
                    )}

                    {/* Content Area */}
                    {!isLoading && (
                        <div className="space-y-8 md:space-y-10">
                            {/* Top Row Info Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                {/* Pregnancy Journey (UPDATED) */}
                                <Card className="border border-momcare-primary/30 shadow-sm h-full bg-white">
                                    <CardHeader className="bg-momcare-primary/5 border-b border-momcare-primary/10">
                                        <CardTitle className="flex items-center text-momcare-primary text-lg font-semibold">
                                            <Baby className="mr-2 h-5 w-5" />Pregnancy Journey
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 px-5 space-y-5">
                                        {isLoadingProfile ? (
                                             <div className="flex justify-center items-center py-6"><Loader2 className="h-6 w-6 animate-spin text-momcare-primary" /></div>
                                        // UPDATED Condition: Check if weeksPregnant is a valid number (>= 0)
                                        ) : profile?.weeksPregnant !== undefined && profile.weeksPregnant >= 0 ? (
                                            <>
                                                <div>
                                                    <div className="flex justify-between items-baseline mb-2 text-sm">
                                                        {/* Use currentWeek */}
                                                        <span className="font-semibold text-gray-800">Week {currentWeek}</span>
                                                        {/* Use pregnancyTrimester */}
                                                        <span className="text-gray-600">{pregnancyTrimester} Trimester</span>
                                                    </div>
                                                    {/* Use pregnancyProgress */}
                                                    <Progress value={pregnancyProgress} className="h-2.5 [&>*]:bg-gradient-to-r [&>*]:from-momcare-primary [&>*]:to-momcare-secondary" aria-label={`Pregnancy progress: ${pregnancyProgress}%`} />
                                                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                                                        {/* Use pregnancyProgress */}
                                                        <span>{pregnancyProgress}% Complete</span>
                                                        {/* Use currentWeek for remaining weeks calculation */}
                                                        <span>{currentWeek < 40 && currentWeek >= 0 ? `Approx. ${40 - currentWeek} weeks left` : currentWeek === 0 ? "Starting soon!" : "Due date!"}</span>
                                                    </div>
                                                </div>
                                                <div className="bg-momcare-light/40 p-3 rounded-lg border border-momcare-primary/10 text-sm text-gray-700">
                                                    {/* Call getMilestone with currentWeek */}
                                                    <p><span className="font-medium text-momcare-dark">Milestone (Week {currentWeek}): </span>{getMilestone(currentWeek)}</p>
                                                </div>
                                            </>
                                        ) : (
                                            // Placeholder if weeksPregnant is not set
                                            <div className="text-center py-6 flex flex-col items-center">
                                                <Baby className="h-12 w-12 text-gray-400 mb-3" />
                                                {/* UPDATED Text */}
                                                <p className="text-gray-500 mb-4 text-sm">Update profile with current weeks pregnant to track progress.</p>
                                                <Button asChild variant="outline" size="sm" className="text-momcare-primary border-momcare-primary/50 hover:bg-momcare-primary/5">
                                                    <a href="/profile">Go to Profile</a>
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Upcoming Appointments Column (Unchanged structure) */}
                                <div className="space-y-6">
                                    {/* Next Doctor Visit */}
                                    <Card className="border border-momcare-primary/30 shadow-sm bg-white">
                                        <CardHeader className="bg-momcare-primary/5 border-b border-momcare-primary/10">
                                            <CardTitle className="flex items-center text-momcare-primary text-lg font-semibold">
                                                <Stethoscope className="mr-2 h-5 w-5" />Next Doctor Visit
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-5 px-5">
                                             {isLoadingAppointments ? (
                                                 <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-momcare-primary" /></div>
                                             ) : nextDoctorAppointment ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="mt-1 h-10 w-10 bg-momcare-primary/10 text-momcare-primary rounded-full flex items-center justify-center flex-shrink-0"><Calendar className="h-5 w-5" /></div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800 text-sm">{formatAppointmentDate(nextDoctorAppointment.date, nextDoctorAppointment.time)}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5 capitalize">{nextDoctorAppointment.appointmentType?.replace(/_/g, ' ') || 'Check-up/Consultation'}</p>
                                                        </div>
                                                    </div>
                                                    {nextDoctorAppointment.notes && (<p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-200 line-clamp-2"><span className="font-medium">Notes:</span> {nextDoctorAppointment.notes}</p>)}
                                                    <div className="flex justify-end pt-1">
                                                        <Button asChild size="sm" variant="outline" className="text-momcare-primary border-momcare-primary/50 hover:bg-momcare-primary/5 text-xs px-3 py-1 h-auto"><a href="/appointment">Manage All</a></Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 flex flex-col items-center">
                                                    <Stethoscope className="h-10 w-10 text-gray-400 mb-3" />
                                                    <p className="text-gray-500 mb-4 text-sm">No upcoming doctor visits.</p>
                                                    <Button asChild size="sm" className="bg-momcare-primary hover:bg-momcare-dark"><a href="/appointment">Schedule Visit</a></Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                    {/* Next Class/Activity */}
                                    <Card className="border border-momcare-secondary/30 shadow-sm bg-white">
                                        <CardHeader className="bg-momcare-secondary/5 border-b border-momcare-secondary/10">
                                            <CardTitle className="flex items-center text-momcare-secondary text-lg font-semibold">
                                                <GraduationCap className="mr-2 h-5 w-5" />Next Class/Activity
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="pt-5 px-5">
                                            {isLoadingAppointments ? (
                                                 <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-momcare-secondary" /></div>
                                             ) : nextClassAppointment ? (
                                                <div className="space-y-3">
                                                    <div className="flex items-start space-x-3">
                                                        <div className="mt-1 h-10 w-10 bg-momcare-secondary/10 text-momcare-secondary rounded-full flex items-center justify-center flex-shrink-0"><Bike className="h-5 w-5" /></div>
                                                        <div>
                                                            <p className="font-semibold text-gray-800 text-sm">{formatAppointmentDate(nextClassAppointment.date, nextClassAppointment.time)}</p>
                                                            <p className="text-xs text-gray-500 mt-0.5 capitalize">{nextClassAppointment.appointmentType?.replace(/_/g, ' ') || 'Class/Activity'}</p>
                                                        </div>
                                                    </div>
                                                    {nextClassAppointment.notes && (<p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-200 line-clamp-2"><span className="font-medium">Notes:</span> {nextClassAppointment.notes}</p>)}
                                                    <div className="flex justify-end pt-1">
                                                        <Button asChild size="sm" variant="outline" className="text-momcare-secondary border-momcare-secondary/50 hover:bg-momcare-secondary/5 text-xs px-3 py-1 h-auto"><a href="/appointment">Manage All</a></Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-center py-4 flex flex-col items-center">
                                                    <GraduationCap className="h-10 w-10 text-gray-400 mb-3" />
                                                    <p className="text-gray-500 mb-4 text-sm">No upcoming classes scheduled.</p>
                                                    <Button asChild size="sm" className="bg-momcare-secondary hover:bg-momcare-secondary/80"><a href="/appointment">Schedule Class</a></Button>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Health Summary Column (Uses updated UserStatsCards) */}
                                <Card className="border border-gray-200 shadow-sm h-full bg-white">
                                    <CardHeader className="bg-gray-50 border-b border-gray-200">
                                        <CardTitle className="flex items-center text-gray-700 text-lg font-semibold">
                                            <Activity className="mr-2 h-5 w-5 text-momcare-primary" />Your Health Summary
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-6 px-5 space-y-4">
                                        {/* Health Tip Display (Uses updated currentHealthTip) */}
                                        <div className="bg-momcare-light/40 rounded-lg p-4 border border-momcare-primary/10">
                                            <h3 className="font-semibold text-momcare-dark flex items-center mb-1.5 text-sm">
                                                {getTipCategoryIcon(currentHealthTip.category)}
                                                <span>{currentHealthTip.title}</span>
                                            </h3>
                                            <p className="text-sm text-gray-700">{currentHealthTip.description}</p>
                                        </div>

                                        {/* Noted Conditions (Unchanged logic) */}
                                        {isLoadingProfile ? (
                                             <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-amber-500" /></div>
                                        ) : profile?.preExistingConditions && (
                                            <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                                                <h3 className="font-semibold text-amber-800 flex items-center mb-1.5 text-sm"><AlertTriangle className="h-4 w-4 mr-1.5 text-amber-500" />Noted Conditions</h3>
                                                <p className="text-sm text-amber-700">{profile.preExistingConditions}</p>
                                                <div className="text-right mt-2">
                                                    <Button variant="link" size="sm" asChild className="text-xs h-auto p-0 text-amber-600 hover:underline"><a href="/profile">Edit</a></Button>
                                                </div>
                                            </div>
                                        )}
                                        {/* User Stats (Uses updated UserStatsCards component) */}
                                         {isLoadingProfile || isLoadingAppointments ? (
                                              <div className="flex justify-center items-center py-4"><Loader2 className="h-6 w-6 animate-spin text-momcare-primary" /></div>
                                         ) : (
                                             // Renders the updated UserStatsCards component
                                             <UserStatsCards profile={profile} appointmentsCount={totalUpcomingAppointments} />
                                         )}
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Medication Reminders Section (Unchanged) */}
                             <MedReminder
                                reminders={medReminders}
                                isLoading={isLoadingMedReminders}
                                onAddReminder={handleAddReminderClick}
                                onDeleteReminder={handleDeleteReminderClick}
                                deletingReminderId={deletingMedReminderId}
                            />

                            {/* Health Readings Section (Unchanged) */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h2 className="text-xl font-semibold text-gray-800 flex items-center">
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
                                    onDataRefreshNeeded={fetchData} // Pass fetchData for potential refresh actions
                                />
                            </div>

                            {/* All Upcoming Appointments List (Unchanged) */}
                            <Card className="border border-gray-200 shadow-sm bg-white overflow-hidden">
                                <CardHeader className="bg-gray-50 border-b border-gray-200">
                                    <CardTitle className="flex items-center text-gray-700 text-lg font-semibold">
                                        <ListChecks className="mr-2 h-5 w-5 text-momcare-primary" />All Upcoming Appointments ({isLoadingAppointments ? '...' : totalUpcomingAppointments})
                                    </CardTitle>
                                    <CardDescription className="text-sm text-gray-500 mt-1">Your scheduled visits and classes, sorted by date.</CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {isLoadingAppointments ? (
                                        <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-momcare-primary" /></div>
                                    ) : totalUpcomingAppointments > 0 ? (
                                        <div className="flow-root">
                                            <ul role="list" className="divide-y divide-gray-200">
                                                {allSortedUpcomingAppointments.map((appointment) => (
                                                    <AppointmentItem
                                                        key={appointment.$id}
                                                        appointment={appointment}
                                                        onEdit={handleEditAppointment}
                                                        onDelete={handleDeleteAppointmentClick}
                                                        isDeleting={deletingAppointmentId === appointment.$id}
                                                        type={appointment.appointmentType && classTypes.includes(appointment.appointmentType as ClassAppointmentType) ? 'class' : 'doctor'}
                                                    />
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 px-6">
                                            <Inbox className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                            <p className="text-gray-500 font-medium">No upcoming appointments found.</p>
                                            <p className="text-gray-400 text-sm mt-1">Use the 'Schedule Appointment' page to add new ones.</p>
                                            <Button asChild size="sm" className="mt-4 bg-momcare-primary hover:bg-momcare-dark"><a href="/appointment">Schedule Now</a></Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Resources & Emergency Access (Unchanged) */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Helpful Resources */}
                                <Card className="border border-gray-200 shadow-sm lg:col-span-2 bg-white">
                                    <CardHeader className="bg-gray-50 border-b border-gray-200"><CardTitle className="text-gray-700 text-lg font-semibold">Helpful Resources</CardTitle><CardDescription className="text-sm text-gray-500 mt-1">Information to support your journey.</CardDescription></CardHeader>
                                    <CardContent className="pt-6 px-5">
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <a href="/blog/health-checks" className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-momcare-primary/30"><div className="flex items-center"><div className="flex-shrink-0 w-10 h-10 bg-momcare-primary/10 rounded-full flex items-center justify-center mr-3"><Stethoscope className="h-5 w-5 text-momcare-primary" /></div><div><h3 className="font-semibold text-gray-800 text-sm">Health Checks</h3><p className="text-xs text-gray-600 mt-0.5">Key tests during pregnancy</p></div></div></a>
                                                <a href="/blog/nutrition" className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-momcare-secondary/30"><div className="flex items-center"><div className="flex-shrink-0 w-10 h-10 bg-momcare-secondary/10 rounded-full flex items-center justify-center mr-3"><Salad className="h-5 w-5 text-momcare-secondary" /></div><div><h3 className="font-semibold text-gray-800 text-sm">Diet & Nutrition</h3><p className="text-xs text-gray-600 mt-0.5">Eating well for two</p></div></div></a>
                                                <a href="/blog/development" className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-momcare-accent/30"><div className="flex items-center"><div className="flex-shrink-0 w-10 h-10 bg-momcare-accent/10 rounded-full flex items-center justify-center mr-3"><Baby className="h-5 w-5 text-momcare-accent" /></div><div><h3 className="font-semibold text-gray-800 text-sm">Baby Development</h3><p className="text-xs text-gray-600 mt-0.5">Week-by-week guide</p></div></div></a>
                                                <a href="/blog/self-care" className="block bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow hover:border-green-200"><div className="flex items-center"><div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3"><Heart className="h-5 w-5 text-green-600" /></div><div><h3 className="font-semibold text-gray-800 text-sm">Self-Care</h3><p className="text-xs text-gray-600 mt-0.5">Taking care of yourself</p></div></div></a>
                                            </div>
                                            <div className="flex justify-center pt-2">
                                                <Button asChild variant="outline" size="sm" className="text-momcare-primary border-momcare-primary/50 hover:text-momcare-dark hover:bg-momcare-primary/5"><a href="/resources" className="flex items-center">Browse All Resources<ArrowRight className="ml-1.5 h-4 w-4" /></a></Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                {/* Emergency Access */}
                                <Card className="border-2 border-red-400 shadow-md lg:col-span-1 bg-red-50/50">
                                    <CardHeader className="bg-red-100/70 border-b border-red-300"><CardTitle className="flex items-center text-red-700 text-lg font-semibold"><AlertTriangle className="mr-2 h-5 w-5" />Emergency Info</CardTitle></CardHeader>
                                    <CardContent className="pt-5 px-5 space-y-4">
                                        <p className="text-gray-700 text-sm font-medium">Quick access for urgent situations.</p>
                                        <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white shadow-sm"><a href="/emergency" className="flex items-center justify-center"><AlertTriangle className="mr-2 h-4 w-4" />View Emergency Details</a></Button>
                                        <div className="bg-white p-3 rounded-md border border-red-200 shadow-inner">
                                            <p className="text-sm font-semibold text-red-600 mb-1.5">Key Warning Signs:</p>
                                            <ul className="text-xs text-red-800 space-y-1.5">
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 mr-1.5 flex-shrink-0 mt-0.5" />Severe abdominal pain or cramping</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 mr-1.5 flex-shrink-0 mt-0.5" />Heavy vaginal bleeding</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 mr-1.5 flex-shrink-0 mt-0.5" />Significant decrease in fetal movement</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 mr-1.5 flex-shrink-0 mt-0.5" />Sudden severe swelling (face/hands)</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 mr-1.5 flex-shrink-0 mt-0.5" />Severe headache or vision changes</li>
                                                <li className="flex items-start"><AlertTriangle className="h-3.5 w-3.5 text-red-500 mr-1.5 flex-shrink-0 mt-0.5" />Fever over 100.4°F (38°C)</li>
                                            </ul>
                                            <p className="text-xs text-red-900 mt-2.5 font-semibold">If experiencing emergencies, call 102 or your provider immediately.</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Quick Actions (Unchanged) */}
                            <Card className="border border-gray-200 shadow-sm bg-white">
                                <CardHeader><CardTitle className="text-xl font-semibold text-momcare-dark">Quick Actions</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                        <Button asChild variant="outline" className="h-24 flex flex-col justify-center items-center text-center p-2 border-gray-300 hover:bg-momcare-light/50 hover:border-momcare-primary/50 group transition-all duration-150 ease-in-out hover:scale-105"><a href="/chat"><MessageSquare className="h-6 w-6 mb-1.5 text-momcare-primary transition-transform group-hover:scale-110" /><span className="text-sm font-medium text-gray-700">Chat with AI</span></a></Button>
                                        <Button asChild variant="outline" className="h-24 flex flex-col justify-center items-center text-center p-2 border-gray-300 hover:bg-momcare-light/50 hover:border-momcare-primary/50 group transition-all duration-150 ease-in-out hover:scale-105"><a href="/appointment"><Calendar className="h-6 w-6 mb-1.5 text-momcare-primary transition-transform group-hover:scale-110" /><span className="text-sm font-medium text-gray-700">Appointments</span></a></Button>
                                        <Button asChild variant="outline" className="h-24 flex flex-col justify-center items-center text-center p-2 border-gray-300 hover:bg-momcare-light/50 hover:border-momcare-primary/50 group transition-all duration-150 ease-in-out hover:scale-105"><a href="/medicaldocs"><FilePlus className="h-6 w-6 mb-1.5 text-momcare-primary transition-transform group-hover:scale-110" /><span className="text-sm font-medium text-gray-700">Medical Docs</span></a></Button>
                                        <Button asChild variant="outline" className="h-24 flex flex-col justify-center items-center text-center p-2 border-gray-300 hover:bg-momcare-light/50 hover:border-momcare-primary/50 group transition-all duration-150 ease-in-out hover:scale-105"><a href="/profile"><User className="h-6 w-6 mb-1.5 text-momcare-primary transition-transform group-hover:scale-110" /><span className="text-sm font-medium text-gray-700">My Profile</span></a></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )} {/* End: !isLoading content */}
                </div> {/* End: max-w-7xl */}
            </div> {/* End: background gradient */}

            {/* --- Modals & Dialogs (Unchanged) --- */}
            {/* Appointment Edit Modal */}
            {editingAppointment && (
                <EditAppointmentModal
                    appointment={editingAppointment}
                    isOpen={isEditModalOpen}
                    onClose={() => { setIsEditModalOpen(false); setEditingAppointment(null); }}
                    onAppointmentUpdated={async () => {
                        setIsEditModalOpen(false); setEditingAppointment(null);
                        await fetchData(); // Refresh list
                    }}
                />
            )}
            {/* Appointment Delete Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Appointment Deletion</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAppointmentToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteAppointment} className="bg-red-600 hover:bg-red-700" disabled={!!deletingAppointmentId} >
                            {deletingAppointmentId === appointmentToDelete ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Appointment"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Medication Reminder Add Modal */}
            <AddMedReminderModal
                isOpen={isMedModalOpen}
                onClose={() => setIsMedModalOpen(false)}
                onSubmit={handleSaveReminder}
            />

            {/* Medication Reminder Delete Dialog */}
            <AlertDialog open={isDeleteMedReminderDialogOpen} onOpenChange={setIsDeleteMedReminderDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Reminder Deletion</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setMedReminderToDelete(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteReminder} className="bg-red-600 hover:bg-red-700" disabled={!!deletingMedReminderId} >
                            {deletingMedReminderId === medReminderToDelete ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Reminder"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </MainLayout>
    );
};

export default DashboardPage;