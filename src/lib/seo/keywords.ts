import type { KeywordCandidate } from "./types";

// Deterministic keyword picker: every candidate is a phrase that really occurs on the page,
// scored by where it appears (title, H1, URL, description, headings) and how often the body uses it.
// No search volumes are invented. Cross-page work (dropping site-wide boilerplate such as the
// blog's name, spotting cannibalization) happens in the report, which sees every page.

const STOP = new Set(
  (
    "a an the and or but if then else of to in on at by for with from into onto over under about as is are was were be been being " +
    "it its this that these those there here which who whom whose what when where why how can could should would will shall may might must " +
    "do does did done not no nor so than too very just also only more most less least much many any some each every all both either neither " +
    "you your yours we our ours they their them he she his her i me my us up down out off again once own same other such per via vs " +
    "get got make made use used using one two three first new now well even still like into been has have had our"
  ).split(/\s+/),
);

const NOISE = new Set(
  (
    "home page official site website blog welcome login log sign signup register click read learn more terms privacy policy cookie cookies " +
    "menu share follow copyright rights reserved contact skip content navigation comments comment reply posted leave search archives " +
    "categories category tags tag uncategorized author admin previous next post posts"
  ).split(/\s+/),
);

// Words that need what follows them: a phrase ending in one is a fragment ("loan based").
const ENDS_OPEN = new Set("based depending according due subject related compared regardless including prior instead rather".split(" "));

// Dates are when a page was written, not what it's about ("aug 2026", "october 22").
const DATE_WORDS = new Set(
  (
    "jan feb mar apr jun jul aug sep sept oct nov dec january february march april june july august september october november december " +
    "mon tue wed thu fri sat sun monday tuesday wednesday thursday friday saturday sunday today yesterday"
  ).split(" "),
);
const isNumber = (t: string) => /^[\d.]+(?:st|nd|rd|th)?$/.test(t);

// Stands in for a dot inside a number while punctuation is stripped, so "7.1.2" stays one token.
const NUMBER_DOT = "․";

export function tokenize(text: string): string[] {
  return (text || "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/(?<=\d)\.(?=\d)/g, NUMBER_DOT)
    .replace(/[^\p{L}\p{N}'․ ]+/gu, " ")
    .split(/\s+/)
    .map((t) => t.replace(/^'+|'+$/g, "").replaceAll(NUMBER_DOT, "."))
    .filter(Boolean);
}

function goodGram(gram: string[]): boolean {
  const first = gram[0];
  const last = gram[gram.length - 1];
  if (STOP.has(first) || STOP.has(last) || ENDS_OPEN.has(last)) return false;
  if (gram.some((t) => t.length < 2 && !/\d/.test(t))) return false;
  if (gram.every((t) => NOISE.has(t) || /^[\d.]+$/.test(t))) return false;
  if (gram.length === 1 && (first.length < 4 || /^[\d.]+$/.test(first))) return false;
  if (gram.every((t) => DATE_WORDS.has(t) || isNumber(t))) return false;
  if (gram.some((t) => DATE_WORDS.has(t)) && gram.some(isNumber)) return false;
  return true;
}

function phrasesOf(text: string, maxN = 4): string[] {
  const out: string[] = [];
  // Split at punctuation, except a dot inside a number ("WordPress 7.1.3" stays one phrase).
  for (const chunk of (text || "").split(/(?:(?<!\d)\.|\.(?!\d)|[!?;:,()[\]|\n\r–—•"\/\\])+|\s[-|]\s/)) {
    const words = tokenize(chunk);
    for (let n = 1; n <= maxN; n++) {
      for (let i = 0; i + n <= words.length; i++) {
        const gram = words.slice(i, i + n);
        if (goodGram(gram)) out.push(gram.join(" "));
      }
    }
  }
  return out;
}

// Words that end in "s" without being plurals.
const NOT_PLURAL = new Set("news series species lens always perhaps whereas thus various previous famous".split(" "));

/**
 * Plural-insensitive form of a word: "descriptions" → "description", "categories" → "category".
 * Only used for matching; what people see is always the phrase as written.
 */
export function stemWord(word: string): string {
  if (word.length <= 3 || NOT_PLURAL.has(word)) return word;
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  return word.replace(/(?<![su])s$/, "");
}

const stem = (words: string[]) => words.map(stemWord);

/** " a b c " (stemmed) so phrase matching can use plain includes() on word boundaries. */
const padded = (text: string) => ` ${stem(tokenize(text)).join(" ")} `;

function countIn(paddedText: string, phrase: string): number {
  const needle = ` ${phrase} `;
  let count = 0;
  let index = paddedText.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = paddedText.indexOf(needle, index + needle.length - 1);
  }
  return count;
}

export interface KeywordSource {
  title: string;
  h1: string;
  headings: string[];
  metaDescription: string;
  url: string;
  bodyText: string;
}

function slugText(url: string): string {
  try {
    return new URL(url).pathname
      .split("/")
      .filter(Boolean)
      .map((part) =>
        decodeURIComponent(part)
          .replace(/\.[a-z0-9]+$/i, "")
          // Slugs spell versions "7-1-3"; read them as "7.1.3" to match the title.
          .replace(/(?<=\d)[-_](?=\d)/g, ".")
          .replace(/[-_+]+/g, " "),
      )
      .join(" ");
  } catch {
    return "";
  }
}

export function keywordCandidates(source: KeywordSource, max = 10): KeywordCandidate[] {
  // Matching is plural-insensitive: "meta descriptions" counts towards "meta description".
  const rawBody = tokenize(source.bodyText).slice(0, 20_000);
  const bodyWords = stem(rawBody);
  const body = ` ${bodyWords.join(" ")} `;
  const intro = ` ${bodyWords.slice(0, 100).join(" ")} `;
  const title = padded(source.title);
  const h1 = padded(source.h1);
  const meta = padded(source.metaDescription);
  const slug = padded(slugText(source.url));
  const headings = source.headings.map(padded);

  // Stemmed key → the phrase as first written (title first), for display.
  const candidates = new Map<string, string>();
  for (const phrase of [
    ...phrasesOf(source.title),
    ...phrasesOf(source.h1),
    ...phrasesOf(slugText(source.url)),
    ...phrasesOf(source.metaDescription, 3),
    ...source.headings.flatMap((h) => phrasesOf(h, 3)),
  ]) {
    const key = keywordKey(phrase);
    if (!candidates.has(key)) candidates.set(key, phrase);
  }

  // Frequent two- and three-word phrases from the body can be keywords even if no heading uses them.
  const bodyGrams = new Map<string, number>();
  // How each stemmed gram was first written, so we show "this site", never "thi site".
  const asWritten = new Map<string, string>();
  for (let n = 2; n <= 3; n++) {
    for (let i = 0; i + n <= bodyWords.length; i++) {
      const gram = bodyWords.slice(i, i + n);
      if (!goodGram(gram) || !goodGram(rawBody.slice(i, i + n))) continue;
      const key = gram.join(" ");
      bodyGrams.set(key, (bodyGrams.get(key) ?? 0) + 1);
      if (!asWritten.has(key)) asWritten.set(key, rawBody.slice(i, i + n).join(" "));
    }
  }
  for (const [gram, count] of bodyGrams) if (count >= 3 && !candidates.has(gram)) candidates.set(gram, asWritten.get(gram) ?? gram);

  const scored: KeywordCandidate[] = [];
  for (const [key, phrase] of candidates) {
    const count = bodyGrams.get(key) ?? countIn(body, key);
    const spots = {
      title: title.includes(` ${key} `),
      h1: h1.includes(` ${key} `),
      meta: meta.includes(` ${key} `),
      url: slug.includes(` ${key} `),
      intro: intro.includes(` ${key} `),
    };
    if (!count && !spots.title && !spots.h1) continue;
    const headingHits = headings.filter((h) => h.includes(` ${key} `)).length;
    const n = phrase.split(" ").length;
    let score =
      (spots.title ? 3 : 0) +
      (spots.h1 ? 3 : 0) +
      (spots.url ? 2 : 0) +
      (spots.meta ? 1 : 0) +
      Math.min(2, headingHits) +
      Math.log2(1 + count) * 1.5;
    score *= n === 1 ? 0.7 : n === 2 ? 1.3 : 1.2;
    scored.push({ phrase, score: Math.round(score * 100) / 100, count, ...spots });
  }

  scored.sort((a, b) => b.score - a.score || b.phrase.length - a.phrase.length);
  const contains = (longer: KeywordCandidate, shorter: KeywordCandidate) =>
    longer !== shorter && ` ${keywordKey(longer.phrase)} `.includes(` ${keywordKey(shorter.phrase)} `);

  // Drop a phrase when a longer phrase containing it scores about as well ("seo" under "seo audit").
  const kept: KeywordCandidate[] = [];
  for (const candidate of scored) {
    const covered = kept.some((k) => contains(k, candidate) && k.score >= candidate.score * 0.8);
    if (!covered) kept.push(candidate);
    if (kept.length >= max) break;
  }

  // Prefer the more specific phrase when the title and H1 both use it ("broken link checker" over "broken link").
  // Scores can't decide this: every use of the longer phrase also counts towards the shorter one.
  // Only compact phrases qualify, so "where to put your main keyword" never beats "main keyword".
  // Search every candidate: a four-word title phrase can rank below the top ten.
  const top = kept[0];
  const compact = (k: KeywordCandidate) => !k.phrase.split(" ").some((w) => STOP.has(w));
  const specific =
    top && scored.find((k) => contains(k, top) && compact(k) && k.title && k.h1 && k.count > 0);
  if (specific) {
    if (kept.includes(specific)) kept.splice(kept.indexOf(specific), 1);
    kept.unshift(specific);
    kept.length = Math.min(kept.length, max);
  }
  return kept;
}

/** Plural-insensitive form so "seo checkers" and "seo checker" count as the same keyword. */
export function keywordKey(phrase: string): string {
  return phrase.split(" ").map(stemWord).join(" ");
}

/**
 * Pick each page's main keyword, ignoring phrases that appear on a large share of pages
 * (the blog's name in every title, "read more", etc.).
 */
export function assignPrimaryKeywords(pages: { key: string; keywords: KeywordCandidate[] }[]): Map<string, KeywordCandidate> {
  const withKeywords = pages.filter((p) => p.keywords.length);
  const spread = new Map<string, number>();
  for (const page of withKeywords) {
    for (const phrase of new Set(page.keywords.map((k) => keywordKey(k.phrase)))) {
      spread.set(phrase, (spread.get(phrase) ?? 0) + 1);
    }
  }
  const boilerplate = (phrase: string) =>
    withKeywords.length >= 5 && (spread.get(keywordKey(phrase)) ?? 0) / withKeywords.length > 0.4;

  const result = new Map<string, KeywordCandidate>();
  for (const page of withKeywords) {
    const usable = page.keywords.filter((k) => !boilerplate(k.phrase));
    const top = usable[0];
    if (!top) continue;
    // The title is where a page says what it targets. When the body's favourite phrase isn't in it but
    // a title phrase scores nearly as well, the title phrase is the real main keyword.
    const fromTitle = top.title ? top : usable.find((k) => k.title && k.score >= top.score * 0.6);
    result.set(page.key, fromTitle ?? top);
  }
  return result;
}

/** Contact, about, FAQ, legal and account pages: people reach them by navigating, not by searching a topic. */
export function isUtilityPage(url: string): boolean {
  try {
    return /^\/(?:[a-z]{2}(?:-[a-z]{2})?\/)?(?:contact(?:-us)?|about(?:-us)?|faqs?|privacy(?:-policy)?|terms(?:-of-(?:use|service))?|legal|imprint|impressum|disclaimer|cookies?(?:-policy)?|accessibility|login|log-in|sign-?in|sign-?up|register|account|cart|checkout|search|sitemap|thank-?you)(?:\/|\.html?)?$/i.test(
      new URL(url).pathname,
    );
  } catch {
    return false;
  }
}

/** Category, tag, author and archive pages: hubs that are meant to share their posts' keywords. */
export function isHubPage(url: string, schemaTypes: string[] = []): boolean {
  if (schemaTypes.some((t) => t === "CollectionPage" || t === "Blog")) return true;
  try {
    return /\/(?:category|categories|tag|tags|topic|topics|author|authors|archive|archives|series|page\/\d+)(?:\/|$)/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
