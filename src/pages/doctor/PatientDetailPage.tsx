// src/pages/doctor/PatientDetailPage.tsx
import React, { useEffect } from 'react'; // *** Added useEffect import ***
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, formatDistanceToNow } from 'date-fns'; // Added formatDistanceToNow
import MainLayout from '@/components/layout/MainLayout';
import {
    getUserProfile,
    getUserAppointments,
    getUserMedicalDocuments,
    getFilePreview,
    medicalBucketId,
    UserProfile,
    Appointment,
    MedicalDocument
} from '@/lib/appwrite';
import { Loader2, AlertTriangle, ArrowLeft, User, Mail, CalendarDays, HeartPulse, FileText, Download, Info, Activity, Weight, Droplets, BriefcaseMedical } from 'lucide-react'; // Added BriefcaseMedical
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; // <-- Import Alert components
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

const REQUIRED_LABEL = 'doctor';

// --- Helper Components ---

const DetailItem: React.FC<{ label: string; value?: string | number | null | string[]; icon?: React.ElementType }> = ({ label, value, icon: Icon }) => (
    <div className="grid grid-cols-3 gap-2 items-center py-1.5">
        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 col-span-1">
            {Icon && <Icon className="h-4 w-4 text-gray-400 flex-shrink-0" />}
            {label}
        </dt>
        <dd className="text-sm text-gray-900 dark:text-gray-100 col-span-2 break-words">
            {Array.isArray(value)
                ? value.join(', ') || <span className="text-gray-400 italic">N/A</span>
                : value ?? <span className="text-gray-400 italic">N/A</span>}
        </dd>
    </div>
);


const SectionLoadingSkeleton: React.FC<{ itemCount?: number }> = ({ itemCount = 3 }) => (
    <div className="space-y-4 p-4 border dark:border-gray-700 rounded-md">
        {[...Array(itemCount)].map((_, i) => (
             <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700" />
                <Skeleton className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700" />
             </div>
        ))}
    </div>
);

// --- Main Page Component ---

const PatientDetailPage: React.FC = () => {
    const { userId } = useParams<{ userId: string }>();
    const { toast } = useToast();
    const navigate = useNavigate();
    const { user: doctorUser, isAuthenticated } = useAuthStore(); // Get the logged-in doctor's info

    // Authorization Check
    useEffect(() => {
        // Only run check if authenticated and user data is available
        if (isAuthenticated && doctorUser && !doctorUser.labels?.includes(REQUIRED_LABEL)) {
            toast({ title: "Unauthorized", description: "You don't have permission to view patient details.", variant: "destructive" });
            navigate('/doctor', { replace: true });
        }
        // If not authenticated, the PrivateRoute should handle redirection
    }, [doctorUser, isAuthenticated, navigate, toast]);

    // --- Fetch Patient Profile ---
    const {
        data: patientProfile,
        isLoading: isLoadingProfile,
        isError: isErrorProfile,
        error: profileError
    } = useQuery<UserProfile | null, Error>({ // *** Updated useQuery syntax ***
        queryKey: ['patientProfile', userId],
        queryFn: () => userId ? getUserProfile(userId) : Promise.resolve(null), // Ensure queryFn returns Promise
        enabled: !!userId && isAuthenticated // Only run if userId exists and user is authenticated
    });

    // --- Fetch Patient Appointments ---
    const {
        data: appointments,
        isLoading: isLoadingAppointments,
        isError: isErrorAppointments,
        error: appointmentsError
    } = useQuery<Appointment[], Error>({ // *** Updated useQuery syntax ***
        queryKey: ['patientAppointments', userId],
        queryFn: () => userId ? getUserAppointments(userId) : Promise.resolve([]), // Ensure queryFn returns Promise
        enabled: !!userId && isAuthenticated // Only run if userId exists and user is authenticated
    });

    // --- Fetch Patient Medical Documents ---
    const {
        data: documents,
        isLoading: isLoadingDocuments,
        isError: isErrorDocuments,
        error: documentsError
    } = useQuery<MedicalDocument[], Error>({ // *** Updated useQuery syntax ***
        queryKey: ['patientMedicalDocuments', userId],
        queryFn: () => userId ? getUserMedicalDocuments(userId) : Promise.resolve([]), // Ensure queryFn returns Promise
        enabled: !!userId && isAuthenticated // Only run if userId exists and user is authenticated
    });

    // --- Derived State ---
    // Show main loading indicator only while profile is loading initially
    const showInitialLoading = isLoadingProfile && !patientProfile;
    // const overallError = profileError || appointmentsError || documentsError; // Combine errors - Not strictly needed for rendering logic below

    // --- Handlers ---
    const handleViewDocument = (fileId: string, fileName: string) => {
        if (!medicalBucketId) {
            toast({ title: "Config Error", description: "Medical document storage not configured.", variant: "destructive" });
            return;
        }
        try {
            const fileUrl = getFilePreview(fileId, medicalBucketId);
            if (fileUrl) {
                window.open(fileUrl.href, '_blank', 'noopener,noreferrer');
            } else {
                toast({ title: "Error", description: "Could not generate link.", variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Error", description: `Failed to get document link: ${error.message}`, variant: "destructive" });
        }
    };

    // --- Render Logic ---

    if (!userId) {
        // This case should ideally be handled by the router or a check before navigating
        return (
            <MainLayout>
                <div className="text-center py-10">Invalid Patient ID provided.</div>
                <Button variant="outline" asChild><Link to="/doctor"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Doctor Dashboard</Link></Button>
            </MainLayout>
        );
    }

    if (showInitialLoading) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
                    <Loader2 className="h-16 w-16 animate-spin text-momcare-primary" />
                    <span className="ml-4 text-lg dark:text-gray-300">Loading patient details...</span>
                </div>
            </MainLayout>
        );
    }

    // Handle error after initial load attempt
    if (isErrorProfile && !isLoadingProfile) { // Check specifically for profile error after loading attempt
        return (
            <MainLayout>
                <div className="max-w-2xl mx-auto mt-10 p-6 border border-destructive rounded bg-red-50 dark:bg-red-900/20 text-center">
                    <AlertTriangle className="h-8 w-8 text-destructive dark:text-red-400 mx-auto mb-2" />
                    <h2 className="text-xl font-semibold text-destructive dark:text-red-400 mb-2">Error Loading Patient Profile</h2>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">{profileError?.message || 'Could not fetch patient profile.'}</p>
                    <Button variant="outline" asChild><Link to="/doctor"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Doctor Dashboard</Link></Button>
                </div>
            </MainLayout>
        );
    }

    // Handle case where profile loaded successfully but was null (not found)
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
    // Now we can safely assume patientProfile is UserProfile
    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
                <Button variant="outline" size="sm" asChild className="mb-6 print:hidden">
                    <Link to="/doctor"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard</Link>
                </Button>

                {/* Patient Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8 pb-6 border-b dark:border-gray-700">
                    {patientProfile.profilePhotoUrl ? (
                        <img src={patientProfile.profilePhotoUrl} alt={patientProfile.name || 'Patient'} className="h-20 w-20 rounded-full object-cover border-2 border-momcare-primary flex-shrink-0" />
                    ) : (
                        <User className="h-20 w-20 text-gray-400 dark:text-gray-500 p-3 bg-gray-100 dark:bg-gray-700 rounded-full flex-shrink-0" />
                    )}
                    <div className="flex-grow">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{patientProfile.name || 'Unnamed Patient'}</h1>
                        <p className="text-md text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                            <Mail className="h-4 w-4 text-gray-400"/> {patientProfile.email || 'No email provided'}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {patientProfile.age && <Badge variant="secondary">Age: {patientProfile.age}</Badge>}
                            {patientProfile.weeksPregnant !== null && patientProfile.weeksPregnant !== undefined && <Badge variant="secondary">Weeks: {patientProfile.weeksPregnant}</Badge>}
                            <Badge variant="outline">Patient ID: {userId.substring(0, 8)}...</Badge>
                        </div>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8 items-start">

                    {/* Left Column: Profile Details */}
                    <div className="lg:col-span-1 space-y-6">
                        <Card className="shadow border dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2"><User className="h-5 w-5 text-momcare-primary"/>Profile Information</CardTitle>
                            </CardHeader>
                            <CardContent className="divide-y dark:divide-gray-700 px-0"> {/* Remove padding for full width dividers */}
                                <div className="px-6 pt-2 pb-1"> {/* Add padding back inside */}
                                    <DetailItem label="Name" value={patientProfile.name} />
                                    <DetailItem label="Email" value={patientProfile.email} icon={Mail} />
                                    <DetailItem label="Phone" value={patientProfile.phoneNumber} />
                                    <DetailItem label="Age" value={patientProfile.age} />
                                    <DetailItem label="Gender" value={patientProfile.gender} />
                                    <DetailItem label="Address" value={patientProfile.address} />
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="shadow border dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2"><HeartPulse className="h-5 w-5 text-momcare-primary"/>Pregnancy Details</CardTitle>
                            </CardHeader>
                             <CardContent className="divide-y dark:divide-gray-700 px-0">
                                <div className="px-6 pt-2 pb-1">
                                    <DetailItem label="Weeks Pregnant" value={patientProfile.weeksPregnant} icon={CalendarDays} />
                                    <DetailItem label="Pre-existing Conditions" value={patientProfile.preExistingConditions} />
                                    <DetailItem label="Previous Pregnancies" value={patientProfile.previousPregnancies} />
                                    <DetailItem label="Delivery Preference" value={patientProfile.deliveryPreference} />
                                    <DetailItem label="Activity Level" value={patientProfile.activityLevel} icon={Activity}/>
                                    <DetailItem label="Dietary Preferences" value={patientProfile.dietaryPreferences} />
                                    <DetailItem label="Partner Support" value={patientProfile.partnerSupport} />
                                    <DetailItem label="Work Situation" value={patientProfile.workSituation} />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Appointments & Documents */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Appointments Section */}
                        <Card className="shadow border dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2"><CalendarDays className="h-5 w-5 text-momcare-secondary"/>Appointments</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {isLoadingAppointments ? <SectionLoadingSkeleton /> :
                                 isErrorAppointments ? <p className="text-sm text-red-600 dark:text-red-400">Could not load appointments. {appointmentsError?.message}</p> :
                                 !appointments || appointments.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No appointments found for this patient.</p> :
                                 <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 -mr-2"> {/* Add negative margin to offset scrollbar */}
                                     {/* Sort appointments, newest first */}
                                     {[...appointments].sort((a,b) => parseISO(b.date).getTime() - parseISO(a.date).getTime()).map(app => (
                                         <li key={app.$id} className="p-3 border dark:border-gray-600/50 rounded-md bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                             <div className="flex justify-between items-center mb-1">
                                                 <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{format(parseISO(app.date), 'eee, MMM d, yyyy - h:mm a')}</span>
                                                 <Badge variant={app.isCompleted ? "secondary" : "outline"} className={`text-xs ${app.isCompleted ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-green-300' : 'border-blue-300 dark:border-blue-600'}`}>
                                                    {app.isCompleted ? "Completed" : "Upcoming"}
                                                 </Badge>
                                             </div>
                                             <p className="text-xs text-gray-600 dark:text-gray-400">Type: {app.appointmentType || 'General'}</p>
                                             {app.notes && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">Notes: {app.notes}</p>}
                                         </li>
                                     ))}
                                 </ul>
                                }
                            </CardContent>
                        </Card>

                        {/* Medical Documents Section */}
                        <Card className="shadow border dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2"><BriefcaseMedical className="h-5 w-5 text-momcare-accent"/>Medical Documents</CardTitle> {/* Changed Icon */}
                            </CardHeader>
                            <CardContent>
                                {isLoadingDocuments ? <SectionLoadingSkeleton /> :
                                 isErrorDocuments ? <p className="text-sm text-red-600 dark:text-red-400">Could not load documents. {documentsError?.message}</p> :
                                 !documents || documents.length === 0 ? <p className="text-sm text-gray-500 dark:text-gray-400">No documents found for this patient.</p> :
                                 <ul className="space-y-3 max-h-80 overflow-y-auto pr-2 -mr-2">
                                     {/* Sort documents, newest first */}
                                     {[...documents].sort((a,b) => parseISO(b.$createdAt).getTime() - parseISO(a.$createdAt).getTime()).map(doc => (
                                         <li key={doc.$id} className="flex items-center justify-between space-x-3 p-3 border dark:border-gray-600/50 rounded-md bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                             <div className="overflow-hidden">
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

                         {/* Placeholder for other health data */}
                         <Card className="shadow border dark:border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-lg font-semibold flex items-center gap-2"><Activity className="h-5 w-5 text-green-600"/>Health Readings</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* TODO: Fetch and display BP, Sugar, Weight readings using useQuery similar to appointments/docs */}
                                <p className="text-sm text-gray-500 dark:text-gray-400">Health reading data (BP, Sugar, Weight) will be displayed here.</p>
                                <div className="flex gap-4 mt-4">
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300"><HeartPulse className="h-4 w-4 mr-1 text-red-500"/> BP</div>
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300"><Droplets className="h-4 w-4 mr-1 text-blue-500"/> Sugar</div>
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-300"><Weight className="h-4 w-4 mr-1 text-green-500"/> Weight</div>
                                </div>
                                 {/* Add a note that this section is under development */}
                                 <Alert variant="default" className="mt-4 text-xs bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700/50 dark:text-yellow-300">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Coming Soon</AlertTitle>
                                    <AlertDescription>
                                        Detailed health readings will be available in a future update.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

export default PatientDetailPage;