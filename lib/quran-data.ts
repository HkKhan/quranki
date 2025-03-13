import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

export interface QuranAyah {
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
}

let quranData: QuranAyah[] | null = null;

export async function loadQuranData(): Promise<QuranAyah[]> {
  if (quranData) return quranData;

  try {
    const filePath = path.join(process.cwd(), "public", "quran.csv");
    const fileContent = fs.readFileSync(filePath, "utf8");

    quranData = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      cast: (value, context) => {
        if (
          context.column === "surah_no" ||
          context.column === "ayah_no_surah" ||
          context.column === "ayah_no_quran" ||
          context.column === "ruko_no" ||
          context.column === "juz_no"
        ) {
          return Number.parseInt(value, 10);
        }
        return value;
      },
    });

    return quranData as QuranAyah[];
  } catch (error) {
    console.error("Error loading Quran data:", error);
    return [];
  }
}

export async function getAyahsByJuz(
  juzNumbers: number[]
): Promise<QuranAyah[]> {
  const data = await loadQuranData();
  return data.filter((ayah) => juzNumbers.includes(ayah.juz_no));
}

export async function getNextAyahs(
  surahNo: number,
  ayahNoSurah: number,
  count: number
): Promise<QuranAyah[]> {
  const data = await loadQuranData();

  // Find the current ayah index
  const currentIndex = data.findIndex(
    (ayah) => ayah.surah_no === surahNo && ayah.ayah_no_surah === ayahNoSurah
  );

  if (currentIndex === -1) return [];

  // Get the next 'count' ayahs
  const nextAyahs: QuranAyah[] = [];
  for (let i = 1; i <= count; i++) {
    if (currentIndex + i < data.length) {
      nextAyahs.push(data[currentIndex + i]);
    }
  }

  return nextAyahs;
}

export async function getPrevAyahs(
  surahNo: number,
  ayahNoSurah: number,
  count: number
): Promise<QuranAyah[]> {
  const data = await loadQuranData();

  // Find the current ayah index
  const currentIndex = data.findIndex(
    (ayah) => ayah.surah_no === surahNo && ayah.ayah_no_surah === ayahNoSurah
  );

  if (currentIndex === -1) return [];

  // Get the previous 'count' ayahs
  const prevAyahs: QuranAyah[] = [];
  for (let i = 1; i <= count; i++) {
    if (currentIndex - i >= 0) {
      // Insert at the beginning to maintain correct order (oldest first)
      prevAyahs.unshift(data[currentIndex - i]);
    }
  }

  return prevAyahs;
}

export async function getReviewAyahs(
  juzNumbers: number[],
  count = 20
): Promise<QuranAyah[]> {
  const ayahs = await getAyahsByJuz(juzNumbers);

  // In a real app, we would use a spaced repetition algorithm to select ayahs
  // For now, we'll just select random ayahs from the specified juzaa
  const shuffled = [...ayahs].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Get all unique surahs from the Quran data
export async function getAllSurahs(): Promise<{ surah_no: number; surah_name_en: string; surah_name_ar: string; surah_name_roman: string }[]> {
  const data = await loadQuranData();
  
  // Extract unique surahs using Set and map
  const uniqueSurahs = Array.from(
    new Set(data.map(ayah => ayah.surah_no))
  ).map(surahNo => {
    const ayah = data.find(a => a.surah_no === surahNo);
    return {
      surah_no: surahNo,
      surah_name_en: ayah?.surah_name_en || '',
      surah_name_ar: ayah?.surah_name_ar || '',
      surah_name_roman: ayah?.surah_name_roman || ''
    };
  });
  
  // Sort by surah number
  return uniqueSurahs.sort((a, b) => a.surah_no - b.surah_no);
}

// Get ayahs by surah numbers
export async function getAyahsBySurah(
  surahNumbers: number[]
): Promise<QuranAyah[]> {
  const data = await loadQuranData();
  return data.filter((ayah) => surahNumbers.includes(ayah.surah_no));
}

// Get ayahs for review by surah numbers
export async function getReviewAyahsBySurah(
  surahNumbers: number[],
  count = 20
): Promise<QuranAyah[]> {
  const ayahs = await getAyahsBySurah(surahNumbers);

  // Similar to juz review, randomly select ayahs for review
  const shuffled = [...ayahs].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

// Get the total number of ayahs in a surah
export async function getSurahAyahCount(surahNo: number): Promise<number> {
  const data = await loadQuranData();
  return data.filter(ayah => ayah.surah_no === surahNo).length;
}
