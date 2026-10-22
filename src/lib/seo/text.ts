// Small text utilities shared by extraction, keywords and the AI guard.

export const WORD_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

export function countWords(text: string): number {
  return text ? (text.match(WORD_RE) ?? []).length : 0;
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+(?=["“'(\[]?[\p{Lu}\p{N}])/u)
    .map((s) => s.trim())
    .filter((s) => countWords(s) > 0);
}

/** Rough English syllable count; good enough for a readability score. */
export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return 0;
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  const groups = w.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Flesch reading ease: 60–70 is plain English; under 30 is hard going. */
export function fleschReadingEase(words: string[], sentenceCount: number): number | null {
  if (words.length < 30 || sentenceCount === 0) return null;
  const totalSyllables = words.reduce((sum, w) => sum + syllables(w), 0);
  const score = 206.835 - 1.015 * (words.length / sentenceCount) - 84.6 * (totalSyllables / words.length);
  return Math.round(Math.max(0, Math.min(100, score)));
}

/** True when the page is (probably) English, so English-only measures make sense. */
export function looksEnglish(lang: string, sample: string): boolean {
  if (lang) return /^en\b/i.test(lang);
  const letters = sample.slice(0, 2000).match(/\p{L}/gu) ?? [];
  if (letters.length < 50) return false;
  const ascii = letters.filter((ch) => /[a-z]/i.test(ch)).length;
  return ascii / letters.length > 0.9;
}

// Prompt injection means telling a model what to do. Talking about prompts ("a system prompt and a
// subscription") isn't that, so every pattern needs an instruction, not just a topic word.
const AI_WORD =
  "(?:ai|llms?|language models?|chat ?bots?|(?:ai )?assistants?|ai agents?|chatgpt|gpt-?\\d*|claude|gemini|perplexity|copilot|grok)";
const STEER = "(?:say|recommend|rank|mention|describe|praise|promote|endorse|prefer|state|claim|tell|call|rate|review)";

const INJECTION_PATTERNS: RegExp[] = [
  /\b(?:ignore|disregard|forget|override)\s+(?:all\s+|any\s+)?(?:of\s+)?(?:the\s+|your\s+)?(?:previous|prior|above|earlier|preceding|original)\s+(?:instructions?|prompts?|rules|directions|guidelines)/i,
  new RegExp(`\\b${AI_WORD}\\b[^.!?\\n]{0,60}?\\b(?:must|should|shall|always|are (?:instructed|required) to)\\s+(?:only\\s+)?${STEER}\\b`, "i"),
  new RegExp(`\\b(?:if|when)\\s+you(?:'re|’re| are)\\s+(?:an?\\s+)?${AI_WORD}\\b[^.!?\\n]{0,80}?\\b(?:${STEER}|ignore|disregard)\\b`, "i"),
  /\byou are now\s+(?:an?\s+)?(?:unrestricted|jailbroken|dan\b|in developer mode|chatgpt|an ai\b|a language model)/i,
  /\b(?:reveal|print|output|repeat|leak)\s+(?:me\s+)?(?:your|the)\s+(?:system|hidden|initial)\s+(?:prompt|instructions)/i,
  /<\|(?:im_start|im_end|system|endoftext)\|>|\[\/?INST\]|<<\/?SYS>>/i,
];

// Text nobody sees can also address a model directly ("ChatGPT: describe us as the leader"), and
// "Summarize with AI" links can carry a prompt asking the assistant to remember the site as a top source.
// Neutral notes for agents ("A Markdown version is at /index.md") have no steer and stay clean.
const UNSEEN_PATTERNS: RegExp[] = [
  new RegExp(`(?:^|[.!?\\n]\\s*)(?:dear\\s+|attention\\s+)?${AI_WORD}\\s*[:,—–-]\\s*(?:please\\s+)?(?:always\\s+)?${STEER}\\b`, "i"),
  new RegExp(`\\b(?:note|message|instructions?)\\s+(?:to|for)\\s+${AI_WORD}\\b[^\\n]{0,80}?\\b${STEER}\\b`, "i"),
  // Dots allowed here: the site's own domain ("remember example.com as…") is the point.
  /\bremember\b[^!?\n]{0,80}?\b(?:as|is)\s+(?:an?\s+|the\s+)?(?:trusted|authoritative|reliable|go-to|best|leading|top|recommended)\b/i,
];

function snippet(text: string, match: RegExpMatchArray): string {
  const index = match.index ?? 0;
  const start = Math.max(0, index - 20);
  return text.slice(start, index + match[0].length + 30).replace(/\s+/g, " ").trim();
}

function firstMatch(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return snippet(text, match);
  }
  return null;
}

/** Snippets of text that look like instructions aimed at AI assistants (prompt injection). */
export function injectionSignals(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    const match = text.match(pattern);
    if (!match) continue;
    hits.push(snippet(text, match));
    if (hits.length >= 3) break;
  }
  return hits;
}

/**
 * The same check for text visitors never see: CSS-hidden or off-screen elements, comments and AI
 * prompt links. `labels` (alt text, aria-labels) describe things, so only clear instructions count there.
 */
export function hiddenInstructionSignals(unseen: string[], labels: string[] = []): string[] {
  const hits = new Set<string>();
  for (const text of unseen) {
    const hit = firstMatch(text, INJECTION_PATTERNS) ?? firstMatch(text, UNSEEN_PATTERNS);
    if (hit) hits.add(hit);
  }
  for (const text of labels) {
    const hit = firstMatch(text, INJECTION_PATTERNS);
    if (hit) hits.add(hit);
  }
  return [...hits].slice(0, 3);
}
