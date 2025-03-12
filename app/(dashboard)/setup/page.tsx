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
} from "lucide-react";

export default function SetupPage() {
  const router = useRouter();
  const [selectedJuzaa, setSelectedJuzaa] = useState<number[]>([]);
  const [ayahsAfter, setAyahsAfter] = useState(2);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
      setAyahsAfter(settings.ayahsAfter || 2);
    }

    // Verify that the Quran data is available
    verifyQuranData();
  }, []);

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

  const handleSelectAll = (start: number, end: number) => {
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

  const handleSave = async () => {
    if (selectedJuzaa.length === 0) {
      console.error("Selection Required");
      return;
    }

    setIsSaving(true);

    // Save settings to localStorage
    const settings = {
      selectedJuzaa,
      ayahsAfter,
    };
    localStorage.setItem("quranReviewSettings", JSON.stringify(settings));

    // Verify that we can load ayahs from the selected juzaa
    try {
      const response = await fetch(
        `/api/quran?action=juz&juz=${selectedJuzaa.join(",")}`
      );
      const data = await response.json();

      if (!data.success || !data.ayahs || data.ayahs.length === 0) {
        console.error("No Ayahs Found");
        setIsSaving(false);
        return;
      }

      // Navigate to dashboard on success
      router.push("/dashboard");
    } catch (error) {
      console.error("Error verifying selected juzaa:", error);
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
              Select Juzaa You Know
            </CardTitle>
            <CardDescription>
              Choose the juzaa you have memorized and want to review
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">
                  {selectedJuzaa.length} of 30 selected
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAll(1, 30)}
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
            </div>

            {selectedJuzaa.length === 0 && (
              <div className="flex items-center p-4 border border-yellow-200 bg-yellow-50 text-yellow-800 rounded-md dark:border-yellow-800 dark:bg-yellow-950/30 dark:text-yellow-200">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <p className="text-sm">
                  Please select at least one juzaa to continue.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ayahs After</CardTitle>
            <CardDescription>
              How many ayahs do you want to recall after seeing the prompt ayah?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ayahs to recall:</span>
                <span className="text-2xl font-bold text-primary">
                  {ayahsAfter}
                </span>
              </div>

              <Slider
                value={[ayahsAfter]}
                min={1}
                max={5}
                step={1}
                onValueChange={(value) => setAyahsAfter(value[0])}
                className="my-4"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>2</span>
                <span>3</span>
                <span>4</span>
                <span>5</span>
              </div>

              <div className="bg-muted p-4 rounded-md mt-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <span className="font-medium">Example:</span>
                </div>
                <p className="mt-2 text-sm">
                  If you select {ayahsAfter} ayah{ayahsAfter > 1 ? "s" : ""}{" "}
                  after, when shown the first ayah of Surah Al-Fatiha, you'll
                  need to recall the next {ayahsAfter} ayah
                  {ayahsAfter > 1 ? "s" : ""} from memory.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={selectedJuzaa.length === 0 || isSaving}
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
