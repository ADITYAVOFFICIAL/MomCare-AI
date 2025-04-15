// src/pages/MealPage.tsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  FC // Use FC for component type
} from 'react';
import { Link, useNavigate } from 'react-router-dom';

// Layout and Store
// --- ENSURE THIS IMPORT PATH IS CORRECT AND MainLayout.tsx HAS 'export default MainLayout;' ---
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

// Icons
import {
  UtensilsCrossed, Bike, Loader2, AlertTriangle, RefreshCw, Info,
  Salad, HeartPulse, Clock, Target, ShieldAlert, Lightbulb,
  BookOpen, ListChecks, Scale, Soup,
  X as CloseIcon
} from 'lucide-react';

// Markdown Renderer
import ReactMarkdown, { Options as ReactMarkdownOptions } from 'react-markdown';

// Appwrite & AI Service Imports
import { getUserProfile, UserProfile } from '@/lib/appwrite'; // Adjust path if needed
import {
  groqMealService, MealIdea, ExerciseSuggestion,
  PersonalizedContent, GenerationOptions
} from '@/lib/groqMeal'; // Adjust path if needed

// --- Helper Function for Profile Completeness ---
// (Ideally place this in a separate utility file like src/lib/profileUtils.ts)
/**
* Checks if essential profile fields required for recommendations are filled.
* Customize the required fields based on your application's specific needs.
* @param profile - The user profile object.
* @returns `true` if the profile is considered complete for recommendations, `false` otherwise.
*/
const isProfileComplete = (profile: UserProfile | null): boolean => {
if (!profile) {
  return false; // No profile document exists
}
// --- Define required fields for generating recommendations ---
const isAgePresent = typeof profile.age === 'number' && profile.age > 0;
const isWeeksPregnantPresent = typeof profile.weeksPregnant === 'number' && profile.weeksPregnant >= 0; // Allow 0 weeks
const isActivityLevelPresent = typeof profile.activityLevel === 'string' && profile.activityLevel.trim() !== '';
// Add other checks as needed (e.g., dietaryPreferences, preExistingConditions if they influence recommendations)
// const areDietaryPrefsPresent = Array.isArray(profile.dietaryPreferences) && profile.dietaryPreferences.length > 0;

// Return true only if ALL essential fields are present and valid
return isAgePresent && isWeeksPregnantPresent && isActivityLevelPresent /* && areDietaryPrefsPresent */;
};


// --- Sub-Components (Memoized for Performance) ---

interface MealIdeaCardProps {
  meal: MealIdea;
  onViewDetails: (meal: MealIdea) => void;
}
const MealIdeaCard: FC<MealIdeaCardProps> = React.memo(({ meal, onViewDetails }) => {
  // Consistent Markdown rendering options
  const markdownComponents: ReactMarkdownOptions['components'] = {
      p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />,
      strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
  };

  return (
      <Card
          className="bg-white dark:bg-gray-800/50 border dark:border-gray-700 shadow-md rounded-lg flex flex-col h-full transition-all duration-200 ease-in-out hover:shadow-lg dark:hover:bg-gray-800 cursor-pointer group"
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
              {/* Using prose for better markdown styling defaults */}
              <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed line-clamp-3">
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
                  <div className="flex flex-wrap gap-1.5">
                      {meal.dietaryNotes.map(note => <Badge key={note} variant="secondary" className="text-xs px-1.5 py-0.5">{note}</Badge>)}
                  </div>
              )}
              {/* Ensure details link is accessible */}
              <div className="text-right mt-auto pt-2">
                   <span className="text-xs text-momcare-primary dark:text-momcare-accent font-medium group-hover:underline">View Details →</span>
               </div>
          </CardContent>
      </Card>
  );
});

interface ExerciseSuggestionCardProps {
  exercise: ExerciseSuggestion;
}
const ExerciseSuggestionCard: FC<ExerciseSuggestionCardProps> = React.memo(({ exercise }) => {
  const markdownComponentsDesc: ReactMarkdownOptions['components'] = { p: ({node, ...props}) => <p className="mb-1 last:mb-0" {...props} />, strong: ({node, ...props}) => <strong className="font-semibold" {...props} />, };
  const markdownComponentsSafety: ReactMarkdownOptions['components'] = { p: ({node, ...props}) => <span {...props} />, strong: ({node, ...props}) => <strong className="font-semibold" {...props} />, };
  return (
      <Card className="bg-white dark:bg-gray-800/50 border dark:border-gray-700 shadow-md rounded-lg flex flex-col h-full transition-all duration-200 ease-in-out hover:shadow-lg dark:hover:bg-gray-800">
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
              {/* Safety Notes - Emphasized */}
              <div className="text-xs text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/40 p-2.5 rounded-md border border-amber-200 dark:border-amber-700/60 flex items-start gap-2 my-2">
                  <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                   <span className="prose-xs dark:prose-invert max-w-none">
                       <ReactMarkdown components={markdownComponentsSafety}>{`**Safety:** ${exercise.safetyNotes}`}</ReactMarkdown>
                   </span>
              </div>
              {/* AI Reasoning */}
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

// --- Main Page Component ---
const MealPage: FC = () => {
// --- Hooks ---
const { user, isAuthenticated } = useAuthStore();
const { toast } = useToast();
const navigate = useNavigate();

// --- State ---
const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
const [isProfileConsideredComplete, setIsProfileConsideredComplete] = useState<boolean>(false);
const [personalizedContent, setPersonalizedContent] = useState<PersonalizedContent | null>(null);
const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true); // Start true for initial check
const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);
const [customPreference, setCustomPreference] = useState<string>('');
const [selectedMeal, setSelectedMeal] = useState<MealIdea | null>(null);
const [isMealDetailOpen, setIsMealDetailOpen] = useState<boolean>(false);
const [suggestionCount, setSuggestionCount] = useState<number>(3);

// --- Refs ---
// Ref to track component mount status for async operations
const isMounted = useRef(true);
// Ref to prevent multiple simultaneous generateContent calls
const isGenerating = useRef(false);

// --- Callbacks ---

// Memoized function to generate content. Dependencies are stable hooks.
const generateContent = useCallback(async (
      currentProfile: UserProfile,
      preference: string, // Pass dynamic values as arguments
      count: number
  ) => {
  // Prevent overlapping calls
  if (isGenerating.current) {
      console.warn("Generation already in progress, skipping.");
      return;
  }
  isGenerating.current = true;

  // Safety check: Ensure profile is complete before attempting generation
  if (!isProfileComplete(currentProfile)) {
      if (isMounted.current) { // Check mount status before state updates/navigation
          setError("Profile is incomplete. Cannot generate suggestions.");
          toast({ title: "Profile Incomplete", description: "Please complete your profile first.", variant: "default" });
          navigate('/profile', { replace: true });
      }
      isGenerating.current = false;
      return;
  }

  console.log(`Attempting generation: Preference='${preference || "None"}', Count=${count}`);
  if (isMounted.current) {
      setIsLoadingContent(true);
      setError(null); // Clear previous generation errors
  }

  try {
      const options: GenerationOptions = {
          contentType: 'both', count, customPreference: preference?.trim() || undefined,
      };
      if (!groqMealService?.generatePersonalizedContent) {
          throw new Error("Suggestion service is unavailable.");
      }

      const content = await groqMealService.generatePersonalizedContent(currentProfile, options);

      // Update state only if component is still mounted
      if (isMounted.current) {
          setPersonalizedContent(content);
          console.log("Generation successful.");
      } else {
          console.log("Component unmounted after generation finished, state not updated.");
      }

  } catch (err: any) {
      const msg = err.message || "Failed to generate suggestions.";
      console.error("Error during generateContent:", err);
      if (isMounted.current) {
          setError(msg); // Display the error
          setPersonalizedContent(null); // Clear any potentially partial content
          toast({
              title: "Suggestion Error",
              description: msg.includes("Rate limit") ? "Too many requests. Please wait a moment and try again." : msg,
              variant: "destructive"
          });
      }
  } finally {
      // Always reset flags, check mount status for state update
      if (isMounted.current) setIsLoadingContent(false);
      isGenerating.current = false; // Reset generation lock
      console.log("generateContent finished.");
  }
}, [toast, navigate]); // Dependencies are stable hooks

// --- Effects ---

// Effect runs on mount and when auth state changes
useEffect(() => {
  isMounted.current = true; // Mark as mounted
  let didCancel = false; // Cancellation flag for this effect run

  const fetchProfileAndInitialGenerate = async () => {
      console.log("Running fetchProfileAndInitialGenerate Effect: Auth=", isAuthenticated, "User ID=", user?.$id);

      // Guard: Exit if not authenticated or no user ID
      if (!isAuthenticated || !user?.$id) {
          setIsLoadingProfile(false); // Ensure loading stops
          setUserProfile(null);
          setPersonalizedContent(null);
          setIsProfileConsideredComplete(false);
          if (!isAuthenticated) setError("Please log in to view suggestions.");
          return;
      }

      setIsLoadingProfile(true);
      setError(null);
      setPersonalizedContent(null); // Clear old content
      setIsProfileConsideredComplete(false);

      try {
          const profile = await getUserProfile(user.$id);

          if (didCancel) return; // Exit if cancelled

          setUserProfile(profile); // Store fetched profile

          if (profile) {
              const isComplete = isProfileComplete(profile);
              setIsProfileConsideredComplete(isComplete);

              if (isComplete) {
                  console.log("Profile loaded and complete. Triggering initial generation.");
                  // Call generateContent with current state values for preference/count
                  // No need to await this here unless subsequent logic depends on it immediately
                  generateContent(profile, customPreference, suggestionCount);
              } else {
                  console.log("Profile loaded but incomplete. Redirecting to profile page.");
                  setError("Your profile is incomplete. Please update it for recommendations."); // User-friendly error
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
          } else {
              // Profile document not found for this user
              console.log("Profile document not found. Redirecting to profile page.");
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
          console.error("Error during profile fetch/check:", err);
          if (!didCancel) {
              setError(`Could not load profile data: ${err.message || 'Unknown error'}`);
              setUserProfile(null);
              setIsProfileConsideredComplete(false);
              toast({ title: "Profile Load Error", description: err.message || "Failed to load profile.", variant: "destructive" });
          }
      } finally {
          if (!didCancel) {
              setIsLoadingProfile(false); // Stop profile loading indicator
              console.log("Profile fetch/check process finished.");
          }
      }
  };

  fetchProfileAndInitialGenerate();

  // Cleanup function runs when component unmounts or dependencies change
  return () => {
      console.log("MealPage effect cleanup.");
      isMounted.current = false; // Mark as unmounted
      didCancel = true; // Signal async operations to abort state updates
  };
  // Depend only on the core triggers and stable callbacks/hooks.
  // customPreference and suggestionCount are handled by passing them as args.
}, [isAuthenticated, user?.$id, navigate, toast, generateContent, customPreference, suggestionCount]);


// --- Event Handlers ---
/** Handles the click event for the 'Regenerate Suggestions' button. */
const handleRegenerate = () => {
  // Ensure profile is loaded before allowing regeneration
  if (!userProfile) {
      toast({ title: "Profile Not Loaded", description: "Cannot regenerate suggestions until your profile is loaded.", variant:"default" });
      // Optionally attempt to refetch profile if loading isn't happening
      // if (!isLoadingProfile) { /* Consider re-running fetch logic if appropriate */ }
      return;
  }
  // Ensure profile is complete
  if (!isProfileConsideredComplete) {
      toast({ title: "Profile Incomplete", description: "Please complete your profile before generating suggestions.", variant: "default" });
      navigate('/profile', { replace: true, state: { message: 'Complete your profile to generate recommendations.' } });
      return;
  }
  // Call generateContent with the current preference and count from state
  generateContent(userProfile, customPreference, suggestionCount);
};

/** Opens the Meal Detail Dialog */
const handleViewMealDetails = useCallback((meal: MealIdea) => {
    setSelectedMeal(meal);
    setIsMealDetailOpen(true);
}, []);


// --- Render Functions ---

/** Renders the primary loading state indicator. */
const renderLoading = () => (
  <div className="flex flex-col items-center justify-center py-20 text-center" aria-live="polite">
    <Loader2 className="h-12 w-12 text-momcare-primary animate-spin mb-4" />
    <p className="text-lg font-medium text-gray-700 dark:text-gray-300">
      {isLoadingProfile ? "Loading your profile..." : isLoadingContent ? "Generating suggestions..." : "Loading..."}
    </p>
    <p className="text-sm text-gray-500 dark:text-gray-400">Just a moment...</p>
  </div>
);

/** Renders the error message card with appropriate actions. */
const renderError = () => ( error && (
  <Card className="border-destructive bg-red-50 dark:bg-red-900/20 my-8 shadow-lg rounded-lg" role="alert">
    <CardHeader>
      <CardTitle className="text-destructive dark:text-red-400 flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" aria-hidden="true"/> Error Occurred
      </CardTitle>
    </CardHeader>
    <CardContent className="text-destructive/90 dark:text-red-400/90 space-y-3">
      {/* Provide user-friendly error messages */}
      <p>{error.includes("Rate limit") ? "Suggestion service is busy. Please wait a moment and try again." : error}</p>
      {/* Action buttons based on error context */}
      {!isAuthenticated && error.includes("log in") && (
        <p className="mt-2"> Please <Button variant="link" className="p-0 h-auto text-destructive hover:text-destructive/80" asChild><Link to="/login">log in</Link></Button> or <Button variant="link" className="p-0 h-auto text-destructive hover:text-destructive/80" asChild><Link to="/signup">sign up</Link></Button>. </p>
      )}
      {isAuthenticated && (error.includes("Profile incomplete") || error.includes("Profile not found") || error.includes("Could not load profile")) && (
        <Button variant="link" className="p-0 h-auto mt-1 text-destructive dark:text-red-400 hover:text-destructive/80" asChild>
          <Link to="/profile">Go to Your Profile</Link>
        </Button>
      )}
      {/* Try Again for generation errors */}
      {error && (error.includes("generate suggestions") || error.includes("Rate limit") || error.includes("Suggestion service is unavailable")) && userProfile && isProfileConsideredComplete && (
        <Button variant="destructive" size="sm" onClick={handleRegenerate} className="mt-4" disabled={isLoadingContent || isLoadingProfile} >
          <RefreshCw className="mr-2 h-4 w-4"/> Try Again
        </Button>
      )}
      {/* Add a try again for profile load errors - This might trigger the effect again */}
       {/* {error && error.includes("Could not load profile") && (
           <Button variant="destructive" size="sm" onClick={() => window.location.reload()} className="mt-4" disabled={isLoadingProfile}>
              <RefreshCw className="mr-2 h-4 w-4"/> Reload Page
           </Button>
       )} */}
    </CardContent>
  </Card>
));

/** Renders the state when no suggestions are displayed (initial, empty results, or profile incomplete). */
const renderEmptyState = (section: 'meals' | 'exercises' | 'initial') => {
  const icon = section === 'meals' ? Salad : HeartPulse;
  const title = section === 'meals' ? "No Meal Ideas Generated" : section === 'exercises' ? "No Exercise Suggestions Generated" : "Ready for Suggestions?";
  let message = section === 'initial'
    ? "Click 'Generate' to get personalized meal and exercise ideas based on your profile."
    : `No specific ${section === 'meals' ? 'meal ideas' : 'exercise suggestions'} were generated in the last request. Try adjusting preferences or regenerating.`;

  // Specific message if profile is loaded but known to be incomplete
  if (section === 'initial' && userProfile && !isProfileConsideredComplete) {
      message = "Your profile needs to be completed before suggestions can be generated.";
  }

  return (
    <div className={`text-center py-12 px-6 bg-gray-50 dark:bg-gray-800/30 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700 ${section !== 'initial' ? 'min-h-[200px] flex flex-col justify-center items-center' : ''}`}>
      {React.createElement(icon, { className: `h-12 w-12 ${section === 'initial' ? 'lg:h-16 lg:w-16' : ''} text-gray-400 dark:text-gray-500 mx-auto mb-4`, "aria-hidden": true })}
      <h3 className={`font-semibold text-gray-800 dark:text-gray-200 mb-2 ${section === 'initial' ? 'text-xl lg:text-2xl' : 'text-lg'}`}>{title}</h3>
      <p className={`text-gray-600 dark:text-gray-400 max-w-md mx-auto ${section === 'initial' ? 'text-base mb-6' : 'text-sm'}`}>
        {message}
      </p>
      {/* Show Generate button only in initial state AND if profile is complete */}
      {section === 'initial' && userProfile && isProfileConsideredComplete && (
        <Button onClick={handleRegenerate} disabled={isLoadingContent || isLoadingProfile}>
          <RefreshCw className="mr-2 h-4 w-4" /> Generate Suggestions
        </Button>
      )}
       {/* Show link to profile if profile is incomplete */}
       {section === 'initial' && userProfile && !isProfileConsideredComplete && (
          <p className="mt-4 text-amber-700 dark:text-amber-400 text-sm flex items-center justify-center gap-2">
              <AlertTriangle className="h-4 w-4" aria-hidden="true" />
              <Link to="/profile" className='underline font-medium'>Complete Your Profile</Link> to get suggestions.
          </p>
       )}
    </div>
  );
}

// --- Determine Render Logic ---
// Show loading if profile is loading OR content is loading without previous content displayed
const showLoading = isLoadingProfile || (isLoadingContent && !personalizedContent);
// Show the main content area if authenticated and profile loading is finished (error or success)
const canShowContentArea = isAuthenticated && !isLoadingProfile;
// Show controls only if profile load succeeded and profile is complete
const canShowControls = !isLoadingProfile && userProfile && isProfileConsideredComplete;
// Show results only if content exists and profile is complete
const canShowResults = !isLoadingProfile && personalizedContent && isProfileConsideredComplete;

// --- Main Component JSX ---
return (
  <MainLayout requireAuth={true}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
      {/* Page Header */}
      <header className="mb-10 md:mb-14 text-center md:text-left">
        <h1 className="text-3xl font-extrabold text-momcare-primary dark:text-momcare-light sm:text-4xl tracking-tight">
          Personalized Meals & Exercises
        </h1>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto md:mx-0">
          AI-powered suggestions tailored to your pregnancy journey.
        </p>
      </header>

      {/* --- Primary Content Rendering Logic --- */}
      {showLoading ? renderLoading() :
       error ? renderError() : // Render errors first if they exist
       canShowContentArea ? ( // Only render content area if auth and profile load finished
        <div className="space-y-10 md:space-y-12">
          {/* Input Controls - Show only if profile is COMPLETE */}
          {canShowControls && (
            <Card className="bg-gradient-to-r from-white to-blue-50 dark:from-gray-800 dark:to-gray-800/80 border dark:border-gray-700 shadow-sm rounded-lg">
                <CardContent className="p-5 md:p-6 flex flex-col sm:flex-row items-center flex-wrap gap-4">
                   {/* Preference Input */}
                   <div className="flex-grow w-full sm:w-auto sm:min-w-[300px]">
                      <Label htmlFor="custom-preference" className="sr-only">Custom Preference</Label>
                      <Input id="custom-preference" type="text" placeholder="Any cravings or requests? (e.g., 'easy dinner ideas')" value={customPreference} onChange={(e) => setCustomPreference(e.target.value)} disabled={isLoadingContent} className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 h-10" aria-label="Custom preference for suggestions" />
                   </div>
                   {/* Count Input */}
                   <div className="flex-shrink-0 w-full xs:w-auto">
                       <div className="flex items-center gap-2">
                         <Label htmlFor="suggestion-count" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Suggestions:</Label>
                         <Input
                           id="suggestion-count" type="number" min="1" max="8" value={suggestionCount}
                           onChange={(e) => setSuggestionCount(Math.max(1, parseInt(e.target.value, 10) || 1))} // Added radix 10
                           disabled={isLoadingContent}
                           className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 h-10 w-20 text-center"
                           aria-label="Number of suggestions per category"
                         />
                       </div>
                       <p className="text-xs text-center text-gray-500 mt-1 hidden sm:block">(1-8 per type)</p>
                   </div>
                   {/* Regenerate Button */}
                   <Button onClick={handleRegenerate} disabled={isLoadingContent} className="w-full sm:w-auto flex-shrink-0 bg-momcare-primary hover:bg-momcare-dark h-10 px-5" title="Generate new suggestions" >
                      {isLoadingContent ? ( <Loader2 className="mr-2 h-4 w-4 animate-spin" /> ) : ( <RefreshCw className="mr-2 h-4 w-4" /> )}
                      {personalizedContent ? 'Regenerate' : 'Generate'}
                    </Button>
                </CardContent>
            </Card>
          )}

          {/* Disclaimer - Show only if profile is COMPLETE */}
          {canShowControls && ( // Show disclaimer alongside controls
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

          {/* Generated Content Display Area or Empty State */}
          {canShowResults ? (
              // Display content if available and profile complete
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
                  {/* Meal Section */}
                  <section aria-labelledby="meal-ideas-heading" className="space-y-5">
                      <h2 id="meal-ideas-heading" className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3"> <UtensilsCrossed className="h-6 w-6 text-momcare-primary dark:text-momcare-accent" aria-hidden="true" /> Meal Ideas ({personalizedContent?.meals.length ?? 0}) </h2>
                      <Separator className="dark:bg-gray-700"/>
                      {(personalizedContent?.meals?.length ?? 0) > 0 ? (
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                              {personalizedContent!.meals.map(meal => <MealIdeaCard key={meal.id} meal={meal} onViewDetails={handleViewMealDetails} />)}
                           </div>
                       ) : ( renderEmptyState('meals') )}
                  </section>
                  {/* Exercise Section */}
                  <section aria-labelledby="exercise-suggestions-heading" className="space-y-5">
                       <h2 id="exercise-suggestions-heading" className="text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-3"> <Bike className="h-6 w-6 text-momcare-secondary dark:text-blue-400" aria-hidden="true" /> Gentle Exercise Suggestions ({personalizedContent?.exercises.length ?? 0}) </h2>
                       <Separator className="dark:bg-gray-700"/>
                       {(personalizedContent?.exercises?.length ?? 0) > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                              {personalizedContent!.exercises.map(ex => <ExerciseSuggestionCard key={ex.id} exercise={ex} />)}
                          </div>
                        ) : ( renderEmptyState('exercises') )}
                  </section>
              </div>
          ) : (
              // Show initial empty state if profile is loaded (even if incomplete) but no results are shown
              renderEmptyState('initial')
          )}
        </div>
       ) : (
          // Fallback if not loading, no error, but cannot show content area (e.g., logged out user)
           <div className="text-center py-10">
               <p>Please log in to access this page.</p>
               <Button asChild className="mt-4"><Link to="/login">Log In</Link></Button>
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
                      {/* <Separator className="my-4 dark:bg-gray-700" /> */}
                      <div className="grid gap-5 pt-5 pb-2 px-1 text-sm md:text-base">
                          {/* Description */}
                          <div className="prose prose-sm dark:prose-invert max-w-none leading-normal">
                              <ReactMarkdown>{selectedMeal.description}</ReactMarkdown>
                          </div>

                          {/* Ingredients */}
                          {selectedMeal.keyIngredients && selectedMeal.keyIngredients.length > 0 && (
                              <div className='space-y-1.5'>
                                  <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><ListChecks className="h-4 w-4"/>Ingredients</h3>
                                  <ul className="list-disc list-outside pl-5 text-gray-600 dark:text-gray-300 space-y-0.5 text-sm marker:text-gray-400 dark:marker:text-gray-500">
                                      {selectedMeal.keyIngredients.map((ing, i) => <li key={`ing-${i}`}>{ing}</li>)}
                                  </ul>
                              </div>
                          )}

                          {/* Preparation Steps */}
                          {selectedMeal.preparationSteps && selectedMeal.preparationSteps.length > 0 && (
                              <div className='space-y-1.5'>
                                  <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200">Preparation Steps</h3>
                                  <ol className="list-decimal list-outside pl-5 text-gray-600 dark:text-gray-300 space-y-1.5 text-sm marker:font-medium marker:text-gray-500 dark:marker:text-gray-400">
                                      {selectedMeal.preparationSteps.map((step, i) => <li key={`step-${i}`}>{step}</li>)}
                                  </ol>
                              </div>
                          )}

                          {/* Macros */}
                          {selectedMeal.macros && (
                              <div className='space-y-1'>
                                  <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200 flex items-center gap-1.5"><Scale className="h-4 w-4" /> Estimated Macros</h3>
                                  <p className="text-gray-600 dark:text-gray-300 text-sm">{selectedMeal.macros}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-1">(Note: Estimates only, can vary based on ingredients/portions.)</p>
                              </div>
                          )}

                          {/* Dietary Notes */}
                          {selectedMeal.dietaryNotes && selectedMeal.dietaryNotes.length > 0 && (
                              <div className='space-y-1'>
                                  <h3 className="font-semibold text-base text-gray-800 dark:text-gray-200">Dietary Notes</h3>
                                  <div className="flex flex-wrap gap-1.5">
                                      {selectedMeal.dietaryNotes.map(note => <Badge key={note} variant="secondary" className="text-xs">{note}</Badge>)}
                                  </div>
                              </div>
                          )}

                          {/* AI Reasoning */}
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