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
import { updateSpacedRepetition, getSpacedRepetitionData } from "@/lib/spaced-repetition-service";
import { getUserSettings, QuranSettings } from "@/lib/settings-service";

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
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [ayahs, setAyahs] = useState<any[]>([]);
  const [currentAyahIndex, setCurrentAyahIndex] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [showArabic, setShowArabic] = useState(false);
  const [reviewAyahs, setReviewAyahs] = useState<QuranAyah[]>([]);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("loading");
  const [reviewedCount, setReviewedCount] = useState(0);
  const [nextAyahs, setNextAyahs] = useState<QuranAyah[]>([]);
  const [prevAyahs, setPrevAyahs] = useState<QuranAyah[]>([]);
  const [settings, setSettings] = useState<QuranSettings>({
    selectedJuzaa: [30],
    selectedSurahs: [],
    selectionType: "juzaa",
    ayahsAfter: 2,
    promptsPerSession: 20,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load settings from the service
    async function loadSettings() {
      try {
        setIsLoading(true);
        const userSettings = await getUserSettings();
        console.log("Loaded user settings:", userSettings);
        setSettings(userSettings);
        setSettingsLoaded(true);
      } catch (error) {
        console.error("Error loading user settings:", error);
        setSettingsLoaded(true); // Still mark settings as loaded even on error
      }
    }
    
    loadSettings();
  }, []);

  // Only load ayahs after settings are loaded
  useEffect(() => {
    if (settingsLoaded) {
      loadAyahs();
    }
  }, [settingsLoaded]);

  const loadAyahs = async () => {
    setIsLoading(true);
    try {
      // Log settings being used
      console.log("Using settings for loadAyahs:", settings);
      
      let response;
      
      // Use the configured promptsPerSession or default to 20 if not set
      const count = settings.promptsPerSession || 20;
      
      if (settings.selectionType === "juzaa") {
        const juzParam = settings.selectedJuzaa.join(",");
        response = await fetch(
          `/api/quran?action=review&juz=${juzParam}&count=${count}`
        );
      } else {
        const surahParam = settings.selectedSurahs.join(",");
        response = await fetch(
          `/api/quran?action=reviewBySurah&surah=${surahParam}&count=${count}`
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

      // Load spaced repetition data for each ayah using our service
      const ayahsWithSRPromises = data.ayahs.map(async (ayah: QuranAyah) => {
        try {
          const srData = await getSpacedRepetitionData(ayah.surah_no, ayah.ayah_no_surah);
          return {
            ...ayah,
            interval: srData.interval,
            repetitions: srData.repetitions,
            easeFactor: srData.easeFactor,
            lastReviewed: srData.lastReviewed,
            dueDate: srData.dueDate,
          };
        } catch (e) {
          console.error("Error loading SR data for ayah:", e);
          // Return the original ayah if there's an error
          return ayah;
        }
      });

      const ayahsWithSR = await Promise.all(ayahsWithSRPromises);

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
      // First, load previous ayahs as context (always 2)
      const prevResponse = await fetch(
        `/api/quran?action=prev&surah=${currentAyah.surah_no}&ayah=${currentAyah.ayah_no_surah}&count=2`
      );
      const prevData = await prevResponse.json();
      
      if (prevData.success && prevData.ayahs) {
        setPrevAyahs(prevData.ayahs);
      } else {
        setPrevAyahs([]);
      }
      
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
      console.error("Error loading ayahs:", error);
      setPrevAyahs([]);
      setNextAyahs([]);
    }
  };

  const handleShowAnswer = () => {
    setReviewStatus("answer");
  };

  const handleRating = async (remembered: boolean) => {
    const currentAyah = reviewAyahs[currentAyahIndex];
    
    // Convert remembered boolean to quality rating
    // Type must be one of: "EASY" | "GOOD" | "HARD" | "AGAIN"
    const quality = remembered ? "GOOD" : "AGAIN";
    
    try {
      // Use the spaced repetition service to update the data
      // This will save to both database (if authenticated) and localStorage
      await updateSpacedRepetition(
        currentAyah.surah_no,
        currentAyah.ayah_no_surah,
        quality,
        settings.selectionType as "juzaa" | "surah"
      );
      
      // Update the UI
      setReviewedCount((prev) => prev + 1);
      
      if (currentAyahIndex < reviewAyahs.length - 1) {
        const nextIndex = currentAyahIndex + 1;
        setCurrentAyahIndex(nextIndex);
        loadNextAyahs(reviewAyahs[nextIndex]);
        setReviewStatus("question");
      } else {
        setReviewStatus("complete");
      }
    } catch (error) {
      console.error("Error updating spaced repetition data:", error);
      // Continue anyway since localStorage fallback should work
      setReviewedCount((prev) => prev + 1);
      
      if (currentAyahIndex < reviewAyahs.length - 1) {
        const nextIndex = currentAyahIndex + 1;
        setCurrentAyahIndex(nextIndex);
        loadNextAyahs(reviewAyahs[nextIndex]);
        setReviewStatus("question");
      } else {
        setReviewStatus("complete");
      }
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
                {prevAyahs.length > 0 && (
                  <div className="mb-6">
                    <p className="text-base text-muted-foreground text-center mb-3 font-bold">Context (Previous Ayahs)</p>
                    {prevAyahs.map((ayah, index) => (
                      <div key={index} className="mb-3 border-b pb-3 last:border-b-0 last:pb-0">
                        <p className="font-arabic text-center text-sm mb-1">
                          {ayah.ayah_ar}
                        </p>
                        <p className="text-center text-xs text-muted-foreground">
                          {ayah.ayah_en}
                        </p>
                        <p className="text-center text-xs text-muted-foreground mt-1 font-bold">
                          {ayah.surah_no} - {ayah.surah_name_roman} {ayah.ayah_no_surah}
                        </p>
                      </div>
                    ))}
                    <div className="border-t my-4"></div>
                  </div>
                )}
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
