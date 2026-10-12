import { describe, expect, it } from "vitest";
import { ABOUT, SEO } from "./content";
import { AI_CRAWLERS, DISALLOW, PERSON_ID, headTags, jsonLd, jsonLdScript, llmsTxt, robotsTxt, sitemapXml, staticReading, titleTag } from "./seo";
import { weeksBehind } from "./utils/time";

// The portfolio's share-description-floor rule, held here by a test so a copy change cannot break it unseen (D-66).
describe("search copy", () => {
  it("description runs 100 to 160 characters", () => {
    expect(SEO.description.length).toBeGreaterThanOrEqual(100);
    expect(SEO.description.length).toBeLessThanOrEqual(160);
  });
  it("title fits a search result", () => {
    expect(SEO.title.length).toBeLessThanOrEqual(60);
  });
});

describe("head and structured data", () => {
  it("head carries the description, canonical and share image", () => {
    const h = headTags();
    expect(h).toContain('name="description"');
    expect(h).toContain('rel="canonical"');
    expect(h).toContain('property="og:image"');
    expect(h).toContain('name="twitter:card" content="summary_large_image"');
  });
  it("JSON-LD parses and names the portfolio's Person", () => {
    const script = jsonLdScript();
    const parsed = JSON.parse(script.replace(/^<script[^>]*>/, "").replace(/<\/script>$/, ""));
    expect(parsed).toEqual(jsonLd());
    const app = parsed["@graph"][0];
    expect(app.author["@id"]).toBe(PERSON_ID);
    expect(PERSON_ID).toBe("https://shoro.space/#person");
  });
});

// Every section of the About overlay reaches the crawlers too: a section added to the overlay and missing here fails.
describe("crawler text", () => {
  const labels = ABOUT.groups.flat().map((s) => s.label);
  it("the hidden reading has an h1 and every About section", () => {
    const html = staticReading();
    expect(html).toContain(`<h1>${ABOUT.title}</h1>`);
    for (const l of labels) expect(html).toContain(`<h2>${l}</h2>`);
    expect(html).not.toContain("{weeks}");
  });
  it("llms.txt has every About section", () => {
    const md = llmsTxt();
    for (const l of labels) expect(md).toContain(`**${l}**`);
    expect(md).not.toContain("{weeks}");
  });
});

describe("robots and sitemap", () => {
  const r = robotsTxt();
  it("names every AI crawler and keeps the API and the harness out", () => {
    for (const a of AI_CRAWLERS) expect(r).toContain(`User-agent: ${a}`);
    for (const d of DISALLOW) expect(r).toContain(`Disallow: ${d}`);
    expect(r).toContain("Sitemap: https://aqi-synth.vercel.app/sitemap.xml");
  });
  it("sitemap lists the page with its date", () => {
    expect(sitemapXml("2026-10-12")).toContain("<loc>https://aqi-synth.vercel.app/</loc><lastmod>2026-10-12</lastmod>");
  });
});

describe("weeksBehind", () => {
  const now = Date.parse("2026-10-12T12:00:00");
  it("whole weeks since the archive's last day", () => {
    expect(weeksBehind("2026-07-20", now)).toBe(12);
  });
  it("never less than one", () => {
    expect(weeksBehind("2026-10-11", now)).toBe(1);
  });
  it("null without a day", () => {
    expect(weeksBehind(null, now)).toBeNull();
    expect(weeksBehind("not a date", now)).toBeNull();
  });
});

describe("tab title", () => {
  it("is the search title, escaped", () => {
    expect(titleTag()).toBe(`<title>${SEO.title}</title>`);
  });
});
