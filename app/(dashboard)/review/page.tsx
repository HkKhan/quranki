"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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

export default function ReviewPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showArabic, setShowArabic] = useState(false);
  const [reviewAyahs, setReviewAyahs] = useState<QuranAyah[]>([]);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("loading");
  const [reviewedCount, setReviewedCount] = useState(0);
  const [nextAyahs, setNextAyahs] = useState<QuranAyah[]>([]);
  const [settings, setSettings] = useState(() => {
    // Initialize settings from localStorage or use defaults
    if (typeof window === "undefined") {
      return {
        selectedJuzaa: [30],
        selectedSurahs: [],
        selectionType: "juzaa",
        ayahsAfter: 2,
      };
    }

    const savedSettings = localStorage.getItem("quranReviewSettings");
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
    return {
      selectedJuzaa: [30],
      selectedSurahs: [],
      selectionType: "juzaa",
      ayahsAfter: 2,
    };
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAyahs();
  }, []);

  const loadAyahs = async () => {
    setIsLoading(true);
    try {
      let response;
      
      if (settings.selectionType === "juzaa") {
        const juzParam = settings.selectedJuzaa.join(",");
        response = await fetch(
          `/api/quran?action=review&juz=${juzParam}&count=20`
        );
      } else {
        const surahParam = settings.selectedSurahs.join(",");
        response = await fetch(
          `/api/quran?action=reviewBySurah&surah=${surahParam}&count=20`
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

      // Load spaced repetition data for each ayah
      const ayahsWithSR = data.ayahs.map((ayah: QuranAyah) => {
        // Skip localStorage access during server-side rendering
        if (typeof window === "undefined") {
          return ayah;
        }

        const storageKey = `quranki_sr_${ayah.surah_no}_${ayah.ayah_no_surah}`;
        const srData = localStorage.getItem(storageKey);
        if (srData) {
          const parsed = JSON.parse(srData);
          return {
            ...ayah,
            interval: parsed.interval,
            repetitions: parsed.repetitions,
            easeFactor: parsed.easeFactor,
            lastReviewed: parsed.lastReviewed,
            dueDate: parsed.dueDate,
          };
        }
        return ayah;
      });

      setAyahs(ayahsWithSR);
      setReviewAyahs(ayahsWithSR);
      setCurrentAyahIndex(0);
      setReviewedCount(0);
      setReviewStatus("question");

      // Load the first set of next ayahs
      loadNextAyahs(ayahsWithSR[0]);
    } catch (error) {
      console.error("Error loading ayahs:", error);
      setError("Failed to load Quran data. Please try again later.");
      setReviewStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextAyahs = async (currentAyah: QuranAyah) => {
    try {
      // If ayahsAfter is 0, don't fetch any next ayahs
      if (settings.ayahsAfter === 0) {
        setNextAyahs([]);
        return;
      }
      
      // First check if we need to respect surah boundaries
      const surahCountResponse = await fetch(
        `/api/quran?action=surahAyahCount&surah=${currentAyah.surah_no}`
      );
      const surahCountData = await surahCountResponse.json();
      
      if (surahCountData.success) {
        // Calculate how many ayahs are remaining in this surah
        const ayahsRemainingInSurah = surahCountData.count - currentAyah.ayah_no_surah;
        
        // Use the minimum of ayahsAfter and ayahsRemainingInSurah
        const adjustedCount = Math.min(settings.ayahsAfter, ayahsRemainingInSurah);
        
        if (adjustedCount <= 0) {
          setNextAyahs([]);
          return;
        }
        
        const response = await fetch(
          `/api/quran?action=next&surah=${currentAyah.surah_no}&ayah=${currentAyah.ayah_no_surah}&count=${adjustedCount}`
        );
        const data = await response.json();

        if (data.success && data.ayahs) {
          setNextAyahs(data.ayahs);
        } else {
          setNextAyahs([]);
        }
      } else {
        // If we couldn't get the surah count, fall back to the original behavior
        const response = await fetch(
          `/api/quran?action=next&surah=${currentAyah.surah_no}&ayah=${currentAyah.ayah_no_surah}&count=${settings.ayahsAfter}`
        );
        const data = await response.json();

        if (data.success && data.ayahs) {
          setNextAyahs(data.ayahs);
        } else {
          setNextAyahs([]);
        }
      }
    } catch (error) {
      console.error("Error loading next ayahs:", error);
      setNextAyahs([]);
    }
  };

  const handleShowAnswer = () => {
    setReviewStatus("answer");
  };

  const handleRating = (remembered: boolean) => {
    const currentAyah = reviewAyahs[currentAyahIndex];

    // Initialize spaced repetition values if they don't exist
    if (!currentAyah.interval) currentAyah.interval = 0;
    if (!currentAyah.repetitions) currentAyah.repetitions = 0;
    if (!currentAyah.easeFactor) currentAyah.easeFactor = 2.5; // Initial ease factor

    // Convert remembered boolean to Anki-style rating (1 for false, 3 for true)
    const quality = remembered ? 3 : 1;

    // Apply SM-2 algorithm
    let nextInterval: number;
    let nextEaseFactor = currentAyah.easeFactor;
    let nextRepetitions = currentAyah.repetitions;

    if (quality < 2) {
      // Failed to remember (1)
      nextRepetitions = 0;
      nextInterval = 1; // Reset to 1 day
    } else {
      // Remembered (3)
      nextRepetitions += 1;

      // Calculate next interval
      if (nextRepetitions === 1) {
        nextInterval = 1;
      } else if (nextRepetitions === 2) {
        nextInterval = 6;
      } else {
        nextInterval = Math.round(
          currentAyah.interval * currentAyah.easeFactor
        );
      }

      // Update ease factor
      nextEaseFactor =
        currentAyah.easeFactor +
        (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02));
      nextEaseFactor = Math.max(1.3, nextEaseFactor); // Minimum ease factor is 1.3
    }

    // Update the ayah with new spaced repetition values
    const updatedAyah = {
      ...currentAyah,
      interval: nextInterval,
      repetitions: nextRepetitions,
      easeFactor: nextEaseFactor,
      lastReviewed: Date.now(),
      dueDate: Date.now() + nextInterval * 24 * 60 * 60 * 1000, // Convert days to milliseconds
    };

    // Update the ayah in the review list
    const updatedReviewAyahs = [...reviewAyahs];
    updatedReviewAyahs[currentAyahIndex] = updatedAyah;
    setReviewAyahs(updatedReviewAyahs);

    // Store the updated spaced repetition data in localStorage
    // Skip localStorage access during server-side rendering
    if (typeof window !== "undefined") {
      const storageKey = `quranki_sr_${currentAyah.surah_no}_${currentAyah.ayah_no_surah}`;

      // Also save review date to a daily log for better statistics tracking
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const dailyLogKey = `quranki_daily_log_${today}`;
      
      // Save SR data for this specific ayah
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          interval: updatedAyah.interval,
          repetitions: updatedAyah.repetitions,
          easeFactor: updatedAyah.easeFactor,
          lastReviewed: updatedAyah.lastReviewed,
          dueDate: updatedAyah.dueDate,
          selectionType: settings.selectionType, // Track which selection type was used
          reviewDate: today,
        })
      );
      
      // Update daily log
      let dailyLog: Record<string, number> = {};
      const existingLog = localStorage.getItem(dailyLogKey);
      if (existingLog) {
        dailyLog = JSON.parse(existingLog);
      }
      
      // Add or increment ayah count
      const ayahKey = `${currentAyah.surah_no}_${currentAyah.ayah_no_surah}`;
      if (dailyLog[ayahKey]) {
        dailyLog[ayahKey]++;
      } else {
        dailyLog[ayahKey] = 1;
      }
      
      localStorage.setItem(dailyLogKey, JSON.stringify(dailyLog));
    }

    setReviewedCount((prev) => prev + 1);

    if (currentAyahIndex < reviewAyahs.length - 1) {
      const nextIndex = currentAyahIndex + 1;
      setCurrentAyahIndex(nextIndex);
      loadNextAyahs(reviewAyahs[nextIndex]);
      setReviewStatus("question");
    } else {
      setReviewStatus("complete");
    }
  };

  const resetReview = () => {
    loadAyahs();
  };

  if (reviewStatus === "loading") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>Loading Quran data...</p>
      </div>
    );
  }

  if (reviewStatus === "error") {
    return (
      <Card className="text-center max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">Error</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="mb-4">{error}</p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button variant="outline" onClick={resetReview} className="mr-2">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
          <Link href="/setup">
            <Button>
              Review Settings
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
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
        </CardContent>
        <CardFooter className="flex justify-center space-x-4">
          <Button variant="outline" onClick={resetReview}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Review More
          </Button>
          <Link href="/dashboard">
            <Button>
              Back to Dashboard
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  const currentAyah = reviewAyahs[currentAyahIndex];

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Review Session</span>
            <span className="text-sm font-normal text-muted-foreground">
              {currentAyahIndex + 1} of {reviewAyahs.length}
            </span>
          </CardTitle>
          <CardDescription>
            Review your memorization of the Quran
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reviewStatus === "question" ? (
            <div className="space-y-6">
              <div className="bg-muted/50 p-6 rounded-lg">
                <div className="mb-4 text-center">
                  <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">
                    {currentAyah.surah_no} - Surah {currentAyah.surah_name_roman}
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
                  Continue reciting the next {settings.ayahsAfter} ayahs from
                  memory
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
                        {currentAyah.surah_no} - {currentAyah.surah_name_roman} {currentAyah.ayah_no_surah}
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
                          {ayah.surah_no} - {ayah.surah_name_roman} {ayah.ayah_no_surah}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground">
                    No more ayahs available in this surah.
                  </p>
                )}
              </div>

              <div className="flex justify-center space-x-4">
                <p className="mb-2 text-center">How well did you remember?</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  className="bg-red-50 hover:bg-red-100 border-red-200"
                  onClick={() => handleRating(false)}
                >
                  <ThumbsDown className="mr-2 h-4 w-4 text-red-500" />
                  Forgot
                </Button>
                <Button
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 border-green-200"
                  onClick={() => handleRating(true)}
                >
                  <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
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
