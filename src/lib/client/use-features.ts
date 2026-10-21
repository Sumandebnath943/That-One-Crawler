"use client";

import { useEffect, useState } from "react";
import type { FeatureFlags } from "@/lib/seo/types";

let cached: Promise<FeatureFlags> | null = null;

function loadFeatures(): Promise<FeatureFlags> {
  cached ??= fetch("/api/config")
    .then((res) => (res.ok ? (res.json() as Promise<FeatureFlags>) : { pagespeed: false, ai: false }))
    .catch(() => {
      cached = null;
      return { pagespeed: false, ai: false };
    });
  return cached;
}

/** Which optional features (PageSpeed, AI) this deployment has keys for. null while loading. */
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
