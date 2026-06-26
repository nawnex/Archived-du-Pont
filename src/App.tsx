/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import AmbientPlayer from "./components/AmbientPlayer";
import DynamicGallery from "./components/DynamicGallery";
import CodeSection from "./components/CodeSection";
import CodePage from "./components/CodePage";

const seasideCat = "/src/assets/images/regenerated_image_1781779857605.webp";

export default function App() {
  const [currentView, setCurrentView] = useState<"home" | "gallery" | "code">("home");

  const handleViewChange = (view: "home" | "gallery" | "code") => {
    setCurrentView(view);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-[#103E8B] via-[#0d3475] to-[#12489e] overflow-x-hidden selection:bg-white/20 selection:text-white flex flex-col">
      {/* Floating Transparent Navigation Header */}
      <Header currentView={currentView === "code" ? "gallery" : currentView as "home" | "gallery"} onViewChange={handleViewChange} />

      {/* Journey (Home) view sections - kept alive in domestic DOM to keep synthesis/sound context active */}
      <div className={currentView === "home" ? "block" : "hidden"}>
        {/* Primary Landing Hero Scene (Section 1 - Journey) */}
        <div className="relative z-10 w-full animate-[fadeIn_0.5s_ease-out]">
          <HeroSection />
        </div>

        {/* Code Section (Section 1.5 - Interactive Hacker Globe & Staggered Code Work Title) */}
        <CodeSection onViewChange={handleViewChange} />

        {/* Section 2: Spectacular local Ghibli seaside cat image acting as a background with AmbientPlayer & SeasideNotes beautifully overlayed */}
        <section 
          id="coastline-scene"
          className="relative w-full max-w-[2560px] mx-auto z-10 overflow-hidden flex flex-col bg-[#0d3475] animate-[fadeIn_0.5s_ease-out]"
        >
          {/* Grid-based overlapping container: both raw image and cards occupy the same grid area so they render on top of each other dynamically, ensuring perfectly responsive layout without overlay height overflows */}
          <div className="grid grid-cols-1 grid-rows-1 relative w-full h-auto bg-[#0d3475]">
            <img 
              src={seasideCat} 
              alt="Ghibli Cat on Sea Road Background"
              className="col-start-1 row-start-1 w-full h-full min-h-[450px] object-cover block select-none pointer-events-none transition-opacity duration-500"
            />

            {/* Invisible scroll target anchor positioned precisely at 85% down from the top to scroll a precise amount relative to the cat image */}
            <div id="coastline-bottom-third" className="absolute top-[85%] left-0 w-full h-1 pointer-events-none" />

            {/* Solid color gradient overlay to smoothly feather and blend the image top border seamlessly with the hero section */}
            <div className="absolute inset-x-0 top-0 h-32 md:h-48 bg-gradient-to-b from-[#0d3475] via-[#0d3475]/60 to-transparent pointer-events-none z-10" />
            
            {/* Overlay content wrapper: completely transparent, overlayed directly over the cat background on all devices */}
            <div className="col-start-1 row-start-1 z-20 pointer-events-none flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 lg:pt-36 xl:pt-48 pb-12 sm:pb-16 md:pb-24">
              <div className="w-full max-w-xl mx-auto pointer-events-auto">
                <AmbientPlayer />
              </div>
            </div>
          </div>
        </section>
      </div>

      {currentView === "gallery" && (
        <DynamicGallery />
      )}

      {currentView === "code" && (
        <CodePage onViewChange={handleViewChange} />
      )}
    </div>
  );
}

