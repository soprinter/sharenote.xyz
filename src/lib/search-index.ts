import { getCollection } from "astro:content";
import type { DocsEntry } from "@/lib/types";
import { capitalizeFirstLetter } from "@/lib/utils";

function extractHeaders(body: string): string[] {
  const headers: string[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^#{1,6}\s+(.*)/);
    if (m) headers.push(m[1]);
  }
  return headers;
}

function stripMdx(body: string): string {
  return body
    .replace(/import\s+.*?from\s+['"].*?['"]/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_~>\-|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

export interface SearchEntry {
  title: string;
  description: string;
  href: string;
  headers: string;
  body: string;
  category: string;
}

export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const docs: DocsEntry[] = await getCollection("docs");
  return docs
    .filter((d) => !d.data.draft)
    .map((d) => {
      const slug = d.slug;
      const parts = slug.split("/");
      const category = capitalizeFirstLetter(parts[0] || "");
      return {
        title: d.data.title || capitalizeFirstLetter(parts[parts.length - 1] || ""),
        description: d.data.description || "",
        href: "/" + slug,
        headers: extractHeaders(d.body || "").join(" — "),
        body: stripMdx(d.body || ""),
        category,
      };
    });
}
