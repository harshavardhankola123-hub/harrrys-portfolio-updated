"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "framer-motion";

const GLYPHS = "01#§*%~<>_/[{]}λ+=✦";

interface TextScrambleProps {
  text: string;
  className?: string;
  speed?: number;
  triggerInView?: boolean;
  triggerOnHover?: boolean;
  as?: "span" | "h1" | "h2" | "h3" | "h4" | "p" | "div";
}

export function TextScramble({
  text,
  className = "",
  speed = 30,
  triggerInView = true,
  triggerOnHover = true,
  as: Component = "span",
}: TextScrambleProps) {
  const [displayText, setDisplayText] = useState(text);
  const [isScrambling, setIsScrambling] = useState(false);
  const containerRef = useRef<HTMLElement>(null);
  const inView = useInView(containerRef, { once: true, margin: "-40px" });
  const animFrameRef = useRef<number | null>(null);

  const scramble = useCallback(() => {
    if (isScrambling) return;
    setIsScrambling(true);

    let iteration = 0;
    const maxIterations = text.length;

    const tick = () => {
      const result = text
        .split("")
        .map((char, index) => {
          if (char === " ") return " ";
          if (index < iteration) {
            return text[index];
          }
          return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        })
        .join("");

      setDisplayText(result);

      if (iteration < maxIterations) {
        iteration += 1 / 2.5;
        setTimeout(() => {
          animFrameRef.current = requestAnimationFrame(tick);
        }, speed);
      } else {
        setDisplayText(text);
        setIsScrambling(false);
      }
    };

    tick();
  }, [text, speed, isScrambling]);

  useEffect(() => {
    if (triggerInView && inView) {
      scramble();
    }
  }, [inView, triggerInView, scramble]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <Component
      // @ts-expect-error ref typing for dynamic element
      ref={containerRef}
      onMouseEnter={triggerOnHover ? scramble : undefined}
      className={`${className} inline-block select-none cursor-default transition-colors`}
      aria-label={text}
    >
      {displayText}
    </Component>
  );
}
