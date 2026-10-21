"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isDaddyMode, nextPokeLine, prefersReducedMotion, subscribeDaddy } from "@/lib/client/quirks";

const EYES = [
  { cx: 82, cy: 86 },
  { cx: 118, cy: 86 },
];
const PUPIL_TRAVEL = 7;

export type Mood = "smirk" | "happy" | "meh" | "shocked" | "cool";

const BROWS: Record<Mood, [string, string]> = {
  smirk: ["M64 60 Q80 48 96 59", "M104 63 L134 57"], // one raised, one not impressed
  happy: ["M64 58 Q80 47 96 57", "M104 57 Q120 47 136 58"],
  meh: ["M66 61 L96 61", "M104 61 L134 61"],
  shocked: ["M64 51 Q80 38 96 50", "M104 50 Q120 38 136 51"],
  cool: ["M64 60 Q80 48 96 59", "M104 63 L134 57"],
};

const MOUTHS: Record<Exclude<Mood, "shocked">, string> = {
  smirk: "M89 125 Q101 132 113 122",
  happy: "M86 121 Q100 139 114 121",
  meh: "M89 127 L111 127",
  cool: "M89 125 Q101 132 113 122",
};

const daddyServerSnapshot = () => false;

interface MascotProps {
  className?: string;
  /** Pupils track the pointer. */
  follow?: boolean;
  mood?: Mood;
  /** Clicking makes it squish and talk back. */
  pokeable?: boolean;
  /** Receive poke lines instead of showing the built-in speech bubble. */
  onPoke?: (line: string) => void;
  title?: string;
}

/** The crawler himself: a judgy little spider who blinks, watches your cursor and hates being poked. */
export function Mascot({
  className = "",
  follow = true,
  mood = "smirk",
  pokeable = false,
  onPoke,
  title = "That One Crawler mascot",
}: MascotProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pupilRefs = useRef<(SVGCircleElement | null)[]>([]);
  const [line, setLine] = useState<string | null>(null);
  const lineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const daddy = useSyncExternalStore(subscribeDaddy, isDaddyMode, daddyServerSnapshot);

  // Eyes follow the pointer.
  useEffect(() => {
    if (!follow || prefersReducedMotion()) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const box = svg.getBoundingClientRect();
        if (!box.width) return;
        const scale = box.width / 200;
        EYES.forEach((eye, i) => {
          const pupil = pupilRefs.current[i];
          if (!pupil) return;
          const dx = event.clientX - (box.left + eye.cx * scale);
          const dy = event.clientY - (box.top + eye.cy * scale);
          const dist = Math.hypot(dx, dy) || 1;
          const travel = Math.min(PUPIL_TRAVEL, dist / 30);
          pupil.setAttribute("transform", `translate(${(dx / dist) * travel} ${(dy / dist) * travel})`);
        });
      });
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
    };
  }, [follow]);

  // Blink every few seconds, at slightly random intervals so a page full of spiders doesn't blink in sync.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        const svg = svgRef.current;
        svg?.classList.add("mascot-blink");
        setTimeout(() => svg?.classList.remove("mascot-blink"), 180);
        schedule();
      }, 2500 + Math.random() * 4500);
    };
    schedule();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (lineTimer.current) clearTimeout(lineTimer.current);
  }, []);

  const poke = () => {
    const svg = svgRef.current;
    if (svg) {
      svg.classList.remove("mascot-squish");
      // Restart the animation even on rapid pokes.
      void svg.getBoundingClientRect();
      svg.classList.add("mascot-squish");
    }
    const said = nextPokeLine();
    if (onPoke) {
      onPoke(said);
      return;
    }
    setLine(said);
    if (lineTimer.current) clearTimeout(lineTimer.current);
    lineTimer.current = setTimeout(() => setLine(null), 2200);
  };

  const shades = daddy || mood === "cool";
  const [leftBrow, rightBrow] = BROWS[mood];

  const svg = (
    <svg ref={svgRef} viewBox="0 0 200 200" className="mascot block h-full w-full overflow-visible" role="img" aria-label={title}>
      <g fill="none" stroke="var(--ink)" strokeWidth="7" strokeLinecap="round">
        <path d="M78 98 Q50 60 26 74" />
        <path d="M74 110 Q40 94 16 114" />
        <path d="M74 122 Q42 130 22 152" />
        <path d="M80 134 Q56 158 44 182" />
        <path d="M122 98 Q150 60 174 74" />
        <path d="M126 110 Q160 94 184 114" />
        <path d="M126 122 Q158 130 178 152" />
        <path d="M120 134 Q144 158 156 182" />
      </g>
      <ellipse cx="100" cy="117" rx="38" ry="40" fill="var(--ink)" />
      <path d={leftBrow} fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      <path d={rightBrow} fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      {EYES.map((eye, i) => (
        <g key={i} className="mascot-eye">
          <circle cx={eye.cx} cy={eye.cy} r="18" fill="#ffffff" stroke="#1a1712" strokeWidth="3" />
          <circle
            ref={(el) => {
              pupilRefs.current[i] = el;
            }}
            cx={eye.cx}
            cy={eye.cy + 2}
            r={mood === "shocked" ? 5 : 7.5}
            fill="#1a1712"
          />
        </g>
      ))}
      {shades && (
        <g>
          <path d="M60 78 H140" stroke="#1a1712" strokeWidth="5" strokeLinecap="round" />
          <rect x="62" y="76" width="38" height="22" rx="9" fill="#1a1712" />
          <rect x="102" y="76" width="38" height="22" rx="9" fill="#1a1712" />
          <path d="M70 81 L80 81" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
          <path d="M110 81 L120 81" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
        </g>
      )}
      {mood === "shocked" ? (
        <>
          <ellipse cx="100" cy="128" rx="6" ry="8" fill="var(--paper)" />
          <path d="M140 70 Q146 80 140 86 Q134 80 140 70 Z" fill="#8ecbff" stroke="#1a1712" strokeWidth="1.5" />
        </>
      ) : (
        <path d={MOUTHS[mood]} fill="none" stroke="var(--paper)" strokeWidth="4" strokeLinecap="round" />
      )}
      {daddy ? (
        <path d="M78 142 Q100 162 122 142" fill="none" stroke="#f5c242" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 7" />
      ) : (
        <g stroke="#1a1712" strokeWidth="2" strokeLinejoin="round">
          <path d="M86 140 L100 147 L86 154 Z" fill="#d6ff3d" />
          <path d="M114 140 L100 147 L114 154 Z" fill="#d6ff3d" />
          <circle cx="100" cy="147" r="3.5" fill="#d6ff3d" />
        </g>
      )}
    </svg>
  );

  if (!pokeable) return <span className={`relative inline-block ${className}`}>{svg}</span>;

  return (
    <span className={`relative inline-block ${className}`}>
      <button type="button" onClick={poke} className="block h-full w-full cursor-pointer" aria-label="Poke the crawler">
        {svg}
      </button>
      {line && (
        <span
          role="status"
          className="rise pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 -translate-x-1/2 rounded-xl border-2 border-ink bg-card px-2.5 py-1 text-xs font-bold whitespace-nowrap text-ink shadow-brutal-sm"
        >
          {line}
        </span>
      )}
    </span>
  );
}
