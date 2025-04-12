// src/pages/ResourcesPage.tsx

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // Import Link for potential category links etc.
import { Badge } from '@/components/ui/badge';
// --- Layout & UI Components ---
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast'; // Toast notifications

// --- Appwrite & State ---
import { getBlogPosts, BlogPost } from '@/lib/appwrite'; // Appwrite function and BlogPost type
import { useAuthStore } from '@/store/authStore'; // Zustand auth store

// --- Icons ---
import { Loader2, ChevronRight, Search, PlusCircle, Filter, ImageOff, FileText, AlertTriangle } from 'lucide-react'; // Added ImageOff, FileText, AlertTriangle

// --- Component Definition ---

const ResourcesPage: React.FC = () => {
    // --- Hooks ---
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user, isAuthenticated } = useAuthStore(); // Get user and auth status

    // --- State ---
    const [isLoading, setIsLoading] = useState<boolean>(true); // Loading state for fetching posts
    const [featuredPost, setFeaturedPost] = useState<BlogPost | null>(null); // State for the featured post
    const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]); // State for the list of regular posts
    const [searchQuery, setSearchQuery] = useState<string>(''); // State for the search input value
    const [selectedCategory, setSelectedCategory] = useState<string>('All'); // State for the selected category filter
    const [error, setError] = useState<string | null>(null); // State for storing fetch errors

    // --- Constants ---
    // Define categories for the filter dropdown
    const categories: string[] = [
        'All', 'Pregnancy', 'Childbirth', 'Postpartum', 'Nutrition', 'Exercise',
        'Mental Health', 'Baby Care', 'Parenting', 'General Wellness',
        'Tips & Tricks', 'Community Stories'
    ];

    // --- Authorization Check ---
    // Determine if the logged-in user is an admin based on labels
    const isAdmin = isAuthenticated && Array.isArray(user?.labels) && user.labels.includes('admin');

    // --- Data Fetching ---
    /**
     * Fetches blog posts from Appwrite based on search query and category filter.
     * Memoized using useCallback to prevent unnecessary re-renders.
     */
    const fetchPosts = useCallback(async (search: string = '', category: string = 'All') => {
        setIsLoading(true);
        setError(null); // Clear previous errors
        console.log(`Fetching posts with search: "${search}", category: "${category}"`);

        try {
            // Treat 'All' category as no filter (empty string)
            const categoryFilter = category === 'All' ? '' : category;
            const postsResponse = await getBlogPosts(search.trim(), categoryFilter);

            // Ensure the response is correctly typed as BlogPost[]
            const typedPosts: BlogPost[] = postsResponse;
            console.log(`Fetched ${typedPosts.length} posts.`);

            if (typedPosts.length > 0) {
                // Find the first post that has a slug to be featured
                const firstValidFeatured = typedPosts.find(p => p.slug);

                if (firstValidFeatured) {
                    setFeaturedPost(firstValidFeatured);
                    // Set remaining posts, excluding the featured one
                    setBlogPosts(typedPosts.filter(p => p.$id !== firstValidFeatured.$id));
                } else {
                    // If no post has a slug (unlikely, but possible), feature none and list all
                    console.warn("No posts with slugs found to feature.");
                    setFeaturedPost(null);
                    setBlogPosts(typedPosts);
                }
            } else {
                // No posts found
                setFeaturedPost(null);
                setBlogPosts([]);
            }
        } catch (err: unknown) {
            console.error('Error fetching blog posts:', err);
            const errorMessage = err instanceof Error ? err.message : "Could not load blog posts. Please try again later.";
            setError(errorMessage); // Set error state
            toast({
                title: "Error Fetching Posts",
                description: errorMessage,
                variant: "destructive",
            });
            // Clear posts on error
            setFeaturedPost(null);
            setBlogPosts([]);
        } finally {
            setIsLoading(false); // Ensure loading is set to false
        }
    }, [toast]); // Dependency: toast function

    // --- Effects ---
    // Fetch posts when the component mounts
    useEffect(() => {
        fetchPosts();
        // The dependency array includes the memoized fetchPosts function.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchPosts]);

    // --- Event Handlers ---

    /** Handles the submission of the search form. */
    const handleSearch = (e: FormEvent<HTMLFormElement>): void => {
        e.preventDefault(); // Prevent default form submission
        fetchPosts(searchQuery, selectedCategory); // Trigger fetch with current state
    };

    /** Handles changes in the category filter dropdown. */
    const handleCategoryChange = (value: string): void => {
        setSelectedCategory(value); // Update category state
        fetchPosts(searchQuery, value); // Trigger fetch with new category
    };

    /** Navigates to the single blog post page using its slug. */
    const handleViewPost = (postSlug: string | undefined): void => {
        if (!postSlug) {
            console.error("Cannot navigate: Post slug is missing.");
            toast({
                title: "Navigation Error",
                description: "Could not find the identifier (slug) for this post.",
                variant: "destructive",
            });
            return;
        }
        console.log(`Navigating to post with slug: ${postSlug}`);
        navigate(`/blog/${postSlug}`); // Use navigate function
    };

    /** Navigates to the page for creating a new blog post. */
    const handleCreatePost = (): void => {
        navigate('/create-blog');
    };

    // --- Helper Functions ---

    /** Formats a date string safely. */
    const formatDate = (dateString: string | undefined): string => {
        if (!dateString) return 'Unknown date';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return date.toLocaleDateString('en-US', {
                year: 'numeric', month: 'long', day: 'numeric'
            });
        } catch {
            return 'Invalid date format';
        }
    };

    /** Creates a short text snippet from content, removing basic HTML tags. */
    const getContentSnippet = (content: string | undefined, length: number = 150): string => {
        if (!content) return '';
        // Simple regex to remove HTML tags (may not be perfect for complex HTML)
        const textContent = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
        return textContent.length > length ? `${textContent.substring(0, length)}...` : textContent;
    };

    // --- Render Logic ---

    return (
        <MainLayout>
            <div className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
                {/* Page Header */}
                <div className="text-center mb-10 md:mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-momcare-primary dark:text-momcare-light">Pregnancy Resources</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 max-w-2xl mx-auto">
                        Expert advice, tips, and guidance for every stage of your pregnancy journey.
                    </p>
                </div>

                {/* Search and Filter Controls */}
                <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
                    {/* Search Input Form */}
                    <div className="flex-1 w-full md:w-auto">
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                                <Input
                                    type="text"
                                    placeholder="Search articles by title..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10 h-10 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                    aria-label="Search blog posts by title"
                                />
                            </div>
                            <Button type="submit" className="bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark h-10">
                                Search
                            </Button>
                        </form>
                    </div>

                    {/* Category Filter Dropdown */}
                    <div className="w-full md:w-auto md:min-w-[200px]">
                        <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                            <SelectTrigger className="h-10 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" aria-label="Filter by category">
                                <Filter className="mr-2 h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <SelectValue placeholder="Filter by Category" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                                {categories.map(category => (
                                    <SelectItem key={category} value={category} className="dark:hover:bg-gray-700">
                                        {category}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Create Post Button (Conditional Rendering for Admins) */}
                    {isAdmin && (
                        <Button
                            onClick={handleCreatePost}
                            className="w-full md:w-auto bg-momcare-accent text-white hover:bg-momcare-accent/90 dark:bg-momcare-accent dark:hover:bg-momcare-accent/90 h-10"
                        >
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create New Post
                        </Button>
                    )}
                </div>

                {/* Loading State */}
                {isLoading ? (
                    <div className="flex justify-center items-center py-20 min-h-[300px]">
                        <Loader2 className="h-12 w-12 text-momcare-primary dark:text-momcare-light animate-spin" />
                        <span className="sr-only">Loading resources...</span>
                    </div>
                ) : error ? (
                    // Error State
                    <div className="text-center py-16 bg-red-50 dark:bg-red-900/20 rounded-lg border border-dashed border-red-200 dark:border-red-800/30 text-red-700 dark:text-red-300">
                         <AlertTriangle className="mx-auto h-12 w-12 text-red-500 dark:text-red-400" />
                         <h3 className="mt-2 text-lg font-medium">Failed to Load Resources</h3>
                         <p className="mt-1 text-sm">{error}</p>
                         <Button
                            variant="outline"
                            onClick={() => fetchPosts(searchQuery, selectedCategory)} // Allow retry
                            className="mt-4 text-red-700 border-red-300 hover:bg-red-100 dark:text-red-300 dark:border-red-600 dark:hover:bg-red-900/30"
                         >
                            Retry
                         </Button>
                    </div>
                ) : (
                    // Content Display Area (Featured Post + List)
                    <>
                        {/* Featured Post Section */}
                        {featuredPost ? (
                            <div className="mb-12">
                                <h2 className="text-2xl font-bold text-momcare-primary dark:text-momcare-light mb-4">Featured Article</h2>
                                <Card className="overflow-hidden border border-momcare-primary/20 dark:border-gray-700/50 shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-gray-800">
                                    <div className="md:flex">
                                        {/* Featured Post Image */}
                                        <div className="md:w-1/2 bg-momcare-light dark:bg-gray-700 flex-shrink-0">
                                            {featuredPost.imageUrl ? (
                                                <img
                                                    src={featuredPost.imageUrl}
                                                    alt={featuredPost.title || 'Featured post image'}
                                                    className="h-64 w-full object-cover md:h-full md:max-h-[400px]" // Constrained height
                                                    loading="lazy"
                                                />
                                            ) : (
                                                // Placeholder if no image URL
                                                <div className="h-64 md:h-full w-full flex items-center justify-center bg-gradient-to-br from-momcare-light to-momcare-primary/10 dark:from-gray-700 dark:to-gray-600/50 p-10">
                                                    <ImageOff className="w-16 h-16 text-momcare-primary/50 dark:text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Featured Post Content */}
                                        <div className="md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
                                            <div>
                                                <CardHeader className="px-0 pt-0 pb-3">
                                                    {featuredPost.category && (
                                                        <div className="mb-2">
                                                            <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-full bg-momcare-light text-momcare-dark tracking-wide hover:bg-momcare-dark hover:text-momcare-light">
                                                                {featuredPost.category}
                                                            </Badge>
                                                        </div>
                                                    )}
                                                    <CardTitle className="text-2xl md:text-3xl font-bold leading-tight text-momcare-dark dark:text-gray-100 hover:text-momcare-primary dark:hover:text-momcare-light transition-colors">
                                                        {/* Make title clickable */}
                                                        <button onClick={() => handleViewPost(featuredPost.slug)} className="text-left hover:underline focus:outline-none focus:ring-2 focus:ring-momcare-primary rounded">
                                                            {featuredPost.title}
                                                        </button>
                                                    </CardTitle>
                                                    <CardDescription className="text-sm text-gray-500 dark:text-gray-400 pt-1">
                                                        By {featuredPost.author || 'MomCare Team'} • {formatDate(featuredPost.publishedAt || featuredPost.$createdAt)}
                                                    </CardDescription>
                                                </CardHeader>
                                                <CardContent className="px-0 pb-4">
                                                    <p className="text-gray-700 dark:text-gray-300 line-clamp-4"> {/* Limit lines shown */}
                                                        {getContentSnippet(featuredPost.content, 200)}
                                                    </p>
                                                </CardContent>
                                            </div>
                                            <CardFooter className="px-0 pb-0 pt-4">
                                                <Button
                                                    onClick={() => handleViewPost(featuredPost.slug)}
                                                    className="bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark"
                                                    aria-label={`Read full article titled ${featuredPost.title}`}
                                                >
                                                    Read Full Article <ChevronRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </CardFooter>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            // Only show "No featured post" if there are also no regular posts and not searching/filtering
                            !featuredPost && blogPosts.length === 0 && !searchQuery && selectedCategory === 'All' && (
                                <div className="text-center py-10 text-gray-500 dark:text-gray-400">No featured article available yet.</div>
                            )
                        )}

                        {/* Latest Articles / Search Results Section */}
                        <h2 className="text-2xl font-bold text-momcare-primary dark:text-momcare-light mb-6 border-b dark:border-gray-700 pb-2">
                            {searchQuery || selectedCategory !== 'All'
                                ? 'Search Results'
                                : 'Latest Articles'}
                        </h2>

                        {blogPosts.length > 0 ? (
                            // Grid for the list of posts
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {blogPosts.map((post) => (
                                    <Card key={post.$id} className="border border-momcare-primary/10 dark:border-gray-700/50 hover:border-momcare-primary/30 dark:hover:border-gray-600 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col bg-white dark:bg-gray-800">
                                        {/* Post Image */}
                                        <div className="h-48 bg-momcare-light dark:bg-gray-700 overflow-hidden">
                                            {post.imageUrl ? (
                                                <img
                                                    src={post.imageUrl}
                                                    alt={post.title || 'Blog post image'}
                                                    className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                                                    loading="lazy"
                                                />
                                            ) : (
                                                // Placeholder if no image
                                                <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-momcare-light to-momcare-primary/10 dark:from-gray-700 dark:to-gray-600/50">
                                                    <FileText className="w-12 h-12 text-momcare-primary/40 dark:text-gray-500" />
                                                </div>
                                            )}
                                        </div>
                                        {/* Post Content */}
                                        <div className="p-4 flex flex-col flex-grow">
                                            <CardHeader className="px-0 pt-0 pb-2">
                                                {post.category && (
                                                    <div className="mb-2">
                                                         <Badge variant="secondary" className="text-xs font-semibold px-2.5 py-1 rounded-full bg-momcare-light text-momcare-dark tracking-wide hover:bg-momcare-dark hover:text-momcare-light">
                                                            {post.category}
                                                        </Badge>
                                                    </div>
                                                )}
                                                <CardTitle className="text-lg font-semibold leading-snug line-clamp-2 hover:text-momcare-primary dark:text-gray-100 dark:hover:text-momcare-light transition-colors">
                                                    {/* Make title clickable */}
                                                    <button onClick={() => handleViewPost(post.slug)} className="text-left hover:underline focus:outline-none focus:ring-2 focus:ring-momcare-primary rounded">
                                                        {post.title}
                                                    </button>
                                                </CardTitle>
                                                <CardDescription className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                                                    By {post.author || 'MomCare Team'} • {formatDate(post.publishedAt || post.$createdAt)}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="px-0 pb-3 flex-grow">
                                                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3"> {/* Limit lines */}
                                                    {getContentSnippet(post.content)}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="px-0 pb-0 pt-3 mt-auto">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => handleViewPost(post.slug)}
                                                    className="w-full text-momcare-primary border-momcare-primary/30 hover:text-momcare-dark hover:bg-momcare-light hover:border-momcare-primary/50 dark:text-momcare-light dark:border-gray-600 dark:hover:bg-gray-700 dark:hover:text-white text-sm"
                                                    aria-label={`Read article titled ${post.title}`}
                                                >
                                                    Read Article
                                                </Button>
                                            </CardFooter>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            // No Results Message
                            <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed dark:border-gray-700">
                                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                    <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                </svg>
                                <h3 className="mt-2 text-lg font-medium text-gray-800 dark:text-gray-200">No articles found</h3>
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {searchQuery || selectedCategory !== 'All'
                                        ? 'Try adjusting your search or filter criteria.'
                                        : 'Check back soon for new content!'}
                                </p>
                                {/* Button to clear filters/search if active */}
                                {(searchQuery || selectedCategory !== 'All') && (
                                    <Button
                                        variant="ghost"
                                        onClick={() => {
                                            setSearchQuery('');
                                            setSelectedCategory('All');
                                            fetchPosts('', 'All'); // Fetch all posts again
                                        }}
                                        className="mt-4 text-momcare-primary hover:text-momcare-dark dark:text-momcare-light dark:hover:text-white"
                                    >
                                        Clear Search & Filters
                                    </Button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>
        </MainLayout>
    );
};

export default ResourcesPage;