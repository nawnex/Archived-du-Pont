import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Compass, Music, Volume2, VolumeX, Play, Pause, Wind, Droplets, Sun, Smile } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import LiquidButton from "./LiquidButton";

export default function AmbientPlayer() {
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

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStation, setCurrentStation] = useState("Ocean Wave Whispers");
  const [volume, setVolume] = useState(70);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showMainVolume, setShowMainVolume] = useState(false);
  const [temp, setTemp] = useState(24.5);
  const [breeze, setBreeze] = useState("NE 10kn");
  const [coords, setCoords] = useState("The Mediterranean"); // Default fallback
  const [activeAmbients, setActiveAmbients] = useState<string[]>(["waves"]);

  // Dynamic glass refraction coordinates tracking for the square play/pause button
  const btnPlayRef = useRef<HTMLButtonElement>(null);
  const handlePlayPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const button = btnPlayRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    button.style.setProperty("--mouse-x", `${x}px`);
    button.style.setProperty("--mouse-y", `${y}px`);
  };
  const handlePlayPointerEnter = () => {
    btnPlayRef.current?.style.setProperty("--pointer-active", "1");
  };
  const handlePlayPointerLeave = () => {
    btnPlayRef.current?.style.setProperty("--pointer-active", "0");
  };

  // Refs to sync latest state for event handlers safely without stale closures
  const isPlayingRef = useRef(isPlaying);
  const currentStationRef = useRef(currentStation);
  const activeAmbientsRef = useRef(activeAmbients);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentStationRef.current = currentStation;
    activeAmbientsRef.current = activeAmbients;
  }, [isPlaying, currentStation, activeAmbients]);

  // Audio nodes & Context references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const mainGainRef = useRef<GainNode | null>(null);
  const waveNodesRef = useRef<any>(null);
  const windNodesRef = useRef<any>(null);
  const sunNodesRef = useRef<any>(null);
  const seagullNodesRef = useRef<any>(null);

  // Stations List
  const stations = [
    "Ocean Wave Whispers",
    "Ghibli Meadow Winds",
    `${season} Cicada Dream`,
    "Seaside Seagull Echoes"
  ];

  // Ambient Toggles mapping (kept for audio toggling state references where required)
  const ambients = [
    { id: "waves", label: "Wave Crashing", icon: Droplets },
    { id: "wind", label: "Warm Breeze", icon: Wind },
    { id: "sun", label: "Cicada Hums", icon: Sun },
    { id: "seagulls", label: "Seagull Sounds", icon: Compass }
  ];

  const handleStationChange = (direction: "prev" | "next") => {
    const currentIndex = stations.indexOf(currentStation);
    let nextIndex = direction === "next" ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex >= stations.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = stations.length - 1;
    setCurrentStation(stations[nextIndex]);

    // Customize active sounds based on Ghibli stations to make the transition marvelous!
    if (nextIndex === 0) {
      setActiveAmbients(["waves"]);
    } else if (nextIndex === 1) {
      setActiveAmbients(["wind"]);
    } else if (nextIndex === 2) {
      setActiveAmbients(["sun"]);
    } else if (nextIndex === 3) {
      setActiveAmbients(["seagulls"]);
    }
  };

  const toggleAmbient = (id: string) => {
    if (activeAmbients.includes(id)) {
      setActiveAmbients([]);
    } else {
      setActiveAmbients([id]);
    }
  };

  // Weather & Geolocation fetch at mount
  useEffect(() => {
    let isMounted = true;

    async function fetchLocationAndWeather() {
      try {
        const locRes = await fetch("https://ipapi.co/json/");
        if (!locRes.ok) throw new Error("Location fetch failed");

        const locData = await locRes.json();
        if (!isMounted) return;

        const { country_name, country_code, latitude, longitude } = locData;

        let locationLabel = "The Mediterranean";
        if (country_name) {
          locationLabel = country_name;
        } else if (country_code) {
          locationLabel = country_code;
        }

        let localTemp = 24.5;
        let localBreeze = "NE 10kn";

        if (latitude && longitude) {
          try {
            const weatherRes = await fetch(
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,wind_direction_10m`
            );
            if (weatherRes.ok) {
              const weatherData = await weatherRes.json();
              if (weatherData.current) {
                const temp2m = weatherData.current.temperature_2m;
                localTemp = Math.max(12, Math.min(32, parseFloat(temp2m.toFixed(1))));

                const windSpd = Math.round(weatherData.current.wind_speed_10m || 10);
                const windDir = weatherData.current.wind_direction_10m || 45;

                const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
                const dirIndex = Math.round(((windDir % 360) / 45)) % 8;
                const dirLabel = directions[dirIndex];

                localBreeze = `${dirLabel} ${windSpd}kn`;
              }
            }
          } catch (weatherErr) {
            console.warn("Could not fetch local weather", weatherErr);
          }
        }

        if (isMounted) {
          setTemp(localTemp);
          setBreeze(localBreeze);
          setCoords(locationLabel);
        }
      } catch (err) {
        console.warn("Could not retrieve user location details, using Mediterranean defaults", err);
        if (isMounted) {
          setTemp(24.5);
          setBreeze("NE 10kn");
          setCoords("The Mediterranean");
        }
      }
    }

    fetchLocationAndWeather();

    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to the custom play-waves event triggered globally
  useEffect(() => {
    const handlePlayWavesEvent = () => {
      const alreadyPlayingWaves = 
        isPlayingRef.current && 
        currentStationRef.current === "Ocean Wave Whispers" && 
        activeAmbientsRef.current.includes("waves");

      if (alreadyPlayingWaves) {
        // Do nothing, already playing
        return;
      }

      setIsPlaying(true);
      setActiveAmbients(["waves"]);
      setCurrentStation("Ocean Wave Whispers");
    };

    window.addEventListener("play-waves", handlePlayWavesEvent);
    return () => {
      window.removeEventListener("play-waves", handlePlayWavesEvent);
    };
  }, []);

  // Temperature drifting
  useEffect(() => {
    const interval = setInterval(() => {
      setTemp(prev => {
        const drift = (Math.random() - 0.5) * 0.15;
        return parseFloat((prev + drift).toFixed(1));
      });
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Web Audio Procedural Synthesis Logic
  const stopNodeGroup = (group: any) => {
    if (!group) return;
    try {
      if (typeof group.stop === "function") {
        group.stop();
        return;
      }
      Object.keys(group).forEach((key) => {
        const node = group[key];
        if (node && typeof node.stop === "function") {
          try {
            node.stop();
          } catch (e) {
            // Already stopped or not started
          }
        }
      });
    } catch (e) {
      console.error("Error stopping node group", e);
    }
  };

  const stopAllSounds = () => {
    if (waveNodesRef.current) {
      stopNodeGroup(waveNodesRef.current);
      waveNodesRef.current = null;
    }
    if (windNodesRef.current) {
      stopNodeGroup(windNodesRef.current);
      windNodesRef.current = null;
    }
    if (sunNodesRef.current) {
      stopNodeGroup(sunNodesRef.current);
      sunNodesRef.current = null;
    }
    if (seagullNodesRef.current) {
      stopNodeGroup(seagullNodesRef.current);
      seagullNodesRef.current = null;
    }
  };

  // Safe volume update
  useEffect(() => {
    if (mainGainRef.current && audioCtxRef.current) {
      try {
        mainGainRef.current.gain.setValueAtTime(volume / 100, audioCtxRef.current.currentTime);
      } catch (e) {
        console.error("Failed to update volume", e);
      }
    }
  }, [volume]);

  // Audio synthesis loop
  useEffect(() => {
    if (!isPlaying) {
      stopAllSounds();
      return;
    }

    // Lazy initialization of Web Audio API
    if (!audioCtxRef.current) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      } catch (e) {
        console.error("Web Audio API not supported", e);
        return;
      }
    }

    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    if (!mainGainRef.current) {
      mainGainRef.current = ctx.createGain();
      mainGainRef.current.connect(ctx.destination);
    }
    mainGainRef.current.gain.setValueAtTime(volume / 100, ctx.currentTime);

    // Create solid procedural white noise buffer
    const bufferSize = ctx.sampleRate * 2;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const dataChannel = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      dataChannel[i] = Math.random() * 2 - 1;
    }

    // 1. Procedural ocean waves
    if (activeAmbients.includes("waves")) {
      if (!waveNodesRef.current) {
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(320, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.12, ctx.currentTime);

        // Slow Oscillator as Volume LFO (8s cycle)
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.18, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(mainGainRef.current);

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        source.start();
        lfo.start();

        waveNodesRef.current = { source, lfo };
      }
    } else {
      if (waveNodesRef.current) {
        stopNodeGroup(waveNodesRef.current);
        waveNodesRef.current = null;
      }
    }

    // 2. Procedural warm breeze / wind
    if (activeAmbients.includes("wind")) {
      if (!windNodesRef.current) {
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(450, ctx.currentTime);
        filter.Q.setValueAtTime(1.5, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.08, ctx.currentTime);

        // Wind gust LFO (15s cycle)
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(0.07, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(220, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(mainGainRef.current);

        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        source.start();
        lfo.start();

        windNodesRef.current = { source, lfo };
      }
    } else {
      if (windNodesRef.current) {
        stopNodeGroup(windNodesRef.current);
        windNodesRef.current = null;
      }
    }

    // 3. Procedural golden fields cicadas (sun)
    if (activeAmbients.includes("sun")) {
      if (!sunNodesRef.current) {
        const source = ctx.createBufferSource();
        source.buffer = noiseBuffer;
        source.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.frequency.setValueAtTime(4200, ctx.currentTime);
        filter.Q.setValueAtTime(9, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.015, ctx.currentTime);

        // Cicada shimmer high-speed rapid LFO (16Hz)
        const lfo = ctx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.setValueAtTime(16, ctx.currentTime);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(0.01, ctx.currentTime);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(mainGainRef.current);

        lfo.connect(lfoGain);
        lfoGain.connect(gain.gain);

        source.start();
        lfo.start();

        sunNodesRef.current = { source, lfo };
      }
    } else {
      if (sunNodesRef.current) {
        stopNodeGroup(sunNodesRef.current);
        sunNodesRef.current = null;
      }
    }

    // 4. Procedural Ghibli Seagull Echoes
    if (activeAmbients.includes("seagulls")) {
      if (!seagullNodesRef.current) {
        let isStopped = false;
        let nextCallTimeout: any = null;
        const activeOscs: OscillatorNode[] = [];
        const activeGains: GainNode[] = [];

        const playSeagullCall = () => {
          if (isStopped || !ctx || ctx.state === "closed" || !mainGainRef.current) return;

          // Number of squawks in this round: e.g., 3 to 5
          const numSquawks = Math.floor(Math.random() * 3) + 3;
          let timeOffset = 0;

          for (let i = 0; i < numSquawks; i++) {
            const squawkDuration = 0.28 + Math.random() * 0.05;
            const startTime = ctx.currentTime + timeOffset;
            const stopTime = startTime + squawkDuration;

            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gainNode = ctx.createGain();

            // Triangle wave creates a beautiful Ghibli-esque nasal flute/oboe bird timbre
            osc.type = "triangle";

            // Seagull frequency signature: starts lower, peaks up, and drops down off-key
            const initialFreq = 750 + (i === 0 ? 100 : Math.random() * 120);
            const peakFreq = 1200 + (i === 0 ? 150 : Math.random() * 150);
            const endingFreq = 500 + Math.random() * 60;

            osc.frequency.setValueAtTime(initialFreq, startTime);
            osc.frequency.exponentialRampToValueAtTime(peakFreq, startTime + 0.08);
            osc.frequency.exponentialRampToValueAtTime(endingFreq, stopTime);

            // Filter out extremely high triangle buzzy edge
            filter.type = "lowpass";
            filter.frequency.setValueAtTime(1800, startTime);

            // Volume Envelope
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(0.04, startTime + 0.04); // subtle fade-in
            gainNode.gain.exponentialRampToValueAtTime(0.001, stopTime); // long organic tail decay

            osc.connect(filter);
            filter.connect(gainNode);
            gainNode.connect(mainGainRef.current);

            osc.start(startTime);
            osc.stop(stopTime);

            activeOscs.push(osc);
            activeGains.push(gainNode);

            // Stagger the bird cries (first one is isolated, next ones are rapid "kyow kyow kyow")
            timeOffset += i === 0 ? 0.45 : 0.30;
          }

          // Schedule next seagull event in 6 to 11 seconds
          const delay = 6000 + Math.random() * 5000;
          nextCallTimeout = setTimeout(playSeagullCall, delay);
        };

        // Trigger the initial cry immediately!
        playSeagullCall();

        seagullNodesRef.current = {
          stop: () => {
            isStopped = true;
            if (nextCallTimeout) {
              clearTimeout(nextCallTimeout);
            }
            activeOscs.forEach((osc) => {
              try {
                osc.stop();
              } catch (e) {}
            });
            activeGains.forEach((g) => {
              try {
                g.disconnect();
              } catch (e) {}
            });
          }
        };
      }
    } else {
      if (seagullNodesRef.current) {
        stopNodeGroup(seagullNodesRef.current);
        seagullNodesRef.current = null;
      }
    }

  }, [isPlaying, activeAmbients]);

  // Clean closure on unmount
  useEffect(() => {
    return () => {
      stopAllSounds();
      if (audioCtxRef.current) {
        try {
          audioCtxRef.current.close();
        } catch (e) {
          // already closed
        }
      }
    };
  }, []);

  return (
    <div className="flex flex-col h-fit bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-all duration-300">
      {/* Background soft glow */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-indigo-200/5 blur-3xl rounded-full pointer-events-none" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center border border-white/25">
            <Music className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <h3 className="font-serif text-lg text-white font-medium tracking-wide">
              The Coastal Receiver
            </h3>
            <p className="font-mono text-[9px] uppercase tracking-widest text-[#B4D0FF]/75">
              Radio waves of nostalgic {season.toLowerCase()}s
            </p>
          </div>
        </div>
        <span className={`font-mono text-[10px] uppercase px-2.5 py-0.5 rounded border transition-all duration-300 ${isPlaying ? "bg-emerald-500/20 text-emerald-200 border-emerald-400/20" : "bg-white/10 text-white/50 border-white/10"}`}>
          {isPlaying ? "Transmitting" : "Standby"}
        </span>
      </div>

      {/* Retro Station Deck */}
      <div className="relative z-10 bg-black/15 rounded-xl border border-white/10 p-4 mb-0 flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[9px] uppercase tracking-wider text-sky-200/50">
            FM Waveform Frequency
          </span>
          <span className="font-mono text-[10px] text-white/40">101.3 MHz</span>
        </div>

        {/* Dynamic Waveform Visualizer with Embedded Square Play/Pause Overlay */}
        <div className="relative h-14 w-full flex items-center justify-center select-none bg-black/20 rounded-lg overflow-hidden border border-white/5 group">
          {/* Waveform Bars */}
          <div className="absolute inset-0 flex items-center justify-between gap-[3px] py-2 px-3">
            {Array.from({ length: 28 }).map((_, i) => {
              const scale = isPlaying ? Math.abs(Math.sin(i / 3.5 + Date.now() / 1500)) : 0.15;
              const style = {
                height: `${4 + Math.max(3, scale * 34)}px`,
              };
              return (
                <div 
                  key={i} 
                  style={style}
                  className="flex-1 rounded-full bg-gradient-to-t from-sky-450 to-indigo-200 transition-all duration-300 opacity-50"
                />
              );
            })}
          </div>

          {/* Square Play/Pause Overlay Button */}
          <button
            type="button"
            ref={btnPlayRef}
            onPointerMove={handlePlayPointerMove}
            onPointerEnter={handlePlayPointerEnter}
            onPointerLeave={handlePlayPointerLeave}
            onClick={() => setIsPlaying(!isPlaying)}
            className="relative z-20 w-10 h-10 flex items-center justify-center rounded-xl liquid-glass-btn text-white hover:text-white border border-white/20 active:scale-95 cursor-pointer transition-all duration-300"
            title={isPlaying ? "Pause Soundscape" : "Initiate Waves"}
          >
            {/* Real-time liquid glass light effects */}
            <span className="absolute inset-0 pointer-events-none liquid-glass-refraction transition-opacity duration-500 rounded-xl" />
            <span className="absolute inset-0 pointer-events-none liquid-glass-specular transition-opacity duration-500 rounded-xl" />
            
            {isPlaying ? (
              <div className="relative z-10 flex gap-[3px]">
                <div className="w-[4px] h-[14px] bg-white rounded-xs" />
                <div className="w-[4px] h-[14px] bg-white rounded-xs" />
              </div>
            ) : (
              <Play className="relative z-10 w-3.5 h-3.5 fill-white text-white stroke-none ml-[2px]" />
            )}
          </button>
        </div>

        <div className="flex justify-between items-center mt-1">
          <button 
            type="button"
            onClick={() => handleStationChange("prev")}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-all active:scale-95 text-xs text-center shrink-0"
          >
            ←
          </button>
          
          <div className="text-center flex-1 px-3 min-w-0">
            <span className="font-serif italic text-sm text-white block truncate">
              "{currentStation}"
            </span>
          </div>

          <button 
            type="button"
            onClick={() => handleStationChange("next")}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 border border-white/10 flex items-center justify-center text-white cursor-pointer transition-all active:scale-95 text-xs text-center shrink-0"
          >
            →
          </button>

          {/* Expandable volume adjuster to the right of the right arrow */}
          <div className="flex items-center ml-2 shrink-0 relative">
            <button
              type="button"
              onClick={() => setShowMainVolume(!showMainVolume)}
              className={`w-8 h-8 rounded-full border flex items-center justify-center text-white cursor-pointer transition-all active:scale-95 text-sm ${
                showMainVolume ? "bg-white/20 border-sky-400/50" : "bg-white/5 border-white/10 hover:bg-white/15"
              }`}
              title="Adjust Volume"
            >
              <Volume2 className="w-3.5 h-3.5 text-sky-100" />
            </button>
            
            <AnimatePresence>
              {showMainVolume && (
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: "auto", opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="flex items-center gap-1.5 overflow-hidden bg-black/35 border border-white/10 rounded-lg px-2 py-1 ml-1 select-none whitespace-nowrap"
                >
                  <label htmlFor="main-volume-input" className="sr-only">Main Volume</label>
                  <input
                    id="main-volume-input"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    onMouseUp={() => setShowMainVolume(false)}
                    onTouchEnd={() => setShowMainVolume(false)}
                    className="w-16 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-300 focus:outline-none"
                  />
                  <span className="font-mono text-[9px] font-bold text-white min-w-[20px] text-right">
                    {volume}%
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Playing Control and Stats */}
      <div className="relative z-10 flex flex-col mt-[5px] p-0">
        {/* Tiny meteorological telemetry data without holding box and lines */}
        <div className="grid grid-cols-3 gap-0.5 text-center text-white/50 select-none m-0 p-0">
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[7px] uppercase tracking-wider text-white/40">Sea Temp</span>
            <span className="font-sans text-xs font-semibold text-sky-200">{temp}°C</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[7px] uppercase tracking-wider text-white/40">Breeze</span>
            <span className="font-sans text-xs font-semibold text-sky-200 truncate px-0.5">{breeze}</span>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="font-mono text-[7px] uppercase tracking-wider text-white/40">Coordinates</span>
            <span className="font-sans text-[9px] font-semibold text-[#8eb0eb] truncate px-0.5" title={coords}>{coords}</span>
          </div>
        </div>
      </div>

      {/* Global floating controller in the bottom-left of the actual monitor using React Portal */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {isPlaying && (
            <motion.div
              layout
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.95, transition: { duration: 0.3 } }}
              className="fixed bottom-6 left-6 z-50 flex items-center bg-slate-950/85 backdrop-blur-xl border border-white/10 rounded-full p-2.5 shadow-2xl overflow-hidden shadow-emerald-950/10 gap-2"
            >
              {/* Play/Pause Button */}
              <button
                type="button"
                onClick={() => setIsPlaying(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/15 text-white transition-colors cursor-pointer group flex items-center justify-center border-0 shrink-0"
                title="Pause Soundscape"
              >
                <Pause className="w-4 h-4 text-sky-200 fill-sky-200 group-hover:scale-105 transition-transform" />
              </button>

              {/* Volume Icon Button to expand/collapse panel */}
              <button
                type="button"
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className={`p-2 rounded-full transition-colors cursor-pointer group flex items-center justify-center border-0 shrink-0 ${
                  showVolumeSlider ? "bg-white/20 text-sky-300" : "bg-white/10 hover:bg-white/15 text-white/90"
                }`}
                title="Toggle Volume Settings"
              >
                {volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-red-300 transition-transform group-hover:scale-105" />
                ) : (
                  <Volume2 className="w-4 h-4 text-sky-200 transition-transform group-hover:scale-105" />
                )}
              </button>

              {/* Expandable volume slider bar */}
              <AnimatePresence>
                {showVolumeSlider && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: "auto", opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="flex items-center gap-2 pr-2.5 overflow-hidden"
                  >
                    <label htmlFor="floating-volume-input" className="sr-only">Volume Slider</label>
                    <input 
                      id="floating-volume-input"
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={(e) => setVolume(Number(e.target.value))}
                      onMouseUp={() => setShowVolumeSlider(false)}
                      onTouchEnd={() => setShowVolumeSlider(false)}
                      className="w-24 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-sky-300 focus:outline-none shrink-0"
                    />
                    <span className="font-mono text-[9px] text-white/80 min-w-[24px] text-right font-medium shrink-0">
                      {volume}%
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
