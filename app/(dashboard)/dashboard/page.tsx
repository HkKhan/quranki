"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Calendar,
  BarChart2,
  Settings,
  ChevronRight,
  Loader2,
  ScrollText,
} from "lucide-react";
import { ReviewHeatmap } from "@/components/review-heatmap";
import { StatsCards } from "@/components/stats-cards";
import { getSession } from "@/lib/auth";
import { getUserSettings, QuranSettings, useSettingsChangeTracker } from "@/lib/settings-service";
import { getDueAyahs } from "@/lib/spaced-repetition-service";

interface QuranStats {
  totalAyahs: number;
  selectedJuzAyahs: number;
  selectedSurahAyahs?: number;
}

interface SurahInfo {
  surah_no: number;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_roman: string;
}

interface ReviewData {
  interval: number;
  repetitions: number;
  easeFactor: number;
  lastReviewed: number;
  dueDate: number;
}

export default function DashboardPage() {
  const [settings, setSettings] = useState<QuranSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quranStats, setQuranStats] = useState<QuranStats>({
    totalAyahs: 0,
    selectedJuzAyahs: 0,
    selectedSurahAyahs: 0,
  });
  const [reviewStats, setReviewStats] = useState({
    dueToday: 0,
    reviewedToday: 0,
    streak: 0,
    totalReviewed: 0,
    dailyAverage: 0,
  });
  const [allSurahs, setAllSurahs] = useState<SurahInfo[]>([]);
  
  // Track settings changes
  const settingsVersion = useSettingsChangeTracker();

  // Define functions first, then use them in useEffect
  const fetchUserSettings = async () => {
    try {
      // Use the settings service to get user settings
      const userSettings = await getUserSettings();
      return userSettings;
    } catch (error) {
      console.error("Error fetching user settings:", error);
      return null;
    }
  };

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load settings using our service instead of localStorage
      const userSettings = await fetchUserSettings();
      
      if (userSettings) {
        setSettings(userSettings);

        // Fetch stats for the selected juzaa or surahs
        if (userSettings.selectionType === "juzaa") {
          await fetchQuranStats(userSettings.selectedJuzaa);
        } else {
          await fetchQuranStatsBySurah(userSettings.selectedSurahs);
        }

        // Load all surahs info if selection type is "surah"
        if (userSettings.selectionType === "surah") {
          await loadAllSurahs();
        }
      }

      // Calculate combined review statistics from all ayahs (both juzaa and surah)
      await calculateAllReviewStats();
      
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load dashboard data when the component mounts or when settings change
  useEffect(() => {
    loadDashboardData();
  }, [settingsVersion]); // Now depends on settingsVersion

  const loadAllSurahs = async () => {
    try {
      const response = await fetch("/api/quran?action=surahs");
      const data = await response.json();

      if (data.success && data.surahs) {
        setAllSurahs(data.surahs);
      }
    } catch (error) {
      console.error("Error loading surahs:", error);
    }
  };

  const calculateReviewStatsBySurah = async (selectedSurahs: number[]) => {
    // Similar to calculateReviewStats but for surahs
    // Implementation would be similar to the juzaa version
  };

  const fetchQuranStatsBySurah = async (surahNumbers: number[]) => {
    try {
      // Get all ayahs to calculate total count
      const totalResponse = await fetch("/api/quran?action=load");
      const totalData = await totalResponse.json();

      // Get ayahs for selected surahs
      const surahResponse = await fetch(
        `/api/quran?action=surah&surah=${surahNumbers.join(",")}`
      );
      const surahData = await surahResponse.json();

      if (
        totalData.success &&
        surahData.success &&
        surahData.ayahs
      ) {
        setQuranStats({
          totalAyahs: totalData.count || 0,
          selectedJuzAyahs: 0, // Not using juz count in this mode
          selectedSurahAyahs: surahData.ayahs.length,
        });
      }
    } catch (error) {
      console.error("Error fetching Quran stats:", error);
    }
  };

  // Calculate review stats for all ayahs reviewed regardless of selection type
  const calculateAllReviewStats = async () => {
    try {
      // Current date information
      const now = Date.now();
      const today = new Date(now).toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Check if user is authenticated
      const isAuthenticated = await checkAuthentication();
      
      if (isAuthenticated) {
        // Force fresh data fetch every time for authenticated users
        try {
          // 1. Get due ayahs from the database using the service
          const dueAyahs = await getDueAyahs();
          const dueToday = dueAyahs.length;
          
          // 2. Fetch daily logs from the database to calculate streaks and totals
          const logsResponse = await fetch('/api/daily-logs?aggregate=true');
          
          if (logsResponse.ok) {
            const logsData = await logsResponse.json();
            
            if (logsData.success && logsData.logs) {
              // Process data for statistics
              const reviewDays = new Set<string>();
              const dailyReviews: Record<string, number> = {};
              let totalReviewed = 0;
              
              // Process logs from the database
              logsData.logs.forEach((log: any) => {
                const date = log.date;
                reviewDays.add(date);
                
                if (!dailyReviews[date]) {
                  dailyReviews[date] = 0;
                }
                dailyReviews[date] += log.count;
                totalReviewed += log.count;
              });
              
              // Calculate streak based on daily logs
              const streak = calculateStreak(reviewDays, today);
              
              // Calculate daily average from the logs
              const dailyAverage = calculateDailyAverage(dailyReviews);
              
              // Update stats state with fresh database data
              setReviewStats({
                dueToday,
                reviewedToday: dailyReviews[today] || 0,
                streak,
                totalReviewed,
                dailyAverage,
              });
              
              return; // Exit early since we've successfully fetched and processed database data
            }
          }
          // If database fetch fails, fall through to localStorage
        } catch (error) {
          console.error("Error fetching review stats from database:", error);
          // Will fall back to localStorage
        }
      }
      
      // Fall back to localStorage if not authenticated or if database fetch failed
      const dueAyahs = await getDueAyahs(); // This will use localStorage for non-authenticated users
      const dueToday = dueAyahs.length;
      
      // Process localStorage for stats
      const reviewDays = new Set<string>();
      const dailyReviews: Record<string, number> = {};
      let totalReviewed = 0;
      
      // Skip localStorage access during server-side rendering
      if (typeof window === "undefined") {
        return;
      }
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        // Process SR data for individual ayahs
        if (key.startsWith("quranki_sr_")) {
          const srDataStr = localStorage.getItem(key);
          if (srDataStr) {
            const srData = JSON.parse(srDataStr);
            if (srData.repetitions > 0) {
              totalReviewed++;
            }
            
            // Record the review date for streak calculation
            if (srData.reviewDate) {
              reviewDays.add(srData.reviewDate);
            }
            else if (srData.lastReviewed) {
              // For backward compatibility with older data
              const reviewDate = new Date(srData.lastReviewed).toISOString().split('T')[0];
              reviewDays.add(reviewDate);
            }
          }
        }
        
        // Process daily logs for activity calculation
        else if (key.startsWith("quranki_daily_log_")) {
          const date = key.replace("quranki_daily_log_", "");
          reviewDays.add(date);
          
          const logData = localStorage.getItem(key);
          if (logData) {
            const log = JSON.parse(logData);
            const ayahsReviewedThisDay = Object.keys(log).length;
            
            if (!dailyReviews[date]) {
              dailyReviews[date] = ayahsReviewedThisDay;
            }
          }
        }
      }
      
      // Calculate streak, daily average, and update stats state
      const streak = calculateStreak(reviewDays, today);
      const dailyAverage = calculateDailyAverage(dailyReviews);
      
      setReviewStats({
        dueToday,
        reviewedToday: dailyReviews[today] || 0,
        streak,
        totalReviewed,
        dailyAverage,
      });
    } catch (error) {
      console.error("Error calculating review stats:", error);
    }
  };
  
  // Helper function to calculate streak
  const calculateStreak = (reviewDays: Set<string>, today: string): number => {
    const sortedDates = Array.from(reviewDays).sort((a, b) => b.localeCompare(a)); // Sort newest to oldest
    let streak = 0;
    
    if (sortedDates.length > 0) {
      // Check if user reviewed today
      const hasReviewedToday = sortedDates[0] === today;
      
      // Start date to check from (today or yesterday)
      let currentDate = new Date();
      if (!hasReviewedToday) {
        currentDate.setDate(currentDate.getDate() - 1); // Start from yesterday if no reviews today
      }
      
      // Continue checking previous days
      let checkingDate = currentDate;
      let consecutiveDays = 0;
      
      while (true) {
        const dateString = checkingDate.toISOString().split('T')[0];
        if (reviewDays.has(dateString)) {
          consecutiveDays++;
          checkingDate.setDate(checkingDate.getDate() - 1); // Check previous day
        } else {
          break; // Streak ends
        }
      }
      
      streak = consecutiveDays;
    }
    
    return streak;
  };
  
  // Helper function to check user authentication
  const checkAuthentication = async (): Promise<boolean> => {
    try {
      const session = await fetch('/api/auth/session');
      const sessionData = await session.json();
      return !!sessionData?.user;
    } catch (error) {
      console.error("Error checking authentication:", error);
      return false;
    }
  };

  // Calculate daily average reviews over the last 30 days
  const calculateDailyAverage = (dailyReviews: Record<string, number>): number => {
    try {
      const today = new Date();
      let totalReviews = 0;
      let daysToConsider = 30; // Default to 30 days
      
      // If user has less than 30 days of review history, use days since first review
      if (Object.keys(dailyReviews).length > 0) {
        // Get all dates and sort chronologically (oldest first)
        const dates = Object.keys(dailyReviews).sort();
        const firstReviewDate = new Date(dates[0]);
        
        // Calculate days since first review (including today)
        const daysSinceFirstReview = Math.floor(
          (today.getTime() - firstReviewDate.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
        
        // Use daysSinceFirstReview if less than 30, otherwise stick with 30
        daysToConsider = Math.min(Math.max(daysSinceFirstReview, 1), 30);
      }
      
      // Calculate for the days to consider (either 30 days or days since first review)
      for (let i = 0; i < daysToConsider; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateString = checkDate.toISOString().split('T')[0];
        
        if (dailyReviews[dateString]) {
          totalReviews += dailyReviews[dateString];
        }
      }
      
      // Calculate the average (avoid division by zero)
      const average = totalReviews / daysToConsider;
      return parseFloat(average.toFixed(1)); // Round to 1 decimal place
    } catch (error) {
      console.error("Error calculating daily average:", error);
      return 0;
    }
  };

  const fetchQuranStats = async (juzNumbers: number[]) => {
    try {
      // First, get basic info about the Quran data
      const basicResponse = await fetch("/api/quran?action=load");
      const basicData = await basicResponse.json();

      if (basicData.success) {
        // Then get ayahs for the selected juzaa
        const juzResponse = await fetch(
          `/api/quran?action=juz&juz=${juzNumbers.join(",")}`
        );
        const juzData = await juzResponse.json();

        if (juzData.success) {
          setQuranStats({
            totalAyahs: basicData.count || 0,
            selectedJuzAyahs: juzData.ayahs?.length || 0,
            selectedSurahAyahs: 0,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching Quran stats:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="text-center shadow-md">
          <CardHeader>
            <CardTitle>Welcome to QuranKi</CardTitle>
            <CardDescription>
              You need to complete the initial setup before using the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BookOpen className="h-16 w-16 mx-auto text-primary mb-4" />
            <p className="mb-4">
              Set up your preferences to start reviewing the Quran with our
              spaced repetition system.
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Link href="/setup">
              <Button>
                Complete Setup
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-6 space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Your personal Quran review statistics and progress
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/review">
            <Button className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              <span>Start Review</span>
            </Button>
          </Link>
          <Link href="/setup">
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="mb-2">
        <h2 className="text-lg font-medium">Overall Review Statistics</h2>
        <p className="text-sm text-muted-foreground">
          Combined statistics for all your Quran review activity
        </p>
      </div>

      <StatsCards
        dueToday={reviewStats.dueToday}
        reviewedToday={reviewStats.reviewedToday}
        streak={reviewStats.streak}
        totalReviewed={reviewStats.totalReviewed}
        dailyAverage={reviewStats.dailyAverage}
      />

      <div className="grid gap-4 md:grid-cols-7">
        <Card className="md:col-span-5">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Review Activity
            </CardTitle>
            <CardDescription>
              Your Quran review activity over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReviewHeatmap />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <ScrollText className="h-5 w-5 mr-2" />
              Memorization Stats
            </CardTitle>
            <CardDescription>Your progress overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Ayahs Memorized</span>
                  <span className="text-sm text-muted-foreground">
                    {settings.selectionType === "juzaa" 
                      ? `${quranStats.selectedJuzAyahs} of ${quranStats.totalAyahs}`
                      : `${quranStats.selectedSurahAyahs} of ${quranStats.totalAyahs}`}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${
                        (settings.selectionType === "juzaa" 
                          ? (quranStats.selectedJuzAyahs / quranStats.totalAyahs)
                          : (quranStats.selectedSurahAyahs! / quranStats.totalAyahs)) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

              {settings.selectionType === "juzaa" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Juz ({settings.selectedJuzaa.length}/30)
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((juz) => (
                      <div
                        key={juz}
                        className={`h-6 w-6 rounded flex items-center justify-center text-xs ${
                          settings.selectedJuzaa.includes(juz)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {juz}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {settings.selectionType === "surah" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">
                      Surahs ({settings.selectedSurahs.length}/{allSurahs.length})
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-1 overflow-y-auto max-h-48">
                    {allSurahs.map((surah) => (
                      <div
                        key={surah.surah_no}
                        className={`h-6 w-6 rounded flex items-center justify-center text-xs ${
                          settings.selectedSurahs.includes(surah.surah_no)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}
                        title={`Surah ${surah.surah_name_roman}`}
                      >
                        {surah.surah_no}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <h4 className="text-sm font-medium mb-2">Selected Surahs:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs overflow-y-auto max-h-40">
                      {allSurahs
                        .filter(s => settings.selectedSurahs.includes(s.surah_no))
                        .map(surah => (
                          <div key={surah.surah_no} className="flex items-center space-x-1">
                            <span className="bg-primary text-primary-foreground rounded w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {surah.surah_no}
                            </span>
                            <span className="truncate">{surah.surah_no} - Surah {surah.surah_name_roman}</span>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              )}

              <div className="border rounded-md p-3 bg-muted/40">
                <p className="text-sm">
                  <span className="font-medium">Ayahs After: </span>
                  {settings.ayahsAfter}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Number of ayahs to recall for each prompt
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Link href="/setup" className="w-full">
              <Button variant="outline" className="w-full">
                <Settings className="mr-2 h-4 w-4" />
                Update Settings
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
