// src/store/authStore.ts (or your preferred location)

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getCurrentUser, login, logout, createAccount } from '@/lib/appwrite';
import { Models } from 'appwrite'; // Import Models for the full User type definition

/**
 * Defines the structure of the user object stored in the state.
 * Uses Appwrite's Models.User type to ensure all properties, including 'labels',
 * are correctly typed and available.
 * Models.Preferences allows for potential user preference data if used in Appwrite.
 */
type User = Models.User<Models.Preferences>;

/**
 * Defines the structure of the authentication state managed by Zustand.
 */
interface AuthState {
  /** The currently authenticated user object, or null if not logged in. */
  user: User | null;
  /** Indicates if an authentication-related asynchronous operation is in progress. */
  isLoading: boolean;
  /** Indicates if a user is currently authenticated. Derived from the presence of the user object. */
  isAuthenticated: boolean;
  /** Stores the last authentication-related error message, or null if no error. */
  error: string | null;

  /**
   * Attempts to log in a user with email and password.
   * Updates user, isAuthenticated, isLoading, and error state.
   * @param email - The user's email address.
   * @param password - The user's password.
   * @throws Re-throws the error if login fails, allowing UI components to handle it.
   */
  login: (email: string, password: string) => Promise<void>;

  /**
   * Attempts to sign up a new user and automatically logs them in.
   * Updates user, isAuthenticated, isLoading, and error state.
   * @param email - The new user's email address.
   * @param password - The new user's password.
   * @param name - The new user's name.
   * @throws Re-throws the error if signup or subsequent login fails.
   */
  signup: (email: string, password: string, name: string) => Promise<void>;

  /**
   * Logs out the current user by deleting the session.
   * Resets user, isAuthenticated, isLoading, and error state.
   */
  logout: () => Promise<void>;

  /**
   * Checks the current authentication status by attempting to fetch the current user.
   * Typically called on application load to restore session state.
   * Updates user, isAuthenticated, and isLoading state.
   */
  checkAuth: () => Promise<void>;

  /**
   * Manually sets the error state.
   * @param error - The error message string, or null to clear the error.
   */
  setError: (error: string | null) => void;
}

/**
 * Creates the Zustand store for authentication state management.
 * Uses `persist` middleware to save parts of the state (user, isAuthenticated)
 * to local storage, allowing session persistence across page reloads.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    // The store's setup function (defines initial state and actions)
    (set, get) => ({
      // --- Initial State ---
      user: null,
      // Start isLoading as true. checkAuth should run on app load and set it to false.
      isLoading: true,
      isAuthenticated: false,
      error: null,

      // --- Actions ---

      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true, error: null }); // Start loading, clear previous errors
          await login(email, password); // Call the Appwrite login function
          const currentUser = await getCurrentUser(); // Fetch the full user object
          console.log("User logged in:", currentUser); // Debug log
          set({
            user: currentUser, // Store the complete user object (includes labels)
            isAuthenticated: !!currentUser, // Set authenticated status
            isLoading: false // Stop loading
          });
        } catch (error: any) {
          console.error("Login error in store:", error);
          const errorMessage = error.message || 'Login failed. Please check your credentials.';
          set({
            isLoading: false, // Stop loading on error
            error: errorMessage // Set the error message
          });
          throw error; // Re-throw the error for potential UI handling
        }
      },

      signup: async (email: string, password: string, name: string) => {
        try {
          set({ isLoading: true, error: null });
          // createAccount function in appwrite.ts handles account creation AND login
          await createAccount(email, password, name);
          // Fetch the newly created and automatically logged-in user
          const currentUser = await getCurrentUser();
          console.log("User signed up and logged in:", currentUser); // Debug log
          set({
            user: currentUser, // Store the complete user object
            isAuthenticated: !!currentUser,
            isLoading: false
          });
        } catch (error: any) {
          console.error("Signup error in store:", error);
          const errorMessage = error.message || 'Signup failed. Please try again.';
          set({
            isLoading: false,
            error: errorMessage
          });
          throw error; // Re-throw the error
        }
      },

      logout: async () => {
        try {
          set({ isLoading: true }); // Indicate loading state
          await logout(); // Call the Appwrite logout function
          console.log("User logged out"); // Debug log
          set({
            user: null, // Clear user data
            isAuthenticated: false, // Set not authenticated
            isLoading: false, // Stop loading
            error: null // Clear any previous errors
          });
        } catch (error: any) {
          console.error("Logout error in store:", error);
          // Even if logout fails remotely, clear local state for better UX
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
            error: error.message || 'Logout failed. Please try again.' // Set error message
          });
          // Note: Not re-throwing here, as UI might not need to react beyond showing the error
        }
      },

      checkAuth: async () => {
        // Prevent unnecessary checks if already loading or authenticated state is known
        // This helps avoid race conditions on initial load if called multiple times.
        // We check isLoading specifically because the initial state is isLoading: true.
        if (get().isLoading || get().user === null) {
             console.log("Running checkAuth..."); // Debug log
             try {
                // Fetch the current user from Appwrite
                // getCurrentUser() returns null if not logged in (handles 401)
                const currentUser = await getCurrentUser();
                console.log("checkAuth result:", currentUser?.$id || 'No user found'); // Debug log
                set({
                   user: currentUser, // Store the fetched user (or null)
                   isAuthenticated: !!currentUser, // Update authenticated status
                   isLoading: false, // Crucial: Set loading to false after check completes
                   error: null // Clear any previous errors on successful check
                });
             } catch (error) {
                // This catch block handles unexpected errors during checkAuth (e.g., network issues)
                console.error("checkAuth unexpected error:", error);
                set({
                   user: null, // Assume not authenticated on error
                   isAuthenticated: false,
                   isLoading: false, // Stop loading even on error
                   // Optionally set an error state here if needed
                   // error: "Failed to verify authentication status"
                });
             }
        } else {
             console.log("checkAuth skipped (already loaded/authenticated)"); // Debug log
             // If somehow isLoading is still true but user exists, ensure it's set to false
             if (get().isLoading) {
                 set({ isLoading: false });
             }
        }
      },

      setError: (error: string | null) => {
        set({ error }); // Action to manually set/clear the error state
      }
    }),
    // --- Persistence Configuration ---
    {
      name: 'momcare-auth-storage', // Unique name for the local storage key
      storage: createJSONStorage(() => localStorage), // Or sessionStorage
      // Only persist the user object and authentication status.
      // isLoading and error are transient and should reset on page load.
      partialize: (state) => ({
        user: state.user, // The user object (including labels) will be persisted
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// --- Optional: Initial Auth Check Trigger ---
// It's generally recommended to call checkAuth from your main App component
// or root layout component using useEffect to ensure it runs once on app load.
// Example (place in your App.tsx or similar):
/*
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isLoadingAuth = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    console.log("App mounted, triggering checkAuth...");
    checkAuth();
  }, [checkAuth]); // Dependency array ensures it runs once on mount

  // Optional: Display a global loading indicator while checking auth
  if (isLoadingAuth) {
    return <div>Loading Application...</div>; // Replace with your actual loading component
  }

  return (
    // Your application's router and components
  );
}
*/