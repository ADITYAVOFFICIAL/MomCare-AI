# Appwrite Functions for MomCare AI

This directory contains serverless functions for the MomCare AI platform, designed to be deployed on [Appwrite Cloud](https://appwrite.io/). These functions handle real-time forum events and user analytics by integrating with Appwrite databases and external services like Fluvio.

---

## 📂 Structure

```
appwrite-functions/
├── produceForumPostEvent/
│   ├── package.json
│   └── src/
│       └── index.js
└── produceForumVoteEvent/
    ├── package.json
    └── src/
        └── index.js
```

---

## 🚦 Functions Overview

### 1. `produceForumPostEvent`

- **Trigger:** Creation of a new forum post (Appwrite Database event).
- **Purpose:** 
  - Extracts the new post's data (from payload or fetches from Appwrite if needed).
  - Publishes the post data to a Fluvio topic (`forum-posts`) via WebSocket.
  - Enables real-time forum updates in the frontend via the backend WebSocket service.
- **Key File:** [`produceForumPostEvent/src/index.js`](produceForumPostEvent/src/index.js)

### 2. `produceForumVoteEvent`

- **Trigger:** Creation or update of a forum vote (Appwrite Database event).
- **Purpose:** 
  - Extracts vote event data.
  - Publishes the vote event to a Fluvio topic (`forum-votes`) via WebSocket.
  - Enables real-time vote updates in the frontend via the backend WebSocket service.
- **Key File:** [`produceForumVoteEvent/src/index.js`](produceForumVoteEvent/src/index.js)

---

## ⚙️ Environment Variables

Each function requires specific environment variables to be set in the Appwrite Console or CLI:

**Common Required Variables:**
- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `FLUVIO_ACCESS_KEY`

**Function-Specific:**
- `FORUM_POSTS_COLLECTION_ID` (for `produceForumPostEvent`)
- `FORUM_VOTES_COLLECTION_ID` (for `produceForumVoteEvent`)

Example:
```env
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=YOUR_PROJECT_ID
APPWRITE_API_KEY=YOUR_API_KEY
APPWRITE_DATABASE_ID=YOUR_DATABASE_ID
FORUM_POSTS_COLLECTION_ID=YOUR_FORUM_POSTS_COLLECTION_ID
FORUM_VOTES_COLLECTION_ID=YOUR_FORUM_VOTES_COLLECTION_ID
FLUVIO_ACCESS_KEY=YOUR_FLUVIO_ACCESS_KEY
```

---

## 🚀 Deployment

1. **Install dependencies** (if developing locally):
   ```sh
   cd produceForumPostEvent && npm install
   cd ../produceForumVoteEvent && npm install
   ```

2. **Deploy via Appwrite Console or CLI:**
   - Set environment variables for each function.
   - Set the trigger to the appropriate database events (e.g., document creation for posts/votes).
   - Deploy the function code.

3. **Function Triggers:**
   - `produceForumPostEvent`: Triggered on creation of documents in the Forum Posts collection.
   - `produceForumVoteEvent`: Triggered on creation/update of documents in the Forum Votes collection.

---

## 📝 Notes

- These functions act as bridges between Appwrite and Fluvio for real-time event streaming.
- They are not intended to be called directly by the frontend.
- Ensure all required indexes exist in Appwrite for efficient querying (see error logs for missing index hints).
- For more details, see the inline documentation in each [`index.js`](produceForumPostEvent/src/index.js) file.

---

## 📎 References

- [Appwrite Functions Documentation](https://appwrite.io/docs/functions)
- [Fluvio Documentation](https://infinyon.cloud/docs/)
- [MomCare Backend README](../momcare-backend/README.md)

---