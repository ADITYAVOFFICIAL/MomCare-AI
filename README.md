![github-submission-banner](https://github.com/user-attachments/assets/a1493b84-e4e2-456e-a791-ce35ee2bcf2f)

# 🚀 MomCare AI

> Your AI-powered companion throughout your pregnancy journey. Get personalized support, access resources, and manage your health information securely.

---

## 📌 Problem Statement

**Problem Statement 1 – Weave AI magic with Groq**

**Problem Statement 2 – Unleash blockchain gameplay with Monad**

**Problem Statement 3 – Real-Time Data Experiences with Fluvio**

---

## 🎯 Objective

MomCare AI aims to provide comprehensive, personalized, and accessible support for expectant mothers. It addresses the need for reliable information, convenient health management tools, and community connection during pregnancy by leveraging AI and modern web technologies. The platform serves expectant mothers by offering an AI chat assistant for immediate queries, tools for managing appointments and medical documents, personalized health insights, emergency information access, and a supportive community forum.

Pregnancy can be an exciting yet overwhelming journey, often leaving expectant mothers navigating a sea of information, anxieties about symptoms, challenges in managing appointments, and difficulties tracking crucial health metrics. Existing resources might be generic, fragmented across different apps, or lack immediate, personalized support. MomCare AI aims to provide comprehensive, personalized, and accessible support for expectant mothers. It addresses the need for reliable information, convenient health management tools, and community connection during pregnancy by leveraging Groq and modern web technologies

Reduces Information Overload & Anxiety: Instead of sifting through endless websites, users get instant, personalized answers to their pregnancy questions via an AI Chat Assistant

Simplifies Health Management: Managing appointments, tracking vital signs (blood pressure, blood sugar, weight), and remembering medications becomes effortless. The platform offers:

▶️ An intuitive Appointment Scheduler with reminders.

▶️ Dedicated sections in the Profile Page for logging health readings.

▶️ A central Dashboard consolidating upcoming events, health summaries, and relevant tips with medication reminder

▶️ Centralizes & Secures Medical Data: Users can securely upload and manage their medical documents (scans, test results) in one place

▶️ Community & Provides Reliable Information: A Community Forum allows users to connect with peers for support and shared experiences, moderated by AI for safety. Resources section features curated blog posts on various pregnancy-related topics.

▶️ Enhances Safety & Preparedness: The Emergency page provides quick access to critical contacts, lists urgent warning signs, and integrates with Google Maps to find nearby hospitals, offering crucial support in potential emergencies.

In essence, MomCare AI consolidates essential pregnancy tools, enhances them with personalized AI insights, and provides a secure, supportive environment

---

## 🧠 Team & Approach

### Team Name:
`SOLO HACKER`

### Team Members:
- ADITYA VERMA ([GitHub](https://github.com/ADITYAVOFFICIAL/))

### Your Approach:
- **Why you chose this problem:** Pregnancy is a critical time often filled with information overload and anxiety. I saw a clear need for a centralized, AI-enhanced platform to provide reliable, personalized support and simplify health management for expectant mothers. The potential to leverage Groq's fast AI capabilities to offer instant answers, personalized content, and even assist with tasks like OCR for medical documents felt like a powerful way to address these challenges directly. The goal was to create a comprehensive, user-friendly companion app.
- **Key challenges you addressed:**
    - **Integrating Diverse AI Features:** Implementing Groq effectively for multiple distinct tasks (chat, OCR, content generation, moderation, meal/exercise planning, product suggestions) required careful prompt engineering and API integration within different parts of the application.
    - **Backend-as-a-Service Complexity:** Utilizing Appwrite for authentication, multiple database collections (user data, appointments, health metrics, forum, documents, etc.), storage, and potentially functions demanded a solid understanding of its services and secure permission configurations.
    - **Data Management & Security:** Ensuring user data (profile info, health readings, medical documents) was handled securely within Appwrite was a priority, involving setting up appropriate collection-level permissions.
    - **Blockchain Interaction:** Integrating the Monad blockchain for the game leaderboard involved setting up the Solidity smart contract, deploying it to the testnet, and using Ethers.js on the frontend to interact with it for submitting high scores.
    - **Full-Stack Solo Development:** As a solo hacker, managing the entire stack – frontend (React, TypeScript, Vite, Tailwind, Shadcn UI, Zustand, React Query), backend (Appwrite), AI (Groq), and blockchain (Solidity, Ethers.js) – within the hackathon timeframe was a significant undertaking.
- **Any pivots, brainstorms, or breakthroughs during hacking:**
    - The initial scope was ambitious for a solo developer. A key focus became prioritizing core features like the AI chat, health tracking, and document management.
    - A breakthrough was refining the Groq prompts to get consistently useful and appropriately formatted responses for features like meal suggestions and OCR transcription.
    - Successfully deploying the `StackTheBox.sol` contract to the Monad testnet and seeing the first high score recorded via the frontend interaction was a major milestone, validating the web3 integration concept.
    - Deciding to use Appwrite as a BaaS significantly accelerated backend development compared to building a custom backend from scratch, allowing more time to focus on AI and frontend features.

---

## 🛠️ Tech Stack

### Core Technologies Used:
- **Frontend:** [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **Backend:** [Appwrite](https://appwrite.io/) (Backend-as-a-Service), [Fluvio InfinyOn](https://infinyon.cloud/) 
- **Database:** Appwrite Databases
- **APIs:** [Groq API](https://groq.com/) (AI Chat, Content Generation/Formatting, Moderation, OCR), Appwrite API, [Google Maps API](https://developers.google.com/maps) (implied for Emergency Page)
- **Blockchain:** [Solidity](https://soliditylang.org/) ([`contracts/StackTheBox.sol`](contracts/StackTheBox.sol)), [Ethers.js](https://ethers.io/)
- **State Management:** [Zustand](https://zustand-demo.pmnd.rs/)
- **Data Fetching:** [TanStack Query (React Query)](https://tanstack.com/query/latest)
- **Hosting:** [Vercel](https://vercel.com/) (implied by [`vercel.json`](vercel.json))

### Sponsor Technologies Used:
- [✅] **Groq:** Used for the AI chat assistant ([`src/pages/ChatPage.tsx`](src/pages/ChatPage.tsx)), OCR/transcription ([`momcare-backend/src/lib/groq.ts`](momcare-backend/src/lib/groq.ts)), content formatting ([`src/lib/groqf.ts`](src/lib/groqf.ts)), content moderation ([`src/lib/groqMod.ts`](src/lib/groqMod.ts)), meal/exercise generation ([`src/pages/MealPage.tsx`](src/pages/MealPage.tsx), [`src/lib/groqMeal.ts`](src/lib/groqMeal.ts)), and product suggestions ([`src/pages/ProductPage.tsx`](src/pages/ProductPage.tsx)).
- [✅] **Monad:** Used for the blockchain stacking game leaderboard via a Solidity smart contract ([`contracts/StackTheBox.sol`](contracts/StackTheBox.sol)) deployed on the Monad Testnet, interacted with from the [`src/pages/GamesPage.tsx`](src/pages/GamesPage.tsx).
- [✅] **Fluvio:** _Real-time data handling_
- [ ] **Base:** _AgentKit / OnchainKit / Smart Wallet usage_ (Dependency `@coinbase/onchainkit` present in [`package.json`](package.json), but usage not confirmed in provided context)
- [ ] **Screenpipe:** _Screen-based analytics or workflows_
- [ ] **Stellar:** _Payments, identity, or token usage_
*(Mark with ✅ if completed)*
---

## ✨ Key Features

- ✅ **AI Chat Assistant:** Personalized Q&A and image transcription (OCR) powered by Groq ([`src/pages/ChatPage.tsx`](src/pages/ChatPage.tsx), [`momcare-backend/src/lib/groq.ts`](momcare-backend/src/lib/groq.ts)).
- ✅ **Personalized Dashboard:** Tracks pregnancy milestones, displays upcoming appointments, medication reminders, and recent health readings ([`src/pages/DashboardPage.tsx`](src/pages/DashboardPage.tsx)).
- ✅ **Appointment Scheduling:** Book and manage prenatal care appointments ([`src/pages/AppointmentPage.tsx`](src/pages/AppointmentPage.tsx)).
- ✅ **Medical Document Management:** Securely upload, view, and delete medical records ([`src/pages/MedicalDocsPage.tsx`](src/pages/MedicalDocsPage.tsx)).
- ✅ **Community Forum:** Create topics, post replies, vote on content, with AI moderation ([`src/pages/ForumPage.tsx`](src/pages/ForumPage.tsx)).
- ✅ **Resources & Blog:** Access articles and filter by category ([`src/pages/ResourcesPage.tsx`](src/pages/ResourcesPage.tsx), [`src/pages/BlogPostPage.tsx`](src/pages/BlogPostPage.tsx)).
- ✅ **Emergency Information:** Quick access to warning signs and nearby hospitals using geolocation ([`src/pages/Emergency.tsx`](src/pages/Emergency.tsx)).
- ✅ **AI Meal & Exercise Ideas:** Personalized suggestions based on user profile ([`src/pages/MealPage.tsx`](src/pages/MealPage.tsx), [`src/lib/groqMeal.ts`](src/lib/groqMeal.ts)).
- ✅ **AI Product Suggestions:** Recommends relevant products with bookmarking ([`src/pages/ProductPage.tsx`](src/pages/ProductPage.tsx)).
- ✅ **Blockchain Game:** Fun stacking game with high scores submitted to a Monad blockchain leaderboard ([`src/pages/GamesPage.tsx`](src/pages/GamesPage.tsx), [`contracts/StackTheBox.sol`](contracts/StackTheBox.sol)).
- ✅ **User Authentication & Profile:** Secure login/signup and profile management ([`src/pages/Login.tsx`](src/pages/Login.tsx), [`src/pages/SignUp.tsx`](src/pages/SignUp.tsx), [`src/pages/ProfilePage.tsx`](src/pages/ProfilePage.tsx)).
- ✅ **Health Tracking:** Log and visualize Blood Pressure, Blood Sugar, and Weight readings ([`src/components/ui/MedCharts.tsx`](src/components/ui/MedCharts.tsx)).
- ✅ **Medication Reminders:** Create and manage medication schedules ([`src/lib/appwrite.ts`](src/lib/appwrite.ts)).

*(Add images, GIFs, or screenshots if helpful!)*

---

## 📽️ Demo & Deliverables

- **Demo Video Link:** [Paste YouTube or Loom link here]
- **Pitch Deck / PPT Link:** [Paste Google Slides / PDF link here]

---

## ✅ Tasks & Bonus Checklist

- [✅] **All members of the team completed the mandatory task - Followed at least 2 of our social channels and filled the form** (Details in Participant Manual)
- [✅] **All members of the team completed Bonus Task 1 - Sharing of Badges and filled the form (2 points)** (Details in Participant Manual)
- [✅] **All members of the team completed Bonus Task 2 - Signing up for Sprint.dev and filled the form (3 points)** (Details in Participant Manual)

*(Mark with ✅ if completed)*

---

## 🧪 How to Run the Project

### Requirements:
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Bun](https://bun.sh/) (Used for package management, `npm` or `yarn` can also be used - see [`package.json`](package.json))
- API Keys for Appwrite, Groq, and Google Maps.
- An `.env.development.local` file in the project root. Copy `.env.example` (if available) or create one based on the required environment variables listed below.

### Environment Variables (`.env.development.local`):
Create this file in the project root and add your keys:
```env
# Appwrite Configuration (Get from your Appwrite Cloud project)
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
VITE_PUBLIC_APPWRITE_USER_COUNT_FUNCTION_ID="YOUR_USER_COUNT_FUNCTION_ID" # Optional, if using user count function

# Groq API Key (Get from GroqCloud)
VITE_PUBLIC_GROQ_API_KEY="YOUR_GROQ_API_KEY"

# Google Maps API Key (Get from Google Cloud Console, enable Maps JavaScript API)
VITE_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"

# Optional: Fluvio/OnChainKit Keys if used
# VITE_PUBLIC_FLUVIO_ACCESS_KEY="YOUR_FLUVIO_KEY"
# VITE_PUBLIC_ONCHAINKIT_API_KEY="YOUR_ONCHAINKIT_KEY"
```
*(See [`src/lib/appwrite.ts`](src/lib/appwrite.ts) and [`src/utils/appwriteConfig.ts`](src/utils/appwriteConfig.ts) for where these variables are used)*

### Local Setup:
```bash
# 1. Clone the repository
git clone https://github.com/your-team/MomCare-AI # Replace with your actual repo URL
cd MomCare-AI

# 2. Install dependencies
bun install # or npm install / yarn install

# 3. Set up environment variables
# Create the .env.development.local file as described above

# 4. Start the development server
bun run dev # or npm run dev / yarn dev
```

The application should now be running on `http://localhost:8080` (as configured in [`vite.config.ts`](vite.config.ts)). The backend is handled by Appwrite Cloud.

---

## 🧬 Future Scope

- 🛡️ **Enhanced Security & Privacy:** Review Appwrite permissions, implement data encryption at rest/transit where applicable.
- 🌐 **Localization & Accessibility:** Support for multiple languages (i18n), improved accessibility compliance (WCAG AA).
- 🔔 **Push Notifications:** Real-time reminders for appointments, medications, and important milestones via Appwrite Functions or a dedicated service.

---

## 📎 Resources / Credits

- **Frameworks/Libraries:** React, Vite, TypeScript, Tailwind CSS, Shadcn UI, Ethers.js, Matter.js, TanStack Query, Zustand, date-fns, React Markdown, Lucide React Icons, Framer Motion, Recharts, `react-hook-form`, `zod`. (See [`package.json`](package.json) for full list)
- **Services:** Appwrite (Backend & Database), Groq (AI), Vercel (Hosting), Google Maps (Geolocation/Places).
- **Blockchain:** Monad Platform.
- **Inspiration/Acknowledgements:** Mention any specific resources, tutorials, or individuals who helped.

---

## 🏁 Final Words

This hackathon was an intense but incredibly rewarding solo journey! Building MomCare AI involved diving deep into a diverse tech stack. Integrating everything – from Appwrite's backend services and database permissions (which definitely required some careful configuration!) to crafting effective prompts for Groq's various AI capabilities (like chat, OCR, and content generation) – was a significant challenge. Getting the Monad blockchain interaction working smoothly for the game leaderboard using Ethers.js also took some dedicated effort.

Despite the hurdles, it was amazing to see all the pieces come together. From the real-time forum updates potentially powered by Fluvio (dependency is there!) to the core React frontend with Shadcn UI, Zustand, and TanStack Query, it was a fantastic learning experience in rapid full-stack development. Seeing the AI provide genuinely helpful suggestions or the high score appear on the blockchain felt like major wins. It's exciting to think about the potential of AI and web3 to create supportive tools like MomCare AI. A huge shout-out to the organizers and the power of these modern development tools!

---