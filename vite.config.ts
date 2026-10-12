import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
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

export default defineConfig({
  plugins: [react(), seoPlugin()],
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
