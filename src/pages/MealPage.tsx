// src/pages/MealPage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  FC
} from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Layout and Store
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/store/authStore';

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

// Icons
import {
  UtensilsCrossed, Bike, Loader2, AlertTriangle, RefreshCw, Info,
  Salad, HeartPulse, Clock, Target, ShieldAlert, Lightbulb,
  BookOpen, ListChecks, Scale, Soup, Sparkles,
  X as CloseIcon
} from 'lucide-react';

// Markdown Renderer
import ReactMarkdown, { Options as ReactMarkdownOptions } from 'react-markdown';

// Appwrite & AI Service Imports
import { getUserProfile, UserProfile } from '@/lib/appwrite';
// --- Import specialized meal service types/functions ---
import { groqMealService, MealIdea, MealGenerationOptions } from '@/lib/groqMeal';
// --- Import specialized exercise service types/functions ---
import { groqExeService, ExerciseSuggestion, ExerciseGenerationOptions as ExeGenerationOptions } from '@/lib/groqExe'; // Using alias ExeGenerationOptions for clarity

// Helper Function for Profile Completeness
const isProfileComplete = (profile: UserProfile | null): boolean => {
  if (!profile) {
    return false;
  }
  // Basic check - adjust required fields as needed
  const isAgePresent = typeof profile.age === 'number' && profile.age > 0;
  const isWeeksPregnantPresent = typeof profile.weeksPregnant === 'number' && profile.weeksPregnant >= 0;
  const isActivityLevelPresent = typeof profile.activityLevel === 'string' && profile.activityLevel.trim() !== '';
  return isAgePresent && isWeeksPregnantPresent && isActivityLevelPresent;
};


// --- Sub-Components (Memoized for Performance) ---

interface MealIdeaCardProps {
  meal: MealIdea;
  onViewDetails: (meal: MealIdea) => void;
}
const MealIdeaCard: FC<MealIdeaCardProps> = React.memo(({ meal, onViewDetails }) => {
  const markdownComponents: ReactMarkdownOptions['components'] = {
      p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
      strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
  };

  return (
      <Card
          className="bg-white dark:bg-gray-800/50 border dark:border-gray-700 shadow-md rounded-lg flex flex-col h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 dark:hover:bg-gray-800 cursor-pointer group"
          onClick={() => onViewDetails(meal)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onViewDetails(meal)}
          aria-label={`View details for ${meal.name}`}
      >
           <CardHeader className="pb-3 px-4 pt-4 md:px-5 md:pt-5">
              <CardTitle className="text-base font-semibold text-momcare-primary dark:text-momcare-accent flex items-center gap-2 group-hover:text-momcare-dark dark:group-hover:text-momcare-light transition-colors">
                  <UtensilsCrossed className="h-4 w-4 flex-shrink-0" aria-hidden="true"/>{meal.name}
              </CardTitle>
              <div className="text-xs pt-1.5 space-x-1.5 flex flex-wrap items-center text-muted-foreground">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">{meal.mealType}</Badge>
                  {meal.prepTime && (<span className="inline-flex items-center text-gray-600 dark:text-gray-400"><Clock className="h-3 w-3 mr-1 opacity-70" aria-hidden="true" /> {meal.prepTime}</span>)}
                  {meal.recipeComplexity && (<span className="inline-flex items-center text-gray-600 dark:text-gray-400"><BookOpen className="h-3 w-3 mr-1 opacity-70" aria-hidden="true" /> {meal.recipeComplexity}</span>)}
              </div>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 dark:text-gray-300 flex-grow pb-4 px-4 md:px-5 space-y-3">
              <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed line-clamp-3 group-hover:line-clamp-none transition-[line-clamp] duration-300">
                  <ReactMarkdown components={markdownComponents}>{meal.description}</ReactMarkdown>
              </div>
              {meal.keyIngredients && meal.keyIngredients.length > 0 && (
                  <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                          <ListChecks className="h-3.5 w-3.5" aria-hidden="true"/>Key Ingredients:
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1">{meal.keyIngredients.join(', ')}</p>
                  </div>
              )}
              {meal.dietaryNotes && meal.dietaryNotes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                      {meal.dietaryNotes.map(note => <Badge key={note} variant="secondary" className="text-xs px-1.5 py-0.5">{note}</Badge>)}
                  </div>
              )}
              <div className="text-right mt-auto pt-2">
                   <span className="text-xs text-momcare-primary dark:text-momcare-accent font-medium group-hover:underline">View Details →</span>
               </div>
          </CardContent>
      </Card>
  );
});
MealIdeaCard.displayName = 'MealIdeaCard';

interface ExerciseSuggestionCardProps {
  exercise: ExerciseSuggestion;
}
const ExerciseSuggestionCard: FC<ExerciseSuggestionCardProps> = React.memo(({ exercise }) => {
  const markdownComponentsDesc: ReactMarkdownOptions['components'] = { p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />, strong: ({node, ...props}) => <strong className="font-semibold" {...props} />, };
  const markdownComponentsSafety: ReactMarkdownOptions['components'] = { p: ({node, ...props}) => <span {...props} />, strong: ({node, ...props}) => <strong className="font-semibold" {...props} />, };
  return (
      <Card className="bg-white dark:bg-gray-800/50 border dark:border-gray-700 shadow-md rounded-lg flex flex-col h-full transition-all duration-300 ease-in-out hover:shadow-lg hover:-translate-y-1 dark:hover:bg-gray-800">
           <CardHeader className="pb-3 px-4 pt-4 md:px-5 md:pt-5">
              <CardTitle className="text-base font-semibold text-momcare-secondary dark:text-blue-400 flex items-center gap-2">
                  <Bike className="h-4 w-4 flex-shrink-0" aria-hidden="true"/>{exercise.name}
              </CardTitle>
              <div className="text-xs pt-1.5 space-x-1.5 flex flex-wrap items-center text-muted-foreground">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">{exercise.intensity}</Badge>
                  {exercise.durationReps && (<span className="inline-flex items-center text-gray-600 dark:text-gray-400"><Clock className="h-3 w-3 mr-1 opacity-70" aria-hidden="true" /> {exercise.durationReps}</span>)}
                  {exercise.focusArea && (<span className="inline-flex items-center text-gray-600 dark:text-gray-400"><Target className="h-3 w-3 mr-1 opacity-70" aria-hidden="true" /> {exercise.focusArea}</span>)}
              </div>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 dark:text-gray-300 flex-grow pb-4 px-4 md:px-5 space-y-3">
              <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                  <ReactMarkdown components={markdownComponentsDesc}>{exercise.description}</ReactMarkdown>
              </div>
              <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 p-2.5 rounded-md border border-amber-200 dark:border-amber-700/60 flex items-start gap-2 my-2">
                  <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                   <span className="prose-xs dark:prose-invert max-w-none">
                       <ReactMarkdown components={markdownComponentsSafety}>{`**Safety:** ${exercise.safetyNotes}`}</ReactMarkdown>
                   </span>
              </div>
              {exercise.reasoning && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5 italic flex items-start gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-yellow-500" aria-hidden="true" />
                      <span>{exercise.reasoning}</span>
                  </p>
               )}
          </CardContent>
      </Card>
  );
});
ExerciseSuggestionCard.displayName = 'ExerciseSuggestionCard';

// --- Main Page Component ---
const MealPage: FC = () => {
  // --- Hooks ---
  const { user, isAuthenticated } = useAuthStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  // --- State ---
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isProfileConsideredComplete, setIsProfileConsideredComplete] = useState<boolean>(false);
  const [mealSuggestions, setMealSuggestions] = useState<MealIdea[] | null>(null);
  const [exerciseSuggestions, setExerciseSuggestions] = useState<ExerciseSuggestion[] | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isLoadingMeals, setIsLoadingMeals] = useState<boolean>(false);
  const [isLoadingExercises, setIsLoadingExercises] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [customPreference, setCustomPreference] = useState<string>('');
  const [selectedMeal, setSelectedMeal] = useState<MealIdea | null>(null);
  const [isMealDetailOpen, setIsMealDetailOpen] = useState<boolean>(false);
  const [suggestionCount, setSuggestionCount] = useState<number>(3);
  const [hasGeneratedMeals, setHasGeneratedMeals] = useState<boolean>(false); // Track if generation was attempted
  const [hasGeneratedExercises, setHasGeneratedExercises] = useState<boolean>(false); // Track if generation was attempted

  // --- Refs ---
  const isMounted = useRef(true);
  const isGeneratingMeals = useRef(false);
  const isGeneratingExercises = useRef(false);

  // --- Callbacks ---

  // Check if profile is complete and loaded before allowing generation
  const canGenerate = useCallback((): boolean => {
    if (!userProfile) {
        toast({ title: "Profile Not Loaded", description: "Cannot generate suggestions until your profile is loaded.", variant:"default" });
        return false;
    }
    if (!isProfileConsideredComplete) {
        toast({ title: "Profile Incomplete", description: "Please complete your profile before generating suggestions.", variant: "default" });
        navigate('/profile', { replace: true, state: { message: 'Complete your profile to generate recommendations.' } });
        return false;
    }
    return true;
  }, [userProfile, isProfileConsideredComplete, toast, navigate]);

  // Generate Meal Suggestions
  const generateMealSuggestions = useCallback(async () => {
    if (!canGenerate() || isGeneratingMeals.current || !userProfile) return; // Added userProfile check

    isGeneratingMeals.current = true;
    if (isMounted.current) {
        setIsLoadingMeals(true);
        setError(null); // Clear general error on new attempt
        setHasGeneratedMeals(true); // Mark that generation was attempted
    }

    try {
        // Use the specialized MealGenerationOptions type
        const options: MealGenerationOptions = {
            count: suggestionCount,
            customPreference: customPreference?.trim() || undefined,
            // No 'contentType' needed here
        };

        // Check for the correct function existence
        if (!groqMealService?.generatePersonalizedMeals) {
            throw new Error("Meal suggestion service is unavailable.");
        }

        // Call the correct specialized function
        const content = await groqMealService.generatePersonalizedMeals(userProfile, options);

        if (isMounted.current) {
            setMealSuggestions(content.meals || []); // Update only meal suggestions
        }

    } catch (err: any) {
        const msg = err.message || "Failed to generate meal suggestions.";
        if (isMounted.current) {
            setError(msg); // Set general error
            setMealSuggestions(null); // Clear meals on error
            toast({
                title: "Meal Suggestion Error",
                description: msg.includes("Rate limit") ? "Too many requests. Please wait a moment and try again." : msg,
                variant: "destructive"
            });
        }
    } finally {
        if (isMounted.current) setIsLoadingMeals(false);
        isGeneratingMeals.current = false;
    }
  }, [canGenerate, userProfile, suggestionCount, customPreference, toast]);

  // Generate Exercise Suggestions
  const generateExerciseSuggestions = useCallback(async () => {
    if (!canGenerate() || isGeneratingExercises.current || !userProfile) return; // Added userProfile check

    isGeneratingExercises.current = true;
    if (isMounted.current) {
        setIsLoadingExercises(true);
        setError(null); // Clear general error on new attempt
        setHasGeneratedExercises(true); // Mark that generation was attempted
    }

    try {
        // Use the specialized ExeGenerationOptions type
        const options: ExeGenerationOptions = {
            count: suggestionCount,
            customPreference: customPreference?.trim() || undefined,
            // No 'contentType' needed here
        };

        // Check for the correct function existence
        if (!groqExeService?.generateExerciseSuggestions) {
            throw new Error("Exercise suggestion service is unavailable.");
        }

        // Call the correct specialized function
        const content = await groqExeService.generateExerciseSuggestions(userProfile, options);

        if (isMounted.current) {
            setExerciseSuggestions(content.exercises || []); // Update only exercise suggestions
        }

    } catch (err: any) {
        const msg = err.message || "Failed to generate exercise suggestions.";
        if (isMounted.current) {
            setError(msg); // Set general error
            setExerciseSuggestions(null); // Clear exercises on error
            toast({
                title: "Exercise Suggestion Error",
                description: msg.includes("Rate limit") ? "Too many requests. Please wait a moment and try again." : msg,
                variant: "destructive"
            });
        }
    } finally {
        if (isMounted.current) setIsLoadingExercises(false);
        isGeneratingExercises.current = false;
    }
  }, [canGenerate, userProfile, suggestionCount, customPreference, toast]);

  // --- Effects ---

  // Effect runs on mount and when auth state changes to load profile
  useEffect(() => {
    isMounted.current = true;
    let didCancel = false;

    const fetchProfile = async () => {
        if (!isAuthenticated || !user?.$id) {
            if (isMounted.current && !didCancel) {
                setIsLoadingProfile(false);
                setUserProfile(null);
                setMealSuggestions(null);
                setExerciseSuggestions(null);
                setIsProfileConsideredComplete(false);
                setHasGeneratedMeals(false);
                setHasGeneratedExercises(false);
                if (!isAuthenticated) setError("Please log in to view suggestions.");
            }
            return;
        }

        if (isMounted.current && !didCancel) {
            setIsLoadingProfile(true);
            setError(null);
            setMealSuggestions(null); // Clear old content
            setExerciseSuggestions(null);
            setIsProfileConsideredComplete(false);
            setHasGeneratedMeals(false);
            setHasGeneratedExercises(false);
        }


        try {
            const profile = await getUserProfile(user.$id);

            if (didCancel || !isMounted.current) return; // Check again after async call

            setUserProfile(profile);

            if (profile) {
                const isComplete = isProfileComplete(profile);
                setIsProfileConsideredComplete(isComplete);

                if (!isComplete) {
                    setError("Your profile is incomplete. Please update it for recommendations.");
                    toast({
                        title: "Profile Update Needed",
                        description: "Please fill in all required profile details to get personalized recommendations.",
                        variant: "default", duration: 7000,
                    });
                    navigate('/profile', {
                        replace: true,
                        state: { message: 'Please complete your profile to access recommendations.' }
                    });
                }
                // No automatic generation on load
            } else {
                setError("Profile not found. Please create or complete your profile.");
                setIsProfileConsideredComplete(false);
                toast({
                    title: "Profile Needed",
                    description: "Create or complete your profile to get personalized recommendations.",
                    variant: "default", duration: 7000,
                });
                navigate('/profile', {
                    replace: true,
                    state: { message: 'Please create/complete your profile to access recommendations.' }
                });
            }
        } catch (err: any) {
            if (!didCancel && isMounted.current) {
                setError(`Could not load profile data: ${err.message || 'Unknown error'}`);
                setUserProfile(null);
                setIsProfileConsideredComplete(false);
                toast({ title: "Profile Load Error", description: err.message || "Failed to load profile.", variant: "destructive" });
            }
        } finally {
            if (!didCancel && isMounted.current) {
                setIsLoadingProfile(false);
            }
        }
    };

    fetchProfile();

    return () => {
        isMounted.current = false;
        didCancel = true;
    };
  }, [isAuthenticated, user?.$id, navigate, toast]);


  /** Opens the Meal Detail Dialog */
  const handleViewMealDetails = useCallback((meal: MealIdea) => {
      setSelectedMeal(meal);
      setIsMealDetailOpen(true);
  }, []);


  // --- Render Functions ---

  const renderLoadingSkeleton = (count: number = 2) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {Array.from({ length: count }).map((_, index) => (
            <Card key={index} className="bg-white dark:bg-gray-800/50 border dark:border-gray-700 shadow-md rounded-lg flex flex-col h-full">
                <CardHeader className="pb-3 px-4 pt-4 md:px-5 md:pt-5">
                    <Skeleton className="h-5 w-3/5 mb-2" />
                    <Skeleton className="h-3 w-4/5" />
                </CardHeader>
                <CardContent className="flex-grow pb-4 px-4 md:px-5 space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="pt-2">
                        <Skeleton className="h-3 w-1/2 mb-1" />
                        <Skeleton className="h-3 w-full" />
                    </div>
                    <div className="flex justify-end pt-2">
                        <Skeleton className="h-4 w-1/4" />
                    </div>
                </CardContent>
            </Card>
        ))}
    </div>
  );

  const renderGlobalLoading = () => (
    <div className="flex flex-col items-center justify-center py-20 text-center" aria-live="polite">
      <Loader2 className="h-12 w-12 text-momcare-primary animate-spin mb-4" />
      <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
        Loading your profile...
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400">Just a moment...</p>
    </div>
  );

  const renderError = () => ( error && (
    <Card className="border-destructive bg-red-50 dark:bg-red-900/20 my-8 shadow-lg rounded-lg" role="alert">
      <CardHeader>
        <CardTitle className="text-destructive dark:text-red-400 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" aria-hidden="true"/> Error Occurred
        </CardTitle>
      </CardHeader>
      <CardContent className="text-destructive/90 dark:text-red-400/90 space-y-3">
        <p>{error.includes("Rate limit") ? "Suggestion service is busy. Please wait a moment and try again." : error}</p>
        {!isAuthenticated && error.includes("log in") && (
          <p className="mt-2"> Please <Button variant="link" className="p-0 h-auto text-destructive hover:text-destructive/80" asChild><Link to="/login">log in</Link></Button> or <Button variant="link" className="p-0 h-auto text-destructive hover:text-destructive/80" asChild><Link to="/signup">sign up</Link></Button>. </p>
        )}
        {isAuthenticated && (error.includes("Profile incomplete") || error.includes("Profile not found") || error.includes("Could not load profile")) && (
          <Button variant="link" className="p-0 h-auto mt-1 text-destructive dark:text-red-400 hover:text-destructive/80" asChild>
            <Link to="/profile">Go to Your Profile</Link>
          </Button>
        )}
        {/* Removed general Try Again button - rely on specific Generate buttons */}
      </CardContent>
    </Card>
  ));

  const renderEmptyState = (type: 'meals' | 'exercises') => {
    const hasGenerated = type === 'meals' ? hasGeneratedMeals : hasGeneratedExercises;
    const icon = type === 'meals' ? Salad : HeartPulse;
    const title = type === 'meals' ? "No Meal Ideas Yet" : "No Exercise Suggestions Yet";
    const message = hasGenerated
        ? `No specific ${type === 'meals' ? 'meal ideas' : 'exercise suggestions'} were generated for your request. Try adjusting preferences or regenerating.`
        : `Click 'Generate ${type === 'meals' ? 'Meals' : 'Exercises'}' above to get personalized suggestions.`;

    return (
      <div className="text-center py-12 px-6 bg-gray-50 dark:bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 min-h-[250px] flex flex-col justify-center items-center">
        {React.createElement(icon, { className: "h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4", "aria-hidden": true })}
        <h3 className="font-semibold text-lg text-gray-800 dark:text-gray-200 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          {message}
        </p>
      </div>
    );
  }

  // --- Determine Render Logic ---
  const showGlobalLoading = isLoadingProfile;
  const canShowContentArea = isAuthenticated && !isLoadingProfile;
  // Controls should only show if profile is loaded AND complete
  const canShowControls = !isLoadingProfile && userProfile && isProfileConsideredComplete;

  // --- Main Component JSX ---
  return (
    <MainLayout requireAuth={true}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <header className="mb-10 md:mb-14 text-center md:text-left">
          <h1 className="text-3xl font-extrabold text-momcare-primary dark:text-momcare-light sm:text-4xl tracking-tight flex items-center justify-center md:justify-start gap-3">
             <Sparkles className="h-8 w-8 text-yellow-500" /> Personalized Suggestions
          </h1>
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto md:mx-0">
            AI-powered meal and exercise ideas tailored to your pregnancy journey.
          </p>
        </header>

        {showGlobalLoading ? renderGlobalLoading() :
         error && !isLoadingMeals && !isLoadingExercises ? renderError() : // Show general error only if not actively loading specific content
         canShowContentArea ? (
          <div className="space-y-10 md:space-y-12">
            {/* Input Controls - Show only if profile is COMPLETE */}
            {canShowControls && (
              <Card className="bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-800/80 border dark:border-gray-700 shadow rounded-lg overflow-hidden">
                  <CardContent className="p-5 md:p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                         {/* Preference Input */}
                         <div className="flex-grow w-full">
                            <Label htmlFor="custom-preference" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                                Cravings or Specific Requests?
                            </Label>
                            <Input
                              id="custom-preference"
                              type="text"
                              placeholder="e.g., 'easy vegetarian lunch', 'low-impact cardio'"
                              value={customPreference}
                              onChange={(e) => setCustomPreference(e.target.value)}
                              disabled={isLoadingMeals || isLoadingExercises}
                              className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 h-10"
                              aria-label="Custom preference for suggestions"
                            />
                         </div>
                         {/* Count Input */}
                         <div className="flex-shrink-0 w-full xs:w-auto md:ml-auto">
                            <Label htmlFor="suggestion-count" className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">
                                Number per Type
                            </Label>
                           <div className="flex items-center gap-2">
                             <Input
                               id="suggestion-count" type="number" min="1" max="8" value={suggestionCount}
                               onChange={(e) => setSuggestionCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                               disabled={isLoadingMeals || isLoadingExercises}
                               className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 h-10 w-20 text-center"
                               aria-label="Number of suggestions per category"
                             />
                             <span className="text-sm text-gray-500 dark:text-gray-400">(1-8)</span>
                           </div>
                       </div>
                    </div>
                     {/* Generate Buttons */}
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                         <Button
                           onClick={generateMealSuggestions}
                           disabled={isLoadingMeals || isLoadingExercises}
                           className="w-full bg-momcare-primary hover:bg-momcare-dark h-10 px-5 flex items-center justify-center gap-2"
                           title="Generate meal ideas"
                         >
                            {isLoadingMeals ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <UtensilsCrossed className="h-4 w-4" /> )}
                            {mealSuggestions ? 'Regenerate Meals' : 'Generate Meals'}
                          </Button>
                          <Button
                           onClick={generateExerciseSuggestions}
                           disabled={isLoadingMeals || isLoadingExercises}
                           className="w-full bg-momcare-secondary hover:bg-blue-700 h-10 px-5 flex items-center justify-center gap-2"
                           title="Generate exercise suggestions"
                         >
                            {isLoadingExercises ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <Bike className="h-4 w-4" /> )}
                            {exerciseSuggestions ? 'Regenerate Exercises' : 'Generate Exercises'}
                          </Button>
                     </div>
                  </CardContent>
              </Card>
            )}

             {/* Profile Incomplete Warning (shown instead of controls if needed) */}
            {!isLoadingProfile && userProfile && !isProfileConsideredComplete && (
                 <Card className="border-amber-500 bg-amber-50 dark:bg-amber-900/20 my-8 shadow-md rounded-lg">
                    <CardHeader>
                        <CardTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" aria-hidden="true"/> Profile Incomplete
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-amber-600 dark:text-amber-300 space-y-3">
                        <p>Please complete your profile to enable personalized suggestions.</p>
                        <Button variant="link" className="p-0 h-auto text-amber-700 dark:text-amber-400 hover:underline" asChild>
                            <Link to="/profile">Go to Your Profile</Link>
                        </Button>
                    </CardContent>
                </Card>
            )}

            {/* Disclaimer - Show only if profile is COMPLETE */}
            {canShowControls && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-lg p-4 md:p-5 flex items-start shadow-sm">
                    <Info className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-3 flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                        <h3 className="font-medium text-blue-800 dark:text-blue-300">Important Disclaimer</h3>
                        <p className="text-blue-700 dark:text-blue-300/90 text-sm mt-1">
                           Suggestions are AI-generated and informational only, not medical advice. <b>Always consult your healthcare professional</b> before changing your diet or exercise routine.
                        </p>
                    </div>
                </div>
            )}

            {/* Generated Content Display Area */}
            {canShowControls && ( // Only show results area if controls are visible
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                  {/* Meal Section */}
                  <section aria-labelledby="meal-ideas-heading" className="space-y-5">
                      <h2 id="meal-ideas-heading" className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                          <UtensilsCrossed className="h-6 w-6 text-momcare-primary dark:text-momcare-accent" aria-hidden="true" />
                          Meal Ideas
                          {mealSuggestions && <span className="text-base font-medium text-gray-500 dark:text-gray-400">({mealSuggestions.length})</span>}
                      </h2>
                      <Separator className="dark:bg-gray-700"/>
                      {isLoadingMeals ? (
                          renderLoadingSkeleton(suggestionCount)
                      ) : mealSuggestions && mealSuggestions.length > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                              {mealSuggestions.map(meal => <MealIdeaCard key={meal.id} meal={meal} onViewDetails={handleViewMealDetails} />)}
                           </div>
                       ) : (
                           renderEmptyState('meals') // Show empty state if no meals after loading/generation attempt
                       )}
                  </section>

                  {/* Exercise Section */}
                  <section aria-labelledby="exercise-suggestions-heading" className="space-y-5">
                       <h2 id="exercise-suggestions-heading" className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3">
                           <Bike className="h-6 w-6 text-momcare-secondary dark:text-blue-400" aria-hidden="true" />
                           Gentle Exercises
                           {exerciseSuggestions && <span className="text-base font-medium text-gray-500 dark:text-gray-400">({exerciseSuggestions.length})</span>}
                       </h2>
                       <Separator className="dark:bg-gray-700"/>
                        {isLoadingExercises ? (
                            renderLoadingSkeleton(suggestionCount)
                        ) : exerciseSuggestions && exerciseSuggestions.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                              {exerciseSuggestions.map(ex => <ExerciseSuggestionCard key={ex.id} exercise={ex} />)}
                          </div>
                        ) : (
                            renderEmptyState('exercises') // Show empty state if no exercises after loading/generation attempt
                        )}
                  </section>
              </div>
            )}
          </div>
         ) : (
             // Fallback for non-authenticated users or initial state before profile load check
             <div className="text-center py-10">
                 <p className="text-gray-600 dark:text-gray-400">
                    {isAuthenticated ? 'Loading profile...' : 'Please log in to access personalized suggestions.'}
                 </p>
                 {!isAuthenticated && <Button asChild className="mt-4"><Link to="/login">Log In</Link></Button>}
             </div>
         )
        }
      </div>

      {/* --- Meal Detail Dialog --- */}
       <Dialog open={isMealDetailOpen} onOpenChange={setIsMealDetailOpen}>
            <DialogContent className="sm:max-w-lg md:max-w-2xl max-h-[90vh] overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
                {selectedMeal && (
                    <>
                        <DialogHeader className="pr-10 relative border-b dark:border-gray-700 pb-4">
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
                        <div className="grid gap-5 pt-5 pb-2 px-1 text-sm md:text-base">
                            <div className="prose prose-sm dark:prose-invert max-w-none leading-normal">
                                <ReactMarkdown>{selectedMeal.description}</ReactMarkdown>
                            </div>
                            {selectedMeal.keyIngredients && selectedMeal.keyIngredients.length > 0 && (
                                <div className='space-y-1.5'>
                                    <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><ListChecks className="h-4 w-4"/>Ingredients</h3>
                                    <ul className="list-disc list-outside pl-5 text-gray-600 dark:text-gray-300 space-y-0.5 text-sm marker:text-gray-400 dark:marker:text-gray-500">
                                        {selectedMeal.keyIngredients.map((ing, i) => <li key={`ing-${i}`}>{ing}</li>)}
                                    </ul>
                                </div>
                            )}
                            {selectedMeal.preparationSteps && selectedMeal.preparationSteps.length > 0 && (
                                <div className='space-y-1.5'>
                                    <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200">Preparation Steps</h3>
                                    <ol className="list-decimal list-outside pl-5 text-gray-600 dark:text-gray-300 space-y-1.5 text-sm marker:font-medium marker:text-gray-500 dark:marker:text-gray-400">
                                        {selectedMeal.preparationSteps.map((step, i) => <li key={`step-${i}`}>{step}</li>)}
                                    </ol>
                                </div>
                            )}
                            {selectedMeal.macros && (
                                <div className='space-y-1'>
                                    <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><Scale className="h-4 w-4" /> Estimated Macros</h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm">{selectedMeal.macros}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">(Note: Estimates only, can vary based on ingredients/portions.)</p>
                                </div>
                            )}
                            {selectedMeal.dietaryNotes && selectedMeal.dietaryNotes.length > 0 && (
                                <div className='space-y-1'>
                                    <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200">Dietary Notes</h3>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedMeal.dietaryNotes.map(note => <Badge key={note} variant="secondary" className="text-xs">{note}</Badge>)}
                                    </div>
                                </div>
                            )}
                            {selectedMeal.reasoning && (
                                <div className='space-y-1'>
                                    <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><Lightbulb className="h-4 w-4 text-yellow-500"/> AI Reasoning</h3>
                                    <p className="text-gray-600 dark:text-gray-300 text-sm italic">"{selectedMeal.reasoning}"</p>
                                </div>
                            )}
                        </div>
                        <Separator className="my-4 dark:bg-gray-700" />
                        <p className="text-xs text-center text-gray-500 dark:text-gray-400 px-4 pb-4">
                            Information is AI-generated. Always consult your healthcare provider for personalized advice.
                        </p>
                    </>
                )}
            </DialogContent>
        </Dialog>

    </MainLayout>
  );
};

export default MealPage;