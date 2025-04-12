// src/pages/AppointmentPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout'; // Adjust path if needed
import { useAuthStore } from '@/store/authStore'; // Adjust path if needed
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast'; // Adjust path if needed
import {
  Calendar as CalendarIcon,
  Clock,
  Loader2,
  ListChecks,
  Edit,
  Trash2,
  Info, // For guidelines icon
  Inbox, // For empty state icon
  AlertTriangle, // For error state icon
  PlusCircle, // For booking button icon
} from 'lucide-react';
import { format, isAfter, parseISO, compareAsc, startOfDay } from 'date-fns';
import { Calendar } from '@/components/ui/calendar'; // Adjust path if needed
import {
  createAppointment,
  getUserAppointments,
  deleteAppointment,
  Appointment,
  updateAppointment, // Keep import for EditAppointmentModal if it uses it
} from '@/lib/appwrite'; // Adjust path if needed
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'; // Adjust path if needed
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'; // Adjust path if needed
import AppointmentItem from '@/components/ui/AppointmentItem'; // Adjust path if needed
import EditAppointmentModal from '@/components/ui/EditAppointmentModal'; // Adjust path if needed
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"; // Adjust path if needed

// --- Helper Function to parse appointment date/time ---
// Returns a Date object or null if parsing fails
const parseAppointmentDateTime = (app: Appointment): Date | null => {
    if (!app || !app.date || !app.time) {
        console.error('parseAppointmentDateTime: Invalid appointment data received', app);
        return null;
    }
    try {
        const appDate = parseISO(app.date);
        if (isNaN(appDate.getTime())) {
            console.error('parseAppointmentDateTime: Invalid date format:', app.date);
            return null;
        }
        const timeParts = app.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
        if (!timeParts) {
            console.error('parseAppointmentDateTime: Invalid time format:', app.time);
            return null;
        }
        let hours = parseInt(timeParts[1], 10); const minutes = parseInt(timeParts[2], 10);
        const period = timeParts[3]?.toUpperCase();
        if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) {
             console.error('parseAppointmentDateTime: Invalid hours or minutes:', app.time);
             return null;
        }
        if (period) { if (hours < 1 || hours > 12) return null; if (period === 'PM' && hours !== 12) hours += 12; else if (period === 'AM' && hours === 12) hours = 0; }
        else { if (hours < 0 || hours > 23) return null; }
        return new Date(appDate.getFullYear(), appDate.getMonth(), appDate.getDate(), hours, minutes);
    } catch (err) {
        console.error('parseAppointmentDateTime: Unexpected error parsing:', err, app);
        return null;
    }
};

// --- Helper Function to format date/time for display ---
// FIX for Line 521: Define this helper within the component scope or import it
const formatApptDateTime = (dateStr: string, timeStr: string): string => {
    try {
        const date = parseISO(dateStr); // Assumes dateStr is YYYY-MM-DD
        if (isNaN(date.getTime())) return `${dateStr} at ${timeStr}`; // Fallback for invalid date
        // Basic time format assumption (e.g., "10:00 AM"), adjust if needed
        return `${format(date, 'EEE, MMM d, yyyy')} at ${timeStr}`;
    } catch {
        return `${dateStr} at ${timeStr}`; // Fallback
    }
};


const AppointmentPage: React.FC = () => {
  // --- State Definitions ---
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState<string>('');
  const [appointmentType, setAppointmentType] = useState<string>('doctor'); // Default type
  const [isBookingLoading, setIsBookingLoading] = useState<boolean>(false);

  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState<boolean>(true);
  const [errorAppointments, setErrorAppointments] = useState<string | null>(null);

  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [deletingAppointmentId, setDeletingAppointmentId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<string | null>(null);

  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  // Available time slots
  const timeSlots: ReadonlyArray<string> = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
  ];

  // Appointment type options
  const appointmentTypes: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'doctor', label: 'Doctor Visit / Check-up' },
    { value: 'lab_test', label: 'Lab Test' },
    { value: 'yoga_class', label: 'Yoga Class' },
    { value: 'childbirth_class', label: 'Childbirth Class' },
    { value: 'fitness_class', label: 'Fitness Class' },
    // Add more types as needed
  ];

  // --- Function to fetch appointments ---
  const fetchAppointments = useCallback(async () => {
    if (!isAuthenticated || !user?.$id) {
      setIsLoadingAppointments(false);
      setUpcomingAppointments([]);
      setErrorAppointments(null);
      return;
    }
    setIsLoadingAppointments(true);
    setErrorAppointments(null);
    try {
      const allAppointments = await getUserAppointments(user.$id);
      const now = new Date();
      const upcoming = allAppointments
        .map(app => ({ ...app, dateTime: parseAppointmentDateTime(app) }))
        .filter(app => app.dateTime && isAfter(app.dateTime, now) && !app.isCompleted)
        .sort((a, b) => {
            if (!a.dateTime) return 1; if (!b.dateTime) return -1;
            return compareAsc(a.dateTime, b.dateTime);
        });
      setUpcomingAppointments(upcoming);
    } catch (error: any) {
      console.error('AppointmentPage: Error fetching appointments:', error);
      const errorMessage = error.message || 'Failed to load appointments. Please try refreshing.';
      setErrorAppointments(errorMessage);
      setUpcomingAppointments([]);
      toast({ title: "Loading Error", description: errorMessage, variant: "destructive" });
    } finally {
      setIsLoadingAppointments(false);
    }
  }, [user, isAuthenticated, toast]); // Dependencies

  // Fetch appointments effect
  useEffect(() => {
    if (isAuthenticated && user) { fetchAppointments(); }
    else { setIsLoadingAppointments(false); setUpcomingAppointments([]); setErrorAppointments(null); }
  }, [user, isAuthenticated, fetchAppointments]);

  // --- Booking Handler ---
  const handleBookAppointment = async () => {
    if (!isAuthenticated || !user?.$id) {
      toast({ title: "Login Required", description: "Please log in to book.", variant: "destructive" }); return;
    }
    if (!date || !time) {
      toast({ title: "Missing Info", description: "Please select date and time.", variant: "destructive" }); return;
    }
    setIsBookingLoading(true);
    try {
      const formattedDate = format(date, 'yyyy-MM-dd');
      await createAppointment(user.$id, { date: formattedDate, time, notes: notes || undefined, appointmentType: appointmentType || 'doctor' });
      toast({
        title: "Appointment Booked!",
        description: `Scheduled for ${format(date, 'PPP')} at ${time}.`,
        // FIX for Line 230: Use 'default' variant if 'success' is not defined
        variant: "default",
      });
      setDate(undefined); setTime(undefined); setNotes(''); setAppointmentType('doctor');
      fetchAppointments(); // Refresh list
    } catch (error: any) {
      console.error('Error booking appointment:', error);
      toast({ title: "Booking Failed", description: error.message || "Could not book appointment.", variant: "destructive" });
    } finally {
      setIsBookingLoading(false);
    }
  };

  // --- Edit and Delete Handlers ---
  const handleEdit = (appointment: Appointment): void => {
    setEditingAppointment(appointment);
    setIsEditModalOpen(true);
  };

  const handleDeleteClick = (appointmentId: string): void => {
    setAppointmentToDelete(appointmentId);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!appointmentToDelete) return;
    setDeletingAppointmentId(appointmentToDelete);
    try {
      await deleteAppointment(appointmentToDelete);
      toast({
          title: "Appointment Deleted",
          description: "Successfully removed.",
          // FIX for Line 269: Use 'default' variant if 'success' is not defined
          variant: "default"
      });
      fetchAppointments(); // Re-fetch
    } catch (error: any) {
      console.error('Error deleting appointment:', error);
      toast({ title: "Deletion Failed", description: error.message || "Could not delete appointment.", variant: "destructive" });
    } finally {
      setDeletingAppointmentId(null);
      setAppointmentToDelete(null);
      setIsDeleteDialogOpen(false); // Ensure dialog closes
    }
  };

  // --- JSX Rendering ---
  return (
    <MainLayout requireAuth={true}>
      <div className="bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Page Header */}
          <div className="text-center mb-10 md:mb-12">
            <h1 className="text-3xl font-extrabold text-momcare-dark sm:text-4xl tracking-tight">
              Schedule & Manage Appointments
            </h1>
            <p className="mt-3 text-lg text-gray-600 max-w-2xl mx-auto">
              Book a new check-up, lab test, or class. View and manage your existing schedule below.
            </p>
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

            {/* Column 1: Booking Form & Guidelines */}
            <div className="lg:col-span-1 space-y-6">
               <Card className="shadow-lg border border-gray-200 rounded-lg overflow-hidden bg-white">
                 <CardHeader className="bg-gradient-to-r from-momcare-light to-white p-5 border-b border-gray-200">
                   <CardTitle className="flex items-center text-xl font-semibold text-momcare-primary">
                     <CalendarIcon className="mr-2.5 h-5 w-5" />
                     Book New Appointment
                   </CardTitle>
                 </CardHeader>
                 <CardContent className="p-6 space-y-5">
                   {/* Appointment Type Selector */}
                   <div className="space-y-1.5">
                        <Label htmlFor="appointment-type-select" className="text-sm font-medium text-gray-700">Type of Appointment *</Label>
                        <Select value={appointmentType} onValueChange={setAppointmentType}>
                            <SelectTrigger id="appointment-type-select" className="w-full" aria-label="Select appointment type">
                                <SelectValue placeholder="Select appointment type" />
                            </SelectTrigger>
                            <SelectContent>
                                {appointmentTypes.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                   {/* Date Picker */}
                   <div className="space-y-1.5">
                     <Label htmlFor="date-popover-button" className="text-sm font-medium text-gray-700">Select Date *</Label>
                     <Popover>
                       <PopoverTrigger asChild>
                         <Button
                           id="date-popover-button"
                           variant="outline"
                           className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
                           aria-label={`Selected date: ${date ? format(date, 'PPP') : 'None'}`}
                         >
                           <CalendarIcon className="mr-2 h-4 w-4" />
                           {date ? format(date, 'PPP') : <span>Pick a date</span>}
                         </Button>
                       </PopoverTrigger>
                       <PopoverContent className="w-auto p-0" align="start">
                         <Calendar
                           mode="single"
                           selected={date}
                           onSelect={setDate}
                           disabled={(day) => day < startOfDay(new Date())}
                           initialFocus
                         />
                       </PopoverContent>
                     </Popover>
                   </div>

                   {/* Time Selector */}
                   <div className="space-y-1.5">
                     <Label htmlFor="time-select" className="text-sm font-medium text-gray-700">Select Time *</Label>
                     <Select value={time} onValueChange={setTime}>
                       <SelectTrigger id="time-select" className="w-full" aria-label="Select appointment time">
                         <SelectValue placeholder="Select a time slot" />
                       </SelectTrigger>
                       <SelectContent>
                         {timeSlots.map((slot) => (
                           <SelectItem key={slot} value={slot}>
                             <div className="flex items-center text-sm">
                               <Clock className="mr-2 h-4 w-4 opacity-70" /> {slot}
                             </div>
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                   </div>

                   {/* Notes */}
                   <div className="space-y-1.5">
                     <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Notes (Optional)</Label>
                     <Textarea
                       id="notes"
                       placeholder="Any specific concerns or requests for this appointment..."
                       value={notes}
                       onChange={(e) => setNotes(e.target.value)}
                       className="min-h-[100px] text-sm"
                       maxLength={500}
                       aria-label="Appointment notes"
                     />
                     <p className="text-xs text-gray-500 text-right" aria-live="polite">{notes.length}/500</p>
                   </div>

                   {/* Booking Button */}
                   <Button
                     onClick={handleBookAppointment}
                     size="lg"
                     className="w-full py-3 text-base bg-momcare-primary hover:bg-momcare-dark transition-colors duration-200 flex items-center justify-center gap-2"
                     disabled={!date || !time || isBookingLoading || !isAuthenticated}
                     aria-disabled={!date || !time || isBookingLoading || !isAuthenticated}
                   >
                     {isBookingLoading ? (
                       <><Loader2 className="h-5 w-5 animate-spin" /> Booking...</>
                     ) : (
                       <><PlusCircle className="h-5 w-5" /> Confirm Booking</>
                     )}
                   </Button>
                   {!isAuthenticated && (
                        <p className="text-xs text-red-600 text-center mt-2">Please log in to book an appointment.</p>
                   )}
                 </CardContent>
               </Card>

               {/* Appointment Guidelines Card */}
               <Card className="shadow-sm border border-gray-200 rounded-lg bg-blue-50/30">
                  <CardHeader className="p-4 border-b border-blue-100">
                      <CardTitle className="flex items-center text-base font-medium text-blue-800">
                          <Info className="mr-2 h-4 w-4 text-blue-600" />
                          Appointment Guidelines
                      </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                      <ul className="space-y-1.5 text-xs text-gray-700 list-disc list-outside pl-4">
                          <li>Please arrive 10-15 minutes before your scheduled time.</li>
                          <li>Bring recent test results or medical records if applicable.</li>
                          <li>Cancellations/reschedules require at least 24 hours notice.</li>
                          <li>Check your email for booking confirmation details.</li>
                      </ul>
                  </CardContent>
               </Card>
            </div>

            {/* Column 2: Upcoming Appointments List Card */}
            <div className="lg:col-span-2">
              <Card className="shadow-lg border border-gray-200 rounded-lg overflow-hidden bg-white">
                <CardHeader className="bg-gradient-to-r from-momcare-light to-white p-5 border-b border-gray-200">
                  <CardTitle className="flex items-center text-xl font-semibold text-momcare-primary">
                    <ListChecks className="mr-2.5 h-5 w-5" />
                    Your Upcoming Appointments
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-500 mt-1">
                    View and manage your scheduled visits and classes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 md:p-6 min-h-[300px] flex flex-col"> {/* Ensure content area can flex */}
                  {/* Loading State */}
                  {isLoadingAppointments && (
                    <div className="flex flex-col justify-center items-center text-center flex-grow py-10">
                      <Loader2 className="h-10 w-10 animate-spin text-momcare-primary mb-3" />
                      <p className="text-gray-500 font-medium">Loading your appointments...</p>
                    </div>
                  )}

                  {/* Error State */}
                  {!isLoadingAppointments && errorAppointments && (
                    <div className="flex flex-col justify-center items-center text-center flex-grow py-10 bg-red-50 p-6 rounded-md border border-red-200">
                       <AlertTriangle className="h-10 w-10 text-red-500 mb-3" />
                       <p className="text-red-700 font-semibold mb-1">Oops! Something went wrong.</p>
                       <p className="text-red-600 text-sm">{errorAppointments}</p>
                       <Button variant="outline" size="sm" onClick={fetchAppointments} className="mt-4">
                           Try Again
                       </Button>
                    </div>
                  )}

                  {/* Empty State */}
                  {!isLoadingAppointments && !errorAppointments && upcomingAppointments.length === 0 && (
                    <div className="flex flex-col justify-center items-center text-center flex-grow py-10">
                       <Inbox className="h-12 w-12 text-gray-400 mb-3" />
                       <p className="text-gray-500 font-medium">No upcoming appointments found.</p>
                       <p className="text-gray-400 text-sm mt-1">Use the form on the left to schedule your next visit.</p>
                    </div>
                  )}

                  {/* Appointments List */}
                  {!isLoadingAppointments && !errorAppointments && upcomingAppointments.length > 0 && (
                    // Add scroll if list gets long, adjust max-h as needed
                    <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-250px)] pr-1">
                      {upcomingAppointments.map((app) => (
                        <AppointmentItem
                          key={app.$id}
                          appointment={app}
                          onEdit={handleEdit}
                          onDelete={handleDeleteClick}
                          isDeleting={deletingAppointmentId === app.$id}
                          // Pass type for styling in AppointmentItem
                          type={app.appointmentType}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div> {/* End Grid */}
        </div> {/* End Container */}
      </div> {/* End Background */}


      {/* --- Modals and Dialogs --- */}
      {/* Edit Modal (Ensure EditAppointmentModal component exists and accepts these props) */}
      {editingAppointment && (
          <EditAppointmentModal
            appointment={editingAppointment}
            isOpen={isEditModalOpen}
            onClose={() => { setIsEditModalOpen(false); setEditingAppointment(null); }}
            onAppointmentUpdated={() => {
                setIsEditModalOpen(false); // Close modal on success
                setEditingAppointment(null);
                fetchAppointments(); // Refresh list after update
            }}
            // FIX for Line 507: Remove props not expected by EditAppointmentModal
            // timeSlots={timeSlots} // Remove if not needed by modal
            // appointmentTypes={appointmentTypes} // Remove if not needed by modal
          />
      )}

       {/* Delete Confirmation Dialog */}
       <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
         <AlertDialogContent>
           <AlertDialogHeader>
             <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
             <AlertDialogDescription>
               Are you sure you want to delete the appointment scheduled for{' '}
               {/* Find the appointment details for better context */}
               {appointmentToDelete && upcomingAppointments.find(a => a.$id === appointmentToDelete)
                 ? formatApptDateTime( // Use the helper function defined above
                     upcomingAppointments.find(a => a.$id === appointmentToDelete)!.date,
                     upcomingAppointments.find(a => a.$id === appointmentToDelete)!.time
                   )
                 : 'this appointment'
               }? This action cannot be undone.
             </AlertDialogDescription>
           </AlertDialogHeader>
           <AlertDialogFooter>
             <AlertDialogCancel onClick={() => setAppointmentToDelete(null)}>Cancel</AlertDialogCancel>
             <AlertDialogAction
               onClick={confirmDelete}
               className="bg-red-600 hover:bg-red-700"
               disabled={!!deletingAppointmentId} // Disable button if any deletion is in progress
               aria-label="Confirm deletion"
             >
               {/* Show spinner specifically for the one being deleted */}
               {deletingAppointmentId === appointmentToDelete ? (
                 <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
               ) : (
                 "Delete Appointment"
               )}
             </AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
       </AlertDialog>

    </MainLayout>
  );
};

export default AppointmentPage;