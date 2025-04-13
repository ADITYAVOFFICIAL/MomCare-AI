![github-submission-banner](https://github.com/user-attachments/assets/a1493b84-e4e2-456e-a791-ce35ee2bcf2f)

# 🚀 MomCare AI

> Your AI-powered companion throughout your pregnancy journey. Get personalized support, access resources, and manage your health information securely.

---

## 📌 Problem Statement

Select the problem statement number and title from the official list given in Participant Manual.

**Example:**
**Problem Statement 7 – Transform the Future of Rural Commerce**

---

## 🎯 Objective

MomCare AI aims to provide comprehensive, personalized, and accessible support for expectant mothers. It addresses the need for reliable information, convenient health management tools, and community connection during pregnancy by leveraging AI and modern web technologies. The platform serves expectant mothers by offering an AI chat assistant for immediate queries, tools for managing appointments and medical documents, personalized health insights, emergency information access, and a supportive community forum.

---

## 🧠 Team & Approach

### Team Name:
`Your team name here`

### Team Members:
- Name 1 (GitHub / LinkedIn / Role)
- Name 2
- Name 3
*(Add links if you want)*

### Your Approach:
- Why you chose this problem
- Key challenges you addressed (e.g., integrating AI, ensuring data privacy, blockchain interaction)
- Any pivots, brainstorms, or breakthroughs during hacking

---

## 🛠️ Tech Stack

### Core Technologies Used:
- **Frontend:** [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [Tailwind CSS](https://tailwindcss.com/), [Shadcn UI](https://ui.shadcn.com/)
- **Backend:** [Appwrite](https://appwrite.io/) (Backend-as-a-Service)
- **Database:** Appwrite Databases
- **APIs:** [Groq API](https://groq.com/) (AI Chat, Content Generation/Formatting, Moderation), Appwrite API, [Google Maps API](https://developers.google.com/maps) (implied for Emergency Page)
- **Blockchain:** [Solidity](https://soliditylang.org/) ([`contracts/StackTheBox.sol`](contracts/StackTheBox.sol)), [Ethers.js](https://ethers.io/)
- **Hosting:** [Vercel](https://vercel.com/) (implied by [`vercel.json`](vercel.json))

### Sponsor Technologies Used (if any):
- [✅] **Groq:** Used for the AI chat assistant ([`ChatPage.tsx`](src/pages/ChatPage.tsx)), content formatting ([`ForumPage.tsx`](src/pages/ForumPage.tsx)), content moderation ([`ForumPage.tsx`](src/pages/ForumPage.tsx)), meal/exercise generation ([`MealPage.tsx`](src/pages/MealPage.tsx), [`lib/groqMeal.ts`](src/lib/groqMeal.ts)), and product suggestions ([`ProductPage.tsx`](src/pages/ProductPage.tsx)).
- [✅] **Monad:** Used for the blockchain stacking game leaderboard via a Solidity smart contract ([`contracts/StackTheBox.sol`](contracts/StackTheBox.sol)) deployed on the Monad Testnet, interacted with from the [`GamesPage.tsx`](src/pages/GamesPage.tsx).
- [ ] **Fluvio:** _Real-time data handling_
- [ ] **Base:** _AgentKit / OnchainKit / Smart Wallet usage_
- [ ] **Screenpipe:** _Screen-based analytics or workflows_
- [ ] **Stellar:** _Payments, identity, or token usage_
*(Mark with ✅ if completed)*
---

## ✨ Key Features

Highlight the most important features of your project:

- ✅ **AI Chat Assistant:** Personalized Q&A powered by Groq ([`ChatPage.tsx`](src/pages/ChatPage.tsx)).
- ✅ **Personalized Dashboard:** Tracks pregnancy milestones, displays upcoming appointments, and medication reminders ([`DashboardPage.tsx`](src/pages/DashboardPage.tsx)).
- ✅ **Appointment Scheduling:** Book and manage prenatal care appointments ([`AppointmentPage.tsx`](src/pages/AppointmentPage.tsx)).
- ✅ **Medical Document Management:** Securely upload and organize medical records ([`MedicalDocsPage.tsx`](src/pages/MedicalDocsPage.tsx)).
- ✅ **Community Forum:** Create topics, post replies, vote on content, with AI moderation ([`ForumPage.tsx`](src/pages/ForumPage.tsx)).
- ✅ **Resources & Blog:** Access articles and filter by category ([`ResourcesPage.tsx`](src/pages/ResourcesPage.tsx), [`BlogPostPage.tsx`](src/pages/BlogPostPage.tsx)).
- ✅ **Emergency Information:** Quick access to warning signs and nearby hospitals using geolocation ([`Emergency.tsx`](src/pages/Emergency.tsx)).
- ✅ **AI Meal & Exercise Ideas:** Personalized suggestions based on user profile ([`MealPage.tsx`](src/pages/MealPage.tsx)).
- ✅ **AI Product Suggestions:** Recommends relevant products with bookmarking ([`ProductPage.tsx`](src/pages/ProductPage.tsx)).
- ✅ **Blockchain Game:** Fun stacking game with high scores submitted to a Monad blockchain leaderboard ([`GamesPage.tsx`](src/pages/GamesPage.tsx)).
- ✅ **User Authentication & Profile:** Secure login/signup and profile management ([`src/pages/Login.tsx`](src/pages/Login.tsx), [`src/pages/SignUp.tsx`](src/pages/SignUp.tsx), [`src/pages/ProfilePage.tsx`](src/pages/ProfilePage.tsx)).

Add images, GIFs, or screenshots if helpful!

---

## 📽️ Demo & Deliverables

- **Demo Video Link:** [Paste YouTube or Loom link here]
- **Pitch Deck / PPT Link:** [Paste Google Slides / PDF link here]

---

## ✅ Tasks & Bonus Checklist

- [ ] **All members of the team completed the mandatory task - Followed at least 2 of our social channels and filled the form** (Details in Participant Manual)
- [ ] **All members of the team completed Bonus Task 1 - Sharing of Badges and filled the form (2 points)** (Details in Participant Manual)
- [ ] **All members of the team completed Bonus Task 2 - Signing up for Sprint.dev and filled the form (3 points)** (Details in Participant Manual)

*(Mark with ✅ if completed)*

---

## 🧪 How to Run the Project

### Requirements:
- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Bun](https://bun.sh/) (Used for package management, `npm` or `yarn` can also be used)
- API Keys for Appwrite, Groq, and potentially Google Maps.
- `.env.development.local` file setup (copy `.env.example` if provided, or create one based on required environment variables like `VITE_PUBLIC_APPWRITE_ENDPOINT`, `VITE_PUBLIC_APPWRITE_PROJECT_ID`, `VITE_PUBLIC_GROQ_API_KEY`, etc. - see [`src/lib/appwrite.ts`](src/lib/appwrite.ts) and [`src/utils/appwriteConfig.ts`](src/utils/appwriteConfig.ts)).

### Local Setup:
```bash
# Clone the repo
git clone https://github.com/your-team/MomCare-AI-Dayzero # Replace with your actual repo URL

# Install dependencies
cd MomCare-AI-Dayzero
bun install # or npm install / yarn install

# Set up environment variables
# Create a .env.development.local file and add your API keys/config
# Example:
# VITE_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
# VITE_PUBLIC_APPWRITE_PROJECT_ID=YOUR_PROJECT_ID
# VITE_PUBLIC_APPWRITE_BLOG_DATABASE_ID=YOUR_DATABASE_ID
# VITE_PUBLIC_APPWRITE_FORUM_TOPICS_COLLECTION_ID=YOUR_TOPICS_COLLECTION_ID
# ... other Appwrite IDs ...
# VITE_PUBLIC_GROQ_API_KEY=YOUR_GROQ_API_KEY

# Start development server
bun run dev # or npm run dev / yarn dev
```

The application should now be running on `http://localhost:5173` (or another port if specified). The backend is handled by Appwrite Cloud.

---

## 🧬 Future Scope

List improvements, extensions, or follow-up features:

- 📈 **Deeper AI Integration:** More proactive suggestions, symptom analysis (with disclaimers), personalized learning paths.
- 🛡️ **Enhanced Security & Privacy:** Fine-grained permissions, data encryption review.
- 🌐 **Localization & Accessibility:** Support for multiple languages, improved accessibility compliance (WCAG).
- 🤝 **Provider Portal:** Allow healthcare providers to interact with patient data (with consent).
- 📊 **Advanced Analytics:** Visualize health trends for users.
- 🔔 **Push Notifications:** Real-time reminders for appointments and medications.

---

## 📎 Resources / Credits

- **Frameworks/Libraries:** React, Vite, TypeScript, Tailwind CSS, Shadcn UI, Ethers.js, Matter.js, React Query, Zustand, date-fns, React Markdown, Lucide React Icons.
- **Services:** Appwrite (Backend & Database), Groq (AI), Vercel (Hosting), Google Maps (Geolocation/Places).
- **Blockchain:** Monad Platform.
- **Inspiration/Acknowledgements:** Mention any specific resources or individuals.

---

## 🏁 Final Words

Share your hackathon journey — challenges, learnings, fun moments, or shout-outs!

---