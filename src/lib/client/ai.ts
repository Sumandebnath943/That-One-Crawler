"use client";

import { useEffect, useSyncExternalStore } from "react";
import { shortUrl, track } from "@/lib/client/beacon-events";
import type { AiResult, QuotaInfo } from "@/lib/seo/types";

// The AI tools call /api/ai. Visitors get a few free actions a day on our keys; after that they
// can paste their own free Gemini key, which lives only in their browser (localStorage) and is
// sent with each AI request. Our server uses it for that request and never stores it.

const KEY_STORAGE = "toc-gemini-key";
const KEY_FORMAT = /^[A-Za-z0-9_\-.]{20,200}$/;

export class QuotaError extends Error {}

let quota: QuotaInfo | null = null;
let keyVersion = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getUserKey(): string | null {
  try {
    return localStorage.getItem(KEY_STORAGE);
  } catch {
    return null;
  }
}

export function isValidKey(key: string): boolean {
  return KEY_FORMAT.test(key.trim());
}

export function setUserKey(key: string | null): void {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key.trim());
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    // Storage blocked: nothing we can keep.
  }
  keyVersion += 1;
  notify();
}

async function refreshQuota(): Promise<void> {
  try {
    const res = await fetch("/api/ai");
    const data = (await res.json()) as { quota?: QuotaInfo };
    if (data.quota) {
      quota = data.quota;
      notify();
    }
  } catch {
    // Offline or blocked: the bar just keeps saying "checking".
  }
}

/** Free AI actions left today (null while loading). */
export function useQuota(): QuotaInfo | null {
  const value = useSyncExternalStore(subscribe, () => quota, () => null);
  useEffect(() => {
    if (!quota) void refreshQuota();
  }, []);
  return value;
}

/** Whether the visitor has saved their own Gemini key. */
export function useHasUserKey(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => (keyVersion >= 0 ? Boolean(getUserKey()) : false),
    () => false,
  );
}

const TASK_LABEL: Record<string, string> = {
  meta: "rewrote a title & meta description",
  section: "rewrote a section",
  headings: "fixed headings",
  faq: "wrote an FAQ",
  intro: "rewrote an intro",
  plan: "built an action plan",
};

export async function runAi<T extends object>(body: Record<string, unknown>): Promise<AiResult<T>> {
  const key = getUserKey();
  const task = String(body.task ?? "");
  track("ai", `${TASK_LABEL[task] ?? task}${typeof body.url === "string" ? ` · ${shortUrl(body.url)}` : ""}${key ? " (own key)" : ""}`);
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(key ? { "x-gemini-key": key } : {}) },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => null)) as { result?: AiResult<T>; quota?: QuotaInfo; error?: string; code?: string } | null;
  if (data?.quota) {
    quota = data.quota;
    notify();
  }
  if (!res.ok || !data?.result) {
    if (data?.code === "quota") throw new QuotaError(data.error ?? "Out of free AI actions for today.");
    throw new Error(data?.error ?? `The AI request failed (${res.status}).`);
  }
  return data.result;
}
