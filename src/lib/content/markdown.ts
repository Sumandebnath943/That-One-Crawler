import { FAQ_HOME, HOME_SECTIONS } from "@/lib/content/home";
import { AUTHOR, HOME_TITLE, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";
import { CHECKLIST_ANSWER, CHECKLIST_FAQS, CHECKLIST_PATH, CHECKLIST_STAGES, CHECKLIST_TITLE } from "./checklist";
import { GUIDES, guideFor, type Faq } from "./guides";
import { ABOUT, BOT_PAGE, CONTACT, privacyCopy, PRIVACY_UPDATED, type PageCopy } from "./pages";
import { CONTENT_UPDATED } from "./structured-data";
import { TOOLS, toolFor, toolName } from "./tools";

// Markdown twins of every content page, for AI agents (/page.md or Accept: text/markdown).
// Same words as the HTML page, without the navigation, buttons and decoration around them.

const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path === "/" ? "" : path}`);

/** Relative links in our copy become absolute, so the Markdown makes sense on its own. */
const absolutize = (text: string) => text.replace(/\]\((\/[^)\s]*)\)/g, (_, path: string) => `](${abs(path)})`);

function frontMatter(title: string, path: string, description: string, updated = CONTENT_UPDATED): string {
  return [
    `# ${title}`,
    "",
    `> ${description}`,
    "",
    `Source: ${abs(path)} · Updated ${updated} · By ${AUTHOR.name} (${AUTHOR.url})`,
  ].join("\n");
}

const faqBlock = (faqs: Faq[], title = "Frequently asked questions") =>
  faqs.length ? `## ${title}\n\n${faqs.map((f) => `### ${f.q}\n\n${absolutize(f.a)}`).join("\n\n")}` : "";

const list = (items: string[]) => items.map((i) => `- ${absolutize(i)}`).join("\n");

const footer = () =>
  `---\n\n${SITE_NAME}: ${SITE_DESCRIPTION} Run a free audit at ${SITE_URL}. All pages: ${abs("/llms.txt")}`;

function join(...blocks: (string | false | null | undefined)[]): string {
  return `${blocks.filter(Boolean).join("\n\n").trim()}\n`;
}

function home(): string {
  return join(
    frontMatter(HOME_TITLE, "/", SITE_DESCRIPTION),
    HOME_SECTIONS.map((s) => `## ${s.title}\n\n${s.body.map(absolutize).join("\n\n")}`).join("\n\n"),
    `## Free tools\n\n${TOOLS.map((t) => `- [${toolName(t)}](${abs(`/${t.slug}`)}): ${t.summary}`).join("\n")}`,
    `## Learn\n\n- [Blog SEO checklist](${abs(CHECKLIST_PATH)}): 25 checks before and after publishing\n- [Every SEO check explained](${abs("/checks")}): ${GUIDES.length} guides`,
    faqBlock(FAQ_HOME),
    footer(),
  );
}

function tool(slug: string): string {
  const t = toolFor(slug);
  const path = `/${t.slug}`;
  return join(
    frontMatter(t.h1, path, t.metaDescription),
    t.answer,
    `Use it free at ${abs(path)}. ${t.mode === "page" ? "Checks one page in seconds." : t.mode === "probe" ? "Checks the whole site in seconds." : "Crawls the whole site."}`,
    `## What it checks\n\n${t.features.map((f) => `- **${f.title}.** ${f.body}`).join("\n")}`,
    `## How to use it\n\n${t.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    faqBlock(t.faqs),
    `## Related guides\n\n${t.guides
      .map(guideFor)
      .filter((g) => g !== undefined)
      .map((g) => `- [${g.title}](${abs(`/checks/${g.slug}`)})`)
      .join("\n")}`,
    footer(),
  );
}

function guide(slug: string): string | null {
  const g = guideFor(slug);
  if (!g) return null;
  const path = `/checks/${g.slug}`;
  return join(
    frontMatter(g.title, path, g.metaDescription),
    g.answer,
    `## Why it matters\n\n${g.why}`,
    `## How to fix it\n\n${g.steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}`,
    faqBlock(g.faqs),
    `## Related checks\n\n${g.related
      .map(guideFor)
      .filter((r) => r !== undefined)
      .map((r) => `- [${r.title}](${abs(`/checks/${r.slug}`)})`)
      .join("\n")}`,
    footer(),
  );
}

function checksIndex(): string {
  const byCategory = new Map<string, typeof GUIDES>();
  for (const g of GUIDES) byCategory.set(g.category, [...(byCategory.get(g.category) ?? []), g]);
  return join(
    frontMatter("Every SEO check explained", "/checks", "Every SEO check That One Crawler runs, explained in plain English: what it means, why it matters and how to fix it."),
    [...byCategory].map(([category, guides]) => `## ${category}\n\n${guides.map((g) => `- [${g.title}](${abs(`/checks/${g.slug}`)}): ${g.metaDescription}`).join("\n")}`).join("\n\n"),
    footer(),
  );
}

function checklist(): string {
  let n = 0;
  return join(
    frontMatter(CHECKLIST_TITLE, CHECKLIST_PATH, CHECKLIST_ANSWER),
    CHECKLIST_STAGES.map(
      (stage) =>
        `## ${stage.title}\n\n${stage.answer}\n\n${stage.items
          .map((item) => `${++n}. **${item.title}.** ${item.body}${item.guide ? ` ([How to fix it](${abs(`/checks/${item.guide}`)}))` : ""}`)
          .join("\n")}`,
    ).join("\n\n"),
    faqBlock(CHECKLIST_FAQS),
    footer(),
  );
}

function bot(): string {
  return join(
    frontMatter("Meet ThatOneCrawler, the bot behind the audits", BOT_PAGE.path, BOT_PAGE.description),
    BOT_PAGE.answer,
    `## How it identifies itself\n\nRequests carry this user agent:\n\n\`\`\`\nMozilla/5.0 (compatible; ThatOneCrawler/1.0; +${abs(BOT_PAGE.path)})\n\`\`\``,
    `## How it behaves\n\n${list(BOT_PAGE.behavior)}`,
    "## How to block or limit it\n\nAdd this to your robots.txt to keep it out entirely:\n\n```\nUser-agent: ThatOneCrawler\nDisallow: /\n```\n\nOr disallow just the paths you want skipped.",
    faqBlock(BOT_PAGE.faqs),
    footer(),
  );
}

function copyPage(page: PageCopy, updated?: string, extra?: string): string {
  return join(
    frontMatter(page.h1 === "Get in touch" ? "Contact That One Crawler" : page.h1 === "Privacy policy" ? "That One Crawler privacy policy" : page.h1, page.path, page.description, updated),
    page.answer,
    extra,
    page.sections
      .map((s) => [`## ${s.title}`, ...(s.paragraphs ?? []).map(absolutize), s.bullets ? list(s.bullets) : ""].filter(Boolean).join("\n\n"))
      .join("\n\n"),
    faqBlock(page.faqs),
    footer(),
  );
}

/** The Markdown twin of a page, or null if the page has none. */
export function markdownFor(path: string, opts: { analytics: boolean } = { analytics: false }): string | null {
  if (path === "/") return home();
  if (path === "/checks") return checksIndex();
  if (path.startsWith("/checks/")) return guide(path.slice("/checks/".length));
  if (path === CHECKLIST_PATH) return checklist();
  if (path === BOT_PAGE.path) return bot();
  if (path === ABOUT.path) return copyPage(ABOUT);
  if (path === CONTACT.path) return copyPage(CONTACT, undefined, `Send a message with the form at ${abs(CONTACT.path)}.`);
  if (path === "/privacy") return copyPage(privacyCopy(opts.analytics), PRIVACY_UPDATED, `Effective ${PRIVACY_UPDATED}. Opt out of visit logging: ${abs("/?notrack=1")}`);
  const slug = path.slice(1);
  if (TOOLS.some((t) => t.slug === slug)) return tool(slug);
  return null;
}
