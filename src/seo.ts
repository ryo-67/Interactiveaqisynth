// seo — what crawlers, link previews and AI engines read (D-66, 2026-10-12). The page is a client-rendered scene: until JavaScript runs, #root is empty, and most AI crawlers (GPTBot, ClaudeBot, PerplexityBot) and every link-preview fetcher never run it. So the build writes the page's meaning into the HTML itself: head tags, schema.org JSON-LD, the About overlay's text as a visually hidden reading inside #root (React replaces it on mount), and robots.txt, sitemap.xml and llms.txt beside it (vite.config.ts seoPlugin). Pure: no DOM, no React. Every word comes from content.ts; the shape follows the portfolio's lib/file/seo.ts (its decision site-seo).

import { ABOUT, CREDIT_NAME, CREDIT_URL, GITHUB_URL, LINKEDIN_URL, PORTFOLIO_RECORD_URL, PORTFOLIO_URL, SEO, SITE_URL, SOURCE_URL_AIRNOW, SOURCE_URL_EPA } from "./content";
import { ARCHIVE_LAST_DATE } from "./utils/nycOpenData";
import { weeksBehind } from "./utils/time";
import { NIGHT_GROUND } from "./utils/theme";

/** The AI search and assistant agents, named and welcomed in robots.txt: they read the page to answer a question and cite it, which is the point (OpenAI's search index and its user fetches, Anthropic's, Perplexity's). Google-Extended too (Shoro, 2026-10-15): one token covers both Gemini's training and its grounding in the Gemini app, and being offered as a link there is worth the training. */
export const AI_SEARCH_AGENTS = ["OAI-SearchBot", "ChatGPT-User", "Claude-SearchBot", "Claude-User", "PerplexityBot", "Perplexity-User", "Google-Extended"] as const;
/** Model training, kept out (D-73, Shoro, 2026-10-15): OpenAI's GPTBot and Anthropic's ClaudeBot (each company's training crawler, separate from its search one above), Applebot-Extended (Apple's foundation models; Apple's search unaffected), CCBot (Common Crawl, whose corpus trains many models). */
export const AI_TRAINING_CRAWLERS = ["GPTBot", "ClaudeBot", "Applebot-Extended", "CCBot"] as const;

/** Kept out of search: the serverless routes and the tuning harness. vercel.json sends X-Robots-Tag: noindex on the same paths. */
export const DISALLOW = ["/api/", "/scene-test"] as const;

/** Google Search Console's ownership check for the URL-prefix property https://aqi-synth.vercel.app/ (Shoro, 2026-10-12). Public by design; removing it un-verifies the property. Kept after the move to aqi.shoro.space (D-67): the old property carries Search Console's Change of Address to https://aqi.shoro.space/, filed 2026-10-12, which runs 180 days and needs this tag (and the 308s) in place until at least 2027-04-10. */
const GOOGLE_SITE_VERIFICATION = "8S-yy-_ddlDaj8iCDD1U03aDoysf7FRxppI_p2_H994";

/** IndexNow's key (D-66, 2026-10-12): served at /<key>.txt (vite.config.ts) and sent with each ping by .github/workflows/indexnow.yml, which reads it from this line. Public by design: it only proves the pinger controls the host. IndexNow tells Bing, Yandex, Seznam and Naver a URL changed; Google does not take part. */
export const INDEXNOW_KEY = "cea79ff0bca111e51309393aedb6a67a";

/** The portfolio home's Person, by the same @id it publishes, so engines join the two sites into one maker. */
export const PERSON_ID = `${PORTFOLIO_URL}/#person`;

const CANONICAL = `${SITE_URL}/`;
const IMAGE_URL = `${SITE_URL}${SEO.image.path}`;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The About text with {weeks} filled as of the build, the overlay's own fill. The archive's last day is ARCHIVE_LAST_DATE; the overlay may know a later one from the EPA feed, so the two can differ by the weeks since the snapshot. */
function sections(now: number) {
  const weeks = weeksBehind(ARCHIVE_LAST_DATE, now);
  return ABOUT.groups.flat().map((s) => ({ label: s.label, body: s.body.replace("{weeks}", weeks == null ? "several" : String(weeks)) }));
}

/** The tab's title, which is also the one search results show: SEO.title (Shoro, 2026-10-12: "use the longer title for the tab too"). index.html keeps a short one for the build to replace. */
export function titleTag(): string {
  return `<title>${esc(SEO.title)}</title>`;
}

/** The head's tags: description, canonical, robots, theme colour, Open Graph and Twitter. */
export function headTags(): string {
  const meta = (attr: "name" | "property", key: string, value: string | number) => `<meta ${attr}="${key}" content="${esc(String(value))}" />`;
  return [
    meta("name", "description", SEO.description),
    `<link rel="canonical" href="${CANONICAL}" />`,
    meta("name", "robots", "index, follow, max-image-preview:large"),
    meta("name", "author", CREDIT_NAME),
    meta("name", "theme-color", NIGHT_GROUND), // the night ground (theme.ts; index.css html)
    meta("name", "google-site-verification", GOOGLE_SITE_VERIFICATION),
    meta("property", "og:type", "website"),
    meta("property", "og:site_name", ABOUT.title),
    meta("property", "og:locale", "en_US"),
    meta("property", "og:url", CANONICAL),
    meta("property", "og:title", SEO.title),
    meta("property", "og:description", SEO.description),
    meta("property", "og:image", IMAGE_URL),
    meta("property", "og:image:width", SEO.image.width),
    meta("property", "og:image:height", SEO.image.height),
    meta("property", "og:image:alt", SEO.imageAlt),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", SEO.title),
    meta("name", "twitter:description", SEO.description),
    meta("name", "twitter:image", IMAGE_URL),
    meta("name", "twitter:image:alt", SEO.imageAlt),
  ].join("\n    ");
}

/** schema.org: the piece as a WebApplication and CreativeWork, made by the portfolio's Person, built on its two sources. */
export function jsonLd() {
  const person = { "@type": "Person", "@id": PERSON_ID, name: CREDIT_NAME, url: PORTFOLIO_URL, sameAs: [LINKEDIN_URL] };
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["WebApplication", "CreativeWork"],
        "@id": `${SITE_URL}/#app`,
        name: ABOUT.title,
        url: CANONICAL,
        description: SEO.description,
        abstract: ABOUT.intro,
        image: IMAGE_URL,
        applicationCategory: "MultimediaApplication",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript, WebGL and Web Audio",
        isAccessibleForFree: true,
        inLanguage: "en",
        keywords: SEO.keywords.join(", "),
        spatialCoverage: { "@type": "Place", name: "New York City", address: { "@type": "PostalAddress", addressLocality: "New York", addressRegion: "NY", addressCountry: "US" } },
        license: "https://creativecommons.org/licenses/by-nc/4.0/", // the work, not the code (LICENSE-CONTENT.md; the code is MIT)
        author: person,
        creator: { "@id": PERSON_ID },
        sameAs: [PORTFOLIO_RECORD_URL, GITHUB_URL],
        // The two sources as works the piece is built on, not as Datasets (2026-10-13): Google reads any Dataset as a candidate for Dataset Search, and flagged these for a missing description, creator and license. They are AirNow's and the EPA's, not ours to describe or license, and the page does not host them, so it should not offer itself as their entry.
        isBasedOn: [
          { "@type": "CreativeWork", name: SEO.sourceAirNow, url: SOURCE_URL_AIRNOW },
          { "@type": "CreativeWork", name: SEO.sourceEpa, url: SOURCE_URL_EPA },
        ],
      },
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: CANONICAL, name: ABOUT.title, description: SEO.description, inLanguage: "en", author: { "@id": PERSON_ID } },
    ],
  };
}

/** The JSON-LD as a script tag; "<" escaped so no string in it can close the script. */
export function jsonLdScript(): string {
  return `<script type="application/ld+json">${JSON.stringify(jsonLd()).replace(/</g, "\\u003c")}</script>`;
}

/** The About overlay as plain HTML for readers that never run the app: an h1, the intro, each section under its own h2, the sources and the credit. Visually hidden (index.css .seo-reading) and replaced by the app on mount. */
export function staticReading(now = Date.now()): string {
  const link = (href: string, text: string) => `<a href="${esc(href)}">${esc(text)}</a>`;
  return [
    `<main class="seo-reading">`,
    `<h1>${esc(ABOUT.title)}</h1>`,
    `<p>${esc(SEO.description)}</p>`,
    `<p>${esc(ABOUT.intro)}</p>`,
    ...sections(now).map((s) => `<section><h2>${esc(s.label)}</h2><p>${esc(s.body)}</p></section>`),
    `<section><h2>${esc(SEO.llmsSources)}</h2><ul><li>${link(SOURCE_URL_AIRNOW, SEO.sourceAirNow)}</li><li>${link(SOURCE_URL_EPA, SEO.sourceEpa)}</li></ul></section>`,
    `<footer><p>${esc(ABOUT.credit)}. ${esc(ABOUT.credit2)}</p><p>${link(CREDIT_URL, ABOUT.links.website)} · ${link(LINKEDIN_URL, ABOUT.links.linkedin)} · ${link(GITHUB_URL, ABOUT.links.github)} · ${link(PORTFOLIO_RECORD_URL, SEO.portfolioRecord)}</p><p>${esc(ABOUT.made)}</p></footer>`, // the AI disclosure last, as the overlay has it
    `</main>`,
  ].join("");
}

/** llms.txt (llmstxt.org): the page in Markdown for language models. */
export function llmsTxt(now = Date.now()): string {
  return `# ${ABOUT.title}

> ${SEO.description}

${ABOUT.intro}

Open it: ${CANONICAL}

## ${SEO.llmsHow}

${sections(now).map((s) => `- **${s.label}**: ${s.body}`).join("\n")}

## ${SEO.llmsSources}

- [${SEO.sourceAirNow}](${SOURCE_URL_AIRNOW})
- [${SEO.sourceEpa}](${SOURCE_URL_EPA})

## ${SEO.llmsMaker}

${ABOUT.credit}. ${ABOUT.credit2}

- [${ABOUT.links.website}](${CREDIT_URL})
- [${SEO.portfolioRecord}](${PORTFOLIO_RECORD_URL})
- [${ABOUT.links.linkedin}](${LINKEDIN_URL})
- [${ABOUT.links.github}](${GITHUB_URL})

${ABOUT.made}
`;
}

/** robots.txt: everyone welcome but the API and the harness; the AI search agents named, with the same rules; the training crawlers named and kept out entirely. */
export function robotsTxt(): string {
  const agents = (list: readonly string[]) => list.map((a) => `User-agent: ${a}`);
  const welcome = (list: readonly string[]) => [...agents(list), "Allow: /", ...DISALLOW.map((d) => `Disallow: ${d}`)].join("\n");
  const refuse = (list: readonly string[]) => [...agents(list), "Disallow: /"].join("\n");
  return `${welcome(["*"])}\n\n${welcome(AI_SEARCH_AGENTS)}\n\n${refuse(AI_TRAINING_CRAWLERS)}\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}

/** sitemap.xml: the one page, dated by the build. */
export function sitemapXml(buildDate: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${CANONICAL}</loc><lastmod>${buildDate}</lastmod></url>\n</urlset>\n`;
}
