"use client";

import Image from "next/image";
import {
  AnimatePresence,
  motion,
  useScroll,
  useTransform,
  useMotionValue,
  useSpring,
  useInView,
  MotionStyle,
} from "framer-motion";
import { useEffect, useRef, useState, useCallback } from "react";
import { useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Github,
  Linkedin,
  Mail,
  Phone,
  Sparkles,
  ExternalLink,
  Code2,
  Cpu,
  Layers,
  GraduationCap,
  Award,
  Copy,
  Compass,
  Sun,
  Moon,
} from "lucide-react";
import { FloatingNav } from "@/components/FloatingNav";
import { CertificateModal, CertificateItem } from "@/components/CertificateModal";
import { Toast } from "@/components/Toast";
import { SmoothScroll } from "@/components/SmoothScroll";

import { KineticCanvas } from "@/components/KineticCanvas";
import { TextScramble } from "@/components/TextScramble";
import { KineticAudio } from "@/components/KineticAudio";
import { TelemetryHUD } from "@/components/TelemetryHUD";
import { FloatingGlyphs } from "@/components/FloatingGlyphs";

const projects = [
  {
    no: "01",
    year: "2025",
    title: "Personalized Learning Application",
    tag: "Adaptive AI / Education",
    url: "https://learninggenzai.ai.studio",
    blurb:
      "A learner-modeling engine that maps strengths, gaps, and tempo through historical signals — then orchestrates content, difficulty, and a generative tutor in real time.",
    pillars: ["Learner Profile Modeling", "Adaptive Recommendation", "Predictive Tracking", "LLM Feedback Loop", "React Dashboard"],
    palette: ["#ff3b1f", "#0a0a0a", "#f5f1e8"],
  },
  {
    no: "02",
    year: "2025",
    title: "MedMind AI",
    tag: "Healthcare / Conversational AI",
    url: "https://medimind-ai-project-phi.vercel.app",
    blurb:
      "A thoughtful medical AI companion that understands symptoms and health context — turning complex information into clear guidance, useful next steps, and a calmer care journey.",
    pillars: ["Medical Knowledge Support", "Symptom Context Understanding", "Personalized Guidance", "Conversational AI", "Accessible Health Dashboard"],
    palette: ["#8ccfc9", "#0a0a0a", "#f5f1e8"],
  },
];

const skills = {
  Languages: ["Python", "JavaScript", "Java"],
  Interface: ["HTML5", "CSS3", "React"],
  Systems: ["Claude", "n8n", "GitHub"],
};

/* ─── Scroll Progress Bar ─── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[230] h-[2px] origin-left"
      style={{
        scaleX: scrollYProgress,
        background: "linear-gradient(90deg, #ff3b1f 0%, #ff8c42 50%, #ff3b1f 100%)",
        boxShadow: "0 0 16px rgba(255,59,31,0.9)",
      }}
    />
  );
}

/* ─── Split Text Reveal ─── */
function SplitReveal({
  text,
  className = "",
  delay = 0,
  stagger = 0.03,
  tag = "span",
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  tag?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: "-80px" });
  const words = text.split(" ");
  const Tag = tag as React.ElementType;

  return (
    <Tag ref={ref} className={`${className} overflow-hidden`} aria-label={text}>
      {words.map((word, wi) => (
        <span key={wi} className="inline-block overflow-hidden mr-[0.25em]">
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0 }}
            animate={inView ? { y: 0, opacity: 1 } : {}}
            transition={{
              duration: 0.75,
              delay: delay + wi * stagger,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}

/* ─── Generic scroll-triggered reveal ─── */
function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<Element>, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated number counter ─── */
function AnimatedCounter({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, { damping: 25, stiffness: 90 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (inView) motionVal.set(value);
  }, [inView, value, motionVal]);

  useEffect(() => {
    return springVal.on("change", (latest) => {
      if (decimals > 0) {
        setDisplay(latest.toFixed(decimals));
      } else {
        const intVal = Math.round(latest);
        setDisplay(intVal < 10 ? `0${intVal}` : `${intVal}`);
      }
    });
  }, [springVal, decimals]);

  return <span ref={ref}>{display}</span>;
}

/* ─── Custom cursor with comet trail ─── */
type TrailDot = { id: number; x: number; y: number };
function Cursor() {
  const mouseX = useMotionValue(-100);
  const mouseY = useMotionValue(-100);
  const cursorX = useSpring(mouseX, { damping: 26, stiffness: 350 });
  const cursorY = useSpring(mouseY, { damping: 26, stiffness: 350 });
  const ringX = useSpring(mouseX, { damping: 20, stiffness: 180 });
  const ringY = useSpring(mouseY, { damping: 20, stiffness: 180 });

  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);
  const [badgeText, setBadgeText] = useState("");
  const [trail, setTrail] = useState<TrailDot[]>([]);
  const trailIdRef = useRef(0);
  const lastPosRef = useRef({ x: -100, y: -100 });

  useEffect(() => {
    const move = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      const t = e.target as HTMLElement;
      const cursorTarget = t.closest?.("[data-cursor]") as HTMLElement | null;
      if (cursorTarget) {
        setBadgeText(cursorTarget.getAttribute("data-cursor") || "");
        setHovered(true);
      } else {
        setBadgeText("");
        setHovered(!!t.closest?.("a, button, [data-magnet], [role='button'], input, textarea"));
      }

      // Comet trail: spawn a dot every 30px of movement
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      if (Math.hypot(dx, dy) > 20) {
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        const id = ++trailIdRef.current;
        setTrail((prev) => [...prev.slice(-12), { id, x: e.clientX, y: e.clientY }]);
        setTimeout(() => setTrail((prev) => prev.filter((d) => d.id !== id)), 600);
      }
    };
    const down = () => setClicked(true);
    const up = () => setClicked(false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mousedown", down);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mousedown", down);
      window.removeEventListener("mouseup", up);
    };
  }, [mouseX, mouseY]);

  return (
    <>
      {/* Comet trail dots */}
      {trail.map((dot, i) => (
        <motion.div
          key={dot.id}
          className="pointer-events-none fixed z-[218] hidden md:block rounded-full bg-accent"
          initial={{ opacity: 0.7, scale: 1 }}
          animate={{ opacity: 0, scale: 0.1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{
            left: dot.x,
            top: dot.y,
            translateX: "-50%",
            translateY: "-50%",
            width: Math.max(3, 8 - (trail.length - 1 - i) * 0.5),
            height: Math.max(3, 8 - (trail.length - 1 - i) * 0.5),
            boxShadow: `0 0 ${6 + i}px rgba(255,59,31,0.8)`,
          }}
        />
      ))}

      {/* Main dot */}
      <motion.div
        className="pointer-events-none fixed z-[220] hidden md:block"
        style={{ x: cursorX, y: cursorY, translateX: "-50%", translateY: "-50%" } as MotionStyle}
      >
        <motion.div
          animate={{ scale: clicked ? 0.5 : badgeText ? 1.15 : hovered ? 2.2 : 1, opacity: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 240 }}
          className={`flex items-center justify-center rounded-full bg-accent text-accent-foreground font-mono font-bold ${
            badgeText
              ? "px-3 py-1 text-[9px] uppercase tracking-wider min-w-16 shadow-xl"
              : "h-3.5 w-3.5"
          }`}
          style={{ boxShadow: hovered ? "0 0 20px rgba(255,59,31,0.9), 0 0 40px rgba(255,59,31,0.4)" : "0 0 10px rgba(255,59,31,0.6)" }}
        >
          {badgeText}
        </motion.div>
      </motion.div>

      {/* Outer ring */}
      <motion.div
        className="pointer-events-none fixed z-[219] hidden md:block"
        style={{ x: ringX, y: ringY, translateX: "-50%", translateY: "-50%" } as MotionStyle}
      >
        <motion.div
          animate={{
            scale: badgeText ? 2.4 : hovered ? 1.8 : 1,
            opacity: badgeText ? 0.5 : hovered ? 0.6 : 0.2,
          }}
          transition={{ type: "spring", damping: 22, stiffness: 180 }}
          className="h-9 w-9 rounded-full border border-accent"
          style={{ boxShadow: hovered ? "0 0 15px rgba(255,59,31,0.3)" : "none" }}
        />
      </motion.div>
    </>
  );
}

/* ─── Marquee ─── */
function Marquee({ items, reverse = false }: { items: string[]; reverse?: boolean }) {
  return (
    <div className="relative overflow-hidden border-y border-foreground/15 bg-ink text-paper py-5">
      <div
        className="marquee flex whitespace-nowrap text-2xl font-medium tracking-tight md:text-3xl"
        style={{ animationDirection: reverse ? "reverse" : "normal" }}
      >
        {[...items, ...items, ...items].map((t, i) => (
          <span key={i} className="mx-8 flex items-center gap-8 group">
            <span className="transition-colors group-hover:text-accent">{t}</span>
            <span className="text-accent animate-pulse">●</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/* ─── Magnetic button wrapper ─── */
function Magnetic({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { damping: 15, stiffness: 220 });
  const sy = useSpring(y, { damping: 15, stiffness: 220 });

  return (
    <motion.div
      ref={ref}
      data-magnet
      style={{ x: sx, y: sy }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── Animated gradient blob ─── */
function GradientOrb({ className = "" }: { className?: string }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none blur-[100px] ${className}`}
      animate={{
        scale: [1, 1.15, 1.05, 1],
        x: [0, 30, -15, 0],
        y: [0, -20, 25, 0],
        opacity: [0.25, 0.4, 0.3, 0.25],
      }}
      transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", repeatType: "mirror" }}
    />
  );
}

/* ─── Kinetic Letter ─── */
function KineticLetter({
  char, i, hovered, baseDelay = 0, accent = false,
}: {
  char: string; i: number; hovered: boolean; baseDelay?: number; accent?: boolean;
}) {
  const phase = (i * 1.3) % (2 * Math.PI);
  return (
    <motion.span
      className={`inline-block cursor-default ${
        accent ? "text-accent" : ""
      }`}
      initial={{ y: "110%", opacity: 0 }}
      animate={
        hovered
          ? {
              y: [0, -8 + Math.sin(phase) * 4, 0],
              rotate: [0, (i % 2 === 0 ? 2 : -2), 0],
              scale: [1, 1.05, 1],
            }
          : { y: 0, rotate: 0, scale: 1, opacity: 1 }
      }
      transition={
        hovered
          ? {
              duration: 2.2,
              delay: i * 0.07,
              repeat: Infinity,
              repeatType: "loop",
              ease: "easeInOut",
            }
          : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
      }
      style={{ originY: 0.8 }}
    >
      {char}
    </motion.span>
  );
}

/* ─── Theme Toggle ─── */
function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved === "dark" || (!saved && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <motion.button
      onClick={toggle}
      whileHover={{ scale: 1.12 }}
      whileTap={{ scale: 0.9 }}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex items-center justify-center h-8 w-8 rounded-full border border-foreground/20 bg-paper/60 backdrop-blur-sm hover:bg-foreground/10 text-foreground transition-colors overflow-hidden"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute flex items-center justify-center text-accent"
          >
            <Sun className="h-4 w-4" />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="absolute flex items-center justify-center text-foreground/70"
          >
            <Moon className="h-4 w-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ─── HERO ─── */
function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const line3Ref = useRef<HTMLSpanElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const [isRunnerActive, setIsRunnerActive] = useState(false);
  const [isNameHovered, setIsNameHovered] = useState(false);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const y1 = useTransform(scrollYProgress, [0, 1], [0, -220]);
  const y2 = useTransform(scrollYProgress, [0, 1], [0, 130]);
  const op = useTransform(scrollYProgress, [0, 0.75], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const rotateX = useTransform(scrollYProgress, [0, 1], [0, 4]);

  const triggerRunner = () => {
    const runnerEl = document.querySelector<HTMLElement>("[aria-label='Click to start character running animation']");
    runnerEl?.click();
  };

  return (
    <section ref={ref} id="hero" className="relative min-h-screen overflow-hidden bg-paper text-ink">
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 projection" />

      {/* Animated gradient orbs */}
      <GradientOrb className="w-[600px] h-[600px] bg-accent/20 top-[-100px] right-[-100px]" />
      <GradientOrb className="w-[400px] h-[400px] bg-signal/20 bottom-[-50px] left-[-80px]" />

      {/* top bar */}
      <div className="relative z-20 flex items-center justify-between border-b border-foreground/15 px-6 py-4 font-mono text-xs uppercase tracking-widest md:px-10">
        <div className="flex items-center gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <TextScramble text="K · H — Studio / 2026" className="font-semibold" />
          </motion.div>
          <TelemetryHUD />
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden md:inline text-muted-foreground"
          >
            <TextScramble text="Tirupati ⇄ Earth · 13.6288°N" />
          </motion.span>

          <KineticAudio />

          <ThemeToggle />

          <motion.span
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flicker text-accent font-semibold"
          >
            ● rec
          </motion.span>
        </div>
      </div>

      <motion.div
        ref={heroRef}
        style={{ y: y1, opacity: op, scale, rotateX }}
        className="relative z-10 px-6 pt-16 md:px-10 md:pt-24"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >

        <motion.div
          className="flex items-baseline justify-between font-mono text-xs uppercase tracking-widest text-muted-foreground"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <span>Issue №01 — Portfolio</span>
          <span>B.Tech ECE · CGPA 8.9</span>
        </motion.div>

        {/* Hero title — Kinetic Typography on hover */}
        <h1
          className="mt-10 font-display font-medium hero-title select-none relative"
          onMouseEnter={() => setIsNameHovered(true)}
          onMouseLeave={() => setIsNameHovered(false)}
        >
          <span className="block overflow-visible">
            <span ref={line1Ref} className="inline-flex">
              {["K", "O", "L", "A"].map((c, i) => (
                <KineticLetter key={i} char={c} i={i} hovered={isNameHovered} baseDelay={0} />
              ))}
            </span>
          </span>
          <span className="block text-stroke hover:text-stroke-none transition-colors overflow-visible">
            <span ref={line2Ref} className="inline-flex">
              {["H", "A", "R", "S", "H", "A"].map((c, i) => (
                <KineticLetter key={i} char={c} i={i + 4} hovered={isNameHovered} baseDelay={0.05} />
              ))}
              <motion.span
                className="inline-block"
                initial={{ y: "110%", opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.97, ease: [0.16, 1, 0.3, 1] }}
              >
                &mdash;
              </motion.span>
            </span>
          </span>
          <span className="block overflow-visible">
            <span ref={line3Ref} className="inline-flex">
              {["V", "A", "R", "D", "H", "A", "N"].map((c, i) => (
                <KineticLetter key={i} char={c} i={i + 10} hovered={isNameHovered} baseDelay={0.1} />
              ))}
              <motion.span
                ref={dotRef}
                className="text-accent inline-block cursor-pointer"
                initial={{ y: "110%", opacity: 0 }}
                animate={isNameHovered
                  ? { y: [0, -8, 0], rotate: [0, 45, 0], scale: [1, 1.2, 1] }
                  : { y: 0, opacity: 1 }
                }
                transition={isNameHovered
                  ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                  : { duration: 0.8, delay: 1.2, ease: [0.16, 1, 0.3, 1] }
                }
              >
                .
              </motion.span>
            </span>
          </span>
        </h1>
      </motion.div>

      <motion.div
        style={{ y: y2 }}
        className="relative z-10 mt-12 grid grid-cols-1 gap-8 px-6 pb-20 md:grid-cols-12 md:px-10"
      >
        <motion.div
          className="md:col-span-5 md:col-start-1"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-serif text-3xl italic leading-tight md:text-5xl">
            React developer and AI builder crafting{" "}
            <span className="text-accent">intelligent interfaces</span> with
            Python, JavaScript, Java, automation, and thoughtful visual systems.
          </p>
        </motion.div>
        <motion.div
          className="md:col-span-4 md:col-start-9"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 1.15, ease: [0.16, 1, 0.3, 1] }}
        >
          <p className="font-mono text-sm uppercase tracking-widest text-muted-foreground">— Index</p>
          <ul className="mt-4 space-y-2 font-display text-lg">
            {[
              { label: "Selected Work", id: "projects" },
              { label: "Process", id: "projects" },
              { label: "Skills", id: "skills" },
              { label: "Studio", id: "about" },
              { label: "Contact", id: "contact" },
            ].map((s, i) => (
              <motion.li
                key={s.label}
                className="border-b border-foreground/15 py-2 overflow-hidden"
                initial={{ x: 30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 1.2 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              >
                <a
                  href={`#${s.id}`}
                  className="flex items-baseline justify-between transition-colors hover:text-accent group"
                >
                  <span className="group-hover:translate-x-1 transition-transform inline-block">{s.label}</span>
                  <span className="font-mono text-xs text-muted-foreground">0{i + 1}</span>
                </a>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </motion.div>

      {/* Scroll hint */}
      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 0.6 }}
      >
        <span>Scroll</span>
        <motion.div
          className="w-px h-10 bg-gradient-to-b from-foreground/40 to-transparent"
          animate={{ scaleY: [1, 0.3, 1], opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </section>
  );
}

/* ─── Project Card with deep parallax + 3D tilt ─── */
function ProjectCard({ p, i }: { p: (typeof projects)[0]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const textY = useTransform(scrollYProgress, [0, 1], [40, -40]);
  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0]);
  const reverse = i % 2 === 1;

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [pixelPos, setPixelPos] = useState({ x: 0, y: 0 });
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { damping: 20, stiffness: 200 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { damping: 20, stiffness: 200 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
    setPixelPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.article
      ref={ref}
      style={{ opacity }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative border-b border-foreground/15 py-16 md:py-24 perspective-1000 overflow-hidden ${
        p.url ? "cursor-pointer group/card" : ""
      }`}
      onClick={() => p.url && window.open(p.url, "_blank")}
    >
      {/* Specular glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(600px circle at ${pixelPos.x}px ${pixelPos.y}px, rgba(255, 59, 31, 0.08), transparent 70%)`,
        }}
      />
      {/* Glare shine layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-none opacity-0 group-hover/card:opacity-100 transition-opacity duration-500 overflow-hidden"
        style={{
          background: `radial-gradient(160px circle at ${pixelPos.x}px ${pixelPos.y}px, rgba(255,255,255,0.07) 0%, transparent 80%)`,
        }}
      />

      <div className="grid grid-cols-12 gap-8 px-6 md:px-10 items-center relative z-10">
        <motion.div
          style={{ rotateX, rotateY, y: textY }}
          className={`col-span-12 md:col-span-7 preserve-3d ${reverse ? "md:order-2 md:col-start-6" : ""}`}
        >
          <motion.div
            className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-muted-foreground"
            initial={{ opacity: 0, x: reverse ? 40 : -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="font-semibold text-accent flex items-center gap-1.5">
              <span>№</span>
              <TextScramble text={p.no} speed={40} />
            </span>
            <span className="h-px flex-1 bg-foreground/20" />
            <span>{p.year}</span>
            <span>{p.tag}</span>
          </motion.div>

          <motion.h3
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.75, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 font-display text-4xl font-medium leading-[0.95] tracking-tight sm:text-5xl md:text-7xl group-hover/card:text-accent transition-colors flex items-baseline justify-between"
          >
            <span>{p.title}</span>
            {p.url && (
              <span className="inline-flex items-center justify-center h-10 w-10 md:h-14 md:w-14 rounded-full border border-foreground/15 group-hover/card:border-accent group-hover/card:bg-accent group-hover/card:text-accent-foreground transition-all duration-300 transform group-hover/card:rotate-45 group-hover/card:scale-110 shadow-sm">
                <ArrowUpRight className="h-5 w-5 md:h-7 md:w-7" />
              </span>
            )}
          </motion.h3>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="mt-6 max-w-xl font-serif text-xl italic leading-snug text-foreground/85 md:text-2xl"
          >
            {p.blurb}
          </motion.p>

          <ul className="mt-8 grid grid-cols-1 gap-2.5 font-mono text-xs uppercase tracking-widest sm:grid-cols-2">
            {p.pillars.map((pl, j) => (
              <motion.li
                key={pl}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: 0.25 + j * 0.07, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ x: 6, scale: 1.02 }}
                className="flex items-center gap-3 border-l-2 border-accent pl-3 py-1 bg-foreground/[0.02] rounded-r transition-all group-hover/card:bg-accent/[0.05]"
              >
                <span className="text-muted-foreground font-semibold">0{j + 1}</span>
                <span>{pl}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          style={{ y }}
          className={`col-span-12 md:col-span-4 ${reverse ? "md:order-1 md:col-start-1" : "md:col-start-9"}`}
        >
          <Poster colors={p.palette} label={p.title} no={p.no} />
        </motion.div>
      </div>
    </motion.article>
  );
}

/* ─── Poster ─── */
function Poster({ colors, label, no }: { colors: string[]; label: string; no: string }) {
  const [a, b, c] = colors;
  return (
    <motion.div
      whileHover={{ rotate: -1.5, scale: 1.04 }}
      transition={{ type: "spring", damping: 18, stiffness: 200 }}
      className="relative aspect-3-4 w-full overflow-hidden border border-foreground/20 poster-shadow rounded-sm group/poster"
      style={{ background: c }}
    >
      <div className="absolute inset-0 grain opacity-60 pointer-events-none" />

      {/* CRT Scanline sweep */}
      <div className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-scanline" />

      <div className="absolute left-4 top-4 font-mono text-[10px] uppercase tracking-widest font-semibold" style={{ color: b }}>
        Specimen · {no}
      </div>
      <div className="absolute right-4 top-4 font-mono text-[10px] uppercase tracking-widest flex items-center gap-1.5" style={{ color: b }}>
        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
        <span>300dpi / LIVE</span>
      </div>

      {/* Rotating geometric reticle */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        className="absolute -right-8 -bottom-8 h-36 w-36 rounded-full border border-dashed border-current/25 pointer-events-none"
        style={{ color: b }}
      />

      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute right-6 bottom-8 h-24 w-24 rounded-full"
        style={{ background: a, mixBlendMode: "multiply" }}
      />

      <div className="absolute top-1/4 right-4 flex items-end gap-1 h-8 z-10 opacity-70">
        {["wave-1", "wave-2", "wave-3", "wave-4", "wave-5"].map((cls) => (
          <span key={cls} className={`w-1 bg-current animate-${cls} rounded-full`} style={{ color: b }} />
        ))}
      </div>

      <div className="absolute left-0 right-0 top-1/3 px-4">
        <div className="font-display text-[18vw] md:text-[4.5vw] font-bold leading-[0.85] tracking-tighter transition-transform group-hover/poster:translate-x-1" style={{ color: b }}>
          {label.split(" ").slice(0, 2).join(" ")}
        </div>
      </div>

      <div
        className="absolute bottom-4 left-4 right-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest"
        style={{ color: b }}
      >
        <span>▮▮▮▯▯ — frame 042</span>
        <span className="font-semibold text-accent group-hover/poster:translate-x-1 transition-transform inline-block">VISIT ↗</span>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1.5" style={{ background: a }} />
    </motion.div>
  );
}

/* ─── Profile card ─── */
function ProfileCard() {
  return (
    <article
      tabIndex={0}
      aria-label="Reveal Harshavardhan's portrait"
      className="group relative mt-12 min-h-80 overflow-hidden border border-foreground/20 bg-ink text-paper outline-none transition-all duration-500 hover:-rotate-1 hover:shadow-2xl focus:-rotate-1 md:mt-0 md:min-h-[30rem] rounded-sm"
    >
      <div className="absolute inset-0 grain opacity-60" />
      <div className="relative z-10 flex h-full min-h-80 flex-col p-5 md:min-h-[30rem]">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-paper/70">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            Portrait · 001
          </span>
          <span className="rounded border border-paper/20 px-2 py-0.5">Hover to Reveal</span>
        </div>
        <div className="mt-auto">
          <p className="font-mono text-xs uppercase tracking-widest text-paper/50">Engineer / Creator</p>
        </div>
      </div>

      <div className="absolute inset-0 translate-y-full opacity-0 transition-all duration-700 ease-out group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100">
        <Image
          src="/images/harshavardhan.webp"
          alt="Portrait of Kola Harshavardhan wearing glasses and a white shirt"
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover object-center grayscale transition-transform duration-1000 group-hover:scale-105 group-focus:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/90 via-ink/20 to-transparent" />
        <div className="absolute inset-x-5 bottom-5 flex items-end justify-between font-mono text-[10px] uppercase tracking-widest text-paper">
          <span className="bg-ink/80 px-3 py-2 text-xs font-semibold tracking-[0.2em] text-paper backdrop-blur-sm rounded">
            Kola Harshavardhan
          </span>
          <span className="text-accent font-semibold text-lg">↗</span>
        </div>
      </div>
    </article>
  );
}

/* ─── Skills with stagger reveal ─── */
function Skills() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "15%"]);

  const categoryIcons: Record<string, typeof Code2> = {
    Languages: Code2,
    Interface: Layers,
    Systems: Cpu,
  };

  return (
    <section ref={sectionRef} id="skills" className="relative bg-ink py-24 text-paper md:py-32 overflow-hidden">
      <motion.div
        className="absolute inset-0 bg-grid opacity-15"
        style={{ y: bgY }}
      />
      <Reveal className="relative z-10 px-6 md:px-10">
        <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-paper/60">
          <span className="text-accent font-semibold">§ 03</span>
          <span className="h-px flex-1 bg-paper/20" />
          <span>Toolkit &amp; Architectures</span>
        </div>

        <div className="mt-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <SplitReveal
            text="Skills"
            tag="h2"
            className="font-display text-6xl font-medium leading-[0.9] tracking-tight md:text-9xl font-serif italic text-accent"
            delay={0.1}
          />

          <div className="flex items-center gap-2 border border-paper/15 p-1 rounded-full bg-paper/5 backdrop-blur-sm self-start">
            {["All", "Languages", "Interface", "Systems"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`relative px-4 py-1.5 rounded-full font-mono text-xs uppercase tracking-wider transition-colors ${
                  selectedCategory === cat
                    ? "text-accent-foreground font-semibold"
                    : "text-paper/70 hover:text-paper"
                }`}
              >
                {selectedCategory === cat && (
                  <motion.div
                    layoutId="activeSkillTab"
                    className="absolute inset-0 rounded-full bg-accent -z-10 shadow-md"
                    transition={{ type: "spring", damping: 20, stiffness: 280 }}
                  />
                )}
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-3">
          {Object.entries(skills)
            .filter(([k]) => selectedCategory === "All" || selectedCategory === k)
            .map(([k, v], groupIdx) => {
              const Icon = categoryIcons[k] || Code2;
              return (
                <motion.div
                  key={k}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: groupIdx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="border-t border-paper/20 pt-6"
                >
                  <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-accent">
                    <Icon className="h-4 w-4" />
                    <span>{k}</span>
                  </div>
                  <ul className="mt-6 space-y-4">
                    {v.map((s, itemIdx) => (
                      <motion.li
                        key={s}
                        whileHover={{ x: 12 }}
                        transition={{ type: "spring", damping: 15, stiffness: 300 }}
                        className="group flex items-center justify-between border-b border-paper/10 pb-3 cursor-default"
                      >
                        <span className="font-display text-3xl font-medium md:text-4xl group-hover:text-accent transition-colors flex items-center gap-3">
                          <span>{s}</span>
                        </span>
                        <div className="flex items-center gap-3">
                          {/* Animated kinetic frequency mini equalizer on hover */}
                          <div className="hidden group-hover:flex items-end gap-0.5 h-3">
                            {["animate-wave-1", "animate-wave-2", "animate-wave-3", "animate-wave-4"].map((anim, wIdx) => (
                              <span key={wIdx} className={`w-0.5 bg-accent ${anim} rounded-full`} />
                            ))}
                          </div>
                          <span className="font-mono text-xs text-paper/40 group-hover:text-accent font-semibold transition-colors">
                            0{itemIdx + 1} · Active
                          </span>
                        </div>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
        </div>

        <div className="mt-20 flex flex-wrap items-center gap-3 pt-8 border-t border-paper/15 font-mono text-xs uppercase tracking-wider text-paper/70">
          <span className="text-accent font-semibold flex items-center gap-1.5 mr-2">
            <Sparkles className="h-3.5 w-3.5" /> Specializations:
          </span>
          {[
            "Adaptive Learning Engines",
            "Generative AI Dashboards",
            "Framer Motion Systems",
            "Next.js Turbopack",
            "TypeScript Workflows",
            "n8n Automation Pipelines",
          ].map((spec, i) => (
            <motion.span
              key={spec}
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              whileHover={{ scale: 1.06, borderColor: "rgba(255, 59, 31, 0.8)", color: "#ff3b1f" }}
              className="rounded-full border border-paper/20 px-3 py-1 bg-paper/5 transition-colors cursor-default"
            >
              {spec}
            </motion.span>
          ))}
        </div>
      </Reveal>
    </section>
  );
}

/* ─── About with scroll-driven parallax ─── */
function About() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const quoteY = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <section ref={ref} id="about" className="relative bg-paper py-24 text-ink md:py-32 overflow-hidden">
      {/* Large ambient number */}
      <motion.div
        className="absolute right-0 top-0 font-display font-bold text-foreground/[0.03] text-[20vw] leading-none pointer-events-none select-none"
        style={{ y: quoteY }}
      >
        04
      </motion.div>

      <Reveal className="grid grid-cols-12 gap-8 px-6 md:px-10 relative z-10">
        <div className="col-span-12 md:col-span-4">
          <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span className="text-accent font-semibold">§ 04</span>
            <span className="h-px w-12 bg-foreground/20" />
            <TextScramble text="Studio & Academic Track" />
          </div>

          <p className="mt-8 font-mono text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-accent" />
            <TextScramble text="Academic Milestones" />
          </p>

          <div className="mt-6 space-y-6 relative pl-2">
            <div className="absolute left-[9px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-accent via-foreground/30 to-foreground/10" />

            {[
              {
                title: "B.Tech, ECE",
                sub: "VEMU Institute of Technology",
                date: "2023 — 2027 · CGPA 8.9",
                active: true,
              },
              {
                title: "Intermediate · MPC",
                sub: "Sri Chaitanya Junior College",
                date: "2021 — 2023 · 844 Marks",
                active: false,
              },
              {
                title: "SSC",
                sub: "Sri Venkateswara Children High School",
                date: "2021 · 600 Marks",
                active: false,
              },
            ].map((item, idx) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.12, ease: [0.16, 1, 0.3, 1] }}
                className="relative pl-6"
              >
                <div
                  className={`absolute -left-[3px] top-1.5 h-3 w-3 rounded-full ring-4 ${
                    item.active ? "bg-accent ring-accent/20" : "bg-foreground/40 ring-foreground/10"
                  }`}
                />
                <div className={`border-l-2 pl-4 py-1 ${item.active ? "border-accent" : "border-foreground/30"}`}>
                  <p className="font-display text-xl font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground">{item.sub}</p>
                  <p className={`font-mono text-xs mt-0.5 font-semibold ${item.active ? "text-accent" : "text-muted-foreground"}`}>
                    {item.date}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="col-span-12 md:col-span-7 md:col-start-6">
          <motion.p
            style={{ y: quoteY }}
            className="font-serif text-4xl italic leading-[1.08] md:text-6xl"
          >
            I build at the seam between{" "}
            <span className="text-accent underline decoration-accent/40 decoration-wavy underline-offset-4">
              code
            </span>
            , AI, and kinetic visual systems — utilizing React, Python, JavaScript, Java, and automation pipelines to create products that feel clear, fast, and remarkably alive.
          </motion.p>

          <div className="mt-12 grid grid-cols-2 gap-6 border-t border-foreground/15 pt-8 font-mono text-xs uppercase tracking-widest md:grid-cols-4">
            {[
              { label: "Shipped projects", value: <AnimatedCounter value={2} />, accent: false },
              { label: "Current CGPA", value: <AnimatedCounter value={8.9} decimals={1} />, accent: true },
              { label: "Core stacks", value: <AnimatedCounter value={3} />, accent: false },
              {
                label: "Curiosity loops",
                value: (
                  <motion.span
                    className="inline-block"
                    animate={{ rotate: [0, 360] }}
                    transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
                  >
                    ∞
                  </motion.span>
                ),
                accent: false,
              },
            ].map((stat, idx) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
              >
                <div className={`font-display text-4xl font-medium ${stat.accent ? "text-accent" : "text-foreground"}`}>
                  {stat.value}
                </div>
                <div className="mt-2 text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ─── Contact ─── */
function Contact({ onCopy }: { onCopy: (msg: string) => void }) {
  const links = [
    { label: "harshavardhan.kola123@gmail.com", href: "mailto:harshavardhan.kola123@gmail.com", icon: Mail, copyText: "harshavardhan.kola123@gmail.com", copyLabel: "Email copied!" },
    { label: "+91 99890 90270", href: "tel:+919989090270", icon: Phone, copyText: "+91 99890 90270", copyLabel: "Phone number copied!" },
    { label: "GitHub", href: "https://github.com", icon: Github },
    { label: "LinkedIn", href: "https://linkedin.com", icon: Linkedin },
  ];

  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start end", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 0.5], [0.95, 1]);

  return (
    <section ref={sectionRef} id="contact" className="relative overflow-hidden bg-accent py-24 text-accent-foreground md:py-32">
      <div className="absolute inset-0 bg-grid opacity-30" />

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -bottom-20 h-96 w-96 rounded-full bg-white/10 blur-[90px]"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-white/10 blur-[80px]"
        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 3 }}
      />

      <motion.div style={{ scale }} className="relative z-10 px-6 md:px-10">
        <Reveal>
          <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest opacity-80">
            <span>§ 05</span>
            <span className="h-px flex-1 bg-current opacity-30" />
            <TextScramble text="Commission & Collaborations" />
          </div>

          <SplitReveal
            text="Let's build something that moves."
            tag="h2"
            className="mt-8 font-display text-6xl font-medium leading-[0.88] tracking-[-0.04em] sm:text-7xl md:text-[10vw]"
            delay={0.15}
            stagger={0.04}
          />

          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-2">
            {links.map((l, idx) => (
              <Magnetic key={l.label}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: idx * 0.1 }}
                  className="group flex items-center justify-between border-y border-current/30 py-6 transition-all duration-300 hover:bg-ink/10 px-3 rounded"
                >
                  <a
                    href={l.href}
                    target={l.href.startsWith("http") ? "_blank" : undefined}
                    rel="noreferrer"
                    className="flex items-center gap-4 flex-1"
                  >
                    <l.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-display text-xl md:text-2xl truncate">{l.label}</span>
                  </a>

                  <div className="flex items-center gap-2">
                    {l.copyText && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(l.copyText!);
                          onCopy(l.copyLabel || "Copied to clipboard!");
                        }}
                        className="p-2 rounded-full hover:bg-current/15 transition-colors"
                        title="Copy to clipboard"
                        aria-label={`Copy ${l.label}`}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                    <a
                      href={l.href}
                      target={l.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="p-1"
                    >
                      <ArrowUpRight className="h-6 w-6 transition-transform group-hover:rotate-45" />
                    </a>
                  </div>
                </motion.div>
              </Magnetic>
            ))}
          </div>

          <div className="mt-20 flex flex-col md:flex-row items-baseline md:items-end justify-between gap-4 font-mono text-xs uppercase tracking-widest opacity-80">
            <span>© 2026 — Kola Harshavardhan · All Rights Reserved</span>
            <span>Set in Space Grotesk · Instrument Serif · JetBrains Mono</span>
          </div>
        </Reveal>
      </motion.div>
    </section>
  );
}

/* ─── ROOT PORTFOLIO ─── */
export function Portfolio() {
  const [showProjects, setShowProjects] = useState(true);
  const [showCertifications, setShowCertifications] = useState(true);
  const [selectedCert, setSelectedCert] = useState<CertificateItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleCopyToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2800);
  };

  const certificatesData: CertificateItem[] = [
    {
      title: "AI Learning Lab",
      issuer: "Google Developer Experts · July 2026",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202026-09-17%20115553-PIundp0fwFSp0JfQz08b99D0pwuv9l.png",
      href: "/certificates/google-ai-learning-lab.pdf",
    },
    {
      title: "GenAI-Powered Data Analytics",
      issuer: "Tata / Forage · January 2026",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202026-09-17%20115428-qhBlay9DKXs0mPdVpWqRYVFOoTjk9d.png",
      href: "/certificates/tata-genai-powered-data-analytics.pdf",
    },
    {
      title: "AI and n8n Internship",
      issuer: "Kairokume Pvt. Ltd. · June–July 2026",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202026-09-17%20115825-Hr3dsfSlHlS4yQo4FCHiP4TFCfc5Ij.png",
      href: "/certificates/ai-n8n-internship.pdf",
    },
    {
      title: "JavaScript (Basic)",
      issuer: "HackerRank · August 2026",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202026-09-17%20114913-GS2Ku6skmVij22PFjES2Of32m3zE7T.png",
      href: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202026-09-17%20114913-GS2Ku6skmVij22PFjES2Of32m3zE7T.png",
    },
    {
      title: "Python (Basic)",
      issuer: "HackerRank · August 2026",
      image: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202026-09-17%20114933-uTNWaO15ljCO1J5r7q1zSevTmUFyuQ.png",
      href: "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Screenshot%202026-09-17%20114933-uTNWaO15ljCO1J5r7q1zSevTmUFyuQ.png",
    },
  ];

  return (
    <main className="relative">
      <SmoothScroll />
      <KineticCanvas />
      <FloatingGlyphs />
      <ScrollProgress />
      <Cursor />
      <FloatingNav />
      <Toast message={toastMessage} />
      <CertificateModal certificate={selectedCert} onClose={() => setSelectedCert(null)} />

      <Hero />
      <Marquee
        items={[
          "React Development",
          "Python Automation",
          "JavaScript Interfaces",
          "Java Applications",
          "AI Prototyping",
          "Workflow Automation",
        ]}
      />

      {/* Selected Work */}
      <section id="projects" className="bg-paper">
        <div className="pt-24" />
        <div className="grid grid-cols-1 gap-8 px-6 pb-16 md:grid-cols-12 md:items-end md:px-10">
          <div className="md:col-span-7">
            <Reveal>
              <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                <span className="text-accent font-semibold">§ 02</span>
                <span className="h-px flex-1 bg-foreground/20" />
                <TextScramble text="Selected Work · 2024—2026" />
              </div>

              <button
                type="button"
                aria-expanded={showProjects}
                onClick={() => setShowProjects((v) => !v)}
                className="group mt-6 flex items-center gap-5 text-left"
              >
                <h2 className="font-display text-6xl font-medium leading-[0.9] tracking-tight md:text-8xl">
                  <span className="font-serif italic text-accent transition-colors group-hover:text-ink">
                    Projects
                  </span>
                </h2>
                <span className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-transform group-hover:translate-y-0.5 border border-foreground/20 rounded-full px-3 py-1">
                  {showProjects ? "Collapse ↑" : "Expand [02] ↓"}
                </span>
              </button>
            </Reveal>
          </div>

          <div className="md:col-span-4 md:col-start-9">
            <ProfileCard />
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showProjects && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              {projects.map((p, i) => (
                <ProjectCard key={p.no} p={p} i={i} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* Certifications */}
      <section id="certifications" className="bg-paper px-6 py-24 md:px-10 md:py-32 border-t border-foreground/15">
        <Reveal>
          <div className="flex items-center gap-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            <span className="text-accent font-semibold">§ 03</span>
            <span className="h-px flex-1 bg-foreground/20" />
            <TextScramble text="Credential Archive" />
          </div>

          <button
            type="button"
            aria-expanded={showCertifications}
            onClick={() => setShowCertifications((v) => !v)}
            className="group mt-6 flex items-center gap-5 text-left"
          >
            <h2 className="font-display text-6xl font-medium leading-[0.9] tracking-tight md:text-8xl">
              <span className="font-serif italic text-accent transition-colors group-hover:text-ink">
                Certifications
              </span>
            </h2>
            <span className="mt-3 font-mono text-xs uppercase tracking-widest text-muted-foreground border border-foreground/20 rounded-full px-3 py-1">
              {showCertifications ? "Collapse ↑" : "Expand [05] ↓"}
            </span>
          </button>
        </Reveal>

        <AnimatePresence initial={false}>
          {showCertifications && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
                {certificatesData.map((certificate, index) => (
                  <motion.div
                    key={certificate.title}
                    initial={{ opacity: 0, y: 40, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6, delay: index * 0.09, ease: [0.16, 1, 0.3, 1] }}
                    whileHover={{ y: -10, scale: 1.025 }}
                    onClick={() => setSelectedCert(certificate)}
                    className="group relative cursor-pointer border border-foreground/15 bg-background p-4 shadow-sm transition-all duration-300 hover:border-accent hover:shadow-xl rounded-sm overflow-hidden"
                  >
                    {/* Hover gleam & holographic shimmer */}
                    <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/25 to-transparent -skew-x-12" />
                    <div className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(circle_at_top_right,rgba(255,59,31,0.12),transparent_70%)]" />

                    <div className="aspect-[4/3] overflow-hidden bg-muted rounded-sm relative">
                      <img
                        src={certificate.image}
                        alt={`${certificate.title} certificate preview`}
                        className="h-full w-full object-cover grayscale transition duration-500 group-hover:grayscale-0 group-hover:scale-105"
                      />
                      <div className="absolute top-2 right-2 rounded-full bg-ink/80 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-paper backdrop-blur-sm flex items-center gap-1.5 shadow-sm">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
                        <span>Verified ✦</span>
                      </div>
                    </div>

                    <div className="px-1 pb-1 pt-5">
                      <h3 className="font-display text-2xl font-medium leading-snug group-hover:text-accent transition-colors">
                        {certificate.title}
                      </h3>
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {certificate.issuer}
                      </p>
                      <div className="mt-4 flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-accent">
                        <span>View credential</span>
                        <ArrowUpRight className="h-4 w-4 transition-transform group-hover:rotate-45" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <Marquee
        reverse
        items={[
          "Adaptive Learning",
          "Conversational AI",
          "Medical AI Support",
          "Predictive Tracking",
          "LLM Feedback",
          "Accessible Dashboards",
        ]}
      />
      <Skills />
      <About />
      <Contact onCopy={handleCopyToast} />
    </main>
  );
}
