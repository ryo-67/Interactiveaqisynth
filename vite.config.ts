import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';
import { INDEXNOW_KEY, headTags, jsonLdScript, llmsTxt, robotsTxt, sitemapXml, staticReading, titleTag } from './src/seo';

// What crawlers and AI engines read (D-66, src/seo.ts): head tags and JSON-LD into <head>, the About text as a hidden reading inside #root (the app replaces it on mount), and robots.txt, sitemap.xml and llms.txt beside the page. Runs in dev too, so what is checked locally is what ships. All of it is built from content.ts at build time; the week count in the About text is as of the build.
function seoPlugin(): Plugin {
  return {
    name: 'aqi-seo',
    transformIndexHtml(html) {
      return html
        .replace(/<title>[^<]*<\/title>/, titleTag())
        .replace('</head>', `  ${headTags()}\n    ${jsonLdScript()}\n  </head>`)
        .replace('<div id="root"></div>', `<div id="root">${staticReading()}</div>`);
    },
    generateBundle() {
      const today = new Date().toISOString().slice(0, 10);
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robotsTxt() });
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: sitemapXml(today) });
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: llmsTxt() });
      // IndexNow's key file, and the commit this build came from: the IndexNow workflow waits until build.txt names its push (or a later one) before pinging, which does not depend on Vercel reporting its deploys to GitHub (D-66a).
      this.emitFile({ type: 'asset', fileName: `${INDEXNOW_KEY}.txt`, source: INDEXNOW_KEY });
      this.emitFile({ type: 'asset', fileName: 'build.txt', source: `${process.env.VERCEL_GIT_COMMIT_SHA || 'local'}\n` });
    },
  };
}

// What the site publishes carries no internal notes (Shoro, 2026-10-15): anyone can read the page source, and bug and decision numbers, dates and the reasoning behind them belong in the repository, not on the live site. The comments in index.html and in the SVGs public/ copies stay in the source, where they document it, and are taken out of what is built; the minifier already takes them out of the JS and the CSS. Then every published file is checked, and the build fails if an internal marker got through (a shader's comments, for one, are string contents the minifier keeps).
const INTERNAL_MARKERS = /\b(?:BUG|CLN|DSN|SON|UX|DAT|INF|POL|GRA|SCN|DOC|PH0|A11Y)-\d+\b|\bD-\d{2,3}[a-z]?\b|\b(?:STRATEGY|BACKLOG)\b|Shoro, \d{4}-\d{2}-\d{2}|TEMP DEBUG|<!--/;
const stripComments = (markup: string): string => markup.replace(/[ \t]*<!--[\s\S]*?-->\n?/g, '');
function publishedSourcePlugin(): Plugin {
  let outDir = '';
  return {
    name: 'aqi-published-source',
    apply: 'build',
    configResolved(config) { outDir = path.resolve(config.root, config.build.outDir); },
    transformIndexHtml: { order: 'post', handler: stripComments },
    closeBundle() {
      const files = (dir: string): string[] => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? (e.name === 'data' ? [] : files(path.join(dir, e.name))) : [path.join(dir, e.name)])); // data/ is the archive, readings only
      const leaks: string[] = [];
      for (const file of files(outDir)) {
        if (!/\.(html|svg|js|css|txt|xml|json|webmanifest)$/.test(file)) continue;
        let text = fs.readFileSync(file, 'utf8');
        if (file.endsWith('.svg')) { text = stripComments(text); fs.writeFileSync(file, text); }
        const hit = (file.endsWith('.html') || file.endsWith('.svg') ? text : text.replace(/<!--/g, '')).match(INTERNAL_MARKERS); // only markup is held to the no-comment rule: a library's JS may spell "<!--" in a string
        if (hit) leaks.push(`${path.relative(outDir, file)}: "${text.slice(Math.max(0, hit.index! - 40), hit.index! + 60).replace(/\s+/g, ' ')}"`);
      }
      if (leaks.length) throw new Error(`Internal notes in the published site:\n${leaks.join('\n')}`);
    },
  };
}

export default defineConfig({
  plugins: [react(), seoPlugin(), publishedSourcePlugin()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',
  },
  server: {
    // PORT env (set by tooling like the Claude Code preview) wins; 55128 is the default dev port.
    port: Number(process.env.PORT) || 55128,
    open: true,
  },
});
