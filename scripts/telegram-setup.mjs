// One-time setup for the visitor-alert bot. Run after adding the TELEGRAM_* variables:
//
//   npm run telegram:setup -- --find-chat   prints your chat id (message the bot first)
//   npm run telegram:setup                  points the bot's webhook at the live site and
//                                           registers its commands (/bots, /pause, /status…)
//
// Reads .env / .env.local when present. Prints nothing secret.

import { existsSync } from "node:fs";

for (const file of [".env.local", ".env"]) if (existsSync(file)) process.loadEnvFile(file);

const token = process.env.TELEGRAM_BOT_TOKEN;
const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
const site = (process.env.NEXT_PUBLIC_SITE_URL || "https://thatonecrawler.houseofnamus.com").replace(/\/$/, "");

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN is missing. Create a bot with @BotFather and add the token to .env.");
  process.exit(1);
}

async function call(method, body = {}) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

const me = await call("getMe");
console.log(`Bot: @${me.username}`);

if (process.argv.includes("--find-chat")) {
  // getUpdates only works while no webhook is set.
  await call("deleteWebhook");
  const updates = await call("getUpdates");
  const chats = new Map();
  for (const u of updates) {
    const chat = u.message?.chat ?? u.my_chat_member?.chat;
    if (chat) chats.set(chat.id, chat.title ?? [chat.first_name, chat.last_name].filter(Boolean).join(" ") ?? chat.username);
  }
  if (!chats.size) console.log(`No messages yet. Open t.me/${me.username}, press Start, then run this again.`);
  for (const [id, name] of chats) console.log(`TELEGRAM_CHAT_ID=${id}   (${name})`);
  console.log("Run `npm run telegram:setup` (without --find-chat) afterwards to turn commands back on.");
  process.exit(0);
}

if (!secret || secret.length < 16 || !/^[A-Za-z0-9_-]+$/.test(secret)) {
  console.error("TELEGRAM_WEBHOOK_SECRET must be 16+ characters of letters, digits, _ or -. Generate one with:");
  console.error("  node -e \"console.log(require('crypto').randomBytes(24).toString('hex'))\"");
  process.exit(1);
}

await call("setWebhook", {
  url: `${site}/api/telegram`,
  secret_token: secret,
  allowed_updates: ["message", "callback_query"],
  drop_pending_updates: true,
});
await call("setMyCommands", {
  commands: [
    { command: "status", description: "What's on, with quick buttons" },
    { command: "bots", description: "Bot alerts: /bots off · /bots ai · /bots on" },
    { command: "pause", description: "Hold all alerts: /pause 2h" },
    { command: "resume", description: "Alerts back on" },
    { command: "test", description: "Send a sample visitor alert" },
    { command: "help", description: "All commands" },
  ],
});
await call("setMyDescription", { description: `Private visitor alerts for ${site}. Only the site owner's chat is answered.` });

const info = await call("getWebhookInfo");
console.log(`Webhook: ${info.url}`);
if (info.last_error_message) console.log(`Last webhook error: ${info.last_error_message}`);
console.log("Done. Send /status to the bot to check it answers.");
