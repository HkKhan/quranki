"use client";

import { useSession } from "next-auth/react";

// Constants
const MIN_INTERVAL = 1;
const DEFAULT_EASE_FACTOR = 2.5;
const EASE_FACTOR_MODIFIER = 0.15;
const DIFFICULTY_ADJUSTMENTS = {
  EASY: 0.1,
  GOOD: 0,
  HARD: -0.15,
  AGAIN: -0.2,
};

// Flag to track if data has been migrated to database
const LOCAL_STORAGE_MIGRATION_KEY = "quranki_data_migrated";

// Interface for spaced repetition data
export interface SpacedRepetitionItem {
  surahNo: number;
  ayahNoSurah: number;
  interval: number;
  repetitions: number;
  easeFactor: number;
  lastReviewed: number | string;
  dueDate: number | string;
  reviewDate?: string;
  selectionType: "juzaa" | "surah";
}

/**
 * Check if data migration to the database has been completed
 */
export function hasCompletedMigration(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(LOCAL_STORAGE_MIGRATION_KEY) === "true";
}

/**
 * Mark data migration as complete
 */
export function markMigrationAsComplete(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_STORAGE_MIGRATION_KEY, "true");
}

/**
 * Reset migration flag (used for testing or when user logs out)
 * This will cause data to be migrated again on next login
 */
export function resetMigration(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(LOCAL_STORAGE_MIGRATION_KEY);
}

/**
 * Updates the spaced repetition data for an ayah based on the user's response
 */
export async function updateSpacedRepetition(
  surahNo: number,
  ayahNoSurah: number,
  quality: "EASY" | "GOOD" | "HARD" | "AGAIN",
  selectionType: "juzaa" | "surah" = "juzaa"
): Promise<SpacedRepetitionItem> {
  // Get the current data for this ayah
  const currentData = await getSpacedRepetitionData(surahNo, ayahNoSurah);
  
  // Apply spaced repetition algorithm
  const newData = calculateNextReview(currentData, quality);
  
  // Save the updated data
  return await saveSpacedRepetitionData(newData);
}

/**
 * Retrieves spaced repetition data for a specific ayah
 */
export async function getSpacedRepetitionData(
  surahNo: number,
  ayahNoSurah: number
): Promise<SpacedRepetitionItem> {
  try {
    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      // Return default values for server-side rendering
      return getDefaultSRData(surahNo, ayahNoSurah);
    }

    // Check if user is authenticated
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
      // User is authenticated, ALWAYS try to fetch from database first
      try {
        console.log(`Fetching SR data for ${surahNo}:${ayahNoSurah} from database...`);
        const response = await fetch(
          `/api/spaced-repetition?surahNo=${surahNo}&ayahNoSurah=${ayahNoSurah}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.spacedRepetitionData.length > 0) {
            console.log(`Found SR data in database for ${surahNo}:${ayahNoSurah}`);
            const dbItem = data.spacedRepetitionData[0];
            // Convert dates to timestamps for consistent handling
            return {
              surahNo: dbItem.surahNo,
              ayahNoSurah: dbItem.ayahNoSurah,
              interval: dbItem.interval,
              repetitions: dbItem.repetitions,
              easeFactor: dbItem.easeFactor,
              lastReviewed: new Date(dbItem.lastReviewed).getTime(),
              dueDate: new Date(dbItem.dueDate).getTime(),
              reviewDate: dbItem.reviewDate,
              selectionType: dbItem.selectionType,
            };
          }
        }
        
        // If data wasn't found in the database but user is authenticated and migration not completed,
        // check local storage for data to migrate
        if (!hasCompletedMigration()) {
          console.log(`Checking local storage for SR data for ${surahNo}:${ayahNoSurah}`);
          const localData = getLocalSpacedRepetitionData(surahNo, ayahNoSurah);
          
          // If we have local data with repetitions (has been reviewed), save it to the database for migration
          if (localData.repetitions > 0) {
            console.log(`Found SR data in local storage for ${surahNo}:${ayahNoSurah}, saving to database`);
            await saveSpacedRepetitionData(localData);
            return localData;
          }
        }
        
        // No data in database and no local data to migrate or migration completed,
        // return default values
        console.log(`No SR data found for ${surahNo}:${ayahNoSurah}, using defaults`);
        return getDefaultSRData(surahNo, ayahNoSurah);
      } catch (error) {
        console.error(`Error fetching SR data for ${surahNo}:${ayahNoSurah}:`, error);
        
        // Only fall back to local storage if migration hasn't been completed
        if (!hasCompletedMigration()) {
          console.log(`Falling back to local storage for ${surahNo}:${ayahNoSurah} (migration not completed)`);
          return getLocalSpacedRepetitionData(surahNo, ayahNoSurah);
        }
        
        // Return default values
        return getDefaultSRData(surahNo, ayahNoSurah);
      }
    } else {
      // Not authenticated, fall back to local storage
      console.log(`User not authenticated, using local storage for ${surahNo}:${ayahNoSurah}`);
      return getLocalSpacedRepetitionData(surahNo, ayahNoSurah);
    }
  } catch (error) {
    console.error(`Error in getSpacedRepetitionData for ${surahNo}:${ayahNoSurah}:`, error);
    
    // Check if we're in a browser
    if (typeof window !== "undefined" && !hasCompletedMigration()) {
      // Fall back to local storage only if migration hasn't been completed
      return getLocalSpacedRepetitionData(surahNo, ayahNoSurah);
    }
    
    // Return default values
    return getDefaultSRData(surahNo, ayahNoSurah);
  }
}

/**
 * Saves spaced repetition data for an ayah
 */
export async function saveSpacedRepetitionData(
  data: SpacedRepetitionItem
): Promise<SpacedRepetitionItem> {
  try {
    // Check if user is authenticated
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
      // Format dates for the API
      const apiData = {
        ...data,
        lastReviewed: typeof data.lastReviewed === 'number' 
          ? new Date(data.lastReviewed).toISOString() 
          : data.lastReviewed,
        dueDate: typeof data.dueDate === 'number' 
          ? new Date(data.dueDate).toISOString() 
          : data.dueDate,
      };
      
      // Save to database
      console.log(`Saving SR data for ${data.surahNo}:${data.ayahNoSurah} to database`);
      const response = await fetch('/api/spaced-repetition', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log(`SR data for ${data.surahNo}:${data.ayahNoSurah} saved to database successfully`);
          markMigrationAsComplete(); // Mark as migrated once we successfully save to DB
          
          // Always save to local storage as backup for unauthenticated sessions
          saveLocalSpacedRepetitionData(data);
        }
      } else {
        console.log(`Failed to save SR data for ${data.surahNo}:${data.ayahNoSurah} to database, falling back to local storage`);
        // If API fails, save to localStorage as fallback
        saveLocalSpacedRepetitionData(data);
      }
    } else {
      // Not authenticated, save to localStorage only
      console.log(`User not authenticated, saving SR data for ${data.surahNo}:${data.ayahNoSurah} to local storage only`);
      saveLocalSpacedRepetitionData(data);
    }
    
    return data;
  } catch (error) {
    console.error(`Error saving SR data for ${data.surahNo}:${data.ayahNoSurah}:`, error);
    
    // If API fails, save to localStorage as fallback
    if (typeof window !== "undefined") {
      saveLocalSpacedRepetitionData(data);
    }
    
    return data;
  }
}

/**
 * Fetch all due ayahs for review
 */
export async function getDueAyahs(): Promise<SpacedRepetitionItem[]> {
  try {
    // Check if user is authenticated
    const isAuthenticated = await checkAuthentication();
    
    if (isAuthenticated) {
      // User is authenticated, always try to fetch from database first
      try {
        console.log("Fetching due ayahs from database...");
        const response = await fetch('/api/spaced-repetition?isDue=true');
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.spacedRepetitionData.length > 0) {
            console.log(`Found ${data.spacedRepetitionData.length} due ayahs in database`);
            // Convert dates to timestamps for consistent handling
            return data.spacedRepetitionData.map((item: any) => ({
              surahNo: item.surahNo,
              ayahNoSurah: item.ayahNoSurah,
              interval: item.interval,
              repetitions: item.repetitions,
              easeFactor: item.easeFactor,
              lastReviewed: new Date(item.lastReviewed).getTime(),
              dueDate: new Date(item.dueDate).getTime(),
              reviewDate: item.reviewDate,
              selectionType: item.selectionType,
            }));
          } else {
            console.log("No due ayahs found in database");
          }
        }
        
        // If no data in database and migration hasn't been completed, fall back to local storage
        if (!hasCompletedMigration()) {
          console.log("Checking local storage for due ayahs (migration not completed)");
          return getLocalDueAyahs();
        }
        
        // No data and migration complete or not in browser
        return [];
      } catch (error) {
        console.error("Error fetching due ayahs from database:", error);
        
        // Fall back to localStorage only if migration hasn't been completed
        if (!hasCompletedMigration()) {
          console.log("Falling back to local storage for due ayahs (migration not completed)");
          return getLocalDueAyahs();
        }
        
        return [];
      }
    } else {
      // Not authenticated, fall back to localStorage
      console.log("User not authenticated, using local storage for due ayahs");
      if (typeof window !== "undefined") {
        return getLocalDueAyahs();
      }
      return [];
    }
  } catch (error) {
    console.error("Error in getDueAyahs:", error);
    
    // Fall back to localStorage only if migration hasn't been completed
    if (typeof window !== "undefined" && !hasCompletedMigration()) {
      return getLocalDueAyahs();
    }
    
    return [];
  }
}

/**
 * Check if the user is authenticated
 */
async function checkAuthentication(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  try {
    // Add a timeout to prevent hanging forever
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Set a timeout of 3 seconds
    const timeout = setTimeout(() => {
      controller.abort();
      console.warn("Authentication check timed out after 3 seconds");
    }, 3000);
    
    try {
      const session = await fetch('/api/auth/session', { signal });
      clearTimeout(timeout);
      
      const sessionData = await session.json();
      return !!sessionData?.user;
    } catch (error: any) {
      clearTimeout(timeout);
      
      if (error.name === 'AbortError') {
        console.error("Authentication check timed out");
        return false;
      }
      
      throw error;
    }
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
}

/**
 * Get default spaced repetition data
 */
function getDefaultSRData(
  surahNo: number, 
  ayahNoSurah: number
): SpacedRepetitionItem {
  return {
    surahNo,
    ayahNoSurah,
    interval: MIN_INTERVAL,
    repetitions: 0,
    easeFactor: DEFAULT_EASE_FACTOR,
    lastReviewed: Date.now(),
    dueDate: Date.now(),
    selectionType: "juzaa",
  };
}

/**
 * Get spaced repetition data from localStorage
 */
function getLocalSpacedRepetitionData(
  surahNo: number,
  ayahNoSurah: number
): SpacedRepetitionItem {
  if (typeof window === "undefined") {
    // Default values for server-side rendering
    return getDefaultSRData(surahNo, ayahNoSurah);
  }
  
  // Try to get from localStorage
  const key = `quranki_sr_${surahNo}_${ayahNoSurah}`;
  const storedData = localStorage.getItem(key);
  
  if (storedData) {
    try {
      return JSON.parse(storedData) as SpacedRepetitionItem;
    } catch (error) {
      console.error("Error parsing stored spaced repetition data:", error);
    }
  }
  
  // Return default values if not found
  return getDefaultSRData(surahNo, ayahNoSurah);
}

/**
 * Save spaced repetition data to localStorage
 */
function saveLocalSpacedRepetitionData(data: SpacedRepetitionItem): void {
  if (typeof window === "undefined") {
    return; // Skip localStorage during server-side rendering
  }
  
  const key = `quranki_sr_${data.surahNo}_${data.ayahNoSurah}`;
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Calculate the next review based on the quality of response
 * using the SuperMemo SM-2 algorithm
 */
function calculateNextReview(
  data: SpacedRepetitionItem,
  quality: "EASY" | "GOOD" | "HARD" | "AGAIN"
): SpacedRepetitionItem {
  // Clone the data to avoid mutation
  const newData = { ...data };
  
  // Get the current timestamp
  const now = Date.now();
  
  // Update last reviewed timestamp
  newData.lastReviewed = now;
  
  // Set reviewDate to today's date in YYYY-MM-DD format
  const today = new Date(now).toISOString().split('T')[0];
  newData.reviewDate = today;
  
  // Record this review in today's daily log
  recordDailyReview(newData.surahNo, newData.ayahNoSurah, today);
  
  // If this is a failed recall (AGAIN), reset repetitions
  if (quality === "AGAIN") {
    newData.repetitions = 0;
    newData.interval = MIN_INTERVAL;
  } else {
    // Increment repetitions
    newData.repetitions += 1;
    
    // Calculate new interval based on current repetitions
    if (newData.repetitions === 1) {
      newData.interval = MIN_INTERVAL;
    } else if (newData.repetitions === 2) {
      newData.interval = 6; // 6 days for second successful recall
    } else {
      // For subsequent recalls, use the SM-2 formula
      newData.interval = Math.round(newData.interval * newData.easeFactor);
    }
  }
  
  // Adjust ease factor based on quality of response
  newData.easeFactor = Math.max(
    1.3, // Minimum ease factor
    newData.easeFactor + DIFFICULTY_ADJUSTMENTS[quality]
  );
  
  // Calculate the due date based on the new interval
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + newData.interval);
  newData.dueDate = dueDate.getTime();
  
  return newData;
}

/**
 * Record a review in the daily log
 */
async function recordDailyReview(surahNo: number, ayahNoSurah: number, date: string): Promise<void> {
  try {
    // Check if user is authenticated
    const isAuthenticated = await checkAuthentication();
    const ayahKey = `${surahNo}_${ayahNoSurah}`;
    
    if (isAuthenticated) {
      // Save to database
      console.log(`Recording daily review for ${ayahKey} on ${date} to database`);
      await fetch('/api/daily-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date,
          ayahKey,
          count: 1
        }),
      });
    }
    
    // Always record in localStorage as backup
    if (typeof window !== "undefined") {
      const key = `quranki_daily_log_${date}`;
      let dailyLog: Record<string, number> = {};
      
      // Get existing log for today if available
      const existingLog = localStorage.getItem(key);
      if (existingLog) {
        try {
          dailyLog = JSON.parse(existingLog) as Record<string, number>;
        } catch (error) {
          console.error("Error parsing daily log:", error);
        }
      }
      
      // Increment the count for this ayah or set to 1 if not yet recorded
      dailyLog[ayahKey] = (dailyLog[ayahKey] || 0) + 1;
      
      // Save back to localStorage
      localStorage.setItem(key, JSON.stringify(dailyLog));
    }
  } catch (error) {
    console.error(`Error recording daily review for ${surahNo}:${ayahNoSurah}:`, error);
  }
}

/**
 * Get due ayahs from localStorage
 */
function getLocalDueAyahs(): SpacedRepetitionItem[] {
  if (typeof window === "undefined") {
    return []; // Return empty array during server-side rendering
  }
  
  const dueAyahs: SpacedRepetitionItem[] = [];
  const now = Date.now();
  
  // Iterate through all localStorage items
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith('quranki_sr_')) continue;
    
    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) continue;
      
      const data = JSON.parse(storedData) as SpacedRepetitionItem;
      
      // Check if it's due - convert string dates to timestamps if needed
      const dueDateTimestamp = typeof data.dueDate === 'number' 
        ? data.dueDate 
        : new Date(data.dueDate).getTime();
      
      if (dueDateTimestamp <= now) {
        dueAyahs.push(data);
      }
    } catch (error) {
      console.error(`Error processing localStorage item ${key}:`, error);
    }
  }
  
  // Sort by due date (oldest first)
  return dueAyahs.sort((a, b) => 
    (typeof a.dueDate === 'number' ? a.dueDate : new Date(a.dueDate).getTime()) -
    (typeof b.dueDate === 'number' ? b.dueDate : new Date(b.dueDate).getTime())
  );
} 