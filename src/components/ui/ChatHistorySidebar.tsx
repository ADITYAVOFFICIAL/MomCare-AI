// src/components/ui/ChatHistorySidebar.tsx
// Make sure to adjust import paths based on your project structure!

import React, { useState, useEffect, useCallback } from 'react';
import {
    getChatSessionsList,
    deleteChatSessionHistory,
    ChatSessionInfo
} from '@/lib/appwrite'; // Adjust path
import { useAuthStore } from '@/store/authStore'; // Adjust path
import { useIsMobile } from '@/hooks/use-mobile'; // Adjust path for the hook
import { ScrollArea } from '@/components/ui/scroll-area'; // Adjust path
import { Button } from '@/components/ui/button'; // Adjust path
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogClose
} from "@/components/ui/dialog"; // Adjust path
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"; // Adjust path
import {
    Loader2,
    MessageSquareText,
    ServerCrash,
    Trash2,
    AlertTriangle,
    History,
    MoreHorizontal, // Icon for mobile delete trigger
    X // Icon for close/cancel
} from 'lucide-react'; // Import icons
import { cn } from '@/lib/utils'; // Adjust path
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Adjust path
import { useToast } from '@/hooks/use-toast'; // Adjust path

// --- *** EXPORT the interface *** ---
export interface ChatHistorySidebarProps {
  /** Function to call when a session is selected */
  onSelectSession: (sessionId: string) => void;
  /** The ID of the currently active session, used for highlighting */
  currentSessionId: string | null;
  /** Optional additional CSS classes for the desktop sidebar container */
  className?: string;
  /** Optional callback triggered after a session is successfully deleted */
  onSessionDeleted?: (deletedSessionId: string) => void;
  /** --- *** ADD userId prop *** --- */
  userId: string; // Add this line
}

// Internal component for rendering a single session item (used in both desktop/mobile)
const SessionItemDisplay: React.FC<{ session: ChatSessionInfo }> = ({ session }) => (
    <div className="flex flex-col overflow-hidden">
        <span className="text-sm font-medium truncate" title={session.preview}>
            {session.preview || "Chat Session"}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
            {session.relativeDate}
        </span>
    </div>
);


const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  onSelectSession,
  currentSessionId,
  className,
  onSessionDeleted,
  userId, // Destructure the new prop
}) => {
  // const { user } = useAuthStore(); // Can use the userId prop directly now
  const { toast } = useToast();
  const isMobile = useIsMobile(); // Use the hook

  const [sessions, setSessions] = useState<ChatSessionInfo[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- Delete State ---
  const [sessionToDelete, setSessionToDelete] = useState<ChatSessionInfo | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  // --- End Delete State ---

  // State for mobile dropdown visibility
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const fetchSessions = useCallback(async () => {
    // Use the userId prop instead of relying on the store here
    if (!userId) {
      setIsLoading(false);
      setSessions([]);
      setError("User ID not provided."); // More specific error
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Pass the userId prop to the Appwrite function
      const sessionList = await getChatSessionsList(userId, 200);
      setSessions(sessionList);
    } catch (err) {
      console.error("Failed to fetch chat sessions:", err);
      setError("Could not load chat history.");
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
    // Depend on the userId prop
  }, [userId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSessionClick = (sessionId: string) => {
    onSelectSession(sessionId);
    setIsDropdownOpen(false); // Close dropdown on selection
  };

  const handleDeleteClick = (session: ChatSessionInfo, event?: React.MouseEvent) => {
    event?.stopPropagation(); // Prevent triggering session selection or closing dropdown
    setSessionToDelete(session);
    setShowDeleteConfirm(true);
    setIsDropdownOpen(false); // Close dropdown when opening dialog
  };

  const confirmDeleteSession = async () => {
    // Use the userId prop
    if (!sessionToDelete || !userId) return;
    setIsDeleting(true);
    setError(null);
    try {
      // Pass the userId prop to the Appwrite function
      const result = await deleteChatSessionHistory(userId, sessionToDelete.sessionId);
      if (result.success && result.failedCount === 0) {
        toast({ title: "Session Deleted", description: `Chat history removed. (${result.deletedCount} messages)` });
        setSessions(prev => prev.filter(s => s.sessionId !== sessionToDelete.sessionId));
        // Call onSessionDeleted if the deleted session was the active one
        if (onSessionDeleted && sessionToDelete.sessionId === currentSessionId) {
          onSessionDeleted(sessionToDelete.sessionId);
        } else if (onSessionDeleted && sessionToDelete.sessionId !== currentSessionId) {
            // Optional: If you need to trigger a refresh even if a non-active session is deleted
            // onSessionDeleted(sessionToDelete.sessionId); // Uncomment if needed
        }
      } else {
         const description = `Deletion issue: ${result.failedCount} failed, ${result.deletedCount} succeeded. History may be partially deleted.`;
         toast({ title: "Deletion Issue", description: description, variant: "destructive", duration: 8000 });
         fetchSessions(); // Refetch to get consistent state
      }
    } catch (err) {
      console.error("Error deleting chat session:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown deletion error.";
      setError(`Deletion failed: ${errorMsg}`);
      toast({ title: "Deletion Failed", description: errorMsg, variant: "destructive" });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setSessionToDelete(null);
    }
  };

  // --- Common Content Renderer (Loading/Error/Empty/List) ---
  const renderContent = (isInsideDropdown: boolean = false) => {
    if (isLoading) {
      return (
        <div className={cn("flex items-center justify-center py-6 text-gray-500 dark:text-gray-400", isInsideDropdown ? "px-4 text-sm" : "text-base")}>
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          <span>Loading History...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className={cn("flex flex-col items-center text-center py-6 px-4 text-red-600 dark:text-red-400", isInsideDropdown ? "text-sm" : "")}>
           <ServerCrash className={cn("mb-2 opacity-75", isInsideDropdown ? "h-6 w-6" : "h-8 w-8")} />
           <span className="font-medium">Error Loading History</span>
           <p className="text-xs mt-1">{error}</p>
           {!isInsideDropdown && ( // Only show retry button in sidebar
             <Button variant="outline" size="sm" className="mt-4" onClick={fetchSessions}>
                Retry
             </Button>
           )}
        </div>
      );
    }

    if (sessions.length === 0) {
      return (
        <div className={cn("text-center py-6 px-4 text-gray-500 dark:text-gray-400", isInsideDropdown ? "text-sm" : "")}>
          <MessageSquareText className={cn("mx-auto mb-2 opacity-75", isInsideDropdown ? "h-6 w-6" : "h-8 w-8")} />
          <p className="font-medium">No Past Chats</p>
          <p className="text-xs mt-1">Start a new chat to see history here.</p>
        </div>
      );
    }

    // Render Session List
    return sessions.map((session) => {
      const isActive = currentSessionId === session.sessionId;
      const isItemBeingDeleted = isDeleting && sessionToDelete?.sessionId === session.sessionId;

      if (isInsideDropdown) {
        return (
          <DropdownMenuItem
            key={session.sessionId}
            className={cn(
              "flex justify-between items-center cursor-pointer data-[highlighted]:bg-gray-100 dark:data-[highlighted]:bg-gray-800", // Standard dropdown highlight
              isActive && "bg-momcare-primary/10 text-momcare-primary dark:bg-momcare-primary/20 dark:text-momcare-light" // Active style
            )}
            onSelect={(e) => {
                // Prevent selection if delete button was clicked
                if ((e.target as HTMLElement).closest('[data-delete-button]')) {
                    e.preventDefault();
                    return;
                }
                handleSessionClick(session.sessionId);
            }}
            disabled={isItemBeingDeleted}
          >
            <SessionItemDisplay session={session} />
            {/* Mobile Delete Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/20 rounded-full ml-2 shrink-0"
              onClick={(e) => handleDeleteClick(session, e)}
              disabled={isItemBeingDeleted}
              aria-label="Delete session"
              data-delete-button // Add attribute to identify the delete button
            >
              {isItemBeingDeleted ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </DropdownMenuItem>
        );
      } else {
        // Desktop Session Item
        return (
          <div key={session.sessionId} className="flex items-center group relative rounded-md">
            <Tooltip>
              <TooltipTrigger asChild>
                {/* Button takes full width minus space for delete icon */}
                <Button
                  variant={'ghost'}
                  className={cn(
                    "flex-1 min-w-0 w-full justify-start h-auto py-2 pl-3 pr-8 text-left rounded-md transition-colors duration-150", // Added pr-8 for delete btn space
                    "hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-momcare-dark ",
                    isActive
                      ? "bg-momcare-primary/10 text-momcare-primary hover:bg-momcare-primary/15 dark:bg-momcare-primary/20 dark:text-momcare-light dark:hover:bg-momcare-primary/25"
                      : "text-gray-700 dark:text-gray-300",
                    isItemBeingDeleted && "opacity-50 cursor-not-allowed" // Style if being deleted
                  )}
                  onClick={() => handleSessionClick(session.sessionId)}
                  disabled={isItemBeingDeleted}
                >
                  <SessionItemDisplay session={session} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={5}>
                <p className="text-xs">Session ID: ...{session.sessionId.slice(-6)}</p>
                <p className="text-xs">Started: {new Date(session.firstMessageTimestamp).toLocaleString()}</p>
                <p className="text-xs">Messages: {session.messageCount}</p>
              </TooltipContent>
            </Tooltip>

            {/* Desktop Delete Button */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-7 w-7 p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400",
                      "hover:bg-red-500/10 dark:hover:bg-red-500/20",
                      "transition-opacity shrink-0 rounded-full" // Ensure transition applies
                    )}
                    onClick={(e) => handleDeleteClick(session, e)}
                    disabled={isItemBeingDeleted}
                    aria-label="Delete session"
                  >
                    {isItemBeingDeleted ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={5}>
                  Delete History
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        );
      }
    });
  };


  // --- Render Logic ---

  // Avoid rendering during SSR or initial hydration mismatch
  if (isMobile === undefined) {
    return null; // Or a placeholder/skeleton if preferred
  }

  // --- Mobile View: Dropdown Menu ---
  if (isMobile) {
    return (
      <>
        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="fixed top-[calc(env(safe-area-inset-top,0px)+12px)] left-4 z-50 h-9 w-9 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 shadow-sm md:hidden" // Position fixed for mobile, hide on md+
              aria-label="Open Chat History"
            >
              <History className="h-5 w-5 text-momcare-primary" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-72" align="start">
            <DropdownMenuLabel className="flex items-center">
                <History className="h-4 w-4 mr-2 text-momcare-primary" />
                Chat History
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                {/* Render loading/error/empty/list inside dropdown */}
                {renderContent(true)}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Render Delete Confirmation Dialog (needed for mobile too) */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          {/* Dialog Content remains the same */}
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600 dark:text-red-400">
                 <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" /> Delete Chat History?
              </DialogTitle>
              <DialogDescription className="mt-2">
                Permanently delete all messages ({sessionToDelete?.messageCount}) for:
                <strong className="block my-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-200 truncate">
                    "{sessionToDelete?.preview || 'this session'}"
                </strong>
                 (From {sessionToDelete?.relativeDate}). This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <DialogClose asChild>
                 <Button variant="outline" disabled={isDeleting}>Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={confirmDeleteSession}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // --- Desktop View: Sidebar ---
  return (
    <TooltipProvider delayDuration={100}>
      <div className={cn(
        "h-full flex-col bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700",
        "hidden md:flex md:w-84 md:border-r", // Show only on md+
        "flex-shrink-0",
        className
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-lg font-semibold text-momcare-primary flex items-center">
            <History className="h-5 w-5 mr-2" />
            Chat History
          </h2>
          {/* Optional: Add a refresh button */}
          {/* <Tooltip>
             <TooltipTrigger asChild>
               <Button variant="ghost" size="icon" onClick={fetchSessions} disabled={isLoading} className="h-7 w-7 p-1 text-gray-500 hover:text-momcare-primary">
                 {isLoading ? <Loader2 className="h-4 w-4 animate-spin"/> : <RefreshCw className="h-4 w-4"/>}
               </Button>
             </TooltipTrigger>
             <TooltipContent side="bottom">Refresh History</TooltipContent>
           </Tooltip> */}
        </div>

        {/* Session List Area */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {/* Render loading/error/empty/list */}
            {renderContent(false)}
          </div>
        </ScrollArea>

        {/* Delete Confirmation Dialog (needed for desktop too) */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
           {/* Dialog Content remains the same */}
           <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center text-red-600 dark:text-red-400">
                 <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" /> Delete Chat History?
              </DialogTitle>
              <DialogDescription className="mt-2">
                Permanently delete all messages ({sessionToDelete?.messageCount}) for:
                <strong className="block my-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-200 truncate">
                    "{sessionToDelete?.preview || 'this session'}"
                </strong>
                 (From {sessionToDelete?.relativeDate}). This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
             <DialogFooter className="mt-4 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <DialogClose asChild>
                 <Button variant="outline" disabled={isDeleting}>Cancel</Button>
              </DialogClose>
              <Button
                variant="destructive"
                onClick={confirmDeleteSession}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete Permanently
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </TooltipProvider>
  );
};

export default ChatHistorySidebar;