"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Briefcase, Wrench, User, Award, Send, ArrowUp, Sun, Moon } from "lucide-react";

const navItems = [
  { id: "projects", label: "Work", icon: Briefcase },
  { id: "certifications", label: "Certs", icon: Award },
  { id: "skills", label: "Skills", icon: Wrench },
  { id: "about", label: "Studio", icon: User },
  { id: "contact", label: "Contact", icon: Send },
];

export function FloatingNav() {
  const [visible, setVisible] = useState(false);
  const [activeSection, setActiveSection] = useState("hero");
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = saved === "dark" || (!saved && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  useEffect(() => {
    const handleScroll = () => {
      const hero = document.getElementById("hero");
      const heroBottom = hero ? hero.offsetTop + hero.offsetHeight : 500;

      if (window.scrollY > heroBottom - 120) {
        setVisible(true);
      } else {
        setVisible(false);
      }

      const sections = ["hero", "projects", "certifications", "skills", "about", "contact"];
      const scrollPosition = window.scrollY + 280;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(sectionId);
            break;
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };



  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-6 inset-x-0 mx-auto z-[190] w-fit max-w-[94vw]"
          aria-label="Quick navigation dock"
        >
          <div className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-2 rounded-full border border-foreground/15 bg-paper/85 backdrop-blur-md shadow-2xl text-ink font-mono text-xs">
            {/* Live Status indicator */}
            <div className="flex items-center gap-1.5 pl-2 pr-3 border-r border-foreground/15 text-[10px] uppercase tracking-wider text-muted-foreground hidden sm:flex">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              <span>Available</span>
            </div>

            {/* Navigation pills */}
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <motion.button
                  key={item.id}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => scrollToSection(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    isActive ? "text-accent-foreground font-semibold" : "text-foreground/80 hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeDockPill"
                      className="absolute inset-0 rounded-full bg-accent -z-10 shadow-sm"
                      transition={{ type: "spring", damping: 24, stiffness: 300 }}
                    />
                  )}
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </motion.button>
              );
            })}

            {/* Theme Toggle */}
            <div className="pl-2 border-l border-foreground/15">
              <motion.button
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={toggleTheme}
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-foreground/10 text-accent transition-colors relative overflow-hidden"
              >
                <AnimatePresence mode="wait" initial={false}>
                  {isDark ? (
                    <motion.span
                      key="sun"
                      initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="absolute flex items-center justify-center"
                    >
                      <Sun className="h-3.5 w-3.5" />
                    </motion.span>
                  ) : (
                    <motion.span
                      key="moon"
                      initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                      animate={{ rotate: 0, opacity: 1, scale: 1 }}
                      exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="absolute flex items-center justify-center"
                    >
                      <Moon className="h-3.5 w-3.5" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            {/* Back to Top */}
            <div className="pl-2 border-l border-foreground/15">
              <motion.button
                whileHover={{ scale: 1.15, y: -2 }}
                whileTap={{ scale: 0.9 }}
                onClick={scrollToTop}
                title="Scroll back to top"
                aria-label="Scroll to top"
                className="flex items-center justify-center h-7 w-7 rounded-full hover:bg-foreground/10 text-accent transition-colors"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </motion.button>
            </div>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
