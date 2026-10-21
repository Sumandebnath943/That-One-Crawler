"use client";

import { useEffect, useState } from "react";
import { DEFAULT_AI_DAILY_LIMIT } from "@/lib/limits";
import type { FeatureFlags } from "@/lib/seo/types";

const NONE: FeatureFlags = { pagespeed: false, crux: false, ai: false, aiDailyLimit: DEFAULT_AI_DAILY_LIMIT };
let cached: Promise<FeatureFlags> | null = null;

function loadFeatures(): Promise<FeatureFlags> {
  if (!cached) {
    cached = fetch("/api/config")
      .then((res) => (res.ok ? (res.json() as Promise<FeatureFlags>) : NONE))
      .catch(() => {
        cached = null;
        return NONE;
      });
  }
  return cached;
}

/** Which optional features (PageSpeed, real-user speed, AI) this deployment has keys for. null while loading. */
export function useFeatures(): FeatureFlags | null {
  const [features, setFeatures] = useState<FeatureFlags | null>(null);
  useEffect(() => {
    let alive = true;
    loadFeatures().then((f) => alive && setFeatures(f));
    return () => {
      alive = false;
    };
  }, []);
  return features;
}
