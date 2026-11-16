import type { APIRoute } from "astro";
import { data } from "../proto/ssr.js";
const SITE = "https://sharenote.xyz";
export const GET: APIRoute = () => {
  const lines = [
    "# Sharenote",
    "",
    "> Proof of energy on Nostr. A Sharenote is a receipt for computation that anyone can check and no one has to issue. Its denomination is a Z-bit (`20z00` ≈ 2^20 expected hashes). Specs: the Sharenote Proposals, SNP-01 to 09.",
    "",
    "## Specs",
    ...data.specs.map((s: any) => `- [SNP-${s.n} ${s.title}](${SITE}/specs/${s.n}/): ${s.oneLine}`),
    "",
    "## Learn",
    ...Object.entries(data.learn).map(([k, v]: [string, any]) => `- [${v.title}](${SITE}/learn/${k}/): ${v.lede}`),
    `- [Glossary](${SITE}/learn/glossary/): current terms and retired names`,
    "",
    "## Tools",
    ...data.tools.map((t: any) => `- [${t.t}](${SITE}/tools/${t.id}/): ${t.d}`),
    "",
    "## SDKs",
    "- sharenotejs (TypeScript), go-sharenote (Go), sharenotelib (Python): one module per SNP, all pass the same vectors. https://github.com/soprinter",
    "",
    "## Optional",
    `- [Full text for language models](${SITE}/llms-full.txt)`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
