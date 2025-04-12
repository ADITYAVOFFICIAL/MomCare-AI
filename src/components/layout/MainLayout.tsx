
import React, { useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { useAuthStore } from '@/store/authStore';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  requireAuth = false
}) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication status on component mount
    const checkAuthentication = async () => {
      await checkAuth();
    };
    
    checkAuthentication();
  }, [checkAuth]);

  useEffect(() => {
    if (!isLoading && requireAuth && !isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to access this page.",
        variant: "destructive",
      });
      
      navigate('/login', { 
        state: { from: location.pathname } 
      });
    }
  }, [isAuthenticated, isLoading, requireAuth, navigate, location, toast]);

  if (isLoading && requireAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-momcare-primary h-12 w-12"></div>
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-momcare-primary rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-momcare-primary rounded"></div>
              <div className="h-4 bg-momcare-primary rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <Footer />
      <Toaster />
    </div>
  );
};

export default MainLayout;
