// src/pages/SymptomCheckerPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertTriangle, Sparkles, Info } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import { UserProfile, getUserProfile } from '@/lib/appwrite';
// --- Import general Groq service for the API call ---
import groqService, { ChatCompletionMessageParam } from '@/lib/groq';
// --- Import the specific prompt function from the new file ---
import { createSymptomCheckerPrompt } from '@/lib/groqSym'; // <--- UPDATED IMPORT

const SymptomCheckerPage: React.FC = () => {
    const { user, isAuthenticated } = useAuthStore();
    const { toast } = useToast();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
    const [symptomsInput, setSymptomsInput] = useState<string>('');
    const [aiResponse, setAiResponse] = useState<string | null>(null);
    const [isLoadingResponse, setIsLoadingResponse] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch user profile on mount (no changes needed here)
    useEffect(() => {
        const fetchProfile = async () => {
            if (isAuthenticated && user?.$id) {
                setIsLoadingProfile(true);
                try {
                    const userProfile = await getUserProfile(user.$id);
                    setProfile(userProfile);
                } catch (profileError) {
                    console.error("Error fetching profile for symptom checker:", profileError);
                    toast({
                        title: "Error Fetching Profile",
                        description: "Could not load your profile context. Symptom checker might be less accurate.",
                        variant: "destructive",
                    });
                } finally {
                    setIsLoadingProfile(false);
                }
            } else {
                setIsLoadingProfile(false);
                setProfile(null);
            }
        };
        fetchProfile();
    }, [user, isAuthenticated, toast]);

    const handleCheckSymptoms = useCallback(async () => {
        if (!symptomsInput.trim()) {
            setError("Please describe your symptoms before checking.");
            return;
        }
        // Check if the general Groq service (for sending messages) is available
        if (!groqService || typeof groqService.sendMessage !== 'function') {
             setError("AI service is not available or configured correctly. Please check configuration.");
             console.error("Groq service or sendMessage function missing.");
             return;
        }
        // Check if the specific prompt function was imported correctly
        if (typeof createSymptomCheckerPrompt !== 'function') {
             setError("Symptom checker prompt generation failed. Please contact support.");
             console.error("createSymptomCheckerPrompt function not available.");
             return;
        }


        setIsLoadingResponse(true);
        setError(null);
        setAiResponse(null);

        try {
            // --- Use the imported prompt function ---
            const systemPrompt = createSymptomCheckerPrompt(symptomsInput, profile); // <--- USE IMPORTED FUNCTION

            const messages: ChatCompletionMessageParam[] = [
                { role: 'system', content: systemPrompt },
            ];

            // Use the sendMessage function from the main groqService
            const response = await groqService.sendMessage(messages);

            setAiResponse(response);

        } catch (apiError: unknown) {
            console.error("Error getting symptom information from Groq:", apiError);
            const errorMessage = apiError instanceof Error ? apiError.message : "An unknown error occurred.";
            setError(`Failed to get information: ${errorMessage}`);
            toast({
                title: "AI Error",
                description: "Could not get information from the AI service.",
                variant: "destructive",
            });
        } finally {
            setIsLoadingResponse(false);
        }
    }, [symptomsInput, profile, toast]);

    // --- JSX remains the same as the previous corrected version ---
    return (
        <MainLayout requireAuth={true}>

            <div className="container mx-auto max-w-3xl py-8 md:py-12 px-4">
                <div className="text-center mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-momcare-primary tracking-tight">
                        Symptom Checker <span className="text-base align-top text-amber-500">(Beta)</span>
                    </h1>
                    <p className="mt-3 text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
                        Describe your symptoms to get general information about common possibilities during pregnancy.
                    </p>
                </div>

                <Alert variant="default" className="mb-6 bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <AlertTitle className="font-semibold">Important Disclaimer</AlertTitle>
                    <AlertDescription>
                        This tool provides <strong>general information only</strong> and is <strong>NOT a substitute for professional medical advice, diagnosis, or treatment.</strong> Always seek the advice of your doctor or other qualified health provider with any questions you may have regarding a medical condition. <strong>Never disregard professional medical advice or delay in seeking it because of something you have read here.</strong> If you think you may have a medical emergency, call your doctor or emergency services immediately.
                    </AlertDescription>
                </Alert>

                <Card className="shadow-lg border border-gray-200 dark:border-gray-700">
                    <CardHeader>
                        <CardTitle>Describe Your Symptoms</CardTitle>
                        <CardDescription>
                            Please provide details about what you are experiencing. The more specific you are, the better the general information provided can be. Include duration, severity (mild, moderate, severe), and location if applicable.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoadingProfile && (
                             <div className="space-y-2">
                                <Skeleton className="h-4 w-1/4" />
                                <Skeleton className="h-20 w-full" />
                                <Skeleton className="h-10 w-1/3" />
                             </div>
                        )}
                         {!isLoadingProfile && (
                             <>
                                {profile && (profile.weeksPregnant !== undefined || profile.preExistingConditions) && (
                                    <Alert variant="default" className="bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
                                        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        <AlertDescription className="text-xs">
                                            Context from your profile is being used:
                                            {profile.weeksPregnant !== undefined && ` ${profile.weeksPregnant} weeks pregnant`}
                                            {profile.preExistingConditions && profile.preExistingConditions.toLowerCase() !== 'none' && ` (Conditions noted: ${profile.preExistingConditions.substring(0,50)}...)`}.
                                            <a href="/profile" className="ml-1 underline font-medium">Edit Profile</a>
                                        </AlertDescription>
                                    </Alert>
                                )}
                                <div>
                                    <Label htmlFor="symptoms" className="text-base font-semibold">Your Symptoms:</Label>
                                    <Textarea
                                        id="symptoms"
                                        placeholder="e.g., Mild headache for the past 2 days, slight nausea in the mornings, occasional backache..."
                                        value={symptomsInput}
                                        onChange={(e) => { setSymptomsInput(e.target.value); setError(null); }}
                                        rows={5}
                                        className="mt-2 text-base"
                                        disabled={isLoadingResponse}
                                    />
                                </div>
                                <Button
                                    onClick={handleCheckSymptoms}
                                    disabled={isLoadingResponse || !symptomsInput.trim()}
                                    className="w-full md:w-auto bg-momcare-primary hover:bg-momcare-dark"
                                    aria-live="polite"
                                >
                                    {isLoadingResponse ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> Checking...</>
                                    ) : (
                                        <><Sparkles className="mr-2 h-4 w-4" aria-hidden="true" /> Get General Info</>
                                    )}
                                </Button>
                             </>
                         )}

                        {error && (
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {(isLoadingResponse || aiResponse) && (
                    <Card className="mt-6 shadow-lg border border-gray-200 dark:border-gray-700">
                        <CardHeader>
                            <CardTitle>AI Information</CardTitle>
                            <CardDescription>General information based on your description and profile context.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoadingResponse && (
                                <div className="space-y-3" aria-live="polite" aria-label="Loading AI response">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-5/6" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            )}
                            {aiResponse && !isLoadingResponse && (
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-li:my-0.5" aria-live="polite">
                                    <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        rehypePlugins={[rehypeRaw]}
                                        components={{
                                            a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-momcare-secondary hover:underline" />,
                                            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-momcare-primary/50 pl-4 italic text-gray-600 dark:text-gray-400" {...props} />,
                                        }}
                                    >
                                        {aiResponse}
                                    </ReactMarkdown>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>
        </MainLayout>
    );
};

export default SymptomCheckerPage;