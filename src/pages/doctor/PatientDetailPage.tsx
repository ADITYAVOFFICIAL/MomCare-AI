// src/pages/doctor/PatientDetailPage.tsx
import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import MainLayout from '@/components/layout/MainLayout';
import {
    getUserProfile,
    getUserAppointments,
    getUserMedicalDocuments,
    // Import Health Reading Functions
    getBloodPressureReadings,
    getBloodSugarReadings,
    getWeightReadings,
    getFilePreview,
    medicalBucketId,
    UserProfile, // Ensure this includes pregnancy fields: weeksPregnant, previousPregnancies, deliveryPreference, etc.
    Appointment,
    MedicalDocument,
    // Import Health Reading Types
    BloodPressureReading,
    BloodSugarReading,
    WeightReading,
} from '@/lib/appwrite';
import {
    Loader2, AlertTriangle, ArrowLeft, User, Mail, CalendarDays, HeartPulse,
    FileText, Download, Info, Activity, Weight as WeightIcon, Droplets, BriefcaseMedical, // Renamed Weight to WeightIcon to avoid conflict
    Baby // Keep Baby icon for pregnancy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

// Required label for doctor access
const REQUIRED_LABEL = 'doctor';

// --- Helper Components ---

// Reusable component to display a detail item (label and value)
const DetailItem: React.FC<{ label: string; value?: string | number | null | string[]; icon?: React.ElementType }> = ({ label, value, icon: Icon }) => {
    let displayValue: React.ReactNode = <span className="text-gray-400 italic">N/A</span>;

    if (Array.isArray(value)) {
        // Handle array values (e.g., dietary prefs)
        if (value.length > 0) {
            displayValue = (
                <div className="flex flex-wrap gap-1"> {/* Wrap badges */}
                    {value.map((item, index) => (
                        <Badge key={index} variant="secondary" className="text-xs font-normal">{item}</Badge>
                    ))}
                </div>
            );
        }
    } else if (value !== null && value !== undefined && String(value).trim() !== '') {
        // Handle single string or number values
        displayValue = String(value);
    }

    return (
        <div className="grid grid-cols-3 gap-2 items-start py-2 first:pt-0 last:pb-0"> {/* Use items-start for multi-line values */}
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 col-span-1">
                {Icon && <Icon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />}
                {label}
            </dt>
            <dd className="text-sm text-gray-900 dark:text-gray-100 col-span-2 break-words">
                {displayValue}
            </dd>
        </div>
    );
};


// Skeleton loader for sections
const SectionLoadingSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount = 4 }) => (
    <div className="space-y-4 p-4">
        {[...Array(itemCount)].map((_, i) => (
             <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded" />
             </div>
        ))}
    </div>
);

// Skeleton specifically for the health reading lists
const ReadingListSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => (
    <div className="space-y-2">
        {[...Array(count)].map((_, i) => (
            <div key={i} className="flex justify-between items-center">
                 <Skeleton className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                 <Skeleton className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        ))}
    </div>
);


// Helper to format date string (YYYY-MM-DD or ISO) to "MMM d, yyyy"
const formatDateDisplay = (dateStr?: string): string | null => {
    if (!dateStr) return null;
    try {
        // Handle both YYYY-MM-DD and full ISO strings
        const date = parseISO(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
        if (isNaN(date.getTime())) return dateStr; // Return original if invalid
        return format(date, 'MMM d, yyyy'); // e.g., "Aug 27, 2024"
    } catch {
        return dateStr; // Fallback
    }
};

// Helper to format reading date/time
const formatReadingDateTime = (dateStr: string): string => {
    try {
        return format(parseISO(dateStr), 'MMM d, HH:mm'); // e.g., Aug 27, 14:30
    } catch {
        return "Invalid Date";
    }
};


// --- Main Page Component ---

const PatientDetailPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>(); // Get patient userId from URL params
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user: doctorUser, isAuthenticated, isLoading: isAuthLoading } = useAuthStore(); // Get the logged-in doctor's info

    // --- Authorization Check ---
    useEffect(() => {
        // Wait for auth loading to complete
        if (isAuthLoading) return;

        // Redirect if not authenticated (though PrivateRoute might handle this)
        if (!isAuthenticated) {
            navigate('/login', { replace: true });
            return;
        }

        // Check for doctor label once authenticated user data is available
        if (doctorUser && !doctorUser.labels?.includes(REQUIRED_LABEL)) {
            toast({ title: "Unauthorized", description: "You don't have permission to view patient details.", variant: "destructive" });
            navigate('/doctor', { replace: true }); // Redirect to doctor dashboard (or another appropriate page)
        }
    }, [doctorUser, isAuthenticated, isAuthLoading, navigate, toast]);

    // --- Fetch Patient Profile ---
    const {
        data: patientProfile,
        isLoading: isLoadingProfile,
        isError: isErrorProfile,
        error: profileError,
        isFetching: isFetchingProfile,
    } = useQuery<UserProfile | null, Error>({
        queryKey: ['patientProfile', userId],
        queryFn: () => userId ? getUserProfile(userId) : Promise.resolve(null),
        enabled: !!userId && isAuthenticated && !!doctorUser?.labels?.includes(REQUIRED_LABEL), // Only run if userId exists, doctor is authenticated and authorized
        staleTime: 5 * 60 * 1000, // Cache data for 5 minutes
        refetchOnWindowFocus: false, // Optional: prevent refetch on window focus
    });

    // --- Fetch Patient Appointments ---
    const {
        data: appointments,
        isLoading: isLoadingAppointments,
        isError: isErrorAppointments,
        error: appointmentsError,
        isFetching: isFetchingAppointments,
    } = useQuery<Appointment[], Error>({
        queryKey: ['patientAppointments', userId],
        queryFn: () => userId ? getUserAppointments(userId) : Promise.resolve([]),
        enabled: !!userId && isAuthenticated && !!doctorUser?.labels?.includes(REQUIRED_LABEL),
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // --- Fetch Patient Medical Documents ---
    const {
        data: documents,
        isLoading: isLoadingDocuments,
        isError: isErrorDocuments,
        error: documentsError,
        isFetching: isFetchingDocuments,
    } = useQuery<MedicalDocument[], Error>({
        queryKey: ['patientMedicalDocuments', userId],
        queryFn: () => userId ? getUserMedicalDocuments(userId) : Promise.resolve([]),
        enabled: !!userId && isAuthenticated && !!doctorUser?.labels?.includes(REQUIRED_LABEL),
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // --- Fetch Health Readings ---
    const commonQueryOptions = {
        enabled: !!userId && isAuthenticated && !!doctorUser?.labels?.includes(REQUIRED_LABEL),
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
    };

    const { data: bpReadings, isLoading: isLoadingBp, isError: isErrorBp, error: bpError } = useQuery<BloodPressureReading[], Error>({
        queryKey: ['patientBpReadings', userId],
        queryFn: () => userId ? getBloodPressureReadings(userId, 10) : Promise.resolve([]), // Fetch last 10
        ...commonQueryOptions,
    });

    const { data: sugarReadings, isLoading: isLoadingSugar, isError: isErrorSugar, error: sugarError } = useQuery<BloodSugarReading[], Error>({
        queryKey: ['patientSugarReadings', userId],
        queryFn: () => userId ? getBloodSugarReadings(userId, 10) : Promise.resolve([]), // Fetch last 10
        ...commonQueryOptions,
    });

    const { data: weightReadings, isLoading: isLoadingWeight, isError: isErrorWeight, error: weightError } = useQuery<WeightReading[], Error>({
        queryKey: ['patientWeightReadings', userId],
        queryFn: () => userId ? getWeightReadings(userId, 10) : Promise.resolve([]), // Fetch last 10
        ...commonQueryOptions,
    });


    // --- Derived State ---
    const showInitialLoading = isLoadingProfile && !patientProfile && !isErrorProfile;

    // --- Handlers ---
    const handleViewDocument = (fileId: string, fileName: string) => {
        if (!medicalBucketId) {
            toast({ title: "Configuration Error", description: "Medical document storage is not configured.", variant: "destructive" });
            return;
        }
        try {
            const fileUrl = getFilePreview(fileId, medicalBucketId);
            if (fileUrl) {
                window.open(fileUrl.href, '_blank', 'noopener,noreferrer');
            } else {
                toast({ title: "Error", description: "Could not generate document link.", variant: "destructive" });
            }
        } catch (error: unknown) {
            console.error("Error generating file preview:", error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast({ title: "Error", description: `Failed to get document link: ${errorMessage}`, variant: "destructive" });
        }
    };

    // --- Render Logic ---

    // Handle invalid or missing userId early
    if (!userId) {
        return (
            <MainLayout>
                <div className="text-center py-10">
                    <Alert variant="destructive" className="max-w-md mx-auto">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Invalid Patient ID provided in the URL.</AlertDescription>
                    </Alert>
                    <Button variant="outline" asChild className="mt-4">
                        <Link to="/doctor"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Doctor Dashboard</Link>
                    </Button>
                </div>
            </MainLayout>
        );
    }

    // Display initial loading state
    if (showInitialLoading) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                    <Loader2 className="h-16 w-16 animate-spin text-momcare-primary dark:text-momcare-accent" />
                    <span className="ml-4 text-lg dark:text-gray-300">Loading patient details...</span>
                </div>
            </MainLayout>
        );
    }

    // Display error if profile fetching failed after the initial load attempt
    if (isErrorProfile && !isLoadingProfile && !patientProfile) {
        return (
            <MainLayout>
                <div className="max-w-2xl mx-auto mt-10 p-6 border border-destructive rounded bg-red-50 dark:bg-red-900/20 text-center">
                    <AlertTriangle className="h-8 w-8 text-destructive dark:text-red-400 mx-auto mb-2" />
                    <h2 className="text-xl font-semibold text-destructive dark:text-red-400 mb-2">Error Loading Patient Profile</h2>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">{profileError?.message || 'An unknown error occurred while fetching the patient profile.'}</p>
                    <Button variant="outline" asChild><Link to="/doctor"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Doctor Dashboard</Link></Button>
                </div>
            </MainLayout>
        );
    }

    // Display message if profile loaded but was not found
    if (!isLoadingProfile && !patientProfile) {
        return (
            <MainLayout>
                <div className="max-w-2xl mx-auto mt-10 p-6 border border-yellow-500 rounded bg-yellow-50 dark:bg-yellow-900/20 text-center">
                    <User className="h-8 w-8 text-yellow-600 dark:text-yellow-400 mx-auto mb-2" />
                    <h2 className="text-xl font-semibold text-yellow-700 dark:text-yellow-300 mb-2">Patient Not Found</h2>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">No profile found for the specified patient ID ({userId}).</p>
                    <Button variant="outline" asChild><Link to="/doctor"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Doctor Dashboard</Link></Button>
                </div>
            </MainLayout>
        );
    }

    // --- Render Patient Details Page (Profile must exist here) ---
    const profile = patientProfile as UserProfile; // Type assertion for convenience

    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                {/* Back Button */}
                <Button variant="outline" size="sm" asChild className="mb-6 print:hidden">
                    <Link to="/doctor"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                </Button>

                {/* Patient Header Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 pb-6 border-b dark:border-gray-700">
                    {/* Profile Picture or Placeholder */}
                    {profile.profilePhotoUrl ? (
                        <img src={profile.profilePhotoUrl} alt={profile.name || 'Patient'} className="h-20 w-20 rounded-full object-cover border-2 border-momcare-primary dark:border-momcare-accent flex-shrink-0" />
                    ) : (
                        <div className="h-20 w-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0">
                             <User className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                        </div>
                    )}
                    {/* Name, Email, Badges */}
                    <div className="flex-grow">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{profile.name || 'Unnamed Patient'}</h1>
                        <p className="text-md text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                            <Mail className="h-4 w-4 text-gray-400"/> {profile.email || <span className="italic text-gray-500">No email</span>}
                        </p>
                        <div className="flex flex-wrap gap-x-2 gap-y-1 mt-2">
                            {profile.age && <Badge variant="secondary" className="text-xs">Age: {profile.age}</Badge>}
                            {/* Show pregnancy badge if weeks are defined */}
                            {profile.weeksPregnant !== undefined && (
                                <Badge variant="secondary" className="text-xs bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300 border border-pink-300 hover:bg-pink-200 dark:hover:bg-pink-800/70 transition-colors">
                                Pregnancy: Week {profile.weeksPregnant}
                            </Badge>
                            )}
                            <Badge variant="outline" className="text-xs font-mono">ID: {userId.substring(0, 8)}...</Badge>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">

                    {/* --- Left Column: Profile & Pregnancy Details --- */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Profile Information Card */}
                        <Card className="shadow border dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2"><User className="h-5 w-5 text-momcare-primary dark:text-momcare-accent"/>Profile Information</CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y dark:divide-gray-700 px-0">
                                <div className="px-6 pt-2 pb-1"> {/* Add padding back inside */}
                                    <DetailItem label="Name" value={profile.name} />
                                    <DetailItem label="Email" value={profile.email} icon={Mail} />
                                    <DetailItem label="Phone" value={profile.phoneNumber} />
                                    <DetailItem label="Age" value={profile.age} />
                                    <DetailItem label="Gender" value={profile.gender} />
                                    <DetailItem label="Address" value={profile.address} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* --- *** Pregnancy Details Card (Always Rendered) *** --- */}
                        <Card className="shadow border border-pink-200 dark:border-pink-700/50">
                            <CardHeader className="bg-pink-50 dark:bg-pink-900/20">
                                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-pink-700 dark:text-pink-300"><Baby className="h-5 w-5"/>Pregnancy Details</CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y dark:divide-gray-700 px-0">
                                <div className="px-6 pt-2 pb-1">
                                    <DetailItem label="Weeks Pregnant" value={profile.weeksPregnant} icon={CalendarDays} />
                                    <DetailItem label="Previous Pregnancies" value={profile.previousPregnancies} />
                                    <DetailItem label="Delivery Preference" value={profile.deliveryPreference} />
                                    <DetailItem label="Pre-existing Conditions" value={profile.preExistingConditions} icon={HeartPulse}/>
                                    <DetailItem label="Activity Level" value={profile.activityLevel} icon={Activity}/>
                                    <DetailItem label="Dietary Preferences" value={profile.dietaryPreferences} />
                                    <DetailItem label="Partner Support" value={profile.partnerSupport} />
                                    <DetailItem label="Work Situation" value={profile.workSituation} />
                                </div>
                            </CardContent>
                        </Card>
                        {/* --- *** End Pregnancy Details Card *** --- */}

                    </div>
                    {/* --- End Left Column --- */}


                    {/* --- Right Column: Appointments, Documents, Health Readings --- */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Appointments Section */}
                        <Card className="shadow border dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-momcare-secondary dark:text-blue-400"/>Appointments</CardTitle>
                                {isFetchingAppointments && <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-2" />}
                            </CardHeader>
                            <CardContent>
                                {isLoadingAppointments ? <SectionLoadingSkeleton itemCount={3}/> :
                                 isErrorAppointments ? <Alert variant="destructive" className="text-xs"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>Could not load appointments. {appointmentsError?.message}</AlertDescription></Alert> :
                                 !appointments || appointments.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No appointments found for this patient.</p> :
                                 <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 -mr-2"> {/* Add scroll */}
                                     {/* Sort appointments, newest first based on date */}
                                     {[...appointments]
                                        .sort((a,b) => {
                                            try { return parseISO(b.date).getTime() - parseISO(a.date).getTime(); }
                                            catch { return 0; } // Handle potential invalid dates
                                        })
                                        .map(app => (
                                         <li key={app.$id} className="p-3 border dark:border-gray-600/50 rounded-md bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                             <div className="flex justify-between items-center mb-1">
                                                 <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{format(parseISO(app.date), 'eee, MMM d, yyyy - h:mm a')}</span>
                                                 <Badge variant={app.isCompleted ? "secondary" : "outline"} className={`text-xs whitespace-nowrap ${app.isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300' : 'border-blue-300 dark:border-blue-600 text-blue-800 dark:text-blue-300'}`}>
                                                    {app.isCompleted ? "Completed" : "Upcoming"}
                                                 </Badge>
                                             </div>
                                             <p className="text-xs text-gray-600 dark:text-gray-400 capitalize">Type: {app.appointmentType?.replace(/_/g, ' ') || 'General'}</p>
                                             {app.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic line-clamp-2">Notes: {app.notes}</p>}
                                         </li>
                                     ))}
                                 </ul>
                                }
                            </CardContent>
                        </Card>

                        {/* Medical Documents Section */}
                        <Card className="shadow border dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2"><BriefcaseMedical className="h-5 w-5 text-momcare-accent dark:text-pink-400"/>Medical Documents</CardTitle>
                                {isFetchingDocuments && <Loader2 className="h-4 w-4 animate-spin text-gray-400 ml-2" />}
                            </CardHeader>
                            <CardContent>
                                {isLoadingDocuments ? <SectionLoadingSkeleton itemCount={2}/> :
                                 isErrorDocuments ? <Alert variant="destructive" className="text-xs"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>Could not load documents. {documentsError?.message}</AlertDescription></Alert> :
                                 !documents || documents.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No documents found for this patient.</p> :
                                 <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 -mr-2">
                                     {/* Sort documents, newest first based on creation date */}
                                     {[...documents]
                                        .sort((a,b) => parseISO(b.$createdAt).getTime() - parseISO(a.$createdAt).getTime())
                                        .map(doc => (
                                         <li key={doc.$id} className="flex items-center justify-between space-x-3 p-3 border dark:border-gray-600/50 rounded-md bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                             <div className="overflow-hidden flex-grow mr-2">
                                                 <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate" title={doc.fileName}>{doc.fileName}</p>
                                                 <p className="text-xs text-gray-500 dark:text-gray-400">
                                                     Uploaded: {formatDistanceToNow(parseISO(doc.$createdAt), { addSuffix: true })}
                                                 </p>
                                                 {doc.documentType && <Badge variant="outline" className="mt-1 text-xs">{doc.documentType.split('/')[1]?.toUpperCase() || doc.documentType}</Badge>}
                                             </div>
                                             <Button variant="outline" size="sm" onClick={() => handleViewDocument(doc.fileId, doc.fileName)} className="flex-shrink-0">
                                                 <Download className="h-4 w-4 mr-1"/> View
                                             </Button>
                                         </li>
                                     ))}
                                 </ul>
                                }
                            </CardContent>
                        </Card>

                         {/* Health Readings Section */}
                         <Card className="shadow border dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2"><Activity className="h-5 w-5 text-green-600 dark:text-green-400"/>Health Readings</CardTitle>
                                <CardDescription>Most recent readings recorded by the patient.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Blood Pressure Readings */}
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                        <HeartPulse className="h-4 w-4"/> Blood Pressure (mmHg)
                                    </h4>
                                    {isLoadingBp ? <ReadingListSkeleton /> :
                                     isErrorBp ? <Alert variant="destructive" className="text-xs"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>Could not load BP readings. {bpError?.message}</AlertDescription></Alert> :
                                     !bpReadings || bpReadings.length === 0 ? <p className="text-xs text-gray-500 dark:text-gray-400 italic">No BP readings recorded.</p> :
                                     <ul className="space-y-1.5 text-xs">
                                         {bpReadings.slice(0, 5).map(r => ( // Show latest 5
                                             <li key={r.$id} className="flex justify-between items-center border-b border-dashed dark:border-gray-700 pb-1 last:border-b-0 last:pb-0">
                                                 <span className="text-gray-600 dark:text-gray-400">{formatReadingDateTime(r.recordedAt)}:</span>
                                                 <span className="font-medium text-gray-800 dark:text-gray-200">{r.systolic} / {r.diastolic}</span>
                                             </li>
                                         ))}
                                     </ul>
                                    }
                                </div>

                                {/* Blood Sugar Readings */}
                                <div>
                                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                        <Droplets className="h-4 w-4"/> Blood Sugar (mg/dL)
                                    </h4>
                                     {isLoadingSugar ? <ReadingListSkeleton /> :
                                     isErrorSugar ? <Alert variant="destructive" className="text-xs"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>Could not load Sugar readings. {sugarError?.message}</AlertDescription></Alert> :
                                     !sugarReadings || sugarReadings.length === 0 ? <p className="text-xs text-gray-500 dark:text-gray-400 italic">No sugar readings recorded.</p> :
                                     <ul className="space-y-1.5 text-xs">
                                         {sugarReadings.slice(0, 5).map(r => ( // Show latest 5
                                             <li key={r.$id} className="flex justify-between items-center border-b border-dashed dark:border-gray-700 pb-1 last:border-b-0 last:pb-0">
                                                 <span className="text-gray-600 dark:text-gray-400">{formatReadingDateTime(r.recordedAt)} ({r.measurementType}):</span>
                                                 <span className="font-medium text-gray-800 dark:text-gray-200">{r.level}</span>
                                             </li>
                                         ))}
                                     </ul>
                                    }
                                </div>

                                {/* Weight Readings */}
                                <div>
                                     <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                        <WeightIcon className="h-4 w-4"/> Weight
                                    </h4>
                                    {isLoadingWeight ? <ReadingListSkeleton /> :
                                     isErrorWeight ? <Alert variant="destructive" className="text-xs"><AlertTriangle className="h-4 w-4"/><AlertTitle>Error</AlertTitle><AlertDescription>Could not load Weight readings. {weightError?.message}</AlertDescription></Alert> :
                                     !weightReadings || weightReadings.length === 0 ? <p className="text-xs text-gray-500 dark:text-gray-400 italic">No weight readings recorded.</p> :
                                     <ul className="space-y-1.5 text-xs">
                                         {weightReadings.slice(0, 5).map(r => ( // Show latest 5
                                             <li key={r.$id} className="flex justify-between items-center border-b border-dashed dark:border-gray-700 pb-1 last:border-b-0 last:pb-0">
                                                 <span className="text-gray-600 dark:text-gray-400">{formatReadingDateTime(r.recordedAt)}:</span>
                                                 <span className="font-medium text-gray-800 dark:text-gray-200">{r.weight} {r.unit}</span>
                                             </li>
                                         ))}
                                     </ul>
                                    }
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                    {/* --- End Right Column --- */}
                </div>
                {/* --- End Main Content Grid --- */}
            </div>
        </MainLayout>
    );
};

export default PatientDetailPage;