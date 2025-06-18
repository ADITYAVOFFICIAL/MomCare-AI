# MomCare AI

**MomCare AI** is a comprehensive, AI-powered platform designed to support expectant mothers throughout their pregnancy journey. It offers personalized health tracking, secure document management, real-time community support, and a suite of intelligent tools to provide a confident and informed experience.

**[Live Demo](https://momcareai.vercel.app/)**

---

## ✨ Key Features

-   ✅ **AI Chat Assistant (Groq):** Personalized Q&A and **Document Transcription (OCR)** powered by fast Groq inference.
-   ✅ **Personalized Dashboard:** Tracks milestones, appointments, medication reminders, and recent health readings.
-   ✅ **Health Tracking:** Log and visualize Blood Pressure, Blood Sugar, and Weight readings.
-   ✅ **Appointment Scheduling:** Book and manage prenatal care appointments.
-   ✅ **Secure Medical Document Vault (Appwrite):** Upload, view, and manage medical records securely.
-   ✅ **Real-Time Community Forum (Fluvio & Groq):** Create topics, post replies, and vote on content with real-time updates and AI-powered moderation.
-   ✅ **Resources & Blog:** Access articles and filter by category, with content formatting enhanced by AI.
-   ✅ **Emergency Information:** Quick access to warning signs and nearby hospitals via Google Maps.
-   ✅ **AI-Powered Suggestions (Groq):** Get personalized meal/exercise ideas and relevant product recommendations.
-   ✅ **Symptom Checker (Groq):** AI-powered analysis of symptoms based on user input.
-   ✅ **Blockchain Engagement (Monad):**
    -   A fun stacking game with high scores submitted to a Monad blockchain leaderboard.
    -   Mint unique NFT badges for achieving key milestones in the pregnancy journey.
-   ✅ **User Authentication & Profile (Appwrite):** Secure login/signup and profile management.

---

## 🛠️ Tech Stack

-   **Frontend:** React, TypeScript, Vite, Tailwind CSS, Shadcn UI
-   **Backend-as-a-Service:** Appwrite (Authentication, Databases, Storage, Functions)
-   **Real-Time Streaming:** Fluvio / InfinyOn Cloud (via WebSocket Gateway)
-   **AI Engine:** Groq API (Llama 3 models)
-   **Blockchain:** Solidity, Ethers.js, Monad Testnet
-   **State Management:** Zustand
-   **Data Fetching:** TanStack Query (React Query)
-   **Hosting:** Vercel

---

## 🏛️ Architecture

The application is built on a robust, modern architecture leveraging a BaaS for core backend functionality, a real-time streaming platform for community features, and cutting-edge AI and blockchain services for intelligent and engaging user experiences.

**Overall Workflow:**
![Overall Workflow Diagram](charts_and_diagrams/Workflow_Diagram.png)

**Real-Time Dataflow (Fluvio):**
![Fluvio Dataflow Architecture](charts_and_diagrams/Fluvio_InfinyOn_Dataflow_architecture_and_Design.png)

**AI Workflow (Groq):**
![Groq Workflow Diagram](charts_and_diagrams/Groq_Workflow_Diagram.png)

**Blockchain Interaction (Monad):**
![Monad Blockchain Integration](charts_and_diagrams/Monad_Blockchain.png)

---

## 🚀 Getting Started

Follow these steps to set up and run the MomCare AI project locally.

### 1. Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later)
-   [Bun](https://bun.sh/) (or `npm`/`yarn`)
-   An [Appwrite Cloud](https://cloud.appwrite.io/) account.
-   API Keys for:
    -   Groq
    -   Google Maps (with Places API enabled)
    -   Fluvio / InfinyOn Cloud

### 2. Clone the Repository

```bash
git clone https://github.com/ADITYAVOFFICIAL/momcare-ai.git
cd momcare-ai
```

### 3. Environment Variable Setup

You will need two separate `.env` files: one for the frontend (root directory) and one for the backend service.

**A. Frontend Environment (`.env.local`)**

Create a file named `.env.local` in the project's root directory and populate it with your Appwrite, Groq, and Google Maps keys.

```env
# Appwrite Configuration
VITE_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1"
VITE_PUBLIC_APPWRITE_PROJECT_ID="YOUR_APPWRITE_PROJECT_ID"
VITE_PUBLIC_APPWRITE_BLOG_DATABASE_ID="YOUR_APPWRITE_DATABASE_ID"
# ... (add all other VITE_PUBLIC_APPWRITE_* variables from the file list)

# Groq API Key
VITE_PUBLIC_GROQ_API_KEY="YOUR_GROQ_API_KEY"

# Google Maps API Key
VITE_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
```*(For a complete list of required `VITE_PUBLIC_APPWRITE_*` variables, refer to the `src/lib/appwrite.ts` file.)*

**B. Backend Environment (`momcare-backend/.env`)**

Create a file named `.env` inside the `momcare-backend/` directory.

```env
# Fluvio Access Key (from InfinyOn Cloud)
FLUVIO_ACCESS_KEY="YOUR_FLUVIO_ACCESS_KEY"

# WebSocket Server Port
WEBSOCKET_PORT=8081
```

### 4. Appwrite Project Setup

Before running the application, you must configure your Appwrite Cloud project.

**A. Create Project & Database**

1.  Log in to your Appwrite Cloud account and create a new project.
2.  Note the **Project ID** and add it to your `.env.local` file.
3.  Navigate to the **Databases** section and create a new database. Note the **Database ID** and add it to your `.env.local` file.

**B. Create Collections**

Inside your new database, create the following collections with the exact IDs you specified in your `.env.local` file. You will need to manually add the attributes and indexes for each collection as defined in `src/utils/appwriteConfig.ts`.

-   `profiles`
-   `appointments`
-   `medicalDocuments`
-   `bloodPressure`
-   `bloodSugar`
-   `weight`
-   `medications`
-   `chatHistory`
-   `bookmarks`
-   `forumTopics`
-   `forumPosts`
-   `forumVotes`
-   `bookmarkedProducts`
-   `blogs` (Optional)

**C. Create Storage Buckets**

Navigate to the **Storage** section and create the following buckets with the IDs from your `.env.local` file:

-   `profilePhotos`
-   `medicalFiles`
-   `chatImages`

**D. Deploy Functions**

You need to deploy the serverless functions using the Appwrite CLI.

1.  Install the [Appwrite CLI](https://appwrite.io/docs/command-line).
2.  Log in to your account: `appwrite login`.
3.  Link your local project: `appwrite init project`.
4.  Deploy the functions:
    ```bash
    # Deploy the main functions
    appwrite deploy function --functionId <YOUR_GETUSERCOUNT_FUNCTION_ID> --path functions/getUserCount
    
    # Deploy the forum event producers
    appwrite deploy function --functionId <YOUR_PRODUCEFORUMPOSTEVENT_FUNCTION_ID> --path appwrite-functions/produceForumPostEvent
    appwrite deploy function --functionId <YOUR_PRODUCEFORUMVOTEEVENT_FUNCTION_ID> --path appwrite-functions/produceForumVoteEvent
    ```
5.  After deploying, go to the Appwrite Console to set the required **environment variables** and **event triggers** for each function.

### 5. Install Dependencies & Run

**A. Backend Service (Fluvio Consumer)**

Open a new terminal for the backend.

```bash
cd momcare-backend
bun install
bun run dev
```

**B. Frontend Application**

Open a separate terminal for the frontend.

```bash
# From the root directory
bun install
bun run dev
```

The application should now be running on `http://localhost:8080`.

---

## 🔮 Future Scope

-   🛡️ **Enhanced Security & Privacy:** Implement data encryption at rest and in transit where applicable and conduct a thorough review of Appwrite permissions.
-   🌐 **Localization & Accessibility:** Add support for multiple languages (i18n) and improve compliance with accessibility standards (WCAG).
-   🔔 **Push Notifications:** Integrate real-time push notifications for appointments, medications, and community interactions.
-   ☁️ **Scalability & Optimization:** For large-scale traffic, migrate backend components to dedicated cloud services and optimize API usage.

---

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 🖇️ Acknowledgements

-   **Frameworks/Libraries:** React, Vite, TypeScript, Tailwind CSS, Shadcn UI, Ethers.js, TanStack Query, Zustand.
-   **Services:** Appwrite, Groq, Fluvio/InfinyOn, Vercel, Google Maps.
-   **Blockchain Platform:** Monad.
