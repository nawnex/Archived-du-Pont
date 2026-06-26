import React from "react";
import LiquidButton from "./LiquidButton";
import { Compass } from "lucide-react";

interface HeaderProps {
  currentView: "home" | "gallery";
  onViewChange: (view: "home" | "gallery") => void;
}

export default function Header({ currentView, onViewChange }: HeaderProps) {
  const titleRef = React.useRef<HTMLDivElement>(null);
  const lastScrollY = React.useRef(0);
  const scrollUpAccumulator = React.useRef(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    // Only apply the scroll-hide/show effect on the gallery view
    if (currentView !== "gallery") {
      setVisible(true);
      return;
    }

    const handleScroll = () => {
      // Check if we are on mobile or tablet/iPad size (< 1024px)
      if (window.innerWidth >= 1024) {
        setVisible(true);
        return;
      }

      const currentScrollY = window.scrollY;
      const diff = currentScrollY - lastScrollY.current;

      if (currentScrollY <= 50) {
        // Always visible near top of page
        setVisible(true);
        scrollUpAccumulator.current = 0;
      } else {
        if (diff > 0) {
          // Scrolling down
          setVisible(false);
          scrollUpAccumulator.current = 0;
        } else if (diff < 0) {
          // Scrolling up - accumulate scroll amount
          scrollUpAccumulator.current += Math.abs(diff);
          if (scrollUpAccumulator.current > 15) {
            setVisible(true);
          }
        }
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [currentView]);

  const handleLogoClick = () => {
    if (currentView !== "home") {
      onViewChange("home");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const title = titleRef.current;
    if (!title) return;
    const rect = title.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    title.style.setProperty("--mouse-x", `${x}px`);
    title.style.setProperty("--mouse-y", `${y}px`);
  };

  const handlePointerEnter = () => {
    const title = titleRef.current;
    if (!title) return;
    title.style.setProperty("--pointer-active", "1");
  };

  const handlePointerLeave = () => {
    const title = titleRef.current;
    if (!title) return;
    title.style.setProperty("--pointer-active", "0");
  };

  return (
    <header className={`${
      currentView === "home" 
        ? "fixed top-0 left-0 w-full bg-[#103E8B]/15 backdrop-blur-xl md:backdrop-blur-2xl border-b border-white/10 border-t border-white/10 py-4 md:py-6" 
        : "fixed top-0 left-0 w-full bg-[#0d2a5f]/25 backdrop-blur-xl md:backdrop-blur-2xl border-b border-white/15 border-t border-white/10 py-4 md:py-5"
    } z-50 px-6 md:px-12 flex justify-between items-center select-none shadow-[0_10px_30px_rgba(0,0,0,0.15)] overflow-hidden transform transition-all duration-200 ease-out ${
      visible ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none !duration-1000 !ease-in-out"
    }`}>
      
      {/* Liquid Glass Highlight Reflective Sheen Sweep */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
        {/* Curved upper glossy glass edge */}
        <div className="absolute top-0 inset-x-0 h-[45%] bg-gradient-to-b from-white/12 via-white/4 to-transparent" />
        {/* Dynamic Refraction Wave Shimmer Flare */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-sky-300/10 to-transparent -skew-x-25 -translate-x-[100%] animate-[shimmer_8s_infinite_linear]" />
        {/* Bottom edge inner shadow for volume and water-drop feel */}
        <div className="absolute bottom-0 inset-x-0 h-[2px] bg-sky-200/10 shadow-[inset_0_-1px_0_rgba(255,255,255,0.1)]" />
      </div>

      {/* Logo Title (Aesthetic Ghibli Serif font with Hover Reflection Shimmer / Light Refraction) */}
      <div 
        ref={titleRef}
        onClick={handleLogoClick} 
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        className="relative flex items-center cursor-pointer group select-none py-1 overflow-hidden"
        style={{
          ["--pointer-active" as any]: "0",
          ["--mouse-x" as any]: "50%",
          ["--mouse-y" as any]: "50%"
        }}
      >
        <Compass className="w-5.5 h-5.5 mr-3 text-white/90 group-hover:text-[#93c5fd] group-hover:rotate-[360deg] transition-all duration-700 ease-out flex-shrink-0" />
        
        {/* Safe, non-shifting double-layer typography with CSS Grid */}
        <div className="inline-grid grid-cols-1 grid-rows-1 items-center pr-2">
          {/* Layer 1: Base State Text */}
          <span className="col-start-1 row-start-1 font-serif font-light tracking-widest text-[#f8fafc] text-lg md:text-2xl italic leading-none whitespace-nowrap transition-colors duration-300">
            Archives du Pont
          </span>
          
          {/* Layer 2: Soft Glass Overlay (Refraction shimmer) */}
          <span 
            className="col-start-1 row-start-1 font-serif font-light tracking-widest text-transparent bg-clip-text text-lg md:text-2xl italic leading-none whitespace-nowrap select-none pointer-events-none transition-opacity duration-300"
            style={{
              opacity: "var(--pointer-active, 0)",
              background: "radial-gradient(180px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.35) 0%, rgba(255, 255, 255, 0.08) 50%, transparent 100%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mixBlendMode: "overlay"
            }}
          >
            Archives du Pont
          </span>

          {/* Layer 3: High-Intensity Specular Light Refraction (Color-Dodge Glare) */}
          <span 
            className="col-start-1 row-start-1 font-serif font-light tracking-widest text-transparent bg-clip-text text-lg md:text-2xl italic leading-none whitespace-nowrap select-none pointer-events-none transition-opacity duration-300"
            style={{
              opacity: "var(--pointer-active, 0)",
              background: "radial-gradient(85px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255, 255, 255, 0.9) 0%, rgba(147, 197, 253, 0.5) 45%, transparent 80%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              WebkitTextFillColor: "transparent",
              mixBlendMode: "color-dodge"
            }}
          >
            Archives du Pont
          </span>
        </div>
      </div>

      {/* Right side Liquid Glass action button - Stays always "Gallery" */}
      <div>
        <LiquidButton
          onClick={() => onViewChange("gallery")}
          variant="primary"
          className={`shadow-md !py-2 md:!py-2.5 !px-4 md:!px-6 transition-all duration-300 ${
            currentView === "gallery" 
              ? "ring-1 ring-sky-300/40 text-sky-200 bg-[#103E8B]/40" 
              : ""
          }`}
        >
          Gallery
        </LiquidButton>
      </div>
    </header>
  );
}

