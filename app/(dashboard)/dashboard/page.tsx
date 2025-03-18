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
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState<{
    selectedJuzaa: number[];
    selectedSurahs: number[];
    selectionType: "juzaa" | "surah";
    ayahsAfter: number;
    promptsPerSession?: number;
    newAyahsPerDay?: number;
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
    newAyahsDue: 0,
    newAyahsReviewed: 0,
    reviewAyahsDue: 0,
    reviewAyahsReviewed: 0,
  });
  const [allSurahs, setAllSurahs] = useState<SurahInfo[]>([]);

  useEffect(() => {
    let mounted = true;

    const initializeDashboard = async () => {
      // Don't do anything while session is loading
      if (status === "loading") {
        setIsLoading(true);
        return;
      }

      // If no session, redirect to login
      if (!session?.user?.id) {
        router.replace("/login");
        return;
      }

      // Only load data if component is still mounted
      if (mounted) {
        try {
          await loadDashboardData();
        } catch (error) {
          console.error("Failed to load dashboard:", error);
          setIsLoading(false);
        }
      }
    };

    initializeDashboard();

    // Cleanup function to prevent state updates on unmounted component
    return () => {
      mounted = false;
    };
  }, [session?.user?.id, status]);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch user settings from the database
      const settingsResponse = await fetch("/api/settings", {
        // Add cache control headers to prevent caching
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      if (!settingsResponse.ok) {
        if (settingsResponse.status === 401) {
          router.replace("/login");
          return;
        }
        throw new Error("Failed to fetch settings");
      }

      const settingsData = await settingsResponse.json();

      if (!settingsData.settings) {
        setSettings(null);
        setIsLoading(false);
        return;
      }

      // Make sure we include the newAyahsPerDay field
      const userSettings = {
        ...settingsData.settings,
        newAyahsPerDay: settingsData.settings.newAyahsPerDay || 5,
      };

      setSettings(userSettings);

      // Preload review data based on user settings
      await preloadReviewData(userSettings);

      // Wrap all API calls in a single try-catch
      try {
        await Promise.all([
          // Stats for selected juzaa or surahs
          userSettings.selectionType === "juzaa"
            ? fetchQuranStats(userSettings.selectedJuzaa)
            : fetchQuranStatsBySurah(userSettings.selectedSurahs),

          // Load surahs if needed
          userSettings.selectionType === "surah"
            ? loadAllSurahs()
            : Promise.resolve(),

          // Calculate review stats
          calculateAllReviewStats(),
        ]);
      } catch (error) {
        console.error("Error loading stats:", error);
        // Set safe default values but don't break the page
        setQuranStats({
          totalAyahs: 0,
          selectedJuzAyahs: 0,
          selectedSurahAyahs: 0,
        });
        setReviewStats({
          dueToday: 0,
          reviewedToday: 0,
          streak: 0,
          totalReviewed: 0,
          dailyAverage: 0,
          newAyahsDue: 0,
          newAyahsReviewed: 0,
          reviewAyahsDue: 0,
          reviewAyahsReviewed: 0,
        });
      }
    } catch (error) {
      console.error("Error in loadDashboardData:", error);
      setSettings(null);
    } finally {
      setIsLoading(false);
    }
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

      if (totalData.success && surahData.success && surahData.ayahs) {
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

  const fetchQuranStats = async (juzNumbers: number[]) => {
    const [basicResponse, juzResponse] = await Promise.all([
      fetch("/api/quran?action=load", {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }),
      fetch(`/api/quran?action=juz&juz=${juzNumbers.join(",")}`, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }),
    ]);

    if (!basicResponse.ok || !juzResponse.ok) {
      if (basicResponse.status === 401 || juzResponse.status === 401) {
        router.replace("/login");
        return;
      }
      throw new Error("Failed to fetch Quran stats");
    }

    const [basicData, juzData] = await Promise.all([
      basicResponse.json(),
      juzResponse.json(),
    ]);

    if (basicData.success && juzData.success) {
      setQuranStats({
        totalAyahs: basicData.count || 0,
        selectedJuzAyahs: juzData.ayahs?.length || 0,
        selectedSurahAyahs: 0,
      });
    }
  };

  const calculateAllReviewStats = async () => {
    try {
      const [srResponse, logsResponse, newAyahsResponse] = await Promise.all([
        fetch("/api/spaced-repetition"),
        fetch("/api/daily-logs"),
        fetch("/api/new-ayahs"),
      ]);

      if (!srResponse.ok || !logsResponse.ok || !newAyahsResponse.ok) {
        if (
          srResponse.status === 401 ||
          logsResponse.status === 401 ||
          newAyahsResponse.status === 401
        ) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to fetch review stats");
      }

      const [srData, logsData, newAyahsData] = await Promise.all([
        srResponse.json(),
        logsResponse.json(),
        newAyahsResponse.json(),
      ]);

      // For tracking streaks and daily activity
      const reviewDays = new Set<string>();
      const dailyReviews: Record<string, number> = {};
      let totalReviewed = 0;
      let dueToday = 0;
      let reviewAyahsDue = 0;
      let newAyahsDue = 0;

      // Current date information
      const now = Date.now();
      const today = new Date(now).toISOString().split("T")[0]; // YYYY-MM-DD format
      const startOfDay = new Date(now).setHours(0, 0, 0, 0);
      const endOfDay = new Date(now).setHours(23, 59, 59, 999);

      // Get review ayahs due today
      if (srData.data) {
        // Count ayahs due today
        reviewAyahsDue = srData.data.filter((item: ReviewData) => {
          return item.dueDate >= startOfDay && item.dueDate <= endOfDay;
        }).length;

        // Record review dates for streak calculation
        srData.data.forEach((item: ReviewData) => {
          if (item.lastReviewed) {
            const reviewDate = new Date(item.lastReviewed)
              .toISOString()
              .split("T")[0];
            reviewDays.add(reviewDate);
          }
        });
      }

      // Add new ayahs to due count
      if (newAyahsData.success) {
        // Use the pre-calculated newAyahsToShow value from the API
        newAyahsDue = newAyahsData.newAyahsToShow || 0;
      }

      // Total due today is sum of review and new ayahs
      dueToday = reviewAyahsDue + newAyahsDue;

      // Calculate how many of each type have been reviewed today
      let reviewAyahsReviewed = 0;
      let newAyahsReviewed = 0;
      let reviewedToday = 0;

      if (logsData.logs) {
        // Calculate total reviews for today
        const todayLogs = logsData.logs.filter(
          (log: any) => log.date === today
        );
        if (todayLogs.length > 0) {
          reviewedToday = todayLogs.reduce(
            (sum: number, log: any) => sum + log.count,
            0
          );

          // If we've reviewed more than the total review ayahs due, the excess must be new ayahs
          reviewAyahsReviewed = Math.min(reviewedToday, reviewAyahsDue);
          newAyahsReviewed = Math.min(
            reviewedToday - reviewAyahsReviewed,
            newAyahsDue
          );
        }

        // Process all logs for totals and averages
        logsData.logs.forEach((log: any) => {
          const date = log.date;
          reviewDays.add(date);

          if (!dailyReviews[date]) {
            dailyReviews[date] = 0;
          }
          dailyReviews[date] += log.count;
          totalReviewed += log.count; // Add to total reviews
        });
      }

      // Calculate streak (consecutive days of review)
      const sortedDates = Array.from(reviewDays).sort((a, b) =>
        b.localeCompare(a)
      ); // Sort newest to oldest
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
            (currentDateObj.getTime() - dateObj.getTime()) /
              (1000 * 60 * 60 * 24)
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
      const totalDailyReviews = Object.values(dailyReviews).reduce(
        (sum, count) => sum + count,
        0
      );
      const dailyAverage =
        daysWithActivity > 0 ? totalDailyReviews / daysWithActivity : 0;

      // Update review stats
      setReviewStats({
        dueToday,
        reviewedToday,
        streak,
        totalReviewed,
        dailyAverage,
        newAyahsDue,
        newAyahsReviewed,
        reviewAyahsDue,
        reviewAyahsReviewed,
      });
    } catch (error) {
      console.error("Error calculating review stats:", error);
      // Set safe default values
      setReviewStats({
        dueToday: 0,
        reviewedToday: 0,
        streak: 0,
        totalReviewed: 0,
        dailyAverage: 0,
        newAyahsDue: 0,
        newAyahsReviewed: 0,
        reviewAyahsDue: 0,
        reviewAyahsReviewed: 0,
      });
    }
  };

  // Add new function to preload review data
  const preloadReviewData = async (userSettings: any) => {
    try {
      // Preload review data based on selection type
      if (userSettings.selectionType === "juzaa") {
        const juzParam = userSettings.selectedJuzaa.join(",");
        await fetch(
          `/api/quran?action=review&juz=${juzParam}&count=${userSettings.promptsPerSession}`
        );
      } else {
        const surahParam = userSettings.selectedSurahs.join(",");
        await fetch(
          `/api/quran?action=reviewBySurah&surah=${surahParam}&count=${userSettings.promptsPerSession}`
        );
      }

      // Preload spaced repetition data for the first few ayahs
      const firstAyahResponse = await fetch(
        `/api/quran?action=${
          userSettings.selectionType === "juzaa" ? "juz" : "surah"
        }&${userSettings.selectionType === "juzaa" ? "juz" : "surah"}=${
          userSettings.selectionType === "juzaa"
            ? userSettings.selectedJuzaa[0]
            : userSettings.selectedSurahs[0]
        }`
      );
      const firstAyahData = await firstAyahResponse.json();

      if (firstAyahData.success && firstAyahData.ayahs) {
        // Preload SR data for the first 5 ayahs
        await Promise.all(
          firstAyahData.ayahs.slice(0, 5).map(async (ayah: any) => {
            await fetch(
              `/api/spaced-repetition?surahNo=${ayah.surah_no}&ayahNoSurah=${ayah.ayah_no_surah}`
            );
          })
        );
      }
    } catch (error) {
      console.error("Error preloading review data:", error);
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
        newAyahsDue={reviewStats.newAyahsDue}
        newAyahsReviewed={reviewStats.newAyahsReviewed}
        reviewAyahsDue={reviewStats.reviewAyahsDue}
        reviewAyahsReviewed={reviewStats.reviewAyahsReviewed}
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
                          ? quranStats.selectedJuzAyahs / quranStats.totalAyahs
                          : quranStats.selectedSurahAyahs! /
                            quranStats.totalAyahs) * 100
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
                      Surahs ({settings.selectedSurahs.length}/
                      {allSurahs.length})
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
                    <h4 className="text-sm font-medium mb-2">
                      Selected Surahs:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs overflow-y-auto max-h-40">
                      {allSurahs
                        .filter((s) =>
                          settings.selectedSurahs.includes(s.surah_no)
                        )
                        .map((surah) => (
                          <div
                            key={surah.surah_no}
                            className="flex items-center space-x-1"
                          >
                            <span className="bg-primary text-primary-foreground rounded w-5 h-5 flex items-center justify-center flex-shrink-0">
                              {surah.surah_no}
                            </span>
                            <span className="truncate">
                              {surah.surah_no} - Surah {surah.surah_name_roman}
                            </span>
                          </div>
                        ))}
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
