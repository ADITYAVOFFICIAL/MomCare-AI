import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Redirect authenticated users away from login/signup pages
export const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Only render children if not authenticated, otherwise return null while redirecting
  return !isAuthenticated ? <>{children}</> : null;
};

// Redirect unauthenticated users to login
export const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: window.location.pathname } });
    }
  }, [isAuthenticated, navigate]);

  // Only render children if authenticated, otherwise return null while redirecting
  return isAuthenticated ? <>{children}</> : null;
};