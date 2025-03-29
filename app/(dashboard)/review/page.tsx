"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  RotateCcw,
  ChevronRight,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface QuranAyah {
  surah_no: number;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_roman: string;
  ayah_no_surah: number;
  ayah_no_quran: number;
  ayah_ar: string;
  ayah_en: string;
  ruko_no: number;
  juz_no: number;
  // SM-2 algorithm fields
  interval?: number; // days
  repetitions?: number;
  easeFactor?: number;
  dueDate?: number; // timestamp
  lastReviewed?: number; // timestamp
}

type ReviewStatus = "loading" | "question" | "answer" | "complete" | "error";

// Create a loading component for Suspense
function ReviewPageLoading() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <Loader2 className="w-12 h-12 animate-spin text-primary" />
      <p className="mt-4 text-lg">Loading review...</p>
    </div>
  );
}

// Main review component that uses searchParams
function ReviewPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const isGuestMode = searchParams.get("guest") === "true";
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsLoading, setIsSettingsLoading] = useState(true);
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showArabic, setShowArabic] = useState(false);
  const [reviewAyahs, setReviewAyahs] = useState<QuranAyah[]>([]);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("loading");
  const [reviewedCount, setReviewedCount] = useState(0);
  const [nextAyahs, setNextAyahs] = useState<QuranAyah[]>([]);
  const [prevAyahs, setPrevAyahs] = useState<QuranAyah[]>([]);
  const [settings, setSettings] = useState<{
    selectedJuzaa: number[];
    selectedSurahs: number[];
    selectionType: "juzaa" | "surah";
    ayahsBefore: number;
    ayahsAfter: number;
    promptsPerSession: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  // New state to track if we've tried loading settings
  const [settingsAttempted, setSettingsAttempted] = useState(false);

  // Get parameters from search params
  const juzParam = searchParams.get("juz")
    ? Number(searchParams.get("juz"))
    : 30;
  const ayahsAfterParam = searchParams.get("ayahsAfter")
    ? Number(searchParams.get("ayahsAfter"))
    : 2;

  useEffect(() => {
    // Skip auth check for guest mode
    if (!isGuestMode && status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router, isGuestMode]);

  // Only load settings when we're authenticated or in guest mode
  useEffect(() => {
    if ((status === "authenticated" && session?.user?.id) || isGuestMode) {
      const loadSettings = async () => {
        try {
          // Only use guest mode settings if user is not authenticated
          if (isGuestMode && status !== "authenticated") {
            setSettings({
              selectedJuzaa: [juzParam],
              selectedSurahs: [],
              selectionType: "juzaa",
              ayahsBefore: 2,
              ayahsAfter: ayahsAfterParam,
              promptsPerSession: 20,
            });
            setIsSettingsLoading(false);
            return;
          }

          // For authenticated users, always load their settings
          const response = await fetch("/api/settings", {
            // Add cache control to prevent caching settings
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          });

          if (!response.ok) {
            throw new Error("Failed to load settings");
          }

          const data = await response.json();

          if (
            data.settings &&
            ((data.settings.selectionType === "juzaa" &&
              data.settings.selectedJuzaa?.length > 0) ||
              (data.settings.selectionType === "surah" &&
                data.settings.selectedSurahs?.length > 0))
          ) {
            setSettings(data.settings);
            setIsSettingsLoading(false);
          } else {
            console.warn("No settings found");
            setError(
              "Please configure your review settings to start reviewing"
            );
            setReviewStatus("error");
            setIsSettingsLoading(false);
          }
        } catch (error) {
          console.error("Error loading settings:", error);
          setError("Failed to load settings");
          setReviewStatus("error");
          setIsSettingsLoading(false);
        } finally {
          setSettingsAttempted(true);
        }
      };

      loadSettings();
    }
  }, [session?.user?.id, status, isGuestMode, juzParam, ayahsAfterParam]);

  // Separate effect for loading ayahs when settings are available
  useEffect(() => {
    if (!isSettingsLoading && settings) {
      loadAyahs();
    }
  }, [isSettingsLoading, settings]);

  // Add a timeout to prevent infinite loading for users without settings
  useEffect(() => {
    if (
      (isSettingsLoading || isLoading) &&
      status === "authenticated" &&
      !isGuestMode
    ) {
      const timer = setTimeout(() => {
        if (isSettingsLoading) {
          setError("Please configure your review settings to start reviewing");
          setReviewStatus("error");
          setIsSettingsLoading(false);
        }
      }, 3000); // Show error after 3 seconds if still loading

      return () => clearTimeout(timer);
    }
  }, [isSettingsLoading, isLoading, status, isGuestMode]);

  const loadAyahs = async () => {
    if (!settings) {
      console.warn("No settings available, cannot load ayahs");
      return;
    }

    setIsLoading(true);
    setReviewStatus("loading");
    try {
      let response;

      // Use the configured promptsPerSession or default to 20 if not set
      const count = settings.promptsPerSession || 20;

      if (settings.selectionType === "juzaa") {
        const juzParam = settings.selectedJuzaa.join(",");
        response = await fetch(
          `/api/quran?action=review&juz=${juzParam}&count=${count}${
            isGuestMode ? "&guest=true" : ""
          }`,
          {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      } else {
        const surahParam = settings.selectedSurahs.join(",");
        response = await fetch(
          `/api/quran?action=reviewBySurah&surah=${surahParam}&count=${count}${
            isGuestMode ? "&guest=true" : ""
          }`,
          {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
      }

      const data = await response.json();

      if (!data.success || !data.ayahs || data.ayahs.length === 0) {
        setError(
          "Failed to load Quran data. Please check your settings and try again."
        );
        setReviewStatus("error");
        return;
      }

      // Get information about last ayahs in each surah
      // We'll use a simple fetch to get surah details
      let surahDetails: Record<number, { totalAyahs: number }> = {};

      try {
        // Make a single API call to get all surah info if needed
        const surahInfoResponse = await fetch("/api/quran?action=surahDetails");
        const surahInfoData = await surahInfoResponse.json();

        if (surahInfoData.success && surahInfoData.surahs) {
          // Create a lookup object with surah number as key
          surahInfoData.surahs.forEach((surah: any) => {
            surahDetails[surah.surah_no] = {
              totalAyahs: surah.total_ayahs,
            };
          });
        }
      } catch (error) {
        console.error("Could not fetch surah details:", error);
        // Continue without this feature if fetch fails
      }

      // Filter out ayahs that are the last in their surah
      let filteredAyahs = [...data.ayahs];

      if (Object.keys(surahDetails).length > 0) {
        filteredAyahs = filteredAyahs.filter((ayah: QuranAyah) => {
          const surahInfo = surahDetails[ayah.surah_no];
          // If we have surah info, filter out last ayah of each surah
          if (surahInfo) {
            return ayah.ayah_no_surah < surahInfo.totalAyahs;
          }
          return true; // If we don't have surah info, include all ayahs
        });
      }

      // Ensure we have at least some ayahs left after filtering
      if (filteredAyahs.length === 0 && data.ayahs.length > 0) {
        console.warn("All ayahs were filtered out, using original set");
        filteredAyahs = data.ayahs;
      }

      // Load all data before updating state
      const ayahsWithSR = await Promise.all(
        filteredAyahs.map(async (ayah: QuranAyah) => {
          // Skip fetching spaced repetition data for guest mode
          if (isGuestMode) {
            return {
              ...ayah,
              interval: 1,
              repetitions: 0,
              easeFactor: 2.5,
              lastReviewed: null,
              dueDate: null,
            };
          }

          try {
            const srResponse = await fetch(
              `/api/spaced-repetition?surahNo=${ayah.surah_no}&ayahNoSurah=${ayah.ayah_no_surah}`
            );
            const srData = await srResponse.json();

            if (srData.data) {
              return {
                ...ayah,
                interval: srData.data.interval,
                repetitions: srData.data.repetitions,
                easeFactor: srData.data.easeFactor,
                lastReviewed: srData.data.lastReviewed,
                dueDate: srData.data.dueDate,
              };
            }
            return ayah;
          } catch (error) {
            return ayah;
          }
        })
      );

      // Load initial next ayahs before updating state
      if (ayahsWithSR.length > 0) {
        await loadNextAyahs(ayahsWithSR[0]);
      }

      // Update all state at once
      setAyahs(ayahsWithSR);
      setReviewAyahs(ayahsWithSR);
      setCurrentAyahIndex(0);
      setReviewedCount(0);
      setReviewStatus("question");
    } catch (error) {
      console.error("Error loading ayahs:", error);
      setError("Failed to load Quran data");
      setReviewStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextAyahs = async (currentAyah: QuranAyah) => {
    if (!settings) {
      console.warn("No settings available, cannot load next ayahs");
      return;
    }

    try {
      // Only fetch previous ayahs if we're not at the start of a surah
      if (currentAyah.ayah_no_surah > 1) {
        const prevCount = settings.ayahsBefore || 2;
        const prevResponse = await fetch(
          `/api/quran?action=prev&surah=${currentAyah.surah_no}&ayah=${
            currentAyah.ayah_no_surah
          }&count=${prevCount}${isGuestMode ? "&guest=true" : ""}`,
          {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          }
        );
        const prevData = await prevResponse.json();

        if (prevData.success && prevData.ayahs) {
          // Only include previous ayahs from the same surah
          const sameSurahPrevAyahs = prevData.ayahs.filter(
            (ayah: QuranAyah) => ayah.surah_no === currentAyah.surah_no
          );
          setPrevAyahs(sameSurahPrevAyahs);
        } else {
          setPrevAyahs([]);
        }
      } else {
        // At the start of a surah, don't show any previous context
        setPrevAyahs([]);
      }

      // If ayahsAfter is 0, don't fetch any next ayahs
      if (settings.ayahsAfter === 0) {
        setNextAyahs([]);
        return;
      }

      // Get information about current surah to avoid spanning across surahs
      let surahInfo: { totalAyahs: number } | null = null;
      try {
        const surahInfoResponse = await fetch(
          `/api/quran?action=surahInfo&surah=${currentAyah.surah_no}`
        );
        const surahInfoData = await surahInfoResponse.json();

        if (surahInfoData.success && surahInfoData.surah) {
          surahInfo = {
            totalAyahs: surahInfoData.surah.total_ayahs,
          };
        }
      } catch (error) {
        console.error("Could not fetch surah info:", error);
        // Continue without this information if fetch fails
      }

      // Calculate how many ayahs we need to request based on position in surah
      let requestCount = settings.ayahsAfter;

      // If we're close to the end of a surah, adjust count to avoid spanning
      if (
        surahInfo &&
        currentAyah.ayah_no_surah + settings.ayahsAfter >= surahInfo.totalAyahs
      ) {
        // Only get ayahs up to the second-to-last ayah in the surah
        requestCount = Math.max(
          0,
          surahInfo.totalAyahs - currentAyah.ayah_no_surah - 1
        );

        if (requestCount <= 0) {
          // If we're already at or near the end of the surah, don't fetch any next ayahs
          setNextAyahs([]);
          return;
        }
      }

      const nextResponse = await fetch(
        `/api/quran?action=next&surah=${currentAyah.surah_no}&ayah=${
          currentAyah.ayah_no_surah
        }&count=${requestCount}${isGuestMode ? "&guest=true" : ""}`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      );
      const nextData = await nextResponse.json();

      if (nextData.success && nextData.ayahs) {
        // Filter to ensure we only get ayahs from the same surah
        const sameSurahNextAyahs = nextData.ayahs.filter(
          (ayah: QuranAyah) => ayah.surah_no === currentAyah.surah_no
        );
        setNextAyahs(sameSurahNextAyahs);
      } else {
        setNextAyahs([]);
      }
    } catch (error) {
      console.error("Error loading context ayahs:", error);
      setPrevAyahs([]);
      setNextAyahs([]);
    }
  };

  const handleShowAnswer = () => {
    setReviewStatus("answer");
  };

  const handleRating = async (remembered: boolean) => {
    // Skip spaced repetition updates for guest mode - only if not authenticated
    if (isGuestMode && status !== "authenticated") {
      // Just advance to the next question
      setReviewedCount(reviewedCount + 1);

      if (currentAyahIndex + 1 < reviewAyahs.length) {
        await loadNextAyahs(reviewAyahs[currentAyahIndex + 1]);
        setCurrentAyahIndex(currentAyahIndex + 1);
        setShowArabic(false);
        setShowTranslation(false);
        setReviewStatus("question");
      } else {
        setReviewStatus("complete");
      }
      return;
    }

    const currentAyah = reviewAyahs[currentAyahIndex];

    // Initialize spaced repetition values if they don't exist
    if (!currentAyah.interval) currentAyah.interval = 0;
    if (!currentAyah.repetitions) currentAyah.repetitions = 0;
    if (!currentAyah.easeFactor) currentAyah.easeFactor = 2.5;

    const quality = remembered ? 3 : 1;

    // Apply SM-2 algorithm
    let nextInterval: number;
    let nextEaseFactor = currentAyah.easeFactor;
    let nextRepetitions = currentAyah.repetitions;

    if (quality < 2) {
      // Failed to remember (1)
      nextInterval = 1;
      nextRepetitions = 0;
      nextEaseFactor = Math.max(1.3, currentAyah.easeFactor - 0.2);
    } else {
      // Successfully remembered (3)
      nextRepetitions = currentAyah.repetitions + 1;

      if (nextRepetitions === 1) {
        nextInterval = 1;
      } else if (nextRepetitions === 2) {
        nextInterval = 6;
      } else {
        nextInterval = Math.round(
          currentAyah.interval * currentAyah.easeFactor
        );
      }

      nextEaseFactor =
        currentAyah.easeFactor +
        (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
    }

    // Update the ayah with new spaced repetition values
    const updatedAyah = {
      ...currentAyah,
      interval: nextInterval,
      repetitions: nextRepetitions,
      easeFactor: nextEaseFactor,
      lastReviewed: Date.now(),
      dueDate: Date.now() + nextInterval * 24 * 60 * 60 * 1000,
    };

    // Fix: Ensure date uses local timezone instead of UTC
    const now = new Date();
    // Format today as YYYY-MM-DD in local timezone
    const today =
      now.getFullYear() +
      "-" +
      String(now.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(now.getDate()).padStart(2, "0");

    // Prepare all the API calls to run in parallel
    const apiCalls = [];

    // Save to spaced repetition database
    try {
      apiCalls.push(
        fetch("/api/spaced-repetition", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            surahNo: updatedAyah.surah_no,
            ayahNoSurah: updatedAyah.ayah_no_surah,
            interval: updatedAyah.interval,
            repetitions: updatedAyah.repetitions,
            easeFactor: updatedAyah.easeFactor,
            lastReviewed: updatedAyah.lastReviewed,
            dueDate: updatedAyah.dueDate,
            reviewDate: today,
            selectionType: settings?.selectionType || "juzaa",
          }),
        })
      );
    } catch (error) {
      console.error("Failed to save spaced repetition data:", error);
      // Silently handle error - we don't want to interrupt the user's review
      // The data will be updated on their next review
    }

    // Save daily log
    try {
      apiCalls.push(
        fetch("/api/daily-logs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            date: today,
            ayahKey: `${updatedAyah.surah_no}:${updatedAyah.ayah_no_surah}`,
          }),
        })
      );
    } catch (error) {
      console.error("Failed to save daily log:", error);
      // Silently handle error - daily logs are not critical
    }

    // This ensures the dashboard will show the latest progress when the user returns
    try {
      apiCalls.push(
        fetch("/api/review-stats", {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })
      );
    } catch (error) {
      console.error("Failed to refresh review stats:", error);
      // Continue with the review process even if the API call fails
    }

    // Execute all API calls in parallel
    await Promise.allSettled(apiCalls);

    // Update the review ayahs array with the updated ayah
    const updatedAyahs = [...reviewAyahs];
    updatedAyahs[currentAyahIndex] = updatedAyah;
    setReviewAyahs(updatedAyahs);

    // Increase reviewed count
    setReviewedCount(reviewedCount + 1);

    // Advance to the next ayah
    if (currentAyahIndex + 1 < reviewAyahs.length) {
      await loadNextAyahs(reviewAyahs[currentAyahIndex + 1]);
      setCurrentAyahIndex(currentAyahIndex + 1);
      setShowArabic(false); // Reset for next question
      setShowTranslation(false);
      setReviewStatus("question");
    } else {
      setReviewStatus("complete");
    }
  };

  const resetReview = () => {
    loadAyahs();
  };

  if (reviewStatus === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <h2 className="text-xl font-semibold">Error</h2>
        <p className="text-muted-foreground text-center max-w-md">{error}</p>
        {(!settings || !settings.selectedJuzaa.length) && (
          <Button
            variant="default"
            className="mt-4"
            onClick={() => router.push("/setup")}
          >
            Configure Settings
          </Button>
        )}
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => {
            setIsLoading(true);
            setReviewStatus("loading");
            setError(null);
            loadAyahs();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Try Again
        </Button>
      </div>
    );
  }

  if (isSettingsLoading || isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-lg">Loading review...</p>
      </div>
    );
  }

  if (reviewStatus === "complete") {
    return (
      <Card className="text-center max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Review Complete!</CardTitle>
          <CardDescription>
            You have reviewed {reviewedCount} ayahs in this session.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <p className="mb-6">
            Great job! Consistent review helps strengthen your memorization.
          </p>

          {isGuestMode && status !== "authenticated" && (
            <Alert className="mb-4 bg-blue-50 border-blue-200">
              <AlertDescription className="text-blue-800">
                Sign up for a free account to unlock full features including:
                <ul className="list-disc pl-5 mt-2">
                  <li>Track your progress over time</li>
                  <li>Personalized spaced repetition</li>
                  <li>Custom review settings</li>
                  <li>Review history and statistics</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-center space-x-4">
          <Button variant="outline" onClick={resetReview}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Review More
          </Button>

          {isGuestMode && status !== "authenticated" ? (
            <Link href="/register">
              <Button>
                Sign Up Now
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <Link href="/dashboard">
              <Button>
                Back to Dashboard
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          )}
        </CardFooter>
      </Card>
    );
  }

  const currentAyah = reviewAyahs[currentAyahIndex];

  return (
    <div className="container max-w-4xl px-4 py-6 mx-auto">
      {isGuestMode && status !== "authenticated" && (
        <Alert className="mb-4 bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between w-full">
            <span className="text-yellow-800">
              You're in guest mode. Your progress won't be saved.
            </span>
            <Link href="/register">
              <Button
                variant="outline"
                size="sm"
                className="text-yellow-600 border-yellow-600 hover:bg-yellow-100"
              >
                Sign Up
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Review Session</span>
            <span className="text-sm font-normal text-muted-foreground">
              {currentAyahIndex + 1} of {reviewAyahs.length}
            </span>
          </CardTitle>
          <CardDescription className="flex items-center justify-between">
            <span>Review your memorization of the Quran</span>
            <Link
              href="/review-mushaf"
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <BookOpen className="h-3 w-3" />
              Try Mushaf Mode
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviewStatus === "question" ? (
            <div className="space-y-6">
              <div className="bg-muted/50 p-6 rounded-lg">
                {prevAyahs.length > 0 && (
                  <div className="mb-6">
                    <p className="text-base text-muted-foreground text-center mb-3 font-bold">
                      Context (Previous Ayahs)
                    </p>
                    {prevAyahs.map((ayah, index) => (
                      <div
                        key={index}
                        className="mb-3 border-b pb-3 last:border-b-0 last:pb-0"
                      >
                        <p className="font-arabic text-center text-sm mb-1">
                          {ayah.ayah_ar}
                        </p>
                        <p className="text-center text-xs text-muted-foreground">
                          {ayah.ayah_en}
                        </p>
                        <p className="text-center text-xs text-muted-foreground mt-1 font-bold">
                          {ayah.surah_no} - {ayah.surah_name_roman}{" "}
                          {ayah.ayah_no_surah}
                        </p>
                      </div>
                    ))}
                    <div className="border-t my-4"></div>
                  </div>
                )}
                <div className="mb-4 text-center">
                  <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {currentAyah.surah_no} - Surah{" "}
                    {currentAyah.surah_name_roman}
                    {" - "}
                    Ayah {currentAyah.ayah_no_surah}
                  </span>
                </div>
                <p className="font-arabic text-center mb-4">
                  {currentAyah.ayah_ar}
                </p>
                <p className="text-center text-sm text-muted-foreground">
                  {currentAyah.ayah_en}
                </p>
              </div>
              <div className="text-center">
                <p className="mb-2 font-medium">
                  Continue reciting the next {settings?.ayahsAfter || 0} ayahs
                  from memory
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  When you're ready, click the button below to check your answer
                </p>
                <Button size="lg" onClick={handleShowAnswer}>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Show Answer
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 border rounded-lg bg-secondary/20">
                <p className="font-medium text-sm mb-2 text-center">
                  The Correct Next Ayahs:
                </p>
                {nextAyahs.length > 0 ? (
                  <div className="space-y-4">
                    <div className="bg-background p-4 rounded-md border-l-4 border-primary">
                      <p className="text-center text-xs text-primary font-medium mb-2">
                        Initial Ayah
                      </p>
                      <p className="font-arabic text-center mb-2">
                        {currentAyah.ayah_ar}
                      </p>
                      <p className="text-center text-sm text-muted-foreground">
                        {currentAyah.ayah_en}
                      </p>
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        {currentAyah.surah_no} - {currentAyah.surah_name_roman}{" "}
                        {currentAyah.ayah_no_surah}
                      </p>
                    </div>

                    {nextAyahs.map((ayah, index) => (
                      <div key={index} className="bg-background p-4 rounded-md">
                        <p className="font-arabic text-center mb-2">
                          {ayah.ayah_ar}
                        </p>
                        <p className="text-center text-sm text-muted-foreground">
                          {ayah.ayah_en}
                        </p>
                        <p className="text-center text-xs text-muted-foreground mt-2">
                          {ayah.surah_no} - {ayah.surah_name_roman}{" "}
                          {ayah.ayah_no_surah}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-4">
                    <p className="text-center text-muted-foreground mb-2">
                      This is the end of Surah {currentAyah.surah_name_roman}.
                    </p>
                    <p className="text-center text-xs text-muted-foreground">
                      Each review prompt stays within a single surah.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex justify-center space-x-4">
                <p className="mb-2 text-center">How well did you remember?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="bg-red-50 hover:bg-red-100 border-red-200 text-foreground dark:bg-red-950 dark:hover:bg-red-900 dark:border-red-800 dark:text-red-100"
                  onClick={() => handleRating(false)}
                >
                  <ThumbsDown className="mr-2 h-4 w-4 text-red-500 dark:text-red-400" />
                  Forgot
                </Button>
                <Button
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 border-green-200 text-foreground dark:bg-green-950 dark:hover:bg-green-900 dark:border-green-800 dark:text-green-100"
                  onClick={() => handleRating(true)}
                >
                  <ThumbsUp className="mr-2 h-4 w-4 text-green-500 dark:text-green-400" />
                  Remembered
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Default export that wraps the component with Suspense
export default function ReviewPage() {
  return (
    <Suspense fallback={<ReviewPageLoading />}>
      <ReviewPageContent />
    </Suspense>
  );
}
