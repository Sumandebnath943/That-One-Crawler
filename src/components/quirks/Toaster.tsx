"use client";

import { useEffect, useState } from "react";
import { TOAST_EVENT } from "@/lib/client/quirks";
import { Mascot } from "../Mascot";

interface Toast {
  id: number;
  message: string;
}

/** Little speech-bubble toasts from the crawler, bottom-left. */
export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let nextId = 0;
    const onToast = (event: Event) => {
      const message = (event as CustomEvent<string>).detail;
      const id = ++nextId;
      setToasts((list) => [...list.slice(-2), { id, message }]);
      setTimeout(() => setToasts((list) => list.filter((t) => t.id !== id)), 3800);
    };
    window.addEventListener(TOAST_EVENT, onToast);
    return () => window.removeEventListener(TOAST_EVENT, onToast);
  }, []);

  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 left-4 z-[65] flex max-w-[calc(100vw-2rem)] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rise flex items-center gap-2 rounded-2xl border-2 border-ink bg-card py-2 pr-4 pl-2 text-sm font-semibold text-ink shadow-brutal"
        >
          <Mascot className="size-8 shrink-0" follow={false} />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
