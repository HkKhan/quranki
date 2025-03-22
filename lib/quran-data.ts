import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import { prisma } from "@/lib/prisma";

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
  interval?: number;
  repetitions?: number;
  easeFactor?: number;
  dueDate?: number;
  lastReviewed?: number;
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
  count = 20,
  userId?: string
): Promise<QuranAyah[]> {
  const ayahs = await getAyahsByJuz(juzNumbers);
  
  if (!userId) {
    const shuffled = [...ayahs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  try {
    const srData = await prisma.spacedRepetitionData.findMany({
      where: {
        userId,
        selectionType: "juzaa",
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const now = new Date();
    
    const dueAyahs = srData
      .filter(item => new Date(item.dueDate) <= now)
      .map(item => {
        const ayah = ayahs.find(a => 
          a.surah_no === item.surahNo && 
          a.ayah_no_surah === item.ayahNoSurah
        );
        
        if (!ayah) return null;
        
        return {
          ...ayah,
          interval: item.interval,
          repetitions: item.repetitions,
          easeFactor: item.easeFactor,
          dueDate: item.dueDate.getTime(),
          lastReviewed: item.lastReviewed.getTime(),
        };
      })
      .filter(Boolean) as QuranAyah[];
    
    if (dueAyahs.length >= count) {
      return dueAyahs.slice(0, count);
    }
    
    const reviewedAyahKeys = new Set(
      srData.map(item => `${item.surahNo}:${item.ayahNoSurah}`)
    );
    
    const unreviewedAyahs = ayahs.filter(
      ayah => !reviewedAyahKeys.has(`${ayah.surah_no}:${ayah.ayah_no_surah}`)
    );
    
    const shuffledUnreviewed = [...unreviewedAyahs].sort(() => 0.5 - Math.random());
    
    const result = [
      ...dueAyahs,
      ...shuffledUnreviewed.slice(0, count - dueAyahs.length)
    ];
    
    return result.slice(0, count);
  } catch (error) {
    console.error("Error getting review ayahs:", error);
    const shuffled = [...ayahs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export async function getAllSurahs(): Promise<{ surah_no: number; surah_name_en: string; surah_name_ar: string; surah_name_roman: string }[]> {
  const data = await loadQuranData();
  
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
  
  return uniqueSurahs.sort((a, b) => a.surah_no - b.surah_no);
}

export async function getAyahsBySurah(
  surahNumbers: number[]
): Promise<QuranAyah[]> {
  const data = await loadQuranData();
  return data.filter((ayah) => surahNumbers.includes(ayah.surah_no));
}

export async function getReviewAyahsBySurah(
  surahNumbers: number[],
  count = 20,
  userId?: string
): Promise<QuranAyah[]> {
  const ayahs = await getAyahsBySurah(surahNumbers);
  
  if (!userId) {
    const shuffled = [...ayahs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  try {
    const srData = await prisma.spacedRepetitionData.findMany({
      where: {
        userId,
        selectionType: "surah",
      },
      orderBy: {
        dueDate: 'asc',
      },
    });

    const now = new Date();
    
    const dueAyahs = srData
      .filter(item => new Date(item.dueDate) <= now)
      .map(item => {
        const ayah = ayahs.find(a => 
          a.surah_no === item.surahNo && 
          a.ayah_no_surah === item.ayahNoSurah
        );
        
        if (!ayah) return null;
        
        return {
          ...ayah,
          interval: item.interval,
          repetitions: item.repetitions,
          easeFactor: item.easeFactor,
          dueDate: item.dueDate.getTime(),
          lastReviewed: item.lastReviewed.getTime(),
        };
      })
      .filter(Boolean) as QuranAyah[];
    
    if (dueAyahs.length >= count) {
      return dueAyahs.slice(0, count);
    }
    
    const reviewedAyahKeys = new Set(
      srData.map(item => `${item.surahNo}:${item.ayahNoSurah}`)
    );
    
    const unreviewedAyahs = ayahs.filter(
      ayah => !reviewedAyahKeys.has(`${ayah.surah_no}:${ayah.ayah_no_surah}`)
    );
    
    const shuffledUnreviewed = [...unreviewedAyahs].sort(() => 0.5 - Math.random());
    
    const result = [
      ...dueAyahs,
      ...shuffledUnreviewed.slice(0, count - dueAyahs.length)
    ];
    
    return result.slice(0, count);
  } catch (error) {
    console.error("Error getting review ayahs by surah:", error);
    const shuffled = [...ayahs].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

export async function getSurahAyahCount(surahNo: number): Promise<number> {
  const data = await loadQuranData();
  return data.filter(ayah => ayah.surah_no === surahNo).length;
}
