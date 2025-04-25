// src/components/doctor/DoctorAppointmentsCard.tsx
import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, isPast } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { CalendarCheck, Loader2, AlertTriangle, RefreshCw, UserCircle, Clock, Info } from 'lucide-react';
import {
    getAllUpcomingAppointments,
    getUserProfilesByIds,
    Appointment,
    UserProfile,
} from '@/lib/appwrite';

const DoctorAppointmentsCard: React.FC = () => {

    // 1. Fetch all upcoming appointments
    const {
        data: appointmentsData,
        isLoading: isLoadingAppointments,
        isError: isErrorAppointments,
        error: appointmentsError,
        refetch: refetchAppointments,
    } = useQuery<Appointment[], Error>({
        queryKey: ['allUpcomingAppointments'],
        queryFn: () => getAllUpcomingAppointments(50), // Fetch up to 50 appointments
    });

    // 2. Extract unique user IDs from fetched appointments
    const patientUserIds = useMemo(() => {
        if (!appointmentsData) return [];
        const ids = appointmentsData.map(app => app.userId);
        return [...new Set(ids)]; // Deduplicate
    }, [appointmentsData]);

    // 3. Fetch profiles for the users who have appointments
    const {
        data: patientProfilesMap,
        isLoading: isLoadingProfiles,
        isError: isErrorProfiles,
        error: profilesError,
    } = useQuery<Map<string, UserProfile>, Error>({
        queryKey: ['patientProfilesForAppointments', patientUserIds],
        queryFn: () => getUserProfilesByIds(patientUserIds),
        enabled: !!patientUserIds && patientUserIds.length > 0, // Only run if there are user IDs
    });

    // Combine loading states
    const isLoading = isLoadingAppointments || (patientUserIds.length > 0 && isLoadingProfiles);
    // Combine error states/messages
    const isError = isErrorAppointments || (patientUserIds.length > 0 && isErrorProfiles);
    const errorMessage = appointmentsError?.message || profilesError?.message || "An error occurred.";

    const handleRefresh = () => {
        refetchAppointments();
        // Profiles will refetch automatically if user IDs change or query becomes enabled
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-start space-x-3 p-3 border dark:border-gray-700 rounded-md">
                            <Skeleton className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 mt-1" />
                            <div className="space-y-1.5 flex-grow">
                                <Skeleton className="h-4 w-3/5 bg-gray-200 dark:bg-gray-700" />
                                <Skeleton className="h-3 w-4/5 bg-gray-200 dark:bg-gray-700" />
                                <Skeleton className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700" />
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (isError) {
            return (
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error Loading Appointments</AlertTitle>
                    <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
            );
        }

        if (!appointmentsData || appointmentsData.length === 0) {
            return <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-6">No upcoming appointments found.</p>;
        }

        // Sort appointments just in case API didn't sort perfectly
        const sortedAppointments = [...appointmentsData].sort((a, b) =>
            parseISO(a.date).getTime() - parseISO(b.date).getTime()
        );

        return (
            <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {sortedAppointments.map((appointment) => {
                    const patientProfile = patientProfilesMap?.get(appointment.userId);
                    const appointmentDate = parseISO(appointment.date);
                    const isAppointmentPast = isPast(appointmentDate);

                    return (
                        <li key={appointment.$id} className={`flex items-start space-x-3 p-3 border dark:border-gray-700 rounded-md bg-white dark:bg-gray-800/50 ${isAppointmentPast ? 'opacity-60' : ''}`}>
                            {patientProfile?.profilePhotoUrl ? (
                                <img src={patientProfile.profilePhotoUrl} alt={patientProfile.name || 'Patient'} className="h-10 w-10 rounded-full object-cover flex-shrink-0 mt-1" />
                             ) : (
                                <UserCircle className="h-10 w-10 text-gray-400 dark:text-gray-500 flex-shrink-0 mt-1" />
                             )}
                            <div className="flex-grow overflow-hidden">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {patientProfile?.name || `User ID: ${appointment.userId.substring(0, 6)}...`}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <CalendarCheck className="h-3 w-3 flex-shrink-0" />
                                    {format(appointmentDate, 'eee, MMM d, yyyy')}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                                    <Clock className="h-3 w-3 flex-shrink-0" />
                                    {format(appointmentDate, 'h:mm a')} {/* Display time */}
                                    {isAppointmentPast && <Badge variant="outline" className="ml-2 text-xs px-1 py-0">Past</Badge>}
                                </p>
                                {appointment.appointmentType && (
                                    <Badge variant="secondary" className="mt-1 text-xs px-1.5 py-0.5">
                                        {appointment.appointmentType}
                                    </Badge>
                                )}
                                {/* Link to patient detail */}
                                <Button variant="link" size="sm" asChild className="p-0 h-auto text-xs mt-1 text-momcare-primary dark:text-momcare-accent">
                                     <Link to={`/doctor/patient/${appointment.userId}`}>View Patient</Link>
                                </Button>
                            </div>
                        </li>
                    );
                })}
            </ul>
        );
    };

    return (
        <Card className="shadow-md border dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                    <CardTitle className="flex items-center gap-2 text-xl font-semibold text-gray-800 dark:text-gray-200">
                        <CalendarCheck className="h-5 w-5 text-momcare-secondary" />
                        Upcoming Appointments
                    </CardTitle>
                    <CardDescription>Overview of scheduled patient visits.</CardDescription>
                </div>
                 <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={isLoading} aria-label="Refresh appointments">
                     <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                 </Button>
            </CardHeader>
            <CardContent>
                 <Alert variant="default" className="mb-4 text-xs bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700/50 dark:text-blue-300">
                    <Info className="h-4 w-4" />
                    <AlertTitle>Note</AlertTitle>
                    <AlertDescription>
                        Showing all upcoming appointments system-wide. Future versions may filter by assigned doctor.
                    </AlertDescription>
                </Alert>
                {renderContent()}
            </CardContent>
        </Card>
    );
};

export default DoctorAppointmentsCard;