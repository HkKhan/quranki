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
    ayahsAfter: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [quranStats, setQuranStats] = useState<QuranStats>({
    totalAyahs: 0,
    selectedJuzAyahs: 0,
  });
  const [reviewStats, setReviewStats] = useState({
    dueToday: 0,
    reviewedToday: 0,
    streak: 0,
    totalReviewed: 0,
    dailyAverage: 0,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem("quranReviewSettings");
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);

      // Fetch stats for the selected juzaa
      await fetchQuranStats(parsedSettings.selectedJuzaa);

      // Calculate review statistics
      calculateReviewStats(parsedSettings.selectedJuzaa);
    }

    setIsLoading(false);
  };

  const calculateReviewStats = async (selectedJuzaa: number[]) => {
    try {
      // Get all ayahs for the selected juzaa
      const response = await fetch(
        `/api/quran?action=juz&juz=${selectedJuzaa.join(",")}`
      );
      const data = await response.json();

      if (!data.success || !data.ayahs) return;

      const now = Date.now();
      const startOfDay = new Date(now).setHours(0, 0, 0, 0);
      const endOfDay = new Date(now).setHours(23, 59, 59, 999);
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).getTime();

      let dueToday = 0;
      let reviewedToday = 0;
      let totalReviewed = 0;
      let lastReviewDates: number[] = [];
      let last30DaysReviews = 0;
      let daysWithReviewsLast30 = 0;
      const dailyReviewCounts = new Set<string>();

      // Process each ayah
      data.ayahs.forEach((ayah: any) => {
        const storageKey = `quranki_sr_${ayah.surah_no}_${ayah.ayah_no_surah}`;
        const srDataStr = localStorage.getItem(storageKey);

        if (srDataStr) {
          const srData: ReviewData = JSON.parse(srDataStr);

          // Count due today
          if (srData.dueDate >= startOfDay && srData.dueDate <= endOfDay) {
            dueToday++;
          }

          // Count reviewed today and in last 30 days
          if (srData.lastReviewed) {
            if (
              srData.lastReviewed >= startOfDay &&
              srData.lastReviewed <= endOfDay
            ) {
              reviewedToday++;
            }

            // Track reviews in last 30 days
            if (srData.lastReviewed >= thirtyDaysAgo) {
              last30DaysReviews++;
              const reviewDate = new Date(srData.lastReviewed).toDateString();
              dailyReviewCounts.add(reviewDate);
            }

            // Add to total reviewed
            totalReviewed++;
            lastReviewDates.push(srData.lastReviewed);
          }
        }
      });

      // Calculate daily average from last 30 days
      daysWithReviewsLast30 = dailyReviewCounts.size;
      const dailyAverage =
        daysWithReviewsLast30 > 0
          ? last30DaysReviews / daysWithReviewsLast30
          : 0;

      // Calculate streak
      let streak = 0;
      if (lastReviewDates.length > 0) {
        lastReviewDates.sort((a, b) => b - a); // Sort in descending order
        const uniqueDates = new Set(
          lastReviewDates.map((date) => new Date(date).toDateString())
        );
        const dates = Array.from(uniqueDates);

        // Count consecutive days
        let currentDate = new Date();
        currentDate.setHours(0, 0, 0, 0);

        for (let i = 0; i < dates.length; i++) {
          const reviewDate = new Date(dates[i]);
          const dayDiff = Math.floor(
            (currentDate.getTime() - reviewDate.getTime()) /
              (1000 * 60 * 60 * 24)
          );

          if (dayDiff === i) {
            streak++;
          } else {
            break;
          }
        }
      }

      setReviewStats({
        dueToday,
        reviewedToday,
        streak,
        totalReviewed,
        dailyAverage,
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
                    {quranStats.selectedJuzAyahs} of {quranStats.totalAyahs}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${
                        (quranStats.selectedJuzAyahs / quranStats.totalAyahs) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>

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
