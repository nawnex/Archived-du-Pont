import React, { useEffect, useState } from "react";
import { galleryImages, GalleryImage } from "../data/galleryImages";
import imageYears from "../data/image-years.json";

function getYearFromImage(img: GalleryImage): number {
  // 1. Use the server-resolved accurate EXIF/filename year if available
  if (img.year !== undefined && img.year !== null) {
    return img.year;
  }

  // 2. Try to find an 8-digit date pattern containing a year (e.g. PXL_20250717_...)
  const timestampMatch = img.alt.match(/(?:^|[^0-9])(201[5-9]|202[0-7])[0-1][0-9][0-3][0-9](?:[^0-9]|$)/);
  if (timestampMatch) {
    return parseInt(timestampMatch[1], 10);
  }

  // Try to find a 4-digit year (e.g. 2015-2027)
  const yearMatch = img.alt.match(/(?:^|[^0-9])(201[5-9]|202[0-7])(?:[^0-9]|$)/);
  if (yearMatch) {
    return parseInt(yearMatch[1], 10);
  }

  // 3. Fallback to the pre-compiled EXIF year metadata cache
  const cachedYear = (imageYears as Record<string, number>)[img.id];
  if (cachedYear) {
    return cachedYear;
  }

  return 2025;
}

function getOptimizedImageUrl(src: string, width: number): string {
  if (src.includes("googleusercontent.com")) {
    const baseUrl = src.split("=")[0];
    return `${baseUrl}=w${width}`;
  }
  return src;
}

export default function DynamicGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [provider, setProvider] = useState<"local" | "drive">("local");
  const [columnCount, setColumnCount] = useState<number>(2);
  const [aspectRatios, setAspectRatios] = useState<Record<string, number>>({});

  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const fetchStartedRef = React.useRef<boolean>(false);

  useEffect(() => {
    const updateColumns = () => {
      const width = window.innerWidth;
      if (width >= 1280) { // xl
        setColumnCount(5);
      } else if (width >= 1024) { // lg
        setColumnCount(4);
      } else if (width >= 640) { // sm
        setColumnCount(3);
      } else {
        setColumnCount(2);
      }
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const handleImageLoad = (id: string, naturalWidth: number, naturalHeight: number) => {
    if (naturalWidth && naturalHeight) {
      const ratio = naturalHeight / naturalWidth;
      setAspectRatios((prev) => {
        if (prev[id] === ratio) return prev;
        return { ...prev, [id]: ratio };
      });
    }
  };

  useEffect(() => {
    let isActive = true;

    function shuffleArray<T>(array: T[]): T[] {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    async function fetchGallery() {
      try {
        // Step 1: Prioritise fetching the most recent year images (extremely fast, no network EXIF overhead)
        const res = await fetch("/api/gallery?recentOnly=true");
        if (!res.ok) {
          throw new Error("API request failed");
        }
        const data = await res.json();
        
        if (isActive) {
          if (data.files && data.files.length > 0) {
            setImages(shuffleArray(data.files));
            setProvider("drive");
          } else {
            // Fall back to pre-bundled local files if API returns empty list or isn't configured
            setImages(shuffleArray(galleryImages));
            setProvider("local");
            setHasMore(false);
          }
        }
      } catch (err) {
        console.warn("Could not fetch Google Drive images, falling back to local files:", err);
        if (isActive) {
          setImages(shuffleArray(galleryImages));
          setProvider("local");
          setHasMore(false);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    }

    fetchGallery();

    return () => {
      isActive = false;
    };
  }, []);

  // Function to trigger fetching remaining images (2025, 2024, etc.)
  const triggerFetchRemaining = React.useCallback(() => {
    if (fetchStartedRef.current || provider === "local") return;
    fetchStartedRef.current = true;
    setLoadingMore(true);

    function shuffleArray<T>(array: T[]): T[] {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    async function fetchRest() {
      try {
        const res = await fetch("/api/gallery?excludeRecent=true");
        if (!res.ok) throw new Error("API request failed");
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          setImages((prev) => [...prev, ...shuffleArray(data.files)]);
        }
      } catch (err) {
        console.warn("Could not fetch remaining Google Drive images:", err);
      } finally {
        setLoadingMore(false);
        setHasMore(false);
      }
    }

    fetchRest();
  }, [provider]);

  // Trigger when scroll sentinel becomes visible
  useEffect(() => {
    if (!hasMore || loadingMore || loading || provider === "local") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          triggerFetchRemaining();
        }
      },
      { rootMargin: "300px" } // Load early when user scrolls close to bottom
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
    };
  }, [hasMore, loadingMore, loading, provider, triggerFetchRemaining]);

  // Idle fallback to preload remaining images after a brief delay
  useEffect(() => {
    if (loading || provider === "local") return;

    const timeoutId = setTimeout(() => {
      triggerFetchRemaining();
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [loading, provider, triggerFetchRemaining]);

  // Group the already-randomized images by year
  const groupedImages: { [year: number]: GalleryImage[] } = {};
  images.forEach((img) => {
    const year = getYearFromImage(img);
    if (!groupedImages[year]) {
      groupedImages[year] = [];
    }
    groupedImages[year].push(img);
  });

  // Sort years in descending order (most recent first)
  const sortedYears = Object.keys(groupedImages)
    .map(Number)
    .sort((a, b) => b - a);

  // Flatten all images into a single continuous array sorted by year descending
  const allSortedImages: GalleryImage[] = [];
  const firstImageOfYear: Record<number, string> = {};

  sortedYears.forEach((year) => {
    const group = groupedImages[year];
    if (group && group.length > 0) {
      firstImageOfYear[year] = group[0].id;
      allSortedImages.push(...group);
    }
  });

  // Distribute images into balanced columns based on known aspect ratios
  const getBalancedColumns = (yearImages: GalleryImage[], numCols: number) => {
    const cols: GalleryImage[][] = Array.from({ length: numCols }, () => []);
    const colHeights = new Array(numCols).fill(0);

    yearImages.forEach((img) => {
      // Use loaded aspect ratio (height / width) or default to 1.33
      const ratio = aspectRatios[img.id] || 1.33;

      // Check if this image is the first image of any year
      const imgYear = getYearFromImage(img);
      const isFirstOfItsYear = firstImageOfYear[imgYear] === img.id;

      let targetColIndex = 0;

      if (isFirstOfItsYear) {
        // Force the first image of each year to go into Column 0 (leftmost column)
        targetColIndex = 0;
      } else {
        // Find the column with the minimum cumulative height
        let minColHeight = colHeights[0];
        for (let i = 1; i < numCols; i++) {
          if (colHeights[i] < minColHeight) {
            minColHeight = colHeights[i];
            targetColIndex = i;
          }
        }
      }

      cols[targetColIndex].push(img);
      colHeights[targetColIndex] += ratio;
    });

    return cols;
  };

  const columns = getBalancedColumns(allSortedImages, columnCount);

  return (
    <div className="w-full flex-grow bg-gradient-to-b from-[#0d2a5f] to-[#12489e] min-h-screen pt-[60px] md:pt-[72px] animate-[fadeIn_0.5s_ease-out] flex flex-col">
      {loading ? (
        <div className="flex-grow flex flex-col items-center justify-center py-20 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/80 animate-spin" />
          <span className="font-mono text-xs text-white/40 tracking-wider">LOADING ARCHIVE IMAGES...</span>
        </div>
      ) : (
        <div className="w-full flex flex-col pb-12 gap-0">
          {/* Seamless Edge-to-Edge Continuous Masonry Gallery */}
          <div 
            className="w-full flex flex-row items-start gap-0"
            id="seamless-gallery-grid-all"
          >
            {columns.map((colImages, colIndex) => {
              return (
                <div key={colIndex} className="flex-1 flex flex-col gap-0">
                  {colImages.map((img) => {
                    const imgYear = getYearFromImage(img);
                    const isFirst = firstImageOfYear[imgYear] === img.id;
                    return (
                      <div
                        key={img.id}
                        className="w-full relative"
                      >
                        {/* Liquid glass text-only title floating above the grid (4x larger) */}
                        {isFirst && (
                          <div className="absolute top-4 left-4 md:left-6 z-30 pointer-events-none whitespace-nowrap">
                            <span 
                              className="font-mono text-[100px] sm:text-[140px] md:text-[180px] lg:text-[200px] leading-none font-bold tracking-wider select-none text-transparent bg-clip-text filter drop-shadow-[0_8px_24px_rgba(0,0,0,0.75)]"
                              style={{
                                backgroundImage: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.25) 100%)",
                              }}
                            >
                              {imgYear}
                            </span>
                          </div>
                        )}
                        <div className="w-full overflow-hidden bg-sky-950/20">
                          {/* Dynamic Image with Native Lazy Loading and Aspect Preserved */}
                          <img
                            src={img.src.includes("googleusercontent.com") ? getOptimizedImageUrl(img.src, 400) : img.src}
                            srcSet={
                              img.src.includes("googleusercontent.com")
                                ? `${getOptimizedImageUrl(img.src, 256)} 256w, ${getOptimizedImageUrl(img.src, 400)} 400w, ${getOptimizedImageUrl(img.src, 600)} 600w, ${getOptimizedImageUrl(img.src, 800)} 800w`
                                : undefined
                            }
                            sizes={
                              img.src.includes("googleusercontent.com")
                                ? "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                                : undefined
                            }
                            alt={img.alt}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            onLoad={(e) => {
                              const imgEl = e.currentTarget;
                              handleImageLoad(img.id, imgEl.naturalWidth, imgEl.naturalHeight);
                            }}
                            className="w-full h-auto block select-none pointer-events-none hover:scale-[1.02] transition-transform duration-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          
          {/* Intersection sentinel to trigger loading remaining images on-demand */}
          {hasMore && (
            <div 
              ref={sentinelRef} 
              className="w-full flex flex-col items-center justify-center py-12 gap-3"
            >
              {loadingMore && (
                <>
                  <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
                  <span className="font-mono text-[10px] text-white/40 tracking-wider">LOADING ARCHIVE FOR PREVIOUS YEARS...</span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
