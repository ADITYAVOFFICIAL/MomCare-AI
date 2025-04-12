// src/pages/BlogPostPage.tsx

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown'; // Renders Markdown content
import remarkGfm from 'remark-gfm'; // Plugin for GitHub Flavored Markdown support (tables, strikethrough, etc.)
import rehypeHighlight from 'rehype-highlight'; // Plugin for syntax highlighting in code blocks
import rehypeRaw from 'rehype-raw'; // Plugin to allow rendering raw HTML within Markdown (Use with caution!)

// --- CSS Imports ---
// Import syntax highlighting theme (choose one that matches your site's theme)
import 'highlight.js/styles/github.css'; // Example: Light theme for code blocks
// import 'highlight.js/styles/github-dark.css'; // Example: Dark theme for code blocks

// --- App Specific Imports ---
import { getBlogPostBySlug, deleteBlogPost, BlogPost } from '@/lib/appwrite'; // Appwrite functions and types
import MainLayout from '@/components/layout/MainLayout'; // Your main layout component
import { Button } from '@/components/ui/button'; // Your UI components library
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast'; // Hook for displaying notifications
import {
    Loader2, // Loading spinner icon
    ArrowLeft, // Back arrow icon
    User, // User icon
    Calendar, // Calendar icon
    Tag, // Tag icon
    AlertTriangle, // Warning icon
    FileQuestion, // Not found icon
    Edit, // Edit icon
    Trash2 // Delete icon
} from 'lucide-react'; // Icon library
import { useAuthStore } from '@/store/authStore'; // Zustand store for authentication state
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"; // Confirmation dialog component

// --- Helper Function ---

/**
 * Formats a date string or Date object into a readable format.
 * @param dateInput - The date string (ISO format preferred) or Date object.
 * @returns A formatted date string (e.g., "April 5, 2025") or an error message.
 */
const formatDate = (dateInput: string | Date | undefined): string => {
    if (!dateInput) return 'Unknown date';
    try {
        // Ensure input is a Date object
        const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
        // Check if the date is valid after parsing
        if (isNaN(date.getTime())) {
            return 'Invalid date';
        }
        // Format the date
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    } catch (error) {
        console.error("Error formatting date:", error);
        return 'Invalid date format'; // More specific error
    }
};

// --- Constants ---
const FALLBACK_AUTHOR = 'MomCare Team'; // Default author name if not specified in post

// --- Component Definition ---

const BlogPostPage: React.FC = () => {
    // --- Hooks ---
    const { slug } = useParams<{ slug: string }>(); // Get the 'slug' parameter from the URL
    const navigate = useNavigate(); // Hook for programmatic navigation
    const { toast } = useToast(); // Hook to display toast notifications
    const { user, isAuthenticated } = useAuthStore(); // Get user data and auth status from the store

    // --- State ---
    const [post, setPost] = useState<BlogPost | null>(null); // Holds the fetched blog post data
    const [isLoading, setIsLoading] = useState<boolean>(true); // Tracks loading state for fetching
    const [isDeleting, setIsDeleting] = useState<boolean>(false); // Tracks loading state for deletion
    const [error, setError] = useState<string | null>(null); // Stores any error message during fetch

    // --- Authorization Check ---
    // Determine if the current logged-in user is an admin by checking their labels.
    // Requires the user object in the authStore to include the 'labels' array.
    const isAdmin = isAuthenticated && Array.isArray(user?.labels) && user.labels.includes('admin');

    // --- Data Fetching ---
    /**
     * Fetches the blog post data based on the slug from the URL parameter.
     * Uses useCallback to memoize the function, preventing unnecessary refetches
     * if passed as a dependency to useEffect.
     */
    const fetchPost = useCallback(async () => {
        if (!slug) {
            setError("Blog post identifier (slug) is missing from the URL.");
            setIsLoading(false);
            toast({ title: "Error", description: "Missing post identifier.", variant: "destructive" });
            return;
        }

        console.log(`Fetching post with slug: ${slug}`);
        setIsLoading(true);
        setError(null); // Clear previous errors
        setPost(null); // Clear previous post data

        try {
            const fetchedPost = await getBlogPostBySlug(slug);
            if (fetchedPost) {
                setPost(fetchedPost);
                console.log(`Post "${fetchedPost.title}" loaded successfully.`);
            } else {
                setError(`Blog post with slug "${slug}" was not found.`);
                setPost(null); // Ensure post is null if not found
                console.warn(`Post with slug "${slug}" not found.`);
            }
        } catch (err: unknown) {
            console.error(`Error fetching blog post with slug "${slug}":`, err);
            const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred while loading the post.";
            setError(errorMessage);
            toast({ title: "Error Loading Post", description: errorMessage, variant: "destructive" });
        } finally {
            setIsLoading(false); // Ensure loading state is turned off
        }
    // Add slug and toast as dependencies for useCallback
    }, [slug, toast]);

    // Effect to trigger fetching the post when the component mounts or the slug changes.
    useEffect(() => {
        fetchPost();
    }, [fetchPost]); // fetchPost is memoized by useCallback

    // --- Delete Handler ---
    /**
     * Handles the deletion of the current blog post after confirmation.
     * Only proceeds if the user is an admin and the post exists.
     */
    const handleDeletePost = async (): Promise<void> => {
        // Double-check permissions and post existence
        if (!post?.$id || !isAdmin) {
            toast({
                title: "Deletion Prevented",
                description: "Cannot delete post. Missing post ID or insufficient permissions.",
                variant: "destructive"
            });
            return;
        }

        setIsDeleting(true); // Set deleting state for UI feedback
        console.log(`Attempting to delete post: ${post.$id} (${post.title})`);

        try {
            // Call the Appwrite function to delete the post document
            // Pass imageFileId and bucketId if image cleanup is needed (requires adding those to state/fetch)
            await deleteBlogPost(post.$id /*, post.imageFileId, blogImageBucketId */); // Add image details if applicable
            toast({ title: "Post Deleted", description: `"${post.title}" has been successfully deleted.` });
            console.log(`Post ${post.$id} deleted successfully.`);
            navigate('/resources'); // Redirect to the main resources page after deletion
        } catch (error: unknown) {
            console.error(`Error deleting post ${post.$id}:`, error);
            const errorMessage = error instanceof Error ? error.message : "Could not delete the post due to an unknown error.";
            toast({ title: "Deletion Failed", description: errorMessage, variant: "destructive" });
            setIsDeleting(false); // Reset deleting state on failure
        }
        // No finally block needed here for setIsDeleting, as success navigates away
    };

    // --- Render Logic ---

    // 1. Loading State
    if (isLoading) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center min-h-[calc(100vh-12rem)]">
                    <Loader2 className="h-10 w-10 animate-spin text-momcare-primary" />
                    <span className="sr-only">Loading blog post...</span>
                </div>
            </MainLayout>
        );
    }

    // 2. Error State (including Not Found)
    if (error) {
        const isNotFound = error.toLowerCase().includes("not found");
        return (
            <MainLayout>
                <div className="flex flex-col items-center justify-center min-h-[calc(100vh-20rem)] text-center px-4 py-16">
                    {isNotFound ? (
                        <FileQuestion className="h-12 w-12 text-muted-foreground mb-4" />
                    ) : (
                        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                    )}
                    <h2 className="text-2xl font-semibold mb-2">
                        {isNotFound ? "Post Not Found" : "Error Loading Post"}
                    </h2>
                    <p className="text-muted-foreground max-w-md mb-6">{error}</p>
                    <Button variant="outline" onClick={() => navigate('/resources')}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Resources
                    </Button>
                </div>
            </MainLayout>
        );
    }

    // 3. Fallback if post is somehow null after loading without error (should not happen with current logic)
    if (!post) {
        return (
            <MainLayout>
                <div className="text-center py-20 text-muted-foreground">
                    Blog post data is unexpectedly unavailable. Please try again.
                </div>
            </MainLayout>
        );
    }

    // 4. Success State: Render the Post
    return (
        <MainLayout>
            {/* Optional: Consistent background with other pages */}
            <div className="bg-gradient-to-b from-white to-momcare-light/30 dark:from-gray-900 dark:to-gray-800/30">
                <article className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20">

                    {/* Top Bar: Back Navigation & Conditional Admin Controls */}
                    <div className="mb-8 flex flex-wrap justify-between items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/resources')}
                            className="text-muted-foreground hover:text-foreground"
                            aria-label="Back to all resources"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Resources
                        </Button>

                        {/* Admin Controls: Only render if isAdmin is true */}
                        {isAdmin && (
                            <div className="flex gap-2">
                                {/* Edit Button */}
                                <Button
                                    variant="outline"
                                    size="sm"
                                    // Navigate to an edit page (assuming route like /edit-blog/:slug)
                                    onClick={() => navigate(`/edit-blog/${post.slug}`)}
                                    disabled={isDeleting} // Disable if deletion is in progress
                                    aria-label={`Edit post titled ${post.title}`}
                                    className="border-momcare-secondary text-momcare-secondary hover:bg-momcare-light hover:text-momcare-dark dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-700 dark:hover:text-blue-300"
                                >
                                    <Edit className="mr-1.5 h-4 w-4" /> Edit
                                </Button>

                                {/* Delete Button with Confirmation Dialog */}
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={isDeleting} // Disable while deleting
                                            aria-label={`Delete post titled ${post.title}`}
                                        >
                                            {isDeleting ? (
                                                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="mr-1.5 h-4 w-4" />
                                            )}
                                            {isDeleting ? 'Deleting...' : 'Delete'}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete the blog post titled "<span className="font-semibold">{post.title}</span>".
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDeletePost} // Call delete handler on confirm
                                                disabled={isDeleting}
                                                className="bg-destructive hover:bg-destructive/90" // Destructive action style
                                            >
                                                {isDeleting ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                                                    </>
                                                ) : (
                                                    "Yes, delete post"
                                                )}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        )}
                    </div>

                    {/* Post Header */}
                    <header className="mb-10 md:mb-12 border-b border-momcare-primary/20 dark:border-gray-700/50 pb-8">
                        {/* Category Badge (Link to filtered resources) */}
                        {post.category && (
                            <Link
                                to={`/resources?category=${encodeURIComponent(post.category)}`}
                                className="inline-block mb-4 group"
                                aria-label={`View posts in category ${post.category}`}
                            >
                                <Badge
                                    variant="default" // Use theme colors
                                    className="text-sm px-3 py-1 rounded-full bg-momcare-light text-momcare-primary group-hover:bg-momcare-primary/20 transition-colors border border-momcare-primary/30 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:group-hover:bg-gray-600"
                                >
                                    <Tag className="mr-1.5 h-4 w-4" /> {post.category}
                                </Badge>
                            </Link>
                        )}
                        {/* Post Title */}
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight mb-6 text-gray-900 dark:text-gray-100">
                            {post.title}
                        </h1>
                        {/* Post Meta (Author, Date) */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground dark:text-gray-400">
                            <div className="flex items-center">
                                <User className="mr-1.5 h-4 w-4" />
                                <span>By {post.author || FALLBACK_AUTHOR}</span>
                            </div>
                            <div className="flex items-center">
                                <Calendar className="mr-1.5 h-4 w-4" />
                                {/* Use $createdAt as fallback if publishedAt is missing */}
                                <time dateTime={post.publishedAt || post.$createdAt}>
                                    {formatDate(post.publishedAt || post.$createdAt)}
                                </time>
                            </div>
                        </div>
                    </header>

                    {/* Optional Cover Image */}
                    {post.imageUrl && (
                        <figure className="my-10 md:my-12 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-gray-700">
                            <img
                                src={post.imageUrl}
                                alt={`Cover image for ${post.title}`}
                                className="w-full h-auto max-h-[500px] md:max-h-[600px] object-cover" // Constrain image height
                                width={1200} // Provide intrinsic width for performance
                                height={675} // Provide intrinsic height for performance
                                loading="lazy" // Lazy load the image
                            />
                        </figure>
                    )}

                    {/* --- Post Content Area (Using Tailwind Typography) --- */}
                    {/* Apply prose classes for automatic typography styling */}
                    <div className="max-w-3xl mx-auto">
                        <div className="prose lg:prose-lg dark:prose-invert max-w-none prose-img:rounded-lg prose-img:shadow-md prose-img:border prose-a:font-medium hover:prose-a:text-momcare-accent dark:prose-a:text-blue-400 dark:hover:prose-a:text-blue-300">
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]} // Enable GFM features
                                rehypePlugins={[
                                    rehypeHighlight, // Apply syntax highlighting classes
                                    rehypeRaw        // Allow raw HTML (use carefully!)
                                ]}
                                // Optional: Customize rendering of specific elements
                                // components={{
                                //   a: ({node, ...props}) => <a target="_blank" rel="noopener noreferrer" {...props} />, // Example: Open links in new tab
                                // }}
                            >
                                {post.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                    {/* --- End Post Content Area --- */}


                    {/* Optional: Tags Section */}
                    {post.tags && post.tags.length > 0 && (
                        <footer className="max-w-3xl mx-auto mt-12 pt-8 border-t border-momcare-primary/20 dark:border-gray-700/50">
                            <h3 className="text-sm font-semibold text-muted-foreground dark:text-gray-400 uppercase tracking-wider mb-4">
                                Related Tags
                            </h3>
                            <div className="flex flex-wrap gap-2" aria-label="Related tags">
                                {post.tags.map((tag) => (
                                    // Render each tag as a badge
                                    <Badge
                                        key={tag}
                                        variant="secondary" // Use secondary or custom style
                                        className="bg-momcare-light text-momcare-dark border border-momcare-primary/20 hover:bg-momcare-primary/20 transition-colors cursor-default dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                                    >
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </footer>
                    )}

                </article>
            </div>
        </MainLayout>
    );
};

export default BlogPostPage;