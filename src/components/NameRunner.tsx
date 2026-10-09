"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

interface NameRunnerProps {
  /* Positioned element the runner is drawn inside (the hero title) */
  containerRef: React.RefObject<HTMLElement | null>;
  /* First line of the name — the main platform */
  line1Ref: React.RefObject<HTMLElement | null>;
  /* Second line — its letters to the right of line one form a lower ledge */
  line2Ref: React.RefObject<HTMLElement | null>;
  /* Milliseconds to wait for the title's entrance before dropping in */
  startDelay?: number;
}

const DIR = "/images/hero-runner";
const IDLE = 0;
const RUN = [1, 2, 3, 4, 5, 6, 7, 8];
const JUMP = [9, 10, 11, 12, 13];
const FRAMES = ["idle", ...RUN.map((_, i) => `run_${i}`), ...JUMP.map((_, i) => `jump_${i}`)].map((n) => `${DIR}/${n}.png`);

/* Sprites are 128×160 with the feet 8px above the bottom edge */
const SPRITE_ASPECT = 128 / 160;
const FOOT_PAD = 8 / 160;

type Platform = { x1: number; x2: number; y: number };
type Action =
  | { kind: "drop"; x: number; y: number }
  | { kind: "run"; x: number }
  | { kind: "jump"; x: number; y: number; height: number; spin?: boolean }
  | { kind: "idle"; seconds: number };

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/* ─── A small character that runs, jumps and plays on top of the hero name ─── */
export function NameRunner({ containerRef, line1Ref, line2Ref, startDelay = 2400 }: NameRunnerProps) {
  const reduceMotion = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const dustRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (reduceMotion) return;
    const container = containerRef.current;
    const wrap = wrapRef.current;
    const body = bodyRef.current;
    if (!container || !wrap || !body) return;
    const sprites = Array.from(body.querySelectorAll("img"));

    let charH = 60;
    let charW = charH * SPRITE_ASPECT;
    let fontSize = 160;
    let script: Action[] = [];

    // Where the tops of the letters are, in the container's own coordinates
    const measure = () => {
      const line1 = line1Ref.current;
      const line2 = line2Ref.current;
      if (!line1 || !line2 || line1.children.length === 0) return false;

      const box = container.getBoundingClientRect();
      const scale = box.width / container.offsetWidth || 1;
      const style = getComputedStyle(line1);
      fontSize = parseFloat(style.fontSize);

      // Cap height from the real font, so feet land exactly on the letter tops
      const ctx = document.createElement("canvas").getContext("2d");
      if (!ctx) return false;
      ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
      const capHeight = ctx.measureText("H").actualBoundingBoxAscent || fontSize * 0.7;

      // A zero-size inline box sits on the text baseline
      const capTop = (letter: Element) => {
        const probe = document.createElement("span");
        probe.style.cssText = "display:inline-block;width:0;height:0";
        letter.appendChild(probe);
        const baseline = probe.getBoundingClientRect().bottom;
        letter.removeChild(probe);
        return (baseline - box.top) / scale - capHeight;
      };
      const edges = (first: Element, last: Element) => ({
        x1: (first.getBoundingClientRect().left - box.left) / scale,
        x2: (last.getBoundingClientRect().right - box.left) / scale,
      });

      charH = Math.max(44, Math.min(96, fontSize * 0.36));
      charW = charH * SPRITE_ASPECT;
      wrap.style.width = `${charW}px`;
      wrap.style.height = `${charH}px`;

      const pad = charW * 0.45;
      const letters1 = line1.children;
      const top: Platform = { ...edges(letters1[0], letters1[letters1.length - 1]), y: capTop(letters1[0]) };
      top.x1 += pad;
      top.x2 -= pad;

      // Line two's letters (not its trailing dash) that stick out to the right of line one
      const letters2 = Array.from(line2.children).slice(0, -1);
      let ledge: Platform | null = null;
      if (letters2.length > 0) {
        const span = edges(letters2[0], letters2[letters2.length - 1]);
        const x1 = top.x2 + pad + charW * 0.9;
        const x2 = span.x2 - pad;
        if (x2 - x1 > charW * 1.5) ledge = { x1, x2, y: capTop(letters2[0]) };
      }

      const mid = (top.x1 + top.x2) / 2;
      const hop = (x: number, y: number, height: number, spin = false): Action => ({ kind: "jump", x, y, height, spin });
      script = [
        { kind: "drop", x: top.x1, y: top.y },
        { kind: "idle", seconds: 0.5 },
        { kind: "run", x: top.x2 },
        ...(ledge
          ? ([
              hop(ledge.x1, ledge.y, 0.9),
              { kind: "run", x: ledge.x2 },
              { kind: "idle", seconds: 0.6 },
              hop(ledge.x2, ledge.y, 0.8),
              hop(ledge.x2, ledge.y, 1.3, true),
              { kind: "idle", seconds: 0.5 },
              { kind: "run", x: ledge.x1 },
              hop(top.x2, top.y, 1.5),
            ] as Action[])
          : ([{ kind: "idle", seconds: 0.5 }, hop(top.x2, top.y, 0.9), hop(top.x2, top.y, 1.3, true)] as Action[])),
        { kind: "run", x: mid },
        hop(mid, top.y, 1.4, true),
        { kind: "idle", seconds: 0.7 },
        { kind: "run", x: top.x1 },
        hop(top.x1, top.y, 0.8),
        { kind: "idle", seconds: 0.9 },
      ];
      return true;
    };

    // Runner state
    let step = 0;
    let elapsed = 0;
    let x = 0;
    let y = 0;
    let fromX = 0;
    let fromY = 0;
    let facing = 1;
    let frame = -1;
    let landed = false;

    const show = (index: number) => {
      if (index === frame) return;
      if (frame >= 0) sprites[frame].style.opacity = "0";
      sprites[index].style.opacity = "1";
      frame = index;
    };

    const puff = () => {
      const dust = dustRef.current;
      if (!dust) return;
      dust.style.left = `${x - charW * 0.6}px`;
      dust.style.top = `${y - charH * 0.5}px`;
      dust.style.width = `${charW * 1.2}px`;
      dust.animate(
        [
          { opacity: 0.85, transform: "scale(0.6)" },
          { opacity: 0, transform: "scale(1.35)" },
        ],
        { duration: 480, easing: "ease-out" }
      );
    };

    const begin = (index: number) => {
      step = index;
      elapsed = 0;
      fromX = x;
      fromY = y;
      landed = false;
      const action = script[step];
      if (action.kind === "drop") {
        x = fromX = action.x;
        fromY = action.y - charH * 5;
      } else if (action.kind !== "idle" && action.x !== x) {
        facing = action.x > x ? 1 : -1;
      }
    };

    const durationOf = (action: Action) => {
      switch (action.kind) {
        case "drop":
          return 0.75;
        case "run":
          return Math.max(0.25, Math.abs(action.x - fromX) / (fontSize * 1.55));
        case "jump":
          return 0.8 + action.height * 0.22 + Math.abs(action.x - fromX) / (fontSize * 6);
        case "idle":
          return action.seconds;
      }
    };

    const tick = (dt: number) => {
      const action = script[step];
      const duration = durationOf(action);
      elapsed += dt;
      const t = Math.min(1, elapsed / duration);
      let rotate = 0;
      let squashX = 1;
      let squashY = 1;

      if (action.kind === "idle") {
        show(IDLE);
        squashY = 1 + Math.sin(elapsed * 4) * 0.015;
      } else if (action.kind === "run") {
        x = fromX + (action.x - fromX) * t;
        y = fromY - Math.abs(Math.sin(elapsed * 22)) * charH * 0.03;
        rotate = 4;
        show(RUN[Math.floor(elapsed * 14) % RUN.length]);
      } else if (action.kind === "drop") {
        const fall = Math.min(1, t / 0.8);
        y = fromY + (action.y - fromY) * fall * fall;
        if (fall < 1) {
          show(JUMP[3]);
          squashY = 1.08;
          squashX = 0.94;
        } else {
          show(JUMP[4]);
          squashY = 0.86;
          squashX = 1.1;
          if (!landed) {
            landed = true;
            puff();
          }
        }
      } else {
        // Jump: crouch, fly along an arc, land
        const CROUCH = 0.16;
        const LAND = 0.9;
        if (t < CROUCH) {
          show(JUMP[0]);
          squashY = 0.9;
          squashX = 1.06;
        } else if (t < LAND) {
          const u = (t - CROUCH) / (LAND - CROUCH);
          x = fromX + (action.x - fromX) * u;
          y = fromY + (action.y - fromY) * u - 4 * action.height * charH * u * (1 - u);
          show(u < 0.3 ? JUMP[1] : u < 0.72 ? JUMP[2] : JUMP[3]);
          rotate = action.spin ? 360 * easeInOut(u) : -8 + u * 18;
          squashY = 1.05;
          squashX = 0.97;
        } else {
          x = action.x;
          y = action.y;
          show(JUMP[4]);
          squashY = 0.88;
          squashX = 1.08;
          if (!landed) {
            landed = true;
            puff();
          }
        }
      }

      wrap.style.transform = `translate3d(${x - charW / 2}px, ${y - charH + charH * FOOT_PAD}px, 0)`;
      body.style.transform = `scaleX(${facing}) rotate(${rotate}deg) scale(${squashX}, ${squashY})`;

      if (t >= 1) {
        if (action.kind !== "idle") {
          x = action.x;
          if (action.kind !== "run") y = action.y;
          else y = fromY;
        }
        // Loop back past the opening drop
        begin(step + 1 < script.length ? step + 1 : 1);
      }
    };

    let rafId = 0;
    let last = 0;
    let running = false;
    let visible = true;
    let started = false;

    const loop = (now: number) => {
      rafId = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      tick(dt);
    };
    const play = () => {
      if (running || !started || !visible) return;
      running = true;
      last = performance.now();
      rafId = requestAnimationFrame(loop);
    };
    const pause = () => {
      running = false;
      cancelAnimationFrame(rafId);
    };

    // Measure once the title has finished animating in, then drop the runner onto it
    const start = () => {
      if (!measure()) return;
      started = true;
      begin(0);
      tick(0);
      wrap.style.opacity = "1";
      play();
    };
    const startTimer = setTimeout(() => {
      if (document.fonts?.ready) document.fonts.ready.then(start);
      else start();
    }, startDelay);

    // Letters move when the layout changes — measure again and re-enter
    let resizeTimer: ReturnType<typeof setTimeout>;
    let lastWidth = container.offsetWidth;
    const resizeObserver = new ResizeObserver(() => {
      if (!started || container.offsetWidth === lastWidth) return;
      lastWidth = container.offsetWidth;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (measure()) begin(0);
      }, 200);
    });
    resizeObserver.observe(container);

    // Only animate while the name is on screen
    const visibility = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) play();
      else pause();
    });
    visibility.observe(container);

    return () => {
      clearTimeout(startTimer);
      clearTimeout(resizeTimer);
      pause();
      resizeObserver.disconnect();
      visibility.disconnect();
    };
  }, [reduceMotion, containerRef, line1Ref, line2Ref, startDelay]);

  if (reduceMotion) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img ref={dustRef} src={`${DIR}/dust.png`} alt="" className="absolute opacity-0" draggable={false} />
      <div ref={wrapRef} className="absolute left-0 top-0 opacity-0 transition-opacity duration-300" style={{ willChange: "transform" }}>
        <div ref={bodyRef} className="relative h-full w-full" style={{ transformOrigin: "50% 95%", willChange: "transform" }}>
          {FRAMES.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              draggable={false}
              className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_4px_6px_rgba(0,0,0,0.25)]"
              style={{ opacity: 0 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
