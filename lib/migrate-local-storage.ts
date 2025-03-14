/**
 * Utility function to migrate data from local storage to the database
 * This should be called after a user signs in or registers
 * 
 * SIMPLIFIED VERSION TO PREVENT FREEZING
 */
export async function migrateLocalStorageToDatabase() {
  if (typeof window === "undefined") {
    return { success: false, message: "Can only be called in browser environment" };
  }

  try {
    // If migration already completed, skip
    if (localStorage.getItem("quranki_settings_migrated") === "true" && 
        localStorage.getItem("quranki_data_migrated") === "true") {
      console.log("Migration already completed, skipping");
      return { success: true, message: "Migration already completed" };
    }

    console.log("Starting simplified data migration...");
    
    // Count what data we might need to migrate
    const quranSettings = localStorage.getItem("quranReviewSettings");
    let srItemCount = 0;
    let dailyLogCount = 0;
    
    // Quick scan
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      if (key.startsWith("quranki_sr_")) {
        srItemCount++;
      } else if (key.startsWith("quranki_daily_log_")) {
        dailyLogCount++;
      }
    }
    
    console.log(`Found ${srItemCount} SR items and ${dailyLogCount} daily logs`);
    
    // If no data, just mark as complete and return
    if (!quranSettings && srItemCount === 0 && dailyLogCount === 0) {
      console.log("No data to migrate, marking as complete");
      localStorage.setItem("quranki_settings_migrated", "true");
      localStorage.setItem("quranki_data_migrated", "true");
      return { success: true, message: "No data to migrate" };
    }
    
    // Collect the data to migrate (simplified collection)
    const spacedRepetitionData: any[] = [];
    const dailyLogs: any[] = [];
    
    // Collect settings
    let parsedSettings = null;
    if (quranSettings) {
      try {
        parsedSettings = JSON.parse(quranSettings);
      } catch (e) {
        console.error("Error parsing settings:", e);
      }
    }
    
    // Collect SR data - simplified to only get essential data
    if (srItemCount > 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("quranki_sr_")) continue;
        
        try {
          const srDataStr = localStorage.getItem(key);
          if (!srDataStr) continue;
          
          const srData = JSON.parse(srDataStr);
          const [_, surahNo, ayahNoSurah] = key.split("_");
          
          if (!surahNo || !ayahNoSurah) continue;
          
          spacedRepetitionData.push({
            surahNo: parseInt(surahNo),
            ayahNoSurah: parseInt(ayahNoSurah),
            interval: srData.interval || 1,
            repetitions: srData.repetitions || 0,
            easeFactor: srData.easeFactor || 2.5,
            lastReviewed: srData.lastReviewed || new Date().toISOString(),
            dueDate: srData.dueDate || new Date().toISOString(),
            selectionType: srData.selectionType || "juzaa",
          });
        } catch (e) {
          console.error("Error parsing SR data:", e);
        }
      }
    }
    
    // Collect daily logs - simplified
    if (dailyLogCount > 0) {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith("quranki_daily_log_")) continue;
        
        try {
          const date = key.replace("quranki_daily_log_", "");
          const logDataStr = localStorage.getItem(key);
          if (!logDataStr) continue;
          
          const logData = JSON.parse(logDataStr);
          
          Object.entries(logData).forEach(([ayahKey, count]) => {
            dailyLogs.push({
              date,
              ayahKey,
              count: count as number,
            });
          });
        } catch (e) {
          console.error("Error parsing daily log:", e);
        }
      }
    }
    
    // Use AbortController to prevent hanging
    const controller = new AbortController();
    const signal = controller.signal;
    
    // Set a short timeout to abort if it takes too long
    const timeoutId = setTimeout(() => {
      controller.abort();
      console.warn("Migration request aborted due to timeout");
    }, 2000); // Even shorter timeout
    
    try {
      // Send migration request with abort signal
      const response = await fetch("/api/auth/migrate-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quranSettings: parsedSettings,
          spacedRepetitionData,
          dailyLogs,
        }),
        signal
      });
      
      clearTimeout(timeoutId);
      
      // Simplified response handling
      let success = response.ok;
      let message = "Migration complete";
      
      try {
        const text = await response.text();
        if (text) {
          const data = JSON.parse(text);
          message = data.message || message;
        }
      } catch (e) {
        console.error("Error parsing response:", e);
      }
      
      // ALWAYS mark migration as complete regardless of API response
      // This prevents freezing issues on account switching
      localStorage.setItem("quranki_settings_migrated", "true");
      localStorage.setItem("quranki_data_migrated", "true");
      
      return { success, message };
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle timeout error
      if (error.name === 'AbortError') {
        console.log("Migration request timed out");
      } else {
        console.error("Error during migration API call:", error);
      }
      
      // Even on error, mark migration as complete to prevent freezing
      localStorage.setItem("quranki_settings_migrated", "true");
      localStorage.setItem("quranki_data_migrated", "true");
      
      return { 
        success: false, 
        message: "Migration may have failed, but marked as complete to prevent freezing"
      };
    }
  } catch (error) {
    console.error("Error in migrateLocalStorageToDatabase:", error);
    
    // Mark migration as complete to prevent future freezes
    localStorage.setItem("quranki_settings_migrated", "true");
    localStorage.setItem("quranki_data_migrated", "true");
    
    return { 
      success: false, 
      message: "Error during migration, marked as complete to prevent freezing"
    };
  }
} 