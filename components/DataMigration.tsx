"use client";

import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { 
  hasCompletedMigration, 
  markMigrationAsComplete
} from "@/lib/spaced-repetition-service";
import {
  hasCompletedSettingsMigration,
  markSettingsMigrationAsComplete
} from "@/lib/settings-service";
import { migrateLocalStorageToDatabase } from "@/lib/migrate-local-storage";

/**
 * This component handles data migration from localStorage to the database
 * when a user logs in. It doesn't render anything visible.
 * 
 * Simplified to prevent freezing issues on account switching.
 */
export default function DataMigration() {
  const { data: session, status } = useSession();
  const [isMigrating, setIsMigrating] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  
  // Safety cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Simple check for migration needs once per session
  useEffect(() => {
    // Only run this once when the user is authenticated and we haven't tried yet
    if (status === "authenticated" && session?.user?.id && !attempted && !isMigrating) {
      // Mark attempt immediately to prevent multiple runs
      setAttempted(true);
      
      // Make sure we're not running migrations for a different user
      const storedUserId = localStorage.getItem("quranki_current_user");
      const currentUserId = session.user.id;
      
      // Safety check: if user ID doesn't match what we stored, don't migrate
      if (storedUserId && storedUserId !== currentUserId) {
        console.log("User ID mismatch, skipping migration to prevent conflicts");
        // Just mark migration as complete for this user
        markSettingsMigrationAsComplete();
        markMigrationAsComplete();
        return;
      }
      
      // Store the current user ID
      localStorage.setItem("quranki_current_user", currentUserId);
      currentUserIdRef.current = currentUserId;
      
      // Check if migration is actually needed
      if (!hasCompletedSettingsMigration() || !hasCompletedMigration()) {
        // Simple check for data existence
        let hasData = false;
        
        if (typeof window !== "undefined") {
          // Check for settings
          if (localStorage.getItem("quranReviewSettings")) {
            hasData = true;
          }
          
          // Quick check for SR data
          if (!hasData) {
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('quranki_sr_') || key.startsWith('quranki_daily_log_'))) {
                hasData = true;
                break;
              }
            }
          }
        }
        
        // If no data, just mark complete
        if (!hasData) {
          console.log("No data to migrate, marking complete");
          markSettingsMigrationAsComplete();
          markMigrationAsComplete();
          return;
        }
        
        // Actually perform migration with safety timeout
        runMigration();
      } else {
        console.log("No migration needed, already completed");
      }
    }
  }, [session, status, attempted, isMigrating]);
  
  // Simple migration function with safety timeout
  const runMigration = async () => {
    setIsMigrating(true);
    
    // Safety timeout - 3 seconds max
    timeoutRef.current = setTimeout(() => {
      console.log("Migration safety timeout reached, marking complete");
      markSettingsMigrationAsComplete();
      markMigrationAsComplete();
      setIsMigrating(false);
    }, 3000);
    
    try {
      const result = await migrateLocalStorageToDatabase();
      console.log("Migration completed:", result);
      
      // Regardless of result, mark as complete to prevent freezes
      markSettingsMigrationAsComplete();
      markMigrationAsComplete();
    } catch (error) {
      console.error("Migration error:", error);
      
      // Even on error, mark complete
      markSettingsMigrationAsComplete();
      markMigrationAsComplete();
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsMigrating(false);
    }
  };
  
  return null;
}