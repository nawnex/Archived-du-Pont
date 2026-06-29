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

  // Expanded Image popup state
  const [expandedImage, setExpandedImage] = useState<GalleryImage | null>(null);
  // Auto-scrolling state
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(false);

  // Year-by-year lazy loading states
  const [loadedYears, setLoadedYears] = useState<number[]>([]);
  const [attemptedYears, setAttemptedYears] = useState<number[]>([]);
  const [currentScrolledYear, setCurrentScrolledYear] = useState<number | null>(null);
  const [loadingYears, setLoadingYears] = useState<Record<number, boolean>>({});
  const [emptyYearsInARow, setEmptyYearsInARow] = useState<number>(0);

  // Dispatch custom event when auto scrolling starts or stops
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("autoscrollchange", { detail: { active: isAutoScrolling } }));
  }, [isAutoScrolling]);

  // Unified Click History Queue for Double Tap vs Triple Tap differentiation
  const clickHistoryRef = React.useRef<{ time: number; image: GalleryImage | null }[]>([]);
  const tapTimeoutRef = React.useRef<any>(null);
  const expandedImageRef = React.useRef<GalleryImage | null>(null);
  const scrollDirectionRef = React.useRef<"down" | "up">("down");
  const autoScrollActiveRef = React.useRef<boolean>(false);
  const overlayRef = React.useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    expandedImageRef.current = expandedImage;
  }, [expandedImage]);

  // Global document tap listener to capture background/empty space taps
  useEffect(() => {
    const handleDocumentTap = (e: MouseEvent) => {
      if (expandedImageRef.current) return; // Ignore if modal is open

      const target = e.target as HTMLElement;
      const isImageClick = target.closest(".gallery-image-wrapper");
      if (!isImageClick) {
        registerTap(null);
      }
    };

    document.addEventListener("click", handleDocumentTap);
    return () => {
      document.removeEventListener("click", handleDocumentTap);
      if (tapTimeoutRef.current) {
        clearTimeout(tapTimeoutRef.current);
      }
    };
  }, []);

  const registerTap = (img: GalleryImage | null) => {
    if (expandedImageRef.current) return;

    const now = Date.now();
    // Filter out taps older than 500ms
    clickHistoryRef.current = clickHistoryRef.current.filter(item => now - item.time < 500);

    // Add current tap
    clickHistoryRef.current.push({ time: now, image: img });

    // Clear any pending evaluation timer
    if (tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
    }

    if (clickHistoryRef.current.length >= 3) {
      // Triple Tap detected! Toggle slow auto scrolling
      setIsAutoScrolling((prev) => !prev);
      clickHistoryRef.current = [];
      return;
    }

    // Set a small evaluation window to wait and see if a third tap occurs
    tapTimeoutRef.current = setTimeout(() => {
      const history = clickHistoryRef.current;
      if (history.length === 2) {
        // Double Tap detected! Check if both taps were on the same image
        const [first, second] = history;
        if (first.image && second.image && first.image.id === second.image.id) {
          setExpandedImage(first.image);
        }
      }
      clickHistoryRef.current = [];
    }, 280); // 280ms threshold is the sweet spot for double vs triple tap detection
  };

  const handleImageClick = (img: GalleryImage) => {
    registerTap(img);
  };

  // Disable body and document scroll when image popup is open
  useEffect(() => {
    if (expandedImage) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
    };
  }, [expandedImage]);

  // Prevent mobile Safari/iOS background touchmoves when image is expanded
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (expandedImage) {
        e.preventDefault();
      }
    };
    const overlay = overlayRef.current;
    if (overlay) {
      overlay.addEventListener("touchmove", handleTouchMove, { passive: false });
    }
    return () => {
      if (overlay) {
        overlay.removeEventListener("touchmove", handleTouchMove);
      }
    };
  }, [expandedImage]);

  // Cancel auto-scroll on manual scroll or any tap/click on screen
  useEffect(() => {
    if (!isAutoScrolling) return;

    const startTime = Date.now();

    const cancelScroll = (e: Event) => {
      // Ignore events within 800ms of activation to prevent Safari delayed taps (like tap-to-zoom analysis) from cancelling it
      if (Date.now() - startTime < 800) return;
      setIsAutoScrolling(false);
    };

    window.addEventListener("wheel", cancelScroll, { passive: true });
    window.addEventListener("touchmove", cancelScroll, { passive: true });
    window.addEventListener("keydown", cancelScroll, { passive: true });
    window.addEventListener("pointerdown", cancelScroll, { passive: true });

    return () => {
      window.removeEventListener("wheel", cancelScroll);
      window.removeEventListener("touchmove", cancelScroll);
      window.removeEventListener("keydown", cancelScroll);
      window.removeEventListener("pointerdown", cancelScroll);
    };
  }, [isAutoScrolling]);

  // Frame-by-frame extremely slow auto scroll loop
  useEffect(() => {
    autoScrollActiveRef.current = isAutoScrolling;
    if (!isAutoScrolling) return;

    let animationId: number;
    let lastTime = performance.now();
    const pixelsPerSecond = 26; // very slow scroll
    let preciseScrollY = window.scrollY;

    const scrollLoop = (time: number) => {
      if (!autoScrollActiveRef.current) return;

      const delta = (time - lastTime) / 1000;
      lastTime = time;

      const scrollAmount = pixelsPerSecond * delta;
      const currentScrollY = window.scrollY;

      // If the user manually scrolled, sync our precise position
      if (Math.abs(preciseScrollY - currentScrollY) > 2) {
        preciseScrollY = currentScrollY;
      }

      const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;

      if (scrollDirectionRef.current === "down") {
        preciseScrollY += scrollAmount;
        if (preciseScrollY >= maxScrollY - 1) {
          preciseScrollY = maxScrollY;
          window.scrollTo(0, maxScrollY);
          scrollDirectionRef.current = "up";
        } else {
          window.scrollTo(0, preciseScrollY);
        }
      } else {
        preciseScrollY -= scrollAmount;
        if (preciseScrollY <= 1) {
          preciseScrollY = 0;
          window.scrollTo(0, 0);
          scrollDirectionRef.current = "down";
        } else {
          window.scrollTo(0, preciseScrollY);
        }
      }

      animationId = requestAnimationFrame(scrollLoop);
    };

    animationId = requestAnimationFrame(scrollLoop);
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [isAutoScrolling]);

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
            if (data.maxYear) {
              const yearsInFiles = data.files.map((f: any) => f.year).filter(Boolean);
              const initialYears = Array.from(new Set([data.maxYear, ...yearsInFiles]));
              setLoadedYears(initialYears);
              setAttemptedYears(initialYears);
              setCurrentScrolledYear(data.maxYear);
            }
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

  // Effect to load the year BEFORE the currently scrolled year
  const loadNextYear = React.useCallback(() => {
    if (loading || loadingMore || provider === "local" || loadedYears.length === 0) return;

    // Find the minimum year currently attempted
    const minAttemptedYear = Math.min(...attemptedYears);
    
    // Stop if we have gone too far back (prior to 2015) or have hit too many empty years in a row
    if (minAttemptedYear < 2015 || emptyYearsInARow >= 3) {
      setHasMore(false);
      return;
    }

    const yearToLoad = minAttemptedYear - 1;

    if (attemptedYears.includes(yearToLoad) || loadingYears[yearToLoad]) {
      return;
    }

    setLoadingMore(true);
    setLoadingYears((prev) => ({ ...prev, [yearToLoad]: true }));
    setAttemptedYears((prev) => [...prev, yearToLoad]);

    function shuffleArray<T>(array: T[]): T[] {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    async function fetchYear() {
      try {
        const res = await fetch(`/api/gallery?year=${yearToLoad}`);
        if (!res.ok) throw new Error(`API failed for year ${yearToLoad}`);
        const data = await res.json();
        
        if (data.files && data.files.length > 0) {
          setImages((prev) => {
            const existingIds = new Set(prev.map(img => img.id));
            const newFiles = data.files.filter((f: GalleryImage) => !existingIds.has(f.id));
            return [...prev, ...shuffleArray(newFiles)];
          });
          setLoadedYears((prev) => [...prev, yearToLoad]);
          setEmptyYearsInARow(0); // Reset consecutive empty count on success
        } else {
          setEmptyYearsInARow((prev) => prev + 1);
        }
      } catch (err) {
        console.warn(`Could not fetch images for year ${yearToLoad}:`, err);
        setEmptyYearsInARow((prev) => prev + 1);
      } finally {
        setLoadingMore(false);
        setLoadingYears((prev) => ({ ...prev, [yearToLoad]: false }));
      }
    }

    fetchYear();
  }, [loading, loadingMore, provider, loadedYears, attemptedYears, loadingYears, emptyYearsInARow]);

  // Keep a stable ref of loadNextYear to avoid scroll listener re-registration
  const loadNextYearRef = React.useRef(loadNextYear);
  useEffect(() => {
    loadNextYearRef.current = loadNextYear;
  }, [loadNextYear]);

  // Scroll listener to:
  // 1. Detect which year the user is currently scrolling on
  // 2. Preload the next year if the user is past 70% of the active scrolled year
  useEffect(() => {
    if (loading || images.length === 0 || provider === "local") return;

    const handleScroll = () => {
      const items = document.querySelectorAll(".gallery-image-item");
      if (items.length === 0) return;

      // 1. Find the year closest to the viewport reference (e.g. 120px from top)
      let closestYear: number | null = null;
      let minDistance = Infinity;

      items.forEach((item) => {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(rect.top - 120); 
        if (distance < minDistance) {
          minDistance = distance;
          const yearAttr = item.getAttribute("data-year");
          if (yearAttr) {
            closestYear = parseInt(yearAttr, 10);
          }
        }
      });

      if (closestYear && closestYear !== currentScrolledYear) {
        setCurrentScrolledYear(closestYear);
      }

      // 2. Measure scroll percentage of the active scrolled year
      const activeYear = closestYear || currentScrolledYear;
      if (activeYear) {
        const yearItems = document.querySelectorAll(`.gallery-image-item[data-year="${activeYear}"]`);
        if (yearItems.length > 0) {
          let yearTop = Infinity;
          let yearBottom = -Infinity;

          yearItems.forEach((el) => {
            const rect = el.getBoundingClientRect();
            const absoluteTop = rect.top + window.scrollY;
            const absoluteBottom = rect.bottom + window.scrollY;
            if (absoluteTop < yearTop) yearTop = absoluteTop;
            if (absoluteBottom > yearBottom) yearBottom = absoluteBottom;
          });

          const yearHeight = yearBottom - yearTop;
          if (yearHeight > 0) {
            // How far down the viewport bottom is relative to the start of the year section
            const scrolledAmount = (window.scrollY + window.innerHeight) - yearTop;
            const percentage = scrolledAmount / yearHeight;

            // If the user has scrolled past 70% of the active year, start preloading the next one!
            if (percentage >= 0.70) {
              loadNextYearRef.current();
            }
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run once initially
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading, images.length, currentScrolledYear, provider]);

  // Trigger loading via IntersectionObserver sentinel (as fallback at the bottom of the page)
  useEffect(() => {
    if (!hasMore || loadingMore || loading || provider === "local") return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextYearRef.current();
        }
      },
      { rootMargin: "1500px" } // Load way before reaching the bottom
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
  }, [hasMore, loadingMore, loading, provider]);

  // Co-operative fallback: load when user scrolls onto the lowest loaded year
  useEffect(() => {
    if (loading || provider === "local" || !currentScrolledYear || loadedYears.length === 0) return;

    const minLoadedYear = Math.min(...loadedYears);
    if (currentScrolledYear === minLoadedYear) {
      loadNextYearRef.current();
    }
  }, [currentScrolledYear, loadedYears, loading, provider]);

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
    <div 
      className="w-full flex-grow bg-gradient-to-b from-[#0d2a5f] to-[#12489e] min-h-screen pt-[60px] md:pt-[72px] animate-[fadeIn_0.5s_ease-out] flex flex-col"
      onClick={() => {}} // Dummy click handler to force standard event bubbling on iOS Safari
    >
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
                        className="w-full relative gallery-image-item"
                        data-year={imgYear}
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
                        <div 
                          className="w-full overflow-hidden bg-sky-950/20 cursor-default gallery-image-wrapper"
                          onClick={() => handleImageClick(img)}
                        >
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
                            className="w-full h-auto block select-none pointer-events-auto cursor-default"
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

      {/* Expanded Image Modal Overlay (Triggered on Double Tap) */}
      {expandedImage && (
        <div 
          ref={overlayRef}
          id="image-expanded-popup-overlay"
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 select-none cursor-default animate-[fadeIn_0.2s_ease-out]"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-full max-h-full flex items-center justify-center">
            <img
              src={expandedImage.src.includes("googleusercontent.com") ? getOptimizedImageUrl(expandedImage.src, 1200) : expandedImage.src}
              alt={expandedImage.alt}
              className="max-w-full max-h-[92vh] object-contain rounded-lg shadow-[0_12px_40px_rgba(0,0,0,0.8)] border border-white/5 cursor-default transition-all duration-300"
              onClick={(e) => {
                // Clicking the image itself should NOT close the popup
                e.stopPropagation();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
