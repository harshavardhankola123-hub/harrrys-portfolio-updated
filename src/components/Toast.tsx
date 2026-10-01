"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Check, Sparkles } from "lucide-react";

interface ToastProps {
  message: string | null;
}

export function Toast({ message }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.9 }}
          transition={{ type: "spring", damping: 20, stiffness: 300 }}
          className="fixed top-8 left-1/2 -translate-x-1/2 z-[300] pointer-events-none"
        >
          <div className="flex items-center gap-2.5 rounded-full border border-foreground/20 bg-ink px-5 py-2.5 text-paper shadow-2xl backdrop-blur-md">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Check className="h-3 w-3 stroke-[3]" />
            </span>
            <span className="font-mono text-xs uppercase tracking-wider">{message}</span>
            <Sparkles className="h-3.5 w-3.5 text-accent" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
