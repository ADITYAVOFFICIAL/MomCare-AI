// src/pages/ForumPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
    MessageSquare, PlusCircle, List, Tag, Clock, User, Loader2, ArrowLeft, Send, Trash2, Edit, Lock, Unlock, Pin, PinOff, Search
} from 'lucide-react';

import MainLayout from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge'; // For categories/tags
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';
import {
    ForumTopic, ForumPost, UserProfile, // Assuming UserProfile is available
    getForumTopics, getForumTopic, getForumPosts,
    createForumTopic, createForumPost,
    deleteForumPost, deleteForumTopicAndPosts,
    updateForumTopic, updateForumPost,
    getUserProfile // To get creator details if needed
} from '@/lib/appwrite'; // Assuming appwrite functions are correctly exported
import { Models } from 'appwrite';

// --- Helper Functions ---
const getInitials = (nameStr: string | undefined | null): string => {
    if (!nameStr) return '?';
    return nameStr.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().substring(0, 2);
};

const formatRelativeTime = (dateString?: string): string => {
    if (!dateString) return 'unknown time';
    try {
        return formatDistanceToNow(parseISO(dateString), { addSuffix: true });
    } catch (e) {
        return 'invalid date';
    }
};

// --- Sub-Components ---

// Component to display a single topic in the list
const TopicListItem: React.FC<{ topic: ForumTopic }> = ({ topic }) => (
    <Link to={`/forum/${topic.$id}`} className="block hover:bg-gray-50 transition-colors duration-150">
        <Card className="border-l-4 border-momcare-primary/50 shadow-sm rounded-none border-t-0 border-r-0 border-b">
            <CardContent className="p-4 flex items-start space-x-4">
                <Avatar className="h-10 w-10 border">
                    <AvatarImage src={topic.userAvatarUrl || undefined} alt={topic.userName} />
                    <AvatarFallback>{getInitials(topic.userName)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                    <div className="flex justify-between items-start">
                         <h3 className="text-base font-semibold text-momcare-dark group-hover:text-momcare-primary line-clamp-2">
                            {topic.isPinned && <Pin className="inline-block h-4 w-4 mr-1.5 text-momcare-accent" />}
                            {topic.isLocked && <Lock className="inline-block h-4 w-4 mr-1.5 text-gray-500" />}
                            {topic.title}
                        </h3>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                            {topic.replyCount || 0} replies
                        </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>By <span className="font-medium">{topic.userName}</span></span>
                        {topic.category && <Badge variant="outline" className="text-xs">{topic.category}</Badge>}
                        <span>Last activity: {formatRelativeTime(topic.lastReplyAt)}</span>
                        <span>Created: {formatRelativeTime(topic.$createdAt)}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    </Link>
);

// Component to display a single post within a topic
const PostItem: React.FC<{
    post: ForumPost;
    currentUserId: string | null;
    onDelete: (postId: string) => void;
    isDeleting: boolean;
}> = ({ post, currentUserId, onDelete, isDeleting }) => (
    <div className="flex space-x-4 py-4 px-2 border-b last:border-b-0">
        <Avatar className="h-10 w-10 border flex-shrink-0 mt-1">
            <AvatarImage src={post.userAvatarUrl || undefined} alt={post.userName} />
            <AvatarFallback>{getInitials(post.userName)}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
            <div className="flex justify-between items-center mb-1">
                <span className="font-semibold text-sm text-gray-800">{post.userName}</span>
                <span className="text-xs text-gray-500">{formatRelativeTime(post.$createdAt)}</span>
            </div>
            {/* Basic content display - consider Markdown rendering later */}
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{post.content}</p>
            {currentUserId === post.userId && (
                <div className="mt-2 text-right">
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:bg-red-100 h-auto px-2 py-1"
                        onClick={() => onDelete(post.$id)}
                        disabled={isDeleting}
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </Button>
                    {/* Add Edit Button later */}
                </div>
            )}
        </div>
    </div>
);

// --- Main Forum Page Component ---
const ForumPage: React.FC = () => {
    const { topicId } = useParams<{ topicId?: string }>(); // Optional topicId
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const { user, isAuthenticated } = useAuthStore();

    // State for Topic List View
    const [topics, setTopics] = useState<ForumTopic[]>([]);
    const [topicsLoading, setTopicsLoading] = useState(false);
    const [topicsError, setTopicsError] = useState<string | null>(null);
    const [topicsTotal, setTopicsTotal] = useState(0);
    const [topicsPage, setTopicsPage] = useState(1);
    const topicsLimit = 15; // Topics per page

    // State for Topic Detail View
    const [currentTopic, setCurrentTopic] = useState<ForumTopic | null>(null);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [topicLoading, setTopicLoading] = useState(false);
    const [postsLoading, setPostsLoading] = useState(false);
    const [topicError, setTopicError] = useState<string | null>(null);
    const [postsError, setPostsError] = useState<string | null>(null);
    const [postsTotal, setPostsTotal] = useState(0);
    const [postsPage, setPostsPage] = useState(1);
    const postsLimit = 20; // Posts per page

    // State for Forms
    const [replyContent, setReplyContent] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [showCreateTopicForm, setShowCreateTopicForm] = useState(false);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicContent, setNewTopicContent] = useState('');
    const [newTopicCategory, setNewTopicCategory] = useState('');
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);

    // State for Deletion Dialogs
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
    const [showDeletePostDialog, setShowDeletePostDialog] = useState(false);
    const [isDeletingPostConfirmed, setIsDeletingPostConfirmed] = useState(false);

    const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
    const [showDeleteTopicDialog, setShowDeleteTopicDialog] = useState(false);
    const [isDeletingTopicConfirmed, setIsDeletingTopicConfirmed] = useState(false);

    // --- Data Fetching ---

    // Fetch Topics List
    const fetchTopics = useCallback(async (page = 1) => {
        setTopicsLoading(true);
        setTopicsError(null);
        const offset = (page - 1) * topicsLimit;
        try {
            const response = await getForumTopics(undefined, topicsLimit, offset); // Add category filter later
            setTopics(page === 1 ? response.documents : [...topics, ...response.documents]);
            setTopicsTotal(response.total);
            setTopicsPage(page);
        } catch (error: any) {
            console.error("Error fetching topics:", error);
            setTopicsError("Failed to load topics. Please try again.");
            toast({ title: "Error", description: "Could not fetch forum topics.", variant: "destructive" });
        } finally {
            setTopicsLoading(false);
        }
    }, [toast]); // Add category state if filtering is added

    // Fetch Single Topic Details
    const fetchTopicDetails = useCallback(async (id: string) => {
        setTopicLoading(true);
        setTopicError(null);
        try {
            const topicData = await getForumTopic(id);
            if (!topicData) {
                throw new Error("Topic not found.");
            }
            setCurrentTopic(topicData);
        } catch (error: any) {
            console.error("Error fetching topic details:", error);
            setTopicError(error.message || "Failed to load topic details.");
            setCurrentTopic(null); // Reset if error
            toast({ title: "Error", description: "Could not fetch topic details.", variant: "destructive" });
        } finally {
            setTopicLoading(false);
        }
    }, [toast]);

    // Fetch Posts for a Topic
    const fetchPosts = useCallback(async (id: string, page = 1) => {
        setPostsLoading(true);
        setPostsError(null);
        const offset = (page - 1) * postsLimit;
        try {
            const response = await getForumPosts(id, postsLimit, offset);
            setPosts(page === 1 ? response.documents : [...posts, ...response.documents]);
            setPostsTotal(response.total);
            setPostsPage(page);
        } catch (error: any) {
            console.error("Error fetching posts:", error);
            setPostsError("Failed to load replies. Please try again.");
            toast({ title: "Error", description: "Could not fetch replies.", variant: "destructive" });
        } finally {
            setPostsLoading(false);
        }
    }, [toast]);

    // --- Effects ---

    // Effect to fetch data based on route (topicId presence)
    useEffect(() => {
        if (topicId) {
            // Viewing a specific topic
            setTopics([]); // Clear topics list
            setCurrentTopic(null); // Reset topic details
            setPosts([]); // Clear posts list
            fetchTopicDetails(topicId);
            fetchPosts(topicId, 1); // Fetch first page of posts
        } else {
            // Viewing the topics list
            setCurrentTopic(null); // Clear topic details
            setPosts([]); // Clear posts list
            fetchTopics(1); // Fetch first page of topics
            setShowCreateTopicForm(false); // Hide create form when navigating back to list
        }
        // Reset pagination and errors when route changes
        setTopicsPage(1);
        setPostsPage(1);
        setTopicsError(null);
        setTopicError(null);
        setPostsError(null);
    }, [topicId, fetchTopics, fetchTopicDetails, fetchPosts]); // Rerun when topicId changes

    // --- Handlers ---

    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !isAuthenticated) {
            toast({ title: "Authentication Required", description: "Please log in to create a topic.", variant: "destructive" });
            return;
        }
        if (!newTopicTitle.trim() || !newTopicContent.trim()) {
            toast({ title: "Missing Information", description: "Title and content are required.", variant: "destructive" });
            return;
        }

        setIsCreatingTopic(true);
        try {
            // Attempt to get user profile details for snapshot
            let profile: UserProfile | null = null;
            try {
                profile = await getUserProfile(user.$id);
            } catch (profileError) {
                console.warn("Could not fetch profile for topic creation snapshot:", profileError);
            }

            const creatorName = profile?.name || user.name || 'Anonymous User';
            const creatorAvatar = profile?.profilePhotoUrl; // Use the fetched URL if available

            const createdTopic = await createForumTopic(
                user.$id,
                creatorName,
                creatorAvatar,
                {
                    title: newTopicTitle,
                    content: newTopicContent,
                    category: newTopicCategory || undefined // Handle empty category
                }
            );
            toast({ title: "Topic Created Successfully!" });
            setShowCreateTopicForm(false);
            setNewTopicTitle('');
            setNewTopicContent('');
            setNewTopicCategory('');
            // Navigate to the newly created topic
            navigate(`/forum/${createdTopic.$id}`);
        } catch (error: any) {
            console.error("Error creating topic:", error);
            toast({ title: "Creation Failed", description: error.message || "Could not create topic.", variant: "destructive" });
        } finally {
            setIsCreatingTopic(false);
        }
    };

    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !isAuthenticated || !topicId) {
            toast({ title: "Error", description: "Cannot reply. User not logged in or topic ID missing.", variant: "destructive" });
            return;
        }
        if (!replyContent.trim()) {
            toast({ title: "Cannot Reply", description: "Reply content cannot be empty.", variant: "destructive" });
            return;
        }

        setIsReplying(true);
        try {
             // Attempt to get user profile details for snapshot
            let profile: UserProfile | null = null;
            try {
                profile = await getUserProfile(user.$id);
            } catch (profileError) {
                console.warn("Could not fetch profile for post creation snapshot:", profileError);
            }

            const replierName = profile?.name || user.name || 'Anonymous User';
            const replierAvatar = profile?.profilePhotoUrl;

            await createForumPost(
                user.$id,
                replierName,
                replierAvatar,
                {
                    topicId: topicId,
                    content: replyContent
                }
            );
            setReplyContent(''); // Clear reply box
            toast({ title: "Reply Posted" });
            // Refresh posts and potentially the topic details (for reply count)
            await fetchPosts(topicId, 1); // Refetch first page
            await fetchTopicDetails(topicId); // Refetch topic to update reply count/last activity display

        } catch (error: any) {
            console.error("Error posting reply:", error);
            toast({ title: "Reply Failed", description: error.message || "Could not post reply.", variant: "destructive" });
        } finally {
            setIsReplying(false);
        }
    };

    // --- Delete Handlers ---
    const handleDeletePostClick = (postId: string) => {
        setDeletingPostId(postId);
        setShowDeletePostDialog(true);
    };

    const confirmDeletePost = async () => {
        if (!deletingPostId || !topicId) return;
        setIsDeletingPostConfirmed(true); // Show loading state on button
        try {
            await deleteForumPost(deletingPostId);
            toast({ title: "Post Deleted" });
            // Refetch posts
            await fetchPosts(topicId, 1); // Refetch first page
            // Optionally refetch topic if reply count update is implemented in deleteForumPost
            // await fetchTopicDetails(topicId);
        } catch (error: any) {
            console.error("Error deleting post:", error);
            toast({ title: "Deletion Failed", description: error.message || "Could not delete post.", variant: "destructive" });
        } finally {
            setShowDeletePostDialog(false);
            setDeletingPostId(null);
            setIsDeletingPostConfirmed(false);
        }
    };

    const handleDeleteTopicClick = (id: string) => {
        setDeletingTopicId(id);
        setShowDeleteTopicDialog(true);
    };

    const confirmDeleteTopic = async () => {
        if (!deletingTopicId) return;
        setIsDeletingTopicConfirmed(true);
        try {
            const result = await deleteForumTopicAndPosts(deletingTopicId);
            toast({
                title: "Topic Deletion Processed",
                description: `Topic deleted: ${result.topicDeleted}. Posts deleted: ${result.postsDeleted}, Failed: ${result.postsFailed}.`,
                variant: result.topicDeleted && result.postsFailed === 0 ? "default" : "destructive"
            });
            if (result.topicDeleted) {
                navigate('/forum'); // Go back to list view
            }
        } catch (error: any) {
             console.error("Error deleting topic and posts:", error);
            toast({ title: "Deletion Failed", description: error.message || "Could not delete topic.", variant: "destructive" });
        } finally {
            setShowDeleteTopicDialog(false);
            setDeletingTopicId(null);
            setIsDeletingTopicConfirmed(false);
        }
    };


    // --- Render Logic ---

    // Render Topic List View
    const renderTopicList = () => (
        <div>
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-2xl font-semibold text-gray-800 flex items-center">
                    <List className="mr-2 h-6 w-6 text-momcare-primary" /> Forum Topics
                </h2>
                <Button onClick={() => setShowCreateTopicForm(true)} className="bg-momcare-primary hover:bg-momcare-dark">
                    <PlusCircle className="mr-2 h-4 w-4" /> Create New Topic
                </Button>
            </div>

            {/* Create Topic Form (Modal-like section) */}
            {showCreateTopicForm && (
                <Card className="mb-6 border-momcare-secondary/50 bg-momcare-light/30">
                    <CardHeader>
                        <CardTitle>Create a New Forum Topic</CardTitle>
                        <CardDescription>Start a new discussion.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateTopic} className="space-y-4">
                            <div>
                                <Label htmlFor="new-topic-title">Title</Label>
                                <Input
                                    id="new-topic-title"
                                    value={newTopicTitle}
                                    onChange={(e) => setNewTopicTitle(e.target.value)}
                                    placeholder="Enter a clear and concise title"
                                    required
                                    maxLength={250}
                                    disabled={isCreatingTopic}
                                />
                            </div>
                            <div>
                                <Label htmlFor="new-topic-content">Content</Label>
                                <Textarea
                                    id="new-topic-content"
                                    value={newTopicContent}
                                    onChange={(e) => setNewTopicContent(e.target.value)}
                                    placeholder="Start the discussion here..."
                                    required
                                    rows={5}
                                    disabled={isCreatingTopic}
                                    className="min-h-[120px]"
                                />
                            </div>
                             <div>
                                <Label htmlFor="new-topic-category">Category (Optional)</Label>
                                <Input
                                    id="new-topic-category"
                                    value={newTopicCategory}
                                    onChange={(e) => setNewTopicCategory(e.target.value)}
                                    placeholder="e.g., Nutrition, Third Trimester, Symptoms"
                                    maxLength={100}
                                    disabled={isCreatingTopic}
                                />
                            </div>
                            <div className="flex justify-end gap-2">
                                 <Button type="button" variant="outline" onClick={() => setShowCreateTopicForm(false)} disabled={isCreatingTopic}>
                                    Cancel
                                </Button>
                                <Button type="submit" className="bg-momcare-primary hover:bg-momcare-dark" disabled={isCreatingTopic}>
                                    {isCreatingTopic ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Topic"}
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Topics List */}
            {topicsLoading && topics.length === 0 && (
                <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-momcare-primary mx-auto" /></div>
            )}
            {topicsError && (
                <div className="text-center py-10 text-red-600">{topicsError}</div>
            )}
            {!topicsLoading && !topicsError && topics.length === 0 && (
                <div className="text-center py-10 text-gray-500">No topics found. Be the first to create one!</div>
            )}
            {topics.length > 0 && (
                <div className="space-y-0 border rounded-md overflow-hidden"> {/* Remove space-y, add border */}
                    {topics.map(topic => <TopicListItem key={topic.$id} topic={topic} />)}
                </div>
            )}
            {/* Add Pagination Controls Later */}
        </div>
    );

    // Render Topic Detail View
    const renderTopicDetail = () => (
        <div>
            <Button variant="outline" onClick={() => navigate('/forum')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Topics
            </Button>

            {topicLoading && (
                <div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-momcare-primary mx-auto" /></div>
            )}
            {topicError && !topicLoading && (
                 <div className="text-center py-10 text-red-600">{topicError}</div>
            )}

            {currentTopic && !topicLoading && (
                <Card className="mb-6 border-momcare-primary/30">
                    <CardHeader className="bg-momcare-light/50">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                            <div>
                                <CardTitle className="text-xl md:text-2xl font-bold text-momcare-dark flex items-center flex-wrap gap-2">
                                    {currentTopic.isPinned && <Pin className="inline-block h-5 w-5 text-momcare-accent" />}
                                    {currentTopic.isLocked && <Lock className="inline-block h-5 w-5 text-gray-500" />}
                                    {currentTopic.title}
                                </CardTitle>
                                <CardDescription className="mt-1 text-sm text-gray-600 flex items-center flex-wrap gap-x-3 gap-y-1">
    <span>Started by <span className="font-medium">{currentTopic.userName}</span> {formatRelativeTime(currentTopic.$createdAt)}</span>
    {currentTopic.category && <span><Badge variant="secondary">{currentTopic.category}</Badge></span>}
    <span>{currentTopic.replyCount || 0} replies</span>
</CardDescription>
                            </div>
                             {/* Topic Actions (Delete/Edit/Lock/Pin - requires permission checks) */}
                             {user?.$id === currentTopic.userId && (
                                <div className="flex gap-2 flex-shrink-0">
                                    {/* Add Edit Button Later */}
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => handleDeleteTopicClick(currentTopic.$id)}
                                    >
                                        <Trash2 className="mr-1 h-4 w-4" /> Delete Topic
                                    </Button>
                                </div>
                             )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 pb-6">
                        {/* Display initial topic content */}
                        <div className="flex space-x-4 py-4 px-2 border-b">
                            <Avatar className="h-10 w-10 border flex-shrink-0 mt-1">
                                <AvatarImage src={currentTopic.userAvatarUrl || undefined} alt={currentTopic.userName} />
                                <AvatarFallback>{getInitials(currentTopic.userName)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-grow">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-sm text-gray-800">{currentTopic.userName} (OP)</span>
                                    <span className="text-xs text-gray-500">{formatRelativeTime(currentTopic.$createdAt)}</span>
                                </div>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">{currentTopic.content}</p>
                            </div>
                        </div>

                        {/* Replies Section */}
                        <h3 className="text-lg font-semibold mt-6 mb-2 text-gray-700">Replies ({postsTotal})</h3>
                        {postsLoading && posts.length === 0 && (
                             <div className="text-center py-6"><Loader2 className="h-6 w-6 animate-spin text-momcare-primary mx-auto" /></div>
                        )}
                         {postsError && (
                            <div className="text-center py-6 text-red-600">{postsError}</div>
                        )}
                        {!postsLoading && !postsError && posts.length === 0 && (
                            <div className="text-center py-6 text-gray-500">No replies yet.</div>
                        )}
                        {posts.length > 0 && (
                            <div className="space-y-0"> {/* Removed space-y */}
                                {posts.map(post => (
                                    <PostItem
                                        key={post.$id}
                                        post={post}
                                        currentUserId={user?.$id || null}
                                        onDelete={handleDeletePostClick}
                                        isDeleting={deletingPostId === post.$id && isDeletingPostConfirmed}
                                    />
                                ))}
                            </div>
                        )}
                        {/* Add Pagination for posts later */}

                        {/* Reply Form */}
                        {!currentTopic.isLocked && isAuthenticated && (
                            <Card className="mt-8 bg-gray-50/50 border-gray-200">
                                <CardHeader>
                                    <CardTitle className="text-base font-semibold">Post a Reply</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <form onSubmit={handleReply} className="space-y-3">
                                        <Textarea
                                            value={replyContent}
                                            onChange={(e) => setReplyContent(e.target.value)}
                                            placeholder="Write your reply here..."
                                            required
                                            rows={4}
                                            disabled={isReplying}
                                            className="min-h-[100px]"
                                        />
                                        <div className="text-right">
                                            <Button type="submit" className="bg-momcare-primary hover:bg-momcare-dark" disabled={isReplying || !replyContent.trim()}>
                                                {isReplying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : <><Send className="mr-2 h-4 w-4" /> Post Reply</>}
                                            </Button>
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                        {currentTopic.isLocked && (
                            <div className="mt-8 text-center text-gray-600 bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                                <Lock className="inline-block h-5 w-5 mr-2" /> This topic is locked. No new replies can be added.
                            </div>
                        )}
                         {!isAuthenticated && (
                             <div className="mt-8 text-center text-gray-600 bg-blue-50 border border-blue-200 p-4 rounded-md">
                                Please <Link to={`/login?redirect=${location.pathname}`} className="text-momcare-primary font-semibold hover:underline">log in</Link> or <Link to={`/signup?redirect=${location.pathname}`} className="text-momcare-primary font-semibold hover:underline">sign up</Link> to reply.
                            </div>
                         )}
                    </CardContent>
                </Card>
            )}
        </div>
    );

    return (
        <MainLayout requireAuth={true}> {/* Require auth to view forum */}
            <div className="max-w-7xl mx-auto px-4 py-8">
                {topicId ? renderTopicDetail() : renderTopicList()}
            </div>

            {/* Delete Post Dialog */}
            <AlertDialog open={showDeletePostDialog} onOpenChange={setShowDeletePostDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Post Deletion</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete this post? This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingPostId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeletePost} className="bg-red-600 hover:bg-red-700" disabled={isDeletingPostConfirmed}>
                            {isDeletingPostConfirmed ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Post"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

             {/* Delete Topic Dialog */}
            <AlertDialog open={showDeleteTopicDialog} onOpenChange={setShowDeleteTopicDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Topic Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this entire topic, including all its replies? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setDeletingTopicId(null)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteTopic} className="bg-red-600 hover:bg-red-700" disabled={isDeletingTopicConfirmed}>
                            {isDeletingTopicConfirmed ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Topic & Replies"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default ForumPage;