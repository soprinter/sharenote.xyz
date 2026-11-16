import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

// Old SNIP-era URLs → their SNP-era pages (mirrored in public/_redirects for the host).
const redirects = {
  "/specifications": "/specs/",
  "/specifications/snip-00": "/specs/01/",
  "/specifications/snip-02": "/specs/02/",
  "/specifications/snip-03": "/specs/04/",
  "/specifications/snip-04": "/specs/02/",
  "/specifications/snip-05": "/specs/03/",
  "/planner": "/tools/planner/",
  "/the-market": "/tools/",
  "/the-market/planner-calculator": "/tools/planner/",
  "/the-market/spending-bills": "/tools/buy/",
  "/the-market/hashrate-monetization": "/tools/buy/",
  "/the-market/agent-integration": "/build/",
  "/the-market/skills": "/build/",
  "/the-market/faqs": "/",
  "/learn/introduction": "/learn/",
  "/learn/what-is-sharenote": "/learn/note/",
  "/learn/how-it-works": "/learn/note/",
  "/learn/the-z-bit-standard": "/learn/zbit/",
  "/learn/use-cases": "/learn/",
  "/learn/learn-by-example": "/learn/",
};

export default defineConfig({
  site: "https://sharenote.xyz/",
  redirects,
  prefetch: { prefetchAll: true, defaultStrategy: "viewport" },
  integrations: [sitemap({ filter: (p) => !/\/(search\.json|llms(-full)?\.txt)$/.test(p) })],
  build: { inlineStylesheets: "always" },
  vite: { server: { allowedHosts: true }, preview: { allowedHosts: true } },
});
