import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import exifr from "exifr";

const EXIF_YEAR_CACHE = new Map<string, number>();

async function getYearForImage(id: string, fileName: string): Promise<number> {
  const cacheKey = `drive-${id}`;
  if (EXIF_YEAR_CACHE.has(cacheKey)) {
    return EXIF_YEAR_CACHE.get(cacheKey)!;
  }

  // 1. Try to extract year from the filename (extremely fast & precise)
  const nameMatch = fileName.match(/\b(201[5-9]|202[0-7])\b/);
  if (nameMatch) {
    const year = parseInt(nameMatch[1], 10);
    EXIF_YEAR_CACHE.set(cacheKey, year);
    return year;
  }

  // 2. Try to extract from an 8-digit timestamp pattern in name (e.g. 20240501)
  const timestampMatch = fileName.match(/\b(201[5-9]|202[0-7])[0-1][0-9][0-3][0-9]\b/);
  if (timestampMatch) {
    const year = parseInt(timestampMatch[1], 10);
    EXIF_YEAR_CACHE.set(cacheKey, year);
    return year;
  }

  // 3. Parse EXIF data (DateTimeOriginal) from Google Drive (range request for performance)
  try {
    const url = `https://lh3.googleusercontent.com/d/${id}`;
    const response = await fetch(url, {
      headers: {
        "Range": "bytes=0-131071" // 128KB is usually enough for EXIF headers
      }
    });
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
    console.error(`Failed to fetch/parse EXIF for image ${id}:`, error);
  }

  // Fallback default
  const defaultYear = 2026;
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
        // Fetch/resolve year for all images in parallel
        const driveImages = await Promise.all(
          matchedFiles.map(async (file) => {
            const year = await getYearForImage(file.id, file.name);
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
