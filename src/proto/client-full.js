// Pages with live tools (home, tools, network): the maths, the miner and the tools, then the shell.
import "./env.js";
// the miner worker loads the maths from its own file (one download, cached), not a second inline copy
import zmathUrl from "./zmath.js?url";
import "./zmath.js";
import "./fixtures.js";
import "./tools.js";
import "./app.js";
import "./mobile.js";

window.ZMATH_URL = zmathUrl;
// the QR library is only needed when a note is minted in the page: fetch it once the page is idle
const idle = window.requestIdleCallback || ((f) => setTimeout(f, 1200));
idle(() => import("qrcode-generator").then((m) => { window.qrcode = m.default || m; }));
