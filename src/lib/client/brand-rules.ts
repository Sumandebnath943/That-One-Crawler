"use client";

import type { BrandRules } from "@/lib/seo/types";
import { bareHost } from "@/lib/seo/url";

// Brand rules live in the visitor's browser, one set per site (e.g. your blog vs a competitor's).

const STORAGE_KEY = "toc-brand-rules";

export const EMPTY_RULES: BrandRules = { brandName: "", bannedPhrases: [], requiredPhrases: [] };

function readAll(): Record<string, BrandRules> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, BrandRules>;
  } catch {
    return {};
  }
}

export function siteKeyFor(url: string): string {
  try {
    return bareHost(new URL(url).hostname);
  } catch {
    return url.toLowerCase();
  }
}

export function loadBrandRules(site: string): BrandRules | null {
  const rules = readAll()[site];
  return rules && hasRules(rules) ? rules : null;
}

export function saveBrandRules(site: string, rules: BrandRules): void {
  const all = readAll();
  if (hasRules(rules)) all[site] = rules;
  else delete all[site];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch {
    // Storage blocked: rules apply to this visit only.
  }
}

export function hasRules(rules: BrandRules): boolean {
  return Boolean(rules.brandName.trim() || rules.bannedPhrases.length || rules.requiredPhrases.length);
}

export function parsePhraseList(text: string): string[] {
  return [
    ...new Set(
      text
        .split(/\r?\n|,/)
        .map((p) => p.trim())
        .filter(Boolean),
    ),
  ].slice(0, 30);
}
