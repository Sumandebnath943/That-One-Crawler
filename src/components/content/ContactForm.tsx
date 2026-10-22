"use client";

import { useId, useRef, useState, type FormEvent } from "react";
import { CONTACT_TOPICS } from "@/lib/content/pages";
import { REPO_URL } from "@/lib/site";
import { Mascot } from "../Mascot";

type State = { kind: "idle" } | { kind: "sending" } | { kind: "sent"; reply: boolean } | { kind: "error"; message: string; unavailable?: boolean };

const field =
  "w-full rounded-xl border-2 border-ink bg-paper px-3 py-2.5 text-base text-ink placeholder:text-ink-3 focus:outline-none focus-visible:ring-3 focus-visible:ring-note";

/** Sends a message to the site owner (via /api/contact). */
export function ContactForm() {
  const id = useId();
  const opened = useRef(0);
  const [state, setState] = useState<State>({ kind: "idle" });
  const [length, setLength] = useState(0);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.get("name"),
          email,
          topic: form.get("topic"),
          message: form.get("message"),
          company: form.get("company"),
          elapsed: opened.current ? Date.now() - opened.current : 0,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; code?: string } | null;
      if (res.ok && data?.ok) setState({ kind: "sent", reply: Boolean(email) });
      else setState({ kind: "error", message: data?.error ?? `Something went wrong (${res.status}). Please try again.`, unavailable: data?.code === "unavailable" });
    } catch {
      setState({ kind: "error", message: "We couldn't reach the server. Check your connection and try again." });
    }
  };

  if (state.kind === "sent") {
    return (
      <div role="status" className="rise flex flex-col items-center gap-3 rounded-2xl border-2 border-ink bg-lime p-8 text-center text-lime-ink shadow-brutal theme-light">
        <Mascot mood="happy" follow={false} className="size-20" />
        <p className="font-display text-2xl font-extrabold">Message sent. Thank you!</p>
        <p className="max-w-sm text-ink-2">
          {state.reply ? "It's on its way to Suman. Expect a reply by email, usually within a few days." : "It's on its way to Suman. You didn't leave an email, so there won't be a reply, but it will be read."}
        </p>
        <button type="button" onClick={() => setState({ kind: "idle" })} className="mt-1 text-sm font-bold underline underline-offset-4">
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      onFocus={() => {
        if (!opened.current) opened.current = Date.now();
      }}
      aria-label="Contact form"
      className="space-y-4 rounded-2xl border-2 border-ink bg-card p-5 shadow-brutal sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-name`} className="mb-1.5 block text-sm font-bold">
            Name <span className="font-normal text-ink-3">(optional)</span>
          </label>
          <input id={`${id}-name`} name="name" autoComplete="name" maxLength={80} className={field} placeholder="Ada" />
        </div>
        <div>
          <label htmlFor={`${id}-email`} className="mb-1.5 block text-sm font-bold">
            Email <span className="font-normal text-ink-3">(for a reply)</span>
          </label>
          <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={200} className={field} placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <label htmlFor={`${id}-topic`} className="mb-1.5 block text-sm font-bold">
          What&apos;s it about?
        </label>
        <select id={`${id}-topic`} name="topic" className={field} defaultValue={CONTACT_TOPICS[0]}>
          {CONTACT_TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor={`${id}-message`} className="mb-1.5 flex items-baseline justify-between text-sm font-bold">
          Message
          <span className="font-mono text-xs font-normal text-ink-3">{length}/3000</span>
        </label>
        <textarea
          id={`${id}-message`}
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={6}
          onChange={(e) => setLength(e.target.value.length)}
          className={`${field} resize-y`}
          placeholder="The site you scanned, what you expected, what happened instead…"
        />
      </div>
      {/* Hidden from people; spam bots fill it in. */}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`${id}-company`}>Company</label>
        <input id={`${id}-company`} name="company" tabIndex={-1} autoComplete="off" />
      </div>

      {state.kind === "error" && (
        <p role="alert" className="rounded-xl border-2 border-crit bg-crit/10 px-3 py-2 text-sm font-semibold text-crit">
          {state.message}{" "}
          {state.unavailable && (
            <a href={`${REPO_URL}/issues/new`} className="underline underline-offset-2">
              Open a GitHub issue
            </a>
          )}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={state.kind === "sending"}
          className="rounded-xl border-2 border-ink bg-lime px-5 py-2.5 font-display text-lg font-extrabold text-lime-ink transition hover:-translate-y-0.5 hover:shadow-brutal-sm disabled:opacity-60"
        >
          {state.kind === "sending" ? "Sending…" : "Send message →"}
        </button>
        <p className="text-xs text-ink-3">
          Goes straight to the maker. See the{" "}
          <a href="/privacy#contact-form" className="underline underline-offset-2">
            privacy policy
          </a>
          .
        </p>
      </div>
    </form>
  );
}
