// src/pages/MealPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
    UtensilsCrossed, Bike, Loader2, AlertTriangle, RefreshCw, Info,
    Salad, HeartPulse, Clock, Target, ShieldAlert, Lightbulb,
    BookOpen, ListChecks, Scale, Soup,
    X as CloseIcon
} from 'lucide-react';
import ReactMarkdown, { Options as ReactMarkdownOptions } from 'react-markdown';

// --- Appwrite & AI Imports ---
import { getUserProfile, UserProfile } from '@/lib/appwrite'; // Adjust path if needed
import {
    groqMealService, MealIdea, ExerciseSuggestion,
    PersonalizedContent, GenerationOptions
} from '@/lib/groqMeal'; // Adjust path if needed

// --- Sub-Components (Memoized for performance & UI Tweaks) ---

const MealIdeaCard: React.FC<{
    meal: MealIdea;
    onViewDetails: (meal: MealIdea) => void;
}> = React.memo(({ meal, onViewDetails }) => {
    const markdownComponents: ReactMarkdownOptions['components'] = {
        p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
        strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
    };
    return (
        <Card
            className="bg-white dark:bg-gray-800/50 border dark:border-gray-700 shadow-md rounded-lg flex flex-col h-full transition-all duration-200 ease-in-out hover:shadow-lg dark:hover:bg-gray-800 cursor-pointer group"
            onClick={() => onViewDetails(meal)}
            role="button" tabIndex={0}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onViewDetails(meal)}
        >
            <CardHeader className="pb-3 px-4 pt-4 md:px-5 md:pt-5">
                <CardTitle className="text-base font-semibold text-momcare-primary dark:text-momcare-accent flex items-center gap-2 group-hover:text-momcare-dark dark:group-hover:text-momcare-light transition-colors">
                    <UtensilsCrossed className="h-4 w-4 flex-shrink-0"/>{meal.name}
                </CardTitle>
                <div className="text-xs pt-1.5 space-x-1.5 flex flex-wrap items-center text-muted-foreground">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">{meal.mealType}</Badge>
                    {meal.prepTime && (<span className="inline-flex items-center text-gray-600 dark:text-gray-400"><Clock className="h-3 w-3 mr-1 opacity-70" /> {meal.prepTime}</span>)}
                    {meal.recipeComplexity && (<span className="inline-flex items-center text-gray-600 dark:text-gray-400"><BookOpen className="h-3 w-3 mr-1 opacity-70" /> {meal.recipeComplexity}</span>)}
                </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 dark:text-gray-300 flex-grow pb-4 px-4 md:px-5 space-y-3">
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed line-clamp-3">
                    <ReactMarkdown components={markdownComponents}>{meal.description}</ReactMarkdown>
                </div>
                {meal.keyIngredients && meal.keyIngredients.length > 0 && (<div><h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1"><ListChecks className="h-3.5 w-3.5"/>Key Ingredients:</h4><p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{meal.keyIngredients.join(', ')}</p></div>)}
                {meal.dietaryNotes && meal.dietaryNotes.length > 0 && (<div className="flex flex-wrap gap-1.5">{meal.dietaryNotes.map(note => <Badge key={note} variant="secondary" className="text-xs px-1.5 py-0.5">{note}</Badge>)}</div>)}
                <div className="text-right mt-auto pt-2">
                     <span className="text-xs text-momcare-primary dark:text-momcare-accent font-medium group-hover:underline">View Details →</span>
                 </div>
            </CardContent>
        </Card>
    );
});

const ExerciseSuggestionCard: React.FC<{ exercise: ExerciseSuggestion }> = React.memo(({ exercise }) => {
    const markdownComponentsDesc: ReactMarkdownOptions['components'] = { p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />, strong: ({node, ...props}) => <strong className="font-semibold" {...props} />, };
    const markdownComponentsSafety: ReactMarkdownOptions['components'] = { p: ({node, ...props}) => <span {...props} />, strong: ({node, ...props}) => <strong className="font-semibold" {...props} />, };
    return (
        <Card className="bg-white dark:bg-gray-800/50 border dark:border-gray-700 shadow-md rounded-lg flex flex-col h-full transition-all duration-200 ease-in-out hover:shadow-lg dark:hover:bg-gray-800">
             <CardHeader className="pb-3 px-4 pt-4 md:px-5 md:pt-5">
                <CardTitle className="text-base font-semibold text-momcare-secondary dark:text-blue-400 flex items-center gap-2"><Bike className="h-4 w-4 flex-shrink-0"/>{exercise.name}</CardTitle>
                <div className="text-xs pt-1.5 space-x-1.5 flex flex-wrap items-center text-muted-foreground">
                    <Badge variant="outline" className="text-xs px-1.5 py-0.5">{exercise.intensity}</Badge>
                    {exercise.durationReps && (<span className="inline-flex items-center text-gray-600 dark:text-gray-400"><Clock className="h-3 w-3 mr-1 opacity-70" /> {exercise.durationReps}</span>)}
                    {exercise.focusArea && (<span className="inline-flex items-center text-gray-600 dark:text-gray-400"><Target className="h-3 w-3 mr-1 opacity-70" /> {exercise.focusArea}</span>)}
                </div>
            </CardHeader>
            <CardContent className="text-sm text-gray-700 dark:text-gray-300 flex-grow pb-4 px-4 md:px-5 space-y-3">
                <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed"><ReactMarkdown components={markdownComponentsDesc}>{exercise.description}</ReactMarkdown></div>
                <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 p-2.5 rounded-md border border-amber-200 dark:border-amber-700/60 flex items-start gap-2 my-2">
                    <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                     <span className="prose-xs dark:prose-invert max-w-none"><ReactMarkdown components={markdownComponentsSafety}>{`**Safety:** ${exercise.safetyNotes}`}</ReactMarkdown></span>
                </div>
                {exercise.reasoning && (<p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5 italic flex items-start gap-1.5"><Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-500" /><span>{exercise.reasoning}</span></p>)}
            </CardContent>
        </Card>
    );
});


// --- Main Page Component ---
const MealPage: React.FC = () => {
  // --- Hooks ---
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();

  // --- State Definitions ---
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customPreference, setCustomPreference] = useState<string>('');
  const [selectedMeal, setSelectedMeal] = useState<MealIdea | null>(null);
  const [isMealDetailOpen, setIsMealDetailOpen] = useState<boolean>(false);
  // --- ADDED STATE for Suggestion Count ---
  const [suggestionCount, setSuggestionCount] = useState<number>(3); // Default count

  // --- Callbacks ---

  /** Fetches personalized content from the Groq AI service. */
  const generateContent = useCallback(async (
        currentProfile: UserProfile,
        preference?: string
    ) => {
    if (isLoadingContent) return;
    console.log("Attempting generation. Preference:", preference || "None", "Count:", suggestionCount); // Log count
    setIsLoadingContent(true); setError(null);
    try {
        const options: GenerationOptions = {
            contentType: 'both',
            // --- USE STATE for Count ---
            count: suggestionCount,
            customPreference: preference?.trim() || undefined,
        };
        if (!groqMealService?.generatePersonalizedContent) throw new Error("Service unavailable.");
        const content = await groqMealService.generatePersonalizedContent(currentProfile, options);
        setPersonalizedContent(content);
    } catch (err: any) {
      const msg = err.message || "Failed to generate suggestions.";
      setError(msg); setPersonalizedContent(null);
      toast({ title: "Suggestion Error", description: msg, variant: "destructive" });
    } finally { setIsLoadingContent(false); }
  // --- ADD suggestionCount to dependency array ---
  }, [toast, isLoadingContent, suggestionCount]); // Added suggestionCount

  /** Fetches the user's profile from Appwrite. */
  const fetchUserProfile = useCallback(async () => {
    if (!isAuthenticated || !user?.$id) {
        if (!isAuthenticated) { setUserProfile(null); setPersonalizedContent(null); setError("Please log in..."); }
        setIsLoadingProfile(false); return;
    }
    console.log("Starting fetch profile for:", user.$id);
    setIsLoadingProfile(true); setError(null);
    try {
      const profile = await getUserProfile(user.$id);
      if (!profile) {
        setError("Profile not found. Please complete profile..."); setUserProfile(null);
        toast({ title: "Profile Needed", description: "Complete your profile...", variant: "default" });
      } else {
        setUserProfile(profile);
        console.log("Profile loaded, triggering initial content gen...");
        generateContent(profile); // Pass fetched profile
      }
    } catch (err: any) {
      setError("Could not load profile data..."); setUserProfile(null);
      toast({ title: "Profile Load Error", description: err.message || "Failed.", variant: "destructive" });
    } finally { setIsLoadingProfile(false); }
  // --- generateContent is now dependent on suggestionCount, so add it here too ---
  }, [user?.$id, isAuthenticated, toast, generateContent]); // Added generateContent


  // --- Effects ---
  /** Effect to fetch profile on initial mount or auth changes. */
  useEffect(() => {
    console.log("Auth Effect: Auth=", isAuthenticated, "User=", user?.$id);
    if (isAuthenticated && user?.$id) { fetchUserProfile(); }
    else {
        setIsLoadingProfile(false); setUserProfile(null); setPersonalizedContent(null); setError(null);
        if (!isAuthenticated) { setError("Please log in..."); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.$id]); // fetchUserProfile removed as per previous fix


  // --- Event Handlers ---
  /** Handles the click event for the 'Regenerate Suggestions' button. */
  const handleRegenerate = () => {
    if (!userProfile) {
      toast({ title: "Profile Needed", description: "Cannot regenerate without a profile.", variant:"default" });
      if (!isLoadingProfile && error?.includes("profile")) { fetchUserProfile(); }
      return;
    }
    // generateContent will use the current suggestionCount state
    generateContent(userProfile, customPreference);
  };

  /** Opens the Meal Detail Dialog. */
  const handleViewMealDetails = useCallback((meal: MealIdea) => {
      setSelectedMeal(meal);
      setIsMealDetailOpen(true);
  }, []);


  // --- Render Functions ---
  /** Renders the loading state indicator. */
  const renderLoading = () => ( <div className="flex flex-col items-center justify-center py-20 text-center"> <Loader2 className="h-12 w-12 text-momcare-primary animate-spin mb-4" /> <p className="text-lg font-medium text-gray-700 dark:text-gray-300">{isLoadingProfile ? "Loading profile..." : "Generating suggestions..."}</p> <p className="text-sm text-gray-500 dark:text-gray-400">Just a moment...</p> </div> );
  /** Renders the error message card with appropriate actions. */
  const renderError = () => ( error && ( <Card className="border-destructive bg-red-50 dark:bg-red-900/20 my-8 shadow-lg rounded-lg"> <CardHeader> <CardTitle className="text-destructive dark:text-red-400 flex items-center gap-2"><AlertTriangle className="h-5 w-5"/> Error Occurred</CardTitle> </CardHeader> <CardContent className="text-destructive/90 dark:text-red-400/90 space-y-2"> <p>{error}</p> {!isAuthenticated && error.includes("log in") && ( <p className="mt-2">Please <Link to="/login" className="underline font-semibold hover:text-destructive/80">log in</Link> or <Link to="/signup" className="underline font-semibold hover:text-destructive/80">sign up</Link>.</p> )} {isAuthenticated && error.includes("Profile not found") && ( <Button variant="link" className="p-0 h-auto mt-2 text-destructive dark:text-red-400 hover:text-destructive/80" asChild> <Link to="/profile">Go to Your Profile</Link> </Button> )} {error && (error.includes("profile") || error.includes("generate suggestions")) && ( <Button variant="destructive" size="sm" onClick={() => error.includes("profile") ? fetchUserProfile() : handleRegenerate()} className="mt-4" disabled={isLoadingContent || isLoadingProfile} > <RefreshCw className="mr-2 h-4 w-4"/> Try Again </Button> )} </CardContent> </Card> ) );
  /** Renders the state when no suggestions have been generated yet, after profile load. */
  const renderEmptyState = (section: 'meals' | 'exercises' | 'initial') => { const icon = section === 'meals' ? Salad : HeartPulse; const title = section === 'meals' ? "No Meal Ideas Yet" : section === 'exercises' ? "No Exercise Suggestions Yet" : "Ready for Suggestions?"; const message = section === 'initial' ? "Click below to generate personalized meal and exercise ideas..." : `No specific ${section === 'meals' ? 'meal ideas' : 'exercise suggestions'} generated...`; return ( <div className={`text-center py-12 px-6 bg-gray-50 dark:bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 ${section !== 'initial' ? 'min-h-[200px] flex flex-col justify-center items-center' : ''}`}> {React.createElement(icon, { className: `h-12 w-12 ${section === 'initial' ? 'lg:h-16 lg:w-16' : ''} text-gray-400 dark:text-gray-500 mx-auto mb-4` })} <h3 className={`font-semibold text-gray-800 dark:text-gray-200 mb-2 ${section === 'initial' ? 'text-xl lg:text-2xl' : 'text-lg'}`}>{title}</h3> <p className={`text-gray-600 dark:text-gray-400 max-w-md mx-auto ${section === 'initial' ? 'text-base mb-6' : 'text-sm'}`}> {message} </p> {section === 'initial' && ( <Button onClick={handleRegenerate} disabled={isLoadingContent || !userProfile || isLoadingProfile}> <RefreshCw className="mr-2 h-4 w-4" /> Generate Suggestions </Button> )} </div> ); }

  // Determine overall loading state
  const showOverallLoading = isLoadingProfile || (isLoadingContent && !personalizedContent && !error);

  // --- Main Component JSX ---
  return (
    <MainLayout requireAuth={true}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Page Header */}
        <div className="mb-10 md:mb-14 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-momcare-primary dark:text-momcare-light sm:text-4xl tracking-tight">
            Personalized Meals & Exercises
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto md:mx-0">
            AI-powered suggestions tailored to your pregnancy journey.
          </p>
        </div>

        {/* --- Primary Conditional Rendering --- */}
        {showOverallLoading ? renderLoading() :
         error ? renderError() :
         (
          <div className="space-y-10 md:space-y-12">
            {/* Input for Custom Preference & Regenerate Button */}
            <Card className="bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-800/80 border dark:border-gray-700 shadow-sm rounded-lg">
                <CardContent className="p-5 md:p-6 flex flex-col sm:flex-row items-center flex-wrap gap-4"> {/* Added flex-wrap */}
                   {/* Custom Preference Input */}
                   <div className="flex-grow w-full sm:w-auto sm:min-w-[300px]"> {/* Adjusted width */}
                      <Label htmlFor="custom-preference" className="sr-only">Custom Preference</Label>
                      <Input id="custom-preference" type="text" placeholder="Any cravings or requests? (e.g., 'easy dinner ideas')" value={customPreference} onChange={(e) => setCustomPreference(e.target.value)} disabled={isLoadingContent || !userProfile} className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 h-10" aria-label="Custom preference for suggestions" />
                   </div>
                   {/* Suggestion Count Input */}
                   <div className="flex-shrink-0 w-full xs:w-auto"> {/* Adjusted width for small screens */}
                       <div className="flex items-center gap-2">
                         <Label htmlFor="suggestion-count" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Suggestions:</Label>
                         <Input
                           id="suggestion-count"
                           type="number"
                           min="1" max="8" // Adjusted max slightly
                           value={suggestionCount}
                           onChange={(e) => setSuggestionCount(Math.max(1, parseInt(e.target.value) || 1))}
                           disabled={isLoadingContent || !userProfile}
                           className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 h-10 w-20 text-center"
                           aria-label="Number of suggestions per category"
                         />
                       </div>
                       <p className="text-xs text-center text-gray-500 mt-1 hidden sm:block">(1-8 per type)</p> {/* Hide helper text on very small screens */}
                   </div>
                   {/* Regenerate Button */}
                   <Button onClick={handleRegenerate} disabled={isLoadingContent || !userProfile} className="w-full sm:w-auto flex-shrink-0 bg-momcare-primary hover:bg-momcare-dark h-10 px-5" title="Generate new suggestions" >
                      {isLoadingContent ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <RefreshCw className="mr-2 h-4 w-4" /> )}
                      {personalizedContent ? 'Regenerate' : 'Generate'} {/* Shortened text */}
                    </Button>
                </CardContent>
            </Card>

            {/* Disclaimer */}
            {userProfile && ( <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4 md:p-5 flex items-start shadow-sm"> <Info className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" /> <div> <h3 className="font-medium text-blue-800 dark:text-blue-300">Important Disclaimer</h3> <p className="text-blue-700 dark:text-blue-300/90 text-sm mt-1"> Suggestions are AI-generated and informational only, not medical advice. <b>Always consult your healthcare professional</b> before changing your diet or exercise routine. </p> </div> </div> )}

            {/* Generated Content Display Area */}
            {personalizedContent ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                    {/* Meal Ideas Section */}
                    <section className="space-y-5">
                        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3"> <UtensilsCrossed className="h-6 w-6 text-momcare-primary dark:text-momcare-accent" /> Meal Ideas ({personalizedContent.meals.length}) </h2>
                        <Separator className="dark:bg-gray-700"/>
                        {personalizedContent.meals.length > 0 ? ( <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"> {personalizedContent.meals.map(meal => <MealIdeaCard key={meal.id} meal={meal} onViewDetails={handleViewMealDetails} />)} </div> ) : ( renderEmptyState('meals') )}
                    </section>
                    {/* Exercise Suggestions Section */}
                    <section className="space-y-5">
                         <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3"> <Bike className="h-6 w-6 text-momcare-secondary dark:text-blue-400" /> Gentle Exercise Suggestions ({personalizedContent.exercises.length}) </h2>
                         <Separator className="dark:bg-gray-700"/>
                         {personalizedContent.exercises.length > 0 ? ( <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6"> {personalizedContent.exercises.map(ex => <ExerciseSuggestionCard key={ex.id} exercise={ex} />)} </div> ) : ( renderEmptyState('exercises') )}
                    </section>
                </div>
            ) : ( !isLoadingContent && userProfile && renderEmptyState('initial') )}
          </div>
         )
        }
      </div>

      {/* --- Meal Detail Dialog --- */}
      <Dialog open={isMealDetailOpen} onOpenChange={setIsMealDetailOpen}>
            <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
                {selectedMeal && (
                    <>
                        <DialogHeader className="pr-10 relative">
                            <DialogTitle className="text-xl md:text-2xl font-bold text-momcare-primary dark:text-momcare-light">{selectedMeal.name}</DialogTitle>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mt-1.5 text-muted-foreground">
                                <Badge variant="secondary">{selectedMeal.mealType}</Badge>
                                {selectedMeal.prepTime && <span className='inline-flex items-center'><Clock className="h-3 w-3 mr-1"/> Prep: {selectedMeal.prepTime}</span>}
                                {selectedMeal.cookingTime && <span className='inline-flex items-center'><Clock className="h-3 w-3 mr-1"/> Cook: {selectedMeal.cookingTime}</span>}
                                {selectedMeal.recipeComplexity && <span className='inline-flex items-center'><BookOpen className="h-3 w-3 mr-1"/> {selectedMeal.recipeComplexity}</span>}
                                {selectedMeal.servingSize && <span className='inline-flex items-center'><Soup className="h-3 w-3 mr-1"/> {selectedMeal.servingSize}</span>}
                            </div>
                            <DialogClose className="absolute right-3 top-3 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground p-1"> <CloseIcon className="h-5 w-5" /> <span className="sr-only">Close</span> </DialogClose>
                        </DialogHeader>
                        <Separator className="my-4 dark:bg-gray-700" />
                        <div className="grid gap-5 py-4 px-1 text-sm md:text-base">
                            <div className="prose prose-sm dark:prose-invert max-w-none leading-normal"> <ReactMarkdown>{selectedMeal.description}</ReactMarkdown> </div>
                            {selectedMeal.keyIngredients && selectedMeal.keyIngredients.length > 0 && ( <div className='space-y-1.5'> <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><ListChecks className="h-4 w-4"/>Ingredients</h3> <ul className="list-disc list-outside pl-5 text-gray-600 dark:text-gray-300 space-y-0.5 text-sm marker:text-gray-400 dark:marker:text-gray-500"> {selectedMeal.keyIngredients.map((ing, i) => <li key={`ing-${i}`}>{ing}</li>)} </ul> </div> )}
                            {selectedMeal.preparationSteps && selectedMeal.preparationSteps.length > 0 && ( <div className='space-y-1.5'> <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200">Preparation Steps</h3> <ol className="list-decimal list-outside pl-5 text-gray-600 dark:text-gray-300 space-y-1.5 text-sm marker:font-medium marker:text-gray-500 dark:marker:text-gray-400"> {selectedMeal.preparationSteps.map((step, i) => <li key={`step-${i}`}>{step}</li>)} </ol> </div> )}
                            {selectedMeal.macros && ( <div className='space-y-1'> <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><Scale className="h-4 w-4" /> Estimated Macros</h3> <p className="text-gray-600 dark:text-gray-300 text-sm">{selectedMeal.macros}</p> <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">(Note: Estimates only, can vary based on ingredients/portions.)</p> </div> )}
                            {selectedMeal.dietaryNotes && selectedMeal.dietaryNotes.length > 0 && ( <div className='space-y-1'> <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200">Dietary Notes</h3> <div className="flex flex-wrap gap-1.5"> {selectedMeal.dietaryNotes.map(note => <Badge key={note} variant="secondary" className="text-xs">{note}</Badge>)} </div> </div> )}
                            {selectedMeal.reasoning && ( <div className='space-y-1'> <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-yellow-500"/> AI Reasoning</h3> <p className="text-gray-600 dark:text-gray-300 text-sm italic">"{selectedMeal.reasoning}"</p> </div> )}
                        </div>
                        <Separator className="my-4 dark:bg-gray-700" />
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 px-4 pb-2"> Information is AI-generated. Always consult your healthcare provider for personalized advice. </p>
                    </>
                )}
            </DialogContent>
        </Dialog>

    </MainLayout>
  );
};

export default MealPage;