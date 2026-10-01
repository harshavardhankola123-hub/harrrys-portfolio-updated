"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useReducedMotion } from "framer-motion";

interface HeroRunnerProps {
  heroRef: React.RefObject<HTMLElement | null>;
  line1Ref: React.RefObject<HTMLElement | null>;
  line2Ref: React.RefObject<HTMLElement | null>;
  line3Ref: React.RefObject<HTMLElement | null>;
  dotRef?: React.RefObject<HTMLElement | null>;
  onStateChange?: (isRunning: boolean) => void;
  autoStartDelay?: number;
}

// Frame asset paths
const RUN_FRAMES = [
  "/images/runner/run_0.png",
  "/images/runner/run_1.png",
  "/images/runner/run_2.png",
  "/images/runner/run_3.png",
  "/images/runner/run_4.png",
  "/images/runner/run_5.png",
  "/images/runner/run_6.png",
  "/images/runner/run_7.png",
];

const JUMP_FRAMES = [
  "/images/runner/jump_0.png",
  "/images/runner/jump_1.png",
  "/images/runner/jump_2.png",
  "/images/runner/jump_3.png",
  "/images/runner/jump_4.png",
];

const EXIT_FRAMES = [
  "/images/runner/exit_0.png",
  "/images/runner/exit_1.png",
  "/images/runner/exit_2.png",
  "/images/runner/exit_3.png",
  "/images/runner/exit_4.png",
  "/images/runner/exit_5.png",
];

const IDLE_FRAME = "/images/runner/idle.png";
const DUST_FRAME = "/images/runner/dust.png";

// Total target duration in seconds (~7.5s for snappy kinetic feel)
const TOTAL_DURATION = 7.5;

export function HeroRunner({
  heroRef,
  line1Ref,
  line2Ref,
  line3Ref,
  dotRef,
  onStateChange,
  autoStartDelay = 1800,
}: HeroRunnerProps) {
  const reduceMotion = useReducedMotion();
  const [isClient, setIsClient] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [hasRunOnce, setHasRunOnce] = useState(false);

  // Direct DOM references for 60 FPS GPU-accelerated updates without React state lag
  const characterRef = useRef<HTMLDivElement>(null);
  const characterImgRef = useRef<HTMLImageElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const labelTextRef = useRef<HTMLSpanElement>(null);
  const dustRef = useRef<HTMLDivElement>(null);

  // Animation state tracking
  const animFrameId = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const runActiveRef = useRef(false);

  // Pre-calculated waypoints
  const waypointsRef = useRef<{
    // Line 1: KOLA
    l1Start: { x: number; y: number };
    l1End: { x: number; y: number };
    // Line 2: HARSHA—
    l2Start: { x: number; y: number };
    l2End: { x: number; y: number };
    // Line 3: VARDHAN.
    l3Start: { x: number; y: number };
    l3End: { x: number; y: number };
    // Exit
    exitPoint: { x: number; y: number };
    charHeight: number;
    charWidth: number;
  } | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Preload frames in background for zero flicker
  useEffect(() => {
    const preload = [...RUN_FRAMES, ...JUMP_FRAMES, ...EXIT_FRAMES, IDLE_FRAME, DUST_FRAME];
    preload.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  // Compute accurate responsive coordinates relative to hero container
  const measureWaypoints = useCallback(() => {
    if (!heroRef.current || !line1Ref.current || !line2Ref.current || !line3Ref.current) {
      return;
    }

    const heroRect = heroRef.current.getBoundingClientRect();
    const l1 = line1Ref.current.getBoundingClientRect();
    const l2 = line2Ref.current.getBoundingClientRect();
    const l3 = line3Ref.current.getBoundingClientRect();

    // Scale character proportionally: ~34px on mobile up to ~48px on desktop
    const charWidth = Math.max(30, Math.min(48, heroRect.width * 0.038));
    const charHeight = charWidth * (160 / 128);

    // Foot placement: characters contact the letters along the baseline
    const l1FootY = l1.top - heroRect.top + l1.height * 0.82;
    const l2FootY = l2.top - heroRect.top + l2.height * 0.82;
    const l3FootY = l3.top - heroRect.top + l3.height * 0.82;

    const waypoints = {
      l1Start: { x: l1.left - heroRect.left - charWidth * 0.1, y: l1FootY },
      l1End: { x: l1.left - heroRect.left + l1.width * 0.98, y: l1FootY },

      l2Start: { x: l2.left - heroRect.left + l2.width * 0.04, y: l2FootY },
      l2End: { x: l2.left - heroRect.left + l2.width * 0.98, y: l2FootY },

      l3Start: { x: l3.left - heroRect.left + l3.width * 0.04, y: l3FootY },
      l3End: { x: l3.left - heroRect.left + l3.width * 0.98, y: l3FootY },

      exitPoint: { x: heroRect.width + 120, y: l3FootY - charHeight * 0.6 },
      charWidth,
      charHeight,
    };

    waypointsRef.current = waypoints;

    // Position character at initial start if not currently running
    if (!runActiveRef.current && characterRef.current && labelRef.current) {
      const initX = waypoints.l1Start.x;
      const initY = waypoints.l1Start.y - charHeight;
      characterRef.current.style.transform = `translate3d(${initX}px, ${initY}px, 0)`;
      characterRef.current.style.opacity = "1";
      if (characterImgRef.current) {
        characterImgRef.current.src = IDLE_FRAME;
      }

      // Position initial label above character
      const labelX = initX - 12;
      const labelY = initY - 26;
      labelRef.current.style.transform = `translate3d(${labelX}px, ${labelY}px, 0)`;
      labelRef.current.style.opacity = "1";
    }
  }, [heroRef, line1Ref, line2Ref, line3Ref]);

  // Handle window resizing and initial measure
  useEffect(() => {
    measureWaypoints();
    window.addEventListener("resize", measureWaypoints);
    const observer = new ResizeObserver(measureWaypoints);
    if (heroRef.current) observer.observe(heroRef.current);

    return () => {
      window.removeEventListener("resize", measureWaypoints);
      observer.disconnect();
    };
  }, [measureWaypoints, heroRef]);

  // Main 60 FPS animation loop
  const startRun = useCallback(() => {
    if (runActiveRef.current || reduceMotion) return;
    measureWaypoints();
    if (!waypointsRef.current) return;

    runActiveRef.current = true;
    setIsRunning(true);
    onStateChange?.(true);
    startTimeRef.current = performance.now();

    if (labelTextRef.current) {
      labelTextRef.current.textContent = "RUNNING ⚡";
    }

    const w = waypointsRef.current;
    const charH = w.charHeight;

    // Normalized progress markers
    const T_L1_END = 0.20;
    const T_JUMP1_END = 0.35;
    const T_L2_END = 0.55;
    const T_JUMP2_END = 0.70;
    const T_L3_END = 0.88;

    let lastRunFrameIdx = -1;
    let lastJumpFrameIdx = -1;
    let lastExitFrameIdx = -1;

    const animate = (currentTime: number) => {
      const elapsed = (currentTime - startTimeRef.current) / 1000;
      const progress = Math.min(1, elapsed / TOTAL_DURATION);

      let currentX = 0;
      let currentFootY = 0;
      let rotation = 0;
      let scaleX = 1;
      let scaleY = 1;
      let currentSrc = IDLE_FRAME;

      if (progress <= T_L1_END) {
        // --- 1. Running across KOLA ---
        const subT = progress / T_L1_END;
        currentX = w.l1Start.x + (w.l1End.x - w.l1Start.x) * subT;
        currentFootY = w.l1Start.y + Math.sin(subT * Math.PI * 8) * 1.5;
        rotation = 5;

        const runFrame = Math.floor(elapsed * 14) % 8;
        if (runFrame !== lastRunFrameIdx) {
          lastRunFrameIdx = runFrame;
          currentSrc = RUN_FRAMES[runFrame];
        }
      } else if (progress <= T_JUMP1_END) {
        // --- 2. Parabolic Jump from KOLA to HARSHA ---
        const subT = (progress - T_L1_END) / (T_JUMP1_END - T_L1_END);
        currentX = w.l1End.x + (w.l2Start.x - w.l1End.x) * subT;
        const baseY = w.l1End.y + (w.l2Start.y - w.l1End.y) * subT;
        const arc = -Math.sin(subT * Math.PI) * (charH * 1.1);
        currentFootY = baseY + arc;

        if (subT < 0.4) {
          rotation = -8;
          scaleX = 0.95;
          scaleY = 1.08;
        } else if (subT < 0.8) {
          rotation = 2;
          scaleX = 1.02;
          scaleY = 1.0;
        } else {
          rotation = 12;
          scaleX = 1.08;
          scaleY = 0.92;
        }

        const jumpIdx = Math.min(4, Math.floor(subT * 5));
        if (jumpIdx !== lastJumpFrameIdx) {
          lastJumpFrameIdx = jumpIdx;
          currentSrc = JUMP_FRAMES[jumpIdx];
        }
      } else if (progress <= T_L2_END) {
        // --- 3. Running across HARSHA— ---
        const subT = (progress - T_JUMP1_END) / (T_L2_END - T_JUMP1_END);
        currentX = w.l2Start.x + (w.l2End.x - w.l2Start.x) * subT;
        currentFootY = w.l2Start.y + Math.sin(subT * Math.PI * 8) * 1.5;
        rotation = 6;

        const runFrame = Math.floor(elapsed * 14) % 8;
        if (runFrame !== lastRunFrameIdx) {
          lastRunFrameIdx = runFrame;
          currentSrc = RUN_FRAMES[runFrame];
        }
      } else if (progress <= T_JUMP2_END) {
        // --- 4. Parabolic Jump from HARSHA to VARDHAN ---
        const subT = (progress - T_L2_END) / (T_JUMP2_END - T_L2_END);
        currentX = w.l2End.x + (w.l3Start.x - w.l2End.x) * subT;
        const baseY = w.l2End.y + (w.l3Start.y - w.l2End.y) * subT;
        const arc = -Math.sin(subT * Math.PI) * (charH * 1.0);
        currentFootY = baseY + arc;

        if (subT < 0.4) {
          rotation = -10;
          scaleX = 0.94;
          scaleY = 1.1;
        } else if (subT < 0.8) {
          rotation = 4;
        } else {
          rotation = 14;
          scaleX = 1.1;
          scaleY = 0.9;
        }

        const jumpIdx = Math.min(4, Math.floor(subT * 5));
        if (jumpIdx !== lastJumpFrameIdx) {
          lastJumpFrameIdx = jumpIdx;
          currentSrc = JUMP_FRAMES[jumpIdx];
        }
      } else if (progress <= T_L3_END) {
        // --- 5. Running across VARDHAN. ---
        const subT = (progress - T_JUMP2_END) / (T_L3_END - T_JUMP2_END);
        currentX = w.l3Start.x + (w.l3End.x - w.l3Start.x) * subT;
        currentFootY = w.l3Start.y + Math.sin(subT * Math.PI * 8) * 1.5;
        rotation = 5;

        // Slight pulse on dot as runner reaches end of VARDHAN
        if (subT > 0.90 && dotRef?.current) {
          dotRef.current.style.transform = "scale(1.4) rotate(180deg)";
          dotRef.current.style.transition = "transform 0.15s ease-out";
        }

        const runFrame = Math.floor(elapsed * 14) % 8;
        if (runFrame !== lastRunFrameIdx) {
          lastRunFrameIdx = runFrame;
          currentSrc = RUN_FRAMES[runFrame];
        }
      } else {
        // --- 6. Final Sprint Offscreen + Leap ---
        const subT = (progress - T_L3_END) / (1 - T_L3_END);
        const easeOutT = Math.pow(subT, 1.25);
        currentX = w.l3End.x + (w.exitPoint.x - w.l3End.x) * easeOutT;
        currentFootY = w.l3End.y - Math.sin(subT * Math.PI * 0.5) * 35;
        rotation = 12 + subT * 12;

        if (subT < 0.5 && dustRef.current) {
          dustRef.current.style.transform = `translate3d(${w.l3End.x - 20}px, ${w.l3End.y - 20}px, 0)`;
          dustRef.current.style.opacity = `${(1 - subT / 0.5) * 0.9}`;
        }

        const exitIdx = Math.floor(elapsed * 16) % 6;
        if (exitIdx !== lastExitFrameIdx) {
          lastExitFrameIdx = exitIdx;
          currentSrc = EXIT_FRAMES[exitIdx];
        }
      }

      // Apply transform to Character
      if (characterRef.current) {
        const posY = currentFootY - charH;
        characterRef.current.style.transform = `translate3d(${currentX}px, ${posY}px, 0) rotate(${rotation}deg) scale(${scaleX}, ${scaleY})`;
      }

      if (characterImgRef.current && currentSrc) {
        characterImgRef.current.src = currentSrc;
      }

      // Smoothly update Label position
      if (labelRef.current) {
        const labelX = currentX - 16;
        const labelY = currentFootY - charH - 24;
        labelRef.current.style.transform = `translate3d(${labelX}px, ${labelY}px, 0)`;

        if (progress > 0.92) {
          labelRef.current.style.opacity = `${(1 - progress) / 0.08}`;
        }
      }

      if (progress < 1) {
        animFrameId.current = requestAnimationFrame(animate);
      } else {
        // Animation finished: cleanly reset back to start position
        setTimeout(() => {
          runActiveRef.current = false;
          setIsRunning(false);
          setHasRunOnce(true);
          onStateChange?.(false);

          if (labelTextRef.current) {
            labelTextRef.current.textContent = "REPLAY RUN ↺";
          }
          if (dotRef?.current) {
            dotRef.current.style.transform = "scale(1)";
          }
          if (dustRef.current) {
            dustRef.current.style.opacity = "0";
          }
          measureWaypoints();
        }, 500);
      }
    };

    animFrameId.current = requestAnimationFrame(animate);
  }, [measureWaypoints, reduceMotion, dotRef, onStateChange]);

  // Auto trigger after page load entrance
  useEffect(() => {
    if (autoStartDelay <= 0) return;
    const timer = setTimeout(() => {
      startRun();
    }, autoStartDelay);
    return () => clearTimeout(timer);
  }, [autoStartDelay, startRun]);

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameId.current) {
        cancelAnimationFrame(animFrameId.current);
      }
    };
  }, []);

  if (!isClient || reduceMotion) return null;

  return (
    <>
      {/* 1. Dust puff element */}
      <div
        ref={dustRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 z-30 w-10 h-8 opacity-0 transition-opacity duration-300"
      >
        <img
          src={DUST_FRAME}
          alt=""
          className="h-full w-full object-contain"
        />
      </div>

      {/* 2. Tiny Editorial Label */}
      <div
        ref={labelRef}
        onClick={startRun}
        className={`pointer-events-auto absolute left-0 top-0 z-40 flex items-center gap-1.5 rounded-full border border-foreground/20 bg-ink px-3 py-1 font-mono text-[9px] uppercase tracking-wider text-paper shadow-lg transition-all duration-200 select-none ${
          isRunning
            ? "cursor-default border-accent"
            : "cursor-pointer hover:bg-accent hover:border-accent hover:scale-105 active:scale-95"
        }`}
        style={{
          willChange: "transform, opacity",
          boxShadow: "0 4px 14px rgba(0,0,0,0.25)",
        }}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            isRunning ? "bg-accent animate-ping" : "bg-accent"
          }`}
        />
        <span ref={labelTextRef} className="font-semibold">
          {isRunning ? "RUNNING ⚡" : hasRunOnce ? "REPLAY RUN ↺" : "CLICK TO RUN ↗"}
        </span>
      </div>

      {/* 3. Tiny Animated Character */}
      <div
        ref={characterRef}
        onClick={startRun}
        className={`pointer-events-auto absolute left-0 top-0 z-35 flex items-center justify-center ${
          isRunning ? "cursor-default" : "cursor-pointer hover:scale-110 active:scale-95 transition-transform"
        }`}
        style={{
          width: waypointsRef.current ? `${waypointsRef.current.charWidth}px` : "40px",
          height: waypointsRef.current ? `${waypointsRef.current.charHeight}px` : "50px",
          willChange: "transform",
          transformOrigin: "bottom center",
        }}
        title={isRunning ? "Character sprinting..." : "Click to trigger running animation"}
        role="button"
        tabIndex={0}
        aria-label="Click to start character running animation"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            startRun();
          }
        }}
      >
        <img
          ref={characterImgRef}
          src={IDLE_FRAME}
          alt="Pixel runner sprite"
          className="h-full w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.22)]"
          draggable={false}
        />
      </div>
    </>
  );
}
