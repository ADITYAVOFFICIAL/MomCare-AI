import React, { Suspense, lazy, useEffect } from "react"; // Import lazy and Suspense
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// UI Components (Keep these static imports)
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

// Auth and Store (Keep these static imports)
import { useAuthStore } from "@/store/authStore";
import { PublicRoute, PrivateRoute } from '@/components/auth/AuthRoute.tsx';

// --- Lazy Load Page Components ---
// This tells Vite/React to load the code for these pages only when they are needed.
const HomePage = lazy(() => import("./pages/HomePage"));
const Login = lazy(() => import("./pages/Login"));
const SignUp = lazy(() => import("./pages/SignUp"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const EmergencyPage = lazy(() => import("./pages/Emergency"));
const AppointmentPage = lazy(() => import("./pages/AppointmentPage"));
const MedicalDocsPage = lazy(() => import("./pages/MedicalDocsPage"));
const ResourcesPage = lazy(() => import("./pages/ResourcesPage"));
const CreateBlogPage = lazy(() => import("./pages/CreateBlogPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const BlogPostPage = lazy(() => import('@/pages/BlogPostPage'));
const SupportVideoPage = lazy(() => import('./pages/SupportVideoPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const EditBlogPage = lazy(() => import("./pages/EditBlogPage"));
const ForumPage = lazy(() => import("./pages/ForumPage"));
const ProductsPage = lazy(() => import("./pages/ProductPage"));
const MealPage = lazy(() => import("./pages/MealPage"));
const GamesPage = lazy(() => import("./pages/GamesPage"));
const DoctorPage = lazy(() => import("./pages/DoctorPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const SymPage = lazy(() => import("./pages/SymptomCheckerPage"));
const MonadPage = lazy(() => import("./pages/MonadPage"));
const PatientDetailPage = lazy(() => import("./pages/doctor/PatientDetailPage"));

// You might want a more sophisticated loading component
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Loading...
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
      queries: {
          staleTime: 1000 * 60 * 5, // 5 minutes
          refetchOnWindowFocus: false,
          retry: 1,
      },
  },
});

const App = () => {
  const { checkAuth } = useAuthStore();

  // Check authentication status on app load
  useEffect(() => {
    checkAuth();
  }, [checkAuth]); // checkAuth function reference is stable from zustand

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        {/* Keep Toasters outside Suspense if they need to be always available */}
        <Toaster />
        <Sonner />
        <BrowserRouter>
          {/* Suspense Wrapper: Displays fallback while lazy components load */}
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPolicyPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/emergency" element={<EmergencyPage />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
              <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
              <Route path="/appointment" element={<PrivateRoute><AppointmentPage /></PrivateRoute>} />
              <Route path="/medicaldocs" element={<PrivateRoute><MedicalDocsPage /></PrivateRoute>} />
              <Route path="/create-blog" element={<PrivateRoute><CreateBlogPage /></PrivateRoute>} />
              <Route path="/sup" element={<PrivateRoute><SupportVideoPage /></PrivateRoute>} />
              <Route path="/products" element={<PrivateRoute><ProductsPage /></PrivateRoute>} />
              <Route path="/meals" element={<PrivateRoute><MealPage /></PrivateRoute>} />
              <Route path="/games" element={<PrivateRoute><GamesPage /></PrivateRoute>} />
              <Route path="/doctor" element={<PrivateRoute><DoctorPage /></PrivateRoute>} />
              <Route path="/chat" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
              <Route path="/schecker" element={<PrivateRoute><SymPage /></PrivateRoute>} />
              <Route path="/resources" element={<PrivateRoute><ResourcesPage /></PrivateRoute>} />
              <Route path="/milestones" element={<PrivateRoute><MonadPage /></PrivateRoute>} />
              <Route path="/blog/:slug" element={<PrivateRoute><BlogPostPage /></PrivateRoute>} />
              <Route path="/edit-blog/:slug" element={<PrivateRoute><EditBlogPage /></PrivateRoute>} />
              <Route path="/doctor/patient/:userId" element={<PrivateRoute requiredRole="doctor"><PatientDetailPage /></PrivateRoute>} />
              <Route path="/forum" element={<PrivateRoute><ForumPage /></PrivateRoute>} />
              <Route path="/forum/:topicId" element={<PrivateRoute><ForumPage /></PrivateRoute>} />

              {/* 404 Route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;