"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { setScrollLocked } from "@/components/SmoothScroll";
import { playEnvelopeOpen } from "@/lib/sounds";

/* Seconds from the click at which each beat of the opening starts */
const T = { doors: 0.6, letter: 1.25, zoom: 2.0, fade: 2.65, done: 3.2 };

type Stage = "closed" | "seal" | "doors" | "letter" | "zoom" | "fade";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const EASE_IN_OUT = [0.76, 0, 0.24, 1] as const;

/* Cover art, cross-fading every few seconds while the envelope is sealed */
const ART = [1, 2, 3, 4, 5].map((n) => `/images/envelope/0${n}.webp`);
const ART_INTERVAL = 3000;

/* How far each front panel swings out from the middle seam, in degrees */
const DOOR_SWING = 128;

/* Gold foil used for the envelope's edging */
const GOLD = "linear-gradient(135deg, #f7e7b4 0%, #c9a257 22%, #8f6a2a 45%, #f3dc9f 62%, #b8893c 82%, #f7e7b4 100%)";
const GOLD_LINE = "rgba(226,196,130,0.6)";

/* Wax chips and gold sparks thrown off as the seal breaks — fixed values, same reason as the petals */
const SHARDS = Array.from({ length: 16 }, (_, i) => {
  const angle = ((i * 360) / 16 + (i % 3) * 9) * (Math.PI / 180);
  const reach = 70 + ((i * 29) % 80);
  return {
    x: Math.cos(angle) * reach,
    y: Math.sin(angle) * reach + 46,
    size: 8 + ((i * 3) % 9),
    spin: ((i % 2 ? 1 : -1) * (140 + i * 22)) % 360,
    gold: i % 3 === 0,
  };
});

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

/* One half of the envelope's front: cover art framed in gold foil, hinged on its outer edge */
function Door({ side, open, hidden, artIndex }: { side: "left" | "right"; open: boolean; hidden: boolean; artIndex: number }) {
  const left = side === "left";
  const round = left ? "rounded-l-md" : "rounded-r-md";
  return (
    <motion.div
      className={`absolute inset-y-0 w-1/2 ${left ? "left-0 origin-left" : "right-0 origin-right"}`}
      style={{ zIndex: 20, transformStyle: "preserve-3d" }}
      animate={{ rotateY: open ? (left ? -DOOR_SWING : DOOR_SWING) : 0, opacity: hidden ? 0 : 1 }}
      transition={{ rotateY: { duration: 0.95, ease: EASE_IN_OUT }, opacity: { duration: 0.35 } }}
    >
      {/* Outside: half of the artwork, lined up with the other door */}
      <div className={`absolute inset-0 overflow-hidden ${round}`} style={{ backfaceVisibility: "hidden" }}>
        <div className={`absolute inset-y-0 w-[200%] ${left ? "left-0" : "right-0"}`}>
          <CoverArt index={artIndex} sizes="92vw" />
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(8,6,12,0.3), rgba(8,6,12,0.16))" }} />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 to-transparent" />
        {/* The paper dips into shadow where the two doors meet */}
        <div
          className={`absolute inset-y-0 w-[7%] ${left ? "right-0" : "left-0"}`}
          style={{ background: `linear-gradient(${left ? 270 : 90}deg, rgba(0,0,0,0.38), transparent)` }}
        />
        <div className={`absolute inset-y-0 w-px ${left ? "right-0" : "left-0"}`} style={{ background: GOLD_LINE }} />

        {/* Foil edge, then a hairline frame set in from it with a stud on each corner */}
        <div
          className={`absolute inset-0 ${round}`}
          style={{
            padding: left ? "2px 0 2px 2px" : "2px 2px 2px 0",
            background: GOLD,
            WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
          }}
        />
        <div
          className={`absolute inset-y-[2.2cqw] border ${left ? "left-[2.2cqw] right-0 border-r-0" : "left-0 right-[2.2cqw] border-l-0"}`}
          style={{ borderColor: GOLD_LINE, boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.25)" }}
        >
          {["top-0 -translate-y-1/2", "bottom-0 translate-y-1/2"].map((edge) => (
            <span
              key={edge}
              className={`absolute h-[1.1cqw] w-[1.1cqw] rotate-45 ${edge} ${left ? "left-0 -translate-x-1/2" : "right-0 translate-x-1/2"}`}
              style={{ background: GOLD, boxShadow: "0 0 0 1px rgba(0,0,0,0.35)" }}
            />
          ))}
        </div>

        <div
          className={`absolute bottom-[4.4cqw] font-mono text-[max(9px,1.4cqw)] uppercase tracking-widest text-white/85 ${left ? "left-[5cqw]" : "right-[5cqw]"}`}
        >
          {left ? (
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
          ) : (
            <span className="block text-right font-poster normal-case tracking-normal text-white" style={{ textShadow: "0 2px 18px rgba(0,0,0,0.65)" }}>
              <span className="block text-[max(9px,1.25cqw)] tracking-[0.35em] text-accent">ハルシャ・ハリー</span>
              <span className="mt-[0.4cqw] block text-[max(14px,2.6cqw)] leading-none tracking-[0.04em]">HARSHA HARRY</span>
            </span>
          )}
        </div>
      </div>
      {/* Inside: plain lining, seen once the door is open */}
      <div
        className={`absolute inset-0 ${round}`}
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: `linear-gradient(${left ? 90 : 270}deg, #3a2630 0%, #241a26 100%)`,
          boxShadow: `inset 0 0 0 1px ${GOLD_LINE}`,
        }}
      />
    </motion.div>
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
    playEnvelopeOpen({ flap: T.doors, letter: T.letter, reveal: T.zoom });
    setStage("seal");
    const at = (seconds: number, fn: () => void) => timers.current.push(setTimeout(fn, seconds * 1000));
    at(T.doors, () => setStage("doors"));
    at(T.letter, () => setStage("letter"));
    at(T.zoom, () => setStage("zoom"));
    // The letter now covers the screen — let the page behind start its entrance
    at(T.zoom + 0.2, onOpen);
    at(T.fade, () => setStage("fade"));
    at(T.done, () => setDone(true));
  };

  const opened = stage !== "closed";
  const doorsOpen = stage !== "closed" && stage !== "seal";
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
        animate={opened ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1, y: [0, -8, 0], scale: 1 }}
        transition={
          opened
            ? { duration: 0.7, ease: EASE_OUT }
            : { opacity: { duration: 0.8 }, scale: { duration: 0.8, ease: EASE_OUT }, y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" } }
        }
      >
        {/* Back panel + inside of the envelope */}
        <motion.div
          className="absolute inset-0 rounded-md"
          style={{
            background: "linear-gradient(180deg, #1a1420 0%, #2a1c22 70%)",
            boxShadow: `0 40px 80px -20px rgba(0,0,0,0.8), 0 0 60px -12px rgba(201,162,87,0.35), inset 0 0 0 1px ${GOLD_LINE}`,
          }}
          animate={{ opacity: zooming ? 0 : 1 }}
          transition={{ duration: 0.35 }}
        />

        {/* Letter — lifts off the lining, then grows until it becomes the page */}
        <motion.div
          className="absolute inset-x-[6%] top-[6%] flex h-[88%] flex-col justify-between bg-paper p-[5%] text-ink shadow-lg"
          style={{ zIndex: zooming ? 50 : 10, borderRadius: 3 }}
          animate={zooming ? { y: "0%", scale: 6 } : letterOut ? { y: "-2%", scale: 1.05 } : { y: "0%", scale: 1 }}
          transition={zooming ? { duration: 0.85, ease: EASE_IN_OUT } : { duration: 0.75, ease: EASE_OUT }}
        >
          <motion.div
            className="flex h-full flex-col justify-between"
            animate={{ opacity: zooming ? 0 : 1 }}
            transition={{ duration: 0.25 }}
          >
            <span aria-hidden="true" className="pointer-events-none absolute inset-[2.5%] border border-[#b8893c]/45" />
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

        {/* Front of the envelope: two doors that part down the middle */}
        <Door side="left" open={doorsOpen} hidden={zooming} artIndex={artIndex} />
        <Door side="right" open={doorsOpen} hidden={zooming} artIndex={artIndex} />

        {/* A slow glint of light crossing the sealed envelope */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
          style={{ zIndex: 32 }}
          animate={{ opacity: opened ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3"
            style={{ background: "linear-gradient(105deg, transparent 20%, rgba(255,240,205,0.2) 50%, transparent 80%)" }}
            animate={{ x: ["-110%", "410%"] }}
            transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 4.5, ease: "easeInOut" }}
          />
        </motion.div>

        {/* Unsealing: light races along the seam from the seal before the doors part */}
        {opened && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-[calc(50%-1px)] w-[2px]"
            style={{ zIndex: 33, background: "#fbeec4", boxShadow: "0 0 18px 4px rgba(247,231,180,0.75), 0 0 46px 10px rgba(255,120,70,0.35)" }}
            initial={{ scaleY: 0, opacity: 1 }}
            animate={{ scaleY: 1, opacity: doorsOpen ? 0 : 1 }}
            transition={{ scaleY: { duration: 0.38, delay: 0.16, ease: EASE_OUT }, opacity: { duration: 0.3 } }}
          />
        )}

        {/* Wax seal — the button that opens everything */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 40 }}>
          <AnimatePresence>
            {!opened && (
              <motion.span
                aria-hidden="true"
                className="absolute inset-0 rounded-full border border-accent"
                initial={{ scale: 1, opacity: 0.7 }}
                animate={{ scale: 1.9, opacity: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>
          {/* Unsealing: a shockwave ring, then chips of wax and gold sparks */}
          {opened && (
            <>
              {[0, 0.12].map((delay) => (
                <motion.span
                  key={delay}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-full border-2"
                  style={{ borderColor: "#f7e7b4", boxShadow: "0 0 24px rgba(247,231,180,0.6)" }}
                  initial={{ scale: 0.9, opacity: 0.95 }}
                  animate={{ scale: 3.4, opacity: 0 }}
                  transition={{ duration: 0.8, delay, ease: EASE_OUT }}
                />
              ))}
              {SHARDS.map((shard, i) => (
                <motion.span
                  key={i}
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-1/2"
                  style={{
                    width: shard.gold ? shard.size * 0.6 : shard.size,
                    height: shard.gold ? shard.size * 0.6 : shard.size * 0.8,
                    marginLeft: -shard.size / 2,
                    marginTop: -shard.size / 2,
                    borderRadius: shard.gold ? "50%" : "30% 60% 40% 55%",
                    background: shard.gold ? "#f7e7b4" : "linear-gradient(135deg, #ff6a4d, #a81a08)",
                    boxShadow: shard.gold ? "0 0 8px rgba(247,231,180,0.9)" : "0 1px 2px rgba(0,0,0,0.4)",
                  }}
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.4 }}
                  animate={{ x: shard.x, y: shard.y, rotate: shard.spin, opacity: [0, 1, 1, 0], scale: 1 }}
                  transition={{ duration: 0.85, delay: 0.2, ease: EASE_OUT, opacity: { duration: 0.85, delay: 0.2, times: [0, 0.1, 0.6, 1] } }}
                />
              ))}
            </>
          )}
          <motion.button
            type="button"
            onClick={open}
            disabled={opened}
            aria-label="Open the envelope to enter the portfolio"
            data-cursor="Open"
            whileHover={opened ? undefined : { scale: 1.1, rotate: -6 }}
            whileTap={opened ? undefined : { scale: 0.9 }}
            animate={stage === "seal" ? { scale: [1, 0.8, 1.06, 0.96], rotate: [0, -5, 4, 0] } : { scale: 1, rotate: 0 }}
            transition={stage === "seal" ? { duration: 0.5, ease: "easeOut" } : { type: "spring", damping: 14, stiffness: 260 }}
            className="relative block h-[max(4rem,13cqw)] w-[max(4rem,13cqw)] cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#f5f1e8] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0b0a0d]"
          >
            {/* Two halves of the same seal, so it can crack down the middle and part with the doors */}
            {[
              { clip: "inset(0 50% 0 0)", x: -44, rotate: -24 },
              { clip: "inset(0 0 0 50%)", x: 44, rotate: 24 },
            ].map((half) => (
              <motion.span
                key={half.clip}
                className="absolute inset-0 flex items-center justify-center rounded-full font-serif text-[max(1.875rem,6cqw)] text-[#f5f1e8]"
                style={{
                  clipPath: half.clip,
                  background: "radial-gradient(circle at 35% 30%, #ff6a4d 0%, #e02a12 55%, #a81a08 100%)",
                  boxShadow: "inset 0 0 0 2px rgba(247,231,180,0.55), inset 0 0 0 5px rgba(255,255,255,0.1), inset 0 -6px 10px rgba(0,0,0,0.25)",
                }}
                animate={doorsOpen ? { x: half.x, y: 22, rotate: half.rotate, opacity: 0 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                transition={{ duration: 0.55, ease: [0.5, 0, 0.75, 0] }}
              >
                開
              </motion.span>
            ))}
            {/* The crack that runs down the wax the moment it is pressed */}
            {opened && (
              <motion.svg
                aria-hidden="true"
                viewBox="0 0 100 100"
                className="pointer-events-none absolute inset-0 h-full w-full overflow-hidden rounded-full"
                animate={{ opacity: doorsOpen ? 0 : 1 }}
                transition={{ duration: 0.15 }}
              >
                {[
                  { stroke: "#4a0a02", width: 3.2 },
                  { stroke: "#ffd9a8", width: 0.9 },
                ].map((line) => (
                  <motion.path
                    key={line.stroke}
                    d="M50 0 L45 17 L55 31 L44 48 L56 63 L47 80 L51 100"
                    fill="none"
                    stroke={line.stroke}
                    strokeWidth={line.width}
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.26, delay: 0.06, ease: "easeIn" }}
                  />
                ))}
              </motion.svg>
            )}
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
