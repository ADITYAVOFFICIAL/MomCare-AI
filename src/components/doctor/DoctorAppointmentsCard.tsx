// src/components/doctor/DoctorAppointmentsCard.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { getAllUpcomingAppointments, getUserProfilesByIds, Appointment, UserProfile } from '@/lib/appwrite';
import { useToast } from '@/hooks/use-toast';
import { Loader2, CalendarDays, User, Inbox, AlertTriangle, Clock } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const DoctorAppointmentsCard: React.FC = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patientProfiles, setPatientProfiles] = useState<Map<string, UserProfile>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchAppointmentsAndProfiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch all upcoming appointments (adjust limit as needed)
            // WARNING: Fetches ALL appointments. Needs filtering by doctorId in production.
            const fetchedAppointments = await getAllUpcomingAppointments(20);
            setAppointments(fetchedAppointments);

            if (fetchedAppointments.length > 0) {
                // Get unique patient IDs from the fetched appointments
                const patientIds = [...new Set(fetchedAppointments.map(app => app.userId))];

                // Fetch corresponding patient profiles
                const profilesMap = await getUserProfilesByIds(patientIds);
                setPatientProfiles(profilesMap);
            } else {
                setPatientProfiles(new Map()); // Clear profiles if no appointments
            }

        } catch (err: any) {
            const errorMessage = err.message || "Failed to load upcoming appointments.";
            setError(errorMessage);
            toast({ title: "Loading Error", description: errorMessage, variant: "destructive" });
            setAppointments([]);
            setPatientProfiles(new Map());
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchAppointmentsAndProfiles();
    }, [fetchAppointmentsAndProfiles]);

    // Helper to format date and time nicely
    const formatApptDateTime = (dateStr: string | undefined, timeStr: string | undefined): string => {
         if (!dateStr || !timeStr) return "Invalid date/time";
        try {
            // Assuming dateStr is YYYY-MM-DD and timeStr is HH:MM AM/PM or HH:MM
            const date = parseISO(dateStr); // This handles YYYY-MM-DD correctly
            // Combine for accurate formatting if needed, otherwise just display as is
             return `${format(date, 'EEE, MMM d, yyyy')} at ${timeStr}`;
        } catch {
            return `${dateStr} at ${timeStr}`; // Fallback
        }
    };

    // Helper to get appointment type label
    const getAppointmentTypeLabel = (type: string | undefined): string => {
         switch (type?.toLowerCase()) {
             case 'doctor': return 'Doctor Visit';
             case 'lab_test': return 'Lab Test';
             case 'yoga_class': return 'Yoga Class';
             case 'childbirth_class': return 'Childbirth Class';
             case 'fitness_class': return 'Fitness Class';
             default: return type || 'General';
         }
    };


    return (
        <Card className="shadow-md border border-gray-200 h-full flex flex-col">
            <CardHeader>
                <CardTitle className="flex items-center text-xl text-momcare-primary">
                    <CalendarDays className="mr-2 h-5 w-5" />
                    Upcoming Appointments
                </CardTitle>
                <CardDescription>Overview of scheduled patient visits.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col">
                 <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-3">
                    Note: Currently showing all upcoming appointments. Needs filtering by doctor in a full setup.
                 </p>
                <div className="flex-grow overflow-y-auto space-y-3 pr-1">
                    {isLoading && (
                        <>
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-5/6" />
                        </>
                    )}
                    {!isLoading && error && (
                         <div className="flex flex-col items-center justify-center text-center py-6 text-red-600">
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p className="font-semibold">Error loading appointments</p>
                            <p className="text-xs">{error}</p>
                         </div>
                    )}
                    {!isLoading && !error && appointments.length === 0 && (
                        <div className="flex flex-col items-center justify-center text-center py-6 text-gray-500">
                           <Inbox className="h-8 w-8 mb-2" />
                           <p>No upcoming appointments found.</p>
                        </div>
                    )}
                    {!isLoading && !error && appointments.length > 0 && (
                        <ul className="divide-y divide-gray-100">
                            {appointments.map((app) => {
                                const patient = patientProfiles.get(app.userId);
                                return (
                                    <li key={app.$id} className="py-3 px-1">
                                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                                            <div className="flex-grow min-w-0">
                                                <p className="text-sm font-medium text-gray-900 flex items-center">
                                                     <User className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                                    {patient?.name || `Patient (${app.userId.substring(0, 6)}...)`}
                                                </p>
                                                <p className="text-xs text-gray-600 flex items-center mt-0.5">
                                                    <Clock className="h-3 w-3 mr-1.5 text-gray-400" />
                                                    {formatApptDateTime(app.date, app.time)}
                                                </p>
                                                {app.notes && <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">Notes: {app.notes}</p>}
                                            </div>
                                            <div className="flex-shrink-0 mt-1 sm:mt-0">
                                                <Badge variant="secondary" className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-200">
                                                     {getAppointmentTypeLabel(app.appointmentType)}
                                                </Badge>
                                            </div>
                                        </div>
                                        {/* Add View Details Button if needed */}
                                         {/* <Button variant="ghost" size="sm" className="mt-1 text-xs h-auto py-0.5 px-1.5" disabled>View Details</Button> */}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                 <Button variant="outline" size="sm" className="mt-4 w-full" disabled>
                     View Full Schedule (Coming Soon)
                 </Button>
            </CardContent>
        </Card>
    );
};

export default DoctorAppointmentsCard;