"use client";

import { useState, useRef, useEffect } from "react";
import { Volume2, VolumeX, Radio } from "lucide-react";
import { motion } from "framer-motion";

export function KineticAudio() {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Initialize or resume Web Audio on user gesture
  const playTactileTone = (freq = 440, type: OscillatorType = "sine", duration = 0.08) => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext not supported or restricted by browser
    }
  };

  const toggleSound = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      playTactileTone(587.33, "triangle", 0.12); // D5 pleasant chime
      setTimeout(() => playTactileTone(880, "sine", 0.15), 80); // A5
    } else {
      setIsPlaying(false);
      playTactileTone(329.63, "sine", 0.1);
    }
  };

  // Add click listener to interactive page elements when audio is on for tactile feedback
  useEffect(() => {
    if (!isPlaying) return;

    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("button, a, [role='button'], input, [data-magnet]")) {
        const pitches = [523.25, 659.25, 783.99, 1046.5];
        const pitch = pitches[Math.floor(Math.random() * pitches.length)];
        playTactileTone(pitch, "sine", 0.06);
      }
    };

    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [isPlaying]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleSound}
        className="group relative flex items-center gap-2 rounded-full border border-foreground/15 px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors hover:border-accent hover:bg-accent/10"
        title={isPlaying ? "Mute interactive tactile feedback" : "Enable tactile sound feedback"}
      >
        <div className="flex items-center gap-0.5 h-3">
          {[
            "animate-wave-1",
            "animate-wave-2",
            "animate-wave-3",
            "animate-wave-4",
            "animate-wave-5",
          ].map((anim, idx) => (
            <span
              key={idx}
              className={`w-0.5 rounded-full bg-accent transition-all ${
                isPlaying ? anim : "h-1 opacity-40 group-hover:h-2"
              }`}
            />
          ))}
        </div>

        <span className="hidden sm:inline text-muted-foreground group-hover:text-accent font-semibold transition-colors">
          {isPlaying ? "KINETIC AUDIO · ON" : "AUDIO · OFF"}
        </span>

        {isPlaying ? (
          <Volume2 className="h-3 w-3 text-accent" />
        ) : (
          <VolumeX className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}
