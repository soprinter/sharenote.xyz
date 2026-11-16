import type { APIRoute } from "astro";
import { site } from "../proto/ssr.js";
// Loaded only when search opens, so the content data never ships in page JS.
export const GET: APIRoute = () => new Response(JSON.stringify(site.searchIndex()), { headers: { "Content-Type": "application/json" } });
