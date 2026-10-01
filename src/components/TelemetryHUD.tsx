"use client";

import { useEffect, useState } from "react";
import { useScroll, motion, useSpring, useVelocity } from "framer-motion";
import { Activity, Clock, Zap } from "lucide-react";

export function TelemetryHUD() {
  const [time, setTime] = useState("");
  const [fps, setFps] = useState(60);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [scrollSpeed, setScrollSpeed] = useState(0);

  const { scrollY, scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { damping: 25, stiffness: 120 });
  const scrollVelocity = useVelocity(scrollY);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      };
      setTime(new Intl.DateTimeFormat("en-GB", options).format(now));
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return smoothProgress.on("change", (latest) => {
      setScrollProgress(Math.round(latest * 100));
    });
  }, [smoothProgress]);

  useEffect(() => {
    return scrollVelocity.on("change", (latest) => {
      setScrollSpeed(Math.min(999, Math.round(Math.abs(latest))));
    });
  }, [scrollVelocity]);

  // Measure approximate FPS
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const calcFps = (now: number) => {
      frameCount++;
      if (now - lastTime >= 1000) {
        setFps(Math.min(60, Math.round((frameCount * 1000) / (now - lastTime))));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(calcFps);
    };

    animId = requestAnimationFrame(calcFps);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.8 }}
      className="hidden lg:flex items-center gap-4 rounded-full border border-foreground/15 bg-paper/80 px-4 py-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground backdrop-blur-md shadow-sm"
    >
      {/* Clock */}
      <div className="flex items-center gap-1.5 text-foreground">
        <Clock className="h-3 w-3 text-accent" />
        <span>{time || "14:30:00"} IST</span>
      </div>

      <span className="text-foreground/20">/</span>

      {/* FPS */}
      <div className="flex items-center gap-1.5">
        <Activity className="h-3 w-3 text-green-500 animate-pulse" />
        <span>{fps} FPS</span>
      </div>

      <span className="text-foreground/20">/</span>

      {/* Smooth Scroll Flow meter */}
      <div className="flex items-center gap-1.5 text-foreground">
        <Zap className={`h-3 w-3 text-accent ${scrollSpeed > 50 ? "animate-bounce" : ""}`} />
        <span>FLOW {scrollProgress}%</span>
      </div>

      {scrollSpeed > 30 && (
        <>
          <span className="text-foreground/20">/</span>
          <span className="text-accent font-semibold text-[10px]">
            {scrollSpeed} PX/S
          </span>
        </>
      )}
    </motion.div>
  );
}
