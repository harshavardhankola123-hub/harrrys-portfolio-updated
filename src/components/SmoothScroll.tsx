"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { frame, cancelFrame } from "framer-motion";

let lenisInstance: Lenis | null = null;

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

/* Scroll to an element or a pixel offset through Lenis, falling back to native smooth scroll */
export function scrollToTarget(target: HTMLElement | number) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      offset: typeof target === "number" ? 0 : -24,
      duration: 1.4,
      easing: easeOutQuart,
    });
  } else if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth" });
  }
}

/* Freeze or release page scrolling (used while the envelope intro is up) */
export function setScrollLocked(locked: boolean) {
  document.documentElement.style.overflow = locked ? "hidden" : "";
  if (locked) {
    window.scrollTo(0, 0);
    lenisInstance?.stop();
  } else {
    lenisInstance?.start();
  }
}

export function SmoothScroll() {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      lerp: 0.09,
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2.0,
      infinite: false,
    });
    lenisInstance = lenis;

    // Drive Lenis from framer-motion's frame loop so scroll-linked
    // animations read the new scroll position in the same frame
    const update = ({ timestamp }: { timestamp: number }) => lenis.raf(timestamp);
    frame.update(update, true);

    // Anchor link smooth scroll
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (href && href.startsWith("#") && href.length > 1) {
        const id = href.slice(1);
        const element = document.getElementById(id);
        if (element) {
          e.preventDefault();
          scrollToTarget(element);
        }
      }
    };

    document.addEventListener("click", handleAnchorClick);

    return () => {
      cancelFrame(update);
      document.removeEventListener("click", handleAnchorClick);
      lenis.destroy();
      lenisInstance = null;
    };
  }, []);

  return null;
}
