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
  const [settings, setSettings] = useState<{
    selectedJuzaa: number[];
    selectedSurahs: number[];
    selectionType: "juzaa" | "surah";
    ayahsAfter: number;
  } | null>(null);
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Skip localStorage access during server-side rendering
    if (typeof window === "undefined") {
      setIsLoading(false);
      return;
    }

    // Load settings from localStorage
    const savedSettings = localStorage.getItem("quranReviewSettings");
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);

      // Fetch stats for the selected juzaa or surahs
      if (parsedSettings.selectionType === "juzaa") {
        await fetchQuranStats(parsedSettings.selectedJuzaa);
      } else {
        await fetchQuranStatsBySurah(parsedSettings.selectedSurahs);
      }

      // Load all surahs info if selection type is "surah"
      if (parsedSettings.selectionType === "surah") {
        await loadAllSurahs();
      }

      // Calculate combined review statistics from all ayahs (both juzaa and surah)
      calculateAllReviewStats();
    }

    setIsLoading(false);
  };

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
      // Skip localStorage access during server-side rendering
      if (typeof window === "undefined") {
        return;
      }

      // For tracking streaks and daily activity
      const reviewDays = new Set<string>();
      const dailyReviews: Record<string, number> = {};
      let totalReviewed = 0;
      let dueToday = 0;
      
      // Current date information
      const now = Date.now();
      const today = new Date(now).toISOString().split('T')[0]; // YYYY-MM-DD format
      const startOfDay = new Date(now).setHours(0, 0, 0, 0);
      const endOfDay = new Date(now).setHours(23, 59, 59, 999);
      
      // Get all keys in localStorage for SR data and daily logs
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;
        
        // Process SR data for individual ayahs
        if (key.startsWith("quranki_sr_")) {
          const srDataStr = localStorage.getItem(key);
          if (srDataStr) {
            const srData = JSON.parse(srDataStr);
            totalReviewed++;
            
            // Check if due today
            if (srData.dueDate >= startOfDay && srData.dueDate <= endOfDay) {
              dueToday++;
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
            dailyReviews[date] = ayahsReviewedThisDay;
            
            // Count today's reviews
            if (date === today) {
              dailyReviews[today] = Object.keys(log).length;
            }
          }
        }
      }
      
      // Calculate streak (consecutive days of review)
      const sortedDates = Array.from(reviewDays).sort((a, b) => b.localeCompare(a)); // Sort newest to oldest
      let streak = 0;
      
      if (sortedDates.length > 0) {
        // Check if user reviewed today
        const hasReviewedToday = sortedDates[0] === today;
        let currentDateObj = hasReviewedToday 
          ? new Date() 
          : new Date(sortedDates[0] + "T00:00:00Z");
        
        for (const dateStr of sortedDates) {
          const dateObj = new Date(dateStr + "T00:00:00Z");
          const daysDiff = Math.round(
            (currentDateObj.getTime() - dateObj.getTime()) / (1000 * 60 * 60 * 24)
          );
          
          if (daysDiff <= 1) {
            streak++;
            currentDateObj = dateObj;
          } else {
            break; // Streak is broken
          }
        }
      }
      
      // Calculate daily average
      const daysWithActivity = Object.keys(dailyReviews).length;
      const totalDailyReviews = Object.values(dailyReviews).reduce((sum, count) => sum + count, 0);
      const dailyAverage = daysWithActivity > 0 
        ? totalDailyReviews / daysWithActivity 
        : 0;
        
      // Calculate today's reviews
      const reviewedToday = dailyReviews[today] || 0;
      
      setReviewStats({
        dueToday,
        reviewedToday,
        streak,
        totalReviewed,
        dailyAverage: Math.round(dailyAverage * 10) / 10, // Round to 1 decimal place
      });
    } catch (error) {
      console.error("Error calculating review stats:", error);
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
