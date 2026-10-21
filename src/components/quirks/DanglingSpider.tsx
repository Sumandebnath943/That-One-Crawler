"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "@/lib/client/quirks";
import { Mascot } from "../Mascot";

/** A spider hanging off the header on a thread that gets longer as you scroll. Click to yank it away. */
export function DanglingSpider() {
  const threadRef = useRef<HTMLDivElement>(null);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const thread = threadRef.current;
      if (!thread) return;
      const length = 18 + Math.min(window.innerHeight * 0.4, window.scrollY * 0.3);
      thread.style.height = `${length}px`;
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const yank = () => {
    setGone(true);
    toast("Fine. I'll hang out somewhere else.");
  };

  return (
    <div
      aria-hidden={gone}
      className={`pointer-events-none fixed top-16 right-2 z-20 hidden flex-col items-center transition-transform duration-500 ease-in xl:flex ${gone ? "-translate-y-[120vh]" : ""}`}
    >
      <div className="sway flex flex-col items-center">
        <div ref={threadRef} className="w-0.5 bg-ink/70" style={{ height: 18 }} />
        <button
          type="button"
          onClick={yank}
          tabIndex={gone ? -1 : 0}
          className="pointer-events-auto -mt-1 size-10 transition hover:scale-110"
          aria-label="Yank the dangling spider away"
          title="Yank me"
        >
          <Mascot className="size-10" />
        </button>
      </div>
    </div>
  );
}
