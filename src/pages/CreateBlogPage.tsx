// src/pages/CreateBlogPage.tsx

import React, { useState, useEffect, useCallback, FormEvent, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';

// --- UI Components & Layout ---
import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast'; // Toast notifications
import { Loader2, Sparkles } from 'lucide-react'; // Icons

// --- Appwrite & State ---
import { createBlogPost, CreateBlogPostData } from '@/lib/appwrite'; // Appwrite function and input type
import { useAuthStore } from '@/store/authStore'; // Zustand auth store

// --- Markdown Editor ---
import MdEditor from 'react-markdown-editor-lite'; // The editor component
import ReactMarkdown from 'react-markdown'; // Renderer for the preview pane
import 'react-markdown-editor-lite/lib/index.css'; // Base styles for the editor

// --- AI Formatting ---
// *** MODIFIED: Import the Groq formatting function ***
import { formatContentWithGroq } from '@/lib/groqf'; // Assuming groqFormatter.ts is in src/lib/

// --- Helper Function ---

/**
 * Generates a URL-friendly slug from a given text string.
 * Converts to lowercase, replaces spaces with hyphens, removes invalid characters,
 * and trims leading/trailing hyphens.
 * @param text - The input string (e.g., post title).
 * @returns A sanitized, URL-friendly slug string.
 */
const generateSlug = (text: string): string => {
    if (!text) return '';
    return text
        .toLowerCase() // Convert to lowercase
        .trim() // Remove leading/trailing whitespace
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/[^\w-]+/g, '') // Remove all non-word characters except hyphens
        .replace(/--+/g, '-') // Replace multiple hyphens with a single one
        .replace(/^-+/, '') // Trim hyphens from the start
        .replace(/-+$/, ''); // Trim hyphens from the end
};

// --- Component Definition ---

const CreateBlogPage: React.FC = () => {
    // --- Hooks ---
    const navigate = useNavigate();
    const { toast } = useToast();
    const { user, isAuthenticated } = useAuthStore(); // Get auth state

    // --- State ---
    // Form field states
    const [title, setTitle] = useState<string>('');
    const [slug, setSlug] = useState<string>('');
    const [contentMd, setContentMd] = useState<string>(''); // Markdown content
    const [category, setCategory] = useState<string>('');
    const [imageUrl, setImageUrl] = useState<string>('');

    // Control states
    const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(false); // For main form submission
    const [isFormatting, setIsFormatting] = useState<boolean>(false); // For AI format button

    // --- Constants ---
    // Available categories for the blog post
    const categories: string[] = [
        'Pregnancy', 'Childbirth', 'Postpartum', 'Nutrition', 'Exercise',
        'Mental Health', 'Baby Care', 'Parenting', 'General Wellness',
        'Tips & Tricks', 'Community Stories'
    ];

    // --- Authorization Check ---
    // Redirects if user is not authenticated or not an admin.
    useEffect(() => {
        // Wait until authentication status is determined (isAuthenticated is not null)
        if (isAuthenticated === false) {
            toast({ title: "Authentication Required", description: "Please log in to create blog posts.", variant: "destructive" });
            navigate('/login'); // Redirect to login page
        } else if (isAuthenticated === true && (!Array.isArray(user?.labels) || !user.labels.includes('admin'))) {
            // Check if authenticated and user has 'admin' label
            toast({ title: "Unauthorized", description: "You do not have permission to create blog posts.", variant: "destructive" });
            navigate('/resources'); // Redirect non-admins away
        }
        // Dependencies: run when auth state changes
    }, [isAuthenticated, user, navigate, toast]);

    // --- Slug Generation Effect ---
    // Automatically generates the slug from the title, unless manually edited.
    useEffect(() => {
        if (!isSlugManuallyEdited && title) {
            // Auto-generate slug if not manually edited and title exists
            setSlug(generateSlug(title));
        } else if (!title && !isSlugManuallyEdited) {
            // Clear slug if title is cleared and slug wasn't manually set
            setSlug('');
        }
        // Dependencies: run when title or manual edit flag changes
    }, [title, isSlugManuallyEdited]);

    // --- Event Handlers ---

    /** Handles changes to the slug input field. Allows manual editing and sanitizes input. */
    const handleSlugChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const newSlug = e.target.value;
        // Basic sanitization: lowercase, allow letters, numbers, hyphens
        const sanitizedSlug = newSlug.toLowerCase().replace(/[^a-z0-9-]/g, '').replace(/--+/g, '-');
        setSlug(sanitizedSlug);
        // Mark as manually edited if the user types anything
        setIsSlugManuallyEdited(true);

        // If user clears the manual slug:
        if (!sanitizedSlug) {
            if (title) {
                // Revert to auto-generation if title exists
                setIsSlugManuallyEdited(false);
                setSlug(generateSlug(title));
            } else {
                // Reset manual edit flag if both title and slug are cleared
                setIsSlugManuallyEdited(false);
            }
        }
    };

    /** Handles content changes from the Markdown editor. */
    const handleEditorChange = ({ text }: { html: string; text: string }): void => {
        // We only need the Markdown text
        setContentMd(text);
    };

    /** Formats the Markdown content using the Groq AI service. */
    const handleFormatContent = useCallback(async (): Promise<void> => {
        if (!contentMd?.trim()) {
            toast({ title: "Nothing to Format", description: "Content is empty.", variant: "default" });
            return;
        }
        setIsFormatting(true); // Show loading indicator on the button
        try {
            // console.log("Attempting to format content with Groq AI...");
            // *** MODIFIED: Use the Groq formatting function ***
            const formattedContent = await formatContentWithGroq(contentMd);
            setContentMd(formattedContent); // Update editor content
            toast({
                title: "Content Formatted",
                description: "Content has been automatically formatted using Groq AI.",
                variant: "default" // Use "default" or "success" if available
            });
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : "Could not format content via AI.";
            toast({
                title: "Formatting Error",
                description: errorMessage,
                variant: "destructive"
            });
            // console.error("Groq AI formatting error:", error);
        } finally {
            setIsFormatting(false); // Hide loading indicator
        }
    }, [contentMd, toast]); // Dependencies for useCallback

    /** Handles the main form submission to create the blog post. */
    const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault(); // Prevent default browser form submission

        // Final authorization check before submission
        if (!isAuthenticated || !user || !Array.isArray(user.labels) || !user.labels.includes('admin')) {
            toast({ title: "Unauthorized", description: "Cannot submit post. Insufficient permissions.", variant: "destructive" });
            return;
        }

        // --- Validation ---
        if (!title.trim() || !slug.trim() || !contentMd.trim() || !category) {
            toast({ title: "Missing Fields", description: "Please fill in Title, Slug, Content, and Category.", variant: "destructive" });
            return;
        }
        // Robust slug format validation (lowercase letters, numbers, single hyphens, no leading/trailing hyphens)
        const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugRegex.test(slug)) {
            toast({
                title: "Invalid Slug Format",
                description: "Slug must contain only lowercase letters, numbers, and single hyphens. Cannot start or end with a hyphen (e.g., 'my-first-post').",
                variant: "destructive"
            });
            return;
        }

        setIsLoading(true); // Show loading indicator on submit button

        try {
            // Prepare data payload for Appwrite, conforming to CreateBlogPostData type
            const postData: CreateBlogPostData = {
                title: title.trim(),
                slug: slug, // Already validated and sanitized
                content: contentMd, // Use the potentially AI-formatted Markdown
                author: user.name || 'MomCare Admin', // Use logged-in user's name or a fallback
                category: category,
                imageUrl: imageUrl.trim() || undefined, // Set to undefined if empty after trimming
                // tags: [], // Add tags input if needed
                // publishedAt: new Date().toISOString(), // Optionally set publish date here
            };

            // console.log("Submitting blog post data:", postData);
            await createBlogPost(postData); // Call the Appwrite function

            toast({ title: "Blog Post Created", description: `"${postData.title}" published successfully.` });

            // Reset form fields after successful submission
            setTitle('');
            setSlug('');
            setIsSlugManuallyEdited(false);
            setContentMd('');
            setCategory('');
            setImageUrl('');

            navigate('/resources'); // Navigate to the resources page

        } catch (error: unknown) {
            // console.error('Error creating blog post:', error);
            let description = "An unexpected error occurred while creating the post.";
            if (error instanceof Error) {
                // Check for specific Appwrite slug conflict error message
                if (error.message.toLowerCase().includes('slug') && (error.message.toLowerCase().includes('taken') || error.message.toLowerCase().includes('unique'))) {
                    description = `The slug "${slug}" is already taken. Please choose a different one.`;
                } else {
                    description = error.message; // Use the error message directly
                }
            }
            toast({ title: "Failed to Create Post", description: description, variant: "destructive" });
        } finally {
            setIsLoading(false); // Hide loading indicator on submit button
        }
    };

    // --- Render Logic ---

    // Show loading indicator while initial auth check might be running
    if (isAuthenticated === null) {
        return (
            <MainLayout>
                <div className="flex justify-center items-center min-h-screen">
                    <Loader2 className="h-12 w-12 animate-spin text-momcare-primary" />
                </div>
            </MainLayout>
        );
    }

    // Fallback render if somehow the user gets here while unauthorized
    // (useEffect should handle redirection, but this is a safeguard)
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

    // Render the main form if authorized
    return (
        <MainLayout>
            <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
                {/* Page Header */}
                <div className="text-center mb-8 md:mb-12">
                    <h1 className="text-3xl font-bold text-momcare-primary dark:text-momcare-light">Create New Blog Post</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Share your knowledge and insights with the MomCare community.</p>
                </div>

                {/* Form Card */}
                <Card className="border-momcare-primary/20 dark:border-gray-700/50 shadow-md">
                    <form onSubmit={handleSubmit} noValidate> {/* Add noValidate to rely on custom validation */}
                        <CardHeader>
                            <CardTitle className="text-xl text-momcare-dark dark:text-gray-200">Post Details</CardTitle>
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
                                    maxLength={150} // Set a reasonable max length
                                    className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                />
                            </div>

                            {/* Slug Input */}
                            <div className="space-y-2">
                                <Label htmlFor="slug" className="dark:text-gray-300">Slug *</Label>
                                <Input
                                    id="slug"
                                    value={slug}
                                    onChange={handleSlugChange} // Use custom handler
                                    placeholder="e.g., my-awesome-post"
                                    required
                                    maxLength={255}
                                    pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$" // HTML5 pattern for basic client-side hint
                                    title="Use lowercase letters, numbers, and single hyphens only (e.g., 'first-trimester-tips')"
                                    className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">URL-friendly identifier. Auto-generated from title, but can be edited.</p>
                            </div>

                            {/* Category Select */}
                            <div className="space-y-2">
                                <Label htmlFor="category" className="dark:text-gray-300">Category *</Label>
                                <Select value={category} onValueChange={setCategory} required>
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

                            {/* Image URL Input (Optional) */}
                            <div className="space-y-2">
                                <Label htmlFor="imageUrl" className="dark:text-gray-300">Cover Image URL (Optional)</Label>
                                <Input
                                    id="imageUrl"
                                    type="url" // Use type="url" for basic browser validation
                                    value={imageUrl}
                                    onChange={(e: ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
                                    placeholder="https://example.com/your-image.jpg"
                                    className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400">Link to an image hosted elsewhere (e.g., Unsplash, Pexels, Cloudinary).</p>
                            </div>

                            {/* --- Markdown Editor Section --- */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center mb-1">
                                    <Label htmlFor="content-editor" className="dark:text-gray-300">Content (Markdown) *</Label>
                                    {/* AI Format Button */}
                                    <Button
                                        type="button" // Prevent form submission
                                        variant="outline"
                                        size="sm"
                                        onClick={handleFormatContent}
                                        disabled={isFormatting || !contentMd?.trim()} // Disable if formatting or content is empty
                                        title="Auto-format content using Groq AI" // Updated tooltip
                                        className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                                    >
                                        {isFormatting ? (
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                            <Sparkles className="mr-2 h-4 w-4 text-yellow-500" /> // Use a distinct icon
                                        )}
                                        AI Format
                                    </Button>
                                </div>
                                {/* The Markdown Editor Component */}
                                <MdEditor
                                    id="content-editor"
                                    // Apply styling consistent with other inputs
                                    style={{ height: '450px', border: '1px solid hsl(var(--input))', borderRadius: 'var(--radius)' }}
                                    className="dark:bg-gray-700 dark:text-gray-200" // Basic dark mode attempt for editor wrapper
                                    value={contentMd}
                                    // Render the preview pane using ReactMarkdown with Tailwind Typography
                                    renderHTML={text => (
                                        <div className="prose dark:prose-invert max-w-none p-4 bg-white dark:bg-gray-800 rounded"> {/* Added wrapper div with padding and background */}
                                            <ReactMarkdown remarkPlugins={[/* Add remark plugins if needed */]} rehypePlugins={[/* Add rehype plugins if needed */]}>
                                                {text}
                                            </ReactMarkdown>
                                        </div>
                                    )}
                                    onChange={handleEditorChange} // Update state on change
                                    config={{
                                        view: { menu: true, md: true, html: false }, // Show Markdown view, hide HTML view
                                        canView: { menu: true, md: true, html: false, fullScreen: true, hideMenu: true },
                                        // Optional: Add custom CSS class to the editor's markdown area
                                        // markdownClass: 'custom-markdown-editor-area',
                                    }}
                                />
                                {/* Basic validation message hint */}
                                {!contentMd?.trim() && <p className="text-xs text-destructive pt-1">Content is required.</p>}
                            </div>
                            {/* --- End Editor Section --- */}

                        </CardContent>
                        <CardFooter className="flex justify-between items-center pt-6 border-t dark:border-gray-700">
                            {/* Cancel Button */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => navigate('/resources')} // Navigate back
                                disabled={isLoading || isFormatting} // Disable if any operation is loading
                                className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
                            >
                                Cancel
                            </Button>
                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark min-w-[150px]" // Ensure minimum width
                                // Disable if loading, formatting, or required fields are empty
                                disabled={isLoading || isFormatting || !title.trim() || !slug.trim() || !contentMd.trim() || !category}
                            >
                                {isLoading ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Publishing...</>
                                ) : (
                                    "Publish Blog Post"
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </MainLayout>
    );
};

export default CreateBlogPage;