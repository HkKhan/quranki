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

// Create a skeleton loading component for faster rendering
function ReviewPageSkeleton() {
  return (
    <div className="container pb-12 pt-4">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader className="space-y-1">
          <div className="flex justify-between items-center">
            <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
            <div className="h-6 w-20 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="h-4 w-64 bg-muted animate-pulse rounded"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="h-20 bg-muted animate-pulse rounded"></div>
            <div className="h-10 bg-muted animate-pulse rounded"></div>
            <div className="h-12 w-36 mx-auto bg-primary/20 animate-pulse rounded"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
function ReviewPageContent({ onDataReady }: { onDataReady: () => void }) {
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
  const [isInitialRender, setIsInitialRender] = useState(true);
  // New state to store preloaded next ayahs data
  const [preloadedAyahsData, setPreloadedAyahsData] = useState<
    Record<
      number,
      {
        prevAyahs: QuranAyah[];
        nextAyahs: QuranAyah[];
      }
    >
  >({});

  // Get parameters from search params
  const juzParam = searchParams.get("juz")
    ? Number(searchParams.get("juz"))
    : 30;
  const ayahsAfterParam = searchParams.get("ayahsAfter")
    ? Number(searchParams.get("ayahsAfter"))
    : 2;

  // Check session storage for any previously preloaded data on component mount
  useEffect(() => {
    try {
      const storedPreloadedData = sessionStorage.getItem(
        "preloaded-ayahs-data"
      );
      if (storedPreloadedData) {
        const parsedData = JSON.parse(storedPreloadedData);
        setPreloadedAyahsData(parsedData);
      }
    } catch (e) {
      console.error("Error loading preloaded data from session storage:", e);
    }
  }, []);

  // Clear session storage cache when settings change
  const clearPreloadedCache = () => {
    try {
      // Clear preloaded ayahs data
      sessionStorage.removeItem("preloaded-ayahs-data");
      setPreloadedAyahsData({});
      
      // Clear all review cache entries
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith("review-cache-") || 
            key.startsWith("prev-cache-") || 
            key.startsWith("next-cache-")) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error("Error clearing preloaded cache:", e);
    }
  };

  useEffect(() => {
    // Skip auth check for guest mode
    if (!isGuestMode && status === "unauthenticated") {
      router.push("/login");
    }

    // Mark that initial render is complete
    setIsInitialRender(false);
  }, [status, router, isGuestMode]);

  // Load settings and review data in parallel
  useEffect(() => {
    const initializeReview = async () => {
      // Skip if not authenticated or guest mode
      if (
        status === "loading" ||
        (status === "unauthenticated" && !isGuestMode)
      ) {
        return;
      }

      try {
        // Clear any preloaded cache when initializing with new settings
        clearPreloadedCache();
        
        // For guest users, set up guest settings without API call
        if (isGuestMode) {
          const guestSettings = {
            selectedJuzaa: [juzParam],
            selectedSurahs: [] as number[],
            selectionType: "juzaa" as "juzaa" | "surah",
            ayahsBefore: 2,
            ayahsAfter: ayahsAfterParam,
            promptsPerSession: 20,
          };

          setSettings(guestSettings);
          setIsSettingsLoading(false);

          // Load ayahs immediately for guest users
          loadAyahsWithSettings(guestSettings);
          return;
        }

        // For authenticated users, fetch settings
        const settingsResponse = await fetch("/api/settings", {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        });

        if (!settingsResponse.ok) {
          throw new Error("Failed to load settings");
        }

        const data = await settingsResponse.json();

        if (
          data.settings &&
          ((data.settings.selectionType === "juzaa" &&
            data.settings.selectedJuzaa?.length > 0) ||
            (data.settings.selectionType === "surah" &&
              data.settings.selectedSurahs?.length > 0))
        ) {
          setSettings(data.settings);
          setIsSettingsLoading(false);

          // Load ayahs immediately with the fetched settings
          loadAyahsWithSettings(data.settings);
        } else {
          console.warn("No settings found");
          setError("Please configure your review settings to start reviewing");
          setReviewStatus("error");
          setIsSettingsLoading(false);
        }
      } catch (error) {
        console.error("Error initializing review:", error);
        setError("Failed to load settings");
        setReviewStatus("error");
        setIsSettingsLoading(false);
      } finally {
        setSettingsAttempted(true);
      }
    };

    initializeReview();
  }, [session?.user?.id, status, isGuestMode, juzParam, ayahsAfterParam]);

  // Function to load ayahs with given settings
  const loadAyahsWithSettings = async (settings: any) => {
    if (!settings) {
      console.warn("No settings available, cannot load ayahs");
      return;
    }

    setIsLoading(true);
    setReviewStatus("loading");

    // Clear any stale preloaded data when loading new ayahs
    clearPreloadedCache();

    try {
      // Prepare the base URL for the API request
      let apiUrl = "";

      if (settings.selectionType === "juzaa") {
        const juzParam = settings.selectedJuzaa.join(",");
        apiUrl = `/api/quran?action=review&juz=${juzParam}&count=${
          settings.promptsPerSession || 20
        }${isGuestMode ? "&guest=true" : ""}`;
      } else {
        const surahParam = settings.selectedSurahs.join(",");
        apiUrl = `/api/quran?action=reviewBySurah&surah=${surahParam}&count=${
          settings.promptsPerSession || 20
        }${isGuestMode ? "&guest=true" : ""}`;
      }

      // Check for preloaded data first
      const cachedResponse = sessionStorage.getItem(`review-cache-${apiUrl}`);
      let data;

      if (cachedResponse) {
        try {
          data = JSON.parse(cachedResponse);
          // Process the preloaded data immediately
          processAyahData(data);

          // Fetch fresh data in the background for next time
          fetch(apiUrl, {
            headers: {
              "Cache-Control": "no-cache, no-store, must-revalidate",
              Pragma: "no-cache",
              Expires: "0",
            },
          })
            .then((response) => response.json())
            .then((freshData) => {
              if (freshData.success && freshData.ayahs) {
                sessionStorage.setItem(
                  `review-cache-${apiUrl}`,
                  JSON.stringify(freshData)
                );
              }
            })
            .catch((error) => {
              console.error("Error fetching fresh data:", error);
            });

          return; // Exit early since we've already processed the preloaded data
        } catch (e) {
          console.error("Error parsing cached response:", e);
          // Continue to fetch fresh data if cache parsing fails
        }
      }

      // If no valid cache exists, fetch fresh data
      const response = await fetch(apiUrl, {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });

      data = await response.json();

      if (data.success && data.ayahs) {
        sessionStorage.setItem(`review-cache-${apiUrl}`, JSON.stringify(data));
        processAyahData(data);
      } else {
        throw new Error("Failed to load Quran data");
      }
    } catch (error) {
      console.error("Error loading ayahs:", error);
      setError("Failed to load Quran data. Please try again.");
      setReviewStatus("error");
      setIsLoading(false);
    }
  };

  // Process ayah data from response
  const processAyahData = (data: any) => {
    if (!data.success || !data.ayahs || data.ayahs.length === 0) {
      setError(
        "Failed to load Quran data. Please check your settings and try again."
      );
      setReviewStatus("error");
      setIsLoading(false);
      return;
    }

    // Group ayahs by surah and ensure sequential ordering within each surah
    const groupedAyahs: Record<number, QuranAyah[]> = {};
    
    // First, group all ayahs by surah
    for (const ayah of data.ayahs) {
      if (!groupedAyahs[ayah.surah_no]) {
        groupedAyahs[ayah.surah_no] = [];
      }
      groupedAyahs[ayah.surah_no].push(ayah);
    }
    
    // Sort ayahs within each surah by ayah number
    for (const surahNo in groupedAyahs) {
      groupedAyahs[surahNo].sort((a, b) => a.ayah_no_surah - b.ayah_no_surah);
    }
    
    // Flatten the groups back into a single array while maintaining the grouping by surah
    const organizedAyahs: QuranAyah[] = [];
    for (const surahNo in groupedAyahs) {
      organizedAyahs.push(...groupedAyahs[surahNo]);
    }

    // Set the organized ayahs in state
    setAyahs(organizedAyahs);
    setReviewAyahs(organizedAyahs);

    // Immediately load first ayah
    if (organizedAyahs && organizedAyahs.length > 0) {
      setReviewStatus("question");
      const firstAyah = organizedAyahs[0];

      // Load next ayahs for the first question immediately
      if (settings?.ayahsAfter && settings.ayahsAfter > 0) {
        loadNextAyahsWithCaching(firstAyah);
      } else {
        setNextAyahs([]);
      }

      // Start preloading data for subsequent ayahs
      if (organizedAyahs.length > 1) {
        preloadNextAyahsData(organizedAyahs, 0);
      }
    }

    setIsLoading(false);
    onDataReady(); // Signal that data is ready
  };

  // Function to preload next ayahs data for upcoming questions
  const preloadNextAyahsData = async (
    ayahs: QuranAyah[],
    currentIndex: number
  ) => {
    if (!settings) return;

    // Preload for the next 2 ayahs (or as many as available)
    const preloadCount = 2;
    const preloadPromises = [];

    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentIndex + i;

      // Skip if we're already at the end or if we've already preloaded this ayah
      if (nextIndex >= ayahs.length || preloadedAyahsData[nextIndex]) {
        continue;
      }

      const ayahToPreload = ayahs[nextIndex];

      // Create a function that fetches the data but doesn't update the UI state
      const preloadPromise = async () => {
        try {
          const prevNextData = await fetchPrevNextAyahs(ayahToPreload);

          // Store preloaded data in state for later use
          setPreloadedAyahsData((prev) => {
            const updatedData = {
              ...prev,
              [nextIndex]: prevNextData,
            };

            // Store updated preloaded data in session storage for persistence
            try {
              sessionStorage.setItem(
                "preloaded-ayahs-data",
                JSON.stringify(updatedData)
              );
            } catch (e) {
              console.error(
                "Error storing preloaded data in session storage:",
                e
              );
            }

            return updatedData;
          });
        } catch (error) {
          console.error(
            `Error preloading data for ayah index ${nextIndex}:`,
            error
          );
        }
      };

      preloadPromises.push(preloadPromise());
    }

    // Run all preload promises in parallel
    await Promise.allSettled(preloadPromises);
  };

  // Function to fetch both prev and next ayahs for a given ayah
  const fetchPrevNextAyahs = async (ayah: QuranAyah) => {
    if (!settings) {
      return { prevAyahs: [], nextAyahs: [] };
    }

    // Define the cache keys
    const prevCacheKey = `prev-cache-${ayah.surah_no}-${ayah.ayah_no_surah}`;
    const nextCacheKey = `next-cache-${ayah.surah_no}-${ayah.ayah_no_surah}`;

    // Check for cached data first
    const cachedPrevData = sessionStorage.getItem(prevCacheKey);
    const cachedNextData = sessionStorage.getItem(nextCacheKey);

    // Set up promises array for parallel fetching
    const apiPromises = [];
    let prevAyahsResult: QuranAyah[] = [];
    let nextAyahsResult: QuranAyah[] = [];

    // Handle previous ayahs
    if (ayah.ayah_no_surah > 1 && !cachedPrevData) {
      const prevCount = settings.ayahsBefore || 2;
      const prevPromise = fetch(
        `/api/quran?action=prev&surah=${ayah.surah_no}&ayah=${
          ayah.ayah_no_surah
        }&count=${prevCount}${isGuestMode ? "&guest=true" : ""}`,
        {
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        }
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.ayahs) {
            // Cache the response
            sessionStorage.setItem(prevCacheKey, JSON.stringify(data));

            // Only include previous ayahs from the same surah
            prevAyahsResult = data.ayahs.filter(
              (a: QuranAyah) => a.surah_no === ayah.surah_no
            );
          }
        });
      apiPromises.push(prevPromise);
    } else if (cachedPrevData) {
      try {
        const data = JSON.parse(cachedPrevData);
        if (data.success && data.ayahs) {
          prevAyahsResult = data.ayahs.filter(
            (a: QuranAyah) => a.surah_no === ayah.surah_no
          );
        }
      } catch (e) {
        console.error("Error parsing cached prev ayahs:", e);
      }
    }

    // Handle next ayahs
    if (settings.ayahsAfter > 0 && !cachedNextData) {
      // Fetch surah info to avoid spanning across surahs
      const surahInfoPromise = fetch(
        `/api/quran?action=surahInfo&surah=${ayah.surah_no}`
      ).then((res) => res.json());
      apiPromises.push(surahInfoPromise);

      try {
        const surahInfoData = await surahInfoPromise;
        let requestCount = settings.ayahsAfter;

        if (surahInfoData.success && surahInfoData.surah) {
          const totalAyahs = surahInfoData.surah.total_ayahs;

          // Adjust count to avoid spanning across surahs
          if (ayah.ayah_no_surah + settings.ayahsAfter >= totalAyahs) {
            requestCount = Math.max(0, totalAyahs - ayah.ayah_no_surah - 1);

            if (requestCount <= 0) {
              return { prevAyahs: prevAyahsResult, nextAyahs: [] };
            }
          }
        }

        const nextResponse = await fetch(
          `/api/quran?action=next&surah=${ayah.surah_no}&ayah=${
            ayah.ayah_no_surah
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
          // Cache the response
          sessionStorage.setItem(nextCacheKey, JSON.stringify(nextData));
          // Only include next ayahs from the same surah
          nextAyahsResult = nextData.ayahs.filter(
            (a: QuranAyah) => a.surah_no === ayah.surah_no
          );
        }
      } catch (error) {
        console.error("Error loading next ayahs:", error);
      }
    } else if (cachedNextData) {
      try {
        const data = JSON.parse(cachedNextData);
        if (data.success && data.ayahs) {
          // Only include next ayahs from the same surah
          nextAyahsResult = data.ayahs.filter(
            (a: QuranAyah) => a.surah_no === ayah.surah_no
          );
        }
      } catch (e) {
        console.error("Error parsing cached next ayahs:", e);
      }
    }

    // Wait for all promises to complete
    await Promise.allSettled(apiPromises);

    return {
      prevAyahs: prevAyahsResult,
      nextAyahs: nextAyahsResult,
    };
  };

  // Improved function to load next ayahs with caching
  const loadNextAyahsWithCaching = async (currentAyah: QuranAyah) => {
    if (!settings) {
      console.warn("No settings available, cannot load next ayahs");
      return;
    }

    // Define the cache keys for prev and next ayahs
    const prevCacheKey = `prev-cache-${currentAyah.surah_no}-${currentAyah.ayah_no_surah}`;
    const nextCacheKey = `next-cache-${currentAyah.surah_no}-${currentAyah.ayah_no_surah}`;

    // Look for cached data
    const cachedPrevData = sessionStorage.getItem(prevCacheKey);
    const cachedNextData = sessionStorage.getItem(nextCacheKey);

    // Create an array of promises
    const apiPromises = [];

    // Load previous ayahs if needed (and not already cached)
    if (currentAyah.ayah_no_surah > 1 && !cachedPrevData) {
      const prevCount = settings.ayahsBefore || 2;
      const prevPromise = fetch(
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
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.ayahs) {
            // Cache the response
            sessionStorage.setItem(prevCacheKey, JSON.stringify(data));

            // Only include previous ayahs from the same surah
            const sameSurahPrevAyahs = data.ayahs.filter(
              (ayah: QuranAyah) => ayah.surah_no === currentAyah.surah_no
            );
            setPrevAyahs(sameSurahPrevAyahs);
          } else {
            setPrevAyahs([]);
          }
        });

      apiPromises.push(prevPromise);
    } else if (cachedPrevData) {
      // Use cached data for previous ayahs
      try {
        const data = JSON.parse(cachedPrevData);
        if (data.success && data.ayahs) {
          const sameSurahPrevAyahs = data.ayahs.filter(
            (ayah: QuranAyah) => ayah.surah_no === currentAyah.surah_no
          );
          setPrevAyahs(sameSurahPrevAyahs);
        }
      } catch (e) {
        console.error("Error parsing cached prev ayahs:", e);
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

    // Use cached next ayahs if available
    if (cachedNextData) {
      try {
        const data = JSON.parse(cachedNextData);
        if (data.success && data.ayahs) {
          // Filter to only include ayahs from the same surah
          const sameSurahNextAyahs = data.ayahs.filter(
            (ayah: QuranAyah) => ayah.surah_no === currentAyah.surah_no
          );
          setNextAyahs(sameSurahNextAyahs);
          return;
        }
      } catch (e) {
        console.error("Error parsing cached next ayahs:", e);
      }
    }

    // Fetch surah info and next ayahs in parallel
    const surahInfoPromise = fetch(
      `/api/quran?action=surahInfo&surah=${currentAyah.surah_no}`
    ).then((res) => res.json());

    apiPromises.push(surahInfoPromise);

    try {
      // Wait for all promises to resolve
      await Promise.all(apiPromises);

      // Process surah info response
      const surahInfoData = await surahInfoPromise;
      let surahInfo: { totalAyahs: number } | null = null;

      if (surahInfoData.success && surahInfoData.surah) {
        surahInfo = {
          totalAyahs: surahInfoData.surah.total_ayahs,
        };
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
        // Cache the next ayahs data
        sessionStorage.setItem(nextCacheKey, JSON.stringify(nextData));
        
        // Filter to only include ayahs from the same surah
        const sameSurahNextAyahs = nextData.ayahs.filter(
          (ayah: QuranAyah) => ayah.surah_no === currentAyah.surah_no
        );
        setNextAyahs(sameSurahNextAyahs);
      } else {
        setNextAyahs([]);
      }
    } catch (error) {
      console.error("Error loading next ayahs:", error);
      setNextAyahs([]);
    }
  };

  // Load next ayahs (legacy function for compatibility)
  const loadNextAyahs = async (currentAyah: QuranAyah) => {
    return loadNextAyahsWithCaching(currentAyah);
  };

  const handleShowAnswer = () => {
    setReviewStatus("answer");

    // When the user sees the answer, preload the next ayah's data
    // This ensures it's ready by the time they rate their performance
    if (currentAyahIndex + 1 < reviewAyahs.length) {
      preloadNextAyahsData(reviewAyahs, currentAyahIndex);
    }
  };

  const handleRating = async (remembered: boolean) => {
    // Skip spaced repetition updates for guest mode - only if not authenticated
    if (isGuestMode && status !== "authenticated") {
      // Just advance to the next question
      setReviewedCount(reviewedCount + 1);

      if (currentAyahIndex + 1 < reviewAyahs.length) {
        // Check if next ayah is from the same surah
        const currentAyah = reviewAyahs[currentAyahIndex];
        const nextIndex = currentAyahIndex + 1;
        const nextAyah = reviewAyahs[nextIndex];
        
        // Use preloaded data if available
        const preloadedData = preloadedAyahsData[nextIndex];

        if (preloadedData) {
          // Use preloaded data for instant transition
          setPrevAyahs(preloadedData.prevAyahs);
          setNextAyahs(preloadedData.nextAyahs);
        } else {
          // Fall back to traditional loading if preloaded data isn't available
          await loadNextAyahs(reviewAyahs[nextIndex]);
        }

        setCurrentAyahIndex(nextIndex);
        setShowArabic(false);
        setShowTranslation(false);
        setReviewStatus("question");

        // Preload the next set of data for future questions
        preloadNextAyahsData(reviewAyahs, nextIndex);
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

    // Update the review ayahs array with the updated ayah
    const updatedAyahs = [...reviewAyahs];
    updatedAyahs[currentAyahIndex] = updatedAyah;
    setReviewAyahs(updatedAyahs);

    // Increase reviewed count
    setReviewedCount(reviewedCount + 1);

    // Advance to the next ayah immediately, then do the API calls in the background
    if (currentAyahIndex + 1 < reviewAyahs.length) {
      const nextIndex = currentAyahIndex + 1;

      // Use preloaded data if available for instant transition
      const preloadedData = preloadedAyahsData[nextIndex];

      if (preloadedData) {
        // Use preloaded data (no waiting)
        setPrevAyahs(preloadedData.prevAyahs);
        setNextAyahs(preloadedData.nextAyahs);

        // Set up state for next ayah immediately
        setCurrentAyahIndex(nextIndex);
        setShowArabic(false);
        setShowTranslation(false);
        setReviewStatus("question");

        // Preload data for future questions in the background
        preloadNextAyahsData(reviewAyahs, nextIndex);

        // Execute API calls in the background without waiting
        Promise.allSettled(apiCalls);
      } else {
        // Fall back to traditional loading
        setCurrentAyahIndex(nextIndex);
        setShowArabic(false);
        setShowTranslation(false);
        setReviewStatus("question");

        // Load next ayahs and execute API calls in parallel
        Promise.all([loadNextAyahs(reviewAyahs[nextIndex]), ...apiCalls]).catch(
          (error) => {
            console.error("Error during ayah transition:", error);
          }
        );

        // Also try to preload future ayahs
        preloadNextAyahsData(reviewAyahs, nextIndex);
      }
    } else {
      setReviewStatus("complete");

      // Execute API calls in the background
      Promise.allSettled(apiCalls);
    }
  };

  const resetReview = () => {
    // Clear preloaded cache when resetting review
    clearPreloadedCache();
    loadAyahsWithSettings(settings);
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
            loadAyahsWithSettings(settings);
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
          <div>
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
                    When you're ready, click the button below to check your
                    answer
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
                          {currentAyah.surah_no} -{" "}
                          {currentAyah.surah_name_roman}{" "}
                          {currentAyah.ayah_no_surah}
                        </p>
                      </div>

                      {nextAyahs.map((ayah, index) => (
                        <div
                          key={index}
                          className="bg-background p-4 rounded-md"
                        >
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Default export that wraps the component with Suspense
export default function ReviewPage() {
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isDataReady, setIsDataReady] = useState(false);

  // Show skeleton immediately, then switch to full content
  useEffect(() => {
    // Only hide skeleton when both minimum time has passed AND data is ready
    const timer = setTimeout(() => {
      if (isDataReady) {
        setShowSkeleton(false);
      }
    }, 10);

    return () => clearTimeout(timer);
  }, [isDataReady]);

  return (
    <>
      {showSkeleton && <ReviewPageSkeleton />}
      <div className={showSkeleton ? "hidden" : ""}>
        <Suspense fallback={<ReviewPageLoading />}>
          <ReviewPageContent onDataReady={() => setIsDataReady(true)} />
        </Suspense>
      </div>
    </>
  );
}
