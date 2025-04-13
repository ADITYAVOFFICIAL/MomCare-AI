// src/pages/ForumPage.tsx
import React, { useState, useEffect, useCallback, useMemo, FormEvent, ChangeEvent } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import {
    MessageSquare, PlusCircle, List, Tag, Clock, User, Loader2, ArrowLeft, Send, Trash2, Edit, Lock, Unlock, Pin, PinOff, Search, ThumbsUp, ThumbsDown, Filter, Sparkles, X, ShieldAlert // Added ShieldAlert for moderation
} from 'lucide-react';
import debounce from 'lodash.debounce'; // For debouncing search input
import ReactMarkdown, { Options as ReactMarkdownOptions } from 'react-markdown'; // Import ReactMarkdown
import remarkGfm from 'remark-gfm'; // Import GFM plugin for tables, strikethrough etc.

// --- UI & Layout ---
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
import { Badge } from '@/components/ui/badge';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/authStore';

// --- Appwrite & AI ---
import {
    ForumTopic, ForumPost, UserProfile, ForumVote, VoteCounts, UserVoteStatus,
    getForumTopics, getForumTopic, getForumPosts,
    createForumTopic, createForumPost,
    deleteForumPost, deleteForumTopicAndPosts,
    updateForumTopic, updateForumPost, // Keep update functions if needed later
    getUserProfile,
    castForumVote, getUserVoteStatus, getTargetVoteCounts
} from '@/lib/appwrite';
// *** Import AI Formatting Function ***
import { formatContentWithGroq } from '@/lib/groqf';
// *** Import AI Moderation Function & Types ***
import { groqModService, ModerationDecision, ModerationFlag } from '@/lib/groqMod';

// --- Helper Functions ---
const getInitials = (nameStr: string | undefined | null): string => {
    if (!nameStr) return '?';
    return nameStr.split(' ').map(n => n[0]).filter(Boolean).join('').toUpperCase().substring(0, 2);
};

const formatRelativeTime = (dateString?: string): string => {
    if (!dateString) return 'unknown time';
    try { return formatDistanceToNow(parseISO(dateString), { addSuffix: true }); }
    catch (e) { console.error("Error parsing date for relative time:", dateString, e); return 'invalid date'; }
};

// --- Constants ---
const TOPICS_PER_PAGE = 15;
const POSTS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 500;
const FORUM_CATEGORIES = [
    'All', 'General', 'Pregnancy', 'Childbirth', 'Postpartum', 'Nutrition', 'Exercise', 'Mental Health', 'Baby Care', 'Symptoms', 'Tips & Tricks'
];

// --- Type for Markdown rendering props ---
type AnchorProps = React.ClassAttributes<HTMLAnchorElement> & React.AnchorHTMLAttributes<HTMLAnchorElement> & { node?: any };

// ================================================
// --- Sub-Components (VoteButton, TopicListItem, PostItem) ---
// ================================================

const VoteButton: React.FC<{
    direction: 'up' | 'down';
    count: number;
    userVote: UserVoteStatus;
    isVoting: boolean; // Combined loading/voting state
    isAuthenticated: boolean;
    onVote: (voteType: 'up' | 'down' | 'remove') => void; // Simplified handler
}> = React.memo(({ direction, count, userVote, isVoting, isAuthenticated, onVote }) => {
    const Icon = direction === 'up' ? ThumbsUp : ThumbsDown;
    const isActive = userVote === direction;
    const { toast } = useToast();

    const handleClick = () => {
        if (!isAuthenticated) { toast({ title: "Login Required", description: "Please log in to vote.", variant: "default" }); return; }
        if (isVoting) return;
        const action = isActive ? 'remove' : direction;
        onVote(action);
    };

    return (
        <Button
            variant="ghost" size="sm"
            className={`flex items-center gap-1 px-2 h-7 text-xs rounded-md transition-colors ${isActive ? (direction === 'up' ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/50' : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/50') : 'text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700'}`}
            onClick={handleClick} disabled={isVoting} aria-pressed={isActive} aria-label={`${direction === 'up' ? 'Upvote' : 'Downvote'} (${count})`}
        >
            {isVoting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Icon className="h-3 w-3" />}
            <span className="font-medium">{count}</span>
        </Button>
    );
});

const TopicListItem: React.FC<{
    topic: ForumTopic;
    currentUserId: string | null;
    isAuthenticated: boolean;
    onVote: (topicId: string, voteType: 'up' | 'down' | 'remove') => Promise<void>;
}> = React.memo(({ topic, currentUserId, isAuthenticated, onVote }) => {
    const [voteStatus, setVoteStatus] = useState<UserVoteStatus>('none');
    const [voteCounts, setVoteCounts] = useState<VoteCounts>({ upvotes: 0, downvotes: 0, score: topic.voteScore || 0 });
    const [isVoting, setIsVoting] = useState(false);
    const [isLoadingVotes, setIsLoadingVotes] = useState(true);

    useEffect(() => {
        let isMounted = true;
        setIsLoadingVotes(true);
        const fetchVoteData = async () => {
            try {
                const [counts, status] = await Promise.all([
                    getTargetVoteCounts(topic.$id),
                    isAuthenticated && currentUserId ? getUserVoteStatus(currentUserId, topic.$id) : Promise.resolve('none' as UserVoteStatus)
                ]);
                if (isMounted) { setVoteCounts(counts); setVoteStatus(status); }
            } catch (err) { if (isMounted) { setVoteCounts(prev => ({ ...prev, score: topic.voteScore || 0 })); setVoteStatus('none'); } console.error(`Error fetching vote data for topic ${topic.$id}:`, err); }
            finally { if (isMounted) setIsLoadingVotes(false); }
        };
        fetchVoteData();
        return () => { isMounted = false };
    }, [isAuthenticated, currentUserId, topic.$id, topic.voteScore]);

    const handleVote = async (voteType: 'up' | 'down' | 'remove') => {
        if (!isAuthenticated || isVoting || isLoadingVotes) return;
        setIsVoting(true);
        const previousStatus = voteStatus; const previousCounts = { ...voteCounts };
        const newStatus = voteType === 'remove' ? 'none' : voteType; setVoteStatus(newStatus); // Optimistic update
        try {
            await onVote(topic.$id, voteType);
            const [refetchedStatus, refetchedCounts] = await Promise.all([ getUserVoteStatus(currentUserId!, topic.$id), getTargetVoteCounts(topic.$id) ]);
            setVoteStatus(refetchedStatus); setVoteCounts(refetchedCounts);
        } catch (error) { setVoteStatus(previousStatus); setVoteCounts(previousCounts); console.error("Topic vote failed, reverting UI"); }
        finally { setIsVoting(false); }
    };

    return (
        <div className="flex items-start space-x-3 p-3 md:p-4 border-b dark:border-gray-700 last:border-b-0 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors duration-150">
            <div className="flex flex-col items-center pt-1 flex-shrink-0 w-10">
                <VoteButton direction="up" count={voteCounts.upvotes} userVote={voteStatus} isVoting={isVoting || isLoadingVotes} isAuthenticated={isAuthenticated} onVote={handleVote} />
                <span className={`text-sm font-bold my-0.5 w-full text-center ${voteCounts.score > 0 ? 'text-green-600 dark:text-green-500' : voteCounts.score < 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-600 dark:text-gray-400'}`} title={`Score: ${voteCounts.score}`}>
                    {isLoadingVotes ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : voteCounts.score}
                </span>
                <VoteButton direction="down" count={voteCounts.downvotes} userVote={voteStatus} isVoting={isVoting || isLoadingVotes} isAuthenticated={isAuthenticated} onVote={handleVote} />
            </div>
            <Avatar className="h-10 w-10 border flex-shrink-0">
                <AvatarImage src={topic.userAvatarUrl || undefined} alt={topic.userName} />
                <AvatarFallback>{getInitials(topic.userName)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow min-w-0">
                <Link to={`/forum/${topic.$id}`} className="group block">
                    <h3 className="text-base font-semibold text-gray-800 dark:text-gray-200 group-hover:text-momcare-primary dark:group-hover:text-momcare-accent line-clamp-2 break-words mb-1">
                        {topic.isPinned && <Pin className="inline-block h-4 w-4 mr-1.5 text-momcare-accent flex-shrink-0" aria-label="Pinned" />}
                        {topic.isLocked && <Lock className="inline-block h-4 w-4 mr-1.5 text-gray-500 flex-shrink-0" aria-label="Locked" />}
                        {topic.title}
                    </h3>
                </Link>
                <div className="text-xs text-gray-600 dark:text-gray-400 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>By <span className="font-medium hover:underline">{topic.userName}</span></span>
                    {topic.category && <Badge variant="secondary" className="text-xs px-1.5 py-0.5">{topic.category}</Badge>}
                    <span>{topic.replyCount || 0} replies</span>
                    <span title={topic.lastReplyAt ? new Date(topic.lastReplyAt).toLocaleString() : ''}>Last activity: {formatRelativeTime(topic.lastReplyAt)}</span>
                    <span title={topic.$createdAt ? new Date(topic.$createdAt).toLocaleString() : ''}>Created: {formatRelativeTime(topic.$createdAt)}</span>
                </div>
            </div>
        </div>
    );
});

const PostItem: React.FC<{
    post: ForumPost;
    currentUserId: string | null;
    isAuthenticated: boolean;
    onDelete: (postId: string) => void;
    isDeleting: boolean;
    onVote: (postId: string, voteType: 'up' | 'down' | 'remove') => Promise<void>;
}> = React.memo(({ post, currentUserId, isAuthenticated, onDelete, isDeleting, onVote }) => {
    const [voteStatus, setVoteStatus] = useState<UserVoteStatus>('none');
    const [voteCounts, setVoteCounts] = useState<VoteCounts>({ upvotes: 0, downvotes: 0, score: post.voteScore || 0 });
    const [isVoting, setIsVoting] = useState(false);
    const [isLoadingVotes, setIsLoadingVotes] = useState(true);
    const markdownComponents: ReactMarkdownOptions['components'] = { a: ({ node, ...props }: AnchorProps) => (<a target="_blank" rel="noopener noreferrer" {...props} />) };

    useEffect(() => {
        let isMounted = true;
        setIsLoadingVotes(true);
        const fetchVoteData = async () => {
            try {
                const [counts, status] = await Promise.all([
                    getTargetVoteCounts(post.$id),
                    isAuthenticated && currentUserId ? getUserVoteStatus(currentUserId, post.$id) : Promise.resolve('none' as UserVoteStatus)
                ]);
                if (isMounted) { setVoteCounts(counts); setVoteStatus(status); }
            } catch (err) { if (isMounted) { setVoteCounts(prev => ({ ...prev, score: post.voteScore || 0 })); setVoteStatus('none'); } console.error(`Error fetching vote data for post ${post.$id}:`, err); }
            finally { if (isMounted) setIsLoadingVotes(false); }
        };
        fetchVoteData();
        return () => { isMounted = false };
    }, [isAuthenticated, currentUserId, post.$id, post.voteScore]);

    const handleVote = async (voteType: 'up' | 'down' | 'remove') => {
        if (!isAuthenticated || isVoting || isLoadingVotes) return;
        setIsVoting(true);
        const previousStatus = voteStatus; const previousCounts = { ...voteCounts };
        const newStatus = voteType === 'remove' ? 'none' : voteType; setVoteStatus(newStatus); // Optimistic update
        try {
            await onVote(post.$id, voteType);
            const [refetchedStatus, refetchedCounts] = await Promise.all([ getUserVoteStatus(currentUserId!, post.$id), getTargetVoteCounts(post.$id) ]);
            setVoteStatus(refetchedStatus); setVoteCounts(refetchedCounts);
        } catch (error) { setVoteStatus(previousStatus); setVoteCounts(previousCounts); console.error("Post vote failed, reverting UI"); }
        finally { setIsVoting(false); }
    };

    return (
        <div className="flex space-x-3 py-4 px-2 border-b dark:border-gray-700 last:border-b-0">
            <Avatar className="h-9 w-9 border flex-shrink-0 mt-1">
                <AvatarImage src={post.userAvatarUrl || undefined} alt={post.userName} />
                <AvatarFallback>{getInitials(post.userName)}</AvatarFallback>
            </Avatar>
            <div className="flex-grow min-w-0">
                <div className="flex justify-between items-center mb-1 flex-wrap gap-x-2">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 hover:underline">{post.userName}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400" title={post.$createdAt ? new Date(post.$createdAt).toLocaleString() : ''}>
                        {formatRelativeTime(post.$createdAt)}
                    </span>
                </div>
                {/* Render post content using ReactMarkdown */}
                <div className="prose prose-sm dark:prose-invert max-w-none mb-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{post.content}</ReactMarkdown>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center gap-1">
                        <VoteButton direction="up" count={voteCounts.upvotes} userVote={voteStatus} isVoting={isVoting || isLoadingVotes} isAuthenticated={isAuthenticated} onVote={handleVote} />
                        <span className={`text-xs font-semibold w-6 text-center ${voteCounts.score > 0 ? 'text-green-600 dark:text-green-500' : voteCounts.score < 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-600 dark:text-gray-400'}`} title={`Score: ${voteCounts.score}`}>
                            {isLoadingVotes ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : voteCounts.score}
                        </span>
                        <VoteButton direction="down" count={voteCounts.downvotes} userVote={voteStatus} isVoting={isVoting || isLoadingVotes} isAuthenticated={isAuthenticated} onVote={handleVote} />
                    </div>
                    {currentUserId === post.userId && (
                        <div className="flex gap-1">
                            {/* Edit Button Placeholder */}
                            {/* <Button variant="ghost" size="icon" className="text-gray-500 hover:bg-gray-100 h-7 w-7"><Edit className="h-4 w-4" /></Button> */}
                            <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 h-7 w-7 rounded-full" onClick={() => onDelete(post.$id)} disabled={isDeleting} title="Delete Post">
                                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});


// ==================================
// --- Main Forum Page Component ---
// ==================================
const ForumPage: React.FC = () => {
    const { topicId } = useParams<{ topicId?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();
    const { user, isAuthenticated } = useAuthStore();

    // --- State ---
    // List View
    const [topics, setTopics] = useState<ForumTopic[]>([]);
    const [topicsLoading, setTopicsLoading] = useState(false);
    const [topicsError, setTopicsError] = useState<string | null>(null);
    const [topicsTotal, setTopicsTotal] = useState(0);
    const [topicsPage, setTopicsPage] = useState(1);
    // Search/Filter/Sort
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [sortBy, setSortBy] = useState<'lastReplyAt' | 'createdAt' | 'voteScore'>('lastReplyAt');
    // Detail View
    const [currentTopic, setCurrentTopic] = useState<ForumTopic | null>(null);
    const [posts, setPosts] = useState<ForumPost[]>([]);
    const [topicLoading, setTopicLoading] = useState(false);
    const [postsLoading, setPostsLoading] = useState(false);
    const [topicError, setTopicError] = useState<string | null>(null);
    const [postsError, setPostsError] = useState<string | null>(null);
    const [postsTotal, setPostsTotal] = useState(0);
    const [postsPage, setPostsPage] = useState(1);
    const [postSearchQuery, setPostSearchQuery] = useState('');
    // Forms & Actions
    const [replyContent, setReplyContent] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [showCreateTopicForm, setShowCreateTopicForm] = useState(false);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicContent, setNewTopicContent] = useState('');
    const [newTopicCategory, setNewTopicCategory] = useState('');
    const [isCreatingTopic, setIsCreatingTopic] = useState(false);
    const [isModerating, setIsModerating] = useState(false); // <-- New state for moderation check
    const [isFormattingTopic, setIsFormattingTopic] = useState(false);
    const [isFormattingReply, setIsFormattingReply] = useState(false);
    // Deletion Dialogs
    const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
    const [showDeletePostDialog, setShowDeletePostDialog] = useState(false);
    const [isDeletingPostConfirmed, setIsDeletingPostConfirmed] = useState(false);
    const [deletingTopicId, setDeletingTopicId] = useState<string | null>(null);
    const [showDeleteTopicDialog, setShowDeleteTopicDialog] = useState(false);
    const [isDeletingTopicConfirmed, setIsDeletingTopicConfirmed] = useState(false);

    // --- Data Fetching Callbacks (Memoized) ---
    const fetchTopics = useCallback(async (page = 1, reset = false) => {
        setTopicsLoading(true); setTopicsError(null);
        const offset = (page - 1) * TOPICS_PER_PAGE;
        const currentCategory = filterCategory === 'All' ? undefined : filterCategory;
        try {
            const response = await getForumTopics(currentCategory, TOPICS_PER_PAGE, offset, sortBy, searchQuery);
            setTopics(prev => (reset || page === 1) ? response.documents : [...prev, ...response.documents]);
            setTopicsTotal(response.total); setTopicsPage(page);
        } catch (error: any) { setTopicsError("Failed to load topics."); toast({ title: "Error", description: "Could not fetch forum topics.", variant: "destructive" }); console.error("Fetch topics error:", error); }
        finally { setTopicsLoading(false); }
    }, [searchQuery, filterCategory, sortBy, toast]);

    const fetchTopicDetails = useCallback(async (id: string) => {
        setTopicLoading(true); setTopicError(null);
        try {
            const topicData = await getForumTopic(id);
            if (!topicData) throw new Error("Topic not found.");
            setCurrentTopic(topicData);
        } catch (error: any) { setTopicError(error.message || "Failed to load topic details."); setCurrentTopic(null); toast({ title: "Error", description: "Could not fetch topic details.", variant: "destructive" }); if (error.message === "Topic not found.") { navigate('/forum', { replace: true }); } console.error("Fetch topic details error:", error); }
        finally { setTopicLoading(false); }
    }, [toast, navigate]);

    const fetchPosts = useCallback(async (id: string, page = 1, reset = false) => {
        setPostsLoading(true); setPostsError(null);
        const offset = (page - 1) * POSTS_PER_PAGE;
        try {
            const response = await getForumPosts(id, POSTS_PER_PAGE, offset, postSearchQuery);
            setPosts(prev => (reset || page === 1) ? response.documents : [...prev, ...response.documents]);
            setPostsTotal(response.total); setPostsPage(page);
        } catch (error: any) { setPostsError("Failed to load replies."); toast({ title: "Error", description: "Could not fetch replies.", variant: "destructive" }); console.error("Fetch posts error:", error); }
        finally { setPostsLoading(false); }
    }, [postSearchQuery, toast]);

    // --- Debounced Fetch Triggers ---
    const debouncedFetchTopics = useMemo(() => debounce(() => fetchTopics(1, true), SEARCH_DEBOUNCE_MS), [fetchTopics]);
    const debouncedFetchPosts = useMemo(() => debounce(() => { if (topicId) fetchPosts(topicId, 1, true); }, SEARCH_DEBOUNCE_MS), [fetchPosts, topicId]);

    // --- Effects ---
    useEffect(() => { // Fetch data based on route
        if (topicId) {
            setTopics([]); setTopicsTotal(0); setTopicsPage(1); setShowCreateTopicForm(false); // Reset list view
            setCurrentTopic(null); setPosts([]); setPostsTotal(0); setPostsPage(1); setPostSearchQuery(''); // Reset detail view
            fetchTopicDetails(topicId); fetchPosts(topicId, 1, true);
        } else {
            setCurrentTopic(null); setPosts([]); setPostsTotal(0); setPostsPage(1); setPostSearchQuery(''); // Reset detail view
            setTopics([]); setTopicsTotal(0); setTopicsPage(1); // Reset list view
            fetchTopics(1, true); // Fetch initial topics list
        }
        setTopicsError(null); setTopicError(null); setPostsError(null); // Reset errors
    }, [topicId, fetchTopicDetails, fetchPosts, fetchTopics]);

    useEffect(() => { if (!topicId) debouncedFetchTopics(); return () => debouncedFetchTopics.cancel(); }, [searchQuery, debouncedFetchTopics, topicId]);
    useEffect(() => { if (!topicId) fetchTopics(1, true); }, [filterCategory, sortBy, topicId]);
    useEffect(() => { if (topicId) debouncedFetchPosts(); return () => debouncedFetchPosts.cancel(); }, [postSearchQuery, debouncedFetchPosts, topicId]);

    // --- Handlers ---
    const handleFormatTopicContent = useCallback(async () => {
        if (!newTopicContent?.trim()) return;
        setIsFormattingTopic(true);
        try { const formatted = await formatContentWithGroq(newTopicContent); setNewTopicContent(formatted); toast({ title: "Content Formatted" }); }
        catch (error: any) { toast({ title: "Formatting Error", description: error.message || "Failed.", variant: "destructive" }); }
        finally { setIsFormattingTopic(false); }
    }, [newTopicContent, toast]);

    const handleFormatReplyContent = useCallback(async () => {
        if (!replyContent?.trim()) return;
        setIsFormattingReply(true);
        try { const formatted = await formatContentWithGroq(replyContent); setReplyContent(formatted); toast({ title: "Content Formatted" }); }
        catch (error: any) { toast({ title: "Formatting Error", description: error.message || "Failed.", variant: "destructive" }); }
        finally { setIsFormattingReply(false); }
    }, [replyContent, toast]);

    // --- MODIFIED handleCreateTopic with Moderation ---
    const handleCreateTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !isAuthenticated) { toast({ title: "Authentication Required", description: "Please log in.", variant: "destructive" }); navigate('/login'); return; }
        if (!newTopicTitle.trim() || !newTopicContent.trim()) { toast({ title: "Missing Information", description: "Title and content required.", variant: "destructive" }); return; }

        setIsModerating(true); // Indicate moderation check
        setIsCreatingTopic(true); // Keep general loading active

        try {
            // --- Moderation Step ---
            console.log("Moderating new topic content...");
            const [titleModeration, contentModeration] = await Promise.all([
                groqModService.moderateContent(newTopicTitle, { contentType: 'forum_title' }),
                groqModService.moderateContent(newTopicContent, { contentType: 'forum_post' })
            ]);
            console.log("Moderation results:", { title: titleModeration.decision, content: contentModeration.decision });

            // Combine flags and determine final decision
            const combinedFlags = [...new Set([...titleModeration.flags, ...contentModeration.flags])];
            let finalDecision = ModerationDecision.ALLOW;
            let rejectionReason = "";

            if (titleModeration.decision === ModerationDecision.DENY || contentModeration.decision === ModerationDecision.DENY) {
                finalDecision = ModerationDecision.DENY;
                rejectionReason = titleModeration.decision === ModerationDecision.DENY ? titleModeration.reason || "Title violates guidelines" : contentModeration.reason || "Content violates guidelines";
            } else if (titleModeration.decision === ModerationDecision.FLAG || contentModeration.decision === ModerationDecision.FLAG) {
                finalDecision = ModerationDecision.FLAG;
                rejectionReason = contentModeration.decision === ModerationDecision.FLAG ? contentModeration.reason || "Content flagged" : titleModeration.reason || "Title flagged";
            } else if (titleModeration.decision === ModerationDecision.ERROR || contentModeration.decision === ModerationDecision.ERROR) {
                finalDecision = ModerationDecision.ERROR;
                rejectionReason = "Moderation check failed.";
            }
            setIsModerating(false); // Moderation check finished

            // --- Handle Moderation Outcome ---
            if (finalDecision === ModerationDecision.DENY) {
                toast({ title: "Topic Rejected", description: rejectionReason, variant: "destructive" });
                setIsCreatingTopic(false); return;
            }
            if (finalDecision === ModerationDecision.ERROR) {
                toast({ title: "Moderation Error", description: rejectionReason + " Please try again.", variant: "destructive" });
                setIsCreatingTopic(false); return;
            }

            // --- Proceed with Creation (ALLOW or FLAG) ---
            const needsReview = finalDecision === ModerationDecision.FLAG;
            if (needsReview) {
                // **Action Required:** Decide how to handle flagged content.
                // Option A: Show toast only (content goes live but might be removed later)
                toast({ title: "Topic Under Review", description: rejectionReason || "Submitted but requires moderator review.", variant: "default" });
                // Option B: Add a 'needsReview' flag to the data sent to Appwrite
                // You'll need to update the `createForumTopic` function and Appwrite schema.
                console.warn("Topic content flagged:", rejectionReason, combinedFlags);
            }

            // Fetch profile for creator info
            let profile: UserProfile | null = null; try { profile = await getUserProfile(user.$id); } catch (err) { console.warn("Profile fetch error", err); }
            const creatorName = profile?.name || user.name || 'Anonymous';
            const creatorAvatar = profile?.profilePhotoUrl;

            // --- Create Topic in Appwrite ---
            const createdTopic = await createForumTopic(user.$id, creatorName, creatorAvatar, {
                title: newTopicTitle, content: newTopicContent, category: newTopicCategory || undefined,
                // needsReview: needsReview, // Uncomment and implement if using Option B
            });

            toast({ title: "Topic Created Successfully!" });
            setShowCreateTopicForm(false); setNewTopicTitle(''); setNewTopicContent(''); setNewTopicCategory('');
            navigate(`/forum/${createdTopic.$id}`);

        } catch (error: any) {
            console.error("Error creating topic:", error);
            toast({ title: "Creation Failed", description: error.message || "Could not create topic.", variant: "destructive" });
        } finally {
            setIsModerating(false);
            setIsCreatingTopic(false);
        }
    };

    // --- MODIFIED handleReply with Moderation ---
    const handleReply = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !isAuthenticated || !topicId) { toast({ title: "Authentication Required", description: "Please log in to reply.", variant: "destructive" }); navigate('/login'); return; }
        if (!replyContent.trim()) { toast({ title: "Cannot Reply", description: "Reply content cannot be empty.", variant: "destructive" }); return; }

        setIsModerating(true);
        setIsReplying(true);

        try {
            // --- Moderation Step ---
            console.log("Moderating reply content...");
            const contentModeration = await groqModService.moderateContent(replyContent, { contentType: 'forum_post' });
            console.log("Moderation result:", contentModeration.decision);

            const finalDecision = contentModeration.decision;
            const rejectionReason = contentModeration.reason;

            setIsModerating(false);

            // --- Handle Moderation Outcome ---
            if (finalDecision === ModerationDecision.DENY) {
                toast({ title: "Reply Rejected", description: rejectionReason || "Your reply violates community guidelines.", variant: "destructive" });
                setIsReplying(false); return;
            }
            if (finalDecision === ModerationDecision.ERROR) {
                toast({ title: "Moderation Error", description: (rejectionReason || "Moderation check failed.") + " Please try again.", variant: "destructive" });
                setIsReplying(false); return;
            }

            // --- Proceed with Creation (ALLOW or FLAG) ---
            const needsReview = finalDecision === ModerationDecision.FLAG;
            if (needsReview) {
                // **Action Required:** Decide how to handle flagged content.
                toast({ title: "Reply Under Review", description: rejectionReason || "Submitted but requires moderator review.", variant: "default" });
                console.warn("Reply content flagged:", rejectionReason, contentModeration.flags);
                 // Option B: Add 'needsReview' flag to data below if implemented
            }

            // Fetch profile for replier info
            let profile: UserProfile | null = null; try { profile = await getUserProfile(user.$id); } catch (err) { console.warn("Profile fetch error", err); }
            const replierName = profile?.name || user.name || 'Anonymous';
            const replierAvatar = profile?.profilePhotoUrl;

            // --- Create Post in Appwrite ---
            await createForumPost(user.$id, replierName, replierAvatar, {
                topicId: topicId, content: replyContent,
                // needsReview: needsReview, // Uncomment and implement if using Option B
            });

            setReplyContent('');
            toast({ title: "Reply Posted" });
            await fetchPosts(topicId, 1, true); // Refresh posts
            await fetchTopicDetails(topicId); // Refresh topic details (counts)

        } catch (error: any) {
            console.error("Error posting reply:", error);
            toast({ title: "Reply Failed", description: error.message || "Could not post reply.", variant: "destructive" });
        } finally {
            setIsModerating(false);
            setIsReplying(false);
        }
    };


    // --- Vote Handler ---
    const handleVoteAction = useCallback(async (targetId: string, targetType: 'topic' | 'post', voteType: 'up' | 'down' | 'remove') => {
        if (!user || !isAuthenticated) { toast({ title: "Login Required", description: "Please log in to vote.", variant: "default" }); throw new Error("User not authenticated"); }
        try { await castForumVote(user.$id, targetId, targetType, voteType); }
        catch (error: any) { console.error(`Error casting vote:`, error); toast({ title: "Vote Error", description: error.message || "Could not cast vote.", variant: "destructive" }); throw error; }
    }, [user, isAuthenticated, toast]);

    const handleTopicVote = useCallback((topicId: string, voteType: 'up' | 'down' | 'remove') => handleVoteAction(topicId, 'topic', voteType), [handleVoteAction]);
    const handlePostVote = useCallback((postId: string, voteType: 'up' | 'down' | 'remove') => handleVoteAction(postId, 'post', voteType), [handleVoteAction]);

    // --- Delete Handlers ---
    const handleDeletePostClick = (postId: string) => {
        if (!isAuthenticated) { toast({ title: "Login Required", variant: "destructive" }); return; }
        setDeletingPostId(postId); setShowDeletePostDialog(true);
    };

    const confirmDeletePost = async () => {
        if (!deletingPostId || !topicId || !isAuthenticated || !user) return;
        setIsDeletingPostConfirmed(true);
        try {
            const postToDelete = posts.find(p => p.$id === deletingPostId);
            if (postToDelete?.userId !== user.$id) { toast({ title: "Unauthorized", description: "Cannot delete others' posts.", variant: "destructive" }); throw new Error("Unauthorized"); }
            await deleteForumPost(deletingPostId, topicId);
            toast({ title: "Post Deleted" });
            await fetchPosts(topicId, 1, true); await fetchTopicDetails(topicId);
        } catch (error: any) { if (error.message !== "Unauthorized") { toast({ title: "Deletion Failed", description: error.message || "Could not delete post.", variant: "destructive" }); } console.error("Delete post error:", error); }
        finally { setShowDeletePostDialog(false); setDeletingPostId(null); setIsDeletingPostConfirmed(false); }
    };

    const handleDeleteTopicClick = (id: string) => {
        if (!isAuthenticated) { toast({ title: "Login Required", variant: "destructive" }); return; }
        setDeletingTopicId(id); setShowDeleteTopicDialog(true);
    };

    const confirmDeleteTopic = async () => {
        if (!deletingTopicId || !isAuthenticated || !user) return;
        setIsDeletingTopicConfirmed(true);
        try {
            if (currentTopic?.userId !== user.$id) { toast({ title: "Unauthorized", description: "Cannot delete others' topics.", variant: "destructive" }); throw new Error("Unauthorized"); }
            const result = await deleteForumTopicAndPosts(deletingTopicId);
            toast({ title: "Topic Deletion Processed", description: `Topic deleted: ${result.topicDeleted}. Posts deleted: ${result.postsDeleted}, Failed: ${result.postsFailed}.`, variant: result.topicDeleted && result.postsFailed === 0 ? "default" : "destructive" });
            if (result.topicDeleted) { navigate('/forum', { replace: true }); }
        } catch (error: any) { if (error.message !== "Unauthorized") { toast({ title: "Deletion Failed", description: error.message || "Could not delete topic.", variant: "destructive" }); } console.error("Delete topic error:", error); }
        finally { setShowDeleteTopicDialog(false); setDeletingTopicId(null); setIsDeletingTopicConfirmed(false); }
    };

    // --- Render Logic (Topic List and Detail Views - Including Markdown Rendering) ---
    const renderTopicList = () => (
        <div className="space-y-6">
            {/* Control Bar */}
            <Card className="sticky top-[var(--header-height,60px)] z-10 shadow-sm border dark:border-gray-700 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <CardContent className="p-3 md:p-4">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
                        <h2 className="text-xl md:text-2xl font-semibold text-gray-800 dark:text-gray-200 flex items-center flex-shrink-0"> <MessageSquare className="mr-2 h-6 w-6 text-momcare-primary" /> Community Forum </h2>
                        <Button onClick={() => { if (!isAuthenticated) { toast({ title: "Login Required", description: "Please log in to create a topic.", variant: "default" }); navigate('/login'); } else { setShowCreateTopicForm(true); } }} className="bg-momcare-primary hover:bg-momcare-dark w-full md:w-auto"> <PlusCircle className="mr-2 h-4 w-4" /> Create New Topic </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <div className="relative"> <Label htmlFor="search-topics" className="sr-only">Search Topics</Label> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" /> <Input id="search-topics" type="search" placeholder="Search topic titles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10 h-9 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" /> {searchQuery && (<Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={() => setSearchQuery('')}><X className="h-4 w-4 text-gray-400" /></Button>)} </div>
                        <div> <Label htmlFor="filter-category" className="sr-only">Filter by Category</Label> <Select value={filterCategory} onValueChange={setFilterCategory}><SelectTrigger id="filter-category" className="w-full h-9 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"><Filter className="h-3.5 w-3.5 mr-2 text-gray-400" /><SelectValue placeholder="Filter by category" /></SelectTrigger><SelectContent className="dark:bg-gray-800 dark:text-gray-200">{FORUM_CATEGORIES.map(cat => (<SelectItem key={cat} value={cat} className="dark:hover:bg-gray-700">{cat}</SelectItem>))}</SelectContent></Select> </div>
                        <div> <Label htmlFor="sort-by" className="sr-only">Sort By</Label> <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}><SelectTrigger id="sort-by" className="w-full h-9 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"><List className="h-3.5 w-3.5 mr-2 text-gray-400" /><SelectValue placeholder="Sort by" /></SelectTrigger><SelectContent className="dark:bg-gray-800 dark:text-gray-200"><SelectItem value="lastReplyAt" className="dark:hover:bg-gray-700">Recent Activity</SelectItem><SelectItem value="createdAt" className="dark:hover:bg-gray-700">Newest Created</SelectItem><SelectItem value="voteScore" className="dark:hover:bg-gray-700">Top Voted</SelectItem></SelectContent></Select> </div>
                    </div>
                </CardContent>
            </Card>

            {/* Create Topic Form */}
            {showCreateTopicForm && (
                <Card className="border-momcare-secondary/50 bg-momcare-light/20 dark:bg-gray-800/50 dark:border-gray-700/80 animate-fade-in">
                    <CardHeader> <CardTitle>Create a New Forum Topic</CardTitle> <CardDescription>Start a new discussion. Markdown is supported for formatting.</CardDescription> </CardHeader>
                    <CardContent>
                        <form onSubmit={handleCreateTopic} className="space-y-4">
                            <div> <Label htmlFor="new-topic-title">Title *</Label> <Input id="new-topic-title" value={newTopicTitle} onChange={(e) => setNewTopicTitle(e.target.value)} placeholder="Enter a clear and concise title" required maxLength={250} disabled={isCreatingTopic || isFormattingTopic || isModerating} className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" /> </div>
                            <div> <div className="flex justify-between items-center mb-1"> <Label htmlFor="new-topic-content">Content (Markdown Supported) *</Label> <Button type="button" variant="outline" size="sm" onClick={handleFormatTopicContent} disabled={isFormattingTopic || isCreatingTopic || !newTopicContent?.trim() || isModerating} title="Auto-format content using AI" className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"> {isFormattingTopic ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />} AI Format </Button> </div> <Textarea id="new-topic-content" value={newTopicContent} onChange={(e) => setNewTopicContent(e.target.value)} placeholder="Start the discussion here..." required rows={6} disabled={isCreatingTopic || isFormattingTopic || isModerating} className="min-h-[150px] dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" /> </div>
                            <div> <Label htmlFor="new-topic-category">Category (Optional)</Label> <Input id="new-topic-category" value={newTopicCategory} onChange={(e) => setNewTopicCategory(e.target.value)} placeholder="e.g., Nutrition, Third Trimester" maxLength={100} disabled={isCreatingTopic || isFormattingTopic || isModerating} className="dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" /> </div>
                            <CardFooter className="p-0 pt-4 flex justify-end gap-2"> <Button type="button" variant="ghost" onClick={() => setShowCreateTopicForm(false)} disabled={isCreatingTopic || isFormattingTopic || isModerating}>Cancel</Button> <Button type="submit" className="bg-momcare-primary hover:bg-momcare-dark min-w-[140px]" disabled={isCreatingTopic || isFormattingTopic || !newTopicTitle.trim() || !newTopicContent.trim() || isModerating}> {isModerating ? <><ShieldAlert className="mr-2 h-4 w-4 animate-pulse" /> Checking...</> : isCreatingTopic ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</> : "Create Topic"} </Button> </CardFooter>
                        </form>
                    </CardContent>
                </Card>
            )}

            {/* Topics List */}
            <div className="min-h-[300px]">
                {topicsLoading && topics.length === 0 && (<div className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin text-momcare-primary mx-auto" /></div>)}
                {topicsError && (<div className="text-center py-20 text-red-600 dark:text-red-400">{topicsError}</div>)}
                {!topicsLoading && !topicsError && topics.length === 0 && (<div className="text-center py-20 text-gray-500 dark:text-gray-400">{searchQuery || filterCategory !== 'All' ? 'No topics match your criteria.' : 'No topics found. Be the first to create one!'}</div>)}
                {topics.length > 0 && (<div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">{topics.map(topic => (<TopicListItem key={topic.$id} topic={topic} currentUserId={user?.$id || null} isAuthenticated={!!isAuthenticated} onVote={handleTopicVote} />))}</div>)}
                {!topicsLoading && topics.length > 0 && topics.length < topicsTotal && (<div className="text-center mt-6"><Button variant="outline" onClick={() => fetchTopics(topicsPage + 1, false)} disabled={topicsLoading}>Load More Topics ({topicsTotal - topics.length} remaining)</Button></div>)}
                {topicsLoading && topics.length > 0 && (<div className="text-center mt-6"><Loader2 className="h-6 w-6 animate-spin text-momcare-primary mx-auto" /></div>)}
            </div>
        </div>
    );

    const renderTopicDetail = () => (
        <div className="space-y-6">
            <Button variant="outline" onClick={() => navigate('/forum')} className="mb-4"> <ArrowLeft className="mr-2 h-4 w-4" /> Back to Topics </Button>
            {topicLoading && (<div className="text-center py-20"><Loader2 className="h-10 w-10 animate-spin text-momcare-primary mx-auto" /></div>)}
            {topicError && !topicLoading && (<Card className="border-destructive bg-red-50 dark:bg-red-900/20"><CardHeader><CardTitle className="text-destructive dark:text-red-400">Error Loading Topic</CardTitle></CardHeader><CardContent className="text-destructive/90 dark:text-red-400/90">{topicError}</CardContent></Card>)}
            {currentTopic && !topicLoading && (
                <Card className="border-momcare-primary/30 dark:border-gray-700 shadow-md">
                    <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-700">
                        <div className="flex justify-between items-start flex-wrap gap-2">
                            <div className="flex-grow min-w-0">
                                <CardTitle className="text-xl md:text-2xl font-bold text-momcare-dark dark:text-gray-100 flex items-center flex-wrap gap-2 break-words"> {currentTopic.isPinned && <Pin className="inline-block h-5 w-5 mr-1.5 text-momcare-accent flex-shrink-0" aria-label="Pinned" />} {currentTopic.isLocked && <Lock className="inline-block h-5 w-5 mr-1.5 text-gray-500 flex-shrink-0" aria-label="Locked" />} {currentTopic.title} </CardTitle>
                                <div className="mt-1 text-sm text-gray-600 dark:text-gray-400 flex items-center flex-wrap gap-x-3 gap-y-1"> <span>Started by <span className="font-medium hover:underline">{currentTopic.userName}</span> {formatRelativeTime(currentTopic.$createdAt)}</span> {currentTopic.category && <span><Badge variant="secondary">{currentTopic.category}</Badge></span>} <span>{currentTopic.replyCount || 0} replies</span> </div>
                            </div>
                            {isAuthenticated && user?.$id === currentTopic.userId && (<div className="flex gap-2 flex-shrink-0"> <Button variant="destructive" size="sm" onClick={() => handleDeleteTopicClick(currentTopic.$id)} disabled={isDeletingTopicConfirmed} title="Delete entire topic and all replies"><Trash2 className="mr-1 h-4 w-4" /> Delete Topic</Button> </div>)}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-4 pb-6">
                        {/* Original Post Content */}
                        <div className="flex space-x-3 py-4 px-2 border-b dark:border-gray-700">
                            <Avatar className="h-9 w-9 border flex-shrink-0 mt-1"> <AvatarImage src={currentTopic.userAvatarUrl || undefined} alt={currentTopic.userName} /> <AvatarFallback>{getInitials(currentTopic.userName)}</AvatarFallback> </Avatar>
                            <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-center mb-1 flex-wrap gap-x-2"> <span className="font-semibold text-sm text-gray-800 dark:text-gray-200 hover:underline">{currentTopic.userName} (OP)</span> <span className="text-xs text-gray-500 dark:text-gray-400" title={currentTopic.$createdAt ? new Date(currentTopic.$createdAt).toLocaleString() : ''}>{formatRelativeTime(currentTopic.$createdAt)}</span> </div>
                                {/* Render OP content using ReactMarkdown */}
                                <div className="prose prose-sm dark:prose-invert max-w-none mb-2 text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node, ...props }: AnchorProps) => (<a target="_blank" rel="noopener noreferrer" {...props} />) }}>{currentTopic.content}</ReactMarkdown>
                                </div>
                            </div>
                        </div>

                        {/* Replies Section */}
                        <div className="mt-6 mb-4 flex flex-col sm:flex-row justify-between items-center gap-3">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">Replies ({postsTotal})</h3>
                            <div className="relative w-full sm:w-auto sm:max-w-xs"> <Label htmlFor="search-posts" className="sr-only">Search Replies</Label> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" /> <Input id="search-posts" type="search" placeholder="Search replies..." value={postSearchQuery} onChange={(e) => setPostSearchQuery(e.target.value)} className="pl-10 h-9 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" /> {postSearchQuery && (<Button variant="ghost" size="icon" className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7" onClick={() => setPostSearchQuery('')}><X className="h-4 w-4 text-gray-400" /></Button>)} </div>
                        </div>
                        <div className="min-h-[150px]">
                            {postsLoading && posts.length === 0 && (<div className="text-center py-10"><Loader2 className="h-8 w-8 animate-spin text-momcare-primary mx-auto" /></div>)}
                            {postsError && (<div className="text-center py-10 text-red-600 dark:text-red-400">{postsError}</div>)}
                            {!postsLoading && !postsError && posts.length === 0 && (<div className="text-center py-10 text-gray-500 dark:text-gray-400">{postSearchQuery ? 'No replies match your search.' : 'No replies yet. Be the first to reply!'}</div>)}
                            {posts.length > 0 && (<div className="space-y-0">{posts.map(post => (<PostItem key={post.$id} post={post} currentUserId={user?.$id || null} isAuthenticated={!!isAuthenticated} onDelete={handleDeletePostClick} isDeleting={deletingPostId === post.$id && isDeletingPostConfirmed} onVote={handlePostVote} />))}</div>)}
                            {!postsLoading && posts.length > 0 && posts.length < postsTotal && (<div className="text-center mt-6"><Button variant="outline" onClick={() => fetchPosts(topicId!, postsPage + 1, false)} disabled={postsLoading}>Load More Replies ({postsTotal - posts.length} remaining)</Button></div>)}
                            {postsLoading && posts.length > 0 && (<div className="text-center mt-6"><Loader2 className="h-6 w-6 animate-spin text-momcare-primary mx-auto" /></div>)}
                        </div>

                        {/* Reply Form */}
                        {!currentTopic.isLocked ? (
                            <Card className="mt-8 bg-gray-50/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
                                <CardHeader><CardTitle className="text-base font-semibold">Post a Reply</CardTitle></CardHeader>
                                <CardContent>
                                    {isAuthenticated ? (
                                        <form onSubmit={handleReply} className="space-y-3">
                                            <div className="flex justify-between items-center mb-1"> <Label htmlFor="reply-content" className="sr-only">Reply Content</Label> <Button type="button" variant="outline" size="sm" onClick={handleFormatReplyContent} disabled={isFormattingReply || isReplying || !replyContent?.trim() || isModerating} title="Auto-format reply using AI" className="dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"> {isFormattingReply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-yellow-500" />} AI Format </Button> </div>
                                            <Textarea id="reply-content" value={replyContent} onChange={(e) => setReplyContent(e.target.value)} placeholder="Write your reply here... (Markdown supported)" required rows={4} disabled={isReplying || isFormattingReply || isModerating} className="min-h-[100px] dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600" />
                                            <div className="text-right"> <Button type="submit" className="bg-momcare-primary hover:bg-momcare-dark min-w-[130px]" disabled={isReplying || isFormattingReply || !replyContent.trim() || isModerating}> {isModerating ? <><ShieldAlert className="mr-2 h-4 w-4 animate-pulse" /> Checking...</> : isReplying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Posting...</> : <><Send className="mr-2 h-4 w-4" /> Post Reply</>} </Button> </div>
                                        </form>
                                    ) : (
                                        <div className="text-center text-sm text-gray-600 dark:text-gray-400"> Please <Link to={`/login?redirect=${location.pathname}`} className="text-momcare-primary font-semibold hover:underline">log in</Link> or <Link to={`/signup?redirect=${location.pathname}`} className="text-momcare-primary font-semibold hover:underline">sign up</Link> to reply. </div>
                                    )}
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="mt-8 text-center text-gray-600 bg-yellow-50 border border-yellow-200 p-4 rounded-md dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-700/30"> <Lock className="inline-block h-5 w-5 mr-2" /> This topic is locked. No new replies can be added. </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );

    return (
        <MainLayout requireAuth={false}> {/* Allow viewing forum logged out */}
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-6 md:py-8">
                {topicId ? renderTopicDetail() : renderTopicList()}
            </div>

            {/* Delete Post Dialog */}
            <AlertDialog open={showDeletePostDialog} onOpenChange={setShowDeletePostDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader> <AlertDialogTitle>Confirm Post Deletion</AlertDialogTitle> <AlertDialogDescription>Are you sure you want to delete this post? This action cannot be undone.</AlertDialogDescription> </AlertDialogHeader>
                    <AlertDialogFooter> <AlertDialogCancel onClick={() => setDeletingPostId(null)} disabled={isDeletingPostConfirmed}>Cancel</AlertDialogCancel> <AlertDialogAction onClick={confirmDeletePost} className="bg-destructive hover:bg-destructive/90" disabled={isDeletingPostConfirmed}> {isDeletingPostConfirmed ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Post"} </AlertDialogAction> </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete Topic Dialog */}
            <AlertDialog open={showDeleteTopicDialog} onOpenChange={setShowDeleteTopicDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader> <AlertDialogTitle>Confirm Topic Deletion</AlertDialogTitle> <AlertDialogDescription> Are you sure you want to delete this entire topic, including all its replies? This action cannot be undone. </AlertDialogDescription> </AlertDialogHeader>
                    <AlertDialogFooter> <AlertDialogCancel onClick={() => setDeletingTopicId(null)} disabled={isDeletingTopicConfirmed}>Cancel</AlertDialogCancel> <AlertDialogAction onClick={confirmDeleteTopic} className="bg-destructive hover:bg-destructive/90" disabled={isDeletingTopicConfirmed}> {isDeletingTopicConfirmed ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</> : "Delete Topic & Replies"} </AlertDialogAction> </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </MainLayout>
    );
};

export default ForumPage;