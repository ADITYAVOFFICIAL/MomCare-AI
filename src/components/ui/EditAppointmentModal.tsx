// src/components/EditAppointmentModal.tsx
// Or src/components/ui/EditAppointmentModal.tsx - adjust path as needed

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription, // Added
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Appointment, updateAppointment } from '@/lib/appwrite';
import { format } from 'date-fns'; // Removed parseISO as it's not needed
import { Calendar as CalendarIcon, Clock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface EditAppointmentModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onAppointmentUpdated: () => void; // Callback to refresh the list
}

// Ensure this list is consistent across your app
const timeSlots = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM'
];

const EditAppointmentModal: React.FC<EditAppointmentModalProps> = ({
  appointment,
  isOpen,
  onClose,
  onAppointmentUpdated,
}) => {
  // State for form fields
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | undefined>(undefined);
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Effect to populate form when appointment data changes
  useEffect(() => {
    console.log("EditAppointmentModal: useEffect triggered. Appointment:", appointment);
    if (appointment) {
      try {
         // *** FIX: Parse the ISO date string directly ***
         const appointmentDate = new Date(appointment.date);

         // Check if the date is valid after parsing
         if (isNaN(appointmentDate.getTime())) {
            console.error("EditAppointmentModal Error: Invalid date received from appointment:", appointment.date);
            setDate(undefined); // Set to undefined if invalid
         } else {
            console.log("EditAppointmentModal: Parsed date:", appointmentDate);
            setDate(appointmentDate);
         }

      } catch (e) {
         console.error("EditAppointmentModal Error: Failed to parse appointment date:", appointment.date, e);
         setDate(undefined); // Fallback to undefined on error
      }

      // Set time and notes
      setTime(appointment.time);
      setNotes(appointment.notes || '');
      console.log("EditAppointmentModal: Set time:", appointment.time, "Set notes:", appointment.notes || '');

    } else {
      // Reset form if no appointment is provided (e.g., when modal closes)
      console.log("EditAppointmentModal: No appointment, resetting form.");
      setDate(undefined);
      setTime(undefined);
      setNotes('');
    }
  }, [appointment]); // Dependency array ensures this runs when 'appointment' prop changes

  // Handler for saving changes
  const handleSaveChanges = async () => {
    if (!appointment) {
        console.error("EditAppointmentModal Error: handleSaveChanges called without an appointment.");
        return; // Should not happen if modal is open correctly
    }
    if (!date || !time) {
      toast({
        title: "Missing Information",
        description: "Please ensure both date and time are selected.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Format date back to 'yyyy-MM-dd' for Appwrite consistency if needed
      // Appwrite might accept the full ISO string too, but formatting ensures consistency
      const formattedDate = format(date, 'yyyy-MM-dd');

      console.log(`EditAppointmentModal: Updating appointment ${appointment.$id} with:`, { date: formattedDate, time, notes });

      await updateAppointment(appointment.$id, {
        date: formattedDate, // Send formatted date
        time,
        notes,
        // Ensure isCompleted is not accidentally reset if it's not part of the update form
      });

      toast({
        title: "Appointment Updated",
        description: "Your changes have been saved successfully.",
        variant: "default", // Use default variant for success
      });
      onAppointmentUpdated(); // Trigger refresh in the parent component
      onClose(); // Close the modal
    } catch (error) {
      console.error('EditAppointmentModal Error: Failed to update appointment:', error);
      toast({
        title: "Update Failed",
        description: "Could not save changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Render null if the modal shouldn't be open or no appointment data
  // isOpen check is handled by Dialog, but appointment check prevents rendering before useEffect runs
  if (!appointment) return null;

  return (
    // Control modal visibility using 'open' prop and handle closing via 'onOpenChange'
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md"> {/* Adjusted max width slightly */}
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-800">Edit Appointment</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 pt-1">
            Modify the date, time, or notes for this appointment.
          </DialogDescription>
        </DialogHeader>

        {/* Form Content */}
        <div className="grid gap-5 py-5"> {/* Increased gap */}
          {/* Date Picker */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-date-button" className="text-sm font-medium">Select Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="edit-date-button"
                  variant="outline"
                  className={`w-full justify-start text-left font-normal ${!date && "text-muted-foreground"}`}
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
                  // Disable dates strictly before today (allows selecting today)
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                  initialFocus // Focus calendar when opened
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Selector */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-time-select" className="text-sm font-medium">Select Time *</Label>
            <Select value={time} onValueChange={setTime}>
              <SelectTrigger id="edit-time-select" className="w-full">
                <SelectValue placeholder="Select a time slot" />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map((slot) => (
                  <SelectItem key={slot} value={slot}>
                    <div className="flex items-center text-sm">
                      <Clock className="mr-2 h-4 w-4 opacity-70" />
                      {slot}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="edit-notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="edit-notes"
              placeholder="Update notes for your appointment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[100px] text-sm"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="sm:justify-between gap-2"> {/* Adjust footer layout */}
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </DialogClose>
          <Button
            type="button"
            onClick={handleSaveChanges}
            disabled={isLoading || !date || !time} // Also disable if date/time are missing
            className="bg-momcare-primary hover:bg-momcare-dark transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EditAppointmentModal;