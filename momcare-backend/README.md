# MomCare Backend

This directory contains the backend service for **MomCare AI**, responsible for real-time forum updates, AI integrations, and secure communication with Appwrite and Fluvio. It is designed to be run as a separate Node.js/Bun process alongside the main frontend and Appwrite Cloud services.

---

## 📦 Features

- **Real-Time Forum Updates:** Consumes Fluvio topics for forum posts and votes, broadcasting updates to connected frontend clients via WebSockets.
- **Appwrite Integration:** Handles authentication, database, and storage operations for user data, health records, bookmarks, and more.
- **Groq AI Integration:** Provides endpoints and utilities for AI-powered features (chat, OCR, formatting, meal/exercise/product suggestions, moderation).
- **Secure WebSocket Server:** Manages client connections and broadcasts real-time events.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js / Bun
- **Language:** TypeScript
- **Backend Services:** [Appwrite](https://appwrite.io/) (Auth, DB, Storage, Functions)
- **Real-Time Streaming:** [Fluvio / InfinyOn Cloud](https://infinyon.cloud/)
- **AI:** [Groq API](https://groq.com/) (Llama 3 models)
- **WebSockets:** For real-time frontend communication

---

## ⚙️ Environment Variables

Create a `.env` file in the `momcare-backend/` directory. Example:

```env
# Appwrite
VITE_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
VITE_PUBLIC_APPWRITE_PROJECT_ID="YOUR_PROJECT_ID"
VITE_PUBLIC_APPWRITE_BLOG_DATABASE_ID="YOUR_DATABASE_ID"
VITE_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID="YOUR_PROFILES_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_MEDICAL_DOCUMENTS_COLLECTION_ID="YOUR_MEDICAL_DOCS_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_APPOINTMENTS_COLLECTION_ID="YOUR_APPOINTMENTS_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_BP_COLLECTION_ID="YOUR_BP_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_SUGAR_COLLECTION_ID="YOUR_SUGAR_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_WEIGHT_COLLECTION_ID="YOUR_WEIGHT_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_MEDS_COLLECTION_ID="YOUR_MEDS_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_CHAT_HISTORY_COLLECTION_ID="YOUR_CHAT_HISTORY_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_BOOKMARKS_COLLECTION_ID="YOUR_BOOKMARKS_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_FORUM_TOPICS_COLLECTION_ID="YOUR_FORUM_TOPICS_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_FORUM_POSTS_COLLECTION_ID="YOUR_FORUM_POSTS_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_FORUM_VOTES_COLLECTION_ID="YOUR_FORUM_VOTES_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_BOOKMARKED_PRODUCTS_COLLECTION_ID="YOUR_BOOKMARKED_PRODUCTS_COLLECTION_ID"
VITE_PUBLIC_APPWRITE_PROFILE_BUCKET_ID="YOUR_PROFILE_BUCKET_ID"
VITE_PUBLIC_APPWRITE_MEDICAL_BUCKET_ID="YOUR_MEDICAL_BUCKET_ID"
VITE_PUBLIC_APPWRITE_CHAT_IMAGES_BUCKET_ID="YOUR_CHAT_IMAGES_BUCKET_ID"

# Groq AI
VITE_PUBLIC_GROQ_API_KEY="YOUR_GROQ_API_KEY"

# Fluvio
FLUVIO_ACCESS_KEY="YOUR_FLUVIO_ACCESS_KEY"

# WebSocket
WEBSOCKET_PORT=8081
``` 

---

## 🚀 Getting Started

1. **Install Dependencies**
   ```bash
   bun install
   ```
2. **Configure Environment**
   - Copy `.env.example` to `.env` and fill in your keys (see above).
3. **Run the Backend Service**
   ```bash
   bun run start
   ```

---

## 🧩 Key Modules

- `src/lib/appwrite.ts`: Appwrite client, types, and database/storage utilities.
- `src/lib/fluvioService.ts`: Fluvio consumer for real-time forum events.
- `src/lib/groq.ts`: Groq AI chat, OCR, and context helpers.
- `src/lib/groqf.ts`: Groq-powered Markdown formatting.
- `src/lib/groqMeal.ts`: Groq-powered meal and exercise suggestions.
- `src/lib/groqMod.ts`: Groq-powered content moderation for forum safety.
- `src/index.ts`: Main entry point (WebSocket server, event loop, etc).

---

## 🧪 Testing

Unit and integration tests are not included by default. Add your own using your preferred framework (e.g., Jest, Vitest).

---

## 📝 Notes

- **Appwrite Functions:** Some backend logic (e.g., Fluvio event producers) is handled by Appwrite Functions, not this service.
- **Frontend Integration:** The frontend connects to this backend via WebSockets for real-time forum updates.
- **Security:** Do not expose sensitive keys in the frontend. Backend `.env` should **NOT** be committed.

---

## 📎 Resources

- [Appwrite Docs](https://appwrite.io/docs)
- [Groq API Docs](https://groq.com/docs)
- [Fluvio Docs](https://infinyon.cloud/docs)
- [MomCare AI Main README](../README.md)

---

## 🛡️ License

See [LICENSE](../LICENSE) in the project root.
