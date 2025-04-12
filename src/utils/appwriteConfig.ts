/**
 * APPWRITE DATABASE & STORAGE CONFIGURATION
 *
 * This file contains the detailed configuration for MomCare AI app's Appwrite backend.
 * It defines collection schemas, attributes, indexes, and storage bucket settings.
 *
 * NOTE: Collection and Bucket IDs MUST be replaced with the actual IDs from your Appwrite project.
 */

// --- Appwrite Project Details ---
// These should ideally come from environment variables, but are hardcoded here for example clarity.
// Ensure VITE_PUBLIC_APPWRITE_ENDPOINT, VITE_PUBLIC_APPWRITE_PROJECT_ID etc. are set in your .env
export const appwriteEnvConfig = {
  endpoint: import.meta.env.VITE_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1',
  projectId: import.meta.env.VITE_PUBLIC_APPWRITE_PROJECT_ID || 'YOUR_PROJECT_ID', // Replace if not using env vars
  databaseId: import.meta.env.VITE_PUBLIC_APPWRITE_BLOG_DATABASE_ID || 'YOUR_DATABASE_ID', // Replace if not using env vars

  // Collection IDs (Ensure these match your .env variables and Appwrite Console)
  profilesCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID || 'profiles', // Example ID
  appointmentsCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_APPOINTMENTS_COLLECTION_ID || 'appointments', // Example ID
  medicalDocumentsCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_MEDICAL_DOCUMENTS_COLLECTION_ID || 'medicalDocuments', // Example ID
  blogsCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_BLOG_COLLECTION_ID || 'blogs', // Example ID (Optional)
  bpCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_BP_COLLECTION_ID || 'bloodPressure', // Example ID
  sugarCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_SUGAR_COLLECTION_ID || 'bloodSugar', // Example ID
  weightCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_WEIGHT_COLLECTION_ID || 'weight', // Example ID
  medsCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_MEDS_COLLECTION_ID || 'medications', // Example ID
  chatHistoryCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_CHAT_HISTORY_COLLECTION_ID || 'chatHistory', // Example ID
  bookmarksCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_BOOKMARKS_COLLECTION_ID || 'bookmarks', // Example ID
  forumTopicsCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_FORUM_TOPICS_COLLECTION_ID || 'forumTopics', // << REPLACE/VERIFY ID
  forumPostsCollectionId: import.meta.env.VITE_PUBLIC_APPWRITE_FORUM_POSTS_COLLECTION_ID || 'forumPosts',   // << REPLACE/VERIFY ID
  // Bucket IDs (Ensure these match your .env variables and Appwrite Console)
  profileBucketId: import.meta.env.VITE_PUBLIC_APPWRITE_PROFILE_BUCKET_ID || 'profilePhotos', // Example ID
  medicalBucketId: import.meta.env.VITE_PUBLIC_APPWRITE_MEDICAL_BUCKET_ID || 'medicalFiles', // Example ID
  chatImagesBucketId: import.meta.env.VITE_PUBLIC_APPWRITE_CHAT_IMAGES_BUCKET_ID || 'chatImages', // Example ID
};


// --- Detailed Configuration for Collections and Buckets ---
// This structure can be used for documentation or potentially for migration scripts.
export const appwriteSchemaConfig = {
  databaseId: appwriteEnvConfig.databaseId,
  collections: {
    // --- User Profiles ---
    profiles: {
      id: appwriteEnvConfig.profilesCollectionId, // Collection ID from Appwrite
      name: 'User Profiles',
      attributes: [
        { key: 'userId', type: 'string', required: true, size: 255, array: false, description: 'Appwrite User ID ($id)' },
        { key: 'name', type: 'string', required: false, size: 255, array: false, description: 'User full name' },
        { key: 'email', type: 'email', required: false, size: 255, array: false, description: 'User email (optional, sync from auth)' },
        { key: 'age', type: 'integer', required: false, min: 0, max: 120, array: false, description: 'User age' },
        { key: 'gender', type: 'string', required: false, size: 50, array: false, description: 'User gender identity' },
        { key: 'address', type: 'string', required: false, size: 1000, array: false, description: 'User address (optional)' },
        { key: 'phoneNumber', type: 'string', required: false, size: 50, array: false, description: 'User phone number (optional)' },
        { key: 'profilePhotoId', type: 'string', required: false, size: 255, array: false, description: 'File ID from Profile Photos bucket' },
        { key: 'weeksPregnant', type: 'integer', required: false, min: 0, max: 45, array: false, description: 'Estimated weeks of pregnancy' },
        { key: 'preExistingConditions', type: 'string', required: false, size: 2000, array: false, description: 'List of pre-existing conditions' },
        { key: 'previousPregnancies', type: 'integer', required: false, min: 0, max: 20, array: false, description: 'Number of previous pregnancies' },
        { key: 'deliveryPreference', type: 'string', required: false, size: 50, array: false, description: 'e.g., vaginal, c-section, undecided' },
        { key: 'partnerSupport', type: 'string', required: false, size: 100, array: false, description: 'Level of partner support (optional, sensitive)' },
        { key: 'workSituation', type: 'string', required: false, size: 100, array: false, description: 'e.g., full-time, part-time, on leave' },
        { key: 'dietaryPreferences', type: 'string', required: false, size: 100, array: true, description: 'List of dietary needs/prefs (e.g., vegetarian)' },
        { key: 'activityLevel', type: 'string', required: false, size: 50, array: false, description: 'e.g., sedentary, light, moderate, active' },
        { key: 'chatTonePreference', type: 'string', required: false, size: 50, array: false, description: 'Preferred AI chat tone (e.g., empathetic, direct)' },
      ],
      indexes: [
        { key: 'userId_unique', type: 'unique', attributes: ['userId'], orders: ['ASC'], description: 'Ensure only one profile per user' },
      ],
    },
    
    // --- Appointments ---
    appointments: {
      id: appwriteEnvConfig.appointmentsCollectionId, // Collection ID from Appwrite
      name: 'User Appointments',
      attributes: [
        { key: 'userId', type: 'string', required: true, size: 255, array: false, description: 'Appwrite User ID ($id)' },
        { key: 'date', type: 'datetime', required: true, array: false, description: 'Full date and time of appointment (ISO 8601 recommended)' },
        // 'time' attribute removed as 'date' should store full datetime
        { key: 'appointmentType', type: 'string', required: false, size: 100, array: false, default: 'General', description: 'Type of appointment (e.g., Doctor, Lab, Scan)' },
        { key: 'notes', type: 'string', required: false, size: 2000, array: false, description: 'User notes about the appointment' },
        { key: 'isCompleted', type: 'boolean', required: false, default: false, array: false, description: 'Whether the appointment has occurred' },
      ],
      indexes: [
        { key: 'userId_date_idx', type: 'key', attributes: ['userId', 'date'], orders: ['ASC', 'ASC'], description: 'Query appointments by user, sorted by date' },
        { key: 'userId_isCompleted_idx', type: 'key', attributes: ['userId', 'isCompleted'], orders: ['ASC', 'ASC'], description: 'Query appointments by user and completion status' },
      ],
    },
    // --- Medical Documents ---
    medicalDocuments: {
      id: appwriteEnvConfig.medicalDocumentsCollectionId, // Collection ID from Appwrite
      name: 'Medical Documents',
      attributes: [
        { key: 'userId', type: 'string', required: true, size: 255, array: false, description: 'Appwrite User ID ($id)' },
        { key: 'fileId', type: 'string', required: true, size: 255, array: false, description: 'File ID from Medical Documents bucket' },
        { key: 'fileName', type: 'string', required: true, size: 255, array: false, description: 'Original name of the uploaded file' },
        { key: 'documentType', type: 'string', required: false, size: 255, array: false, description: 'MIME type or category (e.g., application/pdf, Lab Result)' },
        { key: 'description', type: 'string', required: false, size: 1000, array: false, description: 'User description of the document' },
      ],
      indexes: [
        { key: 'userId_idx', type: 'key', attributes: ['userId'], orders: ['ASC'], description: 'Query documents by user' },
      ],
    },
    // --- Blog Posts (Optional) ---
    blogs: {
      id: appwriteEnvConfig.blogsCollectionId, // Collection ID from Appwrite
      name: 'Blog Posts',
      attributes: [
        { key: 'title', type: 'string', required: true, size: 255, array: false },
        { key: 'slug', type: 'string', required: true, size: 255, array: false, description: 'URL-friendly unique identifier' },
        { key: 'content', type: 'string', required: true, size: 16777216, array: false, description: 'Blog content (Markdown/HTML, max 16MB)' }, // 16MB text
        { key: 'author', type: 'string', required: true, size: 255, array: false, description: 'Author name or ID' },
        { key: 'category', type: 'string', required: false, size: 255, array: false },
        { key: 'imageUrl', type: 'string', required: false, size: 1024, array: false, description: 'URL for the main image' },
        { key: 'imageFileId', type: 'string', required: false, size: 255, array: false, description: 'File ID if image is in Appwrite Storage' },
        { key: 'tags', type: 'string', required: false, size: 100, array: true, description: 'List of relevant tags' },
        { key: 'publishedAt', type: 'datetime', required: false, array: false, description: 'Date the post was published' },
      ],
      indexes: [
        { key: 'slug_unique', type: 'unique', attributes: ['slug'], orders: ['ASC'], description: 'Ensure slugs are unique' },
        { key: 'category_idx', type: 'key', attributes: ['category'], orders: ['ASC'] },
        { key: 'published_idx', type: 'key', attributes: ['publishedAt'], orders: ['DESC'] },
        { key: 'tags_idx', type: 'key', attributes: ['tags'], orders: [], description: 'Index for querying by tags (array)' },
        { key: 'title_fulltext', type: 'fulltext', attributes: ['title'], orders: [], description: 'Index for searching titles' },
      ],
    },
    // --- Blood Pressure Readings ---
    bloodPressure: {
      id: appwriteEnvConfig.bpCollectionId,
      name: 'Blood Pressure Readings',
      attributes: [
        { key: 'userId', type: 'string', required: true, size: 255, array: false },
        { key: 'systolic', type: 'integer', required: true, min: 0, max: 300, array: false },
        { key: 'diastolic', type: 'integer', required: true, min: 0, max: 200, array: false },
        { key: 'recordedAt', type: 'datetime', required: true, array: false },
      ],
      indexes: [
        { key: 'userId_recordedAt_idx', type: 'key', attributes: ['userId', 'recordedAt'], orders: ['ASC', 'DESC'] },
      ],
    },
    // --- Blood Sugar Readings ---
    bloodSugar: {
      id: appwriteEnvConfig.sugarCollectionId,
      name: 'Blood Sugar Readings',
      attributes: [
        { key: 'userId', type: 'string', required: true, size: 255, array: false },
        { key: 'level', type: 'float', required: true, min: 0, max: 1000, array: false }, // Use float for potential decimals
        { key: 'measurementType', type: 'string', required: true, size: 50, array: false, description: 'e.g., fasting, post_meal, random' },
        { key: 'recordedAt', type: 'datetime', required: true, array: false },
      ],
      indexes: [
        { key: 'userId_recordedAt_idx', type: 'key', attributes: ['userId', 'recordedAt'], orders: ['ASC', 'DESC'] },
      ],
    },
    // --- Weight Readings ---
    weight: {
      id: appwriteEnvConfig.weightCollectionId,
      name: 'Weight Readings',
      attributes: [
        { key: 'userId', type: 'string', required: true, size: 255, array: false },
        { key: 'weight', type: 'float', required: true, min: 0, max: 500, array: false }, // Use float
        { key: 'unit', type: 'string', required: true, size: 10, array: false, description: 'kg or lbs' },
        { key: 'recordedAt', type: 'datetime', required: true, array: false },
      ],
      indexes: [
        { key: 'userId_recordedAt_idx', type: 'key', attributes: ['userId', 'recordedAt'], orders: ['ASC', 'DESC'] },
      ],
    },
    // --- Medication Reminders ---
    medications: {
      id: appwriteEnvConfig.medsCollectionId,
      name: 'Medication Reminders',
      attributes: [
        { key: 'userId', type: 'string', required: true, size: 255, array: false },
        { key: 'medicationName', type: 'string', required: true, size: 255, array: false },
        { key: 'dosage', type: 'string', required: true, size: 100, array: false },
        { key: 'frequency', type: 'string', required: true, size: 100, array: false },
        { key: 'times', type: 'string', required: false, size: 20, array: true, description: 'Array of times like HH:MM' },
        { key: 'notes', type: 'string', required: false, size: 1000, array: false },
        { key: 'isActive', type: 'boolean', required: false, default: true, array: false },
      ],
      indexes: [
        { key: 'userId_isActive_idx', type: 'key', attributes: ['userId', 'isActive'], orders: ['ASC', 'ASC'] },
      ],
    },
    forumTopics: {
      id: appwriteEnvConfig.forumTopicsCollectionId, // Collection ID from Appwrite
      name: 'Forum Topics',
      attributes: [
        { key: 'title', type: 'string', required: true, size: 255, array: false, description: 'Title of the forum topic' },
        { key: 'content', type: 'string', required: true, size: 65535, array: false, description: 'Initial content/post of the topic (max 64KB)' },
        { key: 'userId', type: 'string', required: true, size: 255, array: false, description: 'Appwrite User ID ($id) of the creator' },
        { key: 'userName', type: 'string', required: true, size: 255, array: false, description: 'Display name of the creator (snapshot)' },
        { key: 'userAvatarUrl', type: 'string', required: false, size: 2048, array: false, description: 'URL of the creator\'s avatar (snapshot, optional)' },
        { key: 'category', type: 'string', required: false, size: 100, array: false, description: 'Optional category for the topic' },
        { key: 'lastReplyAt', type: 'datetime', required: false, array: false, description: 'Timestamp of the last reply (or creation if no replies)' },
        { key: 'replyCount', type: 'integer', required: false, default: 0, min: 0, array: false, description: 'Number of replies to the topic' },
        { key: 'isLocked', type: 'boolean', required: false, default: false, array: false, description: 'Moderation: Topic is locked (no new replies)' },
        { key: 'isPinned', type: 'boolean', required: false, default: false, array: false, description: 'Moderation: Topic is pinned to the top' },
      ],
      indexes: [
        // Essential for sorting topics by recent activity (most common view)
        { key: 'lastReplyAt_desc_idx', type: 'key', attributes: ['lastReplyAt'], orders: ['DESC'], description: 'Sort topics by most recent activity' },
        // For showing pinned topics first, then by activity
        { key: 'pinned_lastReply_idx', type: 'key', attributes: ['isPinned', 'lastReplyAt'], orders: ['DESC', 'DESC'], description: 'Sort pinned first, then by activity' },
        // For filtering by category
        { key: 'category_idx', type: 'key', attributes: ['category'], orders: ['ASC'], description: 'Filter topics by category' },
        // For finding topics by a specific user
        { key: 'userId_idx', type: 'key', attributes: ['userId'], orders: ['ASC'], description: 'Find topics created by a user' },
        // For searching topic titles
        { key: 'title_fulltext_idx', type: 'fulltext', attributes: ['title'], orders: [], description: 'Search topic titles' },
      ],
    },

    // --- NEW: Forum Posts (Replies) ---
    forumPosts: {
      id: appwriteEnvConfig.forumPostsCollectionId, // Collection ID from Appwrite
      name: 'Forum Posts',
      attributes: [
        { key: 'topicId', type: 'string', required: true, size: 255, array: false, description: 'Document ID ($id) of the parent ForumTopic' },
        { key: 'content', type: 'string', required: true, size: 65535, array: false, description: 'Content of the reply (max 64KB)' },
        { key: 'userId', type: 'string', required: true, size: 255, array: false, description: 'Appwrite User ID ($id) of the replier' },
        { key: 'userName', type: 'string', required: true, size: 255, array: false, description: 'Display name of the replier (snapshot)' },
        { key: 'userAvatarUrl', type: 'string', required: false, size: 2048, array: false, description: 'URL of the replier\'s avatar (snapshot, optional)' },
        // Optional: parentPostId for threaded replies (add later if needed)
        // { key: 'parentPostId', type: 'string', required: false, size: 255, array: false, description: 'ID of the post being replied to (for threading)' },
      ],
      indexes: [
        // Essential for fetching posts for a specific topic in order
        { key: 'topicId_createdAt_asc_idx', type: 'key', attributes: ['topicId', '$createdAt'], orders: ['ASC', 'ASC'], description: 'Fetch posts for a topic chronologically' },
        // For finding posts by a specific user
        { key: 'userId_idx', type: 'key', attributes: ['userId'], orders: ['ASC'], description: 'Find posts created by a user' },
      ],
    },
    // --- NEW: Chat History ---
    chatHistory: {
      id: appwriteEnvConfig.chatHistoryCollectionId, // Collection ID from Appwrite
      name: 'Chat History',
      attributes: [
        { key: 'userId', type: 'string', required: true, size: 255, array: false, description: 'User who participated' },
        { key: 'sessionId', type: 'string', required: true, size: 255, array: false, description: 'Unique ID for the conversation session' },
        { key: 'role', type: 'string', required: true, size: 10, array: false, description: '"user" or "model"' },
        { key: 'content', type: 'string', required: true, size: 65535, array: false, description: 'Text content of the message (max 64KB)' }, // Increased size
        { key: 'timestamp', type: 'datetime', required: true, array: false, description: 'When the message was saved' },
      ],
      indexes: [
        // Index for loading a specific session chronologically
        { key: 'userId_sessionId_timestamp_idx', type: 'key', attributes: ['userId', 'sessionId', 'timestamp'], orders: ['ASC', 'ASC', 'ASC'] },
        // Index for fetching recent messages across sessions (for session list generation)
        { key: 'userId_timestamp_idx', type: 'key', attributes: ['userId', 'timestamp'], orders: ['ASC', 'DESC'] },
      ],
    },
    // --- NEW: Bookmarked Messages ---
    bookmarks: {
      id: appwriteEnvConfig.bookmarksCollectionId, // Collection ID from Appwrite
      name: 'Bookmarked Messages',
      attributes: [
        { key: 'userId', type: 'string', required: true, size: 255, array: false, description: 'User who bookmarked' },
        { key: 'messageContent', type: 'string', required: true, size: 65535, array: false, description: 'The bookmarked message text (max 64KB)' }, // Increased size
        { key: 'bookmarkedAt', type: 'datetime', required: true, array: false, description: 'When the bookmark was created' },
        // Optional: Add original message ID or session ID if needed for linking back
        // { key: 'originalMessageId', type: 'string', required: false, size: 255, array: false },
        // { key: 'sessionId', type: 'string', required: false, size: 255, array: false },
      ],
      indexes: [
        // Index for fetching bookmarks by user, newest first
        { key: 'userId_bookmarkedAt_idx', type: 'key', attributes: ['userId', 'bookmarkedAt'], orders: ['ASC', 'DESC'] },
      ],
    },
  },
  
  buckets: {
    // --- Profile Photos Bucket ---
    profileBucket: {
      id: appwriteEnvConfig.profileBucketId, // Bucket ID from Appwrite
      name: 'Profile Photos',
      maximumFileSize: 5242880, // 5MB
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
      permissions: ['user:{userId}'], // Example: Only owner can access (adjust as needed)
    },
    // --- Medical Documents Bucket ---
    medicalBucket: {
      id: appwriteEnvConfig.medicalBucketId, // Bucket ID from Appwrite
      name: 'Medical Documents',
      maximumFileSize: 10485760, // 10MB
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx', 'txt', 'heic', 'heif'], // Added more types
      permissions: ['user:{userId}'], // Example: Only owner can access
    },
    // --- NEW: Chat Images Bucket ---
    chatImagesBucket: {
      id: appwriteEnvConfig.chatImagesBucketId, // <<<< REPLACE WITH ACTUAL BUCKET ID >>>>
      name: 'Chat Images',
      maximumFileSize: 5242880, // 5MB (adjust as needed)
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'], // Match ChatPage upload
      permissions: ['user:{userId}'], // Example: Only owner can access
    },
  }
};

/**
 * Appwrite Permissions Guide:
 *
 * Permissions can be set at the Collection level and Document level.
 *
 * 1. Collection Level Permissions (Set in Appwrite Console > Database > Collection > Settings):
 *    - Controls WHO can perform actions on the collection ITSELF (e.g., list documents, create documents).
 *    - For user-specific data (profiles, appointments, chatHistory, bookmarks, etc.):
 *      - Create: `role:member` (Any authenticated user)
 *      - Read:   `role:member` (Allows users to query, but Document permissions restrict results)
 *      - Update: `role:member` (Allows users to attempt updates, Document permissions restrict)
 *      - Delete: `role:member` (Allows users to attempt deletes, Document permissions restrict)
 *    - For public data (e.g., blogs):
 *      - Create: `team:admin` (Or specific editor role)
 *      - Read:   `role:all` (Anyone)
 *      - Update: `team:admin`
 *      - Delete: `team:admin`
 *
 * 2. Document Level Permissions (Set when creating/updating a document via SDK):
 *    - Controls WHO can perform actions on a SPECIFIC document.
 *    - Format: `Permission.action(Role.type(identifier))`
 *    - For user-specific data (created in `appwrite.ts` functions):
 *      - `Permission.read(Role.user(userId))`
 *      - `Permission.update(Role.user(userId))`
 *      - `Permission.delete(Role.user(userId))`
 *      - This ensures ONLY the user associated with the `userId` can access/modify their own data.
 *    - For public data (e.g., blogs):
 *      - `Permission.read(Role.any())` (Anyone can read)
 *      - `Permission.update(Role.team('admin'))` (Only admins can update)
 *      - `Permission.delete(Role.team('admin'))` (Only admins can delete)
 *
 * 3. Bucket Level Permissions (Set in Appwrite Console > Storage > Bucket > Settings):
 *    - Controls WHO can perform actions on the bucket and files within it.
 *    - Similar logic applies (role:member, role:all, user:{userId}, team:{teamId}).
 *    - For user-specific files (profile photos, medical docs, chat images):
 *      - Create: `role:member`
 *      - Read:   `user:{userId}` (Use file-level permissions for read access)
 *      - Update: `user:{userId}` (Use file-level permissions for update access)
 *      - Delete: `user:{userId}` (Use file-level permissions for delete access)
 *
 * 4. File Level Permissions (Set when creating a file via SDK):
 *    - Controls WHO can access a SPECIFIC file.
 *    - Format: `Permission.action(Role.type(identifier))`
 *    - For user-specific files (created in `appwrite.ts` functions):
 *      - `Permission.read(Role.user(userId))`
 *      - `Permission.update(Role.user(userId))` // Optional, usually files aren't updated
 *      - `Permission.delete(Role.user(userId))`
 *
 * **Summary for MomCare AI:**
 * - Most collections (Profiles, Appointments, Readings, Meds, ChatHistory, Bookmarks) need Document-Level Permissions restricting access to the specific user (`Role.user(userId)`).
 * - Storage Buckets (Profile, Medical, ChatImages) need File-Level Permissions restricting access to the specific user (`Role.user(userId)`).
 * - The Blogs collection (if public) needs `Role.any()` for read access at the Document level.
 */

// Export the combined config if needed elsewhere, primarily for documentation
export default appwriteSchemaConfig;