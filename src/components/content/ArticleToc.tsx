"use client";

import { useEffect, useState } from "react";

export interface TocItem {
  id: string;
  label: string;
}

/** "On this page" links that highlight the section you're reading. */
export function ArticleToc({ items }: { items: TocItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const sections = items.map((item) => document.getElementById(item.id)).filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      // A band near the top of the viewport decides which section counts as "current".
      { rootMargin: "-20% 0px -65% 0px" },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <nav aria-label="On this page">
      <p className="text-xs font-bold tracking-wider text-ink-3 uppercase">On this page</p>
      <ol className="mt-3 space-y-0.5 border-l-2 border-line">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={active === item.id ? "location" : undefined}
              className={`-ml-0.5 block border-l-2 py-1 pl-3 text-sm transition ${
                active === item.id ? "border-ink font-semibold text-ink" : "border-transparent text-ink-2 hover:border-line hover:text-ink"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
