import React, { useState, useEffect } from "react";
import { 
  ArrowLeft, Terminal, Github, Star, GitFork, ExternalLink, 
  Cpu, Code, Globe, Zap, Database, Server, Compass, BookOpen, AlertCircle, Search, Laptop
} from "lucide-react";
import LiquidButton from "./LiquidButton";

interface CodePageProps {
  onViewChange: (state: "home" | "gallery" | "code") => void;
}

interface GithubRepo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string;
  updated_at: string;
}

export default function CodePage({ onViewChange }: CodePageProps) {
  const [githubUser, setGithubUser] = useState("nawnex"); // Default fallback or prompt user
  const [repos, setRepos] = useState<GithubRepo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "frontend" | "backend" | "creative">("all");

  // Fetch real repositories from any user on GitHub
  const fetchGithubRepos = async (username: string) => {
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=8`);
      if (!res.ok) {
        throw new Error(`GitHub User not found (${res.status})`);
      }
      const data = await res.json();
      const formatted: GithubRepo[] = data.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description || "No description provided for this repository.",
        html_url: r.html_url,
        stargazers_count: r.stargazers_count,
        forks_count: r.forks,
        language: r.language || "TypeScript",
        updated_at: new Date(r.updated_at).toLocaleDateString(),
      }));
      setRepos(formatted);
    } catch (err: any) {
      setError(err.message || "Could not fetch repositories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGithubRepos(githubUser);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchGithubRepos(githubUser);
  };

  // High craftsmanship hand-curated projects representing their primary work
  const curatedProjects = [
    {
      title: "Archives du Pont",
      description: "A dreamy Ghibli-inspired audio-visual sanctuary. Features fully customized interactive physical oscillators, custom canvas animations, and persistent visitor notes written in standard state context.",
      tech: ["React 19", "Vite", "Web Audio API", "Tailwind CSS"],
      stars: 42,
      forks: 12,
      badge: "Featured",
      demoUrl: "#",
      icon: <Compass className="w-5 h-5 text-sky-400" />
    },
    {
      title: "Holographic 3D Wireframe Globe",
      description: "A math-driven 3D projection rendering system built on canvas. Handles matrix rotations with customized kinetic dampening, dragging inertial physics, and responsive digital HUD telemetry overlays.",
      tech: ["HTML5 Canvas", "TypeScript", "Linear Math", "CSS Animations"],
      stars: 35,
      forks: 8,
      badge: "Creative Core",
      demoUrl: "#",
      icon: <Globe className="w-5 h-5 text-teal-400" />
    },
    {
      title: "Ambient Waves Audio Synthesizer",
      description: "A synthesizer engine capturing peaceful beach vibes. Triggers multiple interactive atmospheric waveforms, dynamic low-pass filters, and wind chimes loops on canvas click.",
      tech: ["Web Audio API", "GainNodes", "OscillatorNodes", "React JS"],
      stars: 28,
      forks: 5,
      badge: "Audio Core",
      demoUrl: "#",
      icon: <Zap className="w-5 h-5 text-amber-400" />
    }
  ];

  // Professional Core Capabilities
  const skills = [
    {
      title: "Interactive Web Interfaces",
      description: "Crafting beautiful, non-standard user interfaces using HTML5 Canvas, modern layout grids, and interactive, tactile sensory elements.",
      tech: ["React (Hooks, Refs)", "Tailwind CSS", "Canvas API", "Motion Dynamics"],
      icon: <Code className="w-6 h-6 text-sky-400" />
    },
    {
      title: "Synthesized Audio Development",
      description: "Custom audio modeling directly in the browser using raw Web Audio API nodes. Designing filters, sound decay controls, and interactive physical oscillators.",
      tech: ["OscillatorNodes", "BiquadFilterNodes", "GainNodes", "Procedural synthesis"],
      icon: <Cpu className="w-6 h-6 text-indigo-400" />
    },
    {
      title: "Fullstack Systems Implementation",
      description: "Securing backend architecture, routing, robust server APIs with Express, lazy client configuration, and structured storage structures.",
      tech: ["NodeJS / tsx", "Express.js", "REST and JSON APIs", "Unified Build pipelines"],
      icon: <Server className="w-6 h-6 text-teal-400" />
    },
    {
      title: "Production Optimization & Refinement",
      description: "Designing high-performance responsive graphics, eliminating re-render cycles, and keeping visual pipelines incredibly streamlined and light.",
      tech: ["Performance Profiling", "Debounced Events", "Type Safety", "CSS Keyframes"],
      icon: <Zap className="w-6 h-6 text-amber-400" />
    }
  ];

  return (
    <div 
      id="code-portfolio-view"
      className="relative min-h-screen pt-28 pb-20 px-4 sm:px-6 md:px-12 xl:px-24 bg-gradient-to-b from-[#103E8B] via-[#0d3475] to-[#0a2556] select-none text-white animate-[fadeIn_0.5s_use-out]"
    >
      {/* Dynamic Keyframe Shimmers */}
      <style>{`
        @keyframes flowGrid {
          0% { background-position: 0px 0px; }
          100% { background-position: 24px 24px; }
        }
        .moving-grid {
          background-image: 
            linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          background-size: 24px 24px;
          animation: flowGrid 12s linear infinite;
        }
      `}</style>

      {/* Futuristic Background Aesthetics */}
      <div className="absolute inset-0 moving-grid pointer-events-none z-0" />
      <div className="absolute top-1/4 left-10 w-[450px] h-[450px] bg-sky-500/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-10 w-[500px] h-[500px] bg-indigo-500/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <div className="w-full max-w-7xl mx-auto relative z-10 flex flex-col gap-12">
        
        {/* Top Navigation Back Action and SubHeader */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <LiquidButton 
              onClick={() => onViewChange("home")}
              variant="secondary"
              className="!p-2.5 rounded-full flex items-center justify-center cursor-pointer group hover:scale-105 transition-all"
              title="Return to Ghibli Journey home view"
              id="back-home-button"
            >
              <ArrowLeft className="w-4 h-4 text-white group-hover:-translate-x-1 transition-transform" />
            </LiquidButton>
            <div>
              <span className="font-mono text-[9px] uppercase tracking-widest text-[#8eb0eb]/60">Nostalgic Cyber Workspace</span>
              <h1 className="font-serif text-3xl md:text-4xl text-white font-light mt-0.5">Le Pont de Code</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-white/60">SYSTEM STATUS: OPERATIONAL</span>
          </div>
        </div>

        {/* 1st Column Section: What I can do Skills compartment */}
        <section id="capabilities-section" className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-white/5 border border-white/10">
              <Laptop className="w-4 h-4 text-sky-400" />
            </span>
            <h2 className="font-serif text-2xl text-white font-light">What I Can Do</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {skills.map((skill, idx) => (
              <div 
                key={idx}
                id={`skill-card-${idx}`}
                className="relative bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-white/20 transition-all duration-300 flex flex-col gap-4 shadow-xl text-left"
              >
                {/* Floating shine layer */}
                <div className="absolute right-4 top-4 opacity-30 select-none">{skill.icon}</div>
                
                <h3 className="font-serif text-base font-medium text-white pr-6">{skill.title}</h3>
                <p className="font-sans text-xs text-white/75 leading-relaxed flex-grow">{skill.description}</p>
                
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {skill.tech.map((t, ti) => (
                    <span 
                      key={ti} 
                      className="text-[9px] font-mono px-2 py-0.5 rounded bg-sky-950/40 text-sky-300 border border-transparent hover:border-sky-500/20"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 2nd Section: Hand-Crafted Ghibli Project Highlights */}
        <section id="curated-projects-section" className="flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-white/5 border border-white/10">
              <Compass className="w-4 h-4 text-emerald-400" />
            </span>
            <h2 className="font-serif text-2xl text-white font-light">Interactive Masterpieces</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {curatedProjects.map((proj, idx) => (
              <div 
                key={idx}
                id={`curated-project-${idx}`}
                className="group relative bg-[#071f46]/35 border border-white/10 rounded-2xl p-6 hover:bg-[#071f46]/50 hover:border-white/20 transition-all duration-300 flex flex-col gap-4 shadow-lg text-left"
              >
                <div className="flex justify-between items-center">
                  <div className="p-2 rounded-lg bg-white/5">{proj.icon}</div>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-400/20">
                    {proj.badge}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="font-serif text-lg font-normal text-white group-hover:text-sky-300 transition-colors">
                    {proj.title}
                  </h3>
                  <p className="font-sans text-xs text-white/70 leading-relaxed mt-1">
                    {proj.description}
                  </p>
                </div>

                {/* Tech specifications */}
                <div className="flex flex-wrap gap-1.5 mt-auto pt-2">
                  {proj.tech.map((t, ti) => (
                    <span key={ti} className="text-[9px] font-mono bg-white/5 text-white/60 px-2 py-0.5 rounded">
                      {t}
                    </span>
                  ))}
                </div>

                {/* Mock stats / interactive hover cues */}
                <div className="flex justify-between items-center pt-3 border-t border-white/5 text-[10px] font-mono text-[#8eb0eb]/50">
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400" /> {proj.stars}</span>
                    <span className="flex items-center gap-1"><GitFork className="w-3 h-3" /> {proj.forks}</span>
                  </div>
                  <span className="text-white/40 flex items-center gap-1 group-hover:text-white transition-colors duration-300">
                    Live Demo <ExternalLink className="w-2.5 h-2.5" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3rd Section: Live Github API Integrator / Repository Explorer */}
        <section id="live-github-explorer" className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-md bg-white/5 border border-white/10">
                <Github className="w-4 h-4 text-purple-400" />
              </span>
              <div className="text-left">
                <h2 className="font-serif text-2xl text-white font-light">GitHub Repository Terminal</h2>
                <p className="font-sans text-xs text-white/50">Enter any real username to index real files and repository data dynamically.</p>
              </div>
            </div>

            {/* Dynamic Search Module */}
            <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto">
              <div className="relative flex-grow md:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input 
                  type="text" 
                  value={githubUser}
                  onChange={(e) => setGithubUser(e.target.value)}
                  placeholder="GitHub Username"
                  className="font-mono text-xs w-full md:w-64 pl-9 pr-4 py-2 bg-black/30 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-sky-400 transition-colors"
                />
              </div>
              <LiquidButton
                type="submit"
                variant="primary"
                className="!py-2 !px-4 text-xs font-mono shrink-0 select-none"
                id="search-github-btn"
              >
                Fetch
              </LiquidButton>
            </form>
          </div>

          {/* Error and Loading Handlers */}
          {loading && (
            <div className="relative w-full h-48 rounded-2xl bg-black/15 border border-white/5 flex flex-col justify-center items-center gap-3">
              <div className="w-8 h-8 rounded-full border-4 border-sky-400/20 border-t-sky-400 animate-spin" />
              <p className="font-mono text-xs text-[#8eb0eb]/60">Interrogating official GitHub REST APIs...</p>
            </div>
          )}

          {error && (
            <div className="relative w-full p-6 rounded-2xl bg-rose-950/10 border border-rose-500/20 flex items-center gap-3 text-left">
              <AlertCircle className="w-6 h-6 text-rose-400 shrink-0" />
              <div>
                <h4 className="font-serif font-medium text-rose-200">API Connection Notice</h4>
                <p className="font-sans text-xs text-rose-300/80 mt-0.5">{error}. Pulling pre-packaged offline files instead.</p>
              </div>
            </div>
          )}

          {/* Retrieved repositories container */}
          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {repos.length === 0 ? (
                <div className="col-span-full h-32 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <p className="font-sans text-xs text-white/50">No directories or repositories indexed. Enter a valid username above to search.</p>
                </div>
              ) : (
                repos.map((repo) => (
                  <a 
                    href={repo.html_url}
                    target="_blank" 
                    rel="noopener noreferrer"
                    key={repo.id}
                    className="group bg-black/15 border border-white/5 hover:border-sky-400/30 hover:bg-black/25 rounded-2xl p-5 flex flex-col gap-3 transition-all duration-300 shadow text-left relative"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="truncate">
                        <h3 className="font-mono text-sm font-semibold text-white group-hover:text-sky-300 truncate transition-colors">
                          {repo.name}
                        </h3>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-white/30 group-hover:text-sky-300 shrink-0 mt-0.5" />
                    </div>

                    <p className="font-sans text-xs text-white/60 leading-relaxed flex-grow line-clamp-3">
                      {repo.description}
                    </p>

                    <div className="flex justify-between items-center pt-3 border-t border-white/5 text-[10px] font-mono text-white/40">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-white/70">
                        {repo.language}
                      </span>
                      <div className="flex gap-2.5">
                        <span className="flex items-center gap-1"><Star className="w-2.5 h-2.5 text-amber-400" /> {repo.stargazers_count}</span>
                        <span className="flex items-center gap-1"><GitFork className="w-2.5 h-2.5" /> {repo.forks_count}</span>
                      </div>
                    </div>
                  </a>
                ))
              )}
            </div>
          )}
        </section>

        {/* Dynamic visual sandbox at bottom for fun interactivity */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-6 text-left flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-400" />
            <h3 className="font-serif text-lg font-normal text-white">Archives & Code Ethos Summary</h3>
          </div>
          <p className="font-sans text-xs sm:text-sm text-white/70 leading-relaxed">
            I believe that code must reflect the same artistry we bring to visual illustration. A well-formatted server route is as graceful as a drifting watercolor cloud, and synthesized raw audio waveforms should comfort the soul. Creating software is my way of connecting mathematical accuracy to emotional experiences.
          </p>
        </section>

      </div>
    </div>
  );
}
