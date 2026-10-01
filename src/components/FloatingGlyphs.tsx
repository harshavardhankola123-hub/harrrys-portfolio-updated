"use client";

import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

const glyphs = [
  { char: "λ", x: "8%", y: "22%", size: "text-4xl", rotate: 12, speed: 0.15 },
  { char: "< / >", x: "92%", y: "35%", size: "text-sm font-mono", rotate: -10, speed: -0.25 },
  { char: "{ }", x: "5%", y: "58%", size: "text-2xl font-mono", rotate: 25, speed: 0.2 },
  { char: "✦", x: "88%", y: "70%", size: "text-2xl text-accent", rotate: 45, speed: -0.18 },
  { char: "01", x: "12%", y: "85%", size: "text-xs font-mono", rotate: -5, speed: 0.12 },
  { char: "§", x: "94%", y: "15%", size: "text-xl text-accent", rotate: 15, speed: -0.1 },
];

export function FloatingGlyphs() {
  const { scrollY } = useScroll();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none">
      {glyphs.map((g, idx) => {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const translateY = useTransform(scrollY, [0, 3000], [0, 3000 * g.speed]);

        return (
          <motion.div
            key={idx}
            style={{
              left: g.x,
              top: g.y,
              y: translateY,
              rotate: g.rotate,
              opacity: 0.2,
            }}
            className={`fixed ${g.size} font-display font-light text-foreground/40`}
          >
            {g.char}
          </motion.div>
        );
      })}
    </div>
  );
}
