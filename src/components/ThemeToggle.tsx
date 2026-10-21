"use client";

import { toast } from "@/lib/client/quirks";

const TO_DARK = ["Lights off. The spider prefers it.", "Dark mode: now 40% more mysterious.", "Ah, the natural habitat."];
const TO_LIGHT = ["Lights on. Squinting intensifies.", "Light mode. Bold choice.", "Who turned on the sun?"];
let flips = 0;

export function ThemeToggle() {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("toc-theme", dark ? "dark" : "light");
    } catch {
      // Private mode: the toggle still works for this visit.
    }
    flips += 1;
    const quips = dark ? TO_DARK : TO_LIGHT;
    toast(flips >= 6 && flips % 6 === 0 ? "Are you okay? That's a lot of flicking." : quips[flips % quips.length]);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="grid size-10 place-items-center rounded-full border-2 border-ink bg-card text-ink shadow-brutal-sm transition hover:-translate-y-0.5 active:translate-y-0"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      <svg viewBox="0 0 24 24" className="size-5 dark:hidden" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" strokeLinejoin="round" />
      </svg>
      <svg viewBox="0 0 24 24" className="hidden size-5 dark:block" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="4" />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
