import React, { useState } from "react";
import { ArrowRight, CloudLightning } from "lucide-react";
import LiquidButton from "./LiquidButton";
import { winterWords, springWords, summerWords, autumnWords } from "../data/seasonWords";

export default function HeroSection() {
  const getSeason = () => {
    const month = new Date().getMonth();
    // Dec, Jan, Feb -> Winter
    // Mar, Apr, May -> Spring
    // Jun, Jul, Aug -> Summer
    // Sep, Oct, Nov -> Autumn
    if (month === 11 || month === 0 || month === 1) return "Winter";
    if (month >= 2 && month <= 4) return "Spring";
    if (month >= 5 && month <= 7) return "Summer";
    return "Autumn";
  };

  const season = getSeason();

  const getPrefix = (s: string) => {
    switch (s) {
      case "Winter": return "Braving the";
      case "Spring": return "Walking into the";
      case "Summer": return "Chasing the";
      case "Autumn": return "Gathering the";
      default: return "Chasing the";
    }
  };

  const prefix = getPrefix(season);

  // Pick random word from the current season's list on load
  const [selectedWord] = useState(() => {
    let list: string[] = [];
    if (season === "Winter") list = winterWords;
    else if (season === "Spring") list = springWords;
    else if (season === "Summer") list = summerWords;
    else if (season === "Autumn") list = autumnWords;

    if (list && list.length > 0) {
      const randomIndex = Math.floor(Math.random() * list.length);
      return list[randomIndex];
    }
    return "fluffy";
  });

  const capitalizedWord = selectedWord.charAt(0).toUpperCase() + selectedWord.slice(1);

  const handleScrollToCoastline = () => {
    const el = document.getElementById("coastline-scene");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToCoastlineBottom = () => {
    // Dispatch custom event to trigger wave crashing sound playback in AmbientPlayer
    window.dispatchEvent(new CustomEvent("play-waves"));

    const el = document.getElementById("coastline-bottom-third");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  };

  return (
    <section 
      id="hero-scene" 
      className="relative min-h-screen py-32 px-6 md:px-12 xl:px-24 flex flex-col justify-center items-center overflow-hidden bg-gradient-to-b from-[#103E8B] to-[#0d3475] z-10"
    >
      {/* Background Image on Mobile (Skyward Looking) */}
      <div className="absolute inset-0 lg:hidden pointer-events-none z-0">
        <img 
          src="/src/assets/images/ghibli_hero_stairs_1781707636317.jpg" 
          alt="Skyward Looking Background" 
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover select-none pointer-events-none opacity-80"
        />
        {/* Soft elegant gradient overlay to maintain high text contrast on mobile */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#103E8B]/40 via-[#0d3475]/70 to-[#0d3475]" />
      </div>

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Column: Hand-drawn artistic headings & Poetic summary */}
        <div 
          className="lg:col-span-7 flex flex-col items-start gap-6 text-left relative z-25"
        >


          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl text-white font-light leading-tight tracking-tighter drop-shadow-lg">
            {prefix} <span className="italic font-light text-blue-100">{capitalizedWord}</span> <br />
            Wonders of <span className="underline decoration-white/25 decoration-wavy decoration-1 underline-offset-8">{season}</span>
          </h1>

          <p className="font-sans text-base md:text-lg text-white/90 leading-relaxed max-w-xl font-light tracking-wide">
            There's a quiet nostalgia that resides within the hand-painted skies of our dreams. A gentle breeze, some concrete stairs climbing skyward, and an endless blue horizon waiting to be discovered.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mt-4 w-full sm:w-auto">
            <LiquidButton 
              id="hero-primary-cta"
              onClick={handleScrollToCoastline} 
              variant="primary"
              className="px-8 py-3.5 text-sm uppercase tracking-widest font-light flex items-center gap-2 group"
            >
              Explore Sounds
              <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1.5 transition-transform duration-300" />
            </LiquidButton>
            
            <LiquidButton 
              id="hero-secondary-cta"
              onClick={handleScrollToCoastlineBottom}
              variant="secondary"
              className="px-8 py-3.5 text-sm uppercase tracking-widest font-light cursor-pointer"
            >
              Coastline View
            </LiquidButton>
          </div>
        </div>

        {/* Right Column: Beautiful Ghibli Guy On Stairs image - Visible on Desktop only */}
        <div 
          className="hidden lg:flex lg:col-span-5 justify-center items-center relative z-20"
        >
          {/* Glowing Aura Background */}
          <div className="absolute w-[80%] h-[80%] bg-blue-400/20 blur-[100px] rounded-full pointer-events-none -z-10" />

          {/* Ghibli Watercolor Textured Frame */}
          <div className="relative w-full max-w-[380px] sm:max-w-[420px] aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/25 bg-gradient-to-b from-[#103E8B] to-[#1e52ab] flex items-center justify-center p-3">
            
            {/* The Image Itself */}
            <div className="relative w-full h-full rounded-lg overflow-hidden group">
              <img 
                src="/src/assets/images/ghibli_hero_stairs_1781707636317.jpg" 
                alt="Studio Ghibli youth character on stairs gazing at towering clouds"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-10000 ease-linear scale-100 group-hover:scale-105"
              />

              {/* Edge/Ambient blending gradients */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#103E8B]/40 via-transparent to-transparent pointer-events-none" />
              <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-sky-950/20 to-transparent pointer-events-none" />
            </div>

            {/* Vintage Ghibli label overlay in Corner */}
            <div className="absolute bottom-6 right-6 font-mono text-[9px] uppercase tracking-wider text-white/70 bg-[#103E8B]/70 backdrop-blur-md px-2.5 py-1 rounded border border-white/10 select-none">
              Scene II: Skyward Looking
            </div>
          </div>
        </div>

      </div>

      {/* Horizontal Ground Line / Bottom Border of the Hero Section */}
      <div className="absolute bottom-0 left-0 w-full h-[1px] bg-white/10 z-20" />

      {/* Hand-drawn Character: Surfboard Cloud Dude standing on the bottom line */}
      <div 
        id="character-surfboard-cloud-dude"
        className="absolute bottom-0 right-[4%] sm:right-[8%] md:right-[12%] lg:right-[6%] xl:right-[10%] h-[70px] sm:h-[90px] md:h-[102px] lg:h-[115px] w-auto z-25 flex flex-col justify-end items-center pointer-events-none animate-[fadeIn_1s_ease-out]"
      >
        <img 
          src="/src/assets/images/regenerated_image_1782399725274.png" 
          alt="Surfboard Cloud Dude" 
          referrerPolicy="no-referrer"
          className="h-full w-auto object-contain select-none pointer-events-none"
        />
      </div>
    </section>
  );
}
