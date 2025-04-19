// src/lib/appwrite.ts
import {
    Account,
    Avatars,
    Client,
    Databases,
    ID,
    Query,
    Storage,
    Models, // Use Models namespace for Document type
    Permission,
    Role,
    AppwriteException
} from 'appwrite';
import { formatDistanceToNow, parseISO } from 'date-fns'; // Import date-fns
import { ProductRecommendation } from './groqProduct';
// --- Configuration ---
// Ensure your .env.local file (or environment variables) has these defined
const endpoint: string = import.meta.env.VITE_PUBLIC_APPWRITE_ENDPOINT as string;
const projectId: string = import.meta.env.VITE_PUBLIC_APPWRITE_PROJECT_ID as string;
const databaseId: string = import.meta.env.VITE_PUBLIC_APPWRITE_BLOG_DATABASE_ID as string; // Main DB ID

// --- Collection IDs ---
// Using descriptive names matching the purpose. Ensure these IDs exist in your Appwrite project.
const blogCollectionId: string | undefined = import.meta.env.VITE_PUBLIC_APPWRITE_BLOG_COLLECTION_ID as string | undefined; // Optional
const profilesCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID as string;
const medicalDocumentsCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_MEDICAL_DOCUMENTS_COLLECTION_ID as string;
const appointmentsCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_APPOINTMENTS_COLLECTION_ID as string;
const bloodPressureCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_BP_COLLECTION_ID as string;
const bloodSugarCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_SUGAR_COLLECTION_ID as string;
const weightCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_WEIGHT_COLLECTION_ID as string;
const medicationRemindersCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_MEDS_COLLECTION_ID as string;
const chatHistoryCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_CHAT_HISTORY_COLLECTION_ID as string;
const bookmarkedMessagesCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_BOOKMARKS_COLLECTION_ID as string;
const forumTopicsCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_FORUM_TOPICS_COLLECTION_ID as string;
const forumPostsCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_FORUM_POSTS_COLLECTION_ID as string;
const bookmarkedProductsCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_BOOKMARKED_PRODUCTS_COLLECTION_ID as string || 'bookmarkedProducts';
const forumVotesCollectionId: string = import.meta.env.VITE_PUBLIC_APPWRITE_FORUM_VOTES_COLLECTION_ID as string || 'forumVotes';
// --- Bucket IDs ---
// Ensure these Storage Buckets exist in your Appwrite project.
export const profileBucketId: string = import.meta.env.VITE_PUBLIC_APPWRITE_PROFILE_BUCKET_ID as string;
export const medicalBucketId: string = import.meta.env.VITE_PUBLIC_APPWRITE_MEDICAL_BUCKET_ID as string;
export const chatImagesBucketId: string = import.meta.env.VITE_PUBLIC_APPWRITE_CHAT_IMAGES_BUCKET_ID as string;

// --- Configuration Validation ---
// Checks if essential configuration variables are present and not placeholders.
const requiredConfigs: Record<string, string | undefined> = {
    endpoint,
    projectId,
    databaseId,
    // blogCollectionId is optional based on usage
    profilesCollectionId,
    medicalDocumentsCollectionId,
    appointmentsCollectionId,
    bloodPressureCollectionId,
    bloodSugarCollectionId,
    weightCollectionId,
    medicationRemindersCollectionId,
    profileBucketId,
    medicalBucketId,
    chatHistoryCollectionId,
    bookmarkedMessagesCollectionId,
    chatImagesBucketId,
    forumTopicsCollectionId, 
    forumVotesCollectionId,
    forumPostsCollectionId,
    bookmarkedProductsCollectionId,
};

const missingConfigs: string[] = Object.entries(requiredConfigs)
    // Basic check for undefined, null, empty string, or common placeholder prefixes
    .filter(([key, value]) => {
        // Allow blogCollectionId to be missing if needed by commenting it out above
        // if (key === 'blogCollectionId' && !value) return false;
        return !value || value.startsWith('YOUR_') || value.startsWith('<') || value.length < 5;
    })
    .map(([key]) => key);

if (missingConfigs.length > 0) {
    const errorMsg = `CRITICAL ERROR: Missing or invalid Appwrite configuration for: ${missingConfigs.join(', ')}. Check your environment variables (e.g., .env.local) and ensure all VITE_PUBLIC_APPWRITE_* variables are correctly set.`;
    console.error(errorMsg);
    // Throwing an error stops the app from potentially running incorrectly
    throw new Error(errorMsg);
} else {
    console.log("Appwrite Config Loaded Successfully.");
}

// --- Appwrite Client Initialization ---
const client = new Client();
client.setEndpoint(endpoint).setProject(projectId);

// --- Service Exports ---
// Instantiated Appwrite services for use throughout the application.
export const account = new Account(client);
export const avatars = new Avatars(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// --- Type Definitions ---

/**
 * Base interface for Appwrite documents, using Models.Document for system attributes.
 * Includes $id, $createdAt, $updatedAt, $permissions, $collectionId, $databaseId
 */
export type AppwriteDocument = Models.Document;
// --- NEW: Forum Types ---
/** Represents a forum topic document. */
export interface ForumTopic extends AppwriteDocument {
    title: string;
    content: string; // Initial post content
    userId: string; // Creator's Appwrite User ID
    userName: string; // Creator's display name (snapshot)
    userAvatarUrl?: string; // Creator's avatar URL (snapshot, optional)
    category?: string;
    lastReplyAt?: string; // ISO Datetime string
    replyCount?: number;
    isLocked?: boolean;
    isPinned?: boolean;
    // ** NEW: Store aggregated vote counts for efficient display/sorting **
    voteScore?: number; // Calculated: upvotes - downvotes
}

/** Represents a forum post (reply) document. */
export interface ForumPost extends AppwriteDocument {
    topicId: string; // $id of the parent ForumTopic
    content: string;
    userId: string; // Replier's Appwrite User ID
    userName: string; // Replier's display name (snapshot)
    userAvatarUrl?: string; // Replier's avatar URL (snapshot, optional)
    // ** NEW: Store aggregated vote counts for efficient display/sorting **
    voteScore?: number; // Calculated: upvotes - downvotes
}
// *** NEW: Forum Vote Type ***
/** Represents a user's vote on a topic or post. */
export interface ForumVote extends AppwriteDocument {
    userId: string; // ID of the user who voted
    targetId: string; // ID of the ForumTopic or ForumPost being voted on
    targetType: 'topic' | 'post'; // Type of the target document
    voteType: 'up' | 'down'; // The type of vote cast
}

/** Represents aggregated vote counts for a target. */
export interface VoteCounts {
    upvotes: number;
    downvotes: number;
    score: number; // upvotes - downvotes
}

/** Represents the user's current vote status on a target. */
export type UserVoteStatus = 'up' | 'down' | 'none';
/**
 * Represents a medication reminder document.
 */
export interface MedicationReminder extends AppwriteDocument {
    userId: string;
    medicationName: string;
    dosage: string;
    frequency: string; // e.g., "Daily", "Twice Daily", "As Needed"
    times?: string[]; // Array of times like "HH:MM" (optional)
    notes?: string; // Optional notes
    isActive?: boolean; // Reminder status (default: true)
}
export interface BookmarkedProduct extends AppwriteDocument {
    userId: string;
    productId: string; // The AI-generated ID like 'personalized-...'
    productName: string;
    description: string;
    category?: string;
    searchKeywords?: string;
    reasoning?: string;
    bookmarkedAt: string; // ISO DateTime string
}

export type CreateForumTopicData = Pick<ForumTopic, 'title' | 'content'> & Partial<Pick<ForumTopic, 'category'>>;
export type CreateForumPostData = Pick<ForumPost, 'topicId' | 'content'>;
export type UpdateForumTopicData = Partial<Pick<ForumTopic, 'title' | 'content' | 'category' | 'isLocked' | 'isPinned'>>;
export type UpdateForumPostData = Partial<Pick<ForumPost, 'content'>>;
/**
 * Represents a user profile document. Includes basic info, pregnancy details, and preferences.
 */
export interface UserProfile extends AppwriteDocument {
    /** Links to Appwrite Auth User $id (should be indexed) */
    userId: string;
    name?: string;
    /** File ID in profileBucketId */
    profilePhotoId?: string;
    /** Generated client-side string URL for display, NOT stored in DB */
    profilePhotoUrl?: string;
    age?: number;
    gender?: string;
    address?: string;
    /** Estimated weeks */
    weeksPregnant?: number;
    /** Text description */
    preExistingConditions?: string;
    /** User's email (can be useful for queries, maybe indexed) */
    email?: string;
    phoneNumber?: string;
    /** Number of previous pregnancies */
    previousPregnancies?: number;
    /** e.g., 'vaginal', 'c-section', 'undecided' */
    deliveryPreference?: string;
    /** e.g., 'very supportive', 'limited' (Optional, handle sensitively) */
    partnerSupport?: string;
    /** e.g., 'full-time', 'on leave' */
    workSituation?: string;
    /** Array of strings, e.g., ['vegetarian', 'gluten-free'] */
    dietaryPreferences?: string[];
    /** e.g., 'sedentary', 'light', 'moderate', 'active' */
    activityLevel?: string;
    /** Preferred AI chat tone (e.g., 'empathetic', 'direct') */
    chatTonePreference?: string;
    languagePreference?: string;
}

/**
 * Represents a blog post document.
 */
export interface BlogPost extends AppwriteDocument {
    title: string;
    /** URL-friendly identifier (should have a UNIQUE index) */
    slug: string;
    /** Can be large text/HTML/Markdown */
    content: string;
    /** Consider linking to UserProfile ($id or userId) or just store name */
    author: string;
    /** Should be indexed for filtering */
    category?: string;
    /** URL of an external image OR generated preview URL from Appwrite Storage */
    imageUrl?: string;
    /** ID of the file in Appwrite Storage (if uploading images) */
    imageFileId?: string;
    /** Array of strings (consider indexing if filtering by tags) */
    tags?: string[];
    /** ISO Datetime string (optional, can use $createdAt) */
    publishedAt?: string;
}

/**
 * Represents a medical document record linking a user to a file in storage.
 */
export interface MedicalDocument extends AppwriteDocument {
    /** Should be indexed */
    userId: string;
    /** ID of the file in Appwrite Storage (medicalBucketId) */
    fileId: string;
    /** Original file name */
    fileName: string;
    /** MIME type e.g., 'application/pdf', 'image/jpeg' */
    documentType?: string;
    /** Optional user description */
    description?: string;
}

/**
 * Represents an appointment document.
 */
export interface Appointment extends AppwriteDocument {
    /** Should be indexed */
    userId: string;
    /** ISO Datetime string (YYYY-MM-DDTHH:mm:ss.sssZ) - Recommended for proper sorting/filtering (should be indexed) */
    date: string;
    /** Time string (e.g., "10:00 AM", "14:30") - Potentially redundant if 'date' includes time, but can be useful for display */
    time: string; // Kept for compatibility with ChatPage logic, though 'date' should ideally be datetime
    notes?: string;
    /** Should be indexed if filtering by status */
    isCompleted?: boolean;
    /** e.g., 'doctor', 'yoga_class', 'lab_test' (consider indexing) */
    appointmentType?: string;
}

// --- Health Reading Types ---
/** Base interface for health readings with common fields. */
interface HealthReadingBase extends AppwriteDocument {
    /** Should be indexed */
    userId: string;
    /** ISO Datetime string when the reading was recorded (should be indexed) */
    recordedAt: string;
}
/** Represents a blood pressure reading document. */
export interface BloodPressureReading extends HealthReadingBase { systolic: number; diastolic: number; }
/** Represents a blood sugar reading document. */
export interface BloodSugarReading extends HealthReadingBase { level: number; measurementType: 'fasting' | 'post_meal' | 'random'; }
/** Represents a weight reading document. */
export interface WeightReading extends HealthReadingBase { weight: number; unit: 'kg' | 'lbs'; }

// --- Chat History & Session Types ---
/** Represents a single message in the chat history */
export interface ChatHistoryMessage extends AppwriteDocument {
    /** Indexed */
    userId: string;
    role: 'user' | 'model';
    content: string;
    /** ISO Datetime string, Indexed (DESC) */
    timestamp: string;
    /** REQUIRED: To group messages by conversation session, Indexed */
    sessionId: string;
}

/** Represents summary information for a chat session. */
export interface ChatSessionInfo {
    sessionId: string;
    /** ISO string of the first message in the session */
    firstMessageTimestamp: string;
    /** Content snippet of the first user message */
    preview: string;
    /** Relative time string (e.g., "about 2 hours ago") based on the *last* message */
    relativeDate: string;
    /** Total message count in the session (approximate if limit hit during fetch) */
    messageCount: number;
}

/** Represents a bookmarked chat message */
export interface BookmarkedMessage extends AppwriteDocument {
    /** Indexed */
    userId: string;
    /** The text content of the bookmarked message */
    messageContent: string;
    /** ISO Datetime string, Indexed (DESC) */
    bookmarkedAt: string;
}

// --- Specific Input Types for Create Functions ---
export type CreateAppointmentData = Pick<Appointment, 'date' | 'time'> & Partial<Pick<Appointment, 'notes' | 'appointmentType' | 'isCompleted'>>;
export type CreateBPData = Pick<BloodPressureReading, 'systolic' | 'diastolic'>;
export type CreateSugarData = Pick<BloodSugarReading, 'level' | 'measurementType'>;
export type CreateWeightData = Pick<WeightReading, 'weight' | 'unit'>;
export type CreateMedicationReminderData = Pick<MedicationReminder, 'medicationName' | 'dosage' | 'frequency'> & Partial<Pick<MedicationReminder, 'times' | 'notes' | 'isActive'>>;
export type CreateBlogPostData = Pick<BlogPost, 'title' | 'slug' | 'content' | 'author'> & Partial<Pick<BlogPost, 'category' | 'tags' | 'publishedAt' | 'imageFileId' | 'imageUrl'>>;
export type UpdateBlogPostData = Partial<Pick<BlogPost, 'slug' | 'title' | 'content' | 'category' | 'imageUrl' | 'imageFileId' | 'tags'>>;
export type CreateBookmarkData = Pick<BookmarkedMessage, 'messageContent'>;


// --- Utility Function for Error Handling ---
const handleAppwriteError = (error: unknown, context: string, throwGeneric: boolean = false): unknown => {
    let errorMessage = `Error ${context}: Unknown error occurred.`;
    let errorCode: number | string | undefined = undefined;
    let errorType: string | undefined = undefined;

    if (error instanceof AppwriteException) {
        errorCode = error.code;
        errorType = error.type;
        errorMessage = `Error ${context}: ${error.message} (Code: ${errorCode}, Type: ${errorType})`;
        console.error(`AppwriteException during ${context}:`, {
            message: error.message, code: error.code, type: error.type, response: error.response
        });
    } else if (error instanceof Error) {
        errorMessage = `Error ${context}: ${error.message}`;
        console.error(`Error during ${context}:`, error);
    } else {
        console.error(`Unknown error type during ${context}:`, error);
    }

    if (throwGeneric) {
        throw new Error(`Operation failed: ${context}. Please check logs or try again.`);
    }
    return error;
};


// --- Authentication Functions ---
export const createAccount = async (email: string, password: string, name: string): Promise<Models.User<Models.Preferences>> => {
    try {
        if (!email || !password || !name) throw new Error("Email, password, and name are required.");
        const newUserAccount = await account.create(ID.unique(), email, password, name);
        await login(email, password);
        try { await createUserProfile(newUserAccount.$id, { name: name, email: email }); }
        catch (profileError) { console.warn(`Failed to auto-create profile for ${newUserAccount.$id}:`, profileError); }
        return newUserAccount;
    } catch (error) { handleAppwriteError(error, 'creating account'); throw error; }
};
export const login = async (email: string, password: string): Promise<Models.Session> => {
    try { if (!email || !password) throw new Error("Email and password required."); return await account.createEmailPasswordSession(email, password); }
    catch (error) { handleAppwriteError(error, 'logging in'); throw error; }
};
export const logout = async (): Promise<void> => {
    try { await account.deleteSession('current'); }
    catch (error) { handleAppwriteError(error, 'logging out'); throw error; }
};
export const getCurrentUser = async (): Promise<Models.User<Models.Preferences> | null> => {
    try { return await account.get(); }
    catch (error) { if (error instanceof AppwriteException && (error.code === 401 || error.type?.includes('unauthorized'))) return null; handleAppwriteError(error, 'fetching current user', false); return null; }
};


// --- Blog Post Functions --- (Optional)
export const getBlogPosts = async (search = '', category = ''): Promise<BlogPost[]> => {
    if (!blogCollectionId) { console.warn("Blog Collection ID not configured."); return []; }
    try { const queries: string[] = [ Query.orderDesc('$createdAt'), Query.limit(25) ]; if (search.trim()) queries.push(Query.search('title', search.trim())); if (category.trim() && category.toLowerCase() !== 'all') queries.push(Query.equal('category', category.trim())); const response = await databases.listDocuments<BlogPost>(databaseId, blogCollectionId, queries); return response.documents; }
    catch (error) { handleAppwriteError(error, `fetching blog posts`, false); return []; }
};
export const createBlogPost = async (postData: CreateBlogPostData): Promise<BlogPost> => {
  if (!blogCollectionId) throw new Error("Blog Collection ID not configured.");
  if (!postData.title?.trim() || !postData.slug?.trim() || !postData.content?.trim() || !postData.author?.trim()) throw new Error("Title, slug, content, and author required.");
  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; if (!slugRegex.test(postData.slug)) throw new Error("Invalid slug format.");
  try { const dataToSend: Partial<Omit<BlogPost, keyof AppwriteDocument>> = { title: postData.title.trim(), slug: postData.slug.trim(), content: postData.content, author: postData.author.trim(), category: postData.category?.trim() || undefined, imageUrl: postData.imageUrl?.trim() || undefined, imageFileId: postData.imageFileId?.trim() || undefined, tags: postData.tags?.map(tag => tag.trim()).filter(Boolean) || [], publishedAt: postData.publishedAt || undefined, }; const filteredDataToSend = Object.fromEntries(Object.entries(dataToSend).filter(([_, v]) => v !== undefined)); const permissions = [ Permission.read(Role.any()), Permission.update(Role.label('admin')), Permission.delete(Role.label('admin')) ]; return await databases.createDocument<BlogPost>( databaseId, blogCollectionId, ID.unique(), filteredDataToSend, permissions ); }
  catch (error) { if (error instanceof AppwriteException && error.code === 409 && error.message.toLowerCase().includes('slug')) { const slugErr = new Error(`Slug "${postData.slug}" already taken.`); handleAppwriteError(slugErr, 'creating blog post (slug conflict)', false); throw slugErr; } handleAppwriteError(error, 'creating blog post'); throw error; }
};
export const getBlogPost = async (id: string): Promise<BlogPost | null> => {
    if (!blogCollectionId) { console.warn("Blog Collection ID not configured."); return null; } if (!id?.trim()) { console.warn("getBlogPost invalid ID."); return null; }
    try { return await databases.getDocument<BlogPost>(databaseId, blogCollectionId, id); }
    catch (error) { if (error instanceof AppwriteException && error.code === 404) return null; handleAppwriteError(error, `fetching blog post ID ${id}`, false); return null; }
};
export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
    if (!blogCollectionId) { console.error("Blog Collection ID not configured."); return null; } if (!slug?.trim()) { console.warn("getBlogPostBySlug invalid slug."); return null; }
    try { const response = await databases.listDocuments<BlogPost>( databaseId, blogCollectionId, [ Query.equal('slug', slug.trim()), Query.limit(1) ] ); return response.documents.length > 0 ? response.documents[0] : null; }
    catch (error) { if (error instanceof AppwriteException && error.code === 400 && error.message.toLowerCase().includes('index not found')) { console.error(`Error fetching blog by slug: 'slug' attribute likely not indexed in '${blogCollectionId}'.`); } else { handleAppwriteError(error, `fetching blog post slug "${slug}"`, false); } return null; }
};
export const updateBlogPost = async (documentId: string, postData: UpdateBlogPostData): Promise<BlogPost> => {
    if (!blogCollectionId) throw new Error("Blog Collection ID not configured."); if (!documentId) throw new Error("Document ID required for update.");
    const dataToUpdate: UpdateBlogPostData = { ...postData };
    if (dataToUpdate.slug !== undefined) { dataToUpdate.slug = dataToUpdate.slug?.trim(); if (!dataToUpdate.slug) throw new Error("Slug cannot be empty if provided."); const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/; if (!slugRegex.test(dataToUpdate.slug)) throw new Error("Invalid slug format."); }
    if (dataToUpdate.title !== undefined) dataToUpdate.title = dataToUpdate.title.trim(); if (dataToUpdate.category !== undefined) dataToUpdate.category = dataToUpdate.category.trim() || undefined; if (dataToUpdate.imageUrl !== undefined) dataToUpdate.imageUrl = dataToUpdate.imageUrl.trim() || undefined; if (dataToUpdate.imageFileId !== undefined) dataToUpdate.imageFileId = dataToUpdate.imageFileId.trim() || undefined; if (dataToUpdate.tags !== undefined) { if (dataToUpdate.tags === null) dataToUpdate.tags = []; else if (Array.isArray(dataToUpdate.tags)) dataToUpdate.tags = dataToUpdate.tags.map(tag => String(tag ?? '').trim()).filter(Boolean); else { console.warn("updateBlogPost: 'tags' invalid."); delete dataToUpdate.tags; } }
    const filteredUpdateData = Object.fromEntries(Object.entries(dataToUpdate).filter(([_, v]) => v !== undefined));
    if (Object.keys(filteredUpdateData).length === 0) { console.warn("updateBlogPost called with no data to update:", documentId); const currentPost = await getBlogPost(documentId); if (!currentPost) throw new Error(`Blog post ${documentId} not found.`); return currentPost; }
    try { return await databases.updateDocument<BlogPost>( databaseId, blogCollectionId, documentId, filteredUpdateData ); }
    catch (error) { if (filteredUpdateData.slug && error instanceof AppwriteException && error.code === 409 && error.message.toLowerCase().includes('slug')) { const slugErr = new Error(`Slug "${filteredUpdateData.slug}" already taken.`); handleAppwriteError(slugErr, `updating blog post ${documentId} (slug conflict)`, false); throw slugErr; } handleAppwriteError(error, `updating blog post ${documentId}`); throw error; }
};
export const deleteBlogPost = async (documentId: string, imageFileId?: string, imageBucketId?: string): Promise<void> => {
    if (!blogCollectionId) throw new Error("Blog Collection ID not configured."); if (!documentId) throw new Error("Document ID required for delete."); if (imageFileId && !imageBucketId) console.warn(`deleteBlogPost: imageFileId provided without imageBucketId.`);
    try { if (imageFileId && imageBucketId) { try { await storage.deleteFile(imageBucketId, imageFileId); } catch (fileError) { handleAppwriteError(fileError, `deleting image file ${imageFileId}`, false); console.warn(`Proceeding to delete blog doc ${documentId}.`); } } await databases.deleteDocument(databaseId, blogCollectionId, documentId); }
    catch (error) { handleAppwriteError(error, `deleting blog post ${documentId}`); throw error; }
};


// --- User Profile Functions ---
export const createUserProfile = async (userId: string, profileData: Partial<Omit<UserProfile, keyof AppwriteDocument | 'userId' | 'profilePhotoUrl'>>): Promise<UserProfile> => {
    if (!profilesCollectionId) throw new Error("Profile Collection ID not configured."); if (!userId) throw new Error("User ID required for profile.");
    try { const existingProfile = await getUserProfile(userId); if (existingProfile) { console.warn(`Profile exists for ${userId}. Updating.`); const dataToUpdate = { ...profileData }; delete (dataToUpdate as any).userId; return updateUserProfile(existingProfile.$id, dataToUpdate); } else { const dataToSend: Record<string, any> = { userId: userId, ...profileData }; if (!Array.isArray(dataToSend.dietaryPreferences)) dataToSend.dietaryPreferences = []; const userRole = Role.user(userId); const permissions = [ Permission.read(userRole), Permission.update(userRole), Permission.delete(userRole) ]; return await databases.createDocument<UserProfile>( databaseId, profilesCollectionId, ID.unique(), dataToSend, permissions ); } }
    catch (error) { handleAppwriteError(error, `creating/updating profile for user ${userId}`); throw error; }
};
export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!profilesCollectionId) { console.error("Profile Collection ID not configured!"); return null; } if (!userId) { console.warn("getUserProfile called with no userId."); return null; }
    try { const response = await databases.listDocuments<UserProfile>( databaseId, profilesCollectionId, [ Query.equal('userId', userId), Query.limit(1) ] ); if (response.documents.length > 0) { const profile = response.documents[0]; if (profile.profilePhotoId && profileBucketId) { try { const url = getFilePreview(profile.profilePhotoId, profileBucketId); profile.profilePhotoUrl = url?.href; } catch (e) { handleAppwriteError(e, `generating profile photo URL`, false); profile.profilePhotoUrl = undefined; } } else { profile.profilePhotoUrl = undefined; } if (!Array.isArray(profile.dietaryPreferences)) profile.dietaryPreferences = []; return profile; } else { return null; } }
    catch (error) { if (error instanceof AppwriteException && error.code === 400 && error.message.toLowerCase().includes('index not found')) { console.error(`Error fetching profile: 'userId' attribute likely not indexed in '${profilesCollectionId}'.`); } handleAppwriteError(error, `fetching profile for user ${userId}`, false); return null; }
};
export const updateUserProfile = async (profileDocumentId: string, profileData: Partial<Omit<UserProfile, keyof AppwriteDocument | 'userId' | 'profilePhotoUrl'>>): Promise<UserProfile> => {
     if (!profilesCollectionId) throw new Error("Profile Collection ID not configured."); if (!profileDocumentId) throw new Error("Profile document ID required for update.");
    try { const dataToUpdate = { ...profileData }; delete (dataToUpdate as any).userId; delete (dataToUpdate as any).email; delete (dataToUpdate as any).profilePhotoUrl; const filteredUpdateData = Object.fromEntries(Object.entries(dataToUpdate).filter(([_, v]) => v !== undefined)); if (filteredUpdateData.hasOwnProperty('dietaryPreferences')) { if (filteredUpdateData.dietaryPreferences === null) filteredUpdateData.dietaryPreferences = []; else if (!Array.isArray(filteredUpdateData.dietaryPreferences)) { console.warn("updateUserProfile: dietaryPreferences invalid."); delete filteredUpdateData.dietaryPreferences; } } if (Object.keys(filteredUpdateData).length === 0) { console.warn("updateUserProfile called with no data to update:", profileDocumentId); return await databases.getDocument<UserProfile>(databaseId, profilesCollectionId, profileDocumentId); } return await databases.updateDocument<UserProfile>( databaseId, profilesCollectionId, profileDocumentId, filteredUpdateData ); }
    catch (error) { handleAppwriteError(error, `updating profile document ${profileDocumentId}`); throw error; }
};
export const uploadProfilePhoto = async (file: File, userId: string): Promise<Models.File> => {
    if (!profileBucketId) throw new Error("Profile Photo Bucket ID not configured."); if (!file) throw new Error("No file provided for profile photo."); if (!userId) throw new Error("User ID required for profile photo permissions.");
    try { const userRole = Role.user(userId); const permissions = [ Permission.read(userRole) ]; return await storage.createFile(profileBucketId, ID.unique(), file, permissions); }
    catch (error) { handleAppwriteError(error, `uploading profile photo for user ${userId}`); throw error; }
};


// --- Medical Document Functions ---
export const uploadMedicalDocument = async (file: File, userId: string, description?: string): Promise<Models.File> => {
    if (!userId || !medicalBucketId || !medicalDocumentsCollectionId || !file) throw new Error("User ID, bucket/collection IDs, and file required.");
    let uploadedFile: Models.File | null = null; const fileId = ID.unique();
    try { const userRole = Role.user(userId); const filePermissions = [ Permission.read(userRole), Permission.delete(userRole) ]; uploadedFile = await storage.createFile(medicalBucketId, fileId, file, filePermissions); const docData: Omit<MedicalDocument, keyof AppwriteDocument> = { userId, fileId: uploadedFile.$id, fileName: file.name, documentType: file.type || 'application/octet-stream', description: description?.trim() || undefined }; const docPermissions = [ Permission.read(userRole), Permission.update(userRole), Permission.delete(userRole) ]; await databases.createDocument<MedicalDocument>( databaseId, medicalDocumentsCollectionId, ID.unique(), docData, docPermissions ); return uploadedFile; }
    catch (error) { if (uploadedFile?.$id) { console.warn(`DB record failed after file upload (${uploadedFile.$id}). Deleting orphaned file.`); try { await storage.deleteFile(medicalBucketId, uploadedFile.$id); console.log(`Orphaned file ${uploadedFile.$id} deleted.`); } catch (deleteError) { console.error(`CRITICAL: Failed to delete orphaned file ${uploadedFile.$id}. Manual cleanup needed.`, deleteError); handleAppwriteError(deleteError, `deleting orphaned file ${uploadedFile.$id}`, false); } } handleAppwriteError(error, `uploading medical document for user ${userId}`); throw error; }
};
export const getUserMedicalDocuments = async (userId: string): Promise<MedicalDocument[]> => {
    if (!userId || !medicalDocumentsCollectionId) { console.warn("getUserMedicalDocuments: User ID or Collection ID missing."); return []; }
    try { const response = await databases.listDocuments<MedicalDocument>( databaseId, medicalDocumentsCollectionId, [ Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(100) ] ); return response.documents; }
    catch (error) { handleAppwriteError(error, `fetching medical documents for user ${userId}`, false); return []; }
};
export const deleteMedicalDocument = async (document: MedicalDocument): Promise<void> => {
     if (!document?.$id || !document?.fileId || !medicalBucketId || !medicalDocumentsCollectionId) throw new Error("Invalid document/config for deletion.");
    try { await storage.deleteFile(medicalBucketId, document.fileId); await databases.deleteDocument(databaseId, medicalDocumentsCollectionId, document.$id); }
    catch (error) { handleAppwriteError(error, `deleting medical document (DocID: ${document.$id}, FileID: ${document.fileId})`); throw error; }
};


// --- File Utility Functions ---
export const getFilePreview = (fileId: string, bucketIdToUse: string): URL | null => {
    if (!fileId?.trim() || !bucketIdToUse?.trim()) { console.error("getFilePreview requires valid fileId and bucketId."); return null; }
    try { const urlString = storage.getFileView(bucketIdToUse, fileId); return new URL(urlString); }
    catch (error) { handleAppwriteError(error, `getting file view URL for file ${fileId} in bucket ${bucketIdToUse}`, false); return null; }
};


// --- Appointment Functions ---
export const createAppointment = async (userId: string, appointmentData: CreateAppointmentData): Promise<Appointment> => {
     if (!userId || !appointmentsCollectionId || !appointmentData?.date?.trim() || !appointmentData?.time?.trim()) throw new Error("User ID, collection ID, date, and time required.");
    try { const dataToCreate: Omit<Appointment, keyof AppwriteDocument> = { userId: userId, date: appointmentData.date.trim(), time: appointmentData.time.trim(), isCompleted: appointmentData.isCompleted ?? false, appointmentType: appointmentData.appointmentType?.trim() || 'General', notes: appointmentData.notes?.trim() || undefined, }; const userRole = Role.user(userId); const permissions = [ Permission.read(userRole), Permission.update(userRole), Permission.delete(userRole) ]; return await databases.createDocument<Appointment>( databaseId, appointmentsCollectionId, ID.unique(), dataToCreate, permissions ); }
    catch (error) { handleAppwriteError(error, `creating appointment for user ${userId}`); throw error; }
};
export const getUserAppointments = async (userId: string): Promise<Appointment[]> => {
  if (!userId || !appointmentsCollectionId) { console.warn("getUserAppointments: User ID or Collection ID missing."); return []; }
 try { const response = await databases.listDocuments<Appointment>( databaseId, appointmentsCollectionId, [ Query.equal('userId', userId), Query.orderAsc('date'), Query.limit(100) ] ); return response.documents; }
 catch (error) { handleAppwriteError(error, `fetching appointments for user ${userId}`, false); return []; }
};
export const updateAppointment = async (appointmentDocumentId: string, appointmentData: Partial<Omit<Appointment, keyof AppwriteDocument | 'userId'>>): Promise<Appointment> => {
     if (!appointmentsCollectionId || !appointmentDocumentId) throw new Error("Collection ID and document ID required for update.");
    try { const dataToUpdate = { ...appointmentData }; delete (dataToUpdate as any).userId; const filteredUpdateData = Object.fromEntries(Object.entries(dataToUpdate).filter(([_, v]) => v !== undefined)); if (Object.keys(filteredUpdateData).length === 0) { console.warn(`updateAppointment called with no data for doc ${appointmentDocumentId}.`); return await databases.getDocument<Appointment>(databaseId, appointmentsCollectionId, appointmentDocumentId); } return await databases.updateDocument<Appointment>( databaseId, appointmentsCollectionId, appointmentDocumentId, filteredUpdateData ); }
    catch (error) { handleAppwriteError(error, `updating appointment ${appointmentDocumentId}`); throw error; }
};
export const deleteAppointment = async (appointmentDocumentId: string): Promise<void> => {
     if (!appointmentsCollectionId || !appointmentDocumentId) throw new Error("Collection ID and document ID required for deletion.");
    try { await databases.deleteDocument(databaseId, appointmentsCollectionId, appointmentDocumentId); }
    catch (error) { handleAppwriteError(error, `deleting appointment ${appointmentDocumentId}`); throw error; }
};


// --- Health Reading Functions ---
const createHealthReading = async <T extends HealthReadingBase, D extends object>( userId: string, collectionId: string, collectionName: string, data: D, requiredFields: (keyof D)[] ): Promise<T> => {
    if (!userId || !collectionId || !data) throw new Error(`User ID, Collection ID, and data required for ${collectionName}.`);
    for (const field of requiredFields) { const value = (data as any)[field]; if (value === null || value === undefined || String(value).trim() === '') throw new Error(`Field '${String(field)}' required for ${collectionName}.`); if (typeof value === 'number' && isNaN(value)) throw new Error(`Field '${String(field)}' must be valid number.`); if (typeof value === 'number' && value < 0 && !(collectionName === 'Blood Sugar' && field === 'level' && value === 0)) throw new Error(`Field '${String(field)}' must be non-negative.`); }
    try { const payload = { userId, ...data, recordedAt: new Date().toISOString() } as Omit<T, keyof AppwriteDocument>; const userRole = Role.user(userId); const permissions = [ Permission.read(userRole), Permission.delete(userRole) ]; return await databases.createDocument<T>(databaseId, collectionId, ID.unique(), payload, permissions); }
    catch (error) { handleAppwriteError(error, `creating ${collectionName} reading for user ${userId}`); throw error; }
};
const getHealthReadings = async <T extends HealthReadingBase>( userId: string, collectionId: string, collectionName: string, limit: number = 50 ): Promise<T[]> => {
    if (!userId || !collectionId) { console.warn(`getHealthReadings (${collectionName}): User ID or Collection ID missing.`); return []; }
    try { const response = await databases.listDocuments<T>( databaseId, collectionId, [ Query.equal('userId', userId), Query.orderDesc('recordedAt'), Query.limit(limit) ] ); return response.documents; }
    catch (error) { handleAppwriteError(error, `fetching ${collectionName} readings for user ${userId}`, false); return []; }
};
const deleteHealthReading = async (documentId: string, collectionId: string, collectionName: string): Promise<void> => {
    if (!collectionId || !documentId) throw new Error(`Collection ID and Document ID required for deleting ${collectionName}.`);
    try { await databases.deleteDocument(databaseId, collectionId, documentId); }
    catch (error) { handleAppwriteError(error, `deleting ${collectionName} reading ${documentId}`); throw error; }
};
export const createBloodPressureReading = (userId: string, data: CreateBPData): Promise<BloodPressureReading> => createHealthReading<BloodPressureReading, CreateBPData>(userId, bloodPressureCollectionId, 'Blood Pressure', data, ['systolic', 'diastolic']);
export const getBloodPressureReadings = (userId: string, limit: number = 50): Promise<BloodPressureReading[]> => getHealthReadings<BloodPressureReading>(userId, bloodPressureCollectionId, 'Blood Pressure', limit);
export const deleteBloodPressureReading = (documentId: string): Promise<void> => deleteHealthReading(documentId, bloodPressureCollectionId, 'Blood Pressure');
export const createBloodSugarReading = (userId: string, data: CreateSugarData): Promise<BloodSugarReading> => createHealthReading<BloodSugarReading, CreateSugarData>(userId, bloodSugarCollectionId, 'Blood Sugar', data, ['level', 'measurementType']);
export const getBloodSugarReadings = (userId: string, limit: number = 50): Promise<BloodSugarReading[]> => getHealthReadings<BloodSugarReading>(userId, bloodSugarCollectionId, 'Blood Sugar', limit);
export const deleteBloodSugarReading = (documentId: string): Promise<void> => deleteHealthReading(documentId, bloodSugarCollectionId, 'Blood Sugar');
export const createWeightReading = (userId: string, data: CreateWeightData): Promise<WeightReading> => createHealthReading<WeightReading, CreateWeightData>(userId, weightCollectionId, 'Weight', data, ['weight', 'unit']);
export const getWeightReadings = (userId: string, limit: number = 50): Promise<WeightReading[]> => getHealthReadings<WeightReading>(userId, weightCollectionId, 'Weight', limit);
export const deleteWeightReading = (documentId: string): Promise<void> => deleteHealthReading(documentId, weightCollectionId, 'Weight');


// --- Medication Reminder Functions ---
export const createMedicationReminder = async (userId: string, data: CreateMedicationReminderData): Promise<MedicationReminder> => {
    if (!userId || !medicationRemindersCollectionId || !data.medicationName?.trim() || !data.dosage?.trim() || !data.frequency?.trim()) throw new Error("User ID, Collection ID, name, dosage, frequency required.");
    try { const payload: Omit<MedicationReminder, keyof AppwriteDocument> = { userId, medicationName: data.medicationName.trim(), dosage: data.dosage.trim(), frequency: data.frequency.trim(), times: data.times?.map(t => t.trim()).filter(Boolean) || [], notes: data.notes?.trim() || undefined, isActive: data.isActive ?? true, }; const userRole = Role.user(userId); const permissions = [ Permission.read(userRole), Permission.update(userRole), Permission.delete(userRole) ]; return await databases.createDocument<MedicationReminder>( databaseId, medicationRemindersCollectionId, ID.unique(), payload, permissions ); }
    catch (error) { handleAppwriteError(error, `creating medication reminder for user ${userId}`); throw error; }
};
export const getMedicationReminders = async (userId: string, onlyActive: boolean = true): Promise<MedicationReminder[]> => {
    if (!userId || !medicationRemindersCollectionId) { console.warn("getMedicationReminders: User ID or Collection ID missing."); return []; }
    try { const queries: string[] = [ Query.equal('userId', userId), Query.orderDesc('$createdAt'), Query.limit(50) ]; if (onlyActive) queries.push(Query.equal('isActive', true)); const response = await databases.listDocuments<MedicationReminder>(databaseId, medicationRemindersCollectionId, queries); return response.documents; }
    catch (error) { handleAppwriteError(error, `fetching medication reminders for user ${userId}`, false); return []; }
};
export const deleteMedicationReminder = async (documentId: string): Promise<void> => {
    if (!medicationRemindersCollectionId || !documentId) throw new Error("Collection ID and Document ID required for deletion.");
    try { await databases.deleteDocument(databaseId, medicationRemindersCollectionId, documentId); }
    catch (error) { handleAppwriteError(error, `deleting medication reminder ${documentId}`); throw error; }
};
export const updateMedicationReminder = async (documentId: string, data: Partial<Omit<MedicationReminder, keyof AppwriteDocument | 'userId'>>): Promise<MedicationReminder> => {
    if (!medicationRemindersCollectionId || !documentId) throw new Error("Collection ID and Document ID required for update.");
    try { const dataToUpdate = { ...data }; delete (dataToUpdate as any).userId; const filteredUpdateData = Object.fromEntries(Object.entries(dataToUpdate).filter(([_, v]) => v !== undefined)); if (filteredUpdateData.hasOwnProperty('times')) { if (filteredUpdateData.times === null) filteredUpdateData.times = []; else if (!Array.isArray(filteredUpdateData.times)) { console.warn("updateMedicationReminder: 'times' invalid."); filteredUpdateData.times = []; } else { filteredUpdateData.times = filteredUpdateData.times.map(t => String(t ?? '').trim()).filter(Boolean); } } if (Object.keys(filteredUpdateData).length === 0) { console.warn(`updateMedicationReminder called with no data for doc ${documentId}.`); return await databases.getDocument<MedicationReminder>(databaseId, medicationRemindersCollectionId, documentId); } return await databases.updateDocument<MedicationReminder>( databaseId, medicationRemindersCollectionId, documentId, filteredUpdateData ); }
    catch (error) { handleAppwriteError(error, `updating medication reminder ${documentId}`); throw error; }
};


// --- Chat History Functions ---
export const saveChatMessage = async ( userId: string, role: 'user' | 'model', content: string, sessionId: string ): Promise<ChatHistoryMessage> => {
    if (!userId) throw new Error("User ID required for chat message.");
    if (!chatHistoryCollectionId) throw new Error("Chat History Collection ID not configured.");
    if (!sessionId) throw new Error("Session ID required for chat message.");
    const trimmedContent = content?.trim();
    if (!trimmedContent) { console.warn("Attempted to save empty chat message."); throw new Error("Cannot save empty message content."); }
    try {
        const payload: Omit<ChatHistoryMessage, keyof AppwriteDocument> = { userId, role, content: trimmedContent, timestamp: new Date().toISOString(), sessionId };
        const userRole = Role.user(userId); const permissions = [ Permission.read(userRole), Permission.delete(userRole) ]; // User can read/delete their messages
        return await databases.createDocument<ChatHistoryMessage>( databaseId, chatHistoryCollectionId, ID.unique(), payload, permissions );
    } catch (error) { handleAppwriteError(error, `saving chat message for user ${userId} in session ${sessionId}`); throw error; }
};

export const getUserChatHistoryForSession = async (userId: string, sessionId: string, limit: number = 500): Promise<ChatHistoryMessage[]> => {
    if (!userId) { console.warn("getUserChatHistoryForSession called with no userId."); return []; }
    // Allow empty sessionId for fetching recent overall messages if needed by getChatSessionsList logic
    // if (!sessionId) { console.warn("getUserChatHistoryForSession called with no sessionId."); return []; }
    if (!chatHistoryCollectionId) { console.warn("Chat History Collection ID not configured."); return []; }
    try {
        const queries: string[] = [ Query.equal('userId', userId), Query.limit(limit) ];
        let sortOrder = Query.orderAsc('timestamp'); // Default: oldest first for session loading

        // Only add session filter if sessionId is provided
        if (sessionId) {
            queries.push(Query.equal('sessionId', sessionId));
        } else {
            // If no session ID, fetch newest overall messages for context priming
            sortOrder = Query.orderDesc('timestamp');
            console.warn("Fetching overall recent history as no session ID provided to getUserChatHistoryForSession");
        }
        queries.push(sortOrder); // Add the determined sort order

        const response = await databases.listDocuments<ChatHistoryMessage>( databaseId, chatHistoryCollectionId, queries );

        // If we fetched descending for overall history (no sessionId), reverse it now for chronological context
        return sessionId ? response.documents : response.documents.reverse();
    } catch (error) {
        handleAppwriteError(error, `fetching chat history for user ${userId}, session ${sessionId || 'any'}`, false);
        return [];
    }
};


// --- Chat Session List Function ---
export const getChatSessionsList = async (userId: string, messageLimit: number = 200): Promise<ChatSessionInfo[]> => {
    if (!userId) { console.warn("getChatSessionsList called with no userId."); return []; }
    if (!chatHistoryCollectionId) { console.warn("Chat History Collection ID not configured."); return []; }
    try {
        // Fetch the most recent N messages across all sessions for the user
        const response = await databases.listDocuments<ChatHistoryMessage>(
            databaseId, chatHistoryCollectionId,
            [ Query.equal('userId', userId), Query.orderDesc('timestamp'), Query.limit(messageLimit) ]
        );
        if (response.documents.length === 0) return [];

        // Group messages by session and find latest timestamp for each
        const sessionsMap = new Map<string, { latestTimestamp: string; firstUserMessageContent: string; messageCount: number }>();
        const messagesBySession = new Map<string, ChatHistoryMessage[]>();

        for (const message of response.documents) {
            if (!message.sessionId) continue; // Skip messages without session ID

            // Store the latest timestamp encountered for this session
            if (!sessionsMap.has(message.sessionId)) {
                sessionsMap.set(message.sessionId, {
                    latestTimestamp: message.timestamp,
                    firstUserMessageContent: '', // Placeholder, will be filled below
                    messageCount: 0
                });
            }

            // Group all messages by session ID
            if (!messagesBySession.has(message.sessionId)) {
                messagesBySession.set(message.sessionId, []);
            }
            messagesBySession.get(message.sessionId)?.push(message); // Add newest first initially
        }

        const refinedSessions: ChatSessionInfo[] = [];
        for (const [sessionId, sessionData] of sessionsMap.entries()) {
            const sessionMessages = messagesBySession.get(sessionId)?.reverse() || []; // Reverse to get oldest first
            if (sessionMessages.length > 0) {
                const firstMessage = sessionMessages[0]; // The actual oldest message in the fetched batch
                const firstUserMessage = sessionMessages.find(m => m.role === 'user');
                const preview = firstUserMessage?.content.substring(0, 40) + (firstUserMessage?.content.length ?? 0 > 40 ? '...' : '') || '[AI Started Chat]';

                try {
                    // Use the latestTimestamp for relative date calculation
                    const relativeDate = formatDistanceToNow(parseISO(sessionData.latestTimestamp), { addSuffix: true });
                    refinedSessions.push({
                        sessionId,
                        firstMessageTimestamp: firstMessage.timestamp, // Timestamp of the oldest message
                        preview,
                        relativeDate, // Relative time of the newest message
                        messageCount: sessionMessages.length // Count based on fetched messages
                    });
                } catch (dateError) {
                    console.error(`Error parsing date for session ${sessionId}: ${sessionData.latestTimestamp}`, dateError);
                    refinedSessions.push({ sessionId, firstMessageTimestamp: firstMessage.timestamp, preview, relativeDate: "unknown date", messageCount: sessionMessages.length });
                }
            }
        }

        // Sort the final list by the latest message timestamp (descending - newest session first)
        refinedSessions.sort((a, b) => {
            const tsA = sessionsMap.get(a.sessionId)?.latestTimestamp || a.firstMessageTimestamp;
            const tsB = sessionsMap.get(b.sessionId)?.latestTimestamp || b.firstMessageTimestamp;
            // Handle potential date parsing errors during sort
            try { return parseISO(tsB).getTime() - parseISO(tsA).getTime(); }
            catch { return 0; } // Keep original order if dates are invalid
        });

        return refinedSessions;

    } catch (error) {
        handleAppwriteError(error, `fetching chat session list for user ${userId}`, false);
        return [];
    }
};
// --- NEW: Delete Chat Session History Function ---
/**
 * Deletes all messages associated with a specific chat session for a user.
 * NOTE: Fetches messages in batches and deletes them. May be slow for very long sessions.
 * @param userId The user's ID.
 * @param sessionId The ID of the session to delete.
 * @returns Object indicating success, deleted count, and failed count.
 */
export const deleteChatSessionHistory = async (userId: string, sessionId: string): Promise<{ success: boolean; deletedCount: number; failedCount: number }> => {
    if (!userId) throw new Error("User ID required to delete chat session.");
    if (!sessionId) throw new Error("Session ID required to delete chat session.");
    if (!chatHistoryCollectionId) throw new Error("Chat History Collection ID not configured.");

    console.log(`Attempting to delete chat session: ${sessionId} for user: ${userId}`);
    let deletedCount = 0;
    let failedCount = 0;
    let hasMore = true;
    let lastId: string | undefined = undefined;
    const batchLimit = 100; // Appwrite max limit per listDocuments call

    try {
        while (hasMore) {
            const queries = [
                Query.equal('userId', userId),
                Query.equal('sessionId', sessionId),
                Query.limit(batchLimit) // Fetch in batches
            ];
            // Use cursor pagination for potentially large histories
            if (lastId) {
                queries.push(Query.cursorAfter(lastId));
            }

            const response = await databases.listDocuments<ChatHistoryMessage>(
                databaseId, chatHistoryCollectionId, queries
            );

            const messagesToDelete = response.documents;
            if (messagesToDelete.length === 0) {
                hasMore = false;
                break; // Exit loop if no more messages found
            }

            console.log(`Found ${messagesToDelete.length} messages in batch for session ${sessionId} to delete...`);

            // Prepare delete promises
            const deletePromises = messagesToDelete.map(msg =>
                databases.deleteDocument(databaseId, chatHistoryCollectionId, msg.$id)
            );

            // Execute deletions concurrently
            const results = await Promise.allSettled(deletePromises);

            // Count successes and failures
            results.forEach((result, index) => {
                if (result.status === 'fulfilled') {
                    deletedCount++;
                } else {
                    failedCount++;
                    console.error(`Failed to delete message ${messagesToDelete[index].$id}:`, result.reason);
                }
            });

            // Update cursor for next batch
            if (messagesToDelete.length < batchLimit) {
                hasMore = false; // Last batch
            } else {
                lastId = messagesToDelete[messagesToDelete.length - 1].$id; // Set cursor for next iteration
            }
        }

        console.log(`Deletion complete for session ${sessionId}. Deleted: ${deletedCount}, Failed: ${failedCount}`);
        return { success: failedCount === 0, deletedCount, failedCount };

    } catch (error) {
        handleAppwriteError(error, `deleting chat session history for user ${userId}, session ${sessionId}`);
        // Return failure state even if some deletions succeeded before the error
        return { success: false, deletedCount, failedCount: failedCount + (hasMore ? 1 : 0) }; // Assume at least one more failure if loop broke unexpectedly
    }
};


// --- Bookmarking Functions ---
export const addBookmark = async (userId: string, data: CreateBookmarkData): Promise<BookmarkedMessage> => {
    if (!userId || !bookmarkedMessagesCollectionId || !data.messageContent?.trim()) throw new Error("User ID, Collection ID, and message content required.");
    const trimmedContent = data.messageContent.trim();
    try { const payload: Omit<BookmarkedMessage, keyof AppwriteDocument> = { userId, messageContent: trimmedContent, bookmarkedAt: new Date().toISOString(), }; const userRole = Role.user(userId); const permissions = [ Permission.read(userRole), Permission.update(userRole), Permission.delete(userRole) ]; return await databases.createDocument<BookmarkedMessage>( databaseId, bookmarkedMessagesCollectionId, ID.unique(), payload, permissions ); }
    catch (error) { handleAppwriteError(error, `adding bookmark for user ${userId}`); throw error; }
};
export const getBookmarks = async (userId: string): Promise<BookmarkedMessage[]> => {
    if (!userId || !bookmarkedMessagesCollectionId) { console.warn("getBookmarks: User ID or Collection ID missing."); return []; }
    try { const response = await databases.listDocuments<BookmarkedMessage>( databaseId, bookmarkedMessagesCollectionId, [ Query.equal('userId', userId), Query.orderDesc('bookmarkedAt'), Query.limit(100) ] ); return response.documents; }
    catch (error) { handleAppwriteError(error, `fetching bookmarks for user ${userId}`, false); return []; }
};
export const deleteBookmark = async (bookmarkDocumentId: string): Promise<void> => {
    if (!bookmarkedMessagesCollectionId || !bookmarkDocumentId) throw new Error("Collection ID and Document ID required for deletion.");
    try { await databases.deleteDocument(databaseId, bookmarkedMessagesCollectionId, bookmarkDocumentId); }
    catch (error) { handleAppwriteError(error, `deleting bookmark ${bookmarkDocumentId}`); throw error; }
};


// --- Chat Image Upload Function ---
export const uploadChatImage = async (file: File, userId: string): Promise<Models.File> => {
    if (!chatImagesBucketId) throw new Error("Chat Images Bucket ID not configured."); if (!file) throw new Error("No file provided for chat image upload."); if (!userId) throw new Error("User ID required for chat image permissions.");
    if (!file.type.startsWith('image/')) { console.error(`Invalid file type for chat image: ${file.type}`); throw new Error("Invalid file type. Please upload an image."); }
    try { const userRole = Role.user(userId); const permissions = [ Permission.read(userRole), Permission.delete(userRole), ]; const fileId = ID.unique(); const uploadedFile = await storage.createFile(chatImagesBucketId, fileId, file, permissions); return uploadedFile; }
    catch (error) { handleAppwriteError(error, `uploading chat image for user ${userId}`); throw error; }
};
// --- NEW: Forum Functions ---

/**
 * Creates a new forum topic.
 * Also sets initial lastReplyAt and replyCount.
 */
export const createForumTopic = async (
    userId: string,
    userName: string,
    userAvatarUrl: string | undefined,
    data: CreateForumTopicData
): Promise<ForumTopic> => {
    if (!userId || !forumTopicsCollectionId || !data.title?.trim() || !data.content?.trim()) {
        throw new Error("User ID, Topic Collection ID, title, and content are required.");
    }
    if (!userName?.trim()) {
        console.warn("createForumTopic called without userName, using 'Anonymous'.");
        userName = 'Anonymous';
    }

    try {
        const now = new Date().toISOString();
        const payload: Omit<ForumTopic, keyof AppwriteDocument> = {
            userId,
            userName: userName.trim(),
            userAvatarUrl: userAvatarUrl?.trim() || undefined,
            title: data.title.trim(),
            content: data.content.trim(),
            category: data.category?.trim() || undefined,
            lastReplyAt: now,
            replyCount: 0,
            isLocked: false,
            isPinned: false,
            voteScore: 0, // *** Initialize vote score ***
        };

        const userRole = Role.user(userId);
        const permissions = [
            Permission.read(Role.users()),
            Permission.update(userRole),
            // Permission.update(Role.team('admin')), // Optional admin update
            Permission.delete(userRole),
            // Permission.delete(Role.team('admin')), // Optional admin delete
        ];

        return await databases.createDocument<ForumTopic>(
            databaseId, forumTopicsCollectionId, ID.unique(), payload, permissions
        );
    } catch (error) {
        handleAppwriteError(error, `creating forum topic for user ${userId}`);
        throw error;
    }
};

/**
 * Fetches forum topics. Supports filtering, sorting, and searching.
 * Requires full-text index on 'title' and 'content' in forumTopicsCollectionId.
 */
export const getForumTopics = async (
    category?: string,
    limit: number = 25,
    offset: number = 0,
    sortBy: 'lastReplyAt' | 'createdAt' | 'voteScore' = 'lastReplyAt', // Added voteScore sort
    searchQuery?: string
): Promise<Models.DocumentList<ForumTopic>> => {
    if (!forumTopicsCollectionId) {
        console.warn("Forum Topics Collection ID not configured.");
        return { total: 0, documents: [] };
    }
    try {
        const queries: string[] = [ Query.limit(limit), Query.offset(offset) ];

        // Search - must be combined with filters carefully or done separately
        if (searchQuery?.trim()) {
            // IMPORTANT: Appwrite search often works best standalone or with minimal filters.
            // Combining search with multiple filters/orders can be complex or unsupported.
            // Consider simplifying or performing search as a primary filter if used.
            // This implementation adds search alongside other filters. Test thoroughly.
            queries.push(Query.search('title', searchQuery.trim()));
            // Consider searching content too: Query.search('content', searchQuery.trim()) - Needs index
            // You might need OR logic which requires multiple queries client-side or a backend function.
        }

        // Filtering
        if (category?.trim() && category.toLowerCase() !== 'all') {
            queries.push(Query.equal('category', category.trim()));
        }

        // Sorting - Pinned first, then by chosen criteria
        queries.push(Query.orderDesc('isPinned'));
        switch (sortBy) {
            case 'voteScore':
                queries.push(Query.orderDesc('voteScore'));
                break;
            case 'createdAt':
                queries.push(Query.orderDesc('$createdAt'));
                break;
            case 'lastReplyAt':
            default:
                queries.push(Query.orderDesc('lastReplyAt'));
                break;
        }

        console.log("Executing getForumTopics with queries:", queries); // Debugging

        // Check for potential index issues if search is used with sorts/filters
        if (searchQuery && sortBy) {
             console.warn("Appwrite Query Warning: Combining search with specific sorting/filtering might require specific composite indexes or may have limitations.");
        }


        return await databases.listDocuments<ForumTopic>(
            databaseId, forumTopicsCollectionId, queries
        );
    } catch (error) {
        if (error instanceof AppwriteException && error.code === 400 && error.message.includes('index')) {
             console.error(`Appwrite Index Error: Ensure necessary indexes are created for filtering/sorting/searching in '${forumTopicsCollectionId}'. Missing index for: ${error.message}`);
             handleAppwriteError(error, `fetching forum topics (INDEX ERROR)`, false);
        } else {
            handleAppwriteError(error, `fetching forum topics (category: ${category}, sort: ${sortBy}, search: ${searchQuery})`, false);
        }
        return { total: 0, documents: [] };
    }
};

/** Fetches a single forum topic by ID. */
export const getForumTopic = async (topicId: string): Promise<ForumTopic | null> => {
    // (Keep existing implementation)
    if (!forumTopicsCollectionId || !topicId) { /* ... */ return null; }
    try { return await databases.getDocument<ForumTopic>(databaseId, forumTopicsCollectionId, topicId); }
    catch (error) { /* ... */ return null; }
};

/** Creates a new forum post (reply). Initializes voteScore. Updates topic metadata. */
export const createForumPost = async (
    userId: string,
    userName: string,
    userAvatarUrl: string | undefined,
    data: CreateForumPostData
): Promise<ForumPost> => {
    if (!userId || !forumPostsCollectionId || !data.topicId || !data.content?.trim()) {
        throw new Error("User ID, Post Collection ID, Topic ID, and content are required.");
    }
    if (!userName?.trim()) {
        console.warn("createForumPost called without userName, using 'Anonymous'.");
        userName = 'Anonymous';
    }

    let createdPost: ForumPost | null = null;
    try {
        const payload: Omit<ForumPost, keyof AppwriteDocument> = {
            userId,
            userName: userName.trim(),
            userAvatarUrl: userAvatarUrl?.trim() || undefined,
            topicId: data.topicId,
            content: data.content.trim(),
            voteScore: 0, // *** Initialize vote score ***
        };

        const userRole = Role.user(userId);
        const permissions = [
            Permission.read(Role.users()),
            Permission.update(userRole),
            Permission.delete(userRole),
        ];

        createdPost = await databases.createDocument<ForumPost>(
            databaseId, forumPostsCollectionId, ID.unique(), payload, permissions
        );

        // --- Update parent topic ---
        try {
            const currentTopic = await databases.getDocument<ForumTopic>(
                databaseId, forumTopicsCollectionId, data.topicId
            );
            const topicUpdatePayload = {
                lastReplyAt: createdPost.$createdAt,
                replyCount: (currentTopic.replyCount || 0) + 1
            };
            await databases.updateDocument(
                databaseId, forumTopicsCollectionId, data.topicId, topicUpdatePayload
            );
            console.log(`Updated topic ${data.topicId} metadata after new post.`);
        } catch (topicUpdateError) {
            console.error(`Failed to update topic ${data.topicId} metadata after creating post ${createdPost.$id}:`, topicUpdateError);
            handleAppwriteError(topicUpdateError, `updating topic metadata for ${data.topicId}`, false);
        }
        // --- End Topic Update ---

        return createdPost;

    } catch (error) {
        handleAppwriteError(error, `creating forum post for user ${userId} on topic ${data.topicId}`);
        throw error;
    }
};

/** Fetches posts for a topic. Supports searching within content. */
export const getForumPosts = async (
    topicId: string,
    limit: number = 50,
    offset: number = 0,
    searchQuery?: string // *** NEW: Search within posts ***
): Promise<Models.DocumentList<ForumPost>> => {
    if (!forumPostsCollectionId || !topicId) {
        console.warn("getForumPosts: Collection ID or Topic ID missing.");
        return { total: 0, documents: [] };
    }
    try {
        const queries: string[] = [
            Query.equal('topicId', topicId),
            Query.limit(limit),
            Query.offset(offset),
        ];

        // Add search query if provided
        if (searchQuery?.trim()) {
            queries.push(Query.search('content', searchQuery.trim())); // Requires full-text index on 'content'
            // Default sort might be relevance when searching. Explicitly set order if needed.
             queries.push(Query.orderAsc('$createdAt')); // Or relevance might be preferred
        } else {
            // Default sort order if not searching
            queries.push(Query.orderAsc('$createdAt')); // Show oldest replies first
        }


        return await databases.listDocuments<ForumPost>(
            databaseId, forumPostsCollectionId, queries
        );
    } catch (error) {
         if (error instanceof AppwriteException && error.code === 400 && error.message.includes('index')) {
             console.error(`Appwrite Index Error fetching posts: Ensure full-text index on 'content' exists in '${forumPostsCollectionId}'. Message: ${error.message}`);
             handleAppwriteError(error, `fetching posts (INDEX ERROR)`, false);
         } else {
            handleAppwriteError(error, `fetching posts for topic ${topicId}, search: ${searchQuery}`, false);
         }
        return { total: 0, documents: [] };
    }
};

/** Deletes a forum post. Needs to update topic metadata (reply count, potentially lastReplyAt). */
export const deleteForumPost = async (postId: string, topicId: string): Promise<void> => {
    if (!forumPostsCollectionId || !postId || !topicId) {
        throw new Error("Post/Topic Collection ID, Post ID, and Topic ID are required for deletion.");
    }
    try {
        // 1. Delete the post
        await databases.deleteDocument(databaseId, forumPostsCollectionId, postId);
        console.log(`Deleted post ${postId}`);

        // 2. Update parent topic metadata (decrement count, potentially update lastReplyAt)
        try {
            // Fetch the topic
            const currentTopic = await databases.getDocument<ForumTopic>(databaseId, forumTopicsCollectionId, topicId);
            let newLastReplyAt = currentTopic.lastReplyAt;

            // Find the new latest post if this wasn't the only one
            const remainingPosts = await databases.listDocuments<ForumPost>(databaseId, forumPostsCollectionId, [
                Query.equal('topicId', topicId),
                Query.orderDesc('$createdAt'),
                Query.limit(1)
            ]);

            if (remainingPosts.total > 0) {
                newLastReplyAt = remainingPosts.documents[0].$createdAt;
            } else {
                // If no posts left, set lastReplyAt to topic creation time
                newLastReplyAt = currentTopic.$createdAt;
            }

            const topicUpdatePayload = {
                replyCount: Math.max(0, (currentTopic.replyCount || 0) - 1), // Decrement, ensure non-negative
                lastReplyAt: newLastReplyAt
            };

            await databases.updateDocument(databaseId, forumTopicsCollectionId, topicId, topicUpdatePayload);
            console.log(`Updated topic ${topicId} metadata after deleting post.`);

        } catch (topicUpdateError) {
            console.error(`Failed to update topic ${topicId} metadata after deleting post ${postId}:`, topicUpdateError);
            handleAppwriteError(topicUpdateError, `updating topic metadata post-deletion for ${topicId}`, false);
            // Don't throw, the post is deleted, but log the issue.
        }

    } catch (error) {
        handleAppwriteError(error, `deleting forum post ${postId}`);
        throw error;
    }
};

/**
 * Deletes a forum topic AND all its associated posts.
 * This fetches posts in batches and deletes them, which can be
 * resource-intensive for topics with many posts.
 * Uses cursor pagination for potentially better reliability during deletion.
 *
 * @param topicId The $id of the ForumTopic document to delete.
 * @returns A Promise resolving to an object indicating the outcome:
 *          { postsDeleted: number, postsFailed: number, topicDeleted: boolean }
 * @throws AppwriteException or Error if initial validation fails or critical errors occur.
 */
export const deleteForumTopicAndPosts = async (
    topicId: string
): Promise<{ postsDeleted: number; postsFailed: number; topicDeleted: boolean }> => {

    // 1. Input Validation
    if (!forumTopicsCollectionId || !forumPostsCollectionId || !topicId) {
        throw new Error("Collection IDs (Topics, Posts) and Topic ID are required for deletion.");
    }
    if (typeof topicId !== 'string' || topicId.trim().length === 0) {
         throw new Error("Invalid Topic ID provided for deletion.");
    }

    // 2. Initialization
    let postsDeleted = 0;
    let postsFailed = 0;
    let topicDeleted = false;
    const batchLimit = 100; // Appwrite limit for listDocuments
    let hasMorePosts = true;
    let cursor: string | undefined = undefined; // For cursor pagination

    console.log(`Starting deletion process for topic ${topicId} and its posts...`);

    // 3. Delete Associated Posts in Batches
    try {
        while (hasMorePosts) {
            const postQueries: string[] = [
                Query.equal('topicId', topicId),
                Query.limit(batchLimit),
                Query.orderAsc('$id') // Using $id for consistent ordering with cursor
            ];

            if (cursor) {
                postQueries.push(Query.cursorAfter(cursor));
            }

            // Fetch a batch of posts
            const postResponse = await databases.listDocuments<ForumPost>(
                databaseId,
                forumPostsCollectionId,
                postQueries
            );

            const postsToDelete = postResponse.documents;

            if (postsToDelete.length === 0) {
                console.log(`No more posts found for topic ${topicId}.`);
                hasMorePosts = false; // Exit loop
                break;
            }

            console.log(`Found ${postsToDelete.length} posts in batch for topic ${topicId} to delete (using cursor: ${cursor || 'none'})...`);

            // Prepare delete promises for the current batch
            // We map each deletion attempt to resolve with its outcome status
            const deletePromises = postsToDelete.map(post =>
                databases.deleteDocument(databaseId, forumPostsCollectionId, post.$id)
                    .then(() => ({ status: 'fulfilled' as const, id: post.$id })) // Indicate success
                    .catch(err => ({ status: 'rejected' as const, id: post.$id, reason: err })) // Indicate failure with reason
            );


            // Execute deletions concurrently and wait for all to settle
            const results = await Promise.allSettled(deletePromises);

            // Process results
            results.forEach((settledResult) => {
                // Check if the outer promise (from Promise.allSettled) was fulfilled
                if (settledResult.status === 'fulfilled') {
                    // Now check the inner promise's outcome (from our .then/.catch mapping)
                    const outcome = settledResult.value; // outcome is { status: 'fulfilled'|'rejected', id: string, reason?: any }
                    if (outcome.status === 'fulfilled') {
                        postsDeleted++;
                    } else {
                        // outcome.status === 'rejected'
                        postsFailed++;
                        console.error(`Failed to delete post ${outcome.id} during topic cleanup:`, outcome.reason);
                        handleAppwriteError(outcome.reason, `deleting post ${outcome.id} during topic ${topicId} cleanup`, false);
                    }
                } else {
                    // The outer promise itself was rejected (e.g., network error during Promise.allSettled)
                    // We don't know which specific post failed in this case, but count it as a failure.
                    postsFailed++;
                    console.error(`Outer promise rejected during batch deletion for topic ${topicId}:`, settledResult.reason);
                    handleAppwriteError(settledResult.reason, `batch deleting posts for topic ${topicId} (outer reject)`, false);
                }
            });

            // Update cursor for the next batch ONLY if we fetched a full batch
            if (postsToDelete.length === batchLimit) {
                cursor = postsToDelete[postsToDelete.length - 1].$id; // Set cursor to the last ID of this batch
            } else {
                hasMorePosts = false; // This was the last batch
            }
        } // End while loop

        console.log(`Finished deleting posts for topic ${topicId}. Total Deleted: ${postsDeleted}, Total Failed: ${postsFailed}`);

    } catch (error) {
        // Catch errors during the post fetching/deletion loop
        console.error(`Error occurred during post deletion phase for topic ${topicId}:`, error);
        handleAppwriteError(error, `deleting posts for topic ${topicId}`);
        // Proceed to try deleting the topic itself
    }

    // 4. Delete the Topic Document itself
    try {
        console.log(`Attempting to delete the topic document ${topicId}...`);
        await databases.deleteDocument(databaseId, forumTopicsCollectionId, topicId);
        topicDeleted = true;
        console.log(`Successfully deleted topic document ${topicId}.`);
    } catch (error) {
        // Catch errors specifically during topic deletion
        console.error(`Failed to delete topic document ${topicId}:`, error);
        handleAppwriteError(error, `deleting topic document ${topicId}`);
        topicDeleted = false; // Ensure flag is false if deletion failed
    }

    // 5. Return Final Status
    console.log(`Deletion process complete for topic ${topicId}. Final status: Posts Deleted: ${postsDeleted}, Posts Failed: ${postsFailed}, Topic Deleted: ${topicDeleted}`);
    return { postsDeleted, postsFailed, topicDeleted };
};

/** Updates a forum topic. */
export const updateForumTopic = async (topicId: string, data: UpdateForumTopicData): Promise<ForumTopic> => {
    // (Keep existing implementation, ensure voteScore can be updated if needed by backend logic)
     if (!forumTopicsCollectionId || !topicId) { /* ... */ }
    const filteredData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
    if (Object.keys(filteredData).length === 0) { /* ... */ }
    try { return await databases.updateDocument<ForumTopic>(databaseId, forumTopicsCollectionId, topicId, filteredData); }
    catch (error) { handleAppwriteError(error, `updating forum topic ${topicId}`); throw error; }
};

// --- NEW: Forum Vote Functions ---

/** Helper function to update the aggregated vote score on a topic or post */
const updateTargetVoteScore = async (
    targetId: string,
    targetType: 'topic' | 'post'
): Promise<void> => {
    const collectionId = targetType === 'topic' ? forumTopicsCollectionId : forumPostsCollectionId;
    if (!collectionId) {
        console.error(`Cannot update vote score: Collection ID for ${targetType} is not configured.`);
        return;
    }
    // Ensure the main databaseId is defined and available in this scope
    if (!databaseId) {
         console.error(`Cannot update vote score: Main database ID is not configured.`);
         return;
    }
    if (!forumVotesCollectionId) {
         console.error(`Cannot update vote score: Forum Votes Collection ID is not configured.`);
         return;
    }


    try {
        // Count upvotes and downvotes for the target
        // Use limit(1) to get the total count efficiently
        const upvoteQuery = [Query.equal('targetId', targetId), Query.equal('voteType', 'up'), Query.limit(1)];
        const downvoteQuery = [Query.equal('targetId', targetId), Query.equal('voteType', 'down'), Query.limit(1)];

        const [upvotesResult, downvotesResult] = await Promise.all([
            databases.listDocuments<ForumVote>(databaseId, forumVotesCollectionId, upvoteQuery),
            databases.listDocuments<ForumVote>(databaseId, forumVotesCollectionId, downvoteQuery)
        ]);

        const score = upvotesResult.total - downvotesResult.total;

        // Update the target document's voteScore
        // Correct arguments: databaseId, collectionId, documentId, data
        await databases.updateDocument(databaseId, collectionId, targetId, { voteScore: score });
        console.log(`Updated voteScore for ${targetType} ${targetId} to ${score}`);

    } catch (error) {
        handleAppwriteError(error, `updating vote score for ${targetType} ${targetId}`, false);
        // Don't throw, but log the error. The vote itself might have succeeded.
    }
};

/** Casts, changes, or removes a user's vote on a topic or post. */
export const castForumVote = async (
    userId: string,
    targetId: string,
    targetType: 'topic' | 'post',
    newVoteType: 'up' | 'down' | 'remove' // 'remove' clears the vote
): Promise<void> => {
    if (!userId || !targetId || !targetType || !forumVotesCollectionId) {
        throw new Error("User ID, Target ID, Target Type, and Vote Collection ID are required.");
    }

    const context = `casting vote (${newVoteType}) for ${targetType} ${targetId} by user ${userId}`;
    console.log(`Attempting: ${context}`);

    try {
        // 1. Find existing vote by this user for this target
        const existingVoteQuery = [
            Query.equal('userId', userId),
            Query.equal('targetId', targetId),
            Query.limit(1)
        ];
        const existingVotes = await databases.listDocuments<ForumVote>(
            databaseId, forumVotesCollectionId, existingVoteQuery
        );
        const existingVote = existingVotes.documents[0];

        // 2. Determine action based on existing vote and new vote type
        if (existingVote) {
            // User has voted before
            if (newVoteType === 'remove' || existingVote.voteType === newVoteType) {
                // Remove vote if requested or clicking the same vote type again
                await databases.deleteDocument(databaseId, forumVotesCollectionId, existingVote.$id);
                console.log(`Removed existing ${existingVote.voteType} vote. Context: ${context}`);
            } else {
                // Change vote (e.g., from up to down)
                await databases.updateDocument(databaseId, forumVotesCollectionId, existingVote.$id, {
                    voteType: newVoteType
                });
                console.log(`Changed vote from ${existingVote.voteType} to ${newVoteType}. Context: ${context}`);
            }
        } else if (newVoteType !== 'remove') {
            // User hasn't voted before, and it's not a 'remove' action
            const payload: Omit<ForumVote, keyof AppwriteDocument> = {
                userId,
                targetId,
                targetType,
                voteType: newVoteType
            };
            const userRole = Role.user(userId);
            // Permissions: User can read/update/delete their own vote. Others can't.
            const permissions = [
                Permission.read(userRole),
                Permission.update(userRole),
                Permission.delete(userRole),
            ];
            await databases.createDocument<ForumVote>(
                databaseId, forumVotesCollectionId, ID.unique(), payload, permissions
            );
            console.log(`Created new ${newVoteType} vote. Context: ${context}`);
        } else {
             console.log(`No existing vote found and action is 'remove', nothing to do. Context: ${context}`);
        }

        // 3. After changing the vote, update the target's aggregated score
        // Run this asynchronously and don't wait for it to complete to keep UI responsive
        updateTargetVoteScore(targetId, targetType).catch(err => {
             console.error(`Error updating vote score in background: ${err}`);
        });

    } catch (error) {
        handleAppwriteError(error, context);
        throw error; // Re-throw after logging
    }
};

/** Gets the current vote status ('up', 'down', 'none') of a specific user for a target. */
export const getUserVoteStatus = async (
    userId: string,
    targetId: string
): Promise<UserVoteStatus> => {
    if (!userId || !targetId || !forumVotesCollectionId) {
        console.warn("getUserVoteStatus: Missing userId, targetId, or collectionId.");
        return 'none';
    }
    try {
        const query = [
            Query.equal('userId', userId),
            Query.equal('targetId', targetId),
            Query.limit(1)
        ];
        const response = await databases.listDocuments<ForumVote>(databaseId, forumVotesCollectionId, query);
        if (response.documents.length > 0) {
            return response.documents[0].voteType; // 'up' or 'down'
        }
        return 'none';
    } catch (error) {
        handleAppwriteError(error, `getting user vote status for target ${targetId}`, false);
        return 'none'; // Return 'none' on error
    }
};

/** Gets the aggregated vote counts for a specific target (topic or post). */
export const getTargetVoteCounts = async (
    targetId: string
): Promise<VoteCounts> => {
    if (!targetId || !forumVotesCollectionId) {
        console.warn("getTargetVoteCounts: Missing targetId or collectionId.");
        return { upvotes: 0, downvotes: 0, score: 0 };
    }
    try {
        // Count upvotes
        const upvoteQuery = [ Query.equal('targetId', targetId), Query.equal('voteType', 'up'), Query.limit(1) ]; // Use limit(1) instead of limit(0)
        const upvotesResult = await databases.listDocuments<ForumVote>(databaseId, forumVotesCollectionId, upvoteQuery);

        // Count downvotes
        const downvoteQuery = [ Query.equal('targetId', targetId), Query.equal('voteType', 'down'), Query.limit(1) ]; // Use limit(1) instead of limit(0)
        const downvotesResult = await databases.listDocuments<ForumVote>(databaseId, forumVotesCollectionId, downvoteQuery);

        const counts: VoteCounts = {
            upvotes: upvotesResult.total,
            downvotes: downvotesResult.total,
            score: upvotesResult.total - downvotesResult.total,
        };
        return counts;

    } catch (error) {
        handleAppwriteError(error, `getting vote counts for target ${targetId}`, false);
        return { upvotes: 0, downvotes: 0, score: 0 }; // Return zero counts on error
    }
};
/**
 * Adds a product recommendation to the user's bookmarks.
 * @param userId - The ID of the user bookmarking the product.
 * @param product - The ProductRecommendation object from the AI.
 * @returns The newly created BookmarkedProduct document.
 * @throws AppwriteException or Error on failure.
 */
export const addProductBookmark = async (
    userId: string,
    product: ProductRecommendation
): Promise<BookmarkedProduct> => {
    if (!userId || !bookmarkedProductsCollectionId || !product?.id || !product?.name || !product?.description) {
        throw new Error("User ID, Collection ID, and product details (ID, Name, Description) are required to add bookmark.");
    }

    try {
        // Prepare payload, mapping ProductRecommendation to BookmarkedProduct structure
        const payload: Omit<BookmarkedProduct, keyof AppwriteDocument> = {
            userId: userId,
            productId: product.id, // Use the AI-generated ID
            productName: product.name,
            description: product.description,
            category: product.category,
            searchKeywords: product.searchKeywords,
            reasoning: product.reasoning,
            bookmarkedAt: new Date().toISOString(),
        };

        // Set permissions: Only the user can read, update, delete their own bookmark
        const userRole = Role.user(userId);
        const permissions = [
            Permission.read(userRole),
            Permission.update(userRole),
            Permission.delete(userRole),
        ];

        // Create the document
        const newBookmark = await databases.createDocument<BookmarkedProduct>(
            databaseId,
            bookmarkedProductsCollectionId,
            ID.unique(), // Let Appwrite generate the document ID ($id)
            payload,
            permissions
        );
        console.log(`Product bookmarked: ${product.name} (Doc ID: ${newBookmark.$id})`);
        return newBookmark;

    } catch (error: unknown) {
        // Handle potential unique constraint violation (user already bookmarked this productId)
        if (error instanceof AppwriteException && error.code === 409) {
             console.warn(`Attempted to bookmark product already saved (User: ${userId}, ProductID: ${product.id})`);
             // Optionally, fetch and return the existing bookmark here if needed
             const existing = await findProductBookmarkByProductId(userId, product.id);
             if (existing) return existing;
             // If find fails unexpectedly after a 409, rethrow original error
             throw error; // Rethrow the 409 if existing not found
        }
        handleAppwriteError(error, `adding product bookmark for user ${userId}, product ${product.id}`);
        throw error; // Re-throw after handling/logging
    }
};

/**
 * Removes a product bookmark using its Appwrite document ID ($id).
 * @param bookmarkDocumentId - The $id of the bookmark document to delete.
 * @returns Promise resolving when deletion is complete.
 * @throws AppwriteException or Error on failure.
 */
export const removeProductBookmarkById = async (bookmarkDocumentId: string): Promise<void> => {
    if (!bookmarkedProductsCollectionId || !bookmarkDocumentId) {
        throw new Error("Collection ID and Bookmark Document ID are required for deletion.");
    }
    try {
        await databases.deleteDocument(
            databaseId,
            bookmarkedProductsCollectionId,
            bookmarkDocumentId
        );
        console.log(`Product bookmark deleted: ${bookmarkDocumentId}`);
    } catch (error: unknown) {
        handleAppwriteError(error, `deleting product bookmark ${bookmarkDocumentId}`);
        throw error;
    }
};

/**
 * Finds a specific bookmark document ID based on userId and productId.
 * Useful for finding the document to delete when only the product ID is known.
 * @param userId - The user's ID.
 * @param productId - The AI-generated product ID.
 * @returns The BookmarkedProduct document or null if not found.
 */
export const findProductBookmarkByProductId = async (userId: string, productId: string): Promise<BookmarkedProduct | null> => {
     if (!userId || !productId || !bookmarkedProductsCollectionId) {
        console.warn("findProductBookmarkByProductId requires userId, productId, and collectionId.");
        return null;
    }
    try {
        const response = await databases.listDocuments<BookmarkedProduct>(
            databaseId,
            bookmarkedProductsCollectionId,
            [
                Query.equal('userId', userId),
                Query.equal('productId', productId),
                Query.limit(1) // Should be unique due to index
            ]
        );
        return response.documents.length > 0 ? response.documents[0] : null;
    } catch (error) {
         // Don't throw, just log and return null if finding fails
        handleAppwriteError(error, `finding bookmark for user ${userId}, product ${productId}`, false);
        return null;
    }
};


/**
 * Retrieves all bookmarked products for a specific user.
 * @param userId - The ID of the user whose bookmarks to fetch.
 * @returns A Promise resolving to an array of BookmarkedProduct documents.
 */
export const getUserProductBookmarks = async (userId: string): Promise<BookmarkedProduct[]> => {
    if (!userId || !bookmarkedProductsCollectionId) {
        console.warn("getUserProductBookmarks: User ID or Collection ID missing.");
        return []; // Return empty array if prerequisites missing
    }
    try {
        const response = await databases.listDocuments<BookmarkedProduct>(
            databaseId,
            bookmarkedProductsCollectionId,
            [
                Query.equal('userId', userId),
                Query.orderDesc('bookmarkedAt'), // Show newest first
                Query.limit(100) // Adjust limit as needed
            ]
        );
        return response.documents;
    } catch (error: unknown) {
        handleAppwriteError(error, `fetching product bookmarks for user ${userId}`, false);
        return []; // Return empty array on error
    }
};
/** Updates a forum post. Requires creator or admin permissions. */
export const updateForumPost = async (postId: string, data: UpdateForumPostData): Promise<ForumPost> => {
    if (!forumPostsCollectionId || !postId) {
        throw new Error("Collection ID and Post ID required for update.");
    }
    const filteredData = Object.fromEntries(Object.entries(data).filter(([_, v]) => v !== undefined));
     if (Object.keys(filteredData).length === 0) {
        console.warn(`updateForumPost called with no data for post ${postId}.`);
        // Need a getForumPost function if we want to return the current post here
        // For now, throw or handle as appropriate if no data is provided.
        throw new Error("No data provided for post update.");
    }
    try {
        // Permissions check happens server-side
        return await databases.updateDocument<ForumPost>(
            databaseId,
            forumPostsCollectionId,
            postId,
            filteredData
        );
    } catch (error) {
        handleAppwriteError(error, `updating forum post ${postId}`);
        throw error;
    }
};