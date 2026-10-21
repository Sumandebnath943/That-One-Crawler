"use client";

// Tiny event bus for the site's quirks: toasts, the hero mascot's reactions,
// poke counting, Crawl Daddy mode and confetti. Plain DOM events keep it
// dependency-free and let any component talk to any other.

export const TOAST_EVENT = "toc:toast";
export const FORM_EVENT = "toc:form";
const DADDY_EVENT = "toc:daddy";
const DADDY_CLASS = "daddy";

export type FormSignal = "focus" | "typing" | "invalid" | "submit" | "idle";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function toast(message: string): void {
  window.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: message }));
}

export function signalForm(signal: FormSignal): void {
  window.dispatchEvent(new CustomEvent(FORM_EVENT, { detail: signal }));
}

// --- Pokes -----------------------------------------------------------------

const POKE_LINES = [
  "Hey!",
  "Rude.",
  "I'm working here.",
  "That tickles.",
  "Poke the blog, not me.",
  "Ow. My H1.",
  "Do that again and I'm checking your alt text.",
  "I bite. SEO-wise.",
  "You found my ticklish leg.",
  "Stop poking, start scanning.",
];
const DADDY_POKES = 10;
let pokes = 0;

/** Count a poke and return what the crawler says about it. */
export function nextPokeLine(): string {
  pokes += 1;
  if (pokes === 7) return "Three more and something happens…";
  if (pokes === DADDY_POKES) {
    setDaddyMode(!isDaddyMode());
    return isDaddyMode() ? "You asked for it." : "Back to normal. Phew.";
  }
  if (pokes === 25) return "We've been at this a while. Should I start charging?";
  return POKE_LINES[(pokes - 1) % POKE_LINES.length];
}

// --- Crawl Daddy mode --------------------------------------------------------

export function isDaddyMode(): boolean {
  return typeof document !== "undefined" && document.documentElement.classList.contains(DADDY_CLASS);
}

export function setDaddyMode(on: boolean): void {
  document.documentElement.classList.toggle(DADDY_CLASS, on);
  try {
    if (on) sessionStorage.setItem("toc-daddy", "1");
    else sessionStorage.removeItem("toc-daddy");
  } catch {
    // Storage blocked: the mode still works for this page view.
  }
  window.dispatchEvent(new Event(DADDY_EVENT));
  toast(on ? "😎 Crawl Daddy mode: ON. The original is back, and he brought gold." : "Crawl Daddy has left the building.");
}

export function subscribeDaddy(callback: () => void): () => void {
  window.addEventListener(DADDY_EVENT, callback);
  return () => window.removeEventListener(DADDY_EVENT, callback);
}

// --- Confetti ----------------------------------------------------------------

const CONFETTI_COLORS = ["var(--lime)", "var(--crit)", "var(--note)", "var(--warn)", "var(--good)"];

/** A short burst of confetti, built from plain DOM nodes and removed afterwards. */
export function burstConfetti(pieces = 90): void {
  if (prefersReducedMotion()) return;
  const layer = document.createElement("div");
  layer.className = "confetti-layer";
  layer.setAttribute("aria-hidden", "true");
  for (let i = 0; i < pieces; i++) {
    const piece = document.createElement("span");
    piece.className = "confetti-piece";
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.background = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
    piece.style.setProperty("--dx", `${(Math.random() - 0.5) * 240}px`);
    piece.style.setProperty("--rot", `${(Math.random() - 0.5) * 1080}deg`);
    piece.style.animationDuration = `${1.6 + Math.random() * 1.4}s`;
    piece.style.animationDelay = `${Math.random() * 0.35}s`;
    layer.appendChild(piece);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3800);
}
