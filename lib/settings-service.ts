"use client";

import { useState, useEffect } from "react";

// Flag to track if settings have been migrated to database
const SETTINGS_MIGRATION_KEY = "quranki_settings_migrated";

// Event name for settings change
const SETTINGS_CHANGE_EVENT = "quranki_settings_changed";

export interface QuranSettings {
  selectedJuzaa: number[];
  selectedSurahs: number[];
  selectionType: "juzaa" | "surah";
  ayahsAfter: number;
  promptsPerSession: number;
}

// Default settings
const DEFAULT_SETTINGS: QuranSettings = {
  selectedJuzaa: [30],
  selectedSurahs: [],
  selectionType: "juzaa",
  ayahsAfter: 2,
  promptsPerSession: 20,
};

/**
 * Check if the user has completed settings migration
 */
export function hasCompletedSettingsMigration(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SETTINGS_MIGRATION_KEY) === "true";
}

/**
 * Mark settings migration as complete
 */
export function markSettingsMigrationAsComplete(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SETTINGS_MIGRATION_KEY, "true");
}

/**
 * Reset settings migration flag (used for testing or when user logs out)
 * This will cause settings to be migrated again on next login
 */
export function resetSettingsMigration(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SETTINGS_MIGRATION_KEY);
}

/**
 * Custom hook to track settings changes
 */
export function useSettingsChangeTracker() {
  const [settingsVersion, setSettingsVersion] = useState(0);
  
  useEffect(() => {
    // Handler for the settings change event
    const handleSettingsChange = () => {
      setSettingsVersion(prev => prev + 1);
    };
    
    // Add event listener
    window.addEventListener(SETTINGS_CHANGE_EVENT, handleSettingsChange);
    
    // Cleanup
    return () => {
      window.removeEventListener(SETTINGS_CHANGE_EVENT, handleSettingsChange);
    };
  }, []);
  
  return settingsVersion;
}

/**
 * Trigger a settings change event
 */
function triggerSettingsChangeEvent(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SETTINGS_CHANGE_EVENT));
}

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<QuranSettings> {
  try {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      // Return default values for server-side rendering
      return DEFAULT_SETTINGS;
    }

    // Check if user is authenticated
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
      // User is authenticated, ALWAYS try to fetch from database first
      try {
        console.log("Fetching settings from database...");
        
        // Use a timeout to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        try {
          const response = await fetch('/api/user/settings', {
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            // Safely parse the response
            let data;
            try {
              const text = await response.text();
              if (!text || text.trim() === '') {
                console.log("Empty response from settings API");
                // No valid response, fall back to defaults
                return DEFAULT_SETTINGS;
              }
              
              data = JSON.parse(text);
            } catch (parseError) {
              console.error("Error parsing settings response:", parseError);
              return DEFAULT_SETTINGS;
            }
            
            if (data && data.settings) {
              console.log("Found settings in database");
              // Found settings in database, mark migration as complete
              markSettingsMigrationAsComplete();
              return {
                selectedJuzaa: data.settings.selectedJuzaa || DEFAULT_SETTINGS.selectedJuzaa,
                selectedSurahs: data.settings.selectedSurahs || DEFAULT_SETTINGS.selectedSurahs,
                selectionType: data.settings.selectionType || DEFAULT_SETTINGS.selectionType,
                ayahsAfter: data.settings.ayahsAfter || DEFAULT_SETTINGS.ayahsAfter,
                promptsPerSession: data.settings.promptsPerSession || DEFAULT_SETTINGS.promptsPerSession,
              };
            }
          } else {
            console.log("API returned error status:", response.status);
          }
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          if (fetchError.name === 'AbortError') {
            console.log("Settings API request timed out");
          } else {
            console.error("Error fetching settings:", fetchError);
          }
          // Continue to fallback logic
        }
        
        // If we reach here, settings weren't found in the database
        console.log("No settings found in database");
        
        // If migration hasn't been completed, try to migrate from local storage
        if (!hasCompletedSettingsMigration()) {
          console.log("Checking local storage for settings to migrate");
          const localSettings = getLocalSettings();
          
          if (localSettings !== DEFAULT_SETTINGS) {
            console.log("Found settings in local storage, saving to database");
            // If we have non-default local settings, save them to the database
            await saveUserSettings(localSettings);
            markSettingsMigrationAsComplete();
            return localSettings;
          }
        }
        
        // No settings in database and no local settings to migrate or migration completed,
        // create default settings in the database
        console.log("Creating default settings in database");
        await saveUserSettings(DEFAULT_SETTINGS);
        return DEFAULT_SETTINGS;
      } catch (error) {
        console.error("Error fetching from database:", error);
        
        // Only fall back to local storage if migration hasn't been completed
        if (!hasCompletedSettingsMigration()) {
          console.log("Falling back to local storage (migration not completed)");
          return getLocalSettings();
        }
        
        // Return default values
        return DEFAULT_SETTINGS;
      }
    } else {
      // Not authenticated, fall back to local storage
      console.log("User not authenticated, using local storage");
      return getLocalSettings();
    }
  } catch (error) {
    console.error("Error fetching user settings:", error);
    
    // Check if we're in a browser
    if (typeof window !== "undefined" && !hasCompletedSettingsMigration()) {
      // Fall back to local storage only if migration hasn't been completed
      return getLocalSettings();
    }
    
    // Return default values
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save user settings
 */
export async function saveUserSettings(settings: QuranSettings): Promise<QuranSettings> {
  try {
    // Check if user is authenticated
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
      // Save to database
      console.log("Saving settings to database");
      const response = await fetch('/api/user/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.settings) {
          console.log('Settings saved to database successfully');
          markSettingsMigrationAsComplete(); // Mark as migrated once we successfully save to DB
          
          // Always save to local storage as backup for unauthenticated sessions
          saveLocalSettings(settings);
          
          // Trigger settings change event
          triggerSettingsChangeEvent();
          
          return settings;
        }
      } else {
        console.log("Failed to save settings to database, falling back to local storage");
        // If API fails, save to localStorage as fallback
        saveLocalSettings(settings);
        
        // Trigger settings change event
        triggerSettingsChangeEvent();
      }
    } else {
      // Not authenticated, save to localStorage only
      console.log("User not authenticated, saving settings to local storage only");
      saveLocalSettings(settings);
      
      // Trigger settings change event
      triggerSettingsChangeEvent();
    }
    
    return settings;
  } catch (error) {
    console.error("Error saving user settings:", error);
    
    // If API fails, save to localStorage as fallback
    if (typeof window !== "undefined") {
      saveLocalSettings(settings);
      // Trigger settings change event
      triggerSettingsChangeEvent();
    }
    
    return settings;
  }
}

/**
 * Check if the user is authenticated
 */
async function checkAuthentication(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  try {
    // First, check if we're in a force reload cycle to avoid infinite loops
    const forceReloadFlag = localStorage.getItem("quranki_force_reload");
    if (forceReloadFlag === "true") {
      console.log("In force reload cycle, skipping authentication check");
      return false;
    }
    
    // Add a timeout to prevent hanging forever
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Set a shorter timeout (2 seconds instead of 3)
    const timeout = setTimeout(() => {
      controller.abort();
      console.warn("Authentication check timed out after 2 seconds");
    }, 2000);
    
    try {
      // Check if session exists
      const session = await fetch('/api/auth/session', { 
        signal,
        // Prevent caching
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      clearTimeout(timeout);
      
      if (!session.ok) {
        console.log("Session check returned non-OK response:", session.status);
        return false;
      }
      
      // Safely parse the response
      let sessionData;
      try {
        sessionData = await session.json();
      } catch (e) {
        console.error("Error parsing session data:", e);
        return false;
      }
      
      // Explicitly check for a valid user object
      return !!(sessionData && sessionData.user && sessionData.user.id);
    } catch (error: any) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        console.error("Authentication check timed out");
        return false;
      }
      
      console.error("Error in session fetch:", error);
      return false;
    }
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

/**
 * Get settings from localStorage
 */
function getLocalSettings(): QuranSettings {
  if (typeof window === "undefined") {
    return DEFAULT_SETTINGS;
  }
  
  const storedSettings = localStorage.getItem("quranReviewSettings");
  if (storedSettings) {
    try {
      return JSON.parse(storedSettings) as QuranSettings;
    } catch (error) {
      console.error("Error parsing stored settings:", error);
    }
  }
  
  return DEFAULT_SETTINGS;
}

/**
 * Save settings to localStorage
 */
function saveLocalSettings(settings: QuranSettings): void {
  if (typeof window === "undefined") return;
  
  localStorage.setItem("quranReviewSettings", JSON.stringify(settings));
} 