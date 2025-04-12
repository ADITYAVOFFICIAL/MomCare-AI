# MomCare AI Assistant [![MomCare AI Logo](https://momcare-dayzero.vercel.app/favicon.ico)](https://momcare-dayzero.vercel.app/)

[![GitHub Repo stars](https://img.shields.io/github/stars/ADITYAVOFFICIAL/MomCare-AI-Dayzero?style=flat-square)](https://github.com/ADITYAVOFFICIAL/MomCare-AI-Dayzero/stargazers)
[![GitHub forks](https://img.shields.io/github/forks/ADITYAVOFFICIAL/MomCare-AI-Dayzero?style=flat-square)](https://github.com/ADITYAVOFFICIAL/MomCare-AI-Dayzero/network/members)
[![GitHub issues](https://img.shields.io/github/issues/ADITYAVOFFICIAL/MomCare-AI-Dayzero?style=flat-square)](https://github.com/ADITYAVOFFICIAL/MomCare-AI-Dayzero/issues)
[![GitHub license](https://img.shields.io/github/license/ADITYAVOFFICIAL/MomCare-AI-Dayzero?style=flat-square)](https://github.com/ADITYAVOFFICIAL/MomCare-AI-Dayzero/blob/main/LICENSE)

**Live Demo:** [https://momcare-dayzero.vercel.app/](https://momcare-dayzero.vercel.app/)

A comprehensive healthcare platform designed to support expectant mothers with AI-powered assistance, health tracking, emergency support, and resources.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Appwrite Backend Setup](#appwrite-backend-setup)
- [Available Scripts](#available-scripts)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Overview

MomCare AI is a full-featured web application that combines artificial intelligence with maternal healthcare. The platform provides:

-   **AI-powered chat assistance** for pregnancy questions and concerns.
-   **Health tracking** for vital metrics like blood pressure, blood sugar, and weight.
-   **Emergency support** with location-based hospital finding.
-   **Medical document storage** and management.
-   **Discussion forums** for community support.
-   **Appointment scheduling** and management.
-   **Educational resources** and blogs about pregnancy and maternal health.

## Features

### AI Chat Assistant

-   AI-powered conversation with Gemini API integration.
-   Context-aware responses based on user profile and health data.
-   Image analysis capabilities for visual concerns.
-   Conversation history and bookmarking.
-   Export chat transcripts as PDF.

### Health Tracking

-   Blood pressure monitoring.
-   Blood sugar level tracking.
-   Weight tracking.
-   Data visualization with charts.
-   Medication reminders.

### Emergency Support

-   Emergency contact information storage.
-   Warning signs detection assistance.
-   Nearby hospital locator using Google Maps.
-   Emergency preparedness guides.

### Document Management

-   Secure medical document storage.
-   Multiple file format support (PDF, images, etc.).
-   Document preview and download capabilities.

### Community & Resources

-   Discussion forums with topic categories.
-   Searchable blog posts and educational content.
-   Content management system for administrators.

### User Profile

-   Detailed pregnancy information section.
-   Personalized health recommendations based on profile.
-   Profile customization options.

## Tech Stack

### Frontend

-   **React**: UI library for building interfaces.
-   **TypeScript**: Superset of JavaScript adding static type safety.
-   **Vite**: Fast frontend build tool and development server.
-   **React Router**: Client-side routing and navigation.
-   **Tailwind CSS**: Utility-first CSS framework for styling.
-   **Shadcn UI**: Re-usable UI components built with Radix UI and Tailwind CSS.
-   **Recharts**: Composable charting library for data visualization.
-   **React Markdown**: Component to render Markdown content.
-   **Lucide React**: Library for beautiful and consistent icons.

### Backend (Serverless)

-   **Appwrite**: Backend-as-a-Service (BaaS) platform providing:
    -   Authentication (Email/Password, OAuth)
    -   Database (Collections, Documents)
    -   Storage (File uploads, management)
    -   Permissions (Role-based access control)

### AI & External APIs

-   **Google Generative AI (Gemini)**: Powers the AI chat assistant.
-   **Google Maps API**: Provides location services for emergency features (nearby hospitals).

### Development Tools

-   **ESLint**: Pluggable linting utility for JavaScript and TypeScript.
-   **TypeScript**: Language-level type checking.
-   **Vercel**: Platform for frontend deployment and hosting.

## Project Structure

```text
momcare-ai-connect/
├── public/                # Static assets (favicon, etc.)
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── auth/          # Authentication related components
│   │   ├── layout/        # Layout structures (Navbar, Sidebar, etc.)
│   │   └── ui/            # UI components from shadcn library
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility libraries and integrations
│   │   ├── appwrite.ts    # Appwrite client config & core functions
│   │   ├── gemini.ts      # Gemini AI API integration logic
│   │   ├── geminif.ts     # Gemini formatting utilities
│   │   ├── googleMaps.ts  # Google Maps API integration logic
│   │   ├── healthTips.ts  # Static health tips data/functions
│   │   └── utils.ts       # General utility functions
│   ├── pages/             # Application route components/pages
│   │   ├── AppointmentPage.tsx
│   │   ├── BlogPostPage.tsx
│   │   ├── ChatPage.tsx
│   │   ├── CreateBlogPage.tsx
│   │   ├── DashboardPage.tsx
│   │   ├── EditBlogPage.tsx
│   │   ├── Emergency.tsx
│   │   ├── ForumPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── Login.tsx
│   │   ├── MedicalDocsPage.tsx
│   │   ├── ProfilePage.tsx
│   │   └── ... other pages
│   ├── store/             # State management (e.g., Zustand or Context)
│   │   └── authStore.ts   # Authentication state logic
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # General utility functions specific to the app
│   │   └── appwriteConfig.ts # Appwrite IDs and configuration constants
│   ├── App.css            # Global CSS styles (minimal with Tailwind)
│   ├── App.tsx            # Main application component with routing
│   ├── index.css          # Tailwind CSS base styles and directives
│   └── main.tsx           # Application entry point
├── .env                   # Environment variables (local development, **DO NOT COMMIT**)
├── .gitignore             # Files and directories ignored by Git
├── components.json        # shadcn UI components configuration
├── eslint.config.js       # ESLint configuration file
├── index.html             # HTML entry point for Vite
├── package.json           # Project metadata, dependencies, and scripts
├── postcss.config.js      # PostCSS configuration (used by Tailwind)
├── README.md              # This file
├── tailwind.config.ts     # Tailwind CSS configuration file
├── tsconfig.app.json      # TypeScript configuration specific to the app build
├── tsconfig.json          # Base TypeScript configuration
├── tsconfig.node.json     # TypeScript configuration for Node.js environment (e.g., config files)
├── vercel.json            # Vercel deployment configuration (e.g., redirects)
└── vite.config.ts         # Vite configuration file
```
## Installation

### Prerequisites
- **Node.js:** v18 or higher recommended.
- **Package Manager:** npm or bun.
- **Appwrite Instance:** Access to an Appwrite Cloud project or a self-hosted instance.
- **Google Generative AI API Key:** Obtainable from Google AI Studio.
- **Google Maps API Key:** Obtainable from Google Cloud Console, with Geocoding API enabled.

### Setup Steps

1. **Clone the repository:**
    ```bash
    git clone https://github.com/ADITYAVOFFICIAL/MomCare-AI-Dayzero.git
    cd MomCare-AI-Dayzero
    # Or cd momcare-ai-connect if the inner folder name is different
    ```

2. **Install dependencies:**
    - Using npm:
      ```bash
      npm install
      ```
    - Or using Bun:
      ```bash
      bun install
      ```

3. **Set up environment variables:**
   Create a `.env` file in the root directory of the project. You can copy the contents of `.env.example` if available or use the structure below. Replace the placeholder values with your actual credentials:

   ```env
   # Appwrite Configuration
   VITE_PUBLIC_APPWRITE_ENDPOINT="https://cloud.appwrite.io/v1" # Your Appwrite endpoint
   VITE_PUBLIC_APPWRITE_PROJECT_ID="YOUR_APPWRITE_PROJECT_ID"
   VITE_PUBLIC_APPWRITE_BLOG_DATABASE_ID="YOUR_BLOG_DATABASE_ID"

   # Appwrite Collection IDs (Replace with your actual IDs)
   VITE_PUBLIC_APPWRITE_PROFILES_COLLECTION_ID="YOUR_PROFILES_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_APPOINTMENTS_COLLECTION_ID="YOUR_APPOINTMENTS_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_MEDICAL_DOCUMENTS_COLLECTION_ID="YOUR_MEDICAL_DOCS_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_BLOG_COLLECTION_ID="YOUR_BLOG_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_BP_COLLECTION_ID="YOUR_BP_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_SUGAR_COLLECTION_ID="YOUR_SUGAR_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_WEIGHT_COLLECTION_ID="YOUR_WEIGHT_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_MEDS_COLLECTION_ID="YOUR_MEDS_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_CHAT_HISTORY_COLLECTION_ID="YOUR_CHAT_HISTORY_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_BOOKMARKS_COLLECTION_ID="YOUR_BOOKMARKS_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_FORUM_TOPICS_COLLECTION_ID="YOUR_FORUM_TOPICS_COLLECTION_ID"
   VITE_PUBLIC_APPWRITE_FORUM_POSTS_COLLECTION_ID="YOUR_FORUM_POSTS_COLLECTION_ID"

   # Appwrite Storage Bucket IDs (Replace with your actual IDs)
   VITE_PUBLIC_APPWRITE_PROFILE_BUCKET_ID="YOUR_PROFILE_BUCKET_ID"
   VITE_PUBLIC_APPWRITE_MEDICAL_BUCKET_ID="YOUR_MEDICAL_BUCKET_ID"
   VITE_PUBLIC_APPWRITE_CHAT_IMAGES_BUCKET_ID="YOUR_CHAT_IMAGES_BUCKET_ID"

   # External API Keys
   VITE_PUBLIC_GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
   VITE_PUBLIC_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
# Environment & Appwrite Backend Setup

---

## Appwrite Backend Setup

### Create an Appwrite Project:
1. **Sign Up or Log In:**  
   Sign up or log in to your Appwrite instance (Cloud or self-hosted).

2. **Create a New Project:**  
   - Create a new project and note the **Project ID** and **API Endpoint**.
   - Under **"Platforms"**, add a Web app providing a name and the hostname (e.g., `localhost` for development or your domain for production).

### Enable Authentication:
1. **Navigate to Auth:**  
   Go to the **"Auth"** section of your Appwrite console.

2. **Enable Methods:**  
   Enable the desired authentication methods (Email/Password is recommended).

### Create Database and Collections:
1. **Create a New Database:**  
   - Navigate to the **"Databases"** section.
   - Create a new database (e.g., `MomCareDB`) and note the **Database ID**.

2. **Create Collections:**  
   Inside the newly created database, create the following collections and note each **Collection ID**. Define attributes and indexes as needed (refer to `src/types/` or `src/lib/appwrite.ts` for potential schema guidance):

   - **profiles**
   - **appointments**
   - **medical_documents**
   - **blog_posts**
   - **blood_pressure**
   - **blood_sugar**
   - **weight**
   - **medications**
   - **chat_history**
   - **bookmarked_messages**
   - **forum_topics**
   - **forum_posts**

   > **Important:** Set appropriate permissions for each collection so that users can only read/write their own documents.

### Set Up Storage Buckets:
1. **Create Buckets:**  
   - Navigate to the **"Storage"** section.
   - Create the following buckets and note each **Bucket ID**:
     - **profile_photos**
     - **medical_files**
     - **chat_images**

2. **Configure Permissions:**  
   - Configure permissions for each bucket (e.g., allow authenticated users to upload, read, and delete their own files).
   - Consider setting file size limits and enabling encryption/antivirus if needed.

### API Keys (Optional):
- **Server-Side Operations:**  
  If you need server-side operations or admin tasks outside the user context, create API keys with specific scopes under **Project Settings → API Keys**.

---

## Available Scripts

In the project directory, you can run the following commands:

- **Start the development server (with hot reloading):**
  ```bash
  npm run dev
  # or
  bun run dev


# Build the Application for Production

Build the application for production using one of the following commands:

```bash
npm run build
# or
bun run build
```
# Lint the codebase using ESLint
```bash
npm run lint
# or
bun run lint
```
# Preview the production build locally
```bash
npm run preview
# or
bun run preview
```
# Bash Deployment

This project is pre-configured for easy deployment to **Vercel**.

## Vercel Deployment Steps

1. **Push to GitHub**  
   Ensure your code is pushed to a GitHub repository.

2. **Connect Repository to Vercel**  
   - Sign up or log in to Vercel.
   - Import your GitHub repository. Vercel should automatically detect it as a Vite project.

3. **Configure Environment Variables**  
   - Go to your project settings in Vercel.
   - Navigate to **Environment Variables**.
   - Add all the variables defined in your `.env` file (prefixed with `VITE_PUBLIC_`).  
     *Do not include secrets here if they shouldn't be public; Vercel handles build-time vs. runtime variables differently if needed, but Vite requires the `VITE_` prefix for client-side access.*

4. **Deploy**  
   - Trigger a deployment. Vercel will build and deploy your application.
   - Once finished, you'll get a deployment URL (e.g., `*.vercel.app`).

5. **Custom Domain (Optional)**  
   Configure a custom domain in your Vercel project settings under the **Domains** tab.

---

## Other Hosting Options

You can host this Vite application on other platforms (Netlify, AWS Amplify, Cloudflare Pages, self-hosted server):

- **Build the Project:**  
  ```bash
  npm run build
  # or
  bun run build
  ```
  
## Configure Hosting

-   Set the build command (e.g., `npm run build`).
-   Set the publish directory (usually `dist`).
-   **Crucially**: Configure SPA (Single Page Application) redirects. All routes should redirect to `index.html` to allow React Router to handle routing.
-   Set up the necessary environment variables on the hosting platform.

## Contributing

Contributions are welcome! Please follow these steps:

1.  Fork the repository ([https://github.com/ADITYAVOFFICIAL/MomCare-AI-Dayzero/fork](https://github.com/ADITYAVOFFICIAL/MomCare-AI-Dayzero/fork)).
2.  Create a new branch for your feature or bug fix:
    ```bash
    git checkout -b feature/your-amazing-feature
    ```
    or
    ```bash
    git checkout -b fix/issue-description
    ```
3.  Make your changes and commit them with clear, descriptive messages:
    ```bash
    git commit -m 'feat: Add feature X' -m 'Detailed description of changes...'
    ```
4.  Push your changes to your forked repository:
    ```bash
    git push origin feature/your-amazing-feature
    ```
5.  Open a Pull Request (PR) against the `main` branch of the original repository (`ADITYAVOFFICIAL/MomCare-AI-Dayzero`).
6.  Ensure your PR includes a clear description of the changes and addresses any related issues (e.g., `Closes #123`).
7.  Make sure linting checks pass: `npm run lint` or `bun run lint`.

Please check the Issues tab for existing bugs or feature requests before starting work.

## License

This project is licensed under the MIT License. See the `LICENSE` file for details.
