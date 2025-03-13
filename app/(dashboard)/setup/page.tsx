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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Save,
  Loader2,
  BadgeCheck,
  AlertTriangle,
  BookOpenCheck,
  BookText,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Interface for Surah type
interface SurahInfo {
  surah_no: number;
  surah_name_en: string;
  surah_name_ar: string;
  surah_name_roman: string;
}

export default function SetupPage() {
  const router = useRouter();
  const [selectedJuzaa, setSelectedJuzaa] = useState<number[]>([]);
  const [selectedSurahs, setSelectedSurahs] = useState<number[]>([]);
  const [ayahsAfter, setAyahsAfter] = useState(2);
  const [promptsPerSession, setPromptsPerSession] = useState(20);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [selectionType, setSelectionType] = useState<"juzaa" | "surah">("juzaa");
  const [allSurahs, setAllSurahs] = useState<SurahInfo[]>([]);
  const [surahGroups, setSurahGroups] = useState<{ name: string; surahList: SurahInfo[] }[]>([]);

  const juzGroups = [
    {
      name: "Juz 1-10",
      juzaaList: Array.from({ length: 10 }, (_, i) => i + 1),
    },
    {
      name: "Juz 11-20",
      juzaaList: Array.from({ length: 10 }, (_, i) => i + 11),
    },
    {
      name: "Juz 21-30",
      juzaaList: Array.from({ length: 10 }, (_, i) => i + 21),
    },
  ];

  useEffect(() => {
    // Load existing settings if available
    const savedSettings = localStorage.getItem("quranReviewSettings");
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setSelectedJuzaa(settings.selectedJuzaa || []);
      setSelectedSurahs(settings.selectedSurahs || []);
      setAyahsAfter(settings.ayahsAfter || 2);
      setPromptsPerSession(settings.promptsPerSession || 20);
      setSelectionType(settings.selectionType || "juzaa");
    }

    // Load all surahs
    loadSurahs();

    // Verify that the Quran data is available
    verifyQuranData();
  }, []);

  const loadSurahs = async () => {
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

  const verifyQuranData = async () => {
    setIsVerifying(true);
    try {
      const response = await fetch("/api/quran?action=load");
      const data = await response.json();

      if (!data.success) {
        console.error("Error verifying Quran data:", data.error);
      }
    } catch (error) {
      console.error("Error verifying Quran data:", error);
    } finally {
      setIsVerifying(false);
      setIsLoading(false);
    }
  };

  const toggleJuzaa = (juzaa: number) => {
    if (selectedJuzaa.includes(juzaa)) {
      setSelectedJuzaa(selectedJuzaa.filter((j) => j !== juzaa));
    } else {
      setSelectedJuzaa([...selectedJuzaa, juzaa]);
    }
  };

  const toggleSurah = (surahNo: number) => {
    if (selectedSurahs.includes(surahNo)) {
      setSelectedSurahs(selectedSurahs.filter((s) => s !== surahNo));
    } else {
      setSelectedSurahs([...selectedSurahs, surahNo]);
    }
  };

  const handleSelectAllJuzaa = (start: number, end: number) => {
    const allInRange = Array.from(
      { length: end - start + 1 },
      (_, i) => start + i
    );

    // If all in range are already selected, deselect all
    const allSelected = allInRange.every((juz) => selectedJuzaa.includes(juz));

    if (allSelected) {
      setSelectedJuzaa(
        selectedJuzaa.filter((juz) => !allInRange.includes(juz))
      );
    } else {
      // Add all juzaa that aren't already selected
      const newSelected = [...selectedJuzaa];
      allInRange.forEach((juz) => {
        if (!newSelected.includes(juz)) {
          newSelected.push(juz);
        }
      });
      setSelectedJuzaa(newSelected);
    }
  };

  const handleSelectAllSurahs = (surahs: SurahInfo[]) => {
    const surahNumbers = surahs.map(s => s.surah_no);
    
    // If all in range are already selected, deselect all
    const allSelected = surahNumbers.every(no => selectedSurahs.includes(no));

    if (allSelected) {
      setSelectedSurahs(
        selectedSurahs.filter(no => !surahNumbers.includes(no))
      );
    } else {
      // Add all surahs that aren't already selected
      const newSelected = [...selectedSurahs];
      surahNumbers.forEach(no => {
        if (!newSelected.includes(no)) {
          newSelected.push(no);
        }
      });
      setSelectedSurahs(newSelected);
    }
  };

  const handleSave = async () => {
    if ((selectionType === "juzaa" && selectedJuzaa.length === 0) || 
        (selectionType === "surah" && selectedSurahs.length === 0)) {
      console.error("Selection Required");
      return;
    }

    setIsSaving(true);

    // Save settings to localStorage
    const settings = {
      selectedJuzaa,
      selectedSurahs,
      selectionType,
      ayahsAfter,
      promptsPerSession,
    };
    localStorage.setItem("quranReviewSettings", JSON.stringify(settings));

    // Verify that we can load ayahs from the selected items
    try {
      let response;
      if (selectionType === "juzaa") {
        response = await fetch(
          `/api/quran?action=juz&juz=${selectedJuzaa.join(",")}`
        );
      } else {
        response = await fetch(
          `/api/quran?action=surah&surah=${selectedSurahs.join(",")}`
        );
      }
      
      const data = await response.json();

      if (!data.success || !data.ayahs || data.ayahs.length === 0) {
        console.error("No Ayahs Found");
        setIsSaving(false);
        return;
      }

      // Navigate to dashboard on success
      router.push("/dashboard");
    } catch (error) {
      console.error("Error verifying selection:", error);
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p>{isVerifying ? "Verifying Quran data..." : "Loading..."}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Setup</h1>
      <p className="text-muted-foreground mb-8">
        Configure your Quran review settings to personalize your experience.
      </p>

      <div className="grid gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpenCheck className="h-5 w-5 mr-2" />
              Select What to Review
            </CardTitle>
            <CardDescription>
              Choose juzaa or surahs you have memorized and want to review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Tabs 
              value={selectionType} 
              onValueChange={(v) => setSelectionType(v as "juzaa" | "surah")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="juzaa">By Juzaa</TabsTrigger>
                <TabsTrigger value="surah">By Surah</TabsTrigger>
              </TabsList>

              <TabsContent value="juzaa" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {selectedJuzaa.length} of 30 selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllJuzaa(1, 30)}
                  >
                    {selectedJuzaa.length === 30 ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((juzaa) => (
                    <div key={juzaa} className="flex items-center space-x-2">
                      <Checkbox
                        id={`juzaa-${juzaa}`}
                        checked={selectedJuzaa.includes(juzaa)}
                        onCheckedChange={() => toggleJuzaa(juzaa)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <Label
                        htmlFor={`juzaa-${juzaa}`}
                        className="text-sm cursor-pointer"
                      >
                        Juz {juzaa}
                      </Label>
                    </div>
                  ))}
                </div>
                
                {selectedJuzaa.length === 0 && (
                  <div className="flex items-center p-4 border border-yellow-200 bg-yellow-50 text-yellow-800 rounded-md dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <p className="text-sm">
                      Please select at least one juzaa to continue.
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="surah" className="space-y-4 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">
                    {selectedSurahs.length} of {allSurahs.length} selected
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectAllSurahs(allSurahs)}
                  >
                    {selectedSurahs.length === allSurahs.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                  {allSurahs.map((surah) => (
                    <div key={surah.surah_no} className="flex items-center space-x-2">
                      <Checkbox
                        id={`surah-${surah.surah_no}`}
                        checked={selectedSurahs.includes(surah.surah_no)}
                        onCheckedChange={() => toggleSurah(surah.surah_no)}
                        className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                      />
                      <Label
                        htmlFor={`surah-${surah.surah_no}`}
                        className="text-sm cursor-pointer"
                      >
                        {surah.surah_no} - Surah {surah.surah_name_roman}
                      </Label>
                    </div>
                  ))}
                </div>
                
                {selectedSurahs.length === 0 && (
                  <div className="flex items-center p-4 border border-yellow-200 bg-yellow-50 text-yellow-800 rounded-md dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
                    <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                    <p className="text-sm">
                      Please select at least one surah to continue.
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Context Settings
            </CardTitle>
            <CardDescription>
              Configure how much context is shown after each ayah
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="ayahs-after" className="text-sm font-medium">
                    Ayahs After
                  </Label>
                  <span>{ayahsAfter}</span>
                </div>
                <Slider
                  id="ayahs-after"
                  min={0}
                  max={10}
                  step={1}
                  value={[ayahsAfter]}
                  onValueChange={(value) => setAyahsAfter(value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0</span>
                  <span>2</span>
                  <span>4</span>
                  <span>6</span>
                  <span>8</span>
                  <span>10</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Number of ayahs to show after the current ayah during review.
                </p>
              </div>

              <Separator className="my-4" />

              <div>
                <div className="flex justify-between mb-2">
                  <Label htmlFor="prompts-per-session" className="text-sm font-medium">
                    Prompts Per Session
                  </Label>
                  <span>{promptsPerSession}</span>
                </div>
                <Slider
                  id="prompts-per-session"
                  min={1}
                  max={50}
                  step={1}
                  value={[promptsPerSession]}
                  onValueChange={(value) => setPromptsPerSession(value[0])}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span>10</span>
                  <span>20</span>
                  <span>30</span>
                  <span>40</span>
                  <span>50</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Number of review prompts to include in each review session (1-50 ayahs).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={(selectionType === "juzaa" && selectedJuzaa.length === 0) || 
                     (selectionType === "surah" && selectedSurahs.length === 0) || 
                     isSaving}
            className="flex items-center"
          >
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {isSaving ? "Saving..." : "Save Settings & Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
