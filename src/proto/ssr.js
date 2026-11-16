// Build-time rendering: runs the prototype's page functions in Node and returns static HTML.
import "./env.js";
import qrcode from "qrcode-generator";
import "./zmath.js";
import "./fixtures.js";
import "./data-content.js";
import "./tools.js";
import "./app.js";

globalThis.window.qrcode = qrcode;
export const site = globalThis.window.SNSite;
export const data = { specs: globalThis.window.SN_SPECS, learn: globalThis.window.SN_LEARN, glossary: globalThis.window.SN_GLOSSARY, tools: globalThis.window.SN_TOOL_META };
/** full shell for a route: header + main + footer, with "#name" links turned into real paths */
export function page(route) {
  const r = site.renderRoute(route);
  const sheets = [...r.html.matchAll(/data-sheet="([^"]+)"/g)].map((m) => m[1]);
  if (sheets.length) {
    const i = r.html.search(/<div class="panel stack" data-sheet=/);
    const row = '<div class="sheet-chips">' + sheets.map((t) => '<button type="button" class="btn sm">' + t + ' <span aria-hidden="true">›</span></button>').join("") + "</div>";
    r.html = r.html.slice(0, i) + row + r.html.slice(i);
  }
  const nav = r.nav;
  return { ...r, shell: site.fixLinks(site.header(nav) + '<main id="main">' + r.html + "</main>" + site.footer()) };
}
