import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  ClassAttributes,
  AnchorHTMLAttributes,
  useMemo,
  ChangeEvent,
  ElementType, // Added for icon type in starters
} from 'react';
import { useNavigate } from 'react-router-dom';
import { format, isAfter, parseISO } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { jsPDF } from "jspdf";
import html2canvas from 'html2canvas';
import { v4 as uuidv4 } from 'uuid';

// --- UI Imports ---
import MainLayout from '@/components/layout/MainLayout';
import ChatHistorySidebar, { ChatHistorySidebarProps } from '@/components/chat/ChatHistorySidebar'; // Assume props are defined here
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Added Select
import { useToast } from '@/hooks/use-toast';
import {
  Send, Loader2, User, Bot, RefreshCw, Sparkles, Trash2,
  Mic, Bookmark, Share2, ImagePlus, AlertTriangle, X,
  Calendar, Stethoscope, Heart, Droplet, WeightIcon
} from 'lucide-react';

// --- Appwrite Imports ---
import {
  getUserProfile, UserProfile, getBloodPressureReadings, getBloodSugarReadings,
  getWeightReadings, getUserAppointments, BloodPressureReading, BloodSugarReading,
  WeightReading, Appointment,
  saveChatMessage, getUserChatHistoryForSession, ChatHistoryMessage, // Assume ChatHistoryMessage has role: 'user' | 'model' | 'system' or similar
  addBookmark, // Removed CreateBookmarkData if not explicitly used
  deleteChatSessionHistory,
  getChatSessionsList, // Assume this returns ChatSessionInfo[] or similar
} from '@/lib/appwrite'; // Ensure paths are correct

// --- Groq Imports ---
import groqService, {
  UserPreferences, AdditionalChatContext,
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
  ImageContentPart,
  Groq // Import Groq namespace for types like Groq.Chat.Completions...
} from '@/lib/groq'; // Ensure path is correct
import { useAuthStore } from '@/store/authStore';

// --- Type Definitions ---
type AnchorProps = ClassAttributes<HTMLAnchorElement> & AnchorHTMLAttributes<HTMLAnchorElement> & { node?: any };

// --- Fix for TS2687: Add readonly modifier for consistency ---
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
  class SpeechRecognition extends EventTarget {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    maxAlternatives: number;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    start(): void;
    stop(): void;
    abort(): void;
  }
  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList;
    readonly resultIndex: number;
  }
  interface SpeechRecognitionResultList {
    readonly length: number; // Fix TS2687
    item(index: number): SpeechRecognitionResult;
    [index: number]: SpeechRecognitionResult;
  }
  interface SpeechRecognitionResult {
    readonly isFinal: boolean; // Fix TS2687
    readonly length: number; // Fix TS2687
    item(index: number): SpeechRecognitionAlternative;
    [index: number]: SpeechRecognitionAlternative;
  }
  interface SpeechRecognitionAlternative {
    readonly transcript: string; // Fix TS2687
    readonly confidence: number; // Fix TS2687
  }
  interface SpeechRecognitionErrorEvent extends Event {
    error: string; // Typically readonly, but keeping as string for broader compatibility
    message: string; // Typically readonly
  }
}

export interface ChatMessagePart {
  type: 'text' | 'image';
  content: string;
  alt?: string;
}

// UI Message type - Ensure role is strictly 'user' or 'model'
export interface ChatUIMessage {
  role: 'user' | 'model';
  parts: ChatMessagePart[];
}

// --- Helper Functions (Defined Before Component) ---

const parseAppointmentDateTime = (app: Appointment): Date | null => {
    if (!app?.date) return null;
    try {
      let parsedDate = parseISO(app.date);
      if (!isNaN(parsedDate.getTime())) {
          // If date string already includes time (ISO format), use it directly
          if (app.date.includes('T')) return parsedDate;
      } else {
          // If date is just YYYY-MM-DD, try parsing as such (assuming UTC)
          const dateString = `${app.date}T00:00:00Z`;
          parsedDate = parseISO(dateString);
          if (isNaN(parsedDate.getTime())) return null; // Invalid date format
      }

      // If time field exists, try to parse and combine it (assuming local time related to the date)
      if (app.time) {
          // More robust time parsing (HH:mm, h:mm AM/PM)
          const timeMatch = app.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
          if (timeMatch) {
              let h = parseInt(timeMatch[1], 10);
              const m = parseInt(timeMatch[2], 10);
              const p = timeMatch[3]?.toUpperCase();
              if (!isNaN(h) && !isNaN(m) && m >= 0 && m <= 59) {
                  let validHour = false;
                  if (p) { // AM/PM format
                      if (h >= 1 && h <= 12) {
                          if (p === 'PM' && h !== 12) h += 12;
                          if (p === 'AM' && h === 12) h = 0; // Midnight case
                          validHour = true;
                      }
                  } else if (h >= 0 && h <= 23) { // 24-hour format
                      validHour = true;
                  }

                  if (validHour) {
                      // Combine the parsed date (UTC midnight) with the parsed time (local)
                      // This assumes the time is relative to the date's day in the *local* timezone
                      // For consistency, it might be better to store combined ISO strings in Appwrite
                      const combined = new Date(
                          parsedDate.getUTCFullYear(),
                          parsedDate.getUTCMonth(),
                          parsedDate.getUTCDate(),
                          h, m
                      );
                      // Check if the combined date is valid
                      if (!isNaN(combined.getTime())) return combined;
                  }
              }
          }
      }
      // If only date was valid, return it (represents start of the day UTC)
      return parsedDate;
    } catch (error) {
      // console.error('Appt parse error:', app.date, app.time, error);
      return null; // Return null on any parsing error
    }
};

// Extracts recent user messages as potential context
const extractCommonConcerns = (chatHistory: ChatHistoryMessage[]): string[] => {
  if (!chatHistory) return [];
  // Filter for user messages with non-empty content, take last 5, extract content
  return chatHistory
      .filter(m => m.role === 'user' && m.content?.trim())
      .slice(-5) // Get the 5 most recent user messages
      .map(m => m.content || '') // Extract content, default to empty string if null/undefined
      .filter(content => content.length > 10); // Filter out very short messages
};

// Calculates trimester based on weeks pregnant
const calculateTrimester = (weeks: number | undefined | null): 1 | 2 | 3 | null => {
  if (weeks === undefined || weeks === null || isNaN(weeks) || weeks < 0) return null;
  if (weeks <= 13) return 1;
  if (weeks <= 27) return 2;
  if (weeks <= 45) return 3; // Allow up to 45 for buffer
  return null; // Weeks outside expected range
};

// Formats Appwrite history (ChatHistoryMessage[]) for Groq API (ChatCompletionMessageParam[])
const formatHistoryForGroq = (history: ChatHistoryMessage[]): ChatCompletionMessageParam[] => {
    return history.map(msg => {
      const contentValue: string = msg.content || ""; // Ensure content is a string
      // Map Appwrite role ('user'/'model') to Groq role ('user'/'assistant')
      const role = msg.role === 'model' ? 'assistant' : 'user';
      // Assuming content is always text for now. Image handling might need adjustments
      // if Appwrite stores image references differently.
      return { role: role, content: contentValue } as ChatCompletionMessageParam;
    }).filter(msg => msg.content); // Filter out messages with empty content
};

// Formats Appwrite history (ChatHistoryMessage[]) for UI display (ChatUIMessage[])
// --- Fix for TS2322: Ensure role is correctly typed ---
const formatHistoryForUI = (history: ChatHistoryMessage[]): ChatUIMessage[] => {
    return history
      .map((msg): ChatUIMessage | null => { // Return null for invalid messages
        const content = msg.content || "[Empty Content]";
        // TODO: Implement logic to detect if 'content' represents an image (e.g., URL, special marker)
        const part: ChatMessagePart = { type: 'text', content: content };

        // --- Fix for TS2322: Explicitly map role and ensure it's valid ---
        let role: 'user' | 'model' | null = null;
        if (msg.role === 'user') {
          role = 'user';
        } else if (msg.role === 'model') {
          role = 'model';
        } else {
          // console.warn(`Invalid role encountered in history: ${msg.role}. Skipping message.`);
          return null; // Skip messages with roles other than user/model
        }

        return { role: role, parts: [part] };
      })
      .filter((msg): msg is ChatUIMessage =>
          msg !== null && msg.parts.some(p => p.content.trim()) // Ensure msg is not null and has content
      );
};

// Formats Groq API messages (ChatCompletionMessageParam[]) for UI display (ChatUIMessage[])
const formatGroqMessagesForUI = (groqMessages: ChatCompletionMessageParam[]): ChatUIMessage[] => {
    return groqMessages
      .map((gm): ChatUIMessage | null => { // Return null for invalid messages
        const uiParts: ChatMessagePart[] = [];

        // Handle different content types from Groq
        if (typeof gm.content === 'string') {
          uiParts.push({ type: 'text', content: gm.content });
        } else if (Array.isArray(gm.content)) {
          // Iterate through content parts (text or image_url)
          (gm.content as ChatCompletionContentPart[]).forEach(part => {
            if (part.type === 'text') {
              uiParts.push({ type: 'text', content: part.text });
            } else if (part.type === 'image_url') {
              // Represent image sent to API as text in UI for initial messages
              uiParts.push({ type: 'text', content: '[Image Content Sent]' });
              // If you store the base64/URL used, you could potentially display it:
              // uiParts.push({ type: 'image', content: part.image_url.url, alt: 'Sent Image' });
            } else {
              // Handle potential future content part types
               uiParts.push({ type: 'text', content: '[Unknown Part Type]' });
            }
          });
        } else if (gm.content === null) {
          // Handle null content (e.g., if AI finishes without response)
          uiParts.push({ type: 'text', content: '[AI response content was empty]' });
        } else {
          // Handle unexpected content format
          uiParts.push({ type: 'text', content: '[Invalid Content Format Received]' });
        }

        // Ensure we have at least one part, even if empty (though filtering should catch this)
        if (uiParts.length === 0) {
            uiParts.push({type: 'text', content: '[Empty Message Structure]'});
        }

        // Map Groq role ('assistant'/'user') to UI role ('model'/'user')
        let role: 'user' | 'model' | null = null;
        if (gm.role === 'user') {
            role = 'user';
        } else if (gm.role === 'assistant') {
            role = 'model';
        } else if (gm.role === 'system') {
            return null; // Don't display system messages in the UI
        } else {
            //  console.warn(`Invalid role from Groq message: ${gm.role}. Skipping.`);
             return null;
        }

        return { role: role, parts: uiParts };
      })
      .filter((msg): msg is ChatUIMessage =>
          msg !== null && msg.parts.some(p => p.content.trim()) // Ensure msg is not null and has content
      );
};

// Extracts text content from a Groq message, representing images as placeholders
const getTextContentFromMessage = (msg: ChatCompletionMessageParam): string | null => {
    if (typeof msg.content === 'string') {
      return msg.content.trim() || null; // Return null if only whitespace
    } else if (Array.isArray(msg.content)) {
      // Extract text parts
      const textParts = msg.content
        .filter((part): part is Groq.Chat.Completions.ChatCompletionContentPartText => part.type === 'text')
        .map(part => part.text)
        .join(' ');
      // Create placeholders for image parts
      const imageParts = msg.content
        .filter(part => part.type === 'image_url')
        .map((part, index) => `[Image ${index + 1}]`); // Placeholder like "[Image 1]"
      // Combine text and image placeholders
      const combined = [textParts, ...imageParts].filter(Boolean).join(' ');
      return combined.trim() || null; // Return null if combined result is empty
    }
    // Return null if content is neither string nor array (or is null)
    return null;
};

// --- Component Definition Starts Here ---

const ChatPage: React.FC = () => {
  // --- Component State ---
  const [showPreChat, setShowPreChat] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false); // General loading (sending msg, loading history)
  const [isStartingChat, setIsStartingChat] = useState<boolean>(false); // Specific loading for starting a new chat
  const [isContextLoading, setIsContextLoading] = useState<boolean>(true); // Loading initial user profile/data
  const [chatHistoryForApi, setChatHistoryForApi] = useState<ChatCompletionMessageParam[]>([]); // Holds full history for Groq API
  const [messages, setMessages] = useState<ChatUIMessage[]>([]); // Holds messages formatted for UI display
  const [inputMessage, setInputMessage] = useState<string>('');
  const [streamingResponse, setStreamingResponse] = useState<string>(''); // Holds incoming streaming text
  const [error, setError] = useState<string | null>(null); // Stores error messages for display
  const { toast } = useToast();
  const { user, isAuthenticated } = useAuthStore(); // Get user auth state from Zustand store
  const navigate = useNavigate();
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null); // ID of the active chat session

  // --- Pre-Chat Form State ---
  const [feeling, setFeeling] = useState<string>(''); // Dropdown selection
  const [age, setAge] = useState<string>('');
  const [weeksPregnant, setWeeksPregnant] = useState<string>('');
  const [preExistingConditions, setPreExistingConditions] = useState<string>('');
  const [specificConcerns, setSpecificConcerns] = useState<string>('');

  // --- User Context State (Fetched from Appwrite) ---
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [latestBp, setLatestBp] = useState<BloodPressureReading | null>(null);
  const [latestSugar, setLatestSugar] = useState<BloodSugarReading | null>(null);
  const [latestWeight, setLatestWeight] = useState<WeightReading | null>(null);
  const [upcomingAppointments, setUpcomingAppointments] = useState<(Appointment & { dateTime?: Date | null })[]>([]);
  const [pregnancyTrimester, setPregnancyTrimester] = useState<1 | 2 | 3 | null>(null); // Derived from weeksPregnant
  const [chatStartWeeksPregnant, setChatStartWeeksPregnant] = useState<number | undefined>(undefined); // Weeks pregnant at the start of the current session

  // --- Feature State ---
  const [isRecording, setIsRecording] = useState<boolean>(false); // Voice input active
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false); // PDF export in progress
  const [showPdfConfirm, setShowPdfConfirm] = useState<boolean>(false); // PDF confirmation dialog visibility
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null); // Image file staged for upload
  const [pendingImagePreviewUrl, setPendingImagePreviewUrl] = useState<string | null>(null); // URL for image preview

  // --- Refs ---
  const messagesEndRef = useRef<HTMLDivElement>(null); // Ref to scroll to bottom of messages
  const imageInputRef = useRef<HTMLInputElement>(null); // Ref for hidden file input
  const recognitionRef = useRef<SpeechRecognition | null>(null); // Ref for SpeechRecognition instance
  const chatContainerRef = useRef<HTMLDivElement>(null); // Ref for the chat message container (for PDF export)

  // --- Constants ---
   const feelingOptions = [
     "Good", "Okay", "Tired", "Anxious", "Excited", "Nauseous", "Uncomfortable", "Other (Specify in concerns)"
   ];

  // --- Fetch Initial Context ---
  const fetchInitialContext = useCallback(async () => {
    if (!user?.$id) {
      setIsContextLoading(false);
      return; // No user logged in
    }
    setIsContextLoading(true);
    setError(null); // Clear previous errors
    // Reset context state before fetching
    setUserProfile(null); setLatestBp(null); setLatestSugar(null); setLatestWeight(null); setUpcomingAppointments([]); setPregnancyTrimester(null); setAge(''); setWeeksPregnant(''); setPreExistingConditions('');

    try {
      // Fetch user data concurrently
      const [profile, bpReadings, sugarReadings, weightReadings, appointments] = await Promise.all([
        getUserProfile(user.$id),
        getBloodPressureReadings(user.$id, 1), // Fetch latest 1 reading
        getBloodSugarReadings(user.$id, 1),
        getWeightReadings(user.$id, 1),
        getUserAppointments(user.$id)
      ]);

      // Update state with fetched data
      setUserProfile(profile);
      setLatestBp(bpReadings?.[0] || null);
      setLatestSugar(sugarReadings?.[0] || null);
      setLatestWeight(weightReadings?.[0] || null);

      // Process appointments: parse dates, filter future, sort upcoming
      const now = new Date();
      const processedAppointments = appointments
        .map(app => ({ ...app, dateTime: parseAppointmentDateTime(app) })) // Add parsed dateTime
        .filter((app): app is Appointment & { dateTime: Date } => // Type guard for valid future dates
            app.dateTime instanceof Date && !isNaN(app.dateTime.getTime()) && isAfter(app.dateTime, now)
        )
        .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime()); // Sort by date ascending

      setUpcomingAppointments(processedAppointments.slice(0, 3)); // Keep top 3 upcoming
      setPregnancyTrimester(calculateTrimester(profile?.weeksPregnant));

      // Pre-fill form fields from profile if available
      if (profile?.age) setAge(String(profile.age));
      // Only set weeksPregnant if it wasn't manually entered in the form yet for this session attempt
      if (profile?.weeksPregnant !== undefined && !weeksPregnant) setWeeksPregnant(String(profile.weeksPregnant));
      if (profile?.preExistingConditions) setPreExistingConditions(profile.preExistingConditions);

    } catch (error: unknown) {
      // console.error("Error fetching context:", error);
      const errorMsg = error instanceof Error ? error.message : "Could not load your profile and health data.";
      setError(errorMsg); // Set error state for potential display
      toast({ title: "Context Error", description: errorMsg, variant: "destructive" });
      // Ensure state is reset on error
      setUserProfile(null); setLatestBp(null); setLatestSugar(null); setLatestWeight(null); setUpcomingAppointments([]); setPregnancyTrimester(null);
    } finally {
      setIsContextLoading(false); // Ensure loading state is turned off
    }
  }, [user?.$id, toast]); // Include weeksPregnant dependency to avoid overwriting manual entry

  // --- Effects ---

  // Fetch context when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user?.$id) {
      fetchInitialContext();
    } else if (isAuthenticated === false) {
      // Reset component state if user logs out
      setShowPreChat(true);
      setMessages([]);
      setChatHistoryForApi([]);
      setCurrentSessionId(null);
      setUserProfile(null);
      setIsContextLoading(false); // No context to load if logged out
      setError(null);
      // Reset pre-chat form fields
      setFeeling(''); setAge(''); setWeeksPregnant(''); setPreExistingConditions(''); setSpecificConcerns('');
    }
    // Exclude navigate from deps: fetch only depends on auth state/user ID
  }, [fetchInitialContext, isAuthenticated, user?.$id]);

  // Scroll to bottom when messages or streaming response update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingResponse]);

  // Create/revoke object URL for image preview
  useEffect(() => {
    let objectUrl: string | null = null;
    if (pendingImageFile) {
      objectUrl = URL.createObjectURL(pendingImageFile);
      setPendingImagePreviewUrl(objectUrl);
    } else {
      setPendingImagePreviewUrl(null); // Clear preview if file is removed
    }
    // Cleanup function: revoke URL when component unmounts or file changes
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [pendingImageFile]);

  // Cleanup Speech Recognition on component unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort(); // Stop recognition
        recognitionRef.current = null; // Clear ref
        // console.log("Speech recognition aborted on unmount.");
      }
    };
  }, []);


  // --- Start NEW Chat Handler ---
  const handleStartChat = useCallback(async () => {
    // Validation
    if (!feeling) { // Check if feeling is selected from dropdown
        toast({ title: "Feeling Required", description: "Please select how you're feeling.", variant: "destructive" }); return;
    }
    const ageNum = parseInt(age, 10);
    if (!age || isNaN(ageNum) || ageNum <= 10 || ageNum > 99) { // Adjusted age range slightly
        toast({ title: "Valid Age Required", description: "Please enter a valid age (11-99).", variant: "destructive" }); return;
    }
    const formWeeksNum = weeksPregnant ? parseInt(weeksPregnant, 10) : undefined;
    if (weeksPregnant && (isNaN(formWeeksNum as number) || (formWeeksNum as number) < 0 || (formWeeksNum as number) > 45)) {
        toast({ title: "Invalid Weeks", description: "Weeks pregnant must be between 0 and 45.", variant: "destructive" }); return;
    }
    if (!user?.$id) {
        toast({ title: "Authentication Error", description: "Please log in to start a chat.", variant: "destructive" });
        navigate('/login'); // Redirect to login if not authenticated
        return;
    }

    setIsStartingChat(true);
    setError(null);
    setMessages([]); // Clear UI messages
    setChatHistoryForApi([]); // Clear previous API history
    const newSessionId = uuidv4(); // Generate a unique ID for the new session
    setCurrentSessionId(newSessionId);

    // Determine effective weeks pregnant for this chat session (form input overrides profile)
    const effectiveWeeks = !isNaN(formWeeksNum as number) ? formWeeksNum : userProfile?.weeksPregnant;
    setChatStartWeeksPregnant(effectiveWeeks); // Store the weeks used at the start of this chat
    setPregnancyTrimester(calculateTrimester(effectiveWeeks)); // Update trimester based on start weeks

    try {
      // Prepare data for Groq service
      const userPrefs: UserPreferences = {
        feeling: feeling.trim(), // Use selected feeling
        age: ageNum,
        weeksPregnant: effectiveWeeks,
        preExistingConditions: preExistingConditions.trim() || undefined,
        specificConcerns: specificConcerns.trim() || undefined
      };
      const additionalContext: AdditionalChatContext = {
        latestBp: latestBp,
        latestSugar: latestSugar,
        latestWeight: latestWeight,
        upcomingAppointments: upcomingAppointments,
        previousConcerns: [] // No previous concerns for a new chat session
      };

      // Get initial messages (system prompt + initial user/assistant exchange) from Groq service
      const initialApiMessages = groqService.startChat(userPrefs, userProfile, additionalContext);
      setChatHistoryForApi(initialApiMessages); // Store the full history (including system prompt)

      // Format messages for UI display (excluding system message)
      const formattedInitialUiMessages = formatGroqMessagesForUI(
        initialApiMessages.filter(m => m.role === 'user' || m.role === 'assistant')
      );
      setMessages(formattedInitialUiMessages); // Update UI state
      setShowPreChat(false); // Hide pre-chat form, show chat interface

      // console.log("Saving initial messages for new session:", newSessionId);
      // Save user and initial assistant message to Appwrite DB asynchronously
      for (const msg of initialApiMessages) {
        const contentToSave = getTextContentFromMessage(msg);
        // Save only user and assistant messages with actual content
        if (contentToSave && (msg.role === 'user' || msg.role === 'assistant')) {
          try {
            await saveChatMessage(
              user.$id,
              msg.role === 'assistant' ? 'model' : 'user', // Map role correctly ('assistant' -> 'model')
              contentToSave,
              newSessionId
            );
          } catch (saveError) {
            // console.error(`Failed to save initial ${msg.role} message to DB:`, saveError);
            // Non-critical error, maybe just log or show mild toast
            toast({ title: "History Save Warning", description: `Could not save initial ${msg.role} message.`, variant: "default" }); // Fix TS2322: Changed "warning" to "default"
          }
        }
      }
      // console.log("Initial messages saved to DB.");

    } catch (error: unknown) {
      // console.error("Error starting chat:", error);
      const errorMsg = error instanceof Error ? error.message : "An unknown error occurred while starting the chat.";
      setError(errorMsg); // Display error
      toast({ title: "Chat Start Failed", description: errorMsg, variant: "destructive" });
      setCurrentSessionId(null); // Reset session ID on failure
      setChatHistoryForApi([]); // Clear history state on failure
      setShowPreChat(true); // Go back to pre-chat form
    } finally {
      setIsStartingChat(false); // Ensure loading state is turned off
    }
  }, [
      feeling, age, weeksPregnant, preExistingConditions, specificConcerns, // Form inputs
      user?.$id, userProfile, // User context
      latestBp, latestSugar, latestWeight, upcomingAppointments, // Health context
      toast, navigate // Utilities
      // State setters (setIsStartingChat, setError, etc.) are implicitly dependencies
  ]);


  // --- Send Message Handler (Streaming) ---
  const handleSendMessage = useCallback(async (messageToSendOverride?: string) => {
    const messageText = (messageToSendOverride || inputMessage).trim();
    // Check if there's text or an image to send
    if (!messageText && !pendingImageFile) {
        toast({ title: "Nothing to send", description:"Type a message or attach an image.", variant: "default" }); return;
    }
    // Prevent sending if already loading, not logged in, no session, or history is missing
    if (isLoading || !user?.$id || !currentSessionId || chatHistoryForApi.length === 0) {
        if (!currentSessionId) setError("Error: No active chat session found.");
        if (chatHistoryForApi.length === 0) setError("Error: Chat history is missing. Please restart.");
        // console.warn("Send message prevented:", { isLoading, userId: user?.$id, currentSessionId, historyLength: chatHistoryForApi.length });
        return;
    }
    // Stop voice recording if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsLoading(true); // Set loading state
    setError(null); // Clear previous errors
    setStreamingResponse(''); // Clear previous streaming response
    const uiMessageParts: ChatMessagePart[] = []; // Parts for the UI message
    const apiMessageParts: ChatCompletionContentPart[] = []; // Parts for the API message
    let imageApiPart: ImageContentPart | null = null; // To hold processed image data

    // 1. Process Image (if attached)
    if (pendingImageFile && pendingImagePreviewUrl) {
      try {
        // Convert file to the format Groq API expects
        imageApiPart = await groqService.fileToApiImagePart(pendingImageFile);
        apiMessageParts.push(imageApiPart); // Add to API parts
        // Add image part for UI display (using preview URL)
        uiMessageParts.push({ type: 'image', content: pendingImagePreviewUrl, alt: pendingImageFile.name });
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Could not process the attached image.";
        toast({ title: "Image Error", description: errorMsg, variant: "destructive" });
        setError(`Failed to process image: ${errorMsg}`);
        setIsLoading(false); setPendingImageFile(null); return; // Stop if image processing fails
      }
    }

    // 2. Process Text (if provided)
    if (messageText) {
      uiMessageParts.push({ type: 'text', content: messageText }); // Add text part for UI
      apiMessageParts.push({ type: 'text', text: messageText }); // Add text part for API
    }

    // Should not happen due to initial check, but safety first
    if (apiMessageParts.length === 0) { setIsLoading(false); return; }

    // 3. Prepare User Message and Update History
    const userMessageForUi: ChatUIMessage = { role: 'user', parts: uiMessageParts };
    // Create the user message object for the Groq API
    const newUserApiMessage: ChatCompletionMessageParam = { role: 'user', content: apiMessageParts };

    // Add user message to UI immediately for responsiveness
    setMessages(prev => [...prev, userMessageForUi]);

    // Update the main API history state *immediately* to include the new user message
    // This state preserves the full context including the system prompt for subsequent calls
    const updatedHistoryForApi = [...chatHistoryForApi, newUserApiMessage];
    setChatHistoryForApi(updatedHistoryForApi);
    // console.log("Updated main API history state with new user message.");

    // 4. Prepare History *Specifically for THIS API Call* (Handle Groq Image+System Incompatibility)
    let historyForThisApiCall: ChatCompletionMessageParam[];

    // Check if ANY message in the *entire* history being sent contains an image
    const historyContainsImage = updatedHistoryForApi.some(msg =>
        Array.isArray(msg.content) && msg.content.some(part => part.type === 'image_url')
    );

    if (historyContainsImage) {
        // If an image exists anywhere in the history, filter out the system message for this API call
        // This is a workaround for Groq models that don't support system prompts with images
        historyForThisApiCall = updatedHistoryForApi.filter(msg => msg.role !== 'system');
        // console.warn("History contains an image. Sending API request WITHOUT the system prompt due to API limitations.");
    } else {
        // If no images are in the history, send the full history including the system prompt
        historyForThisApiCall = updatedHistoryForApi;
        // console.log("History is text-only. Sending API request WITH the system prompt.");
    }
    // --- End of Groq Incompatibility Workaround ---

    // 5. Save User Message to Database
    // Combine text and a placeholder for the image if present for storage
    const userContentToSave = getTextContentFromMessage(newUserApiMessage);
    if (userContentToSave) {
      try {
        await saveChatMessage(user.$id, 'user', userContentToSave, currentSessionId);
        //  console.log("User message saved to DB.");
      } catch (saveError) {
        // console.error("Failed to save user message to DB:", saveError);
        // Non-critical, inform user subtly
        toast({ title: "History Save Warning", description: "Could not save your message to history.", variant: "default" });
      }
    }

    // 6. Clear Inputs
    if (!messageToSendOverride) setInputMessage(''); // Clear text input if not using an override
    setPendingImageFile(null); // Clear attached image after it's processed for sending

    // 7. API Call (Streaming)
    let accumulatedResponse = ""; // Accumulate streamed text chunks
    let streamErrorOccurred = false; // Flag to track if the stream callback reported an error
    let finalModelMessageSaved = false; // Flag to track if the final model response was saved

    // console.log(`Sending ${historyForThisApiCall.length} messages to Groq stream API (history includes image=${historyContainsImage})...`);
    try {
      await groqService.sendMessageStream(
        historyForThisApiCall, // *** Use the correctly prepared history ***
        (chunk) => { // onChunk callback
          accumulatedResponse += chunk;
          setStreamingResponse(accumulatedResponse); // Update UI with streaming text
        },
        (streamError) => { // onError callback
          // console.error("Groq stream error callback:", streamError);
          streamErrorOccurred = true;
          // Provide more specific user feedback for known issues
          const errorMsg = streamError.message && (streamError.message.includes('prompting with images is incompatible') || streamError.message.includes('system message') || streamError.message.includes('system messages'))
                           ? "Cannot process images and system context together due to API limitations. Try asking about the image separately, or ask text questions without images."
                           : streamError.message || "An error occurred during the AI response stream.";
          setError(`AI response error: ${errorMsg}`);
          toast({ title: "AI Stream Error", description: errorMsg, variant: "destructive" });
          // Reset loading and streaming state on error
          setIsLoading(false); setStreamingResponse('');
        },
        async () => { // onComplete callback (stream finished)
          // console.log("Groq stream completed.");
          setIsLoading(false); // Turn off loading indicator

          if (!streamErrorOccurred && accumulatedResponse.trim()) {
            // Stream completed successfully with content
            const finalResponse = accumulatedResponse.trim();
            const modelApiMessage: ChatCompletionMessageParam = { role: 'assistant', content: finalResponse };

            // Update the main API history state to include the assistant's final response
            setChatHistoryForApi(prev => [...prev, modelApiMessage]);
            // console.log("Added final assistant message to main API history state.");

            // Add the final model message to the UI state
            const modelUiMessage: ChatUIMessage = { role: 'model', parts: [{ type: 'text', content: finalResponse }] };
            setMessages(prev => [...prev, modelUiMessage]);
            // console.log("Added final assistant message to UI state.");

            // Save the final model response to the database
            try {
              await saveChatMessage(user.$id, 'model', finalResponse, currentSessionId);
              finalModelMessageSaved = true;
              // console.log("Final assistant message saved to DB.");
            } catch (saveError) {
              // console.error("Failed to save final assistant message:", saveError);
              toast({ title: "History Save Warning", description: "Could not save AI response to history.", variant: "default" });
            }
          } else if (!streamErrorOccurred) {
              // Stream completed successfully but produced no text content
              // console.warn("Stream completed successfully but produced no text content.");
              // Check if the user message just sent contained an image
              const userMessageHadImage = apiMessageParts.some(p => p.type === 'image_url');
              if (userMessageHadImage && !finalModelMessageSaved) {
                  // If user sent an image and got no text back, add an acknowledgement message
                  const ackMsg = "[Image received. I cannot analyze medical images, but let me know if you have questions about general appearance or other topics.]";
                  setMessages(prev => [...prev, { role: 'model', parts: [{ type: 'text', content: ackMsg }] }]);
                   // Optionally save this acknowledgement to DB
                   try { await saveChatMessage(user.$id, 'model', ackMsg, currentSessionId); } catch(e) {console.warn("Could not save empty response acknowledgement", e)}
              }
          }
          // Clear the streaming response area regardless of outcome after completion
          setStreamingResponse('');
        }
      );
    } catch (error: unknown) {
      // Catch errors during the initiation of the stream itself
      // console.error("Error initiating stream:", error);
      const errorMsg = error instanceof Error ? error.message : "Could not send message to the AI service.";
      setError(`Failed to send message: ${errorMsg}`);
      toast({ title: "Send Error", description: errorMsg, variant: "destructive" });
      setIsLoading(false); setStreamingResponse(''); // Reset state on initiation error
    }
  }, [
      chatHistoryForApi, // Read this to build updated history
      inputMessage, isLoading, user?.$id, currentSessionId,
      toast, pendingImageFile, pendingImagePreviewUrl, isRecording,
      // State setters (setIsLoading, setError, setMessages, etc.) are implicitly dependencies
  ]);


  // --- Load Chat Session Handler ---
  const handleLoadSession = useCallback(async (sessionId: string) => {
    // Prevent loading if already loading, starting a new chat, or loading the same session
    if (!user?.$id || isLoading || isStartingChat || sessionId === currentSessionId) return;

    // console.log(`Attempting to load session: ${sessionId}`);
    setIsLoading(true); // Indicate loading state
    setError(null); // Clear previous errors
    setMessages([]); // Clear current UI messages
    setChatHistoryForApi([]); // Clear current API history state
    setCurrentSessionId(sessionId); // Set the new session ID
    setShowPreChat(false); // Ensure chat view is shown
    setInputMessage(''); // Clear any lingering input
    setPendingImageFile(null); // Clear any pending image

    try {
      // 1. Fetch history from Appwrite DB for the selected session
      const appwriteHistory: ChatHistoryMessage[] = await getUserChatHistoryForSession(user.$id, sessionId, 500); // Limit history length if needed
      // console.log(`Fetched ${appwriteHistory.length} messages from DB for session ${sessionId}`);

      // 2. Ensure User Profile context is available (fetch if necessary)
      // It's needed to generate the correct system prompt for the loaded session
      let currentProfile = userProfile;
      if (!currentProfile && !isContextLoading) {
          // console.log("Profile data missing for context, attempting quick fetch...");
          await fetchInitialContext(); // Await refetch
          // Re-access potentially updated state after fetch (might not be immediate)
          // This is tricky. A better approach might be to disable session loading until context is ready.
          // For now, we'll proceed, potentially using slightly stale context if fetchInitialContext doesn't update state in time.
          // Re-read from state store or assume fetchInitialContext updates the state variable `userProfile` used below.
          // Note: This relies on fetchInitialContext updating the `userProfile` state variable.
          currentProfile = userProfile; // Re-read potentially updated profile
          if (!currentProfile) {
              // console.warn("Failed to reload profile data for session context.");
              // Proceed without profile data, system prompt will be less personalized
          }
      }

      // 3. Regenerate System Prompt using current context + loaded history hints
      const currentPrefs: UserPreferences = {
        // Use profile data as baseline for context, as pre-chat form isn't relevant here
        age: currentProfile?.age, weeksPregnant: currentProfile?.weeksPregnant,
        preExistingConditions: currentProfile?.preExistingConditions,
        // Feeling/concerns are session-specific, extract from history instead
      };
      const currentContext: AdditionalChatContext = {
        latestBp: latestBp, latestSugar: latestSugar, latestWeight: latestWeight,
        upcomingAppointments: upcomingAppointments,
        previousConcerns: extractCommonConcerns(appwriteHistory) // Extract from loaded history
      };

      const systemPromptText = groqService.createSystemPrompt(currentPrefs, currentProfile, currentContext);
      const systemMessage: ChatCompletionMessageParam = { role: 'system', content: systemPromptText };

      // 4. Format the loaded DB history for the Groq API
      const loadedApiHistory = formatHistoryForGroq(appwriteHistory);

      // 5. Combine system prompt + loaded history for the main API state
      const finalApiHistory = [systemMessage, ...loadedApiHistory];
      setChatHistoryForApi(finalApiHistory);
      // console.log(`Loaded session ${sessionId}. Set API history with ${finalApiHistory.length} messages (incl. system).`);

      // 6. Format the loaded DB history for UI display
      if (appwriteHistory.length === 0) {
          toast({ title: "Empty Session Loaded", description: "No messages found in this chat history.", variant: "default" });
          setMessages([]); // Ensure UI is empty
      } else {
          const uiMessages = formatHistoryForUI(appwriteHistory); // Use the corrected formatter
          setMessages(uiMessages);
          // console.log(`Displayed ${uiMessages.length} messages in the UI.`);
      }

      // 7. Determine pregnancy context at the start of the loaded chat (best effort)
      let startWeeks: number | undefined = undefined;
      // Look for weeks in the first few user messages
      const firstUserMessages = appwriteHistory.filter(m => m.role === 'user').slice(0, 3);
      for (const msg of firstUserMessages) {
          if (msg.content) {
              const weeksMatch = msg.content.match(/(\d{1,2})\s+weeks(\s+pregnant)?/i);
              if (weeksMatch?.[1]) {
                  const parsedWeeks = parseInt(weeksMatch[1], 10);
                  if (!isNaN(parsedWeeks) && parsedWeeks >= 0 && parsedWeeks <= 45) {
                      startWeeks = parsedWeeks;
                      break; // Found it
                  }
              }
          }
      }
      // Fallback to current profile weeks if not found in early messages
      startWeeks = startWeeks === undefined ? currentProfile?.weeksPregnant : startWeeks;
      setChatStartWeeksPregnant(startWeeks); // Set session-specific start weeks
      setPregnancyTrimester(calculateTrimester(startWeeks)); // Update trimester display
      // console.log(`Determined start weeks for loaded session context: ${startWeeks}, Trimester: ${calculateTrimester(startWeeks)}`);

      toast({ title: "Session Loaded", description: `Displaying chat history for session ...${sessionId.slice(-6)}` });

    } catch (error: unknown) {
      // console.error("Error loading session:", error);
      const errorMsg = error instanceof Error ? error.message : "Could not load the selected chat session.";
      setError(`Failed to load session: ${errorMsg}`);
      toast({ title: "Load Failed", description: errorMsg, variant: "destructive" });
      // Reset state on failure
      setCurrentSessionId(null);
      setChatHistoryForApi([]);
      setMessages([]);
      setShowPreChat(true); // Revert to pre-chat state on load failure
    } finally {
      setIsLoading(false); // Ensure loading state is turned off
    }
  }, [
      user?.$id, isLoading, isStartingChat, currentSessionId, // Control state
      toast, // Utilities
      userProfile, latestBp, latestSugar, latestWeight, upcomingAppointments, isContextLoading, fetchInitialContext // Context data and fetcher
      // State setters implicitly included
  ]);


  // --- Handle Session Deletion from Sidebar ---
  const handleSessionDeleted = useCallback((deletedSessionId: string) => {
    // If the currently active session was deleted, reset the chat interface to the pre-chat state
    if (deletedSessionId === currentSessionId) {
      toast({ title: "Current Session Deleted", description: "The active chat session was deleted. Please start a new one.", variant: "default" }); // Fix TS2322: Changed "warning" to "default"
      setShowPreChat(true); // Go back to pre-chat form
      // Reset all chat-related state
      setMessages([]);
      setChatHistoryForApi([]);
      setCurrentSessionId(null);
      setError(null);
      setInputMessage('');
      setPendingImageFile(null);
      setStreamingResponse('');
      // Reset context display based on current profile (not session-specific anymore)
      setPregnancyTrimester(calculateTrimester(userProfile?.weeksPregnant));
      setChatStartWeeksPregnant(undefined); // Clear session-specific start weeks
      // Optionally reset pre-chat form fields to profile defaults or empty
      setFeeling(''); // Reset feeling dropdown
      setAge(userProfile?.age ? String(userProfile.age) : '');
      setWeeksPregnant(userProfile?.weeksPregnant ? String(userProfile.weeksPregnant) : '');
      setPreExistingConditions(userProfile?.preExistingConditions || '');
      setSpecificConcerns('');
    }
    // No action needed if a different session was deleted
  }, [currentSessionId, toast, userProfile]); // Depends on currentSessionId and userProfile for reset


  // --- Other Handlers (Bookmark, Image Attach/Upload/Remove, PDF Export, Trimester Color, KeyDown, Clear, Restart, Voice) ---

  // Add a message content to bookmarks
  const handleBookmarkClick = useCallback(async (messageContent: string) => {
    if (!user?.$id) { toast({ title: "Login Required", description:"Please log in to save bookmarks.", variant: "destructive" }); return; }
    const contentToSave = messageContent?.trim();
    if (!contentToSave) { toast({ title: "Cannot Bookmark Empty", variant: "default" }); return; }

    // Basic check to avoid bookmarking errors/placeholders
    if (contentToSave.startsWith('[Error:') || contentToSave.startsWith('[Send Error:') || contentToSave.startsWith('[Image received')) {
        toast({ title: "Cannot Bookmark This", description: "This type of message cannot be bookmarked.", variant: "default" });
        return;
    }

    // Indicate activity while saving
    const bookmarkToast = toast({ title: "Adding Bookmark...", variant: "default" });
    try {
      // Assume addBookmark expects userId and an object with messageContent
      await addBookmark(user.$id, { messageContent: contentToSave });
      bookmarkToast.update({ id: bookmarkToast.id, title: "Bookmark Added", description: "Saved successfully.", variant: "default" });
    } catch (error: unknown) {
      // console.error("Bookmark Failed:", error);
      const errorMsg = error instanceof Error ? error.message : "Could not save the bookmark.";
      bookmarkToast.update({ id: bookmarkToast.id, title: "Bookmark Failed", description: errorMsg, variant: "destructive" });
    }
    // No setIsLoading needed here unless bookmarking is very slow
  }, [user?.$id, toast]);

  // Trigger hidden file input click
  const handleImageAttachClick = useCallback(() => {
    // Prevent attaching if busy, already attached, or recording
    if (isLoading) { toast({ title: "Busy", description: "Please wait for the current action to complete.", variant: "default"}); return; }
    if (pendingImageFile) { toast({ title: "Image Already Attached", description: "Remove the current image first to attach a new one.", variant: "default" }); return; }
    if (isRecording) { toast({ title: "Stop Recording First", description: "Cannot attach an image while voice input is active.", variant: "default" }); return; }
    imageInputRef.current?.click(); // Trigger the file input
  }, [isLoading, pendingImageFile, isRecording, toast]);

  // Handle file selection from the input
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return; // No file selected

    // Validation (aligned with groqService.fileToApiImagePart)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
    const maxSize = 20 * 1024 * 1024; // 20 MB

    if (!allowedTypes.includes(file.type)) {
        toast({ title: "Invalid File Type", description: "Only JPG, PNG, WEBP, GIF, HEIC, HEIF images are allowed.", variant: "destructive" });
        e.target.value = ''; // Reset file input
        return;
    }
    if (file.size > maxSize) {
      toast({ title: "Image Too Large", description: `Max file size is 20MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.`, variant: "destructive" });
      e.target.value = ''; // Reset file input
      return;
    }

    // Set the valid file
    setPendingImageFile(file);
    toast({ title: "Image Ready", description: `Selected: ${file.name}. Add an optional comment and send.`, variant: "default" });
    e.target.value = ''; // Reset file input value after selection (allows selecting the same file again if removed)
  }, [toast]);

  // Remove the currently attached image
  const handleRemovePendingImage = useCallback(() => {
    setPendingImageFile(null); // Clears the file state and preview via useEffect
    // Explicitly clear the file input ref value as well, just in case
    if (imageInputRef.current) {
        imageInputRef.current.value = '';
    }
  }, []);

  // Export the current chat view to PDF
  const handleExportPDF = useCallback(async () => {
      if (!chatContainerRef.current || messages.length === 0) {
          toast({ title: "Cannot Export", description: "Chat history is empty.", variant: "default" }); // Changed from warning
          return;
      }
      if (isExportingPdf) return; // Prevent multiple concurrent exports

      setIsExportingPdf(true);
      setShowPdfConfirm(false); // Close confirmation dialog
      const pdfToast = toast({ title: "Generating PDF...", description: "Capturing chat content...", variant: "default" });
      await new Promise(resolve => setTimeout(resolve, 100)); // Short delay for UI update

      try {
          const chatElement = chatContainerRef.current;
          // Capture the chat container as a canvas
          const canvas = await html2canvas(chatElement, {
              scale: 2, // Increase scale for better resolution
              useCORS: true, // Enable cross-origin images if necessary
              logging: false, // Reduce console noise
              backgroundColor: window.getComputedStyle(chatElement).backgroundColor // Match background
          });

          const imgData = canvas.toDataURL('image/png'); // Get image data from canvas
          const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'pt', // Use points for dimensions
              format: 'a4' // Standard A4 size
          });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const margin = 40; // Define page margin

          // Calculate image dimensions to fit within page margins
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const availableWidth = pdfWidth - 2 * margin;
          // Adjust available height for header/footer space
          const availableHeight = pdfHeight - 2 * margin - 40;
          const ratio = Math.min(availableWidth / imgWidth, availableHeight / imgHeight);
          const scaledWidth = imgWidth * ratio;
          const scaledHeight = imgHeight * ratio;

          // Center the image horizontally, position below header
          const imgX = (pdfWidth - scaledWidth) / 2;
          const imgY = margin + 30;

          // Add Header Content
          pdf.setFontSize(16);
          pdf.setFont('helvetica', 'bold');
          pdf.text('MomCare AI Chat Export', pdfWidth / 2, margin, { align: 'center' });
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100); // Gray color for metadata
          const exportTime = format(new Date(), 'MMM d, yyyy h:mm a');
          pdf.text(`Exported: ${exportTime}`, pdfWidth / 2, margin + 12, { align: 'center' });
          if (userProfile?.name) pdf.text(`User: ${userProfile.name}`, margin, margin + 12);
          if (currentSessionId) pdf.text(`Session: ...${currentSessionId.slice(-6)}`, pdfWidth - margin, margin + 12, { align: 'right' });

          // Add the captured chat image to the PDF
          pdf.addImage(imgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight);

          // Add Footer (Optional - uncomment if needed)
          // pdf.setFontSize(8);
          // pdf.setTextColor(150);
          // pdf.text(`Page 1 of 1`, pdfWidth / 2, pdfHeight - margin / 2, { align: 'center' });

          // Save the generated PDF
          const filename = `MomCare-Chat-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
          pdf.save(filename);
          pdfToast.update({ id: pdfToast.id, title: "Export Successful", description: `Saved as ${filename}`, variant: "default" });

      } catch (error: unknown) {
          // console.error("PDF export error:", error);
          const errorMsg = error instanceof Error ? error.message : "Could not generate the PDF file.";
           pdfToast.update({ id: pdfToast.id, title: "Export Failed", description: errorMsg, variant: "destructive" });
      } finally {
          setIsExportingPdf(false); // Reset export state
      }
  }, [messages.length, toast, userProfile, currentSessionId, isExportingPdf]); // Dependencies for PDF content and state

  // Get border color based on the current session's pregnancy trimester
  const getTrimesterBorderColor = useCallback((): string => {
    switch (pregnancyTrimester) {
      case 1: return "border-blue-400 dark:border-blue-500";
      case 2: return "border-purple-400 dark:border-purple-500";
      case 3: return "border-pink-400 dark:border-pink-500";
      default: return "border-gray-300 dark:border-gray-600"; // Default/unknown trimester
    }
  }, [pregnancyTrimester]); // Depends only on the trimester state

  // Handle Enter key press in input/textarea to send message
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    // Send on Enter press, but allow Shift+Enter for new lines
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default newline behavior
      // Send only if not loading and there's content (text or image)
      if (!isLoading && (inputMessage.trim() || pendingImageFile)) {
        handleSendMessage();
      }
    }
  }, [isLoading, handleSendMessage, inputMessage, pendingImageFile]); // Dependencies for sending logic

  // Clear only the visual chat display (doesn't affect history or DB)
  const handleClearChat = useCallback(() => {
    if (isLoading) return; // Don't clear while AI is responding
    setMessages([]); // Clear UI messages
    setStreamingResponse(''); // Clear any partial streaming response
    setError(null); // Clear any errors displayed *within* the chat area
    // Note: This does NOT clear chatHistoryForApi or delete from DB
    toast({ title: "Chat View Cleared", description: "Messages removed from current display.", variant: "default" });
  }, [isLoading, toast]); // Depends on loading state

  // Reset the entire chat interface to start a new chat
  const handleRestartChat = useCallback(() => {
    // Prevent restarting if already busy
    if (isLoading || isStartingChat || isContextLoading) return;

    // Stop voice input if active
    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop(); // This should trigger onend and set isRecording=false
    }

    // Reset state to show the pre-chat form
    setShowPreChat(true);
    setMessages([]);
    setChatHistoryForApi([]);
    setStreamingResponse('');
    setError(null);
    setInputMessage('');
    setCurrentSessionId(null);
    setPendingImageFile(null);

    // Reset pregnancy context display based on current profile
    setPregnancyTrimester(calculateTrimester(userProfile?.weeksPregnant));
    setChatStartWeeksPregnant(undefined); // Clear session-specific start weeks

    // Reset pre-chat form fields to profile defaults or empty
    setFeeling(''); // Reset feeling dropdown
    setAge(userProfile?.age ? String(userProfile.age) : '');
    setWeeksPregnant(userProfile?.weeksPregnant ? String(userProfile.weeksPregnant) : '');
    setPreExistingConditions(userProfile?.preExistingConditions || '');
    setSpecificConcerns('');

    toast({ title: "New Chat Ready", description: "Fill in the details below to begin.", variant: "default" });
  }, [
      isLoading, isStartingChat, isContextLoading, isRecording,
      toast, userProfile
      // Implicit state setters
  ]);

  // Handle toggling voice input (start/stop)
  const handleVoiceInput = useCallback(() => {
    // --- Stop Recording ---
    if (isRecording) {
      if (recognitionRef.current) {
        recognitionRef.current.stop(); // Trigger onend event handler
        //  console.log("Stopping speech recognition manually via button.");
      } else {
          // Should not happen if isRecording is true, but handle defensively
          setIsRecording(false); // Force state reset
      }
      return; // Exit after stopping
    }

    // --- Start Recording ---
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({ title: "Voice Input Not Supported", description: "Your browser doesn't support the Web Speech API.", variant: "destructive" }); return;
    }
    // Prevent starting if busy or image attached
    if (isLoading) {
        toast({ title: "Please Wait", description: "Cannot start voice input while AI is responding.", variant: "default"}); return;
    }
    if (pendingImageFile) {
        toast({ title: "Image Attached", description: "Cannot use voice input while an image is attached. Remove image first.", variant: "default"}); return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition; // Store the instance in ref

      // Configure recognition settings
      recognition.continuous = true; // Keep listening even after pauses
      recognition.interimResults = true; // Get results as they come in (for live feedback)
      recognition.lang = 'en-US'; // Set language (adjust if needed)
      recognition.maxAlternatives = 1; // We only need the most likely transcription

      let finalTranscript = ''; // Accumulate final results across speech segments

      // Event: Result received from recognition service
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        // Iterate through all results received in this event
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            const transcriptPart = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                // Append final part to the accumulated final transcript
                finalTranscript += transcriptPart + ' '; // Add space after final parts
            } else {
                // Append interim part to the temporary interim transcript for this event
                interimTranscript += transcriptPart;
            }
        }
        // Update the input field with combined final and current interim results for live preview
        setInputMessage(finalTranscript + interimTranscript);
      };

      // Event: Recognition ends (naturally, via stop(), or error)
      recognition.onend = () => {
          // console.log("Speech recognition ended.");
          setIsRecording(false); // Update recording state
          recognitionRef.current = null; // Clear the ref
          // Trim the final result in the input field after recognition stops
          setInputMessage(prev => prev.trim());
          // Optional: Automatically send the message if there's content?
          // const finalMessage = finalTranscript.trim();
          // if (finalMessage && !isLoading) { handleSendMessage(finalMessage); }
      };

      // Event: Error occurred during recognition
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // console.error("Speech recognition error:", event.error, event.message);
        let description = `Error: ${event.error}. ${event.message || 'Please try again.'}`;
        if (event.error === 'no-speech') description = "No speech detected. Microphone might not be picking up audio.";
        if (event.error === 'audio-capture') description = "Microphone error. Check connection and system audio settings.";
        if (event.error === 'not-allowed') description = "Microphone permission denied. Please allow access in your browser settings.";

        // Don't show toast for 'aborted' as it's usually intentional (user clicked stop)
        if (event.error !== 'aborted') {
            toast({ title: "Voice Input Error", description: description, variant: "destructive" });
        }
        // Ensure state is reset even on error
        setIsRecording(false);
        recognitionRef.current = null;
      };

      // Start the recognition process
      recognition.start();
      // console.log("Speech recognition started.");
      setIsRecording(true); // Update recording state
      setInputMessage(''); // Clear input field when starting new recording
      finalTranscript = ''; // Reset final transcript accumulator

    } catch (error: unknown) {
      // console.error("Voice input initialization failed:", error);
      toast({ title: "Voice Input Failed", description: "Could not start the voice input service.", variant: "destructive" });
      setIsRecording(false); // Ensure state is reset
      recognitionRef.current = null; // Clear ref
    }
  }, [isRecording, isLoading, toast, pendingImageFile, handleSendMessage]); // Added handleSendMessage if auto-send on end is desired


  // Memoized function to generate conversation starter prompts.
  const renderConversationStarters = useMemo(() => {
      // Conditions to show starters:
      // 1. Not in pre-chat mode
      // 2. Chat is very short (e.g., <= 2 messages shown, meaning only initial exchange)
      // 3. Not currently loading/thinking
      // 4. There is an active chat session ID
      // 5. API history is populated (chat has actually started)
      if (!showPreChat && messages.length <= 2 && !isLoading && !isContextLoading && currentSessionId && chatHistoryForApi.length > 0) {
          let starters: { prompt: string; icon?: ElementType }[] = []; // Use ElementType for icons
          const trimester = pregnancyTrimester; // Use the trimester determined for this chat session

          // General Starters (always relevant)
          starters.push({ prompt: "What are common symptoms this week?", icon: Stethoscope });
          starters.push({ prompt: "Suggest some healthy snack ideas for pregnancy." });

          // Trimester-Specific Starters
          if (trimester === 1) {
              starters.push({ prompt: "How can I manage morning sickness?", icon: Droplet });
              starters.push({ prompt: "What prenatal tests are usually done in the first trimester?", icon: Stethoscope });
          } else if (trimester === 2) {
              starters.push({ prompt: "Tell me about feeling the baby move (quickening).", icon: Heart });
              starters.push({ prompt: "What kind of exercise is generally safe now?", icon: WeightIcon });
          } else if (trimester === 3) {
              starters.push({ prompt: "How should I prepare my hospital bag for labor?", icon: Calendar });
              starters.push({ prompt: "What are typical signs that labor might be starting soon?", icon: AlertTriangle });
          } else {
              // Starters if trimester is unknown or not applicable (e.g., postpartum)
              starters.push({ prompt: "Explain the main stages of fetal development." });
              starters.push({ prompt: "What foods should I generally avoid during pregnancy?" });
          }

          // Appointment-Related Starter (if applicable)
          if (upcomingAppointments.length > 0) {
              const nextApp = upcomingAppointments[0];
              // Clean up appointment type for display
              const appType = nextApp.appointmentType?.replace(/_/g, ' ').toLowerCase() || 'next appointment';
              const appDate = nextApp.dateTime ? format(nextApp.dateTime, 'MMM d') : 'upcoming checkup';
              starters.push({ prompt: `What questions should I ask at my ${appType} on ${appDate}?`, icon: Calendar });
          }

          // Shuffle and pick top 4 starters randomly
          starters = starters.sort(() => 0.5 - Math.random()).slice(0, 4);

          return (
              <div className="px-3 sm:px-4 pb-2 pt-1 shrink-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center font-medium">Try asking:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {starters.map((starter, index) => (
                          <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="text-left justify-start h-auto py-1.5 px-2 border-gray-300 dark:border-gray-700 hover:bg-gray-100/70 dark:hover:bg-gray-700/60 dark:text-gray-300 text-gray-700 transition-colors hover:text-momcare-primary dark:hover:text-momcare-light"
                              onClick={() => handleSendMessage(starter.prompt)} // Send the prompt text on click
                              disabled={isLoading} // Disable while AI is responding
                              aria-label={`Ask: ${starter.prompt}`}
                          >
                              {starter.icon && <starter.icon className="h-3.5 w-3.5 mr-1.5 text-momcare-primary/80 dark:text-momcare-light/80 shrink-0" aria-hidden="true" />}
                              <span className="text-xs leading-tight">{starter.prompt}</span>
                          </Button>
                      ))}
                  </div>
              </div>
          );
      }
      return null; // Return null if conditions to show starters aren't met
  }, [
      showPreChat, messages.length, isLoading, isContextLoading, currentSessionId, chatHistoryForApi.length,
      pregnancyTrimester, upcomingAppointments,
      handleSendMessage // Include handleSendMessage as it's used in the onClick handler
  ]);


  // --- Render Logic ---
    return (
      <MainLayout>
        <TooltipProvider delayDuration={100}>
          {/* Hidden file input for image uploads */}
          <input
              type="file"
              accept="image/png, image/jpeg, image/webp, image/gif, image/heic, image/heif" // Allowed types
              ref={imageInputRef}
              className="hidden"
              onChange={handleImageUpload}
              aria-hidden="true" // Hide from accessibility tree
           />

          {/* PDF Export Confirmation Dialog */}
          <Dialog open={showPdfConfirm} onOpenChange={setShowPdfConfirm}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Export Chat to PDF</DialogTitle>
                <DialogDescription>
                   This generates a PDF of the visible chat messages. Very long chats might be truncated in the image capture. Ensure all desired content is visible before exporting.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col sm:flex-row justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowPdfConfirm(false)} disabled={isExportingPdf}>Cancel</Button>
                <Button onClick={handleExportPDF} disabled={isExportingPdf || messages.length === 0}>
                  {isExportingPdf ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Exporting...</> : "Confirm & Export PDF"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Main Chat Layout (Sidebar + Chat Area) */}
          <div className="flex h-[calc(100vh-var(--header-height,60px))] bg-gray-100 dark:bg-gray-950">
            {/* Sidebar (conditionally rendered based on auth and screen size) */}
            {user && isAuthenticated && (
              <ChatHistorySidebar
                onSelectSession={handleLoadSession}
                currentSessionId={currentSessionId}
                className="flex-shrink-0 border-r border-gray-200 dark:border-gray-800 hidden md:flex" // Hide on smaller screens (md breakpoint)
                onSessionDeleted={handleSessionDeleted}
                // --- Fix for TS2322: Pass userId, assuming ChatHistorySidebarProps expects it.
                // --- Ensure ChatHistorySidebarProps in its file includes `userId: string;`
                userId={user.$id}
              />
            )}

            {/* Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-gray-900">
              {/* Inner container for padding and max-width */}
              <div className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex flex-col h-full w-full">

                {/* Conditional Rendering: Pre-Chat Form or Active Chat */}
                {showPreChat ? (
                  // --- Pre-Chat Form ---
                  <Card className="w-full max-w-3xl mx-auto mt-8 animate-fade-in border border-momcare-primary/20 dark:border-gray-700/50 shadow-lg">
    <CardHeader> {/* Default padding (usually p-6) applies here */}
      <CardTitle className="text-2xl sm:text-3xl font-bold text-momcare-primary dark:text-momcare-light text-center">
        MomCare AI Assistant
      </CardTitle>
      <CardDescription className="text-center text-gray-600 dark:text-gray-400 mt-1">
        Let's personalize your chat experience.
      </CardDescription>
    </CardHeader>
    {/* Using specific padding here is fine if you need different padding than the header/footer */}
    <CardContent className="space-y-5 px-6 pb-6 pt-4">
      {isContextLoading && (
        <div className="flex justify-center items-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-momcare-primary dark:text-momcare-light" aria-label="Loading profile" />
          <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">Loading your profile...</span>
        </div>
      )}
      {!isContextLoading && (
        <>
          {/* Feeling Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="feeling-select" className="dark:text-gray-300 font-medium">
              How are you feeling today? *
            </Label>
            <Select value={feeling} onValueChange={setFeeling} required>
              <SelectTrigger id="feeling-select" className="w-full dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 focus:ring-momcare-primary/50">
                <SelectValue placeholder="Select how you feel" />
              </SelectTrigger>
              <SelectContent className="dark:bg-gray-800 dark:text-gray-200">
                {feelingOptions.map((option) => (
                  <SelectItem key={option} value={option} className="dark:focus:bg-gray-700">
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {feeling === "Other (Specify in concerns)" && (
              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                Please add details in the "Specific Concerns" box below.
              </p>
            )}
          </div>
          {/* Age Input */}
          <div className="space-y-1.5">
            <Label htmlFor="age" className="dark:text-gray-300 font-medium">
              Your Age *
            </Label>
            <Input
              id="age"
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="Enter your current age"
              required
              min="11"
              max="99"
              className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 focus:ring-momcare-primary/50"
            />
          </div>
          {/* Weeks Pregnant Input */}
          <div className="space-y-1.5">
            <Label htmlFor="weeksPregnant" className="dark:text-gray-300 font-medium">
              Weeks Pregnant (Optional)
            </Label>
            <Input
              id="weeksPregnant"
              type="number"
              value={weeksPregnant}
              onChange={(e) => setWeeksPregnant(e.target.value)}
              // Display profile value in placeholder if available and form field is empty
              placeholder={
                userProfile?.weeksPregnant !== undefined && !weeksPregnant
                  ? `Current in profile: ${userProfile.weeksPregnant}`
                  : "e.g., 12"
              }
              min="0"
              max="45"
              className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 focus:ring-momcare-primary/50"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Leave blank to use profile value (if set).
            </p>
          </div>
          {/* Pre-existing Conditions Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="preExistingConditions" className="dark:text-gray-300 font-medium">
              Pre-existing Conditions (Optional)
            </Label>
            <Textarea
              id="preExistingConditions"
              value={preExistingConditions}
              onChange={(e) => setPreExistingConditions(e.target.value)}
              placeholder="e.g., gestational diabetes, hypertension, none"
              rows={2}
              maxLength={300}
              className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 resize-none focus:ring-momcare-primary/50"
            />
          </div>
          {/* Specific Concerns Textarea */}
          <div className="space-y-1.5">
            <Label htmlFor="specificConcerns" className="dark:text-gray-300 font-medium">
              Specific Concerns Today (Optional)
            </Label>
            <Textarea
              id="specificConcerns"
              value={specificConcerns}
              onChange={(e) => setSpecificConcerns(e.target.value)}
              placeholder="Anything specific on your mind? e.g., back pain, questions about nutrition, details if feeling 'Other'"
              rows={2}
              maxLength={300}
              className="dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 resize-none focus:ring-momcare-primary/50"
            />
          </div>
        </>
      )}
    </CardContent>
    <CardFooter className="flex justify-end px-6 pb-5 pt-4"> {/* Adjusted padding slightly */}
      {/* Start Chat Button */}
      <Button
        onClick={handleStartChat}
        disabled={isStartingChat || isContextLoading || !feeling || !age.trim()}
        className="bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark min-w-[120px] transition-colors"
      >
        {isStartingChat ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
            Starting...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
            Start Chat
          </>
        )}
      </Button>
    </CardFooter>
    {/* Error display within the pre-chat card */}
    {error && showPreChat && (
      <p className="text-red-600 dark:text-red-400 text-sm px-6 py-4 text-center border-t dark:border-gray-700/50">
        {error}
      </p>
    )}
  </Card>

                ) : (

                  // --- Active Chat View ---
                  <div className="flex-1 flex flex-col overflow-hidden h-full">
                    <Card className={`flex-1 flex flex-col overflow-hidden border-2 ${getTrimesterBorderColor()} dark:bg-gray-800/80 dark:border-gray-700/80 shadow-md rounded-lg`}>
                      {/* Chat Header */}
                      <CardHeader className="p-2 px-3 sm:px-4 flex flex-row justify-between items-center border-b bg-white dark:bg-gray-800 dark:border-gray-700 shrink-0 rounded-t-lg">
                        {/* Title and Context Info */}
                        <div className="flex flex-col">
                          <CardTitle className="text-base sm:text-lg font-semibold text-momcare-primary dark:text-momcare-light">MomCare AI Assistant</CardTitle>
                           {/* Display Trimester or Session ID */}
                           {pregnancyTrimester && (<CardDescription className="text-xs text-gray-500 dark:text-gray-400">Trimester {pregnancyTrimester} Context {currentSessionId ? `(Session ...${currentSessionId.slice(-4)})` : ''}</CardDescription>)}
                           {!pregnancyTrimester && currentSessionId && (<CardDescription className="text-xs text-gray-500 dark:text-gray-400">Session ...{currentSessionId.slice(-4)}</CardDescription>)}
                           {!currentSessionId && (<CardDescription className="text-xs text-gray-500 dark:text-gray-400">New Chat</CardDescription>)}
                        </div>
                        {/* Action Buttons */}
                        <div className="flex gap-1">
                          {/* Clear Chat View Button */}
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleClearChat} disabled={isLoading || messages.length === 0} className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full" aria-label="Clear chat view"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Clear Chat View</p></TooltipContent></Tooltip>
                          {/* New Chat / Restart Button */}
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleRestartChat} disabled={isLoading || isStartingChat} className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full" aria-label="Start new chat"><RefreshCw className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>New Chat</p></TooltipContent></Tooltip>
                          {/* Export PDF Button */}
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={() => setShowPdfConfirm(true)} disabled={isLoading || messages.length === 0 || isExportingPdf} className="h-7 w-7 sm:h-8 sm:w-8 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-full" aria-label="Export chat as PDF"><Share2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Export as PDF</p></TooltipContent></Tooltip>
                        </div>
                      </CardHeader>

                      {/* Chat Message Area */}
                      <CardContent ref={chatContainerRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 scroll-smooth bg-gray-50/70 dark:bg-gray-800/70">
                        {/* Loading Indicator for History */}
                        {isLoading && messages.length === 0 && currentSessionId && !isStartingChat && (
                          <div className="flex justify-center items-center h-full text-sm text-gray-500 dark:text-gray-400"><Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true"/>Loading chat history...</div>
                        )}

                        {/* Display Messages */}
                        {messages.map((message, index) => {
                           // Basic validation for message structure (already filtered in formatters, but good practice)
                           if (!message || !message.role || !Array.isArray(message.parts)) {
                              //  console.warn("Skipping render of invalid message structure:", message);
                               return null;
                           }
                           // Create a more robust key using index and session ID
                           const uniqueKey = `${currentSessionId || 'new'}-${message.role}-${index}`;

                          return (
                            <div
                              key={uniqueKey}
                              className={`flex items-start space-x-2 animate-fade-in ${message.role === 'user' ? 'justify-end pl-8 sm:pl-10' : 'justify-start pr-8 sm:pr-10'}`}
                            >
                              {/* AI Icon (Model) */}
                              {message.role === 'model' && (<Bot className="h-5 w-5 text-momcare-primary/80 dark:text-momcare-light/80 mt-1 flex-shrink-0 self-start" aria-label="AI Icon" />)}

                              {/* Message Bubble */}
                              <div className={`relative group max-w-[85%] rounded-xl shadow-sm flex flex-col ${ message.role === 'user' ? 'bg-momcare-primary text-white rounded-br-none items-end' : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-600 items-start' }`} >
                                {/* Render Message Parts (Text/Image) */}
                                {message.parts.map((part, partIndex) => (
                                  <div key={`${uniqueKey}-part-${partIndex}`} className={`px-3 py-1 sm:px-4 sm:py-1.5 first:pt-2 last:pb-2 w-full ${part.type === 'image' ? 'my-1 flex justify-center' : ''}`} >
                                    {/* Text Part */}
                                    {part.type === 'text' && part.content ? (
                                      <div className={`prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-li:my-0.5 ${message.role === 'user' ? 'text-white prose-a:text-blue-200 hover:prose-a:text-blue-100' : 'prose-a:text-momcare-primary hover:prose-a:text-momcare-dark dark:prose-a:text-momcare-light dark:hover:prose-a:text-blue-300'}`}>
                                        {/* Use ReactMarkdown for rendering markdown content */}
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node, ...props }: AnchorProps) => (<a target="_blank" rel="noopener noreferrer" {...props} />) }} >
                                          {part.content}
                                        </ReactMarkdown>
                                      </div>
                                    ) : null}
                                    {/* Image Part */}
                                    {part.type === 'image' && part.content ? (
                                      <img
                                        src={part.content}
                                        alt={part.alt || 'User uploaded image'}
                                        className="max-w-full h-auto max-h-60 object-contain rounded-md border border-gray-300 dark:border-gray-600 my-1 bg-gray-100 dark:bg-gray-600"
                                        // Basic error handling for broken image links
                                        onError={(e) => {
                                          // console.warn(`Failed to load image: ${part.content}`);
                                          const target = e.target as HTMLImageElement;
                                          target.alt = 'Image failed to load';
                                          // Optionally replace with a placeholder or hide
                                          // target.style.display = 'none'; // Hide broken image
                                          // Insert a text placeholder instead
                                          const errorDiv = document.createElement('div');
                                          errorDiv.textContent = '[Image load error]';
                                          errorDiv.className = 'text-xs text-red-500 italic p-2 bg-red-50 dark:bg-red-900/50 rounded';
                                          target.parentNode?.replaceChild(errorDiv, target); // Replace img with error text
                                        }} />
                                    ) : null}
                                  </div>
                                ))}
                                {/* Bookmark Button (for model messages with text content) */}
                                {message.role === 'model' && message.parts.some(p => p.type === 'text' && p.content?.trim()) && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost" size="icon"
                                        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity h-6 w-6 p-1 rounded-full bg-white/70 dark:bg-gray-600/70 hover:bg-white dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-500"
                                        onClick={() => handleBookmarkClick(message.parts.find(p => p.type === 'text')?.content || '')}
                                        aria-label="Bookmark this message"
                                        disabled={isLoading} // Disable while loading/bookmarking
                                       >
                                        <Bookmark className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top"><p>Bookmark</p></TooltipContent>
                                  </Tooltip>
                                )}
                              </div>

                              {/* User Icon */}
                              {message.role === 'user' && (<User className="h-5 w-5 text-gray-500 dark:text-gray-400 mt-1 flex-shrink-0 self-start" aria-label="User Icon" />)}
                            </div>
                          );
                        })}

                        {/* Streaming Response Area */}
                        {streamingResponse && (
                          <div className="flex items-start space-x-2 justify-start pr-8 sm:pr-10 animate-fade-in">
                            <Bot className="h-5 w-5 text-momcare-primary/80 dark:text-momcare-light/80 mt-1 flex-shrink-0 self-start" aria-label="AI Icon"/>
                            <div className="relative max-w-[85%] rounded-xl shadow-sm flex flex-col bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-none border border-gray-200 dark:border-gray-600 items-start">
                              <div className="px-3 py-1 sm:px-4 sm:py-1.5 first:pt-2 last:pb-2 w-full">
                                {/* Render streaming markdown */}
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1 prose-a:text-momcare-primary hover:prose-a:text-momcare-dark dark:prose-a:text-momcare-light dark:hover:prose-a:text-blue-300 whitespace-pre-wrap">
                                   <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ node, ...props }: AnchorProps) => (<a target="_blank" rel="noopener noreferrer" {...props} />) }} >
                                      {streamingResponse}
                                    </ReactMarkdown>
                                  {/* Blinking cursor simulation at the end of streaming text */}
                                  <span className="inline-block animate-pulse ml-1">▍</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Thinking Indicator (shown only when loading and user was the last message) */}
                        {isLoading && !streamingResponse && messages.length > 0 && messages[messages.length - 1].role === 'user' && (
                          <div className="flex items-center justify-center py-2 text-sm text-gray-500 dark:text-gray-400"><Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true"/>MomCare AI is thinking...</div>
                        )}

                        {/* Error Display Area (within chat scroll) */}
                        {error && !showPreChat && (
                          <div className="flex items-center p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/40 rounded-lg text-red-700 dark:text-red-300 text-sm shadow-sm my-2 mx-1">
                            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" aria-hidden="true"/>
                            <span className="flex-1 break-words">{error}</span>
                             {/* Button to dismiss the error message */}
                             <Button variant="ghost" size="icon" onClick={() => setError(null)} className="h-6 w-6 p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-800/50 rounded-full -mr-1 ml-2 flex-shrink-0" aria-label="Dismiss error"><X className="h-4 w-4"/></Button>
                          </div>
                        )}

                        {/* Scroll Anchor: Empty div at the bottom to scroll into view */}
                        <div ref={messagesEndRef} className="h-0" />
                      </CardContent>

                      {/* Conversation Starters (conditionally rendered) */}
                      {renderConversationStarters}

                      {/* Input Area */}
                      <CardFooter className="border-t p-2 sm:p-3 bg-white dark:bg-gray-800 dark:border-gray-700 shrink-0 flex flex-col items-stretch rounded-b-lg">
                        {/* Image Preview Area */}
                        {pendingImagePreviewUrl && (
                          <div className="mb-2 ml-10 sm:ml-12 relative self-start">
                            <div className="rounded-md border border-gray-300 dark:border-gray-600 overflow-hidden inline-block bg-gray-100 dark:bg-gray-700 p-1 shadow-sm">
                              <img src={pendingImagePreviewUrl} alt="Image upload preview" className="max-h-24 sm:max-h-32 w-auto object-cover rounded" />
                              {/* Remove Image Button */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="destructive" size="icon" className="absolute top-0 right-0 m-0.5 bg-black/60 hover:bg-black/80 text-white rounded-full h-5 w-5 p-0.5 opacity-80 hover:opacity-100" onClick={handleRemovePendingImage} aria-label="Remove attached image">
                                    <X className="h-3 w-3" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>Remove Image</p></TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        )}
                        {/* Main Input Row */}
                        <div className="flex items-center gap-2">
                           {/* Attach Image Button */}
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleImageAttachClick} disabled={isLoading || !!pendingImageFile || isRecording} className="text-gray-500 hover:text-momcare-primary dark:text-gray-400 dark:hover:text-momcare-light h-8 w-8 sm:h-9 sm:w-9 rounded-full flex-shrink-0" aria-label="Attach image"><ImagePlus className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>Attach Image</p></TooltipContent></Tooltip>
                          {/* Text Input */}
                          <Input
                              value={inputMessage}
                              onChange={(e) => setInputMessage(e.target.value)}
                              onKeyDown={handleKeyDown} // Handle Enter key
                              placeholder={ isRecording ? "Listening... Click mic to stop" : pendingImageFile ? "Add comment (optional) and send..." : "Type your message or question..." }
                              disabled={isLoading || isRecording} // Disable while loading or recording
                              className="flex-1 h-9 sm:h-10 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 focus:ring-momcare-primary/50"
                              aria-label="Chat message input"
                              maxLength={2000} // Limit input length
                           />
                          {/* Voice Input Button */}
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" onClick={handleVoiceInput} disabled={isLoading || !!pendingImageFile} className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex-shrink-0 text-gray-500 hover:text-momcare-primary dark:text-gray-400 dark:hover:text-momcare-light ${ isRecording ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 animate-pulse' : '' }`} aria-label={isRecording ? "Stop voice recording" : "Start voice input"}><Mic className="h-5 w-5" /></Button></TooltipTrigger><TooltipContent><p>{isRecording ? "Stop Recording" : "Voice Input"}</p></TooltipContent></Tooltip>
                          {/* Send Button */}
                          <Tooltip><TooltipTrigger asChild><Button onClick={() => handleSendMessage()} disabled={isLoading || isRecording || (!inputMessage.trim() && !pendingImageFile)} className="bg-momcare-primary hover:bg-momcare-dark dark:bg-momcare-primary dark:hover:bg-momcare-dark h-9 w-9 sm:h-10 sm:w-10 p-0 flex-shrink-0 rounded-full transition-colors" aria-label="Send message">{isLoading && !isStartingChat ? (<Loader2 className="h-5 w-5 animate-spin" />) : (<Send className="h-5 w-5" />)}</Button></TooltipTrigger><TooltipContent><p>Send</p></TooltipContent></Tooltip>
                        </div>
                      </CardFooter>
                    </Card>
                  </div>
                )}
              </div> {/* End Inner container */}
            </div> {/* End Chat Area */}
          </div> {/* End Main Chat Layout */}
        </TooltipProvider>
      </MainLayout>
    );
};

export default ChatPage;