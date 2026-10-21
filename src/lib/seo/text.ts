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

const INJECTION_PATTERNS: RegExp[] = [
  /ignore (?:all |any )?(?:the )?(?:previous|prior|above|earlier) (?:instructions|prompts?|rules)/i,
  /disregard (?:all |any )?(?:the )?(?:previous|prior|above|earlier)/i,
  /\byou are (?:now )?(?:chatgpt|an ai\b|a language model|gpt|claude|gemini|an assistant)/i,
  /\b(?:system|developer) prompt\b/i,
  /<\|(?:im_start|system|endoftext)\|>/i,
  /\b(?:ai|llm|chatbot|assistant|chatgpt|claude|gemini|perplexity)s?\b[^.]{0,60}\b(?:must|should|always) (?:say|recommend|rank|mention|describe|praise)/i,
  /\bnote to (?:ai|llms?|language models|assistants)\b/i,
];

/** Snippets of text that look like instructions aimed at AI assistants (prompt injection). */
export function injectionSignals(text: string): string[] {
  const hits: string[] = [];
  for (const pattern of INJECTION_PATTERNS) {
    const match = text.match(pattern);
    if (!match || match.index === undefined) continue;
    const start = Math.max(0, match.index - 20);
    hits.push(text.slice(start, match.index + match[0].length + 30).replace(/\s+/g, " ").trim());
    if (hits.length >= 3) break;
  }
  return hits;
}
