"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink, Award, Calendar, CheckCircle2 } from "lucide-react";
import { useEffect } from "react";

export interface CertificateItem {
  title: string;
  issuer: string;
  image: string;
  href: string;
}

interface CertificateModalProps {
  certificate: CertificateItem | null;
  onClose: () => void;
}

export function CertificateModal({ certificate, onClose }: CertificateModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (certificate) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [certificate, onClose]);

  return (
    <AnimatePresence>
      {certificate && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 sm:p-6 md:p-10">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-ink/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 280 }}
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-xl border border-foreground/20 bg-paper text-ink shadow-2xl"
          >
            {/* Header bar */}
            <div className="flex items-center justify-between border-b border-foreground/15 px-6 py-4 bg-muted/40 font-mono text-xs uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-accent" />
                <span>Verified Credential</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-full p-1.5 hover:bg-foreground/10 transition-colors"
                aria-label="Close modal"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Preview image */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink/5 border-b border-foreground/10">
              <img
                src={certificate.image}
                alt={`${certificate.title} credential view`}
                className="h-full w-full object-contain p-4"
              />
            </div>

            {/* Content & Action */}
            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Credential Authenticated</span>
                </div>
                <h3 className="mt-3 font-display text-2xl md:text-3xl font-medium tracking-tight">
                  {certificate.title}
                </h3>
                <p className="mt-1 font-mono text-xs uppercase tracking-widest text-muted-foreground">
                  {certificate.issuer}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={certificate.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-3 font-display text-sm font-medium text-accent-foreground shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                  <span>Open Full Document</span>
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
