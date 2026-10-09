"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { setScrollLocked } from "@/components/SmoothScroll";
import { playEnvelopeOpen } from "@/lib/sounds";

/* Seconds from the click at which each beat of the opening starts */
const T = { flap: 0.3, letter: 0.95, zoom: 1.7, fade: 2.35, done: 2.9 };

type Stage = "closed" | "seal" | "flap" | "letter" | "zoom" | "fade";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;

/* Cover art, cross-fading every few seconds while the envelope is sealed */
const ART = [1, 2, 3, 4, 5].map((n) => `/images/envelope/0${n}.webp`);
const ART_INTERVAL = 3000;

/* Flap height as a share of the envelope; the art inside it is scaled back up by the same factor */
const FLAP = 56;

/* Petals drifting across the backdrop — fixed values so server and client render the same */
const PETALS = Array.from({ length: 16 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  size: 7 + ((i * 5) % 8),
  duration: 9 + ((i * 3) % 8),
  delay: -((i * 1.7) % 12),
  drift: ((i % 5) - 2) * 9,
}));

/* The envelope's artwork: every image stacked, only the current one visible, slowly pushing in */
function CoverArt({ index, sizes }: { index: number; sizes: string }) {
  return (
    <>
      {ART.map((src, i) => (
        <motion.div
          key={src}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: i === index ? 1 : 0, scale: i === index ? 1.1 : 1 }}
          transition={{
            opacity: { duration: 1.1, ease: "easeInOut" },
            scale: i === index ? { duration: ART_INTERVAL / 1000 + 1.2, ease: "linear" } : { duration: 0, delay: 1.2 },
          }}
        >
          <Image src={src} alt="" fill sizes={sizes} loading="eager" className="object-cover" />
        </motion.div>
      ))}
    </>
  );
}

/* ─── Envelope gate: the site stays sealed until the wax seal is clicked ─── */
export function Envelope({ onOpen }: { onOpen: () => void }) {
  const [stage, setStage] = useState<Stage>("closed");
  const [done, setDone] = useState(false);
  const [artIndex, setArtIndex] = useState(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Keep the page still behind the envelope
  useEffect(() => {
    if (done) return;
    setScrollLocked(true);
    const overlay = overlayRef.current;
    const block = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };
    overlay?.addEventListener("wheel", block, { passive: false });
    overlay?.addEventListener("touchmove", block, { passive: false });
    return () => {
      setScrollLocked(false);
      overlay?.removeEventListener("wheel", block);
      overlay?.removeEventListener("touchmove", block);
    };
  }, [done]);

  // Rotate the cover art until the seal is broken
  useEffect(() => {
    if (stage !== "closed") return;
    const id = setInterval(() => setArtIndex((i) => (i + 1) % ART.length), ART_INTERVAL);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const open = () => {
    if (stage !== "closed") return;
    playEnvelopeOpen({ flap: T.flap, letter: T.letter, reveal: T.zoom });
    setStage("seal");
    const at = (seconds: number, fn: () => void) => timers.current.push(setTimeout(fn, seconds * 1000));
    at(T.flap, () => setStage("flap"));
    at(T.letter, () => setStage("letter"));
    at(T.zoom, () => setStage("zoom"));
    // The letter now covers the screen — let the page behind start its entrance
    at(T.zoom + 0.2, onOpen);
    at(T.fade, () => setStage("fade"));
    at(T.done, () => setDone(true));
  };

  const opened = stage !== "closed";
  const flapOpen = stage !== "closed" && stage !== "seal";
  const letterOut = stage === "letter" || stage === "zoom" || stage === "fade";
  const zooming = stage === "zoom" || stage === "fade";

  if (done) return null;

  return (
    <motion.div
      ref={overlayRef}
      className="fixed inset-0 z-[210] flex flex-col items-center justify-center overflow-hidden bg-[#0b0a0d] text-[#f5f1e8]"
      animate={{ opacity: stage === "fade" ? 0 : 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ pointerEvents: zooming ? "none" : "auto" }}
    >
      {/* Sunset glow behind the envelope */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute h-[80vmin] w-[80vmin] rounded-full blur-[110px]"
        style={{ background: "radial-gradient(circle, rgba(255,59,31,0.3), rgba(255,140,170,0.12) 45%, transparent 70%)" }}
        animate={{ scale: opened ? 1.5 : [1, 1.12, 1], opacity: zooming ? 0 : opened ? 0.9 : [0.55, 0.8, 0.55] }}
        transition={opened ? { duration: 0.8, ease: EASE_OUT } : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Falling petals */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        animate={{ opacity: zooming ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        {PETALS.map((p, i) => (
          <span
            key={i}
            className="petal"
            style={
              {
                left: `${p.left}%`,
                width: p.size,
                height: p.size * 0.72,
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
                "--drift": `${p.drift}vw`,
              } as React.CSSProperties
            }
          />
        ))}
      </motion.div>

      <motion.div
        className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5 font-mono text-xs uppercase tracking-widest text-[#f5f1e8]/55 md:px-10"
        animate={{ opacity: opened ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        <span>K · H — Studio / 2026</span>
        <span className="flicker font-semibold text-accent">● 封印 · sealed</span>
      </motion.div>

      {/* Vertical title, manga-cover style */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-1/2 hidden -translate-y-1/2 font-serif text-2xl tracking-[0.5em] text-[#f5f1e8]/25 lg:block"
        style={{ writingMode: "vertical-rl" }}
        animate={{ opacity: opened ? 0 : 1 }}
        transition={{ duration: 0.4 }}
      >
        ポートフォリオ
      </motion.div>

      {/* Envelope */}
      <motion.div
        className="relative aspect-[3/2] w-[min(96vw,calc((100dvh-6.5rem)*1.5))] [container-type:inline-size]"
        style={{ perspective: 1400 }}
        initial={{ opacity: 0, y: 40, scale: 0.94 }}
        animate={
          zooming
            ? { opacity: 1, y: 60, scale: 1 }
            : opened
              ? { opacity: 1, y: 30, scale: 1 }
              : { opacity: 1, y: [0, -8, 0], scale: 1 }
        }
        transition={
          opened
            ? { duration: 0.7, ease: EASE_OUT }
            : { opacity: { duration: 0.8 }, scale: { duration: 0.8, ease: EASE_OUT }, y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" } }
        }
      >
        {/* Back panel + inside of the envelope */}
        <motion.div
          className="absolute inset-0 rounded-md"
          style={{ background: "linear-gradient(180deg, #1a1420 0%, #2a1c22 70%)", boxShadow: "0 40px 80px -20px rgba(0,0,0,0.8), 0 0 0 1px rgba(245,241,232,0.12)" }}
          animate={{ opacity: zooming ? 0 : 1 }}
          transition={{ duration: 0.35 }}
        />

        {/* Letter — rises out, then grows until it becomes the page */}
        <motion.div
          className="absolute inset-x-[6%] top-[6%] flex h-[88%] flex-col justify-between bg-paper p-[5%] text-ink shadow-lg"
          style={{ zIndex: zooming ? 50 : 10, borderRadius: 3 }}
          animate={zooming ? { y: "-22%", scale: 6 } : letterOut ? { y: "-60%", scale: 1 } : { y: "0%", scale: 1 }}
          transition={zooming ? { duration: 0.85, ease: EASE_IN_OUT } : { duration: 0.75, ease: EASE_OUT }}
        >
          <motion.div
            className="flex h-full flex-col justify-between"
            animate={{ opacity: zooming ? 0 : 1 }}
            transition={{ duration: 0.25 }}
          >
            <div className="flex items-center justify-between font-mono text-[max(9px,1.5cqw)] uppercase tracking-widest text-muted-foreground">
              <span>Issue №01 — Portfolio</span>
              <span className="text-accent">● 2026</span>
            </div>
            <div>
              <p className="font-display text-[9.5cqw] font-medium leading-[0.85] tracking-tighter">
                KOLA
                <br />
                HARSHAVARDHAN<span className="text-accent">.</span>
              </p>
              <p className="mt-[1.5cqw] font-serif text-[max(13px,3cqw)] italic text-foreground/70">React developer and AI builder</p>
            </div>
          </motion.div>
        </motion.div>

        {/* Front pocket: the cover art, with the side and bottom folds shaded in */}
        <motion.div
          className="absolute inset-0 overflow-hidden rounded-md"
          style={{ zIndex: 20, clipPath: `polygon(0 0, 50% ${FLAP - 2}%, 100% 0, 100% 100%, 0 100%)` }}
          animate={{ opacity: zooming ? 0 : 1 }}
          transition={{ duration: 0.35 }}
        >
          <CoverArt index={artIndex} sizes="92vw" />
          {/* Side folds sit slightly in shadow, the bottom fold catches the light */}
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,6,12,0.34), rgba(8,6,12,0.2))" }} />
          <div
            className="absolute inset-0"
            style={{
              clipPath: "polygon(0 100%, 50% 44%, 100% 100%)",
              background: "linear-gradient(180deg, rgba(255,255,255,0.2), rgba(255,255,255,0.03) 55%)",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />

          <div className="absolute inset-x-[5%] bottom-[6%] flex items-end justify-between font-mono text-[max(9px,1.4cqw)] uppercase tracking-widest text-white/85">
            <span className="flex items-center gap-2">
              <span className="font-semibold text-accent">{`0${artIndex + 1}`}</span>
              <span className="flex gap-1">
                {ART.map((src, i) => (
                  <motion.span
                    key={src}
                    className="h-[2px] rounded-full bg-white"
                    animate={{ width: i === artIndex ? 18 : 6, opacity: i === artIndex ? 1 : 0.4 }}
                    transition={{ duration: 0.5, ease: EASE_OUT }}
                  />
                ))}
              </span>
            </span>
            <span className="text-right font-poster normal-case tracking-normal text-white" style={{ textShadow: "0 2px 18px rgba(0,0,0,0.65)" }}>
              <span className="block text-[max(9px,1.25cqw)] tracking-[0.35em] text-accent">ハルシャ・ハリー</span>
              <span className="mt-[0.4cqw] block text-[max(14px,2.6cqw)] leading-none tracking-[0.04em]">HARSHA HARRY</span>
            </span>
          </div>
        </motion.div>

        {/* Top flap — swings open around the top edge, then tucks behind the letter */}
        <motion.div
          className="absolute inset-x-0 top-0 origin-top"
          style={{ height: `${FLAP}%`, zIndex: letterOut ? 5 : 30, transformStyle: "preserve-3d" }}
          animate={{ rotateX: flapOpen ? 180 : 0, opacity: zooming ? 0 : 1 }}
          transition={{ rotateX: { duration: 0.7, ease: EASE_IN_OUT }, opacity: { duration: 0.35 } }}
        >
          {/* Outside: the same artwork, lined up with the pocket below */}
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)", backfaceVisibility: "hidden" }}
          >
            <div className="absolute inset-x-0 top-0" style={{ height: `${10000 / FLAP}%` }}>
              <CoverArt index={artIndex} sizes="92vw" />
            </div>
            <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.1), rgba(8,6,12,0.28))" }} />
          </div>
          {/* Inside: plain lining, seen once the flap is open */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: "polygon(0 0, 100% 0, 50% 100%)",
              backfaceVisibility: "hidden",
              transform: "rotateX(180deg)",
              background: "linear-gradient(0deg, #3a2630 0%, #241a26 100%)",
            }}
          />
        </motion.div>

        {/* Wax seal — the button that opens everything */}
        <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: `${FLAP - 2}%`, zIndex: 40 }}>
          <AnimatePresence>
            {!opened && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-accent"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.9, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
          <motion.button
            type="button"
            onClick={open}
            disabled={opened}
            aria-label="Open the envelope to enter the portfolio"
            data-cursor="Open"
            whileHover={opened ? undefined : { scale: 1.1, rotate: -6 }}
            whileTap={opened ? undefined : { scale: 0.9 }}
            animate={{ scale: stage === "seal" ? 0.84 : 1 }}
            transition={{ type: "spring", damping: 14, stiffness: 260 }}
            className="relative block h-[max(4rem,13cqw)] w-[max(4rem,13cqw)] cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#f5f1e8] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0a0d]"
          >
            {/* Two halves of the same seal, so it can crack down the middle */}
            {[
              { clip: "inset(0 50% 0 0)", x: -26, rotate: -28 },
              { clip: "inset(0 0 0 50%)", x: 26, rotate: 28 },
            ].map((half) => (
              <motion.span
                key={half.clip}
                className="absolute inset-0 flex items-center justify-center rounded-full font-serif text-[max(1.875rem,6cqw)] text-[#f5f1e8]"
                style={{
                  clipPath: half.clip,
                  background: "radial-gradient(circle at 35% 30%, #ff6a4d 0%, #e02a12 55%, #a81a08 100%)",
                  boxShadow: "inset 0 0 0 3px rgba(255,255,255,0.14), inset 0 -6px 10px rgba(0,0,0,0.25)",
                }}
                animate={flapOpen ? { x: half.x, y: 34, rotate: half.rotate, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.55, ease: [0.5, 0, 0.75, 0] }}
              >
                開
              </motion.span>
            ))}
          </motion.button>
        </div>
      </motion.div>

      <motion.p
        className="absolute inset-x-0 bottom-3 text-center font-mono text-xs uppercase tracking-widest text-[#f5f1e8]/60"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: opened ? 0 : 1, y: 0 }}
        transition={{ duration: 0.5, delay: opened ? 0 : 0.6 }}
      >
        封を切る — Click the seal to open <span className="text-accent">↑</span>
      </motion.p>
    </motion.div>
  );
}
