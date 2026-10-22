// Google cuts titles off by width, not by character count: desktop results show about 600px of
// 20px Arial. These are Arial's advance widths (per 1000 units of the font size) for printable
// ASCII, so "Illicit" and "WOMBAT MMXXIV" measure as differently as they render.

// Widths for characters 32 (space) to 126 (~), in order.
// prettier-ignore
const ARIAL = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, // space ! " # $ % & ' ( ) * + , - . /
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, // 0-9
  278, 278, 584, 584, 584, 556, 1015, // : ; < = > ? @
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, // A-M
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, // N-Z
  278, 278, 278, 469, 556, 333, // [ \ ] ^ _ `
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, // a-m
  556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, // n-z
  334, 260, 334, 584, // { | } ~
];

const WIDE = /[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/;

function charWidth(ch: string): number {
  const code = ch.codePointAt(0) ?? 32;
  if (code >= 32 && code <= 126) return ARIAL[code - 32];
  if (WIDE.test(ch)) return 1000;
  // Common typographic characters, then an average lowercase letter for everything else.
  if ("–·•".includes(ch)) return ch === "–" ? 556 : 333;
  if (ch === "—" || ch === "…") return 1000;
  if ("‘’‚".includes(ch)) return 222;
  if ("“”„".includes(ch)) return 333;
  return 556;
}

/** Rendered width of `text` in Arial at `sizePx`, rounded to whole pixels. */
export function textWidth(text: string, sizePx = 20): number {
  let units = 0;
  for (const ch of text) units += charWidth(ch);
  return Math.round((units * sizePx) / 1000);
}

/** Desktop Google shows about this much of a title (20px Arial) before the ellipsis. */
export const TITLE_MAX_PX = 600;

export function titleWidth(title: string): number {
  return textWidth(title, 20);
}
