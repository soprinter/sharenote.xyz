// Shared globals for the prototype modules, on the server (build) and in the browser.
const g = globalThis;
if (typeof g.window === "undefined") g.window = g;
g.window.SN_ASSETS = {
  bill: "/assets/bill-blank.webp",
  billSmall: "/assets/bill-600.webp",
  billSrcset: "/assets/bill-600.webp 600w, /assets/bill-800.webp 800w, /assets/bill-blank.webp 1000w",
  billAvif: "/assets/bill-600.avif 600w, /assets/bill-800.avif 800w, /assets/bill-1000.avif 1000w",
  logo: "/assets/logo.webp",
  rosette: "/assets/rosette.svg",
  era: [2, 3, 4, 5].map((n) => `/assets/era-${n}.webp`),
};
