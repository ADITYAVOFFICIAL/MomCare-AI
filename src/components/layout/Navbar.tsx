// src/components/layout/Navbar.tsx (or your file path)

import React, { useState, useEffect, useMemo } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom'; // Use NavLink for active styling
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import {
  Menu,
  X,
  User,
  Heart,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Settings, // Example icon for profile
  FileText, // Example icon for documents
  Gamepad2, // Games icon
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast'; // Corrected import path assuming hooks dir
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUserProfile, getFilePreview, profileBucketId } from '@/lib/appwrite';
import { cn } from '@/lib/utils'; // Import cn utility for conditional classes
import { motion, AnimatePresence } from 'framer-motion'; // For mobile menu animation

// Define Navigation Item Structure
interface NavItem {
  path: string;
  label: string;
  requiresAuth: boolean; // Flag to indicate if auth is needed
  hideWhenAuth?: boolean; // Optional: Flag to hide when authenticated (e.g., Login/Signup)
  isDesktopOnly?: boolean; // Optional: Hide on mobile if needed
  isMobileOnly?: boolean; // Optional: Hide on desktop if needed
}

// Centralized Navigation Items
const navItems: NavItem[] = [
  // --- Links shown ONLY when logged OUT ---
  { path: '/login', label: 'Log In', requiresAuth: false, hideWhenAuth: true, isMobileOnly: true }, // Mobile only login
  { path: '/signup', label: 'Sign Up', requiresAuth: false, hideWhenAuth: true, isMobileOnly: true }, // Mobile only signup

  // --- Links shown ONLY when logged IN ---
  { path: '/chat', label: 'Chat', requiresAuth: true },
  { path: '/appointment', label: 'Appointments', requiresAuth: true },
  { path: '/forum', label: 'Forum', requiresAuth: true },
  { path: '/meals', label: 'Meals & Exercises', requiresAuth: true },
  { path: '/products', label: 'Products', requiresAuth: true },
  { path: '/dashboard', label: 'Dashboard', requiresAuth: true },
  { path: '/profile', label: 'Profile', requiresAuth: true, isMobileOnly: true }, // Show Profile in mobile nav too
  { path: '/medicaldocs', label: 'Documents', requiresAuth: true, isMobileOnly: true }, // Show Docs in mobile nav too
  { path: '/games', label: 'Games', requiresAuth: true, isMobileOnly: true }, // Show Games in mobile nav too

  // --- Links shown REGARDLESS of auth status ---
  { path: '/emergency', label: 'Emergency', requiresAuth: false },
  { path: '/resources', label: 'Resources', requiresAuth: false }, // Resources might be public or private, adjust requiresAuth if needed
];

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [isFetchingPhoto, setIsFetchingPhoto] = useState(false);

  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Memoize filtered navigation items for performance
  const filteredDesktopNavItems = useMemo(() =>
    navItems.filter(item =>
      !item.isMobileOnly && // Exclude mobile-only items
      (isAuthenticated ? item.requiresAuth || !item.hideWhenAuth : !item.requiresAuth)
    ), [isAuthenticated]);

  const filteredMobileNavItems = useMemo(() =>
  navItems.filter(item =>
    !item.isDesktopOnly && // Exclude desktop-only items
    (isAuthenticated ? item.requiresAuth || !item.hideWhenAuth : !item.requiresAuth)
  ), [isAuthenticated]);


  // Fetch Profile Photo Effect
  useEffect(() => {
    let isMounted = true; // Prevent state updates on unmounted component
    const fetchProfilePhoto = async () => {
      if (!user?.$id || !profileBucketId) {
        setProfilePhotoUrl(null); // Reset if no user or bucket ID
        return;
      }
      setIsFetchingPhoto(true);
      try {
        const profile = await getUserProfile(user.$id);
        if (isMounted && profile?.profilePhotoId) {
          const photoUrl = getFilePreview(profile.profilePhotoId, profileBucketId);
          // Use nullish coalescing for safety, though getFilePreview should handle it
          setProfilePhotoUrl(photoUrl?.toString() ?? null);
        } else if (isMounted) {
          setProfilePhotoUrl(null); // Reset if no photo ID found
        }
      } catch (error) {
        console.error("Error fetching profile photo for navbar:", error);
        if (isMounted) setProfilePhotoUrl(null); // Reset on error
      } finally {
         if (isMounted) setIsFetchingPhoto(false);
      }
    };

    if (isAuthenticated) {
      fetchProfilePhoto();
    } else {
      setProfilePhotoUrl(null); // Clear photo if logged out
    }

    return () => { isMounted = false }; // Cleanup function
  }, [user?.$id, isAuthenticated]); // Depend on user ID and auth status

  // Logout Handler
  const handleLogout = async () => {
    try {
      await logout();
      setProfilePhotoUrl(null); // Clear photo immediately on logout action
      setIsOpen(false); // Close mobile menu if open
      toast({
        title: "Logged out successfully",
        description: "See you again soon!",
      });
      navigate('/'); // Navigate to home after logout
    } catch (error) {
      console.error("Logout failed:", error);
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Mobile Menu Toggle
  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false); // Helper to explicitly close

   // Mobile menu animation variants
   const mobileMenuVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.15, ease: 'easeIn' } },
  };


  // Common NavLink class generator
  const getNavLinkClass = ({ isActive }: { isActive: boolean }): string =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors duration-150",
      isActive
        ? "bg-momcare-light/70 text-momcare-primary dark:bg-momcare-primary/30 dark:text-white" // Active state styles
        : "text-gray-700 hover:bg-momcare-light/50 hover:text-momcare-primary dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white" // Default state styles
    );

  return (
    <nav className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-900/90">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex flex-shrink-0 items-center" aria-label="MomCare AI Homepage">
              <Heart className="h-8 w-8 text-momcare-accent" aria-hidden="true" />
              <span className="ml-2 text-xl font-bold text-momcare-primary dark:text-momcare-light">
                MomCare AI
              </span>
            </Link>
          </div>

          {/* Desktop Navigation & Auth Section */}
          <div className="hidden md:ml-6 md:flex md:items-center md:space-x-4">
            {/* Map over filtered desktop items */}
            {filteredDesktopNavItems.map((item) => (
              <NavLink key={item.path} to={item.path} className={getNavLinkClass}>
                {item.label}
              </NavLink>
            ))}

            {/* Desktop Auth Buttons / User Menu */}
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative flex h-9 w-9 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    aria-label="User menu"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profilePhotoUrl ?? undefined} alt={user.name || 'User avatar'} />
                      <AvatarFallback className="bg-momcare-primary text-white dark:bg-momcare-accent dark:text-gray-900">
                        {user.name?.substring(0, 2).toUpperCase() || <User className="h-4 w-4" />}
                      </AvatarFallback>
                    </Avatar>
                    {/* Optional: Add a small indicator or ChevronDown */}
                    {/* <ChevronDown className="ml-1 h-4 w-4 text-gray-500 dark:text-gray-400" /> */}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name || 'User'}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Dashboard</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Profile Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/medicaldocs')}>
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Medical Documents</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/games')}>
                    <Gamepad2 className="mr-2 h-4 w-4" />
                    <span>Games</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:bg-red-100 focus:text-red-700 dark:focus:bg-red-900/50 dark:focus:text-red-400">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" onClick={() => navigate('/login')} className="dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white">
                  Log In
                </Button>
                <Button onClick={() => navigate('/signup')}>
                  Sign Up
                </Button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="-mr-2 flex md:hidden">
            <button
              onClick={toggleMenu}
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-gray-100 p-2 text-gray-600 hover:bg-gray-200 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-momcare-primary dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
              aria-controls="mobile-menu"
              aria-expanded={isOpen}
              aria-label={isOpen ? "Close main menu" : "Open main menu"}
            >
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="border-t border-gray-200 md:hidden dark:border-gray-700"
            id="mobile-menu"
            variants={mobileMenuVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="space-y-1 px-2 pb-3 pt-2 sm:px-3">
              {/* Always show Home link */}
               <NavLink
                 key="home"
                 to="/"
                 className={({ isActive }) => cn(
                    "block rounded-md px-3 py-2 text-base font-medium",
                    isActive
                      ? "bg-momcare-light text-momcare-primary dark:bg-momcare-primary/30 dark:text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  )}
                 onClick={closeMenu}
               >
                 Home
               </NavLink>

              {/* Map over filtered mobile items */}
              {filteredMobileNavItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => cn(
                    "block rounded-md px-3 py-2 text-base font-medium",
                    isActive
                      ? "bg-momcare-light text-momcare-primary dark:bg-momcare-primary/30 dark:text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
                  )}
                  onClick={closeMenu} // Close menu on navigation
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
             {/* Mobile Logout Button */}
            {isAuthenticated && (
                <div className="border-t border-gray-200 px-2 py-3 dark:border-gray-700">
                     <button
                        onClick={handleLogout} // Logout function already closes menu
                        className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-red-600 hover:bg-red-100 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                    >
                        Log Out
                    </button>
                </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;