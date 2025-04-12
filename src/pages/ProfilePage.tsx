// src/pages/ProfilePage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
    getUserProfile,
    updateUserProfile,
    createUserProfile,
    uploadProfilePhoto,
    getFilePreview,
    profileBucketId,
    UserProfile, // Ensure this includes the latest fields
    // Health Reading Imports (remain unchanged)
    getBloodPressureReadings,
    createBloodPressureReading,
    BloodPressureReading,
    getBloodSugarReadings,
    createBloodSugarReading,
    BloodSugarReading,
    getWeightReadings,
    createWeightReading,
    WeightReading,
    AppwriteDocument // Ensure AppwriteDocument is imported
} from '@/lib/appwrite';
import { User as AuthUserIcon, UploadCloud, Save, Loader2, HeartPulse, Info, Settings, HeartHandshake, Briefcase, Utensils, Activity, MessageCircle } from 'lucide-react'; // Added more icons

const ProfilePage = () => {
    // --- Existing State ---
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
    const [localPhotoPreview, setLocalPhotoPreview] = useState<string | null>(null);
    const [fetchedPhotoUrl, setFetchedPhotoUrl] = useState<string | null>(null);
    const { user } = useAuthStore();
    const { toast } = useToast();

    // --- Profile Form State (Existing) ---
    const [name, setName] = useState('');
    const [age, setAge] = useState('');
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');
    const [weeksPregnant, setWeeksPregnant] = useState('');
    const [preExistingConditions, setPreExistingConditions] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');

    // --- Profile Form State (NEW FIELDS) ---
    const [previousPregnancies, setPreviousPregnancies] = useState(''); // Stored as number, input as string
    const [deliveryPreference, setDeliveryPreference] = useState('');
    const [partnerSupport, setPartnerSupport] = useState(''); // Sensitive field
    const [workSituation, setWorkSituation] = useState('');
    const [dietaryPreferences, setDietaryPreferences] = useState(''); // Input as comma-separated string
    const [activityLevel, setActivityLevel] = useState('');
    const [chatTonePreference, setChatTonePreference] = useState('');

    // --- Health Input State (remains unchanged) ---
    const [isSavingHealthData, setIsSavingHealthData] = useState<'bp' | 'sugar' | 'weight' | null>(null);
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [sugarLevel, setSugarLevel] = useState('');
    const [sugarType, setSugarType] = useState<'fasting' | 'post_meal' | 'random'>('fasting');
    const [weight, setWeight] = useState('');
    const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

    // --- Combined Fetch Function (Updated) ---
    const fetchData = useCallback(async () => {
        if (!user?.$id) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setFetchedPhotoUrl(null);

        try {
            // Fetch profile (health data fetches remain unchanged)
            const [profileData, bpData, sugarData, weightData] = await Promise.all([
                getUserProfile(user.$id),
                getBloodPressureReadings(user.$id),
                getBloodSugarReadings(user.$id),
                getWeightReadings(user.$id)
            ]);

            // Process Profile Data
            setProfile(profileData);
            if (profileData) {
                // Existing fields
                setName(profileData.name || user.name || '');
                setAge(profileData.age?.toString() || '');
                setGender(profileData.gender || '');
                setAddress(profileData.address || '');
                setWeeksPregnant(profileData.weeksPregnant?.toString() || '');
                setPreExistingConditions(profileData.preExistingConditions || '');
                setPhoneNumber(profileData.phoneNumber || '');

                // NEW fields
                setPreviousPregnancies(profileData.previousPregnancies?.toString() || ''); // Convert number to string for input
                setDeliveryPreference(profileData.deliveryPreference || '');
                setPartnerSupport(profileData.partnerSupport || '');
                setWorkSituation(profileData.workSituation || '');
                setDietaryPreferences(profileData.dietaryPreferences?.join(', ') || ''); // Join array into comma-separated string
                setActivityLevel(profileData.activityLevel || '');
                setChatTonePreference(profileData.chatTonePreference || '');

                // Photo
                if (profileData.profilePhotoId) {
                    try {
                        console.log(`Attempting to get preview for photo ID: ${profileData.profilePhotoId}`);
                        const previewUrl = getFilePreview(profileData.profilePhotoId, profileBucketId);
                        console.log("Preview URL object:", previewUrl);
                        const url = previewUrl?.toString();
                        console.log("Final URL string:", url);
                        setFetchedPhotoUrl(url || null);
                    } catch (e) { 
                        console.error("Error getting profile photo preview:", e);}
                }
            } else {
                // Reset form fields if no profile exists
                setName(user.name || '');
                setAge(''); setGender(''); setAddress(''); setWeeksPregnant('');
                setPreExistingConditions(''); setPhoneNumber('');
                // NEW fields reset
                setPreviousPregnancies(''); setDeliveryPreference(''); setPartnerSupport('');
                setWorkSituation(''); setDietaryPreferences(''); setActivityLevel('');
                setChatTonePreference('');
            }

            // Note: Health data state setting removed as it's not displayed directly

        } catch (error) {
            console.error('Error fetching data:', error);
            toast({ title: "Failed to load data", description: "Could not retrieve profile data.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [user, toast]); // Dependencies

    // Fetch data on mount/user change
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Photo Handlers (Keep existing) ---
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            
            // Check if file type is allowed
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                toast({ 
                    title: "Invalid file type", 
                    description: "Please select JPG, PNG, GIF or WebP images only.", 
                    variant: "destructive" 
                });
                return;
            }
            
            setProfilePhotoFile(file);
            const reader = new FileReader();
            reader.onload = (event) => setLocalPhotoPreview(event.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setProfilePhotoFile(null);
            setLocalPhotoPreview(null);
        }
    };
    const handleUploadPhoto = async () => {
        if (!profilePhotoFile || !user?.$id) { // Ensure user.$id exists
            toast({ title: "Error", description: "User not logged in or no file selected.", variant: "destructive" });
            return;
        }
        setIsUploading(true);
        try {
            // Pass user.$id to uploadProfilePhoto
            const uploadedFile = await uploadProfilePhoto(profilePhotoFile, user.$id);
            console.log('Uploaded file details:', uploadedFile); // Debug log
    
            const profileUpdateData = { profilePhotoId: uploadedFile.$id };
            let currentProfile = profile;
    
            // Ensure profile exists before updating
            if (!currentProfile?.$id) {
                console.log("Profile not found locally, attempting to fetch/create before update...");
                // Attempt to fetch again just in case state was stale, or create if truly missing
                currentProfile = await getUserProfile(user.$id);
                if (!currentProfile) {
                    console.log("Profile not found on server, creating new one...");
                    currentProfile = await createUserProfile(user.$id, { name: name || user.name, email: user.email });
                    setProfile(currentProfile); // Update local state with the new profile
                    console.log("New profile created:", currentProfile);
                } else {
                     setProfile(currentProfile); // Update local state if fetched
                     console.log("Fetched existing profile:", currentProfile);
                }
            }
    
            // Now update the profile with the photo ID
            if (currentProfile?.$id) {
                console.log(`Updating profile ${currentProfile.$id} with photo ID ${uploadedFile.$id}`);
                await updateUserProfile(currentProfile.$id, profileUpdateData);
            } else {
                console.error("Profile ID still missing after fetch/create attempt.");
                throw new Error("Could not associate photo with profile.");
            }
    
            toast({ title: "Photo uploaded successfully" });
            setProfilePhotoFile(null);
            setLocalPhotoPreview(null);
            const fileInput = document.getElementById('photo-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';
    
            console.log("Refreshing data after photo upload...");
            await fetchData(); // Refresh all data to get the new photo URL
    
        } catch (error: any) {
            console.error('Error uploading photo:', error);
            toast({ title: "Upload failed", description: error.message || "Could not upload photo.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    // --- Profile Save Handler (Updated) ---
    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            // --- Validation ---
            const weeksNum = weeksPregnant ? parseInt(weeksPregnant, 10) : undefined;
            if (weeksPregnant && (isNaN(weeksNum) || weeksNum < 0 || weeksNum > 45)) {
                 toast({ title: "Invalid Input", description: "Please enter a valid number of weeks (0-45).", variant: "destructive" });
                 setIsSaving(false); return;
            }
            const ageNum = age ? parseInt(age, 10) : undefined;
             if (age && (isNaN(ageNum) || ageNum < 15 || ageNum > 99)) {
                 toast({ title: "Invalid Input", description: "Please enter a valid age (15-99).", variant: "destructive" });
                 setIsSaving(false); return;
             }
            const prevPregNum = previousPregnancies ? parseInt(previousPregnancies, 10) : undefined;
            if (previousPregnancies && (isNaN(prevPregNum) || prevPregNum < 0 || prevPregNum > 20)) { // Example validation
                 toast({ title: "Invalid Input", description: "Please enter a valid number of previous pregnancies (0-20).", variant: "destructive" });
                 setIsSaving(false); return;
            }

            // --- Prepare Data ---
            // Handle dietary preferences string array
            const dietaryPrefsArray = dietaryPreferences
                .split(',') // Split by comma
                .map(pref => pref.trim()) // Trim whitespace
                .filter(pref => pref.length > 0); // Remove empty strings

                const profileDataToSave: Partial<Omit<UserProfile, keyof AppwriteDocument | 'userId' | 'profilePhotoUrl' | 'email'>> = {
                    // Existing fields
                    name: name || user.name,
                    age: ageNum,
                    gender: gender, // Allow empty string
                    address: address, // Allow empty string
                    weeksPregnant: weeksNum,
                    preExistingConditions: preExistingConditions, // Allow empty string
                    phoneNumber: phoneNumber, // Allow empty string
                
                    // NEW fields
                    previousPregnancies: prevPregNum,
                    deliveryPreference: deliveryPreference, // Allow empty string
                    partnerSupport: partnerSupport, // Allow empty string
                    workSituation: workSituation, // Allow empty string
                    dietaryPreferences: dietaryPrefsArray, // Keep as is or empty array
                    activityLevel: activityLevel, // Allow empty string
                    chatTonePreference: chatTonePreference, // Allow empty string
                };

            // --- Save Logic ---
            let updatedProfile: UserProfile | null = null;
            if (profile?.$id) {
                updatedProfile = await updateUserProfile(profile.$id, profileDataToSave);
            } else {
                // Include email when creating a new profile
                updatedProfile = await createUserProfile(user.$id, { ...profileDataToSave, email: user.email });
            }
            setProfile(updatedProfile); // Update local state

            // Refresh photo URL if it exists
             if (updatedProfile?.profilePhotoId) {
                 try {
                    const url = getFilePreview(updatedProfile.profilePhotoId, profileBucketId)?.toString();
                    setFetchedPhotoUrl(url || null);
                 } catch(e) { console.error("Error getting preview after save:", e); }
             } else {
                 setFetchedPhotoUrl(null);
             }

            // Update form state to reflect saved data (e.g., formatted dietary prefs)
            setDietaryPreferences(updatedProfile?.dietaryPreferences?.join(', ') || '');

            toast({ title: "Profile saved successfully" });
        } catch (error: any) {
            console.error('Error saving profile:', error);
            toast({ title: "Save failed", description: error.message || "Could not save profile.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    // --- Health Data Save Handlers (Keep existing) ---
    const handleSaveBP = async () => {
        if (!user?.$id || !systolic || !diastolic) { toast({ title: "Missing Information", description: "Please enter both Systolic and Diastolic values.", variant: "destructive" }); return; }
        const sysNum = parseInt(systolic, 10); const diaNum = parseInt(diastolic, 10);
        if (isNaN(sysNum) || isNaN(diaNum) || sysNum <= 0 || diaNum <= 0) { toast({ title: "Invalid Input", description: "Please enter valid positive numbers for BP.", variant: "destructive" }); return; }
        setIsSavingHealthData('bp');
        try {
            await createBloodPressureReading(user.$id, { systolic: sysNum, diastolic: diaNum });
            toast({ title: "BP Reading Saved" }); setSystolic(''); setDiastolic('');
        } catch (error) { console.error("Error saving BP:", error); toast({ title: "Save Failed", description: "Could not save BP reading.", variant: "destructive" }); }
        finally { setIsSavingHealthData(null); }
    };
    const handleSaveSugar = async () => {
        if (!user?.$id || !sugarLevel) { toast({ title: "Missing Information", description: "Please enter the Blood Sugar level.", variant: "destructive" }); return; }
        const levelNum = parseFloat(sugarLevel);
         if (isNaN(levelNum) || levelNum <= 0) { toast({ title: "Invalid Input", description: "Please enter a valid positive number for blood sugar.", variant: "destructive" }); return; }
        setIsSavingHealthData('sugar');
        try {
            await createBloodSugarReading(user.$id, { level: levelNum, measurementType: sugarType });
            toast({ title: "Blood Sugar Reading Saved" }); setSugarLevel('');
        } catch (error) { console.error("Error saving Sugar:", error); toast({ title: "Save Failed", description: "Could not save Blood Sugar reading.", variant: "destructive" }); }
        finally { setIsSavingHealthData(null); }
    };
    const handleSaveWeight = async () => {
        if (!user?.$id || !weight) { toast({ title: "Missing Information", description: "Please enter your weight.", variant: "destructive" }); return; }
         const weightNum = parseFloat(weight);
         if (isNaN(weightNum) || weightNum <= 0) { toast({ title: "Invalid Input", description: "Please enter a valid positive number for weight.", variant: "destructive" }); return; }
        setIsSavingHealthData('weight');
        try {
            await createWeightReading(user.$id, { weight: weightNum, unit: weightUnit });
            toast({ title: "Weight Reading Saved" }); setWeight('');
        } catch (error) { console.error("Error saving Weight:", error); toast({ title: "Save Failed", description: "Could not save Weight reading.", variant: "destructive" }); }
        finally { setIsSavingHealthData(null); }
    };

    // --- Helper for Avatar Fallback (Keep existing) ---
    const getInitials = (nameStr: string | undefined | null): string => {
        if (!nameStr) return 'U';
        return nameStr.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().substring(0, 2);
    };

    // --- Render Logic ---
    return (
        <MainLayout requireAuth={true}>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-momcare-primary">My Profile & Health Tracker</h1>
                    <p className="text-gray-600 mt-2">
                        Manage personal info, pregnancy details, preferences, and track your health readings.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-10 w-10 text-momcare-primary animate-spin mb-4" />
                        <p className="text-gray-600">Loading your profile...</p>
                    </div>
                ) : !user ? (
                     <div className="text-center py-12"><p className="text-red-600">You need to be logged in.</p></div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* --- Column 1: Profile Photo & Account Info --- */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="border-momcare-primary/20">
                                <CardHeader className="bg-momcare-light"><CardTitle className="flex items-center text-momcare-primary"><AuthUserIcon className="mr-2 h-5 w-5" />Profile Photo</CardTitle></CardHeader>
                                <CardContent className="pt-6 flex flex-col items-center">
                                    <Avatar className="h-32 w-32 mb-4 border-2 border-momcare-light">
                                        <AvatarImage src={localPhotoPreview || fetchedPhotoUrl || undefined} alt={name || 'User profile photo'} />
                                        <AvatarFallback className="bg-momcare-primary text-white text-3xl">{getInitials(name || user?.name)}</AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-4 w-full">
                                    <div className="space-y-2">
    <Label htmlFor="photo-upload">Upload New Photo</Label>
    <Input id="photo-upload" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handlePhotoChange} disabled={isUploading} />
    <p className="text-xs text-gray-500">Accepted formats: JPG, PNG, GIF, WebP (max 5MB)</p>
</div>
                                        {profilePhotoFile && (
                                            <Button onClick={handleUploadPhoto} className="w-full bg-momcare-primary hover:bg-momcare-dark" disabled={isUploading}>
                                                {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><UploadCloud className="mr-2 h-4 w-4" /> Upload Photo</>}
                                            </Button>
                                        )}
                                        <div className="pt-4 border-t mt-4">
                                            <p className="text-sm font-medium text-gray-800">Account Info</p>
                                            <div className="mt-2 space-y-1 text-sm">
                                                <p><span className="text-gray-500 w-20 inline-block">Email:</span> <span className="font-medium break-all">{user?.email}</span></p>
                                                <p><span className="text-gray-500 w-20 inline-block">User ID:</span> <span className="font-medium break-all">{user?.$id}</span></p>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* --- Column 2: Personal Info & Health Inputs --- */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Personal Information Card (Expanded) */}
                            <Card className="border-momcare-primary/20">
                                <CardHeader className="bg-momcare-light"><CardTitle className="flex items-center text-momcare-primary"><Info className="mr-2 h-5 w-5" />Personal & Pregnancy Information</CardTitle></CardHeader>
                                <CardContent className="pt-6">
                                    {/* Form submission triggers profile save */}
                                    <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-8"> {/* Increased spacing */}

                                        {/* --- Basic Personal Details --- */}
                                        <div>
                                            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center"><AuthUserIcon className="mr-2 h-5 w-5 text-momcare-secondary" /> Basic Info</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-1.5"><Label htmlFor="name">Full Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" required /></div>
                                                <div className="space-y-1.5"><Label htmlFor="age">Age</Label><Input id="age" type="number" value={age} onChange={(e) => setAge(e.target.value)} placeholder="e.g., 30" min="15" max="99" /></div>
                                                <div className="space-y-1.5"><Label htmlFor="gender">Gender</Label><Select value={gender} onValueChange={setGender}><SelectTrigger id="gender"><SelectValue placeholder="Select gender" /></SelectTrigger><SelectContent><SelectItem value="female">Female</SelectItem><SelectItem value="male">Male</SelectItem><SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
                                                <div className="space-y-1.5"><Label htmlFor="phone">Phone Number</Label><Input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="Optional phone number" /></div>
                                            </div>
                                            <div className="mt-4 space-y-1.5"><Label htmlFor="address">Address</Label><Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Optional address" className="min-h-[80px]" /></div>
                                        </div>

                                        {/* --- Pregnancy Information Section (Updated) --- */}
                                        <div className="pt-6 border-t">
                                            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center"><HeartPulse className="mr-2 h-5 w-5 text-momcare-secondary" /> Pregnancy Details</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Weeks Pregnant */}
                                                <div className="space-y-1.5">
                                                  <Label htmlFor="weeksPregnant">Current Weeks Pregnant</Label>
                                                  <Input id="weeksPregnant" type="number" value={weeksPregnant} onChange={(e) => setWeeksPregnant(e.target.value)} placeholder="e.g., 16" min="0" max="45" />
                                                  <p className="text-xs text-gray-500">Estimated week (0-45).</p>
                                                </div>
                                                {/* Previous Pregnancies */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="previousPregnancies">Number of Previous Pregnancies</Label>
                                                    <Input id="previousPregnancies" type="number" value={previousPregnancies} onChange={(e) => setPreviousPregnancies(e.target.value)} placeholder="e.g., 0, 1, 2" min="0" max="20" />
                                                    <p className="text-xs text-gray-500">Enter 0 if this is your first.</p>
                                                </div>
                                                {/* Delivery Preference */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="deliveryPreference">Delivery Preference</Label>
                                                    <Select value={deliveryPreference} onValueChange={setDeliveryPreference}>
                                                        <SelectTrigger id="deliveryPreference"><SelectValue placeholder="Select preference (optional)" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="vaginal">Vaginal</SelectItem>
                                                            <SelectItem value="c-section">C-Section</SelectItem>
                                                            <SelectItem value="undecided">Undecided</SelectItem>
                                                            <SelectItem value="discuss_with_doctor">Discuss with Doctor</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            {/* Pre-existing Conditions */}
                                            <div className="mt-4 space-y-1.5">
                                                <Label htmlFor="conditions">Pre-existing Medical Conditions</Label>
                                                <Textarea id="conditions" value={preExistingConditions} onChange={(e) => setPreExistingConditions(e.target.value)} placeholder="e.g., Diabetes, Hypertension (optional)" className="min-h-[100px]" />
                                            </div>
                                        </div>

                                        {/* --- Lifestyle & Preferences Section --- */}
                                        <div className="pt-6 border-t">
                                            <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center"><Settings className="mr-2 h-5 w-5 text-momcare-secondary" /> Lifestyle & Preferences</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {/* Work Situation */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="workSituation">Work Situation</Label>
                                                    <Select value={workSituation} onValueChange={setWorkSituation}>
                                                        <SelectTrigger id="workSituation"><SelectValue placeholder="Select situation (optional)" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="working_full_time">Working Full-time</SelectItem>
                                                            <SelectItem value="working_part_time">Working Part-time</SelectItem>
                                                            <SelectItem value="self_employed">Self-employed</SelectItem>
                                                            <SelectItem value="on_leave">On Leave</SelectItem>
                                                            <SelectItem value="homemaker">Homemaker</SelectItem>
                                                            <SelectItem value="student">Student</SelectItem>
                                                            <SelectItem value="not_working">Not Currently Working</SelectItem>
                                                            <SelectItem value="other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {/* Activity Level */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="activityLevel">General Activity Level</Label>
                                                    <Select value={activityLevel} onValueChange={setActivityLevel}>
                                                        <SelectTrigger id="activityLevel"><SelectValue placeholder="Select level (optional)" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="sedentary">Sedentary (Little to no exercise)</SelectItem>
                                                            <SelectItem value="light">Light (Light exercise/walks 1-3 days/wk)</SelectItem>
                                                            <SelectItem value="moderate">Moderate (Moderate exercise 3-5 days/wk)</SelectItem>
                                                            <SelectItem value="active">Active (Heavy exercise 6-7 days/wk)</SelectItem>
                                                            <SelectItem value="very_active">Very Active (Very heavy exercise/physical job)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                {/* Partner Support (Sensitive) */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="partnerSupport">Partner Support Level</Label>
                                                    <Select value={partnerSupport} onValueChange={setPartnerSupport}>
                                                        <SelectTrigger id="partnerSupport"><SelectValue placeholder="Select level (optional)" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="very_supportive">Very Supportive</SelectItem>
                                                            <SelectItem value="supportive">Supportive</SelectItem>
                                                            <SelectItem value="somewhat_supportive">Somewhat Supportive</SelectItem>
                                                            <SelectItem value="limited_support">Limited Support</SelectItem>
                                                            <SelectItem value="not_applicable">Not Applicable</SelectItem>
                                                            <SelectItem value="prefer_not_to_say">Prefer Not To Say</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <p className="text-xs text-gray-500">This information is optional and handled sensitively.</p>
                                                </div>
                                                {/* Chat Tone Preference */}
                                                <div className="space-y-1.5">
                                                    <Label htmlFor="chatTone">Preferred Chat Tone</Label>
                                                    <Select value={chatTonePreference} onValueChange={setChatTonePreference}>
                                                        <SelectTrigger id="chatTone"><SelectValue placeholder="Select tone (optional)" /></SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="empathetic">Empathetic & Warm</SelectItem>
                                                            <SelectItem value="neutral">Neutral & Informative</SelectItem>
                                                            <SelectItem value="direct">Direct & Concise</SelectItem>
                                                            <SelectItem value="casual">Casual & Friendly</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            {/* Dietary Preferences */}
                                            <div className="mt-4 space-y-1.5">
                                                <Label htmlFor="dietaryPreferences">Dietary Preferences/Restrictions</Label>
                                                <Textarea
                                                    id="dietaryPreferences"
                                                    value={dietaryPreferences}
                                                    onChange={(e) => setDietaryPreferences(e.target.value)}
                                                    placeholder="e.g., Vegetarian, Gluten-free, Low-sodium (comma-separated, optional)"
                                                    className="min-h-[80px]"
                                                />
                                                <p className="text-xs text-gray-500">Enter preferences separated by commas.</p>
                                            </div>
                                        </div>

                                        {/* --- Save Button --- */}
                                        <div className="pt-6 border-t flex justify-end">
                                            <Button type="submit" className="bg-momcare-primary hover:bg-momcare-dark" disabled={isSaving}>
                                                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Profile...</> : <><Save className="mr-2 h-4 w-4" /> Save All Profile Info</>}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>

                            {/* Health Reading Input Card (remains unchanged) */}
                            <Card className="border-momcare-secondary/20">
                                <CardHeader className="bg-momcare-secondary/10">
                                    <CardTitle className="flex items-center text-momcare-secondary">
                                        <HeartPulse className="mr-2 h-5 w-5" /> Add New Health Reading
                                    </CardTitle>
                                    <CardDescription>Enter your latest BP, Blood Sugar, or Weight readings.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-6">
                                    {/* BP Input */}
                                    <div className="space-y-3 p-4 border rounded-md bg-red-50/30 border-red-100">
                                        <Label className="font-semibold text-red-700">Blood Pressure (mmHg)</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input type="number" placeholder="Systolic (e.g., 120)" value={systolic} onChange={e => setSystolic(e.target.value)} disabled={isSavingHealthData === 'bp'} />
                                            <Input type="number" placeholder="Diastolic (e.g., 80)" value={diastolic} onChange={e => setDiastolic(e.target.value)} disabled={isSavingHealthData === 'bp'} />
                                        </div>
                                        <Button onClick={handleSaveBP} size="sm" className="bg-red-500 hover:bg-red-600 text-white" disabled={isSavingHealthData === 'bp' || !systolic || !diastolic}>
                                            {isSavingHealthData === 'bp' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save BP"}
                                        </Button>
                                    </div>

                                    {/* Sugar Input */}
                                    <div className="space-y-3 p-4 border rounded-md bg-blue-50/30 border-blue-100">
                                        <Label className="font-semibold text-blue-700">Blood Sugar (mg/dL)</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input type="number" placeholder="Level (e.g., 95)" value={sugarLevel} onChange={e => setSugarLevel(e.target.value)} disabled={isSavingHealthData === 'sugar'} />
                                            <Select value={sugarType} onValueChange={(v) => setSugarType(v as any)} disabled={isSavingHealthData === 'sugar'}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="fasting">Fasting</SelectItem>
                                                    <SelectItem value="post_meal">Post-Meal</SelectItem>
                                                    <SelectItem value="random">Random</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button onClick={handleSaveSugar} size="sm" className="bg-blue-500 hover:bg-blue-600 text-white" disabled={isSavingHealthData === 'sugar' || !sugarLevel}>
                                            {isSavingHealthData === 'sugar' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Sugar"}
                                        </Button>
                                    </div>

                                    {/* Weight Input */}
                                    <div className="space-y-3 p-4 border rounded-md bg-green-50/30 border-green-100">
                                        <Label className="font-semibold text-green-700">Weight</Label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Input type="number" placeholder="Weight (e.g., 65.5)" value={weight} onChange={e => setWeight(e.target.value)} disabled={isSavingHealthData === 'weight'} />
                                            <Select value={weightUnit} onValueChange={(v) => setWeightUnit(v as any)} disabled={isSavingHealthData === 'weight'}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="kg">kg</SelectItem>
                                                    <SelectItem value="lbs">lbs</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Button onClick={handleSaveWeight} size="sm" className="bg-green-600 hover:bg-green-700 text-white" disabled={isSavingHealthData === 'weight' || !weight}>
                                            {isSavingHealthData === 'weight' ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Weight"}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                    </div>
                )}
            </div>
        </MainLayout>
    );
};

export default ProfilePage;