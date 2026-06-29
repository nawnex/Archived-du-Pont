import React, { useEffect, useRef, useState } from "react";
import { Terminal, Cpu, Brackets, Globe, ChevronRight, RefreshCw } from "lucide-react";
import LiquidButton from "./LiquidButton";

function GlitchText({ text }: { text: string }) {
  return (
    <>
      {text.split("").map((char, index) => {
        if (char === " ") {
          return <span key={index}> </span>;
        }
        const delay = (Math.random() * 1.5).toFixed(2);
        const duration = (1.4 + Math.random() * 0.8).toFixed(2);
        return (
          <span
            key={index}
            className="flicker-char inline-block"
            style={{
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          >
            {char}
          </span>
        );
      })}
    </>
  );
}

interface CodeSectionProps {
  onViewChange: (view: "home" | "gallery" | "code") => void;
}

export default function CodeSection({ onViewChange }: CodeSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const [animKey, setAnimKey] = useState(0); // For re-triggering the logo flicker
  const [hasIntersected, setHasIntersected] = useState(false);

  // Ref-based high performance rotation and momentum tracking
  const rotationRef = useRef({ x: 0.3, y: 0.5 });
  const velocityRef = useRef({ x: 0.0008, y: 0.0015 });
  const isDragging = useRef(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  // Handle re-trigger animation
  const handleReplayClick = () => {
    setAnimKey((prev) => prev + 1);
  };

  // IntersectionObserver to detect when the section enters the viewport
  useEffect(() => {
    const element = sectionRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasIntersected(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  // 3D Digital holographic wireframe globe drawing
  useEffect(() => {
    if (!hasIntersected) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = canvas.width;
    let height = canvas.height;

    // Set up points on sphere for digital grid nodes
    interface SpherePoint {
      x: number;
      y: number;
      z: number;
      pulsePhase: number;
    }

    let radius = 100;
    let center = { x: 100, y: 100 };
    let points: SpherePoint[] = [];
    const latLines = 8;
    const lonLines = 12;

    const generatePoints = (currentRadius: number) => {
      points = [];
      for (let i = 1; i < latLines; i++) {
        const phi = (Math.PI * i) / latLines;
        for (let j = 0; j < lonLines; j++) {
          const theta = (2 * Math.PI * j) / lonLines;
          points.push({
            x: currentRadius * Math.sin(phi) * Math.cos(theta),
            y: currentRadius * Math.cos(phi),
            z: currentRadius * Math.sin(phi) * Math.sin(theta),
            pulsePhase: Math.random() * Math.PI * 2,
          });
        }
      }
    };

    // Resize canvas to its wrapper
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (parent) {
        width = parent.clientWidth;
        height = parent.clientHeight || 350;
        canvas.width = width * window.devicePixelRatio;
        canvas.height = height * window.devicePixelRatio;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        // Perfectly recalculate geometry center and radius boundaries for exact responsive centering
        radius = Math.min(width, height) * 0.38;
        center = { x: width / 2, y: height / 2 };
        generatePoints(radius);
      }
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Outer orbiting cyber rings
    let orbitAngle = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Inertial animation rotation
      if (!isDragging.current) {
        rotationRef.current.y += velocityRef.current.y;
        rotationRef.current.x += velocityRef.current.x;
        // Keep velocities slowly drifting
        velocityRef.current.y *= 0.96;
        velocityRef.current.x *= 0.96;
        if (Math.abs(velocityRef.current.y) < 0.001) velocityRef.current.y = 0.0015;
        if (Math.abs(velocityRef.current.x) < 0.0005) velocityRef.current.x = 0.0008;
      }

      orbitAngle += 0.005;

      const cosX = Math.cos(rotationRef.current.x);
      const sinX = Math.sin(rotationRef.current.x);
      const cosY = Math.cos(rotationRef.current.y);
      const sinY = Math.sin(rotationRef.current.y);

      // Drawing function for projecting 3D points
      const project = (x: number, y: number, z: number) => {
        // Rotate Y axis
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotate X axis
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Perspective factor
        const focalLength = radius * 3;
        const scale = focalLength / (focalLength + z2);
        
        return {
          px: center.x + x1 * scale,
          py: center.y + y2 * scale,
          zDepth: z2,
          visible: z2 > -radius * 1.5,
          scale,
        };
      };

      // 1. Draw Globe latitude (horizontal parallels) lines
      ctx.lineWidth = 0.75;
      for (let i = 1; i < latLines; i++) {
        const phi = (Math.PI * i) / latLines;
        const rLat = radius * Math.sin(phi);
        const yLat = radius * Math.cos(phi);

        ctx.beginPath();
        let first = true;
        // Sweeping circles with step size of 24 for ultra-smooth rendering speed
        for (let j = 0; j <= 24; j++) {
          const theta = (j * Math.PI * 2) / 24;
          const pxReal = rLat * Math.cos(theta);
          const pzReal = rLat * Math.sin(theta);
          
          const proj = project(pxReal, yLat, pzReal);

          if (first) {
            ctx.moveTo(proj.px, proj.py);
            first = false;
          } else {
            ctx.lineTo(proj.px, proj.py);
          }
        }
        ctx.strokeStyle = `rgba(147, 197, 253, ${0.12})`;
        ctx.stroke();
      }

      // 2. Draw Globe longitude (vertical meridians) lines
      for (let j = 0; j < lonLines; j++) {
        const theta = (j * Math.PI * 2) / lonLines;

        ctx.beginPath();
        let first = true;
        for (let i = 0; i <= 24; i++) {
          const phi = (i * Math.PI) / 24;
          const pxReal = radius * Math.sin(phi) * Math.cos(theta);
          const pyReal = radius * Math.cos(phi);
          const pzReal = radius * Math.sin(phi) * Math.sin(theta);

          const proj = project(pxReal, pyReal, pzReal);

          if (first) {
            ctx.moveTo(proj.px, proj.py);
            first = false;
          } else {
            ctx.lineTo(proj.px, proj.py);
          }
        }
        ctx.strokeStyle = `rgba(147, 197, 253, ${0.12})`;
        ctx.stroke();
      }

      // 3. Draw outer glowing hacker radar-like circular orbits
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = "rgba(56, 189, 248, 0.4)";
      ctx.shadowBlur = 10;
      ctx.shadowColor = "rgba(56, 189, 248, 0.5)";

      // Horizontal outer ring
      ctx.beginPath();
      let firstRing = true;
      for (let a = 0; a <= 72; a++) {
        const angle = (a * Math.PI * 2) / 72;
        const rOuter = radius * 1.15;
        const rx = rOuter * Math.cos(angle);
        const rz = rOuter * Math.sin(angle);
        const proj = project(rx, 0, rz);
        if (firstRing) {
          ctx.moveTo(proj.px, proj.py);
          firstRing = false;
        } else {
          ctx.lineTo(proj.px, proj.py);
        }
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // 4. Draw node points & connection lines to neighbors
      points.forEach((pt) => {
        pt.pulsePhase += 0.02;
        const proj = project(pt.x, pt.y, pt.z);

        const depthAlpha = Math.max(0.12, (radius * 1.5 - proj.zDepth) / (radius * 3));
        const pulse = Math.sin(pt.pulsePhase) * 0.35 + 0.65;
        
        ctx.beginPath();
        ctx.arc(proj.px, proj.py, 2.5 * proj.scale * pulse, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(56, 189, 248, ${depthAlpha * 0.85})`;
        ctx.fill();

        if (proj.zDepth < 0 && Math.sin(pt.pulsePhase) > 0.4) {
          ctx.beginPath();
          ctx.arc(proj.px, proj.py, 6 * proj.scale, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(14, 165, 233, ${depthAlpha * 0.3})`;
          ctx.stroke();
        }
      });

      // 5. Draw digital hacker UI HUD graphics surrounding the globe
      ctx.strokeStyle = "rgba(147, 197, 253, 0.15)";
      ctx.lineWidth = 1;
      
      const reticleSize = radius * 1.25;
      
      ctx.beginPath();
      // Top Left Corner
      ctx.moveTo(center.x - reticleSize, center.y - reticleSize + 25);
      ctx.lineTo(center.x - reticleSize, center.y - reticleSize);
      ctx.lineTo(center.x - reticleSize + 25, center.y - reticleSize);
      // Top Right Corner
      ctx.moveTo(center.x + reticleSize, center.y - reticleSize + 25);
      ctx.lineTo(center.x + reticleSize, center.y - reticleSize);
      ctx.lineTo(center.x + reticleSize - 25, center.y - reticleSize);
      // Bottom Left Corner
      ctx.moveTo(center.x - reticleSize, center.y + reticleSize - 25);
      ctx.lineTo(center.x - reticleSize, center.y + reticleSize);
      ctx.lineTo(center.x - reticleSize + 25, center.y + reticleSize);
      // Bottom Right Corner
      ctx.moveTo(center.x + reticleSize, center.y + reticleSize - 25);
      ctx.lineTo(center.x + reticleSize, center.y + reticleSize);
      ctx.lineTo(center.x + reticleSize - 25, center.y + reticleSize);
      ctx.stroke();

      // Digital coordinates label
      ctx.font = "8px 'JetBrains Mono', monospace";
      ctx.fillStyle = "rgba(147, 197, 253, 0.4)";
      ctx.fillText(`SYS.GEO_GLOBE: ACTIVE`, center.x - reticleSize, center.y - reticleSize - 8);
      ctx.fillText(`LAT: ${rotationRef.current.x.toFixed(4)} RAD`, center.x - reticleSize, center.y + reticleSize + 16);
      ctx.fillText(`LON: ${rotationRef.current.y.toFixed(4)} RAD`, center.x - reticleSize, center.y + reticleSize + 28);
      ctx.fillText(`ROT_V: ${velocityRef.current.y.toFixed(5)}`, center.x + reticleSize - 85, center.y + reticleSize + 16);

      animationId = requestAnimationFrame(render);
    };

    render();

    // Mouse Interaction Handlers
    const handleMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      lastMousePos.current = { x: e.clientX, y: e.clientY };
      velocityRef.current = { x: 0, y: 0 };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const deltaX = e.clientX - lastMousePos.current.x;
      const deltaY = e.clientY - lastMousePos.current.y;

      const scale = 0.008;
      rotationRef.current.y += deltaX * scale;
      rotationRef.current.x += deltaY * scale;

      velocityRef.current = {
        x: deltaY * 0.0012,
        y: deltaX * 0.0012,
      };

      lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    const canvasEl = canvas;
    canvasEl.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resizeCanvas);
      canvasEl.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [hasIntersected]);

  return (
    <section 
      ref={sectionRef}
      id="code-intro-section" 
      className="relative w-full py-24 px-6 md:px-12 xl:px-24 bg-[#0d3475] z-35 overflow-hidden border-t border-b border-white/10 flex items-center justify-center"
    >
      {/* Dynamic Keyframes Injection */}
      <style>{`
        @keyframes letterFadeCycle {
          0% {
            opacity: 0;
            transform: scale(0.9) translateY(4px);
            filter: blur(4px) brightness(1.7);
          }
          10% {
            opacity: 1;
            transform: scale(1.05) translateY(0);
            filter: blur(0) brightness(1);
          }
          20% {
            opacity: 0.15;
            filter: brightness(2);
          }
          32% {
            opacity: 0.85;
            filter: brightness(1.2);
          }
          45% {
            opacity: 0.05;
            filter: brightness(2.5);
          }
          58% {
            opacity: 0.95;
            filter: brightness(1);
          }
          70% {
            opacity: 0.2;
            filter: brightness(2);
          }
          85% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: brightness(1);
          }
          100% {
            opacity: 1;
            transform: scale(1) translateY(0);
            filter: brightness(1);
          }
        }

        @keyframes revealWork {
          0% {
            transform: translateY(120%);
            opacity: 0;
          }
          30% {
            transform: translateY(120%);
            opacity: 0;
          }
          100% {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .flicker-char {
          display: inline-block;
          animation-name: letterFadeCycle;
          animation-duration: 2.0s;
          animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1);
          animation-fill-mode: forwards;
          animation-iteration-count: 1;
        }

        .flicker-char-0 {
          animation-delay: 0.02s;
        }
        .flicker-char-1 {
          animation-delay: 0.12s;
        }
        .flicker-char-2 {
          animation-delay: 0.06s;
        }
        .flicker-char-3 {
          animation-delay: 0.22s;
        }
      `}</style>

      {/* Futuristic Grid Cyber Glow overlay */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] z-0" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-sky-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
        
        {/* Left Aspect: Digital Hacker Canvas Globe Globe */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center relative w-full h-[350px]">
          {/* Subtle hacker matrix grid glowing circle backdrop */}
          <div className="absolute w-[360px] h-[360px] border border-sky-400/10 rounded-full pointer-events-none scale-90 animate-[spin_60s_linear_infinite]" />
          <div className="absolute w-[320px] h-[320px] border border-dashed border-sky-400/5 rounded-full pointer-events-none scale-100 animate-[spin_40s_linear_infinite_reverse]" />
          
          <canvas 
            ref={canvasRef} 
            className="relative cursor-default md:cursor-grab md:active:cursor-grabbing z-10 block"
            title="Interactive Globe: Drag to rotate organically!"
          />
          <div className="absolute bottom-2 text-center select-none pointer-events-none hidden md:block">
            <p className="font-mono text-[9px] text-[#8eb0eb]/50 tracking-widest uppercase flex items-center gap-1.5 justify-center">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping inline-block" />
              Hover & drag sphere to interact
            </p>
          </div>
        </div>

        {/* Right Aspect: Information & Trigger Column */}
        <div className="lg:col-span-6 flex flex-col items-start text-left gap-6 lg:pl-6">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-sky-200 bg-sky-950/40 rounded border border-white/10 flex items-center gap-1.5">
              <Terminal className="w-3 h-3 text-sky-400 animate-pulse" />
              System.Terminal
            </span>
            <button 
              onClick={handleReplayClick}
              className="p-1 px-2 rounded hover:bg-white/5 border border-transparent hover:border-white/10 text-white/40 hover:text-white transition-all text-[10px] font-mono flex items-center gap-1"
              title="Re-trigger typography animation"
            >
              <RefreshCw className="w-2.5 h-2.5" />
              Replay Code Intro
            </button>
          </div>

          {/* Letter by Letter Custom Animating Title */}
          <h2 
            className="font-serif text-5xl sm:text-6xl text-white font-light tracking-tight drop-shadow-md select-none inline-flex gap-0.5 items-center mr-auto"
            key={`${animKey}-${hasIntersected}`}
          >
            <span className={`${hasIntersected ? "flicker-char flicker-char-0" : "opacity-0"} font-serif mr-[2px]`}>C</span>
            <span className={`${hasIntersected ? "flicker-char flicker-char-1" : "opacity-0"} font-serif mr-[2px]`}>o</span>
            <span className={`${hasIntersected ? "flicker-char flicker-char-2" : "opacity-0"} font-serif mr-[2px]`}>d</span>
            <span className={`${hasIntersected ? "flicker-char flicker-char-3" : "opacity-0"} font-serif`}>e</span>
            <span className="inline-flex overflow-hidden relative ml-3 py-1 items-center leading-none">
              <span 
                className="font-sans text-sky-400 italic font-normal text-3xl sm:text-4xl inline-block"
                style={
                  hasIntersected
                    ? {
                        transform: "translateY(120%)",
                        animation: "revealWork 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards",
                        animationDelay: "0.4s"
                      }
                    : { opacity: 0 }
                }
              >
                Work
              </span>
            </span>
          </h2>

          <p 
            key={`desc-${animKey}-${hasIntersected}`}
            className="font-sans text-base text-white/90 leading-relaxed font-light tracking-wide max-w-xl select-none min-h-[48px]"
          >
            {hasIntersected ? (
              <GlitchText text="Behind the warm watercolor landscapes lies a technical framework. Explore the secure APIs, interactive widgets, and full-stack architecture that power my software systems." />
            ) : (
              <span className="opacity-0">Behind the warm watercolor landscapes lies a technical framework. Explore the secure APIs, interactive widgets, and full-stack architecture that power my software systems.</span>
            )}
          </p>

          <div className="grid grid-cols-2 gap-4 w-full max-w-lg mt-2">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
              <Cpu className="w-5 h-5 text-sky-300 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-serif text-sm font-medium text-white">Fullstack Architecture</h4>
                <p className="font-sans text-xs text-white/60 mt-0.5">Express server systems with lightning-fast APIs.</p>
              </div>
            </div>
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5">
              <Brackets className="w-5 h-5 text-emerald-300 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-serif text-sm font-medium text-white">Interactive Engineering</h4>
                <p className="font-sans text-xs text-white/60 mt-0.5">Stellar math-driven graphics and synthesized sound.</p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <LiquidButton 
              id="code-explore-cta"
              onClick={() => onViewChange("code")} 
              variant="primary"
              className="px-8 py-4 text-xs uppercase tracking-widest font-light flex items-center gap-3 group transition-all"
            >
              Explore Github & Projects
              <ChevronRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform duration-300" />
            </LiquidButton>
          </div>
        </div>

      </div>
    </section>
  );
}
