
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/authStore';
import { Menu, X, User, Heart, ChevronDown } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getUserProfile, getFilePreview, profileBucketId } from '@/lib/appwrite';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (!user?.$id) return;
      
      try {
        const profile = await getUserProfile(user.$id);
        if (profile?.profilePhotoId) {
          const photoUrl = getFilePreview(profile.profilePhotoId, profileBucketId);
          setProfilePhotoUrl(photoUrl.toString());
        }
      } catch (error) {
        console.error("Error fetching profile photo for navbar:", error);
      }
    };
    
    fetchProfilePhoto();
  }, [user]);
  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out successfully",
        description: "See you again soon!",
      });
      navigate('/');
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <Heart className="h-8 w-8 text-momcare-accent" />
              <span className="ml-2 text-xl font-bold text-momcare-primary">MomCare AI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-4">
              <Link to="/" className="text-gray-700 hover:text-momcare-primary px-3 py-2 rounded-md text-sm font-medium">
                Home
              </Link>
              <Link to="/chat" className="text-gray-700 hover:text-momcare-primary px-3 py-2 rounded-md text-sm font-medium">
                Chat
              </Link>
              <Link to="/emergency" className="text-gray-700 hover:text-momcare-primary px-3 py-2 rounded-md text-sm font-medium">
                Emergency
              </Link>
              <Link to="/appointment" className="text-gray-700 hover:text-momcare-primary px-3 py-2 rounded-md text-sm font-medium">
                Appointments
              </Link>
              <Link to="/resources" className="text-gray-700 hover:text-momcare-primary px-3 py-2 rounded-md text-sm font-medium">
                Resources
              </Link>
              <Link to="/forum" className="text-gray-700 hover:text-momcare-primary px-3 py-2 rounded-md text-sm font-medium">
                Forum
              </Link>
              <Link to="/dashboard" className="text-gray-700 hover:text-momcare-primary px-3 py-2 rounded-md text-sm font-medium">
                Dashboard
              </Link>

              {isAuthenticated ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
        <AvatarImage src={profilePhotoUrl || ""} alt={user?.name || "User"} />
        <AvatarFallback className="bg-momcare-primary text-white">
          {user?.name?.substring(0, 2).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')}>
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/medicaldocs')}>
                      Medical Documents
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex space-x-2">
                  <Button variant="outline" onClick={() => navigate('/login')}>
                    Log in
                  </Button>
                  <Button onClick={() => navigate('/signup')}>
                    Sign up
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-momcare-primary focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <Link
              to="/"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
              onClick={toggleMenu}
            >
              Home
            </Link>
            <Link
              to="/emergency"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
              onClick={toggleMenu}
            >
              Emergency
            </Link>
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
                  onClick={toggleMenu}
                >
                  Dashboard
                </Link>
                <Link
              to="/chat"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
              onClick={toggleMenu}
            >
              Chat
            </Link>
                <Link
                  to="/forum"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
                  onClick={toggleMenu}
                >
                  Forum
                </Link>
                <Link
                  to="/profile"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
                  onClick={toggleMenu}
                >
                  Profile
                </Link>
                <Link
                  to="/medicaldocs"
                  className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
                  onClick={toggleMenu}
                >
                  Medical Documents
                </Link>
                <Link
              to="/appointment"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
              onClick={toggleMenu}
            >
              Appointments
            </Link>
            <Link
              to="/resources"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
              onClick={toggleMenu}
            >
              Resources
            </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    toggleMenu();
                  }}
                  className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-700 hover:text-momcare-primary"
                >
                  Log out
                </button>
              </>
            ) : (
              <div className="flex flex-col space-y-2 mt-4 px-3">
                <Button variant="outline" onClick={() => {
                  navigate('/login');
                  toggleMenu();
                }}>
                  Log in
                </Button>
                <Button onClick={() => {
                  navigate('/signup');
                  toggleMenu();
                }}>
                  Sign up
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
