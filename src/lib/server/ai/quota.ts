import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { DEFAULT_AI_DAILY_LIMIT } from "@/lib/limits";
import { clientIp, hit, peek } from "../rate-limit";

// Free AI actions per visitor per day, with no database:
//  - a signed, HttpOnly cookie counts actions per browser (tamper-proof, but clearable), and
//  - an in-memory per-IP counter (twice the limit, to tolerate shared offices) catches cookie clearing.
// After the limit, visitors can paste their own free Gemini key, which bypasses this entirely.

const COOKIE = "toc_ai";
const DAY_MS = 24 * 60 * 60 * 1000;

export function dailyLimit(): number {
  const value = Number(process.env.AI_DAILY_LIMIT);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : DEFAULT_AI_DAILY_LIMIT;
}

function secret(): string {
  return (
    process.env.AI_QUOTA_SECRET ||
    createHash("sha256")
      .update(`${process.env.GROQ_API_KEY ?? ""}|${process.env.GEMINI_API_KEY || process.env.GEMINI_KEY || ""}|toc-quota-v1`)
      .digest("hex")
  );
}

const today = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function readCookie(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Actions this browser has used today, from the signed cookie (0 if missing, expired or tampered with). */
export function usedToday(request: Request, now = Date.now()): number {
  const raw = readCookie(request);
  if (!raw) return 0;
  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return 0;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return 0;
  const [day, count] = Buffer.from(payload, "base64url").toString("utf8").split(":");
  return day === today(now) ? Math.max(0, Number(count) || 0) : 0;
}

export interface QuotaCheck {
  limit: number;
  used: number;
  remaining: number;
}

export function checkQuota(request: Request, now = Date.now()): QuotaCheck {
  const limit = dailyLimit();
  const ipUsed = peek(`ai-day:${clientIp(request)}:${today(now)}`, now);
  const used = Math.max(usedToday(request, now), ipUsed > limit * 2 ? limit : 0);
  return { limit, used, remaining: Math.max(0, limit - used) };
}

/** Record one action; returns the Set-Cookie header to send back. */
export function spendQuota(request: Request, used: number, now = Date.now()): string {
  hit(`ai-day:${clientIp(request)}:${today(now)}`, Number.MAX_SAFE_INTEGER, DAY_MS, now);
  const payload = Buffer.from(`${today(now)}:${used + 1}`).toString("base64url");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${payload}.${sign(payload)}; Path=/; Max-Age=172800; HttpOnly; SameSite=Lax${secure}`;
}
