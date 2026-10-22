import type { IssueCategory, IssueCode } from "@/lib/seo/issues";

// "Checks explained" guides: one page per problem people actually search for.
// Each opens with a 40–60 word direct answer (what AI answer engines quote), then why it
// matters, how to fix it, and an FAQ. Tests keep every title and description within the
// same limits our own crawler enforces.

export interface Faq {
  q: string;
  a: string;
}

export interface Guide {
  slug: string;
  codes: IssueCode[];
  category: IssueCategory;
  /** The search phrase this page targets. */
  keyword: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  answer: string;
  why: string;
  steps: string[];
  faqs: Faq[];
  related: string[];
}

export const GUIDES: Guide[] = [
  {
    slug: "title-tag-length",
    codes: ["no-title", "title-short", "title-long"],
    category: "Search appearance",
    keyword: "title tag length",
    title: "Title tag length: how long should an SEO title be?",
    metaTitle: "Title Tag Length: How Long Should an SEO Title Be?",
    metaDescription:
      "Title tag length matters: keep titles between 30 and 60 characters so Google shows them in full. Learn why titles get cut off and how to fix them.",
    answer:
      "Keep title tags between about 30 and 60 characters (roughly 600 pixels). Google cuts longer titles off with an ellipsis and often rewrites titles that are too short or vague. Put the main keyword near the start, make every title unique, and give searchers a reason to click.",
    why: "The title tag is the blue headline in search results and the default text when someone shares your link. It is one of the strongest relevance signals you control, and it decides whether a searcher clicks you or the result below. A missing title forces Google to invent one from your page, usually badly.",
    steps: [
      "Find the <title> tag in the page's <head>. In WordPress, set it in your SEO plugin's title field.",
      "Lead with the main keyword or topic, then the benefit: “Sourdough Starter: A 7-Day Beginner Guide”.",
      "Stay between 30 and 60 characters and trim filler like “Welcome to” or “Home”.",
      "Add your brand at the end only if it fits: “… | Bread Nerd”.",
      "Rescan to confirm the title is no longer flagged as missing, short or long.",
    ],
    faqs: [
      {
        q: "Does Google use my title tag exactly?",
        a: "Not always. Google rewrites titles it finds too long, too short, stuffed with keywords or out of step with the page. A clear, accurate 30–60 character title that agrees with your H1 is the best way to keep yours.",
      },
      {
        q: "Is title length measured in characters or pixels?",
        a: "Google truncates by pixel width, about 600 pixels on desktop. Wide letters like W and M take more room, so 60 characters is only a rule of thumb. That One Crawler measures each title in pixels and only calls it too long when it would really be cut off.",
      },
    ],
    related: ["meta-description-length", "duplicate-title-tags", "keyword-placement"],
  },
  {
    slug: "meta-description-length",
    codes: ["no-meta", "meta-short", "meta-long", "meta-cut-off"],
    category: "Search appearance",
    keyword: "meta description length",
    title: "Meta description length and how to write one that gets clicks",
    metaTitle: "Meta Description Length: 120–160 Characters, Explained",
    metaDescription:
      "The ideal meta description length is 120 to 160 characters. See why missing, short or cut-off descriptions cost clicks, and how to write ones that earn them.",
    answer:
      "A good meta description is 120 to 160 characters: long enough to summarize the page and short enough that Google doesn't cut it off. It doesn't directly change rankings, but it is often the snippet searchers read before deciding to click, so it has a big effect on traffic.",
    why: "Without a meta description, Google pulls a sentence from the page, which may be a cookie notice or half a paragraph. Auto-generated excerpts that end in “…” or “[…]” look unfinished. A specific, well-sized description works like an ad for your post and can lift click-through rate without any ranking change.",
    steps: [
      "Write one or two sentences that say exactly what the reader gets from the page.",
      "Include the main keyword naturally: Google bolds words that match the search.",
      "Keep it between 120 and 160 characters and end with a full sentence, not an ellipsis.",
      "Replace automatic “[…]” excerpts with a hand-written description in your SEO plugin.",
      "Make every page's description unique.",
    ],
    faqs: [
      {
        q: "Do meta descriptions affect rankings?",
        a: "Not directly. Google has said for years that meta descriptions are not a ranking factor. They influence how many people click your result, and more clicks from the same position means more traffic.",
      },
      {
        q: "Why does Google show a different description?",
        a: "Google sometimes picks a passage from the page that better matches the specific search. A clear, accurate description that matches the page's main topic is shown more often.",
      },
    ],
    related: ["title-tag-length", "duplicate-meta-descriptions", "open-graph-tags"],
  },
  {
    slug: "duplicate-title-tags",
    codes: ["duplicate-title"],
    category: "Search appearance",
    keyword: "duplicate title tags",
    title: "Duplicate title tags: why they hurt and how to fix them",
    metaTitle: "Duplicate Title Tags: Why They Hurt SEO and How to Fix",
    metaDescription:
      "Duplicate title tags make your pages look interchangeable to Google. Find out why they happen on blogs, which page to keep, and how to fix them fast.",
    answer:
      "Duplicate title tags happen when two or more pages share exactly the same <title>. Search engines then struggle to tell the pages apart or decide which one to show, so both can rank worse. Fix it by giving every page a unique title that describes what makes it different.",
    why: "On blogs, duplicates usually come from paginated archives (“Blog – Page 2”), tag and category pages, templates with a hard-coded title, or near-identical posts. Each duplicate splits relevance signals and makes results look repetitive, which lowers clicks.",
    steps: [
      "Scan your site and filter by “Duplicate title” to see every group of pages sharing a title.",
      "For real posts, rewrite each title around that post's specific angle or keyword.",
      "For archives and pagination, add the page number or category name, or noindex thin archives.",
      "If two posts cover the same thing, merge them and 301-redirect the weaker URL.",
      "Rescan to confirm each title is now unique.",
    ],
    faqs: [
      {
        q: "Are duplicate titles a penalty?",
        a: "No, there is no penalty. The cost is confusion: Google may pick the wrong page for a search or show neither prominently, and searchers see repetitive results.",
      },
      {
        q: "Do pagination pages need unique titles?",
        a: "Ideally, yes. Adding “Page 2” or the category name makes them distinct and helps both people and crawlers understand the archive.",
      },
    ],
    related: ["title-tag-length", "keyword-cannibalization", "duplicate-meta-descriptions"],
  },
  {
    slug: "duplicate-meta-descriptions",
    codes: ["duplicate-meta"],
    category: "Search appearance",
    keyword: "duplicate meta descriptions",
    title: "Duplicate meta descriptions: what they are and how to fix them",
    metaTitle: "Duplicate Meta Descriptions: What They Are and How to Fix",
    metaDescription:
      "Duplicate meta descriptions make search results look identical. Learn why they happen on blogs, whether they matter, and how to write unique ones quickly.",
    answer:
      "Duplicate meta descriptions are identical descriptions used on several pages. They make your results look interchangeable, so searchers can't tell which page answers their question. They're not a penalty, but unique descriptions earn more clicks. Write one specific summary per page, or leave it empty rather than repeating a generic one.",
    why: "Duplicates usually come from a theme or plugin that sets one site-wide description, or from copying an old post as a template. When Google sees the same text everywhere it often ignores it and writes its own snippets, so the description you wrote stops doing its job.",
    steps: [
      "Filter your scan by “Duplicate meta description” to find each group.",
      "Check your theme or SEO plugin for a site-wide default description and remove it.",
      "Write a 120–160 character description per page that mentions its specific topic.",
      "For low-value pages like tags and archives, no description beats a duplicate one.",
      "Rescan to confirm the duplicates are gone.",
    ],
    faqs: [
      {
        q: "Is a missing description better than a duplicate one?",
        a: "For low-value pages, often yes. With no description, Google builds a snippet from the page that at least matches it. A copied description can actively mislead searchers.",
      },
      {
        q: "How many pages can share a description?",
        a: "Ideally none. Every page that's meant to rank should have its own description that reflects what's on it.",
      },
    ],
    related: ["meta-description-length", "duplicate-title-tags"],
  },
  {
    slug: "missing-h1-tag",
    codes: ["no-h1", "multiple-h1"],
    category: "Content",
    keyword: "missing h1 tag",
    title: "Missing or multiple H1 tags: how to fix your page headline",
    metaTitle: "Missing H1 Tag (or Multiple H1s): How to Fix It",
    metaDescription:
      "Every page needs one clear H1 headline. Learn what a missing H1 or multiple H1 tags mean for SEO and accessibility, and how to fix them in minutes.",
    answer:
      "The H1 is a page's main headline. Every page should have exactly one, and it should state the topic in plain words, ideally with the main keyword. A missing H1 leaves search engines and screen-reader users guessing; several H1s blur what the page is mainly about.",
    why: "Search engines, AI tools and assistive technology read headings as the page's outline, and the H1 sits at the top of it. Themes sometimes wrap the logo in an H1 or forget the post title, which produces missing or duplicate H1s on every page of the site.",
    steps: [
      "Open the page and check which text is marked as <h1> (your browser's inspector shows it).",
      "Make the post or page title the only H1, near the top of the content.",
      "If your theme puts the site name or logo in an H1, change it to a regular element.",
      "Demote any extra H1s inside the content to H2.",
      "Rescan to confirm each page has exactly one H1.",
    ],
    faqs: [
      {
        q: "Can a page have more than one H1?",
        a: "HTML allows it and Google says it can cope, but one H1 is clearer for everyone. It removes doubt about the main topic and keeps the heading outline clean.",
      },
      {
        q: "Should the H1 match the title tag?",
        a: "They should agree on the topic but don't have to be identical. The title is written for search results; the H1 is written for people already on the page.",
      },
    ],
    related: ["heading-hierarchy", "title-tag-length", "keyword-placement"],
  },
  {
    slug: "heading-hierarchy",
    codes: ["heading-skip", "h1-not-first"],
    category: "Content",
    keyword: "heading hierarchy",
    title: "Heading hierarchy: how to structure H1, H2 and H3 tags",
    metaTitle: "Heading Hierarchy: How to Order H1, H2 and H3 Tags",
    metaDescription:
      "A broken heading hierarchy, with skipped levels or an H1 that isn't first, muddles your outline. Learn the right H1, H2, H3 order for SEO and accessibility.",
    answer:
      "A clean heading hierarchy starts with one H1, then uses H2 for main sections and H3 for points inside them, never skipping a level such as H2 straight to H4. This outline helps screen readers navigate, helps Google understand structure, and makes it easier for AI tools to lift a section as an answer.",
    why: "Skipped levels usually come from picking headings for their size instead of their meaning. When content headings appear before the H1, the outline starts in the middle of the story. Both make the structure harder for machines and assistive technology to follow.",
    steps: [
      "Open the heading outline in the page details to spot skips and order problems.",
      "Choose heading levels by meaning, not looks; restyle with CSS if a level looks wrong.",
      "Make sure the H1 is the first content heading.",
      "Nest one level at a time: H1, then H2, then H3.",
      "Phrase a few H2s as questions readers ask, which also helps AI answers.",
    ],
    faqs: [
      {
        q: "Does skipping heading levels hurt rankings?",
        a: "Not dramatically, but it makes structure harder to parse for search engines, AI tools and screen readers. It's a quick fix with real accessibility benefits.",
      },
      {
        q: "Can I use an H2 just to make text bigger?",
        a: "Better not. Use headings for structure and CSS for appearance, so the outline stays meaningful.",
      },
    ],
    related: ["missing-h1-tag", "ai-search-readiness", "readability"],
  },
  {
    slug: "thin-content",
    codes: ["thin"],
    category: "Content",
    keyword: "thin content",
    title: "Thin content: what it is and how to fix it",
    metaTitle: "Thin Content: What It Is and How to Fix It for SEO",
    metaDescription:
      "Pages with very little useful text rarely rank. Learn what Google means by thin content, why short posts struggle, and whether to expand, merge or noindex them.",
    answer:
      "Thin content is a page with too little useful information to satisfy a search, often under 300 words of real text. It rarely ranks and can drag down how search engines judge a site. Fix it by expanding the page with genuinely helpful detail, merging it into a stronger page, or noindexing it.",
    why: "Word count isn't a ranking factor by itself, but short pages seldom answer a question fully. Blogs collect thin pages over time: quick updates, tag archives, announcements and placeholders. A pile of them dilutes the overall quality signal of the site.",
    steps: [
      "Filter your scan by “Thin content” and check which thin pages get internal links.",
      "For pages worth keeping, add what readers still need: examples, steps, specifics, FAQs.",
      "Merge several short posts on one topic into a single strong guide and redirect the old URLs.",
      "Noindex pages that exist only for navigation, like tags and thin archives.",
      "Delete and redirect pages with no traffic, links or purpose.",
    ],
    faqs: [
      {
        q: "How many words should a blog post have?",
        a: "There's no magic number: cover the topic fully for the searcher. Posts that rank for competitive topics usually run 900 words or more, which is why our score rewards that.",
      },
      {
        q: "Is thin content a penalty?",
        a: "Usually not a manual penalty. It just doesn't rank, and a lot of it can weigh on how helpful search engines consider the whole site.",
      },
    ],
    related: ["readability", "ai-search-readiness", "keyword-cannibalization"],
  },
  {
    slug: "canonical-tag",
    codes: ["canonical-mismatch", "no-canonical", "multiple-canonicals"],
    category: "Indexing",
    keyword: "canonical tag",
    title: "Canonical tags: what they do and how to fix canonical issues",
    metaTitle: "Canonical Tag Issues: What They Mean and How to Fix",
    metaDescription:
      "A canonical tag tells Google which URL is the real version of a page. Learn when it's missing, when it points elsewhere by mistake, and how to fix both.",
    answer:
      "A canonical tag tells search engines which URL is the main version of a page. Every indexable page should usually point its canonical at itself. If it points somewhere else, Google may index that other URL instead, and your page won't rank however good it is.",
    why: "The same content is often reachable at several URLs: with and without www, with tracking parameters, or through category paths. A self-referencing canonical consolidates them. A wrong canonical, often copied from a template or left after a migration, quietly hides good pages from search.",
    steps: [
      "Check the canonical URL in the page details: it should match the page's preferred URL.",
      "If it points elsewhere by mistake, fix it in your SEO plugin or template.",
      "Add a self-referencing canonical to pages that have none, and keep exactly one per page.",
      "Don't point a canonical at a URL that redirects.",
      "Only point the canonical at another page when the content truly is a duplicate.",
    ],
    faqs: [
      {
        q: "Is a canonical tag a directive?",
        a: "It's a strong hint. Google usually follows it, but may choose a different canonical when signals like redirects and internal links disagree.",
      },
      {
        q: "Should paginated pages canonicalize to page 1?",
        a: "No. Each page in a series should usually have a self-referencing canonical, otherwise items on later pages can drop out of the index.",
      },
      {
        q: "What if a page has two canonical tags?",
        a: "When they disagree, Google ignores both and picks its own. It usually happens when a theme and an SEO plugin each add one. Remove one so the page declares a single canonical.",
      },
    ],
    related: ["noindex-tag", "redirects", "duplicate-title-tags"],
  },
  {
    slug: "noindex-tag",
    codes: ["noindex"],
    category: "Indexing",
    keyword: "noindex tag",
    title: "Noindex tag: why your page isn't in Google and how to fix it",
    metaTitle: "Noindex Tag: Why Your Page Isn't in Google (and the Fix)",
    metaDescription:
      "A noindex robots tag keeps a page out of search results. Learn how to find accidental noindex tags and headers, when noindex is right, and how to remove it.",
    answer:
      "A noindex directive, set in a robots meta tag or an X-Robots-Tag header, tells search engines not to show a page in results. It's useful for thank-you pages and thin archives, but an accidental noindex on a real post means it can never rank, however good it is.",
    why: "Accidental noindex is one of the most expensive SEO mistakes because it's silent. It usually comes from a staging setting left on after launch, an SEO plugin option like “discourage search engines”, or a template applied to the wrong post type.",
    steps: [
      "Filter your scan by “Hidden from Google” to list every noindex and robots-blocked page.",
      "Decide which pages should be found. Keep noindex only on pages with no search value.",
      "Remove noindex from the robots meta tag (usually an SEO plugin setting) or the X-Robots-Tag header.",
      "In WordPress, check Settings → Reading for “Discourage search engines from indexing this site”.",
      "Request indexing in Google Search Console for important pages.",
    ],
    faqs: [
      {
        q: "How long until a page appears after removing noindex?",
        a: "Usually days to a few weeks, depending on how often Google crawls your site. Requesting indexing in Search Console speeds it up.",
      },
      {
        q: "Is noindex the same as blocking in robots.txt?",
        a: "No. Noindex lets Google read the page but keeps it out of results. Robots.txt stops Google reading the page at all, so it can't even see a noindex tag.",
      },
    ],
    related: ["blocked-by-robots-txt", "canonical-tag"],
  },
  {
    slug: "blocked-by-robots-txt",
    codes: ["robots-blocked"],
    category: "Indexing",
    keyword: "blocked by robots.txt",
    title: "Blocked by robots.txt: what it means and how to fix it",
    metaTitle: "Blocked by robots.txt: What It Means and How to Fix It",
    metaDescription:
      "Pages blocked by robots.txt can't be read by search engines. Learn how to spot rules that block important pages and how to edit your robots.txt file safely.",
    answer:
      "“Blocked by robots.txt” means a Disallow rule in your site's robots.txt file stops crawlers from fetching that URL. Search engines can't read what's on the page, so it ranks poorly or not at all. Remove or narrow the rule if the page should be searchable.",
    why: "robots.txt rules are powerful and easy to over-apply: one line like “Disallow: /blog” hides a whole section. Rules copied from another site or left over from development are common culprits. Blocking also stops search engines from seeing a noindex tag on the page.",
    steps: [
      "Open yoursite.com/robots.txt and read the rules under “User-agent: *”.",
      "Find the Disallow line matching the blocked URL (the longest matching rule wins).",
      "Delete it, or narrow it so it only covers what should stay private.",
      "Keep admin, cart and internal search pages blocked if you like: they don't need to rank.",
      "Rescan to confirm important pages are no longer blocked.",
    ],
    faqs: [
      {
        q: "Does robots.txt keep a page out of Google?",
        a: "Not reliably. A blocked URL can still be indexed without its content if other sites link to it. Use noindex to keep a page out of results.",
      },
      {
        q: "Should I block AI crawlers?",
        a: "That's a business choice. Blocking them keeps your content out of AI answers, which also means AI tools can't cite or link to you.",
      },
    ],
    related: ["noindex-tag", "ai-search-readiness"],
  },
  {
    slug: "broken-pages-404",
    codes: ["broken", "soft-404"],
    category: "Indexing",
    keyword: "404 broken pages",
    title: "Broken pages (404 errors): how to find and fix them",
    metaTitle: "Broken Pages and 404 Errors: How to Find and Fix Them",
    metaDescription:
      "Pages that return 404 or 5xx errors are dead ends for readers and search engines. Learn how to find broken pages on your blog and fix them with redirects.",
    answer:
      "A broken page returns an error such as 404 (not found) or 500 (server error) instead of content. Readers hit a dead end and search engines eventually drop the URL. Restore the page, or 301-redirect it to the most relevant live page and update links that point at it.",
    why: "Broken pages appear when posts are deleted, slugs change, or migrations miss URLs. Any links and rankings the old URL earned are wasted, and internal links pointing at it send readers into a wall. Server errors also suggest hosting trouble that affects crawling.",
    steps: [
      "Filter your scan by “Broken page” to list every URL returning an error.",
      "If the content moved, add a 301 redirect from the old URL to its new home.",
      "If it's gone for good, redirect to the closest relevant page, or let it 404 if nothing fits.",
      "Update internal links and sitemap entries that still point at broken URLs.",
      "Investigate 5xx errors with your host: they usually mean overload or a crashing plugin.",
      "Make missing pages answer with a real 404 status, not a “Page not found” page that says 200 OK (a soft 404).",
    ],
    faqs: [
      {
        q: "What is a soft 404?",
        a: "A page that tells visitors it doesn't exist but tells crawlers everything is fine (status 200). Search engines may index the error page, and AI agents can't tell it's missing. Return a real 404 or 410 instead.",
      },
      {
        q: "Do 404 errors hurt SEO?",
        a: "A few 404s for genuinely removed pages are normal. They hurt when they waste links pointing at them or when important pages break by accident.",
      },
      {
        q: "Should I redirect every 404 to the homepage?",
        a: "No. Google treats irrelevant redirects to the homepage much like a 404 anyway. Redirect only to a page that genuinely replaces the old one.",
      },
    ],
    related: ["broken-links", "redirects", "orphan-pages"],
  },
  {
    slug: "broken-links",
    codes: ["broken-links"],
    category: "Links",
    keyword: "broken links",
    title: "Broken links: how to find and fix dead links on your blog",
    metaTitle: "Broken Links: How to Find and Fix Dead Links on a Blog",
    metaDescription:
      "Broken links frustrate readers and waste crawl budget. Learn how to find broken internal and external links across your whole blog and fix them in bulk.",
    answer:
      "Broken links point at URLs that no longer work, usually returning 404 or a dead domain. Internal broken links waste crawl budget and break navigation; external ones make posts look abandoned. Find them with a full-site crawl, then update each link to a working URL or remove it.",
    why: "Links rot: other sites restructure, products disappear and domains expire. On a blog with hundreds of posts, dozens of dead links pile up unnoticed. Readers lose trust when a recommended resource is gone, and search engines see the page as less maintained.",
    steps: [
      "Scan with “Check links & images” switched on, then open the Links tab.",
      "Start with internal broken links: point them at the moved page or remove them.",
      "For external links, find the resource's new location or link to an alternative.",
      "Ignore links reported as blocked: those sites refuse bots but work for people.",
      "Rescan monthly, because link rot never stops.",
    ],
    faqs: [
      {
        q: "Why is a link I can open reported as broken?",
        a: "Usually because you're signed in. GitHub, GitLab and Google Docs show a 404 to anyone without access, so a private repo looks deleted to every visitor. Open the link in a private window to see what they see.",
      },
      {
        q: "How often should I check for broken links?",
        a: "Monthly for active blogs, quarterly for quieter ones. Older posts collect the most dead external links.",
      },
      {
        q: "Do external broken links hurt rankings?",
        a: "Indirectly. They hurt reader experience and signal a neglected page, which matters more for how helpful a page seems than any single link.",
      },
    ],
    related: ["broken-pages-404", "redirects", "orphan-pages"],
  },
  {
    slug: "redirects",
    codes: ["redirected", "offsite-redirect", "meta-refresh"],
    category: "Links",
    keyword: "redirect chains",
    title: "Redirects and redirect chains: how to clean them up",
    metaTitle: "Redirects and Redirect Chains: How to Clean Them Up",
    metaDescription:
      "Redirect chains add hops for readers and crawlers. Learn how to find redirects in your sitemap and internal links, and point each link at the final URL.",
    answer:
      "A redirect sends visitors and crawlers from one URL to another. One redirect after a URL change is fine, but internal links and sitemap entries should point straight at the final URL. Chains of redirects slow pages down, and redirects to other websites hand your visitors and rankings away.",
    why: "Redirects pile up after HTTPS switches, slug edits and migrations. Each hop adds latency and another chance for something to break. Sitemaps listing redirected URLs also send mixed signals about which address is the real one.",
    steps: [
      "Filter your scan by “Redirects” to see pages reached through a redirect and URLs leaving your site.",
      "Update internal links to the final URL instead of the old one.",
      "Regenerate your sitemap so it lists only final URLs that answer 200.",
      "Collapse chains (A → B → C) into a single redirect (A → C).",
      "Check that any redirects to other websites are intentional.",
      "Replace <meta http-equiv=\"refresh\"> redirects with server-side 301s, which every crawler follows.",
    ],
    faqs: [
      {
        q: "Do 301 redirects lose link value?",
        a: "Google has said 301 and 302 redirects pass ranking signals. The cost is speed and complexity, so avoid unnecessary chains.",
      },
      {
        q: "Should I use a 301 or a 302?",
        a: "Use 301 for permanent moves and 302 for temporary ones. Most content moves are permanent.",
      },
    ],
    related: ["broken-pages-404", "canonical-tag", "broken-links"],
  },
  {
    slug: "orphan-pages",
    codes: ["orphan"],
    category: "Links",
    keyword: "orphan pages",
    title: "Orphan pages: how to find pages with no internal links",
    metaTitle: "Orphan Pages: How to Find and Fix Pages Nobody Links To",
    metaDescription:
      "Orphan pages have no internal links pointing at them, so readers and crawlers struggle to find them. Learn how to find orphans on your blog and link them in.",
    answer:
      "An orphan page is a page that no other page on your site links to. It may sit in your sitemap, but readers can't navigate to it and search engines treat it as unimportant. Fix orphans by linking to them from related posts, category pages or a hub page.",
    why: "Internal links are how a site signals what matters. Orphans usually come from old posts that dropped off the homepage, landing pages built for ads, or posts never added to a category. They get crawled less often and rank below their potential.",
    steps: [
      "Run a full sitemap scan (without hitting the page limit) and open the Links tab.",
      "Decide whether each orphan still deserves to exist; delete and redirect the ones that don't.",
      "Link to the rest from two or three closely related posts, with descriptive anchor text.",
      "Add them to the right category or a topic hub page.",
      "Rescan and confirm each has at least one inbound link.",
    ],
    faqs: [
      {
        q: "Are orphan pages indexed?",
        a: "They can be, through the sitemap, but they usually rank poorly because nothing on the site vouches for them.",
      },
      {
        q: "My menu links to the page. Why is it still an orphan?",
        a: "Because the link only exists after a click or a script runs, as in many dropdown menus, search boxes and command palettes. We read the HTML the server sends, like most crawlers and AI agents do. Add a plain <a href> link somewhere in that HTML.",
      },
      {
        q: "How many internal links should a page have?",
        a: "There's no set number. Make sure every important post is linked from a few relevant pages and is reachable within a few clicks of the homepage.",
      },
    ],
    related: ["click-depth", "broken-links", "keyword-cannibalization"],
  },
  {
    slug: "click-depth",
    codes: ["deep-page"],
    category: "Links",
    keyword: "click depth",
    title: "Click depth: why pages buried deep in your site rank worse",
    metaTitle: "Click Depth: Why Buried Pages Rank Worse, and the Fixes",
    metaDescription:
      "Pages more than four clicks from the homepage get crawled less and rank worse. Learn how click depth works and how to bring buried posts closer to the surface.",
    answer:
      "Click depth is how many clicks it takes to reach a page from the homepage. Pages more than about four clicks deep get crawled less often and tend to rank worse, because the site's structure signals they matter less. Shorten the path with category pages, hub pages and internal links.",
    why: "Blogs naturally push older posts deeper as new ones arrive: page 2, page 3, page 20 of the archive. Without categories, related-post links or hub pages, good evergreen content ends up buried where neither readers nor crawlers go.",
    steps: [
      "Open the Links tab and look at “Buried pages” to see the deepest posts.",
      "Create or improve category and topic hub pages that link to related posts.",
      "Link to important evergreen posts from the homepage, sidebar or popular posts.",
      "Add related-post links at the end of articles.",
      "Rescan and check the depth numbers drop.",
    ],
    faqs: [
      {
        q: "Is click depth a ranking factor?",
        a: "Not directly, but it reflects how much internal linking a page gets, and that does influence crawling and ranking.",
      },
      {
        q: "Does pagination increase click depth?",
        a: "Yes. Long paginated archives are a common reason posts end up ten or more clicks deep.",
      },
    ],
    related: ["orphan-pages", "broken-links"],
  },
  {
    slug: "link-text",
    codes: ["vague-link-text"],
    category: "Links",
    keyword: "descriptive link text",
    title: "Link text: why “click here” and “read more” hurt SEO",
    metaTitle: "Descriptive Link Text: Why “Read More” Hurts SEO",
    metaDescription:
      "Links that say “click here” or “read more” tell search engines, screen readers and AI agents nothing. Learn to write link text that says where it goes.",
    answer:
      "Descriptive link text says where a link goes, like “our sourdough starter guide” instead of “click here” or “read more”. Search engines use link text to understand the page it points to, screen-reader users jump from link to link, and AI agents read it to decide what to follow. Vague text wastes all three.",
    why: "Link text, also called anchor text, is one of the oldest signals search engines use to learn what a page is about. Google's Lighthouse SEO audit flags vague link text, and screen readers can list a page's links on their own, so “read more, read more, read more” tells a listener nothing.",
    steps: [
      "Open the page details to see which link texts we flagged.",
      "Rewrite each one to name the destination: “read the full sourdough guide”.",
      "In card layouts, make the title the link, or give the button an aria-label that names the target.",
      "Keep it short: a few words that still make sense out of context.",
      "Rescan to confirm the vague links are gone.",
    ],
    faqs: [
      {
        q: "Is “read more” always bad?",
        a: "It's fine on screen if the link also has an accessible name describing the target, such as an aria-label like “Read more about sourdough starters”. We don't flag links that have one.",
      },
      {
        q: "Does link text affect rankings?",
        a: "Internal link text helps search engines understand what the linked page covers, so descriptive internal links are one of the easiest wins on a blog.",
      },
    ],
    related: ["broken-links", "orphan-pages", "keyword-placement"],
  },
  {
    slug: "keyword-cannibalization",
    codes: ["cannibalization"],
    category: "Keywords",
    keyword: "keyword cannibalization",
    title: "Keyword cannibalization: how to find and fix competing pages",
    metaTitle: "Keyword Cannibalization: How to Find and Fix It Fast",
    metaDescription:
      "When several of your pages target the same keyword, they compete and none ranks well. Learn how to spot keyword cannibalization on your blog and fix it.",
    answer:
      "Keyword cannibalization happens when two or more pages on your site target the same main keyword. They compete with each other, Google flips between them, and none ranks as well as one strong page would. Fix it by choosing one page to own the keyword and merging, redirecting or re-angling the others.",
    why: "Blogs cannibalize themselves naturally: you write about a topic, then a year later write about it again. Each post earns some links and some relevance, but split across several URLs it rarely adds up to a top result.",
    steps: [
      "Open the Keywords tab to see groups of pages sharing a main keyword.",
      "For each group, pick the strongest page (best content, most links) as the owner.",
      "Merge useful content from the others into it and 301-redirect them.",
      "Or keep them, but retarget each at a distinct angle with new titles and H1s.",
      "Link from the other pages to the owner, using the keyword as anchor text.",
    ],
    faqs: [
      {
        q: "Is keyword cannibalization always bad?",
        a: "Not always. If two pages answer genuinely different intents, both can rank. It's a problem when they say the same thing for the same search.",
      },
      {
        q: "How do you detect it without Search Console?",
        a: "We work out each page's main keyword from its title, H1, URL and text. Pages only count when they target it in the title plus the H1 or URL. Category pages, the homepage and contact or legal pages are left out. Search Console confirms which pages compete.",
      },
    ],
    related: ["keyword-placement", "duplicate-title-tags", "thin-content"],
  },
  {
    slug: "keyword-placement",
    codes: ["keyword-not-in-title", "keyword-placement"],
    category: "Keywords",
    keyword: "keyword placement",
    title: "Keyword placement: where to put your main keyword",
    metaTitle: "Keyword Placement: Where to Put Your Main Keyword",
    metaDescription:
      "Good keyword placement means using your main keyword in the title, H1, first paragraph, URL and meta description. Learn how to do it without sounding robotic.",
    answer:
      "Put your page's main keyword in the places search engines weigh most: the title tag, the H1, the first 100 words, the URL slug and the meta description. Use it naturally once in each. Placement matters far more than repetition, and forcing the keyword in reads as spam.",
    why: "These spots tell search engines and AI tools, quickly and unambiguously, what the page is about. A post whose title says one thing while its text says another sends mixed signals and often ranks for neither.",
    steps: [
      "Check the Content tab: it shows the main keyword and where it's missing.",
      "Work the keyword into the title, ideally near the start.",
      "Use it, or a close variant, in the H1 and the opening paragraph.",
      "Keep URL slugs short and keyword-based: /sourdough-starter, not /post-1234.",
      "Mention it once in the meta description so Google can bold it.",
    ],
    faqs: [
      {
        q: "How many times should a keyword appear?",
        a: "Enough to read naturally. Placement in the title, H1 and intro matters more than count. If the keyword is more than about 3% of the text (3 uses per 100 words), it's likely too much.",
      },
      {
        q: "Should I change old URLs to include keywords?",
        a: "Only with a 301 redirect, and usually only for important pages. A good title and H1 matter more than the URL.",
      },
    ],
    related: ["keyword-stuffing", "title-tag-length", "keyword-cannibalization"],
  },
  {
    slug: "keyword-stuffing",
    codes: ["keyword-stuffing"],
    category: "Keywords",
    keyword: "keyword stuffing",
    title: "Keyword stuffing: how much is too much?",
    metaTitle: "Keyword Stuffing: How Much Is Too Much, and How to Fix It",
    metaDescription:
      "Keyword stuffing reads as spam to people and to Google. Learn how much keyword density is too high and how to rewrite stuffed pages so they read naturally.",
    answer:
      "Keyword stuffing is repeating a keyword so often that the text reads unnaturally, usually in an attempt to rank. Google treats it as spam and readers find it off-putting. If your main keyword is more than about 3% of the text, rewrite with synonyms, pronouns and more specific detail.",
    why: "Stuffing is a leftover from older SEO habits and some content templates. Modern search understands synonyms and topics, so repetition adds nothing, but it can trigger spam filters and lose readers.",
    steps: [
      "Check keyword density in the page's Content tab.",
      "Read the page aloud; wherever the keyword sounds forced, rephrase.",
      "Use synonyms and related terms instead of the exact phrase.",
      "Replace repeated keywords in footers, sidebars and alt text with natural wording.",
      "Add substance like examples, data and steps instead of repetition.",
    ],
    faqs: [
      {
        q: "What is a good keyword density?",
        a: "There's no ideal number. Natural writing usually lands around 0.5–2% for a main phrase, meaning a few uses per 100 words. Above about 3% is a warning sign.",
      },
      {
        q: "Can keyword stuffing get a site penalized?",
        a: "Severe, deliberate stuffing can trigger spam actions. More often it just makes pages less helpful, which costs rankings anyway.",
      },
    ],
    related: ["keyword-placement", "readability"],
  },
  {
    slug: "image-alt-text",
    codes: ["missing-alt"],
    category: "Content",
    keyword: "image alt text",
    title: "Image alt text: how to write it for SEO and accessibility",
    metaTitle: "Image Alt Text: How to Write It for SEO and Accessibility",
    metaDescription:
      "Missing image alt text hides your pictures from screen readers and image search. Learn how to write good alt text, when to leave it empty, and how to fix it.",
    answer:
      "Alt text is a short written description in an image's alt attribute. Screen readers read it aloud, and search engines use it to understand images. Every meaningful image needs descriptive alt text, while purely decorative images should have an empty alt attribute (alt=\"\") so they're skipped.",
    why: "Missing alt text is one of the most common accessibility failures on the web and a missed chance in image search. On blogs it usually comes from uploading images quickly without filling in the alt field.",
    steps: [
      "Check the page details for images missing alt text.",
      "Describe what the image shows and why it's there, in about a sentence.",
      "Include the keyword only if it genuinely describes the image.",
      "Use alt=\"\" for decorative images such as dividers and background flourishes.",
      "In WordPress, add alt text in the Media Library so it applies wherever the image appears.",
    ],
    faqs: [
      {
        q: "How long should alt text be?",
        a: "Usually under 125 characters. Be specific and concise: “Bubbly sourdough starter in a glass jar” beats “image of starter”.",
      },
      {
        q: "Is an empty alt attribute OK?",
        a: "Yes, for decorative images. Leaving the attribute out entirely is the problem, because screen readers may read the file name instead.",
      },
    ],
    related: ["image-optimization", "readability"],
  },
  {
    slug: "image-optimization",
    codes: ["heavy-images", "image-dimensions"],
    category: "Performance",
    keyword: "optimize images for web",
    title: "Image optimization: heavy images and layout shift",
    metaTitle: "Image Optimization: Fix Heavy Images and Layout Shift",
    metaDescription:
      "Image optimization makes your blog faster: oversized images slow pages, and images without width and height make layouts jump. Learn to compress and size them.",
    answer:
      "Optimized images are compressed, sized to how they're displayed and served in modern formats like WebP or AVIF. Images over about 300 KB slow pages down, especially on phones, and images without width and height attributes make the layout jump while loading, which Google measures as Cumulative Layout Shift.",
    why: "Images are usually the heaviest part of a blog post. Uploading straight from a camera or design tool can mean multi-megabyte files displayed 800 pixels wide. Slow pages lose readers and hurt Core Web Vitals.",
    steps: [
      "Check the page details for heavy images and images without dimensions.",
      "Resize images to roughly the largest size they're shown at.",
      "Compress them and convert to WebP or AVIF; most image plugins and CDNs automate this.",
      "Add width and height attributes to every <img> so the browser reserves space.",
      "Lazy-load images below the fold with loading=\"lazy\", but not the first one.",
    ],
    faqs: [
      {
        q: "What image size is too big for a blog?",
        a: "As a rule of thumb, keep most images under 200–300 KB. Hero images can be a little larger if they're well compressed.",
      },
      {
        q: "How do you weigh responsive images?",
        a: "Like a browser would. We pick the srcset variant a desktop browser downloads, not the oversized fallback in src, and ask for WebP or AVIF the way Chrome does, so image CDNs answer with the file a visitor really gets.",
      },
      {
        q: "Does WebP really make a difference?",
        a: "Yes. WebP and AVIF files are typically 25–50% smaller than JPEG at similar quality, which speeds up every page they're on.",
      },
    ],
    related: ["image-alt-text", "slow-pages"],
  },
  {
    slug: "structured-data",
    codes: ["no-schema", "schema-broken", "schema-incomplete"],
    category: "Structured data",
    keyword: "structured data errors",
    title: "Structured data for blogs: missing, broken and incomplete markup",
    metaTitle: "Structured Data for Blogs: Fix Missing and Broken Schema",
    metaDescription:
      "Structured data helps Google and AI tools understand your posts. Learn which schema blogs need, how to spot broken JSON-LD, and which fields to complete.",
    answer:
      "Structured data is machine-readable markup, usually JSON-LD, that tells search engines what a page is: an article, its author, publish date and image. Blogs should use Article or BlogPosting markup. Broken JSON is ignored entirely, and missing fields like author or image weaken rich results and AI citations.",
    why: "Structured data is how you state facts about a page without ambiguity. Search engines use it for rich results, and AI answer engines use it to attribute and cite. A single misplaced comma makes a whole block invalid, and it fails silently.",
    steps: [
      "Check the Links & tech tab for schema types, broken blocks and missing article fields.",
      "Use your SEO plugin's schema settings, or add JSON-LD in the page head.",
      "Mark posts as BlogPosting with headline, author, datePublished, dateModified and image.",
      "Validate with Google's Rich Results Test and fix any syntax errors.",
      "Keep the markup truthful: it must match what's visible on the page.",
    ],
    faqs: [
      {
        q: "Does structured data improve rankings?",
        a: "Not directly, but it can earn rich results and makes it easier for search engines and AI tools to understand and cite your content.",
      },
      {
        q: "Should I use JSON-LD or microdata?",
        a: "Google recommends JSON-LD. It sits in one script block, separate from your HTML, so it's easier to maintain.",
      },
    ],
    related: ["faq-schema", "ai-search-readiness", "open-graph-tags"],
  },
  {
    slug: "faq-schema",
    codes: ["faq-no-schema"],
    category: "AI search",
    keyword: "faq schema",
    title: "FAQ schema: how to mark up your FAQ section",
    metaTitle: "FAQ Schema: How to Add FAQPage Markup to Your FAQ",
    metaDescription:
      "Your page has an FAQ but no FAQPage markup. Learn what FAQ schema does today, why AI search engines still use it, and how to add it correctly.",
    answer:
      "FAQ schema, or FAQPage structured data, marks each question and answer in your FAQ section so machines don't have to guess. Google now shows FAQ rich results for very few sites, but the markup still helps search engines and AI answer engines match your answers to the questions people ask.",
    why: "An FAQ section is one of the easiest ways to be quoted by AI tools, because it pairs real questions with direct answers. Without markup, that structure is only implied by formatting; with it, it's explicit.",
    steps: [
      "Make sure the FAQ answers questions readers really ask, in two to four sentences each.",
      "Generate FAQPage JSON-LD; our AI FAQ tool builds it from your page.",
      "Paste it into the page head or use your SEO plugin's FAQ block.",
      "Mark up only questions and answers that are visible on the page.",
      "Validate with Google's Rich Results Test.",
    ],
    faqs: [
      {
        q: "Does Google still show FAQ rich results?",
        a: "Since 2023, mostly for authoritative government and health sites. The markup is still valid and still useful for machine understanding.",
      },
      {
        q: "Can I mark up questions that aren't on the page?",
        a: "No. Structured data must describe visible content, otherwise it can be treated as spam.",
      },
    ],
    related: ["structured-data", "ai-search-readiness"],
  },
  {
    slug: "open-graph-tags",
    codes: ["no-og"],
    category: "Search appearance",
    keyword: "open graph tags",
    title: "Open Graph tags: make shared links look good",
    metaTitle: "Open Graph Tags: Make Shared Links Look Good Everywhere",
    metaDescription:
      "Without Open Graph tags, links to your posts look broken on social media and chat apps. Learn which og: tags to add and how to preview your share cards.",
    answer:
      "Open Graph tags (og:title, og:description and og:image) control how your page looks when shared on social networks and in chat apps like Slack, WhatsApp and LinkedIn. Without them, platforms guess, often showing no image and the wrong text, so fewer people click your link.",
    why: "Shares are free distribution. A link card with a strong image and a clear title gets far more clicks than a bare URL. Most SEO plugins can generate Open Graph tags automatically from your title, description and featured image.",
    steps: [
      "Check the social preview in the page details.",
      "Add og:title, og:description and og:image (1200×630 pixels works everywhere).",
      "Set twitter:card to summary_large_image for big cards on X.",
      "Set a default share image for pages without a featured image.",
      "Use each platform's debugger to refresh cached previews.",
    ],
    faqs: [
      {
        q: "Do Open Graph tags affect SEO?",
        a: "Not rankings directly. They affect how many people click shared links, which brings traffic and, indirectly, links.",
      },
      {
        q: "What size should og:image be?",
        a: "1200 by 630 pixels, a 1.91:1 ratio, displays well on almost every platform.",
      },
    ],
    related: ["meta-description-length", "title-tag-length", "structured-data"],
  },
  {
    slug: "ai-search-readiness",
    codes: ["ai-readiness"],
    category: "AI search",
    keyword: "AI search optimization",
    title: "AI search readiness: how to get your blog cited by AI (GEO and AEO)",
    metaTitle: "AI Search Readiness: Get Cited by AI (GEO & AEO Guide)",
    metaDescription:
      "Improve your AI search readiness with GEO and AEO: structure blog posts so Google AI Overviews, ChatGPT and Perplexity quote them. A practical checklist.",
    answer:
      "AI search readiness is how easy it is for AI answer engines like Google AI Overviews, ChatGPT and Perplexity to understand and quote your page. The essentials are a direct answer up top, question-style headings with short answers beneath them, specific facts, lists, an FAQ, and a clear author and date.",
    why: "AI answer engines pull short, self-contained passages that answer a question outright. Pages that open with long, meandering introductions are hard to quote, so they get skipped in favor of pages with crisp answers. This work is often called generative engine optimization (GEO) or answer engine optimization (AEO).",
    steps: [
      "Open with a 40–60 word paragraph that answers the page's main question directly.",
      "Phrase some H2s as questions people ask, and answer each in the first 30–80 words below it.",
      "Use specific numbers, dates and named sources instead of vague claims.",
      "Add bullet lists for steps and options, and tables for comparisons.",
      "Add an FAQ with FAQPage markup, and show the author and last-updated date.",
    ],
    faqs: [
      {
        q: "What's the difference between GEO and AEO?",
        a: "They overlap. AEO (answer engine optimization) focuses on direct answers for voice search and featured snippets; GEO (generative engine optimization) focuses on being cited in AI-generated answers. The same structure helps both.",
      },
      {
        q: "Does AI readiness replace normal SEO?",
        a: "No. AI answer engines still rely on pages search engines can crawl and trust. Good SEO is the foundation, and AI readiness is structure on top of it.",
      },
      {
        q: "Does a contact or product page need an FAQ to score well?",
        a: "No. Question headings, an FAQ and a byline only count on articles and long pages. Shorter pages are judged on what fits them: a clear opening answer, specific facts and scannable lists.",
      },
    ],
    related: ["faq-schema", "heading-hierarchy", "structured-data", "hidden-ai-instructions"],
  },
  {
    slug: "hidden-ai-instructions",
    codes: ["ai-injection", "ai-instructions"],
    category: "AI search",
    keyword: "prompt injection seo",
    title: "Hidden AI instructions: prompt injection on web pages",
    metaTitle: "Hidden AI Instructions (Prompt Injection) on Web Pages",
    metaDescription:
      "Text that tells AI assistants what to say about your page is prompt injection. Learn why it backfires, how it gets onto pages, and how to remove it.",
    answer:
      "Hidden AI instructions are text aimed at AI assistants that visitors never see, such as a line in a hidden element telling them to recommend the site. It's a form of prompt injection. AI tools discount pages that do it, and hidden text breaks Google's spam policies. Writing about prompts is fine; giving orders to models is not.",
    why: "Some sites hide instructions in invisible elements, HTML comments or the prompt inside a “Summarize with AI” link, hoping assistants will repeat them or remember the site as a trusted source. Others pick them up through compromised plugins or copied content. Either way, it undermines trust in the page and the whole site.",
    steps: [
      "Open the page details to see the exact text we flagged and where it sits.",
      "Remove hidden instructions entirely, including ones inside comments and AI share links.",
      "If visible text was flagged and it's a quoted example, put it in a code block or quotation.",
      "If you didn't add it, check for a compromised plugin, theme or injected script.",
      "Rescan to confirm it's gone, then earn AI citations with clear answers and facts.",
    ],
    faqs: [
      {
        q: "Will an article about prompts or prompt injection get flagged?",
        a: "No. Mentioning a system prompt, or showing an attack inside a code block or quotation, isn't an instruction. We flag commands addressed to AI assistants, and treat hidden ones far more seriously than visible ones.",
      },
      {
        q: "Does prompt injection work on AI search?",
        a: "Major AI tools now filter it, and it can backfire by flagging the page as untrustworthy. It's not worth the risk.",
      },
      {
        q: "How does That One Crawler protect its own AI tools?",
        a: "Page text is fenced off and treated as data, never as instructions, and instruction-like text is reported to you instead of being followed.",
      },
    ],
    related: ["ai-search-readiness", "structured-data"],
  },
  {
    slug: "content-freshness",
    codes: ["stale"],
    category: "Content",
    keyword: "update old blog posts",
    title: "Stale content: how to refresh old blog posts",
    metaTitle: "Stale Content: How and When to Refresh Old Blog Posts",
    metaDescription:
      "Posts that haven't been updated in a year slide in rankings and lose trust. Learn how to find stale content, what to change, and how to signal the update.",
    answer:
      "Stale content is a post that hasn't been meaningfully updated in over a year. Outdated facts, broken links and old screenshots erode trust, rankings slip, and AI tools prefer fresher sources. Refresh the post, then update its modified date on the page, in its structured data and in its sitemap entry.",
    why: "Most blogs get most of their traffic from a minority of older posts. Keeping those accurate is usually the highest-return SEO work available, yet posts are rarely revisited after publishing.",
    steps: [
      "Filter your scan by “Stale content” and start with the posts that get the most internal links.",
      "Update facts, prices, dates, screenshots and examples.",
      "Fix broken links and add links to newer related posts.",
      "Improve the structure: a direct answer up top, question headings and an FAQ.",
      "Update dateModified, the visible “last updated” date and the sitemap lastmod.",
    ],
    faqs: [
      {
        q: "Does changing the date alone help?",
        a: "No. Search engines look for real changes. Updating the date without updating the content can look manipulative.",
      },
      {
        q: "How often should I update blog posts?",
        a: "Review important posts at least once a year, and straight away when facts change.",
      },
    ],
    related: ["broken-links", "ai-search-readiness", "thin-content"],
  },
  {
    slug: "readability",
    codes: ["walls-of-text", "long-sentences", "hard-to-read"],
    category: "Content",
    keyword: "readability score",
    title: "Readability: walls of text, long sentences and how to fix them",
    metaTitle: "Readability for Blogs: Fix Walls of Text and Long Sentences",
    metaDescription:
      "Readability problems like long sentences and walls of text lose readers before your point. Learn how readability scores work and how to fix hard-to-read posts.",
    answer:
      "Readability is how easily people can read and understand your text. Most blog readers prefer a Flesch reading-ease score of 60 or more, sentences under about 25 words and paragraphs of three or four sentences. Long blocks and run-on sentences make readers skim, and they're harder for AI tools to quote.",
    why: "People read on phones, in short bursts. A paragraph that fills the screen looks like work. Readability isn't a direct ranking factor, but it shapes how long people stay and whether they find the answer they came for.",
    steps: [
      "Check the reading-ease score and long-sentence count in the page details.",
      "Split paragraphs longer than about 150 words: one idea per paragraph.",
      "Break sentences over 35 words into two.",
      "Swap jargon for plain words, or explain terms the first time you use them.",
      "Add subheadings and bullet lists so readers can scan.",
    ],
    faqs: [
      {
        q: "What is a good Flesch reading-ease score?",
        a: "60–70 is plain English that most adults read easily. Below 30 is college-graduate level and hard going for general readers.",
      },
      {
        q: "Does readability affect SEO?",
        a: "Indirectly. Clearer pages keep readers longer and answer questions better, which is what search engines try to reward.",
      },
    ],
    related: ["ai-search-readiness", "heading-hierarchy", "thin-content"],
  },
  {
    slug: "slow-pages",
    codes: ["slow"],
    category: "Performance",
    keyword: "slow website speed",
    title: "Slow pages: how to speed up a slow blog",
    metaTitle: "Slow Pages: How to Speed Up a Slow Blog (Practical Fixes)",
    metaDescription:
      "Pages that take seconds to respond lose visitors and rankings. Learn how to find slow pages, read PageSpeed and real-user data, and fix the common causes.",
    answer:
      "A slow page takes more than a few seconds to load. Visitors leave, and Google's Core Web Vitals (Largest Contentful Paint, Interaction to Next Paint and Cumulative Layout Shift) factor speed into rankings. Most blog slowness comes from slow hosting, no caching, heavy images and too many plugins or scripts.",
    why: "Speed affects every visit. A one-second delay noticeably increases how many mobile visitors give up. The fixes are usually unglamorous: caching, a CDN, image compression and removing scripts you don't need.",
    steps: [
      "Check time to first byte in your scan (we time slow pages twice, so one cold cache isn't enough), then run PageSpeed.",
      "Turn on page caching and a CDN.",
      "Compress and resize images, and serve WebP or AVIF.",
      "Remove unused plugins, widgets and third-party scripts.",
      "Upgrade hosting if the server itself responds slowly.",
    ],
    faqs: [
      {
        q: "What's a good page load time?",
        a: "Aim for a Largest Contentful Paint under 2.5 seconds on mobile for most visitors. A server response under about 800 ms is a healthy start.",
      },
      {
        q: "Should I trust lab data or field data?",
        a: "Field data from real visitors (the Chrome UX Report) is what Google uses for Core Web Vitals. Lab data from PageSpeed tests helps you debug.",
      },
    ],
    related: ["image-optimization", "javascript-rendering"],
  },
  {
    slug: "javascript-rendering",
    codes: ["needs-js"],
    category: "Indexing",
    keyword: "javascript seo",
    title: "JavaScript rendering: is your content visible to crawlers?",
    metaTitle: "JavaScript SEO: Is Your Content Visible to Crawlers?",
    metaDescription:
      "If your page's HTML is empty until JavaScript runs, some crawlers and AI tools never see your content. Learn how to check and how to fix it with SSR.",
    answer:
      "When a page's HTML contains almost no text until JavaScript runs, its content depends on rendering. Google can render JavaScript, but later and less reliably, and many other crawlers and AI tools don't render at all. Serve the content in the initial HTML with server-side rendering or static generation.",
    why: "Single-page apps and some site builders ship an empty shell and fill it in inside the browser. To a crawler that doesn't run scripts, the page looks blank, so it can't rank or be quoted.",
    steps: [
      "View the page source (not the inspector) and check whether your text is there.",
      "If it isn't, enable server-side rendering or static generation in your framework.",
      "For React, Vue or Svelte sites, frameworks like Next.js, Nuxt and SvelteKit render on the server.",
      "Make sure titles, meta tags and links are in the initial HTML too.",
      "Rescan: the word count should now reflect your real content.",
    ],
    faqs: [
      {
        q: "Can Google index JavaScript sites?",
        a: "Yes, but rendering is deferred and resource-limited, so content can be indexed late or incompletely. Server-rendered HTML is safer.",
      },
      {
        q: "Do AI crawlers run JavaScript?",
        a: "Many don't. If you want AI tools to read and cite your content, put it in the HTML.",
      },
    ],
    related: ["slow-pages", "ai-search-readiness"],
  },
  {
    slug: "mixed-content",
    codes: ["mixed-content"],
    category: "Security",
    keyword: "mixed content",
    title: "Mixed content: http files on an https page",
    metaTitle: "Mixed Content Warnings: Fix HTTP Files on HTTPS Pages",
    metaDescription:
      "Mixed content means an https page loads images, scripts or styles over plain http. Browsers block or warn about it. Learn how to find and fix every file.",
    answer:
      "Mixed content happens when a secure https page loads images, scripts, styles or frames over plain http. Browsers block insecure scripts and frames outright, so parts of the page break, and they may mark the page as not fully secure. The fix is to load every file over https, usually by updating old hard-coded addresses.",
    why: "It usually appears after a site moves to https: old posts still embed images with http:// in their address, or a theme loads a font or script from an http URL. Visitors see broken images or a warning in the address bar, which costs trust, and anything the browser blocks simply doesn't work.",
    steps: [
      "Open the page details to see each http:// file we found.",
      "Change each address to https:// and check the file still loads.",
      "In WordPress, run a search-and-replace on old http:// image addresses in your posts.",
      "If a third party doesn't offer https, host the file yourself or drop it.",
      "Add the Content-Security-Policy “upgrade-insecure-requests” header as a safety net.",
    ],
    faqs: [
      {
        q: "Does mixed content affect SEO?",
        a: "Indirectly. Google prefers secure pages, and blocked scripts or images make the page worse for visitors, which is what rankings follow.",
      },
      {
        q: "Are plain http links to other sites mixed content?",
        a: "No. Linking to an http site is fine. Mixed content is only about files the page itself loads, such as images, scripts, styles and frames.",
      },
    ],
    related: ["slow-pages", "javascript-rendering", "image-optimization"],
  },
  {
    slug: "brand-rules",
    codes: ["banned-phrase", "required-missing", "brand-not-in-title"],
    category: "Brand rules",
    keyword: "brand consistency checker",
    title: "Brand rules: keep every page on-brand",
    metaTitle: "Brand Rules: Check Every Page for On-Brand Copy",
    metaDescription:
      "Set banned phrases, required disclosures and your brand name once, then check every page of your blog against them. Here's how brand rules work.",
    answer:
      "Brand rules are your house style turned into checks: phrases you never want on the site, phrases every page must include, such as an affiliate disclosure, and your brand name in titles. That One Crawler checks every page against them during a scan, and its AI tools avoid your banned phrases.",
    why: "As a blog grows, especially with guest posts or AI-assisted drafts, copy drifts. Banned buzzwords creep in and required disclosures get forgotten, which can become a legal problem for affiliate and sponsored content.",
    steps: [
      "Open a scan and click “Brand rules”.",
      "Add your brand name, banned phrases and required phrases, one per line.",
      "Rescan to check every page against them.",
      "Filter by “Banned phrase used” or “Required phrase missing” to fix pages.",
      "Rules are saved per site, in your browser.",
    ],
    faqs: [
      {
        q: "Are brand rules stored on your servers?",
        a: "No. They're saved in your browser and sent only with the scans and AI requests you run.",
      },
      {
        q: "Can brand rules replace a compliance review?",
        a: "They're a helpful safety net for things like affiliate disclosures, but they don't replace a proper legal review.",
      },
    ],
    related: ["title-tag-length", "readability"],
  },
];

export function guideFor(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function guideForCode(code: IssueCode): Guide | undefined {
  return GUIDES.find((g) => g.codes.includes(code));
}
