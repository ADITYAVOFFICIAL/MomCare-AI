// src/pages/EditBlogPage.tsx

import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// --- Layout & UI Components ---
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast'; // Toast notifications

// --- Appwrite & State ---
import { getBlogPostBySlug, updateBlogPost, BlogPost, UpdateBlogPostData } from '@/lib/appwrite'; // Appwrite functions and types
import { useAuthStore } from '@/store/authStore'; // Zustand auth store

// --- Markdown Editor ---
import MdEditor from 'react-markdown-editor-lite'; // The editor component
import ReactMarkdown from 'react-markdown'; // Renderer for the preview pane
import 'react-markdown-editor-lite/lib/index.css'; // Base styles for the editor

// --- Icons ---
import { Loader2, Sparkles, AlertTriangle } from 'lucide-react';

// --- AI Formatting ---
// *** MODIFIED: Import the Groq formatting function ***
import { formatContentWithGroq } from '@/lib/groqf'; // Your Groq formatting function

// --- Helper Function (Consider moving to a utils file if used elsewhere) ---

/**
 * Generates a URL-friendly slug from a given text string.
 * @param text - The input string (e.g., post title).
 * @returns A sanitized, URL-friendly slug string.
 */
const generateSlug = (text: string): string => {
    if (!text) return '';
    return text
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w-]+/g, '')
        .replace(/--+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
};

// --- Component Definition ---

const EditBlogPage: React.FC = () => {
    // --- Hooks ---
    const { slug: routeSlug } = useParams<{ slug: string }>(); // Get slug from URL route parameters
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user, isAuthenticated } = useAuthStore(); // Get auth state

    // --- State ---
    // Form field states - initialized empty, populated by fetch
    const [title, setTitle] = useState<string>('');
    const [slug, setSlug] = useState<string>('');
    const [contentMd, setContentMd] = useState<string>('');
    const [category, setCategory] = useState<string>('');
    const [imageUrl, setImageUrl] = useState<string>('');
    const [originalPost, setOriginalPost] = useState<BlogPost | null>(null); // Store the initially fetched post

    // Control states
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false); // Tracks if user manually changed slug
    const [isLoading, setIsLoading] = useState<boolean>(false); // Loading state for form submission (update)
    const [isFetching, setIsFetching] = useState<boolean>(true); // Loading state for initial data fetch
    const [isFormatting, setIsFormatting] = useState<boolean>(false); // Loading state for AI format button
    const [fetchError, setFetchError] = useState<string | null>(null); // Stores errors during initial fetch

    // --- Constants ---
    const categories: string[] = [
        'Pregnancy', 'Childbirth', 'Postpartum', 'Nutrition', 'Exercise',
        'Mental Health', 'Baby Care', 'Parenting', 'General Wellness',
        'Tips & Tricks', 'Community Stories'
    ];

    // --- Authorization Check ---
    // Redirects immediately if user is not authenticated or not an admin.
    // Runs whenever authentication state changes.
    useEffect(() => {
        if (isAuthenticated === false) {
            toast({ title: "Authentication Required", description: "Please log in to edit blog posts.", variant: "destructive" });
            navigate('/login');
        } else if (isAuthenticated === true && (!Array.isArray(user?.labels) || !user.labels.includes('admin'))) {
            // Check if authenticated AND user has 'admin' label
            toast({ title: "Unauthorized", description: "You do not have permission to edit blog posts.", variant: "destructive" });
            navigate('/resources'); // Redirect non-admins away
        }
        // Note: Fetching logic below also depends on auth state.
    }, [isAuthenticated, user, navigate, toast]);

    // --- Fetch Existing Post Data ---
    // Runs when the component mounts or the route slug changes, but only if authorized.
    useEffect(() => {
        const fetchPostData = async () => {
            if (!routeSlug) {
                setFetchError("No blog post identifier (slug) found in the URL.");
                setIsFetching(false);
                return;
            }

            // Redundant check (already handled by above useEffect), but safe
            if (!isAuthenticated || !user?.labels?.includes('admin')) {
                setIsFetching(false); // Ensure loading stops if somehow reached here unauthorized
                return;
            }

            console.log(`Fetching post data for slug: ${routeSlug} to edit...`);
            setIsFetching(true);
            setFetchError(null); // Clear previous errors

            try {
                const post = await getBlogPostBySlug(routeSlug);
                if (post) {
                    console.log("Fetched post data:", post);
                    setOriginalPost(post); // Store the original post data (needed for ID on update)
                    // Populate form fields with fetched data
                    setTitle(post.title);
                    setSlug(post.slug); // Set the fetched slug
                    setContentMd(post.content);
                    setCategory(post.category || ''); // Use empty string if category is null/undefined
                    setImageUrl(post.imageUrl || ''); // Use empty string if imageUrl is null/undefined
                    // Since we're populating the slug from fetched data, assume it's "manually set"
                    // relative to any *new* title changes until the user clears it.
                    setIsSlugManuallyEdited(true);
                } else {
                    setFetchError(`Blog post with slug "${routeSlug}" not found.`);
                    toast({ title: "Not Found", description: `Could not find the blog post to edit.`, variant: "destructive" });
                    navigate('/resources'); // Redirect back if the post doesn't exist
                }
            } catch (error: unknown) {
                console.error("Error fetching blog post for edit:", error);
                const message = error instanceof Error ? error.message : "Failed to load blog post data.";
                setFetchError(message);
                toast({ title: "Loading Error", description: message, variant: "destructive" });
            } finally {
                setIsFetching(false); // Stop fetching loading indicator
            }
        };

        // Trigger fetch only when authentication is confirmed and user is admin
        if (isAuthenticated === true && user?.labels?.includes('admin')) {
            fetchPostData();
        } else if (isAuthenticated === null) {
            // Still waiting for auth check, do nothing here, let the auth check useEffect handle redirection if needed
            setIsFetching(true); // Keep showing loading until auth is resolved
        } else {
            // Not authenticated or not admin, stop loading (redirection handled by other useEffect)
            setIsFetching(false);
        }

    }, [routeSlug, navigate, toast, isAuthenticated, user]); // Dependencies for fetching

    // --- Slug Generation/Handling ---
    // Auto-updates slug based on title *only if* not manually edited and *after* initial fetch.
    useEffect(() => {
        // Don't auto-generate slug while fetching or if it has been manually edited
        if (!isSlugManuallyEdited && title && !isFetching) {
            setSlug(generateSlug(title));
        }
        // No need to clear slug here if title is cleared, user might want to keep manual slug
    }, [title, isSlugManuallyEdited, isFetching]);

    /** Handles changes to the slug input field, enabling manual override. */
    const handleSlugChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const newSlug = e.target.value;
        // Basic sanitization
        const sanitizedSlug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');
        setSlug(sanitizedSlug);
        setIsSlugManuallyEdited(true); // Mark as manually edited

        // If user clears the manual slug, revert to auto-generation based on current title
        if (!sanitizedSlug && title) {
            setIsSlugManuallyEdited(false); // Allow auto-generation again
            setSlug(generateSlug(title));
        } else if (!sanitizedSlug && !title) {
            // If both are cleared, reset manual flag
            setIsSlugManuallyEdited(false);
        }
    };

    /** Updates content state when Markdown editor changes. */
    const handleEditorChange = ({ text }: { html: string; text: string }): void => {
        setContentMd(text);
    };

    // --- AI Formatting Handler ---
    // Memoized function to format content using AI
    const handleFormatContent = useCallback(async (): Promise<void> => {
        if (!contentMd?.trim()) {
            toast({ title: "Nothing to Format", description: "Content is empty.", variant: "default" });
            return;
        }
        setIsFormatting(true);
        try {
            console.log("Attempting Groq AI formatting for existing content...");
            // *** MODIFIED: Use the Groq formatting function ***
            const formattedContent = await formatContentWithGroq(contentMd);
            setContentMd(formattedContent);
            toast({
                title: "Content Formatted",
                description: "Content has been automatically formatted using Groq AI.", // Updated toast message
                variant: "default"
            });
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Could not format content via AI.";
            toast({ title: "Formatting Error", description: message, variant: "destructive" });
            console.error("Groq AI formatting error:", error); // Updated error message
        } finally {
            setIsFormatting(false);
        }
    }, [contentMd, toast]);

    // --- Form Submission Handler (Update) ---
    /** Handles form submission to update the existing blog post. */
    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault(); // Prevent default browser submission

        // Ensure we have the original post ID to perform the update
        if (!originalPost?.$id) {
            toast({ title: "Update Error", description: "Cannot update post: Original post data or ID is missing.", variant: "destructive" });
            return;
        }

        // Final authorization check
        if (!isAuthenticated || !user?.labels?.includes('admin')) {
            toast({ title: "Unauthorized", description: "You do not have permission to submit changes.", variant: "destructive" });
            return;
        }

        // --- Validation ---
        if (!title.trim() || !slug.trim() || !contentMd.trim() || !category) {
            toast({ title: "Missing Fields", description: "Please fill in Title, Slug, Content, and Category.", variant: "destructive" });
            return;
        }
        const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugRegex.test(slug)) {
            toast({
                title: "Invalid Slug Format",
                description: "Slug must contain only lowercase letters, numbers, and single hyphens. Cannot start or end with a hyphen.",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true); // Set loading state for submit button

        try {
            // Construct the data payload for the update operation
            // Only include fields that are meant to be updatable
            const updateData: UpdateBlogPostData = {
                title: title.trim(),
                slug: slug, // Send the potentially updated slug
                content: contentMd,
                category: category,
                imageUrl: imageUrl.trim() || undefined, // Send undefined to potentially clear the image URL
                // Add other editable fields here if necessary, e.g., tags
                // tags: updatedTagsArray,
            };

            console.log(`Updating post ${originalPost.$id} with data:`, updateData);

            // Call the Appwrite update function
            const updatedPost = await updateBlogPost(originalPost.$id, updateData);

            toast({ title: "Blog Post Updated", description: `"${updatedPost.title}" saved successfully.` });
            console.log("Post updated successfully:", updatedPost);

            // Navigate to the updated post's page (using the potentially changed slug)
            navigate(`/blog/${updatedPost.slug}`);

        } catch (error: unknown) {
            console.error(`Error updating blog post ${originalPost.$id}:`, error);
            let description = "An unexpected error occurred while saving changes.";
            if (error instanceof Error) {
                 // Check for specific Appwrite slug conflict error message during update
                if (error.message.toLowerCase().includes('slug') && (error.message.toLowerCase().includes('taken') || error.message.toLowerCase().includes('unique'))) {
                    description = `The slug "${slug}" is already taken by another post. Please choose a different one.`;
                } else {
                    description = error.message;
                }
            }
            toast({ title: "Update Failed", description: description, variant: "destructive" });
        } finally {
            setIsLoading(false); // Reset loading state for submit button
        }
    };

    // --- Render Logic ---

    // 1. Show loading indicator while fetching initial data
    if (isFetching) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center h-[calc(100vh-10rem)]">
                    <Loader2 className="h-12 w-12 animate-spin text-momcare-primary dark:text-momcare-light" />
                    <span className="sr-only">Loading post data...</span>
                </div>
            </MainLayout>
        );
    }

    // 2. Show error message if fetching failed
    if (fetchError) {
        return (
            <MainLayout>
                <div className="max-w-md mx-auto mt-10 text-center p-6 bg-destructive/10 dark:bg-red-900/20 border border-destructive dark:border-red-800/30 rounded-lg">
                    <AlertTriangle className="h-10 w-10 text-destructive dark:text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-destructive dark:text-red-300 mb-2">Error Loading Post</h2>
                    <p className="text-destructive/90 dark:text-red-300/90 mb-6">{fetchError}</p>
                    <Button variant="outline" onClick={() => navigate('/resources')}>
                        Back to Resources
                    </Button>
                </div>
            </MainLayout>
        );
    }

    // 3. Fallback for unauthorized access (should be caught by useEffect redirect, but safe)
    if (!isAuthenticated || !user?.labels?.includes('admin')) {
         return (
            <MainLayout>
                <div className="max-w-md mx-auto mt-10 text-center p-6">
                    <Card>
                        <CardHeader><CardTitle>Unauthorized Access</CardTitle></CardHeader>
                        <CardContent><p>You do not have permission to view this page.</p></CardContent>
                        <CardFooter><Button onClick={() => navigate('/')}>Go Home</Button></CardFooter>
                    </Card>
                </div>
            </MainLayout>
        );
    }

    // 4. Render the Edit Form if data fetched successfully and user is authorized
    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
                {/* Page Header */}
                <div className="text-center mb-8 md:mb-12">
                    <h1 className="text-3xl font-bold text-momcare-primary dark:text-momcare-light">Edit Blog Post</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Make changes to the blog post content and details.</p>
                </div>

                {/* Form Card */}
                <Card className="border-momcare-primary/20 dark:border-gray-700/50 shadow-md">
                    {/* Pass originalPost data check to ensure form doesn't render before data is ready */}
                    {originalPost && (
                        <form onSubmit={handleSubmit} noValidate>
                            <CardHeader>
                                <CardTitle className="text-xl text-momcare-dark dark:text-gray-200">Edit Post Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Title Input */}
                                <div className="space-y-2">
                                    <Label htmlFor="title" className="dark:text-gray-300">Title *</Label>
                                    <Input
                                        id="title"
                                        value={title}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                                        placeholder="Enter a clear and engaging title"
                                        required
                                        maxLength={150}
                                        disabled={isLoading || isFormatting} // Disable during operations
                                        className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                    />
                                </div>

                                {/* Slug Input */}
                                <div className="space-y-2">
                                    <Label htmlFor="slug" className="dark:text-gray-300">Slug *</Label>
                                    <Input
                                        id="slug"
                                        value={slug}
                                        onChange={handleSlugChange}
                                        placeholder="e.g., my-awesome-post"
                                        required
                                        maxLength={255}
                                        pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
                                        title="Use lowercase letters, numbers, and single hyphens only"
                                        disabled={isLoading || isFormatting}
                                        className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                    />
                                    <p className="text-xs text-gray-500 dark:text-gray-400">URL-friendly identifier. Changing this will change the post's link.</p>
                                </div>

                                {/* Category Select */}
                                <div className="space-y-2">
                                    <Label htmlFor="category" className="dark:text-gray-300">Category *</Label>
                                    <Select value={category} onValueChange={setCategory} required disabled={isLoading || isFormatting}>
                                        <SelectTrigger id="category" className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600">
                                            <SelectValue placeholder="Select a relevant category" />
                                        </SelectTrigger>
                                        <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                                            {categories.map((cat) => (
                                                <SelectItem key={cat} value={cat} className="dark:hover:bg-gray-700">{cat}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Image URL Input */}
                                <div className="space-y-2">
                                    <Label htmlFor="imageUrl" className="dark:text-gray-300">Cover Image URL (Optional)</Label>
                                    <Input
                                        id="imageUrl"
                                        type="url"
                                        value={imageUrl}
                                        onChange={(e: ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
                                        placeholder="https://example.com/your-image.jpg"
                                        disabled={isLoading || isFormatting}
                                        className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                    />
                                </div>

                                {/* --- Markdown Editor Section --- */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center mb-1">
                                        <Label htmlFor="content-editor" className="dark:text-gray-300">Content (Markdown) *</Label>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={handleFormatContent}
                                            disabled={isFormatting || isLoading || !contentMd?.trim()}
                                            title="Auto-format content using Groq AI" // Updated tooltip
                                             className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                        >
                                            {isFormatting ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />
                                            )}
                                            AI Format
                                        </Button>
                                    </div>
                                    <MdEditor
                                        id="content-editor"
                                        style={{ height: '450px', border: '1px solid hsl(var(--input))', borderRadius: 'var(--radius)' }}
                                        className="dark:bg-gray-700 dark:text-gray-200"
                                        value={contentMd}
                                        renderHTML={text => (
                                            <div className="prose dark:prose-invert max-w-none p-4 bg-white dark:bg-gray-800 rounded">
                                                <ReactMarkdown>{text}</ReactMarkdown>
                                            </div>
                                        )}
                                        onChange={handleEditorChange}
                                        config={{
                                            view: { menu: true, md: true, html: false },
                                            canView: { menu: true, md: true, html: false, fullScreen: true, hideMenu: true },
                                        }}
                                        // Optionally make editor read-only during submit/format
                                        // readOnly={isLoading || isFormatting}
                                    />
                                    {!contentMd?.trim() && <p className="text-xs text-destructive pt-1">Content is required.</p>}
                                </div>
                                {/* --- End Editor Section --- */}

                            </CardContent>
                            <CardFooter className="flex justify-between items-center pt-6 border-t dark:border-gray-700">
                                {/* Cancel Button - Navigates back to the post view using original slug if available */}
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => navigate(`/blog/${originalPost?.slug || routeSlug}`)} // Fallback to routeSlug if originalPost somehow null
                                    disabled={isLoading || isFormatting}
                                    className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                >
                                    Cancel
                                </Button>
                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    className="bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark min-w-[150px]"
                                    disabled={isLoading || isFormatting || !title.trim() || !slug.trim() || !contentMd.trim() || !category}
                                >
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving Changes...</>
                                    ) : (
                                        "Save Changes"
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    )}
                </Card>
            </div>
        </MainLayout>
    );
};

export default EditBlogPage;