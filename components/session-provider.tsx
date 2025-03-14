"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { useEffect, useRef, createContext, useContext } from "react";
import { useSession, signOut } from "next-auth/react";

// Create a context for the custom sign out function
const SignOutContext = createContext<(() => Promise<void>) | null>(null);

// Custom hook to use our safe sign out function
export function useSafeSignOut() {
  const signOutFn = useContext(SignOutContext);
  if (!signOutFn) {
    throw new Error("useSafeSignOut must be used within a SessionProvider");
  }
  return signOutFn;
}

// This component forces a clean state on account transitions
function SessionStateManager() {
  const { data: session, status } = useSession();
  const previousStatusRef = useRef<string>(status);
  const lastUserIdRef = useRef<string | null>(null);
  
  // Create a key in localStorage to track which account is currently logged in
  useEffect(() => {
    // When a user successfully logs in
    if (status === "authenticated" && session?.user?.id) {
      const currentUserId = session.user.id;
      
      // Store the current user ID
      localStorage.setItem("quranki_current_user", currentUserId);
      lastUserIdRef.current = currentUserId;
      
      // Check if we need to force a reload
      const needsReload = localStorage.getItem("quranki_force_reload") === "true";
      if (needsReload) {
        // Clear the reload flag
        localStorage.removeItem("quranki_force_reload");
        // Force reload the page to ensure fresh state
        console.log("Force reloading after login transition");
        window.location.reload();
      }
    }
    
    // Store the previous status for comparison on next render
    previousStatusRef.current = status;
  }, [status, session]);
  
  // Add a "recovery button" to localStorage that users can trigger in case of freezes
  useEffect(() => {
    // Add emergency recovery function
    if (typeof window !== "undefined") {
      (window as any).recoverFromFreeze = () => {
        console.log("Emergency recovery triggered");
        localStorage.setItem("quranki_force_reload", "true");
        window.location.reload();
      };
      
      // Add it to localStorage so users can access it from console
      localStorage.setItem("quranki_emergency_recovery", 
        "Run window.recoverFromFreeze() in console if app freezes");
    }
    
    return () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem("quranki_emergency_recovery");
      }
    };
  }, []);
  
  return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  // Create our custom sign out handler
  const handleSafeSignOut = async () => {
    try {
      console.log("Safe sign out initiated");
      // Set a flag to force reload after next login
      localStorage.setItem("quranki_force_reload", "true");
      
      // First initiate the signOut process
      await signOut({ redirect: false });
      
      // Then force page to reload after logout to clean up any state
      console.log("Reloading page after sign out");
      window.location.href = window.location.href.split("?")[0]; // Drop query params
    } catch (error) {
      console.error("Error during sign out:", error);
      // If all else fails, just reload the page
      window.location.reload();
    }
  };

  return (
    <NextAuthSessionProvider>
      <SignOutContext.Provider value={handleSafeSignOut}>
        <SessionStateManager />
        {children}
      </SignOutContext.Provider>
    </NextAuthSessionProvider>
  );
} 