// src/pages/NotFound.tsx

import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom'; // Import Link for navigation
import { Button } from '@/components/ui/button'; // Assuming you have a Button component
import { Home, Search, HelpCircle, ChevronLeft } from 'lucide-react'; // Import relevant icons
import MainLayout from '@/components/layout/MainLayout'; // Assuming you want it within the main layout

const NotFound = () => {
  const location = useLocation();

  // Log the error for developers
  useEffect(() => {
    console.error(
      `404 Not Found: User attempted to access non-existent route: ${location.pathname}${location.search}${location.hash}`
    );
  }, [location]); // Log whenever the full location changes

  return (
    // Use MainLayout if you want header/footer, otherwise use a simpler div
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-150px)] px-4 py-12 bg-gradient-to-br from-gray-50 to-momcare-light/30 text-center">
        {/* Adjust min-height based on your header/footer height */}

        <div className="max-w-md w-full">
          {/* Icon or Illustration */}
          <HelpCircle
            className="mx-auto h-20 w-20 text-momcare-primary/50 mb-6"
            strokeWidth={1.5}
          />

          {/* Main Heading */}
          <h1 className="text-6xl font-extrabold text-momcare-primary mb-3 tracking-tight">
            404
          </h1>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Page Not Found
          </h2>

          {/* Informative Text */}
          <p className="text-gray-600 mb-8 text-base leading-relaxed">
            We're sorry, but the page you're looking for doesn't seem to exist.
            It might have been moved, deleted, or perhaps the link was mistyped.
          </p>

          {/* Action Buttons */}
          <div className="space-y-4 sm:space-y-0 sm:flex sm:justify-center sm:space-x-4">
            <Button
              asChild // Use asChild to make the Link component behave like a Button
              size="lg"
              className="w-full sm:w-auto bg-momcare-primary hover:bg-momcare-dark"
            >
              <Link to="/">
                <Home className="mr-2 h-5 w-5" /> Go to Homepage
              </Link>
            </Button>

            {/* Optional: Add other helpful links */}
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto border-momcare-primary/50 text-momcare-primary hover:bg-momcare-light/50 hover:text-momcare-primary"
            >
              <Link to="/dashboard">
                 <ChevronLeft className="mr-2 h-5 w-5" /> Go to Dashboard
              </Link>
            </Button>

            {/* Optional: Search Button (if you have search functionality) */}
            {/* <Button variant="ghost" size="lg" className="w-full sm:w-auto text-gray-600 hover:text-momcare-primary">
              <Search className="mr-2 h-5 w-5" /> Search Site
            </Button> */}
          </div>

           {/* Display the path that was not found (optional, maybe only in dev?) */}
           {import.meta.env.DEV && (
             <p className="mt-10 text-xs text-gray-400 font-mono break-all">
               Attempted path: {location.pathname}
             </p>
           )}
        </div>
      </div>
    </MainLayout>
  );
};

export default NotFound;