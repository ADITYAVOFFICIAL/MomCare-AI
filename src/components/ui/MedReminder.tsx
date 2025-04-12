// src/components/dashboard/MedReminder.tsx
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Pill, Clock, Trash2, PlusCircle, Inbox } from 'lucide-react'; // Import icons
import type { MedicationReminder } from '@/lib/appwrite'; // Import the type

interface MedReminderProps {
    reminders: MedicationReminder[];
    isLoading: boolean;
    onAddReminder: () => void; // Function to open the add modal
    onDeleteReminder: (id: string) => void; // Function to initiate deletion
    deletingReminderId: string | null; // ID of the reminder currently being deleted
}

const ReminderItem: React.FC<{
    reminder: MedicationReminder;
    onDelete: (id: string) => void;
    isDeleting: boolean;
}> = ({ reminder, onDelete, isDeleting }) => {

    const handleDelete = () => {
        if (!isDeleting) {
            onDelete(reminder.$id);
        }
    };

    return (
        <li className="flex items-center justify-between py-3 border-b last:border-b-0">
            <div className="flex items-start space-x-3">
                <Pill className="h-5 w-5 text-momcare-primary mt-0.5 flex-shrink-0" />
                <div className="flex-grow">
                    <p className="text-sm font-semibold text-gray-800">
                        {reminder.medicationName} - <span className="font-normal text-gray-600">{reminder.dosage}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        {reminder.frequency}
                        {reminder.times && reminder.times.length > 0 && (
                            <span className="ml-1"> at {reminder.times.join(', ')}</span>
                        )}
                    </p>
                    {reminder.notes && (
                        <p className="text-xs text-gray-500 mt-1 italic">Note: {reminder.notes}</p>
                    )}
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-red-500 hover:bg-red-100 hover:text-red-700 flex-shrink-0 ml-2"
                onClick={handleDelete}
                disabled={isDeleting}
                aria-label={`Delete reminder for ${reminder.medicationName}`}
            >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
        </li>
    );
};


const MedReminder: React.FC<MedReminderProps> = ({
    reminders,
    isLoading,
    onAddReminder,
    onDeleteReminder,
    deletingReminderId
}) => {
    return (
        <Card className="border border-momcare-accent/30 shadow-sm bg-white">
            <CardHeader className="bg-momcare-accent/5 border-b border-momcare-accent/10">
                <div className="flex justify-between items-center">
                    <CardTitle className="flex items-center text-momcare-accent text-lg font-semibold">
                        <Clock className="mr-2 h-5 w-5" />Medication Reminders
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={onAddReminder} className="text-momcare-accent border-momcare-accent/50 hover:bg-momcare-accent/5">
                        <PlusCircle className="mr-1.5 h-4 w-4" /> Add New
                    </Button>
                </div>
                <CardDescription className="text-sm text-gray-500 mt-1">
                    Your current medication schedule.
                </CardDescription>
            </CardHeader>
            <CardContent className="p-0"> {/* Remove padding, handled by list/item */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-10">
                        <Loader2 className="h-6 w-6 text-momcare-accent animate-spin mr-2" />
                        <span className="text-gray-500">Loading reminders...</span>
                    </div>
                ) : reminders.length > 0 ? (
                    <ul role="list" className="divide-y divide-gray-200 px-4">
                        {reminders.map((reminder) => (
                            <ReminderItem
                                key={reminder.$id}
                                reminder={reminder}
                                onDelete={onDeleteReminder}
                                isDeleting={deletingReminderId === reminder.$id}
                            />
                        ))}
                    </ul>
                ) : (
                    <div className="text-center py-10 px-6">
                        <Inbox className="mx-auto h-10 w-10 text-gray-400 mb-3" />
                        <p className="text-gray-500 font-medium">No medication reminders set.</p>
                        <p className="text-gray-400 text-sm mt-1">Click 'Add New' to create one.</p>
                    </div>
                )}
            </CardContent>
            {reminders.length > 0 && (
                 <CardFooter className="p-3 text-xs text-gray-400 bg-gray-50/50 border-t">
                    Showing {reminders.length} active reminder{reminders.length !== 1 ? 's' : ''}.
                 </CardFooter>
            )}
        </Card>
    );
};

export default MedReminder;