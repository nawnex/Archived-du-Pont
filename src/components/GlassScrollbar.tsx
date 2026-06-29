import React, { useEffect, useState, useRef } from "react";

export default function GlassScrollbar() {
  const [scrollY, setScrollY] = useState(0);
  const [scrollHeight, setScrollHeight] = useState(0);
  const [clientHeight, setClientHeight] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragStartY = useRef(0);
  const dragStartScrollTop = useRef(0);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Measure page sizes and track scroll position
  const updateMetrics = () => {
    setScrollY(window.scrollY);
    setScrollHeight(document.documentElement.scrollHeight);
    setClientHeight(document.documentElement.clientHeight);
  };

  useEffect(() => {
    updateMetrics();

    const handleScroll = () => {
      setScrollY(window.scrollY);
      
      // Temporarily flash scrollbar visible during scroll
      setIsVisible(true);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
      hideTimeoutRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 1000);
    };

    const handleResize = () => {
      updateMetrics();
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    let animationFrameId: number;
    // Use a ResizeObserver to watch for content size changes (e.g., dynamic loading of image content)
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        updateMetrics();
      });
    });
    observer.observe(document.body);

    // Initial brief flash
    setIsVisible(true);
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 1000);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      observer.disconnect();
      cancelAnimationFrame(animationFrameId);
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  const totalScrollableHeight = scrollHeight - clientHeight;
  
  // Track settings (flush against top and bottom edges)
  const trackPadding = 0; 
  const trackHeight = clientHeight;

  // Proportional thumb height (exactly matches native browser ratio, with a healthy 60px minimum)
  const idealThumbHeight = (clientHeight / scrollHeight) * trackHeight;
  const thumbHeight = Math.max(60, Math.min(idealThumbHeight, trackHeight));

  const maxThumbTravel = trackHeight - thumbHeight;
  const scrollRatio = Math.min(Math.max(scrollY / totalScrollableHeight, 0), 1);
  const thumbTop = scrollRatio * maxThumbTravel;

  // Track interaction handlers
  const handleTrackClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickYInTrack = e.clientY - rect.top;
    
    // Position target scroll center around the clicked point
    const targetThumbTop = clickYInTrack - (thumbHeight / 2);
    const targetScrollPercent = Math.min(Math.max(targetThumbTop / maxThumbTravel, 0), 1);
    const targetScrollTop = targetScrollPercent * totalScrollableHeight;

    window.scrollTo({
      top: targetScrollTop,
      behavior: "smooth"
    });
  };

  // Drag handlers
  const handleThumbMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStartY.current = e.clientY;
    dragStartScrollTop.current = window.scrollY;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "grabbing";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = e.clientY - dragStartY.current;
      
      // Scale mouse displacement to pixel scroll amount
      const pxPerScrollRatio = totalScrollableHeight / maxThumbTravel;
      const targetScrollTop = dragStartScrollTop.current + (deltaY * pxPerScrollRatio);

      // Scroll instantly without transition to ensure pixel-perfect cursor tracking
      window.scrollTo({
        top: Math.min(Math.max(targetScrollTop, 0), totalScrollableHeight),
        behavior: "auto" as any
      });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
      }
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, totalScrollableHeight, maxThumbTravel]);

  // Combined visibility state (show always if hovered, dragging, or scrolling recently)
  const activeVisibility = isVisible || isHovered || isDragging;

  // Do not render if the page has no scrollable content
  if (totalScrollableHeight <= 0) return null;

  return (
    <div
      ref={trackRef}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleTrackClick}
      style={{
        top: `${trackPadding}px`,
        bottom: `${trackPadding}px`,
        height: `${trackHeight}px`,
      }}
      className={`fixed right-[4px] w-[5px] z-[99999] hidden md:block cursor-pointer select-none transition-opacity duration-300 ease-out ${
        activeVisibility ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Liquid glass scroll thumb - solid translucent glass with backdrop-blur and no borders/lines */}
      <div
        onMouseDown={handleThumbMouseDown}
        onClick={(e) => e.stopPropagation()} // Prevent double clicks or click bubble triggering scroll jumps
        style={{
          height: `${thumbHeight}px`,
          transform: `translateY(${thumbTop}px)`,
        }}
        className={`absolute inset-x-0 rounded-full cursor-grab backdrop-blur-[4px] transition-colors duration-200 ${
          isDragging ? "cursor-grabbing bg-white/65" : "bg-white/30 hover:bg-white/50"
        }`}
      />
    </div>
  );
}
