// src/components/dashboard/AddMedReminderModal.tsx
import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createMedicationReminder, CreateMedicationReminderData } from '@/lib/appwrite'; // Fixed: Import the type

interface AddMedReminderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: CreateMedicationReminderData) => Promise<void>; // Fixed: Use the imported type directly
    // initialData?: MedicationReminder; // Add later for editing
}

const AddMedReminderModal: React.FC<AddMedReminderModalProps> = ({ isOpen, onClose, onSubmit }) => {
    const [medicationName, setMedicationName] = useState('');
    const [dosage, setDosage] = useState('');
    const [frequency, setFrequency] = useState('');
    const [times, setTimes] = useState<string[]>(['']); // Start with one time input
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    // Reset form when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setMedicationName('');
            setDosage('');
            setFrequency('');
            setTimes(['']);
            setNotes('');
            setIsSaving(false);
        }
    }, [isOpen]);

    const handleTimeChange = (index: number, value: string) => {
        const newTimes = [...times];
        // Basic HH:MM validation (optional, could be stricter)
        if (/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(value) || value === '') {
             newTimes[index] = value;
             setTimes(newTimes);
        } else {
            // Maybe show a small inline error or just don't update
            console.warn("Invalid time format. Use HH:MM");
        }
    };

    const addTimeInput = () => {
        setTimes([...times, '']);
    };

    const removeTimeInput = (index: number) => {
        if (times.length > 1) {
            setTimes(times.filter((_, i) => i !== index));
        } else {
            setTimes(['']); // Keep at least one, just clear it
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!medicationName || !dosage || !frequency) {
            toast({ title: "Missing Required Fields", description: "Please fill in Medication Name, Dosage, and Frequency.", variant: "destructive" });
            return;
        }

        // Filter out empty time strings
        const validTimes = times.filter(time => time.trim() !== '');

        const reminderData: CreateMedicationReminderData = {
            medicationName,
            dosage,
            frequency,
            times: validTimes.length > 0 ? validTimes : undefined, // Only include times if there are valid ones
            notes: notes || undefined,
        };

        setIsSaving(true);
        try {
            await onSubmit(reminderData); // Call the async onSubmit prop
            onClose(); // Close modal on success
        } catch (error) {
            // Error toast should be handled in the parent onSubmit function
            console.error("Submission failed in modal:", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Add Medication Reminder</DialogTitle>
                    <DialogDescription>
                        Enter the details for your new medication reminder.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Medication Name */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="medName" className="text-right">Name*</Label>
                            <Input id="medName" value={medicationName} onChange={(e) => setMedicationName(e.target.value)} className="col-span-3" placeholder="e.g., Prenatal Vitamin" required />
                        </div>
                        {/* Dosage */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="dosage" className="text-right">Dosage*</Label>
                            <Input id="dosage" value={dosage} onChange={(e) => setDosage(e.target.value)} className="col-span-3" placeholder="e.g., 1 tablet, 10mg" required />
                        </div>
                        {/* Frequency */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="frequency" className="text-right">Frequency*</Label>
                            <Select value={frequency} onValueChange={setFrequency} required>
                                <SelectTrigger id="frequency" className="col-span-3">
                                    <SelectValue placeholder="Select frequency" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Daily">Daily</SelectItem>
                                    <SelectItem value="Twice Daily">Twice Daily</SelectItem>
                                    <SelectItem value="Three Times Daily">Three Times Daily</SelectItem>
                                    <SelectItem value="Every Other Day">Every Other Day</SelectItem>
                                    <SelectItem value="Weekly">Weekly</SelectItem>
                                    <SelectItem value="As Needed">As Needed</SelectItem>
                                    <SelectItem value="Other">Other (Specify in Notes)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        {/* Times */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label className="text-right pt-2">Times</Label>
                            <div className="col-span-3 space-y-2">
                                {times.map((time, index) => (
                                    <div key={index} className="flex items-center gap-2">
                                        <Input
                                            type="time" // Use time input for better UX
                                            value={time}
                                            onChange={(e) => handleTimeChange(index, e.target.value)}
                                            className="flex-grow"
                                            placeholder="HH:MM"
                                            pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]" // Basic pattern
                                        />
                                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-100" onClick={() => removeTimeInput(index)} aria-label="Remove time">
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                                <Button type="button" variant="outline" size="sm" onClick={addTimeInput} className="text-xs">
                                    <Plus className="h-3 w-3 mr-1" /> Add Time
                                </Button>
                            </div>
                        </div>
                        {/* Notes */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="notes" className="text-right pt-2">Notes</Label>
                            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="col-span-3 min-h-[60px]" placeholder="Optional notes (e.g., take with food)" />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSaving}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSaving} className="bg-momcare-primary hover:bg-momcare-dark">
                            {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Reminder"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default AddMedReminderModal;