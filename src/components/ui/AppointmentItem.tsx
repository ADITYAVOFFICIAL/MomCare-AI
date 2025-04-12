// src/components/ui/AppointmentItem.tsx
import React from 'react';
import { Card, CardContent } from '@/components/ui/card'; // Keep Card for consistent structure
import { Button } from '@/components/ui/button';
import { Appointment } from '@/lib/appwrite'; // Assuming Appointment type is exported
import { format, parseISO } from 'date-fns'; // Use parseISO for robust date handling
import {
    Calendar,
    Clock,
    Edit,
    Trash2,
    Loader2, // Make sure Loader2 is imported
    Stethoscope, // Icon for doctor
    GraduationCap, // Icon for classes
    FlaskConical, // Icon for lab tests
    HelpCircle, // Default icon
} from 'lucide-react';

interface AppointmentItemProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (appointmentId: string) => void;
  isDeleting?: boolean;
  type?: 'doctor' | 'class' | 'lab_test' | string; // <<< --- ADDED TYPE PROP
}

// Helper to format date/time robustly
const formatApptDateTime = (dateStr: string, timeStr: string): string => {
    try {
        const date = parseISO(dateStr); // Assumes dateStr is YYYY-MM-DD
        // Basic time format assumption (e.g., "10:00 AM"), adjust if needed
        return `${format(date, 'EEE, MMM d, yyyy')} at ${timeStr}`;
    } catch {
        return `${dateStr} at ${timeStr}`; // Fallback
    }
};

// Helper to get display info based on type
const getAppointmentDisplayInfo = (appointmentType: string | undefined, propType: string | undefined) => {
    const effectiveType = propType || appointmentType || 'doctor'; // Prioritize prop, fallback to appointment data, default to doctor

    switch (effectiveType) {
        case 'class':
        case 'yoga_class':
        case 'childbirth_class':
        case 'fitness_class':
            return {
                Icon: GraduationCap,
                iconColor: 'text-momcare-secondary', // Use secondary theme color
                bgColor: 'bg-momcare-secondary/10',
                defaultTitle: 'Class/Activity',
            };
        case 'lab_test':
            return {
                Icon: FlaskConical, // Specific icon for lab tests
                iconColor: 'text-indigo-600', // Example color for lab tests
                bgColor: 'bg-indigo-100',
                defaultTitle: 'Lab Test',
            };
        case 'doctor':
        default: // Default to doctor type
            return {
                Icon: Stethoscope,
                iconColor: 'text-momcare-primary', // Use primary theme color
                bgColor: 'bg-momcare-primary/10',
                defaultTitle: 'Doctor Visit',
            };
    }
};

const AppointmentItem: React.FC<AppointmentItemProps> = ({
  appointment,
  onEdit,
  onDelete,
  isDeleting = false,
  type, // <<< --- Destructure the type prop
}) => {

  // Get display info based on type
  const { Icon, iconColor, bgColor, defaultTitle } = getAppointmentDisplayInfo(appointment.appointmentType, type);

  // Determine the display title
  const displayTitle = appointment.appointmentType
    ? appointment.appointmentType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) // Capitalize words
    : defaultTitle;

  const formattedDateTime = formatApptDateTime(appointment.date, appointment.time);

  return (
    // Using Card provides consistent padding and border, but you could use a simple <li> if preferred
    <Card className="mb-3 border border-gray-200 hover:shadow-sm transition-shadow duration-150 bg-white">
      <CardContent className="p-4 flex items-center justify-between gap-x-4">
        {/* Left side: Icon and Details */}
        <div className="flex min-w-0 items-start gap-x-3 flex-grow">
          {/* Icon Circle */}
          <div className={`mt-1 h-10 w-10 ${bgColor} ${iconColor} rounded-full flex items-center justify-center flex-shrink-0`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          {/* Text Details */}
          <div className="min-w-0 flex-auto">
            <p className={`text-sm font-semibold leading-6 ${type === 'class' ? 'text-momcare-secondary-dark' : 'text-momcare-dark'}`}>
              {displayTitle}
            </p>
            <p className="mt-1 flex text-xs leading-5 text-gray-500 items-center">
              <Calendar className="h-3.5 w-3.5 mr-1.5 flex-shrink-0 text-gray-400" />
              {formattedDateTime}
            </p>
            {appointment.notes && (
              <p className="mt-1.5 text-xs leading-5 text-gray-600 line-clamp-2 bg-gray-50 p-1.5 rounded border border-gray-100">
                <span className="font-medium text-gray-700">Notes:</span> {appointment.notes}
              </p>
            )}
          </div>
        </div>

        {/* Right side: Action Buttons */}
        <div className="flex flex-none items-center gap-x-1.5 sm:gap-x-2 ml-2 sm:ml-4">
          <Button
            variant="ghost"
            size="icon" // Use 'icon' size for compact buttons
            onClick={() => onEdit(appointment)}
            aria-label="Edit appointment"
            className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 h-8 w-8" // Adjust size and hover
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(appointment.$id)}
            disabled={isDeleting}
            aria-label="Delete appointment"
            className="text-gray-500 hover:text-red-600 hover:bg-red-50 h-8 w-8" // Adjust size and hover
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin text-red-600" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AppointmentItem;