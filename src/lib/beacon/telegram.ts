// The Telegram Bot API, the few calls the beacon needs.
//
//   TELEGRAM_BOT_TOKEN       from @BotFather
//   TELEGRAM_CHAT_ID         your chat with the bot (or a group it's in)
//   TELEGRAM_WEBHOOK_SECRET  any long random string; lets the bot take commands (/bots off…)
//
// With the token or chat id missing, every alert is a quiet no-op, so a half-configured deploy
// never breaks a page.

// Overridable only so tests can point it at a local fake.
const API = (process.env.TELEGRAM_API_URL || "https://api.telegram.org").replace(/\/$/, "");

// A cold connection from a serverless region to Telegram measured 5.6s; 4s dropped alerts.
const SEND_TIMEOUT_MS = 8_000;
/** Telegram rejects messages over 4,096 characters. */
const MAX_TEXT = 4_000;

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export function ownerChatId(): string {
  return process.env.TELEGRAM_CHAT_ID ?? "";
}

/** Telegram's HTML mode only needs these three escaped. */
export function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function clip(value: string, max: number): string {
  const t = value.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export interface Button {
  text: string;
  data: string;
}

export interface SendOptions {
  buttons?: Button[][];
  /** Arrive without a sound: for routine crawler visits. */
  silent?: boolean;
  chatId?: string;
}

export async function callTelegram<T = unknown>(method: string, body: Record<string, unknown>): Promise<{ ok: boolean; result?: T; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "not configured" };
  // Two tries: the first request from a cold container pays for TCP and TLS, and that's exactly
  // the one carrying the first alert after a deploy. A rejected request isn't retried.
  let lastError = "request failed";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API}/bot${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: T; description?: string } | null;
      if (res.ok && data?.ok) return { ok: true, result: data.result };
      return { ok: false, error: `telegram ${res.status} ${clip(data?.description ?? "", 160)}` };
    } catch (err) {
      lastError = err instanceof Error ? err.message : "request failed";
    }
  }
  return { ok: false, error: lastError };
}

export async function sendTelegram(text: string, options: SendOptions = {}): Promise<{ ok: boolean; error?: string }> {
  const chatId = options.chatId ?? ownerChatId();
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return { ok: false, error: "not configured" };
  const sent = await callTelegram("sendMessage", {
    chat_id: chatId,
    text: clip(text, MAX_TEXT),
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(options.silent ? { disable_notification: true } : {}),
    ...(options.buttons?.length
      ? { reply_markup: { inline_keyboard: options.buttons.map((row) => row.map((b) => ({ text: b.text, callback_data: b.data }))) } }
      : {}),
  });
  if (!sent.ok) console.error("[beacon] telegram send failed:", sent.error);
  return sent;
}
