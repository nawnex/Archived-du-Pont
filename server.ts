import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import exifr from "exifr";
import imageYears from "./src/data/image-years.json";

const EXIF_YEAR_CACHE = new Map<string, number>();

// Concurrency Semaphore (limits active network EXIF fetches to 5 at a time)
let activeFetches = 0;
const fetchQueue: (() => void)[] = [];

function acquireSlot(): Promise<void> {
  const CONCURRENCY_LIMIT = 5;
  if (activeFetches < CONCURRENCY_LIMIT) {
    activeFetches++;
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    fetchQueue.push(resolve);
  });
}

function releaseSlot() {
  activeFetches--;
  if (fetchQueue.length > 0) {
    activeFetches++;
    const next = fetchQueue.shift();
    if (next) next();
  }
}

function extractYearFromFileName(fileName: string): number | null {
  // Try to match 8-digit date pattern: e.g. PXL_20250717_...
  const dateMatch = fileName.match(/(?:^|[^0-9])(201[5-9]|202[0-7])[0-1][0-9][0-3][0-9](?:[^0-9]|$)/);
  if (dateMatch) {
    return parseInt(dateMatch[1], 10);
  }

  // Try to match standalone 4-digit year: e.g. 2024 or 2025
  const yearMatch = fileName.match(/(?:^|[^0-9])(201[5-9]|202[0-7])(?:[^0-9]|$)/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }

  return null;
}

async function getYearForImage(id: string, fileName: string, allowNetworkFetch: boolean = true): Promise<number> {
  const cacheKey = `drive-${id}`;
  if (EXIF_YEAR_CACHE.has(cacheKey)) {
    return EXIF_YEAR_CACHE.get(cacheKey)!;
  }

  // 1. First priority: Try to extract year from the filename (super fast, 0ms, no network)
  const filenameYear = extractYearFromFileName(fileName);
  if (filenameYear !== null) {
    EXIF_YEAR_CACHE.set(cacheKey, filenameYear);
    return filenameYear;
  }

  // 2. Second priority: Try to use the pre-compiled EXIF year metadata cache (0ms, no network)
  const cachedYear = (imageYears as Record<string, number>)[cacheKey];
  if (cachedYear) {
    EXIF_YEAR_CACHE.set(cacheKey, cachedYear);
    return cachedYear;
  }

  // If network fetch is disabled, return 2025 fallback instantly
  if (!allowNetworkFetch) {
    return 2025;
  }

  // 3. Third priority: Parse EXIF data (DateTimeOriginal) from Google Drive (range request protected by semaphore)
  await acquireSlot();
  try {
    const url = `https://lh3.googleusercontent.com/d/${id}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(url, {
      headers: {
        "Range": "bytes=0-131071" // 128KB is ample for EXIF headers
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const parsed = await exifr.parse(Buffer.from(arrayBuffer), {
        pick: ['DateTimeOriginal', 'CreateDate', 'ModifyDate']
      });
      if (parsed) {
        const date = parsed.DateTimeOriginal || parsed.CreateDate || parsed.ModifyDate;
        if (date) {
          const dateObj = new Date(date);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            EXIF_YEAR_CACHE.set(cacheKey, year);
            return year;
          }
        }
      }
    }
  } catch (error) {
    // Suppress verbose logs to keep standard output neat and tidy
  } finally {
    releaseSlot();
  }

  // 4. Default Fallback
  const defaultYear = 2025;
  EXIF_YEAR_CACHE.set(cacheKey, defaultYear);
  return defaultYear;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Let the client fetch Google Drive public folder contents securely
  app.get("/api/gallery", async (req, res) => {
    try {
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || "1BpU4RP4-uhWX0u8bTMRrz-drNIajLQ2g";

      if (!folderId) {
        // Return empty files
        return res.json({ provider: "local", files: [] });
      }

      // Public Google Drive folder parser/scraper (No API key required)
      const embedUrl = `https://drive.google.com/embeddedfolderview?id=${folderId}`;
      const response = await fetch(embedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36",
        }
      });

      if (!response.ok) {
        console.warn(`Scraper failed to fetch public folderview webpage. Status: ${response.status}`);
        return res.json({ provider: "local", files: [] });
      }

      const html = await response.text();

      // Search for multidimensional array strings inside window.initApp script format: ["id","name",...]
      const itemsRegex = /\["([a-zA-Z0-9_-]{28,45})","([^"]+)"/g;
      const matchedFiles: Array<{ id: string; name: string }> = [];
      const seenIds = new Set<string>();

      let match;
      while ((match = itemsRegex.exec(html)) !== null) {
        const id = match[1];
        const name = match[2];

        if (!seenIds.has(id)) {
          const lowerName = name.toLowerCase();
          const isImg = /\.(jpg|jpeg|png|webp|gif|svg|heic|bmp)$/i.test(lowerName) || 
                        lowerName.endsWith(".jpg") || 
                        lowerName.endsWith(".png") ||
                        lowerName.endsWith(".jpeg") ||
                        lowerName.endsWith(".webp");
          
          if (isImg) {
            seenIds.add(id);
            matchedFiles.push({ id, name });
          }
        }
      }

      // Fallback: match /file/d/ID links if the array pattern didn't yield images directly
      if (matchedFiles.length === 0) {
        const fallbackRegex = /\/file\/d\/([a-zA-Z0-9_-]{28,45})/g;
        let fbMatch;
        while ((fbMatch = fallbackRegex.exec(html)) !== null) {
          const id = fbMatch[1];
          if (!seenIds.has(id)) {
            seenIds.add(id);
            matchedFiles.push({ id, name: `Skyward Image - ${id.slice(0, 6)}` });
          }
        }
      }

      if (matchedFiles.length > 0) {
        const recentOnly = req.query.recentOnly === "true";
        const excludeRecent = req.query.excludeRecent === "true";

        if (recentOnly) {
          // Resolve with network disabled to guarantee 0ms network overhead
          const driveImages = await Promise.all(
            matchedFiles.map(async (file) => {
              const year = await getYearForImage(file.id, file.name, false);
              return {
                id: `drive-${file.id}`,
                src: `https://lh3.googleusercontent.com/d/${file.id}`,
                alt: file.name,
                year: year,
              };
            })
          );

          // Find the maximum year in the collection
          const maxYear = driveImages.reduce((max, img) => img.year > max ? img.year : max, 2025);

          // Return only those matching the most recent year
          const recentImages = driveImages.filter(img => img.year === maxYear);
          return res.json({ provider: "drive", files: recentImages, maxYear });
        }

        if (excludeRecent) {
          // Resolve with network enabled to safely fetch and cache any remaining/newly-added EXIF in background
          const driveImages = await Promise.all(
            matchedFiles.map(async (file) => {
              const year = await getYearForImage(file.id, file.name, true);
              return {
                id: `drive-${file.id}`,
                src: `https://lh3.googleusercontent.com/d/${file.id}`,
                alt: file.name,
                year: year,
              };
            })
          );

          // Find the maximum year in the fast-resolved list to know which year was already loaded
          const fastYears = await Promise.all(
            matchedFiles.map((file) => getYearForImage(file.id, file.name, false))
          );
          const maxYear = fastYears.reduce((max, yr) => yr > max ? yr : max, 2025);

          const remainingImages = driveImages.filter(img => img.year !== maxYear);
          return res.json({ provider: "drive", files: remainingImages });
        }

        // Fallback: Fetch/resolve year for all images in parallel
        const driveImages = await Promise.all(
          matchedFiles.map(async (file) => {
            const year = await getYearForImage(file.id, file.name, true);
            return {
              id: `drive-${file.id}`,
              src: `https://lh3.googleusercontent.com/d/${file.id}`,
              alt: file.name,
              year: year,
            };
          })
        );
        return res.json({ provider: "drive", files: driveImages });
      }

      return res.json({ provider: "local", files: [] });
    } catch (error) {
      console.error("Failed to fetch from Google Drive folder parent:", error);
      return res.json({ provider: "local", files: [], error: "SERVER_ERROR" });
    }
  });

  // Vite middleware for development or serving assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
