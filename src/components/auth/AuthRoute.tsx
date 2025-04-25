import React, { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Loader2 } from 'lucide-react'; // Assuming you use a loader component

// --- Define Props Interfaces ---

interface PrivateRouteProps {
  children: ReactNode;
  requiredRole?: string; // Optional role required to access the route
}

interface PublicRouteProps {
  children: ReactNode;
}

// --- Loading Component ---
// You might want a more central loading component, but this works for now.
const AuthLoadingFallback = () => (
  <div className="flex justify-center items-center h-screen">
    <Loader2 className="h-8 w-8 animate-spin text-momcare-primary" />
  </div>
);

// --- PrivateRoute Component ---
// Protects routes that require authentication and optionally a specific role.
export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, requiredRole }) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    // Show loading indicator while checking authentication status
    return <AuthLoadingFallback />;
  }

  if (!isAuthenticated) {
    // Redirect unauthenticated users to the login page, saving the location they tried to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if a specific role is required for this route
  if (requiredRole) {
    // Ensure user object and labels array exist, default to empty array if not
    const userRoles = user?.labels ?? [];
    if (!userRoles.includes(requiredRole)) {
      // User is authenticated but does not have the required role.
      // Redirect them to a default page (e.g., dashboard) or an "Unauthorized" page.
      console.warn(`Access denied to ${location.pathname}. Required role: "${requiredRole}". User roles: ${userRoles.join(', ')}`);
      // You might want to show a toast message here as well.
      return <Navigate to="/dashboard" replace />; // Or navigate to an "/unauthorized" page
    }
  }

  // If authenticated and role check passes (or no role is required), render the child component
  return <>{children}</>;
};

// --- PublicRoute Component ---
// Protects routes like login/signup, redirecting authenticated users away.
export const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    // Show loading indicator while checking authentication status
    return <AuthLoadingFallback />;
  }

  if (isAuthenticated) {
    // If user is authenticated, redirect them away from public-only routes (like login/signup)
    // Try to redirect back to the page they were originally trying to access, or default to dashboard
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  // If not authenticated, render the public route's child component (e.g., Login or SignUp page)
  return <>{children}</>;
};