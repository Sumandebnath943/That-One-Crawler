"use client";

import { useEffect, useRef, useState } from "react";
import { FORM_EVENT, type FormSignal } from "@/lib/client/quirks";
import { Mascot, type Mood } from "../Mascot";

const REACTIONS: Record<FormSignal, { line: string; mood: Mood }> = {
  idle: { line: "I've seen things. Mostly missing H1s.", mood: "smirk" },
  focus: { line: "Ooh. Fresh blog?", mood: "happy" },
  typing: { line: "Mmhm. Go on…", mood: "smirk" },
  invalid: { line: "That's not a URL. That's a cry for help.", mood: "shocked" },
  submit: { line: "Say less. Judging now.", mood: "cool" },
};

/** The big hero spider, whose speech bubble reacts to the scan form and to pokes. */
export function HeroMascot() {
  const [reaction, setReaction] = useState(REACTIONS.idle);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const react = (next: { line: string; mood: Mood }, holdMs?: number) => {
    setReaction(next);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    if (holdMs) resetTimer.current = setTimeout(() => setReaction(REACTIONS.idle), holdMs);
  };

  useEffect(() => {
    const onSignal = (event: Event) => {
      const signal = (event as CustomEvent<FormSignal>).detail;
      setReaction(REACTIONS[signal] ?? REACTIONS.idle);
    };
    window.addEventListener(FORM_EVENT, onSignal);
    return () => {
      window.removeEventListener(FORM_EVENT, onSignal);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-xs md:max-w-sm">
      <div
        aria-live="polite"
        className="absolute -top-2 right-0 z-10 max-w-[14rem] rotate-3 rounded-2xl border-2 border-ink bg-card px-4 py-3 text-sm font-semibold shadow-brutal sm:-right-4"
      >
        {reaction.line}
        <span className="absolute -bottom-2.5 left-8 size-4 rotate-45 border-r-2 border-b-2 border-ink bg-card" />
      </div>
      <Mascot
        pokeable
        mood={reaction.mood}
        onPoke={(line) => react({ line, mood: "shocked" }, 2400)}
        className="wobble mt-14 w-full drop-shadow-[6px_6px_0_var(--line)]"
      />
    </div>
  );
}
