"use client";

import { useEffect, useRef } from "react";

const EYES = [
  { cx: 82, cy: 86 },
  { cx: 118, cy: 86 },
];
const PUPIL_TRAVEL = 7;

/** The crawler himself: a judgy little spider whose googly eyes follow your cursor. */
export function Mascot({ className = "", follow = false, title = "That One Crawler mascot" }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pupilRefs = useRef<(SVGCircleElement | null)[]>([]);

  useEffect(() => {
    if (!follow) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onMove = (event: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const svg = svgRef.current;
        if (!svg) return;
        const box = svg.getBoundingClientRect();
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

  return (
    <svg ref={svgRef} viewBox="0 0 200 200" className={className} role="img" aria-label={title}>
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
      {/* Judgy eyebrows: one raised, one not impressed. */}
      <path d="M64 60 Q80 48 96 59" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      <path d="M104 63 L134 57" fill="none" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
      {EYES.map((eye, i) => (
        <g key={i}>
          <circle cx={eye.cx} cy={eye.cy} r="18" fill="#ffffff" stroke="#1a1712" strokeWidth="3" />
          <circle
            ref={(el) => {
              pupilRefs.current[i] = el;
            }}
            cx={eye.cx}
            cy={eye.cy + 2}
            r="7.5"
            fill="#1a1712"
          />
        </g>
      ))}
      <path d="M89 125 Q101 132 113 122" fill="none" stroke="var(--paper)" strokeWidth="4" strokeLinecap="round" />
      <g stroke="#1a1712" strokeWidth="2" strokeLinejoin="round">
        <path d="M86 140 L100 147 L86 154 Z" fill="#d6ff3d" />
        <path d="M114 140 L100 147 L114 154 Z" fill="#d6ff3d" />
        <circle cx="100" cy="147" r="3.5" fill="#d6ff3d" />
      </g>
    </svg>
  );
}
