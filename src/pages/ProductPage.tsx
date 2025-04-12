// src/pages/ProductPage.tsx

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
// Import necessary icons
import {
    Package, Search, Sparkles, AlertCircle, Info, Loader2, RefreshCw, ListFilter,
    Bookmark, BookmarkCheck, MessageCircleQuestion, X // Added X for clearing search
} from 'lucide-react';

// --- Layout & UI ---
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // <-- Import Label
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from '@/hooks/use-toast';

// --- State & Appwrite ---
import { useAuthStore } from '@/store/authStore';
import { UserProfile, getUserProfile } from '@/lib/appwrite';
// Import Appwrite bookmark functions and type
import {
    BookmarkedProduct,
    addProductBookmark,
    removeProductBookmarkById,
    getUserProductBookmarks,
    // findProductBookmarkByProductId // Not strictly needed for this change
} from '@/lib/appwrite';

// --- Groq Service & Types ---
import {
    getPersonalizedRecommendations,
    getGeneralRecommendations,
    getPromptBasedRecommendations,
    ProductRecommendation,
    VALID_PRODUCT_CATEGORIES,
    ProductCategory
} from '@/lib/groqProduct';

// --- Helper Component: Skeleton Loader ---
const ProductCardSkeleton: React.FC = () => (
    <Card className="flex flex-col h-full border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden animate-pulse bg-white dark:bg-gray-800">
        <CardHeader className="p-4 pb-2">
            <Skeleton className="h-6 w-3/4 mb-2 bg-gray-300 dark:bg-gray-600 rounded" />
            <Skeleton className="h-4 w-1/3 bg-gray-200 dark:bg-gray-500 rounded" />
        </CardHeader>
        <CardContent className="p-4 pt-1 flex-grow space-y-2">
            <Skeleton className="h-4 w-full bg-gray-200 dark:bg-gray-500 rounded" />
            <Skeleton className="h-4 w-5/6 bg-gray-200 dark:bg-gray-500 rounded" />
            <Skeleton className="h-4 w-full mt-2 bg-gray-200 dark:bg-gray-500 rounded" />
            <Skeleton className="h-3 w-1/2 mt-2 bg-gray-200 dark:bg-gray-500 rounded" />
        </CardContent>
        <CardFooter className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <Skeleton className="h-9 flex-grow mr-2 bg-gray-300 dark:bg-gray-600 rounded" />
            <Skeleton className="h-9 w-9 bg-gray-300 dark:bg-gray-600 rounded" />
        </CardFooter>
    </Card>
);

// --- Main Component ---
const ProductPage: React.FC = () => {
    // --- Hooks ---
    const { user, isAuthenticated } = useAuthStore();
    const { toast } = useToast();

    // --- State ---
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [recommendations, setRecommendations] = useState<ProductRecommendation[] | null>(null);
    const [recommendationType, setRecommendationType] = useState<'personalized' | 'general' | 'prompt-based' | null>(null);
    const [loadingProfile, setLoadingProfile] = useState<boolean>(true);
    const [loadingRecommendations, setLoadingRecommendations] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [personalizedFetchAttempted, setPersonalizedFetchAttempted] = useState<boolean>(false);
    const [fetchCycleId, setFetchCycleId] = useState<number>(0); // Trigger refetch

    // State for search and filter
    const [userPrompt, setUserPrompt] = useState<string>('');
    const [activeSearchPrompt, setActiveSearchPrompt] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>(''); // Empty string means 'All'

    // Bookmark State
    const [bookmarkMap, setBookmarkMap] = useState<Map<string, string>>(new Map()); // <productId, bookmarkDocId>
    const [allBookmarkedProducts, setAllBookmarkedProducts] = useState<BookmarkedProduct[]>([]); // Full bookmark data
    const [loadingBookmarks, setLoadingBookmarks] = useState<boolean>(false);
    const [togglingBookmarkId, setTogglingBookmarkId] = useState<string | null>(null);
    const [showOnlyBookmarked, setShowOnlyBookmarked] = useState<boolean>(false); // Toggle bookmark view

    // --- Data Fetching Callbacks ---

    // Fetch Bookmarks (Fetches full data now)
    const fetchBookmarks = useCallback(async () => {
        if (!isAuthenticated || !user?.$id) {
            setBookmarkMap(new Map());
            setAllBookmarkedProducts([]);
            return;
        }
        console.log("Fetching product bookmarks...");
        setLoadingBookmarks(true);
        try {
            const bookmarks = await getUserProductBookmarks(user.$id);
            setAllBookmarkedProducts(bookmarks); // Store full bookmark data
            const newMap = new Map<string, string>();
            bookmarks.forEach(bm => { newMap.set(bm.productId, bm.$id); });
            setBookmarkMap(newMap);
            console.log(`Loaded ${newMap.size} bookmarks.`);
        } catch (err) {
            console.error("Error fetching bookmarks:", err);
            toast({ title: "Bookmark Error", description: "Could not load saved products.", variant: "destructive" });
            setBookmarkMap(new Map());
            setAllBookmarkedProducts([]);
        } finally {
            setLoadingBookmarks(false);
        }
    }, [isAuthenticated, user?.$id, toast]);

    // Fetch Recommendations (Handles personalized, general, prompt-based)
    const fetchRecommendations = useCallback(async (): Promise<void> => {
        if (!isAuthenticated) {
            setError("Authentication required.");
            setLoadingRecommendations(false);
            return;
        }
        let fetchFn: () => Promise<ProductRecommendation[]>;
        let fetchLabel: 'personalized' | 'general' | 'prompt-based';
        const categoryArg = selectedCategory || undefined; // Pass undefined if 'All'

        if (activeSearchPrompt) {
            fetchLabel = 'prompt-based';
            console.log(`Fetching ${fetchLabel} recommendations for prompt: "${activeSearchPrompt}", category: ${categoryArg || 'All'}`);
            fetchFn = () => getPromptBasedRecommendations(activeSearchPrompt, categoryArg);
        } else if (profile) {
            fetchLabel = 'personalized';
            console.log(`Fetching ${fetchLabel} recommendations for profile, category: ${categoryArg || 'All'}`);
            fetchFn = () => getPersonalizedRecommendations(profile, categoryArg);
            setPersonalizedFetchAttempted(true); // Mark attempt even if it fails later
        } else {
            fetchLabel = 'general';
            console.log(`Fetching ${fetchLabel} recommendations, category: ${categoryArg || 'All'}`);
            fetchFn = () => getGeneralRecommendations(categoryArg);
            // Don't reset personalizedFetchAttempted here, let it persist if profile fetch failed
        }

        setLoadingRecommendations(true);
        setError(null); // Clear previous errors
        try {
            const results = await fetchFn();
            setRecommendations(results);
            setRecommendationType(fetchLabel);
            if (results.length === 0) {
                console.log(`AI returned 0 ${fetchLabel} recommendations.`);
            }
        } catch (err: unknown) {
            console.error(`Error fetching ${fetchLabel} recommendations:`, err);
            const message = err instanceof Error ? err.message : `Could not fetch ${fetchLabel} recommendations.`;
            setError(`Failed to get ${fetchLabel} recommendations: ${message}`);
            toast({ title: `${fetchLabel.charAt(0).toUpperCase() + fetchLabel.slice(1)} Recommendation Error`, description: message, variant: "destructive" });
            setRecommendations(null); // Clear recommendations on error
            if (fetchLabel === 'personalized') {
                setPersonalizedFetchAttempted(true); // Ensure this is set if personalized fetch fails
            }
        } finally {
            setLoadingRecommendations(false);
        }
    }, [isAuthenticated, profile, activeSearchPrompt, selectedCategory, toast]); // Removed personalizedFetchAttempted dependency

    // Fetch User Profile
    const fetchProfile = useCallback(async (): Promise<UserProfile | null> => {
        if (!isAuthenticated || !user?.$id) {
            setLoadingProfile(false);
            setError("User not authenticated.");
            setProfile(null); // Ensure profile is null if not authenticated
            return null;
        }
        console.log("Fetching user profile...");
        setLoadingProfile(true);
        setError(null);
        setPersonalizedFetchAttempted(false); // Reset attempt status on profile fetch
        setRecommendations(null); // Clear old recommendations
        setRecommendationType(null);
        try {
            const userProfile = await getUserProfile(user.$id);
            setProfile(userProfile);
            return userProfile;
        } catch (err: unknown) {
            console.error("Error fetching user profile:", err);
            const message = err instanceof Error ? err.message : "Could not load profile.";
            setError(`Failed to load user profile: ${message}`);
            toast({ title: "Profile Error", description: message, variant: "destructive" });
            setProfile(null); // Ensure profile is null on error
            setPersonalizedFetchAttempted(true); // Mark as attempted if profile fetch fails, so we can offer general
            return null;
        } finally {
            setLoadingProfile(false);
        }
    }, [user?.$id, isAuthenticated, toast]);

    // --- Effects ---

    // Handle Authentication Changes
    useEffect(() => {
        console.log("Auth Effect: isAuthenticated =", isAuthenticated);
        if (isAuthenticated === true) {
            fetchProfile(); // Fetch profile first
            fetchBookmarks(); // Fetch bookmarks
        } else if (isAuthenticated === false) {
            // Clear all state related to user data
            setLoadingProfile(false);
            setLoadingRecommendations(false);
            setLoadingBookmarks(false);
            setError("Please log in to view personalized product recommendations.");
            setProfile(null);
            setRecommendations(null);
            setRecommendationType(null);
            setPersonalizedFetchAttempted(false);
            setBookmarkMap(new Map());
            setAllBookmarkedProducts([]);
            setShowOnlyBookmarked(false);
            setActiveSearchPrompt(''); // Clear search state
            setUserPrompt('');
            setSelectedCategory('');
        }
    }, [isAuthenticated, fetchProfile, fetchBookmarks]); // Dependencies: auth status and fetch functions

    // Trigger Recommendation Fetch after Profile Load or Search/Filter Change
    useEffect(() => {
        console.log("Recommendation Trigger Effect: loadingProfile =", loadingProfile, "isAuthenticated =", isAuthenticated, "fetchCycleId =", fetchCycleId);
        // Only fetch if profile is NOT loading AND user is authenticated
        if (!loadingProfile && isAuthenticated === true) {
            fetchRecommendations();
        }
        // Intentionally not including fetchRecommendations in deps to avoid loop, controlled by fetchCycleId
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadingProfile, isAuthenticated, fetchCycleId]);

    // --- Event Handlers ---

    const handleSearchSubmit = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        if (loadingRecommendations || loadingProfile) return;
        const trimmedPrompt = userPrompt.trim();
        setActiveSearchPrompt(trimmedPrompt);
        setFetchCycleId(id => id + 1); // Trigger refetch
    };

    const handleCategoryChange = (value: string): void => {
        if (loadingRecommendations || loadingProfile) return;
        console.log(`Category changed to: "${value || 'All'}"`);
        setSelectedCategory(value); // Update category state
        setFetchCycleId(id => id + 1); // Trigger refetch
    };

    const handleClearSearch = (): void => {
        if (loadingRecommendations || loadingProfile) return;
        console.log("Clearing search prompt and category.");
        setUserPrompt('');
        setActiveSearchPrompt('');
        setSelectedCategory(''); // Also clear category when clearing search
        setFetchCycleId(id => id + 1); // Trigger refetch
    };

    const handleManualRefresh = (): void => {
        if (loadingRecommendations || loadingProfile) return;
        console.log("Manual refresh triggered.");
        // Re-fetch profile, which will cascade to fetching recommendations
        fetchProfile();
        setFetchCycleId(id => id + 1); // Ensure recommendations refetch even if profile hasn't changed
    };

    const handleToggleShowBookmarked = (): void => {
        if (loadingRecommendations || loadingBookmarks || loadingProfile) return;
        setShowOnlyBookmarked(prev => !prev);
    };

    // Handler to explicitly fetch general recommendations (e.g., after personalized fails)
    const handleFetchGeneral = useCallback((): void => {
        if (loadingRecommendations || loadingProfile) return;
        console.log("Manually fetching general recommendations...");
        setActiveSearchPrompt(''); // Clear any active search
        setSelectedCategory(''); // Clear category
        setProfile(null); // Temporarily treat profile as null to force general fetch
        setPersonalizedFetchAttempted(true); // Ensure we know personalized was tried
        setFetchCycleId(id => id + 1); // Trigger refetch
    }, [loadingRecommendations, loadingProfile]);

    // Bookmark Toggle Handler (Updates both map and list state)
    const handleBookmarkToggle = useCallback(async (product: ProductRecommendation | { id: string; name: string }) => {
        if (!isAuthenticated || !user?.$id || !product?.id) {
            toast({ title: "Authentication Required", description: "Log in to save products.", variant: "destructive" });
            return;
        }
        const productId = product.id;
        const productName = 'name' in product ? product.name : 'Unknown Product';
        const existingBookmarkId = bookmarkMap.get(productId);
        setTogglingBookmarkId(productId);

        try {
            if (existingBookmarkId) {
                // --- Remove Bookmark ---
                console.log(`Removing bookmark for product: ${productName} (Doc ID: ${existingBookmarkId})`);
                await removeProductBookmarkById(existingBookmarkId);

                setBookmarkMap(prevMap => {
                    const newMap = new Map(prevMap);
                    newMap.delete(productId);
                    return newMap;
                });
                setAllBookmarkedProducts(prevList => prevList.filter(bm => bm.productId !== productId));

                toast({ title: "Bookmark Removed", description: `"${productName}" removed.` });

            } else if ('description' in product) { // Can only ADD if we have full product details
                // --- Add Bookmark ---
                console.log(`Adding bookmark for product: ${product.name} (Product ID: ${product.id})`);
                const newBookmark = await addProductBookmark(user.$id, product as ProductRecommendation);

                setBookmarkMap(prevMap => {
                    const newMap = new Map(prevMap);
                    newMap.set(product.id, newBookmark.$id);
                    return newMap;
                });
                setAllBookmarkedProducts(prevList => [...prevList, newBookmark]);

                toast({ title: "Bookmark Added", description: `"${product.name}" saved.` });
            } else {
                 console.warn("Attempted to add bookmark without full product details (e.g., from bookmark list).");
                 toast({ title: "Bookmark Error", description: "Cannot add bookmark from this view.", variant: "destructive" });
            }
        } catch (error: unknown) {
            console.error("Error toggling bookmark:", error);
            const action = existingBookmarkId ? "removing" : "adding";
            const message = error instanceof Error ? error.message : `Could not complete ${action} bookmark action.`;
            toast({ title: `Bookmark Error`, description: message, variant: "destructive" });
        } finally {
            setTogglingBookmarkId(null);
        }
    }, [isAuthenticated, user?.$id, bookmarkMap, toast]); // Removed allBookmarkedProducts from deps

    // --- Helper Function ---
    const generateSearchLink = (productName: string): string => {
        const query = encodeURIComponent(productName);
        return `https://www.google.com/search?q=${query}&tbm=shop`; // Target shopping results
    };

    // --- Render Logic ---
    const renderContent = (): JSX.Element => {
        // State 1: Not Authenticated
        if (isAuthenticated === false) {
            return (
                <Alert variant="destructive" className="mt-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Authentication Required</AlertTitle>
                    <AlertDescription>
                        {error || "Please log in to view product recommendations."}
                    </AlertDescription>
                </Alert>
            );
        }

        // State 2: Loading Profile (Initial load)
        if (loadingProfile) {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
                    {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
                </div>
            );
        }

        // State 3: Loading Recommendations OR Loading Bookmarks (Subsequent loads)
        const isLoadingData = loadingRecommendations || (loadingBookmarks && showOnlyBookmarked);
        if (isLoadingData) {
            let loadingText = loadingBookmarks && showOnlyBookmarked ? 'Loading saved items...' : 'Fetching recommendations...';
            if (loadingRecommendations) {
                if (activeSearchPrompt) loadingText = `Searching for "${activeSearchPrompt}"...`;
                else if (recommendationType === 'general' || (personalizedFetchAttempted && !profile)) loadingText = 'Fetching general recommendations...';
                else if (recommendationType === 'personalized') loadingText = 'Fetching personalized recommendations...';
            }
            return (
                <>
                    <div className="text-center mt-6 mb-4 text-gray-600 dark:text-gray-400 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 animate-spin mr-2" /> {loadingText}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => <ProductCardSkeleton key={i} />)}
                    </div>
                </>
            );
        }

        // State 4: Error Occurred (Profile or Recommendation fetch failed)
        if (error && !recommendations && !showOnlyBookmarked) { // Only show recommendation errors when not viewing bookmarks
            const canRetry = !loadingRecommendations && !loadingProfile;
            // Show fallback if personalized failed OR profile fetch failed
            const showFallbackOption = personalizedFetchAttempted && error.includes("personalized") || error.includes("profile");
            return (
                <Alert variant="destructive" className="mt-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error Loading Recommendations</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                    {canRetry && (
                        <div className="mt-3 flex flex-wrap gap-2">
                            <Button variant="outline" size="sm" onClick={handleManualRefresh} className="border-destructive text-destructive hover:bg-destructive/10 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20" disabled={loadingRecommendations || loadingProfile}>
                                <RefreshCw className="mr-2 h-4 w-4" /> Retry
                            </Button>
                            {showFallbackOption && (
                                <Button variant="outline" size="sm" onClick={handleFetchGeneral} className="border-destructive text-destructive hover:bg-destructive/10 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20" disabled={loadingRecommendations || loadingProfile}>
                                    Fetch General Instead
                                </Button>
                            )}
                        </div>
                    )}
                </Alert>
            );
        }

        // State 5: Success - Render Bookmarks View
        if (showOnlyBookmarked) {
            const displayedBookmarks = allBookmarkedProducts;
            const alertTitle = `Saved Items (${displayedBookmarks.length})`;
            const alertDesc = `Showing all your saved product ideas. Use 'Find Online' to search.`;
            const alertBgClass = 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700/30 text-purple-800 dark:text-purple-200';
            const alertTitleClass = 'text-purple-900 dark:text-purple-100';

            return (
                <>
                    <Alert variant="default" className={`mt-6 mb-8 ${alertBgClass}`}>
                        <Info className="h-4 w-4" />
                        <AlertTitle className={`font-medium ${alertTitleClass}`}>{alertTitle}</AlertTitle>
                        <AlertDescription className="text-xs">{alertDesc}</AlertDescription>
                    </Alert>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {displayedBookmarks.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                                You haven't saved any product ideas yet. Use the <Bookmark className="inline h-4 w-4 mx-1" /> icon on suggestions to save them.
                            </div>
                        ) : (
                            displayedBookmarks.map((bm) => {
                                const item = { // Map BookmarkedProduct to card structure
                                    id: bm.productId,
                                    name: bm.productName,
                                    description: bm.description,
                                    category: bm.category,
                                    reasoning: bm.reasoning,
                                    searchKeywords: bm.searchKeywords,
                                };
                                const isBookmarked = true; // Always true here
                                const isToggling = togglingBookmarkId === item.id;
                                return (
                                    <Card key={item.id} className="flex flex-col h-full border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden bg-white dark:bg-gray-800">
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <CardTitle className="text-base font-semibold text-momcare-primary dark:text-momcare-light">{item.name}</CardTitle>
                                                {item.category && ( <Badge variant="secondary" className="text-xs whitespace-nowrap capitalize bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600"> {item.category} </Badge> )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-1 flex-grow space-y-2">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{item.description}</p>
                                            {item.reasoning && ( <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700"> <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start"> <MessageCircleQuestion className="h-4 w-4 mr-1.5 flex-shrink-0 text-blue-500 dark:text-blue-400" /> <span className="font-medium mr-1">Why suggested?</span> {item.reasoning} </p> </div> )}
                                            {item.searchKeywords && ( <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">Keywords: {item.searchKeywords}</p> )}
                                        </CardContent>
                                        <CardFooter className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                            <Button asChild size="sm" className="flex-grow bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark text-white mr-2">
                                                <a href={generateSearchLink(item.name)} target="_blank" rel="noopener noreferrer" aria-label={`Search for ${item.name} online`}>
                                                    <Search className="mr-2 h-4 w-4" /> Find Online
                                                </a>
                                            </Button>
                                            <Tooltip delayDuration={150}>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="icon" className={`border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-momcare-primary dark:hover:text-momcare-light w-9 h-9 bg-momcare-light dark:bg-momcare-primary/20 text-momcare-primary dark:text-momcare-light border-momcare-primary/50 dark:border-momcare-primary/30`} onClick={() => handleBookmarkToggle({ id: item.id, name: item.name })} disabled={isToggling || loadingBookmarks} aria-label={'Remove bookmark'} >
                                                        {isToggling ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : ( <BookmarkCheck className="h-4 w-4 text-momcare-primary dark:text-momcare-light" /> )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent> <p>{'Remove from Saved'}</p> </TooltipContent>
                                            </Tooltip>
                                        </CardFooter>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                    {/* Refresh button might not be needed in bookmark view, but kept for consistency */}
                    <div className="mt-8 flex justify-center border-t border-gray-200 dark:border-gray-700 pt-6">
                        <Button onClick={handleManualRefresh} variant="outline" size="sm" disabled={loadingProfile || loadingRecommendations} className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                            <RefreshCw className={`mr-2 h-4 w-4 ${loadingProfile || loadingRecommendations ? 'animate-spin' : ''}`} /> Refresh Recommendations
                        </Button>
                    </div>
                </>
            );
        }

        // State 6: Success - Render Recommendations View
        if (recommendations) {
            let alertTitle = "AI Suggestions"; let alertDesc = "Showing product ideas."; let alertVariant: "default" | "destructive" = "default"; let alertBgClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30 text-blue-800 dark:text-blue-200'; let alertTitleClass = 'text-blue-900 dark:text-blue-100'; let retryButtonClass = 'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100';

            const displayedRecommendations = recommendations; // No filtering needed here

            switch (recommendationType) {
                case 'personalized': alertTitle = "Personalized Suggestions"; alertDesc = "Based on your profile. General ideas, not medical advice."; alertVariant = 'default'; alertBgClass = 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700/30 text-blue-800 dark:text-blue-200'; alertTitleClass = 'text-blue-900 dark:text-blue-100'; retryButtonClass = 'text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100'; break;
                case 'general': alertTitle = "General Suggestions"; alertDesc = personalizedFetchAttempted ? "Personalized failed. Showing general ideas." : "Showing general ideas for pregnancy."; alertVariant = 'default'; alertBgClass = 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700/30 text-yellow-800 dark:text-yellow-200'; alertTitleClass = 'text-yellow-900 dark:text-yellow-100'; retryButtonClass = 'text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100'; break;
                case 'prompt-based': alertTitle = `Suggestions for "${activeSearchPrompt}"`; alertDesc = `Based on your search${selectedCategory ? ` in '${selectedCategory}'` : ''}.`; alertVariant = 'default'; alertBgClass = 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700/30 text-green-800 dark:text-green-200'; alertTitleClass = 'text-green-900 dark:text-green-100'; break;
            }

            return (
                 <>
                    <Alert variant={alertVariant} className={`mt-6 mb-8 ${alertBgClass}`}>
                        <Info className="h-4 w-4" />
                        <AlertTitle className={`font-medium ${alertTitleClass}`}>{alertTitle}</AlertTitle>
                        <AlertDescription className="text-xs">{alertDesc} Use 'Find Online' to search. Save useful items with the bookmark icon.</AlertDescription>
                        {/* Show retry personalized only if general was shown due to failure */}
                        {recommendationType === 'general' && personalizedFetchAttempted && (
                            <Button variant="link" size="sm" onClick={handleManualRefresh} className={`text-xs h-auto p-0 mt-1 ${retryButtonClass}`} disabled={loadingProfile}>
                                Try Personalized Again?
                            </Button>
                        )}
                    </Alert>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {displayedRecommendations.length === 0 ? (
                            <div className="col-span-full text-center py-10 text-gray-500 dark:text-gray-400">
                                {activeSearchPrompt
                                    ? `The AI couldn't find recommendations matching "${activeSearchPrompt}"${selectedCategory ? ` in '${selectedCategory}'` : ''}.`
                                    : recommendationType === 'personalized'
                                        ? "The AI couldn't find personalized recommendations based on your profile."
                                        : "The AI couldn't find relevant recommendations at this time."
                                } Try refining your search or category, or use the refresh button.
                            </div>
                        ) : (
                            displayedRecommendations.map((item) => {
                                const isBookmarked = bookmarkMap.has(item.id);
                                const isToggling = togglingBookmarkId === item.id;
                                return (
                                    <Card key={item.id} className="flex flex-col h-full border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden bg-white dark:bg-gray-800">
                                        <CardHeader className="p-4 pb-2">
                                            <div className="flex justify-between items-start gap-2">
                                                <CardTitle className="text-base font-semibold text-momcare-primary dark:text-momcare-light">{item.name}</CardTitle>
                                                {item.category && ( <Badge variant="secondary" className="text-xs whitespace-nowrap capitalize bg-momcare-light text-momcare-dark hover:bg-momcare-dark hover:text-momcare-light"> {item.category} </Badge> )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-1 flex-grow space-y-2">
                                            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">{item.description}</p>
                                            {item.reasoning && ( <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700"> <p className="text-xs text-gray-500 dark:text-gray-400 flex items-start"> <MessageCircleQuestion className="h-4 w-4 mr-1.5 flex-shrink-0 text-blue-500 dark:text-blue-400" /> <span className="font-medium mr-1">Why suggested?</span> {item.reasoning} </p> </div> )}
                                            {item.searchKeywords && ( <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic">Keywords: {item.searchKeywords}</p> )}
                                        </CardContent>
                                        <CardFooter className="p-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                                            <Button asChild size="sm" className="flex-grow bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark text-white mr-2">
                                                <a href={generateSearchLink(item.name)} target="_blank" rel="noopener noreferrer" aria-label={`Search for ${item.name} online`}>
                                                    <Search className="mr-2 h-4 w-4" /> Find Online
                                                </a>
                                            </Button>
                                            <Tooltip delayDuration={150}>
                                                <TooltipTrigger asChild>
                                                    <Button variant="outline" size="icon" className={`border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-momcare-primary dark:hover:text-momcare-light w-9 h-9 ${isBookmarked ? 'bg-momcare-light dark:bg-momcare-primary/20 text-momcare-primary dark:text-momcare-light border-momcare-primary/50 dark:border-momcare-primary/30' : ''}`} onClick={() => handleBookmarkToggle(item)} disabled={isToggling || loadingBookmarks} aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'} >
                                                        {isToggling ? ( <Loader2 className="h-4 w-4 animate-spin" /> ) : isBookmarked ? ( <BookmarkCheck className="h-4 w-4 text-momcare-primary dark:text-momcare-light" /> ) : ( <Bookmark className="h-4 w-4" /> )}
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent> <p>{isBookmarked ? 'Remove from Saved' : 'Save for Later'}</p> </TooltipContent>
                                            </Tooltip>
                                        </CardFooter>
                                    </Card>
                                );
                            })
                        )}
                    </div>
                    <div className="mt-8 flex justify-center border-t border-gray-200 dark:border-gray-700 pt-6">
                        <Button onClick={handleManualRefresh} variant="outline" size="sm" disabled={loadingProfile || loadingRecommendations} className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                            <RefreshCw className={`mr-2 h-4 w-4 ${loadingProfile || loadingRecommendations ? 'animate-spin' : ''}`} /> Refresh Recommendations
                        </Button>
                    </div>
                </>
            );
        }

        // Default Fallback (Should ideally only show briefly during initial auth check)
        return (
            <div className="text-center mt-10 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" /> Checking authentication and loading...
            </div>
        );
    };

    // --- Component Return ---
    return (
        <MainLayout requireAuth={true}>
            <TooltipProvider delayDuration={100}>
                <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 sm:py-12">
                    {/* Page Header */}
                    <div className="text-center mb-8 md:mb-12">
                        <h1 className="text-3xl md:text-4xl font-bold text-momcare-primary dark:text-momcare-light tracking-tight flex items-center justify-center gap-3">
                            <Sparkles className="w-7 h-7 text-momcare-accent" />
                            AI Product Suggestions
                            <Package className="w-7 h-7 text-momcare-secondary" />
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-3 max-w-2xl mx-auto">
                            Discover products helpful for your pregnancy journey. Get personalized ideas or search for specific needs. Save your favorites!
                        </p>
                    </div>

                    {/* Search and Filter Controls */}
                    <Card className="mb-8 border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800">
                        <CardHeader className="pb-4 border-b border-gray-100 dark:border-gray-700">
                            <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-100">Find Recommendations</CardTitle>
                            <CardDescription className="text-sm text-gray-500 dark:text-gray-400">
                                Enter keywords or select a category. Leave blank for personalized/general ideas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-4 items-end">
                                {/* Search Input */}
                                <div className="flex-grow w-full sm:w-auto">
                                    <Label htmlFor="product-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"> Search for products related to... </Label>
                                    <Input
                                        id="product-search"
                                        type="text"
                                        placeholder="e.g., comfortable sleep, baby feeding"
                                        value={userPrompt}
                                        onChange={(e) => setUserPrompt(e.target.value)}
                                        className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                        disabled={loadingRecommendations || loadingProfile}
                                    />
                                </div>
                                {/* Category Select */}
                                <div className="w-full sm:w-auto sm:min-w-[200px]">
                                    <Label htmlFor="product-category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"> Filter by Category </Label>
                                    <Select value={selectedCategory} onValueChange={handleCategoryChange} disabled={loadingRecommendations || loadingProfile} >
                                        <SelectTrigger id="product-category" className="w-full dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                                            {/* REMOVED: Invalid SelectItem for "All Categories" */}
                                            {/* <SelectItem value="" className="dark:hover:bg-gray-700">All Categories</SelectItem> */}
                                            {VALID_PRODUCT_CATEGORIES.map(cat => ( <SelectItem key={cat} value={cat} className="dark:hover:bg-gray-700">{cat}</SelectItem> ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                {/* Search/Show Default Button */}
                                <Button
                                    type="submit"
                                    className="w-full sm:w-auto bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark"
                                    disabled={loadingRecommendations || loadingProfile || (!userPrompt.trim() && !activeSearchPrompt && !selectedCategory)} // Disable if nothing to search/filter by
                                    title={!userPrompt.trim() && (activeSearchPrompt || selectedCategory) ? "Clear search/filter and show default recommendations" : "Search recommendations"}
                                >
                                    <Search className="mr-2 h-4 w-4" />
                                    {(!userPrompt.trim() && (activeSearchPrompt || selectedCategory)) ? "Show Default" : "Search"}
                                </Button>
                                {/* Clear Search Button */}
                                {(activeSearchPrompt || selectedCategory) && (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon" // Make it an icon button
                                        onClick={handleClearSearch}
                                        disabled={loadingRecommendations || loadingProfile}
                                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-9 w-9" // Adjust size
                                        title="Clear search and category filter"
                                    >
                                        <X className="h-4 w-4" />
                                        <span className="sr-only">Clear Search</span>
                                    </Button>
                                )}
                            </form>
                        </CardContent>
                    </Card>

                    {/* Bookmark Toggle Button Area */}
                    {isAuthenticated && bookmarkMap.size > 0 && (
                        <div className="mb-6 flex justify-end">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleToggleShowBookmarked}
                                disabled={loadingRecommendations || loadingBookmarks || loadingProfile}
                                className={`border-gray-300 dark:border-gray-600 ${showOnlyBookmarked
                                    ? 'text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-momcare-primary'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700  hover:text-momcare-primary'
                                }`}
                            >
                                {showOnlyBookmarked ? <ListFilter className="mr-2 h-4 w-4" /> : <Bookmark className="mr-2 h-4 w-4" />}
                                {showOnlyBookmarked ? 'Show All Suggestions' : `Show Saved (${bookmarkMap.size})`}
                            </Button>
                        </div>
                    )}

                    {/* Render dynamic content area */}
                    {renderContent()}

                </div>
            </TooltipProvider>
        </MainLayout>
    );
};

export default ProductPage;