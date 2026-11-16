import type { APIRoute } from "astro";
import { data } from "../proto/ssr.js";
// Plain-text dump of the spec pages, learn pages and glossary, generated at build so it never drifts.
const text = (html: string) => html.replace(/<pre[^>]*>/g, "\n```\n").replace(/<\/pre>/g, "\n```\n").replace(/<li>/g, "\n- ").replace(/<(h3)>/g, "\n### ").replace(/<\/(p|h3|tr|li)>/g, "\n").replace(/<td>|<th>/g, " | ").replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(/\n{3,}/g, "\n\n").trim();
export const GET: APIRoute = () => {
  const out: string[] = ["# Sharenote: full text", ""];
  for (const s of data.specs as any[]) {
    out.push(`## SNP-${s.n} ${s.title} (${s.status})`, "", s.oneLine, "", text(s.summary));
    for (const k of s.kinds || []) out.push(`- kind ${k.kind}: ${k.name}. ${k.how}`);
    for (const sec of s.sections || []) out.push("", `### ${sec.h}`, "", text(sec.html));
    if (s.example) out.push("", `### ${s.example.title || "Worked example"}`, "", text(s.example.html));
    out.push("");
  }
  for (const [, v] of Object.entries(data.learn) as [string, any][]) out.push(`## ${v.title}`, "", v.lede, "", text(v.html), "");
  out.push("## Glossary", "", ...(data.glossary as any[]).map((g) => `- **${g.term}** (SNP-${g.snp}): ${g.def}`), "");
  return new Response(out.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
};
