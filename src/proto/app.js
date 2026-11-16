/* app.js — shell, components, router and content pages. Tools register into window.TOOLS (tools.js). */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var short = function (h, a, b) { h = String(h || ""); return h.length > (a || 8) + (b || 6) + 1 ? h.slice(0, a || 8) + "…" + h.slice(-(b || 6)) : h; };
  var store = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ---------- icons ---------- */
  var I = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    gh: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.3-3.4-1.3-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.7 0 0 .8-.3 2.8 1a9.6 9.6 0 0 1 5 0c1.9-1.3 2.8-1 2.8-1 .5 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.7 0 3.9-2.3 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2z"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    warn: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3 2 21h20L12 3z"/><path d="M12 10v5M12 18h.01"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  /* ---------- generative engraving ---------- */
  function rosettePath(cx, cy, R, r, d, loops, steps) {
    var p = "", n = steps || 720;
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * Math.PI * 2 * loops;
      var x = cx + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      var y = cy + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      p += (i ? "L" : "M") + x.toFixed(2) + " " + y.toFixed(2);
    }
    return p;
  }
  function logo() {
    return '<span class="logo-wrap" aria-hidden="true"><img class="ros" src="' + (window.SN_ASSETS || {}).rosette + '" alt=""><img class="lg" src="' + (window.SN_ASSETS || {}).logo + '" alt=""></span>';
  }
  var SEAL_RING = rosettePath(60, 60, 54, 6, 9, 2, 600);
  function seal(state) {
    var col = state === "bad" ? "var(--danger)" : state === "pend" ? "var(--ember)" : "var(--signal)";
    var mark = state === "bad" ? '<path d="M48 48l24 24M72 48 48 72" stroke="' + col + '" stroke-width="5" stroke-linecap="round"/>'
      : state === "pend" ? '<circle cx="60" cy="60" r="5" fill="' + col + '"/>'
      : '<path d="m46 61 10 10 19-21" fill="none" stroke="' + col + '" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>';
    return '<svg class="seal" viewBox="0 0 120 120" aria-hidden="true"><path d="' + SEAL_RING + '" fill="none" stroke="' + col + '" stroke-width=".7" opacity=".85"/>' +
      '<circle cx="60" cy="60" r="27" fill="var(--sheet)" stroke="' + col + '" stroke-width="1.6"/>' + mark + "</svg>";
  }
  function paintGuil(root) {
    var col = getComputedStyle(document.documentElement).getPropertyValue("--guil").trim() || "rgba(31,76,59,.14)";
    $$("canvas.gcv", root).forEach(function (cv) {
      var w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      var c = cv.getContext("2d"); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, w, h);
      c.strokeStyle = col; c.lineWidth = .7;
      var kind = cv.dataset.g || "waves", seed = Number(cv.dataset.seed || 1);
      if (kind === "waves" || kind === "note") {
        var lines = kind === "note" ? 26 : 34, amp = kind === "note" ? h * .09 : 22;
        for (var j = 0; j < lines; j++) {
          c.beginPath();
          for (var x = 0; x <= w; x += 3) {
            var y = (j + .5) * (h / lines) + Math.sin(x / (38 + seed * 3) + j * .42) * amp * Math.sin(x / (210 + seed * 11) + j * .07);
            x ? c.lineTo(x, y) : c.moveTo(x, y);
          }
          c.stroke();
        }
      }
      if (kind === "note" || kind === "rosette") {
        var cx = kind === "note" ? w * .78 : w / 2, cy = kind === "note" ? h * .55 : h / 2, R = Math.min(w, h) * (kind === "note" ? .42 : .48);
        c.lineWidth = .55;
        [[R, R / 7.5, R * .2, 4], [R * .74, R / 9, R * .16, 5], [R * .5, R / 6, R * .12, 3]].forEach(function (q) {
          c.beginPath();
          var steps = 1400, loops = q[3];
          for (var i = 0; i <= steps; i++) {
            var t = (i / steps) * Math.PI * 2 * loops, Rr = q[0] - q[1];
            var px = cx + Rr * Math.cos(t) + q[2] * Math.cos((Rr / q[1]) * t);
            var py = cy + Rr * Math.sin(t) - q[2] * Math.sin((Rr / q[1]) * t);
            i ? c.lineTo(px, py) : c.moveTo(px, py);
          }
          c.stroke();
        });
      }
    });
  }

  /* ---------- the bill (original ostrich note art, live values printed on it) ---------- */
  var A = window.SN_ASSETS || {};
  function zfmt(zb) { var p = String(zb).split("z"); return '<span class="zn">' + esc(p[0]) + '<span class="zz">z</span>' + esc(p[1] || "") + "</span>"; }
  function qrSvg(rec) {
    if (!rec || !window.qrcode) return '<div class="b-qr empty"><span>QR prints<br>after minting</span></div>';
    try {
      var q = window.qrcode(0, "L"); q.addData(SN.hex(rec).toUpperCase(), "Alphanumeric"); q.make();
      var n = q.getModuleCount(), d = "";
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
      return '<div class="b-qr" title="SN4U record, ' + rec.length + ' bytes"><svg viewBox="-2 -2 ' + (n + 4) + " " + (n + 4) + '" shape-rendering="crispEdges" aria-hidden="true"><path d="' + d + '"/></svg></div>';
    } catch (e) { return '<div class="b-qr empty"><span>record too long for QR</span></div>'; }
  }
  function threadText(v, st, zb, o) {
    var t = st === "ok" ? "VERIFIED · H ≤ T(" + zb + ")" : st === "pend" ? "MINTING · " + zb : (v + (o.check ? " · CHECK " + o.check : "") + (o.reason ? " · " + String(o.reason).toUpperCase() : ""));
    return new Array(7).join(t + " · ");
  }
  function noteCard(o) {
    o = o || {};
    var v = o.verdict || "ATTRIBUTED", st = v === "ATTRIBUTED" ? "ok" : v === "PENDING" ? "pend" : "bad";
    var zb = String(o.zbit || "20z00"), alg = String(o.alg || "sha256d");
    var bind = String(o.binding || "unbound").replace(/[“”]/g, ""); if (bind.length > 22) bind = bind.slice(0, 21) + "…";
    var foot = o.foot || "≈ " + fmtHashes(SN.valueFloat(SN.parseZBit(zb) || { z: 20, cc: 0 })) + " hashes of work";
    var rec = typeof o.record === "string" ? SN.unhex(o.record) : o.record;
    var corner = '<span class="zn" style="font-size:' + (zb.length <= 5 ? 2.7 : zb.length === 6 ? 2.25 : 1.9) + 'cqw">' + esc(zb) + "</span>";
    return '<div class="bill' + (st === "bad" ? " void" : "") + '"' + (o.id ? ' id="' + o.id + '"' : "") + (rec ? ' data-rec="' + SN.hex(rec) + '"' : "") + ' role="img" aria-label="Sharenote ' + esc(zb) + ", " + esc(alg) + ", " + esc(v) + '">' +
      (A.billAvif ? '<picture><source type="image/avif" srcset="' + A.billAvif + '" sizes="(max-width: 700px) 100vw, 620px">' : "") + '<img class="bill-bg" src="' + A.bill + '"' + (A.billSrcset ? ' srcset="' + A.billSrcset + '" sizes="(max-width: 700px) 100vw, 620px"' : "") + ' alt="" width="1000" height="601" decoding="async">' + (A.billAvif ? "</picture>" : "") +
      '<div class="b-corner l">' + corner + '</div><div class="b-corner r">' + corner + "</div>" +
      '<div class="b-sub">Proof of energy · kind 1723</div>' +
      '<div class="b-thread ' + st + '" title="' + esc(v) + '"><span>' + esc(threadText(v, st, zb, o)) + "</span></div>" +
      qrSvg(rec) +
      '<div class="b-band"><span class="zn">' + esc(zb) + "</span>&nbsp;• " + esc(alg) + " • " + esc(bind) + "</div>" +
      '<div class="b-micro"><span>CREDITED ' + esc(short(o.identity || SN_FIX.G, 8, 6)) + "</span><span>PROOF H " + esc(o.H ? short(o.H, 10, 6) : "—") + "</span><span>" + esc(foot) + "</span></div></div>";
  }


  /* ---------- number formatting ---------- */
  function fmtHashes(d) {
    if (!isFinite(d)) return "∞";
    var u = ["", " thousand", " million", " billion", " trillion", " quadrillion", " quintillion", " sextillion"];
    var i = 0; while (d >= 1000 && i < u.length - 1) { d /= 1000; i++; }
    if (i === u.length - 1 && d >= 1000) return "2^" + Math.log2(d * 1e21).toFixed(1);
    return (d >= 100 ? d.toFixed(0) : d >= 10 ? d.toFixed(1) : d.toFixed(2)) + u[i];
  }
  function fmtRate(hs) {
    var u = ["H/s", "kH/s", "MH/s", "GH/s", "TH/s", "PH/s", "EH/s", "ZH/s"], i = 0;
    while (hs >= 1000 && i < u.length - 1) { hs /= 1000; i++; }
    return (hs >= 100 ? hs.toFixed(0) : hs >= 10 ? hs.toFixed(1) : hs.toFixed(2)) + " " + u[i];
  }
  function fmtDur(s) {
    if (!isFinite(s)) return "never";
    if (s < 1) return (s * 1000).toFixed(s < .01 ? 2 : 0) + " ms";
    if (s < 120) return s.toFixed(s < 10 ? 1 : 0) + " s";
    if (s < 7200) return (s / 60).toFixed(0) + " min";
    if (s < 172800) return (s / 3600).toFixed(1) + " h";
    if (s < 63072000) return (s / 86400).toFixed(0) + " days";
    return (s / 31557600).toExponential(1).replace("e+", "×10^") + " years";
  }
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " "); }

  /* ---------- toast ---------- */
  var toastT;
  function toast(msg) { var t = $(".toast"); if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(function () { t.hidden = true; }, 2200); }
  function copy(text) { try { navigator.clipboard.writeText(text).then(function () { toast("Copied"); }, function () { toast("Select and copy manually"); }); } catch (e) { toast("Select and copy manually"); } }

  /* ---------- shared data accessors ---------- */
  var SPECS = function () { return window.SN_SPECS || []; };
  var spec = function (n) { return SPECS().filter(function (s) { return s.n === n; })[0]; };
  var LAYERS = [["note", "The note"], ["mining", "Mining"], ["discovery", "Discovery"], ["paid-work", "Paid work"], ["infrastructure", "Infrastructure"], ["applications", "Applications"]];

  /* ---------- tools catalog (render fns in tools.js) ---------- */
  var TOOL_META = [
    { id: "zbit", t: "Z-bit converter", d: "Turn a Z-bit into its target, expected hashes and weight, exactly.", snp: "01", aud: "everyone" },
    { id: "mint", t: "Mint a note", d: "Mine a real sha256d note in your browser and inspect every byte of its SN4U record.", snp: "01", aud: "everyone" },
    { id: "sum", t: "Add and split", d: "Add notes by weight and split a reward the way SNP-01 does it.", snp: "01", aud: "issuers" },
    { id: "planner", t: "Hashrate planner", d: "What your hardware mints per second, and what hashrate public shares imply.", snp: "02", aud: "miners" },
    { id: "merged", t: "Merged mining", d: "Follow one template from coinbase to share or block, with the z-chain slot.", snp: "02", aud: "miners" },
    { id: "offer", t: "Work offer", d: "Compose an offer and watch work on a post add up into a reward split.", snp: "04", aud: "issuers" },
    { id: "audit", t: "Audit a receipt", d: "Check a payout receipt against the notes. Break it and see what gets caught.", snp: "05", aud: "auditors" },
    { id: "buy", t: "Buy work", d: "Order notes from a mining provider when your device can't mine.", snp: "06", aud: "buyers" },
    { id: "ask", t: "Command your rig", d: "Send an ask to your own rig and watch the queue respect rank and priority.", snp: "08", aud: "rig owners" },
    { id: "access", t: "Pay an API with work", d: "A 402 round trip: price, mine, pay, get served, and replay to see 'spent'.", snp: "09", aud: "developers, agents" }
  ];
  window.SN_TOOL_META = TOOL_META;

  /* ---------- header / footer ---------- */
  var NAV = [["learn", "Learn"], ["specs", "Specs"], ["tools", "Tools"], ["network", "Network"], ["build", "Build"]];
  function header() {
    return '<header class="hdr"><div class="wrap"><a class="brand" href="#home" aria-label="Sharenote home">' + logo() + '<span>SHARENOTE<small>Proof of energy</small></span></a>' +
      '<nav class="nav" id="nav" aria-label="Main">' + NAV.map(function (n) { return '<a href="#' + n[0] + '" data-nav="' + n[0] + '">' + n[1] + "</a>"; }).join("") + "</nav>" +
      '<div class="hdr-tools"><button class="icon-btn search-btn" id="searchBtn" type="button" aria-label="Search">' + I.search + '<span class="label">Search</span><span class="kbd">⌘K</span></button>' +
      '<a class="icon-btn" href="https://github.com/soprinter" target="_blank" rel="noopener" aria-label="GitHub">' + I.gh + "</a>" +
      '<button class="icon-btn" id="themeBtn" type="button" aria-label="Toggle theme"></button>' +
      '<button class="icon-btn menu-btn" id="menuBtn" type="button" aria-label="Menu" aria-expanded="false">' + I.menu + "</button></div></div></header>";
  }
  function footer() {
    return '<footer class="ftr"><div class="wrap"><div class="cols"><div class="stack"><a class="brand" href="#home">' + logo() + "<span>SHARENOTE</span></a>" +
      '<p class="muted" style="max-width:34ch">An open protocol for proof of energy. Specs are public domain drafts. Anyone can mint, verify and build.</p>' +
      '<p class="muted" style="font-size:12px">Prototype. Network data on this page is example data.</p></div>' +
      '<div><h4>Learn</h4><ul><li><a href="#learn-note">What is a Sharenote</a></li><li><a href="#learn-zbit">Z-bits</a></li><li><a href="#learn-bindings">Bindings</a></li><li><a href="#glossary">Glossary</a></li></ul></div>' +
      '<div><h4>Specs</h4><ul><li><a href="#specs">Spec map</a></li><li><a href="#snp-01">SNP-01 Proof of Energy</a></li><li><a href="#snp-09">SNP-09 Access</a></li><li><a href="#glossary-retired">Retired names</a></li></ul></div>' +
      '<div><h4>Tools</h4><ul><li><a href="#tool-mint">Mint a note</a></li><li><a href="#tool-planner">Planner</a></li><li><a href="#tool-access">402 playground</a></li><li><a href="#network">Network</a></li></ul></div>' +
      '<div><h4>Build</h4><ul><li><a href="#build">SDKs</a></li><li><a href="#build-agents">AI agents and MCP</a></li><li><a href="https://github.com/soprinter" target="_blank" rel="noopener">GitHub</a></li><li><a href="#build-llms">llms.txt</a></li></ul></div>' +
      "</div></div></footer>";
  }

  /* ---------- pages ---------- */
  function pageHead(crumbs, eyebrow, title, lede, extra) {
    return '<div class="page-head guil"><canvas class="gcv" data-g="waves" data-seed="3"></canvas><div class="wrap">' +
      (crumbs ? '<div class="crumbs">' + crumbs.map(function (c, i) { return (i ? "<span>/</span>" : "") + (c[1] ? '<a href="#' + c[1] + '">' + esc(c[0]) + "</a>" : "<span>" + esc(c[0]) + "</span>"); }).join("") + "</div>" : "") +
      '<div class="eyebrow ember" style="margin-top:14px">' + eyebrow + "</div><h1>" + title + "</h1>" + (lede ? '<p class="lede">' + lede + "</p>" : "") + (extra || "") + "</div></div>";
  }

  var WORKED = "534e34550100077368613235366479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798140000000004001644e1";

  function pHome() {
    var v = SN.verifyRecord(SN.unhex(WORKED));
    var lanes = [
      ["Miners", "Turn hashes you already make into notes.", ["Merged notes from every SHA-256d or scrypt share", "Solo blocks through a Node Service Provider", "Sell spare hashrate as notes"], "tool-planner", "Plan your output"],
      ["Buyers and issuers", "Pay for work, or reward it.", ["Buy notes when your phone can't mine", "Post a work offer on any Nostr event", "Pay out with a receipt anyone can audit"], "tool-offer", "Compose an offer"],
      ["Builders and agents", "Charge in work instead of API keys.", ["402 + Sharenote-Price on any HTTP API", "Pay-per-call MCP tools for AI agents", "SDKs in Go, TypeScript and Python"], "tool-access", "Try the 402 flow"],
      ["Operators", "Run the infrastructure.", ["Serve block templates as an NSP", "Sell notes as a mining provider", "Gate a relay on proof of work"], "network", "See the network"]
    ];
    return '<section class="hero guil"><canvas class="gcv" data-g="waves" data-seed="1"></canvas><div class="wrap hero-grid">' +
      '<div><div class="eyebrow ember">Sharenote Proposals · SNP-01 to 09</div><h1>Print proof<br>of <em>energy</em></h1>' +
      '<p class="lede">A Sharenote is a receipt for computation that anyone can check and no one has to issue. Its denomination is a Z-bit. Its value is the work it commits to, never a lucky hash.</p>' +
      '<div class="cta"><label class="sr" for="heroZ">Denomination</label><select class="in mono" id="heroZ" style="width:auto;min-height:44px;border-radius:999px">' +
      ["10z00", "12z00", "14z00", "16z00", "18z00", "20z00"].map(function (z) { return "<option" + (z === "16z00" ? " selected" : "") + ">" + z + "</option>"; }).join("") + '<option value="more">Bigger…</option></select>' +
      '<div class="zstep-wrap"><div class="zstep"><button type="button" aria-label="One bit smaller">−</button><div class="zv" aria-live="polite"><span class="zn">16z00</span></div><button type="button" aria-label="One bit bigger">+</button></div><p class="zjoke ok">Blink and it’s minted.</p></div>' +
      '<button class="btn primary" id="heroMint" type="button">Mint it in your browser</button><a class="btn" href="#snp-01">Read SNP-01</a></div>' +
      '<div class="mint-bar" id="heroBar"><span>Shown: the SNP-01 worked example, verified here just now.</span></div></div>' +
      '<div id="heroNote">' + noteCard({ zbit: "20z00", alg: "sha256d", identity: SN_FIX.G, binding: "unbound", verdict: v.verdict, H: SN.hex(v.hash), record: WORKED }) + "</div></div></section>" +

      historyOfValue() +

      '<section class="section"><div class="wrap"><div class="sec-h"><div><div class="eyebrow">Anatomy</div><h2>What is printed on a note</h2></div><a class="btn sm" href="#learn-note">Learn the details ' + I.arrow + "</a></div>" +
      '<div class="grid g2" style="align-items:start"><div class="panel"><div class="bytes" id="homeBytes"></div><div class="legend" style="margin-top:14px" id="homeLegend"></div></div>' +
      '<div class="grid g2">' +
      [["Z-bit 20z00", "The denomination. 20 bits means about a million expected hashes. It is fixed before mining starts."],
        ["Algorithm", "How the work is hashed: sha256d or scrypt, or their merged-mining forms."],
        ["Identity", "The key credited with the work. It sits inside the hash, so the credit cannot be moved."],
        ["Binding", "What the work is for: nothing, a post, an API epoch or an offer's template."],
        ["Nonce", "The only field that changes while mining."],
        ["No signature", "Anyone can mine a note for you. Relays check the work before they store it."]].map(function (x) {
        return '<div class="stat"><div class="k">' + x[0] + '</div><p style="font-size:13.5px">' + x[1] + "</p></div>";
      }).join("") + "</div></div></div></section>" +

      '<section class="section"><div class="wrap"><div class="sec-h"><div><div class="eyebrow">Who it is for</div><h2>Four ways in</h2></div></div><div class="lanes">' +
      lanes.map(function (l) { return '<div class="lane"><h3>' + l[0] + '</h3><p class="muted" style="font-size:14px">' + l[1] + "</p><ul>" + l[2].map(function (x) { return "<li>" + x + "</li>"; }).join("") + '</ul><a class="go" href="#' + l[3] + '">' + l[4] + " →</a></div>"; }).join("") +
      "</div></div></section>" +

      '<section class="section"><div class="wrap"><div class="sec-h"><div><div class="eyebrow">Try it</div><h2>Everything runs in your browser</h2></div><a class="btn sm" href="#tools">All tools ' + I.arrow + "</a></div>" +
      '<div class="grid g3">' + TOOL_META.slice(0, 6).map(toolTile).join("") + "</div></div></section>" +

      '<section class="section"><div class="wrap"><div class="sec-h"><div><div class="eyebrow">The protocol</div><h2>Nine proposals, one stack</h2></div><a class="btn sm" href="#specs">Spec map ' + I.arrow + "</a></div>" + stackMap() + "</div></section>" +

      '<section class="section"><div class="wrap grid g2" style="align-items:start"><div><div class="eyebrow">Questions</div><h2 style="font-size:var(--t-xl);font-weight:800;text-transform:uppercase;margin-top:8px">Asked often</h2>' +
      '<p class="muted" style="margin-top:12px;max-width:40ch">Short answers. Each one links to the proposal that settles it.</p></div><div class="faq">' +
      (window.SN_FAQ || []).map(function (f, i) { return "<details" + (i === 0 ? " open" : "") + "><summary>" + esc(f.q) + '</summary><div class="a">' + f.a + "</div></details>"; }).join("") + "</div></div></section>";
  }
  function mountHome() {
    mountHistory();
    renderBytes($("#homeBytes"), $("#homeLegend"), SN.unhex(WORKED));
    var btn = $("#heroMint"), bar = $("#heroBar"), sel = $("#heroZ");
    sel.addEventListener("change", function () { if (sel.value === "more") { window.SNPrefill.set("32z00"); location.href = toPath("tool-mint"); } });
    btn.addEventListener("click", function () {
      if (btn.dataset.busy) { window.SNMine.cancel(); return; }
      var zs = sel.value === "more" ? "16z00" : sel.value, zb = SN.parseZBit(zs), ident = SN.unhex(SN_FIX.G), bind = SN.utf8("hello from sharenote.xyz"), expect = SN.valueFloat(zb);
      btn.dataset.busy = "1"; btn.textContent = "Stop";
      $("#heroNote").innerHTML = noteCard({ zbit: zs, alg: "sha256d", identity: SN_FIX.G, binding: "“hello from sharenote.xyz”", verdict: "PENDING", foot: "mining…" }); paintGuil($("#heroNote"));
      bar.innerHTML = '<div class="meter"><i id="heroMeter"></i></div><span id="heroCount">0 hashes</span>';
      window.SNMine.start({ algorithm: "sha256d", identity: ident, zbit: zb, binding: bind }, function (p) {
        $("#heroMeter").style.width = Math.min(100, 50 * p.tries / expect) + "%";
        $("#heroCount").textContent = group(p.tries) + " hashes · " + fmtRate(p.rate);
      }, function (res) {
        delete btn.dataset.busy; btn.textContent = "Mint another";
        if (!res) { bar.innerHTML = "<span>Stopped.</span>"; return; }
        var v = SN.verifyRecord(res.record);
        $("#heroNote").innerHTML = noteCard({ zbit: zs, alg: "sha256d", identity: SN_FIX.G, binding: "“hello from sharenote.xyz”", verdict: v.verdict, H: SN.hex(v.hash), record: res.record, foot: group(res.tries) + " hashes tried · " + (res.ms / 1000).toFixed(1) + " s" });
        paintGuil($("#heroNote"));
        bar.innerHTML = '<span>Minted and verified in this tab. <a href="#tool-mint">Inspect it in the minter →</a></span>';
        window.SN_LAST = res;
      });
    });
  }

  var ERAS = [
    { n: "First Age", line: "The object was the value.", backed: "The thing itself: a goat, grain, salt", check: "Look at it, count it", issue: "Whoever raised or grew it", weak: "It spoils, and it won’t split into change" },
    { n: "Middle Age", line: "Authority stamped the value.", backed: "Metal, plus the stamp of whoever minted it", check: "Weigh it, bite it, trust the stamp", issue: "A ruler’s mint", weak: "Coins get clipped and quietly debased" },
    { n: "Yesterday", line: "Paper promised the value.", backed: "A promise to redeem it in metal", check: "Trust the issuer", issue: "Banks", weak: "Everyone asks to redeem at once" },
    { n: "Today", line: "Print says value. Nothing backs it.", backed: "Decree", check: "No one can", issue: "Central banks", weak: "More can always be printed" },
    { n: "Genesis", year: "3 Jan 2009", line: "A bank-bailout headline got timestamped, and coins became work.", backed: "Proof of work, and a newspaper headline", check: "Every full node, forever", issue: "A schedule no one can change, by an author no one can find", weak: "Only the winning hash counts. Every other share is thrown away", genesis: true },
    { n: "Now", line: "Work is the value.", backed: "Energy spent on hashes, committed before mining", check: "Anyone, with one hash", issue: "No one. Anyone can mint", weak: "Its price in money is up to whoever accepts it", now: true }
  ];
  var GENESIS_SVG = null;
  function genesisArt() {
    if (GENESIS_SVG) return GENESIS_SVG;
    var ink = "#5b4224", mid = "#8a6a3d", paper = "#ecd6aa", hi = "#f6e6c4", waves = "";
    for (var i = 0; i < 26; i++) { var y = 40 + i * 21; waves += '<path d="M40 ' + y + " Q 290 " + (y - 14) + " 500 " + y + " T 960 " + y + '" fill="none" stroke="' + mid + '" stroke-opacity=".18" stroke-width="1.2"/>'; }
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 601">' +
      '<rect width="1000" height="601" fill="' + paper + '"/>' + waves +
      '<rect x="18" y="18" width="964" height="565" rx="14" fill="none" stroke="' + ink + '" stroke-width="5"/>' +
      '<rect x="34" y="34" width="932" height="533" rx="8" fill="none" stroke="' + ink + '" stroke-width="1.6" stroke-dasharray="2 5"/>' +
      [[60, 60], [940, 60], [60, 541], [940, 541]].map(function (c) { return '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="16" fill="' + hi + '" stroke="' + ink + '" stroke-width="3"/><circle cx="' + c[0] + '" cy="' + c[1] + '" r="6" fill="' + ink + '"/>'; }).join("") +
      '<rect x="120" y="70" width="760" height="270" rx="6" fill="' + hi + '" stroke="' + ink + '" stroke-width="3"/>' +
      '<text x="500" y="128" text-anchor="middle" font-family="Georgia, Times New Roman, serif" font-size="54" font-weight="700" fill="' + ink + '" letter-spacing="2">THE TIMES</text>' +
      '<line x1="150" y1="146" x2="850" y2="146" stroke="' + ink + '" stroke-width="2"/><line x1="150" y1="152" x2="850" y2="152" stroke="' + ink + '" stroke-width="1"/>' +
      '<text x="500" y="176" text-anchor="middle" font-family="Georgia, serif" font-size="20" font-style="italic" fill="' + mid + '">Saturday, 03/Jan/2009</text>' +
      '<text x="500" y="238" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="700" fill="' + ink + '">Chancellor on brink of</text>' +
      '<text x="500" y="292" text-anchor="middle" font-family="Georgia, serif" font-size="44" font-weight="700" fill="' + ink + '">second bailout for banks</text>' +
      '<g transform="translate(500 452)"><circle r="96" fill="' + hi + '" stroke="' + ink + '" stroke-width="4"/><circle r="84" fill="none" stroke="' + ink + '" stroke-width="1.5" stroke-dasharray="3 4"/>' +
      '<text y="-22" text-anchor="middle" font-family="Georgia, serif" font-size="22" letter-spacing="3" fill="' + mid + '">BLOCK</text>' +
      '<text y="38" text-anchor="middle" font-family="Georgia, serif" font-size="74" font-weight="700" fill="' + ink + '">0</text></g>' +
      '<text x="160" y="440" font-family="Courier New, monospace" font-size="20" fill="' + ink + '">000000000019d6</text>' +
      '<text x="160" y="468" font-family="Courier New, monospace" font-size="20" fill="' + ink + '">…a8ce26f</text>' +
      '<text x="840" y="440" text-anchor="end" font-family="Georgia, serif" font-size="22" fill="' + ink + '">50 coins</text>' +
      '<text x="840" y="468" text-anchor="end" font-family="Georgia, serif" font-size="18" font-style="italic" fill="' + mid + '">unspendable</text>' +
      "</svg>";
    GENESIS_SVG = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    return GENESIS_SVG;
  }
  function historyOfValue() {
    var E = A.era || [], imgs = [E[0], E[1], E[2], E[3], genesisArt(), A.billSmall || A.bill], rows = [["backed", "Backed by"], ["check", "Checked by"], ["issue", "Issued by"], ["weak", "Weak spot"]], sel = 5;
    return '<section class="hov guil" id="history"><canvas class="gcv" data-g="waves" data-seed="5"></canvas>' +
      '<svg width="0" height="0" style="position:absolute" aria-hidden="true"><filter id="crumple" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".015" numOctaves="3" seed="9" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5" xChannelSelector="R" yChannelSelector="G"/></filter></svg>' +
      '<div class="wrap"><div class="sec-h"><div><div class="eyebrow sepia">The history of value</div><h2>What makes a note worth holding?</h2></div>' +
      '<p class="muted" style="max-width:40ch;font-size:14px">Every era printed notes. What changed is what stands behind them, and who can check it. Pick an era to compare.</p></div>' +
      '<div class="hov-rail" role="tablist" aria-label="Eras">' + ERAS.map(function (e, i) {
        return '<button type="button" class="era' + (e.now ? " now" : "") + (i === sel ? " sel" : "") + '" role="tab" aria-selected="' + (i === sel) + '" data-i="' + i + '">' +
          '<span class="era-img">' + (i < 4 ? '<picture><source type="image/avif" srcset="' + String(imgs[i]).replace(".webp", ".avif") + '">' : "") + '<img src="' + imgs[i] + '" alt="" width="560" height="357" loading="lazy" decoding="async" fetchpriority="low">' + (i < 4 ? "</picture>" : "") + "</span>" +
          '<span class="era-back" aria-hidden="true">' + rows.map(function (r) { return "<span><b>" + r[1] + "</b>" + esc(e[r[0]]) + "</span>"; }).join("") + '<span class="flip-hint">Tap to flip back</span></span>' +
          '<span class="era-axis"><span class="dot"></span><span class="era-n">' + (i + 1) + "</span></span>" +
          '<span class="lbl">' + e.n + (e.now ? " · Sharenote" : "") + (e.year ? ' <span class="yr">' + e.year + "</span>" : "") + '</span><span class="line">' + e.line + "</span></button>";
      }).join("") + "</div>" +
      '<div class="hov-dots">' + ERAS.map(function (e, i) { return '<button type="button" aria-label="Era ' + (i + 1) + '"></button>'; }).join("") + "</div>" +
      '<div class="scroll-x"><table class="ledger"><thead><tr><th scope="col"><span class="sr">Question</span></th>' + ERAS.map(function (e, i) { return '<th scope="col" data-i="' + i + '" class="' + (e.now ? "now " : "") + (i === sel ? "sel" : "") + '">' + e.n + "</th>"; }).join("") + "</tr></thead><tbody>" +
      rows.map(function (r) { return '<tr><th scope="row">' + r[1] + "</th>" + ERAS.map(function (e, i) { return '<td data-i="' + i + '" class="' + (e.now ? "now " : "") + (i === sel ? "sel" : "") + '">' + esc(e[r[0]]) + "</td>"; }).join("") + "</tr>"; }).join("") +
      '</tbody></table></div>' +
      '<p class="hov-foot"><span class="fn">*</span>On 3 January 2009 at 18:15:05 UTC, someone mined block 0, tucked a bank-bailout headline inside it, and walked off. The 50 coins in that block can never be spent: the first proof of work nobody gets to cash. The author signed as Satoshi Nakamoto. Initials: S.N. We checked. It is a coincidence. Probably.</p>' +
      '<div class="row" style="margin-top:18px"><a class="btn primary sm" href="#tool-mint">Print a note backed by work</a><a class="btn sm" href="#learn-note">How the check works</a></div></div></section>';
  }
  function mountHistory() {
    var root = $("#history"); if (!root) return;
    root.addEventListener("click", function (e) {
      var b = e.target.closest(".era"); if (!b) return; var i = b.dataset.i;
      $$("[data-i]", root).forEach(function (el) { el.classList.toggle("sel", el.dataset.i === i); });
      $$(".era", root).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      var cell = $('.ledger th[data-i="' + i + '"]', root), sc = cell && cell.closest(".scroll-x");
      if (sc && sc.scrollWidth > sc.clientWidth) sc.scrollTo({ left: cell.offsetLeft - 120, behavior: "smooth" });
    });
  }

  function renderBytes(el, legendEl, rec) {
    var spans = SN.recordSpans(rec), h = SN.hex(rec), out = "";
    spans.forEach(function (s) { if (s.to > s.from) out += '<span class="b-' + s.name + '" title="' + s.name + '">' + h.slice(s.from * 2, s.to * 2) + "</span>"; });
    el.innerHTML = out;
    if (legendEl) legendEl.innerHTML = [["tag", "SN4U tag"], ["version", "version"], ["algorithm", "algorithm"], ["identity", "identity"], ["z", "Z-bit"], ["binding", "binding"], ["nonce", "nonce"]].map(function (x) {
      return '<span><i class="b-' + x[0] + '" style="background:' + ({ tag: "color-mix(in oklab,var(--ink) 16%,transparent)", version: "color-mix(in oklab,var(--ink) 28%,transparent)", algorithm: "color-mix(in oklab,var(--warn) 22%,transparent)", identity: "color-mix(in oklab,var(--signal) 18%,transparent)", z: "color-mix(in oklab,var(--ember) 30%,transparent)", binding: "color-mix(in oklab,var(--ok) 20%,transparent)", nonce: "color-mix(in oklab,var(--ember) 14%,transparent)" })[x[0]] + '"></i>' + x[1] + "</span>";
    }).join("");
  }

  function toolTile(t) {
    return '<a class="tile" href="#tool-' + t.id + '"><div class="row" style="justify-content:space-between"><span class="kind">SNP-' + t.snp + '</span><span class="eyebrow">' + esc(t.aud) + "</span></div><h3>" + esc(t.t) + "</h3><p>" + esc(t.d) + "</p></a>";
  }
  function stackMap() {
    return '<div class="stackmap">' + LAYERS.map(function (L) {
      var items = SPECS().filter(function (s) { return s.layer === L[0]; });
      if (!items.length) return "";
      return '<div class="layer"><div class="lname">' + L[1] + '</div><div class="cells">' + items.map(function (s) {
        return '<a class="snp-cell" href="#snp-' + s.n + '"><span class="no">SNP-' + s.n + '</span><span class="nm">' + esc(s.title) + '</span><span class="ol">' + esc(s.oneLine) + "</span></a>";
      }).join("") + "</div></div>";
    }).reverse().join("") + "</div>";
  }

  /* Learn */
  var LEARN_ORDER = [["note", "What is a Sharenote"], ["zbit", "Z-bits"], ["bindings", "Bindings"], ["merged", "Merged mining"], ["access", "Paying with work"]];
  function learnSide(cur) {
    return '<aside class="side"><div class="grp"><div class="eyebrow" style="padding:0 10px 6px">Learn</div>' +
      LEARN_ORDER.map(function (l, i) { return '<a href="#learn-' + l[0] + '"' + (cur === l[0] ? ' aria-current="page"' : "") + '><span class="n">' + (i + 1) + "</span>" + l[1] + "</a>"; }).join("") +
      '<a href="#glossary"' + (cur === "glossary" ? ' aria-current="page"' : "") + '><span class="n">6</span>Glossary</a></div></aside>';
  }
  function pLearn() {
    var L = window.SN_LEARN || {};
    return pageHead([["Home", "home"], ["Learn"]], "Learn", "From hash to note", "Five short reads, in order. Each one ends with a tool you can try.") +
      '<div class="wrap section"><div class="grid g3">' + LEARN_ORDER.map(function (l, i) {
        var x = L[l[0]] || {};
        return '<a class="tile" href="#learn-' + l[0] + '"><span class="kind">' + (i + 1) + " of 5</span><h3>" + esc(x.title || l[1]) + "</h3><p>" + esc(x.lede || "") + "</p></a>";
      }).join("") + '<a class="tile" href="#glossary"><span class="kind">reference</span><h3>Glossary</h3><p>Every current term, plus the names and numbers that were retired.</p></a></div></div>';
  }
  var LEARN_TRY = { note: "mint", zbit: "zbit", bindings: "offer", merged: "merged", access: "access" };
  function pLearnArticle(key) {
    var x = (window.SN_LEARN || {})[key] || { title: key, lede: "", html: "<p>Content loading.</p>" };
    var idx = LEARN_ORDER.map(function (l) { return l[0]; }).indexOf(key), next = LEARN_ORDER[idx + 1], t = TOOL_META.filter(function (m) { return m.id === LEARN_TRY[key]; })[0];
    return '<div class="wrap docs no-toc">' + learnSide(key) + '<article class="prose"><div class="crumbs"><a href="#learn">Learn</a><span>/</span><span>' + (idx + 1) + " of 5</span></div>" +
      '<h1 style="font-size:var(--t-2xl);font-weight:800;margin-top:10px">' + esc(x.title) + '</h1><p class="lede">' + esc(x.lede) + "</p>" + x.html +
      (t ? '<div class="panel" style="margin-top:32px"><div class="eyebrow ember">Try it</div><div class="row" style="justify-content:space-between;margin-top:6px"><div><strong>' + esc(t.t) + '</strong><p class="muted" style="font-size:14px">' + esc(t.d) + '</p></div><a class="btn primary sm" href="#tool-' + t.id + '">Open</a></div></div>' : "") +
      (next ? '<p style="margin-top:24px"><a href="#learn-' + next[0] + '"><strong>Next: ' + next[1] + " →</strong></a></p>" : '<p style="margin-top:24px"><a href="#glossary"><strong>Next: Glossary →</strong></a></p>') +
      "</article></div>";
  }
  function pGlossary(anchor) {
    var G = window.SN_GLOSSARY || [], R = window.SN_RETIRED || [];
    return '<div class="wrap docs no-toc">' + learnSide("glossary") + '<article class="prose" style="max-width:none">' +
      '<div class="crumbs"><a href="#learn">Learn</a><span>/</span><span>Reference</span></div><h1 style="font-size:var(--t-2xl);font-weight:800;margin-top:10px">Glossary</h1>' +
      '<p class="lede">Current terms from SNP-01 to 09. Below them, the names and numbers that were retired, and what replaced each one.</p>' +
      '<label class="f" style="max-width:420px">Filter<input class="in" id="gq" type="search" placeholder="Z-bit, binding, receipt…" autocomplete="off"></label>' +
      '<div class="scroll-x"><table class="t" id="gtab"><thead><tr><th>Term</th><th>Meaning</th><th>Spec</th></tr></thead><tbody>' +
      G.map(function (g) { return '<tr data-q="' + esc((g.term + " " + g.def).toLowerCase()) + '"><td><strong>' + esc(g.term) + "</strong></td><td>" + esc(g.def) + '</td><td><a class="kind" href="#snp-' + g.snp + '">' + g.snp + "</a></td></tr>"; }).join("") +
      "</tbody></table></div>" +
      '<h2 id="retired">Retired names and numbers</h2><p>Old pages, posts and code may use these. Each row says what to use now.</p>' +
      '<div class="scroll-x"><table class="t"><thead><tr><th>Retired</th><th>Now</th><th>Note</th></tr></thead><tbody>' +
      R.map(function (r) { return '<tr><td><span class="mono" style="text-decoration:line-through;text-decoration-color:var(--danger)">' + esc(r.old) + '</span></td><td class="mono">' + esc(r.now) + "</td><td>" + esc(r.note) + "</td></tr>"; }).join("") +
      "</tbody></table></div></article></div>";
  }
  function mountGlossary(anchor) {
    var q = $("#gq"); if (q) q.addEventListener("input", function () { var v = q.value.toLowerCase().trim(); $$("#gtab tbody tr").forEach(function (tr) { tr.hidden = v && tr.dataset.q.indexOf(v) < 0; }); });
    if (anchor === "retired") { var el = $("#retired"); if (el) setTimeout(function () { el.scrollIntoView(); }, 30); }
  }

  /* Specs */
  function pSpecs() {
    var kinds = [];
    SPECS().forEach(function (s) { (s.kinds || []).forEach(function (k) { kinds.push({ k: k.kind, name: k.name, how: k.how, n: s.n }); }); });
    kinds.sort(function (a, b) { return a.k - b.k; });
    return pageHead([["Home", "home"], ["Specs"]], "Sharenote Proposals", "The spec map", "Nine proposals in one layered series. Each one depends only on lower numbers. All are drafts and may still change.",
      '<div class="row" style="margin-top:16px"><span class="chip draft"><span class="dot"></span>All draft</span><span class="chip">Vectors: Go = JS = Python</span><a class="chip sig" href="#glossary-retired">Looking for SNIP-00? See retired names</a></div>') +
      '<div class="wrap section">' + stackMap() + "</div>" +
      '<div class="wrap section"><div class="sec-h"><div><div class="eyebrow">Nostr kinds</div><h2>Kind index</h2></div></div><div class="scroll-x"><table class="t"><thead><tr><th class="n">Kind</th><th>Name</th><th>How it travels</th><th>Spec</th></tr></thead><tbody>' +
      kinds.map(function (k) { return '<tr><td class="n">' + k.k + "</td><td><strong>" + esc(k.name) + "</strong></td><td>" + esc(k.how) + '</td><td><a class="kind" href="#snp-' + k.n + '">SNP-' + k.n + "</a></td></tr>"; }).join("") +
      "</tbody></table></div></div>";
  }
  function pSpec(n) {
    var s = spec(n);
    if (!s) return p404();
    var all = SPECS(), i = all.indexOf(s), prev = all[i - 1], next = all[i + 1];
    var layerName = (LAYERS.filter(function (l) { return l[0] === s.layer; })[0] || [0, s.layer])[1];
    var tocItems = [["summary", "Summary"]].concat(s.kinds && s.kinds.length ? [["kinds", "Kinds and tags"]] : []).concat((s.sections || []).map(function (x) { return [x.id, x.h]; })).concat(s.example ? [["example", "Worked example"]] : []).concat([["try", "Try it"]]);
    return '<div class="wrap docs"><aside class="side"><div class="grp"><div class="eyebrow" style="padding:0 10px 6px">Proposals</div>' +
      all.map(function (x) { return '<a href="#snp-' + x.n + '"' + (x.n === n ? ' aria-current="page"' : "") + '><span class="n">' + x.n + "</span>" + esc(x.title) + "</a>"; }).join("") +
      '<a href="#specs"><span class="n">↑</span>Spec map</a></div></aside>' +
      '<article class="prose"><div class="crumbs"><a href="#specs">Specs</a><span>/</span><span>' + esc(layerName) + "</span></div>" +
      '<div class="row" style="margin-top:12px"><span class="kind" style="color:var(--ember);font-weight:700">SNP-' + s.n + '</span><span class="chip draft"><span class="dot"></span>' + esc(s.status || "draft") + "</span>" +
      (s.depends || []).map(function (d) { return '<a class="chip" href="#snp-' + d + '">needs ' + d + "</a>"; }).join("") + "</div>" +
      '<h1 style="font-size:var(--t-2xl);font-weight:800;text-transform:uppercase">' + esc(s.title) + '</h1><p class="lede">' + esc(s.oneLine) + "</p>" +
      '<h2 id="summary">Summary</h2>' + (s.summary || "") +
      (s.audience && s.audience.length ? '<p class="row">' + s.audience.map(function (a) { return '<span class="chip">' + esc(a) + "</span>"; }).join("") + "</p>" : "") +
      (s.kinds && s.kinds.length ? '<h2 id="kinds">Kinds and tags</h2><table><thead><tr><th>Kind</th><th>Name</th><th>How</th></tr></thead><tbody>' +
        s.kinds.map(function (k) { return '<tr><td class="mono">' + k.kind + "</td><td>" + esc(k.name) + "</td><td>" + esc(k.how) + "</td></tr>"; }).join("") + "</tbody></table>" +
        (s.tags && s.tags.length ? "<table><thead><tr><th>Tag</th><th>Meaning</th></tr></thead><tbody>" + s.tags.map(function (t) { return '<tr><td class="mono">' + esc(t.tag) + "</td><td>" + esc(t.meaning) + "</td></tr>"; }).join("") + "</tbody></table>" : "") : "") +
      (s.sections || []).map(function (x) { return '<h2 id="' + x.id + '">' + esc(x.h) + "</h2>" + x.html; }).join("") +
      (s.example ? '<h2 id="example">' + esc(s.example.title || "Worked example") + '</h2><div class="panel">' + s.example.html + "</div>" : "") +
      '<h2 id="try">Try it</h2><div class="grid g2">' + (s.tryIt || []).map(function (id) {
        if (id === "network") return '<a class="tile" href="#network"><span class="kind">live</span><h3>Network directory</h3><p>Providers, NSPs and Pay announcements on relays.</p></a>';
        var t = TOOL_META.filter(function (m) { return m.id === id; })[0]; return t ? toolTile(t) : "";
      }).join("") + "</div>" +
      '<div class="row" style="justify-content:space-between;margin-top:40px;border-top:1px solid var(--line);padding-top:16px">' +
      (prev ? '<a href="#snp-' + prev.n + '">← SNP-' + prev.n + " " + esc(prev.title) + "</a>" : "<span></span>") + (next ? '<a href="#snp-' + next.n + '">SNP-' + next.n + " " + esc(next.title) + " →</a>" : "") + "</div>" +
      '<p class="muted" style="font-size:12px;margin-top:16px">Rendered from <span class="mono">soprinter/snps/SNP-' + s.n + '.md</span>. The full text has every rule; this page condenses it.</p></article>' +
      '<nav class="toc" aria-label="On this page"><div class="eyebrow">On this page</div>' + tocItems.map(function (t) { return '<a href="#snp-' + n + '" data-jump="' + t[0] + '">' + esc(t[1]) + "</a>"; }).join("") + "</nav></div>";
  }
  function mountSpec() {
    $$("[data-jump]").forEach(function (a) { a.addEventListener("click", function (e) { e.preventDefault(); var el = document.getElementById(a.dataset.jump); if (el) el.scrollIntoView({ behavior: "smooth" }); }); });
  }

  /* Tools hub + tool pages */
  function pTools() {
    return pageHead([["Home", "home"], ["Tools"]], "Tools", "Work it out yourself", "Every tool runs the real Sharenote arithmetic in this tab. Nothing is sent anywhere. Network data shown here is example data.") +
      '<div class="wrap section">' + [["01", "The note"], ["02", "Mining"], ["04", "Paid work"], ["08", "Infrastructure and apps"]].map(function (g, gi, arr) {
        var from = Number(g[0]), to = gi + 1 < arr.length ? Number(arr[gi + 1][0]) : 99;
        var items = TOOL_META.filter(function (t) { var x = Number(t.snp); return x >= from && x < to; });
        return '<div style="margin-bottom:28px"><div class="eyebrow" style="margin-bottom:12px">' + g[1] + '</div><div class="grid g3">' + items.map(toolTile).join("") + "</div></div>";
      }).join("") + '<div class="eyebrow" style="margin-bottom:12px">Discovery</div><div class="grid g3"><a class="tile" href="#network"><span class="kind">SNP-03</span><h3>Network directory</h3><p>Who sells notes, who serves templates, where to pay. Read straight from relays.</p></a></div></div>';
  }
  function pTool(id) {
    var t = TOOL_META.filter(function (m) { return m.id === id; })[0], T = (window.TOOLS || {})[id];
    if (!t || !T) return p404();
    return pageHead([["Tools", "tools"], [t.t]], 'SNP-' + t.snp + ' · <a href="#snp-' + t.snp + '" style="color:inherit">read the spec</a>', esc(t.t), esc(t.d)) + '<div class="wrap section" id="toolRoot">' + T.html() + "</div>";
  }

  /* Build */
  function pBuild(anchor) {
    var sdks = [
      ["sharenotejs", "TypeScript", "5.6.0", "npm i @soprinter/sharenotejs", "import { snp01 } from \"@soprinter/sharenotejs\";\n\nconst zb = snp01.parseZBit(\"20z00\")!;\nconst t = snp01.target(zb);          // bigint\nconst v = snp01.verifyRecord(record);  // { verdict: \"ATTRIBUTED\", hash }"],
      ["go-sharenote", "Go", "3.6.0", "go get github.com/soprinter/go-sharenote", "import \"github.com/soprinter/go-sharenote/snp01\"\n\nzb, _ := snp01.ParseZBit(\"20z00\")\nt := snp01.Target(zb)\nv := snp01.VerifyRecord(rec, snp01.Registry)"],
      ["sharenotelib", "Python", "6.6.0", "pip install sharenotelib", "from sharenotelib import snp01\n\nzb = snp01.parse_zbit(\"20z00\")\nt = snp01.target(zb)\nv = snp01.verify_record(record)"]
    ];
    var eco = [["hashub", "The miner's hub: desktop and server. Merged mining, asks, offers, receipts, selling hashrate.", "in development"], ["nspd", "Node Service Provider daemon. Serves SNP-07 templates and submits blocks.", "planned"], ["z-chain", "The SNP-02 slot (0x534E) in the merged-mining tree. Not a separate chain.", "specified"], ["chains", "Node images and drivers for scrypt and SHA-256d parent chains.", "early"], ["snps", "The specs, with conformance vectors every SDK passes.", "draft"]];
    return pageHead([["Home", "home"], ["Build"]], "Build", "Build with Sharenote", "Three SDKs that pass the same vectors, a gRPC proto for templates, and a pay-per-call pattern for APIs and AI agents.") +
      '<div class="wrap section"><div class="grid g3">' + sdks.map(function (s, i) {
        return '<div class="panel stack"><div class="row" style="justify-content:space-between"><h3>' + s[0] + '</h3><span class="chip">' + s[1] + " · " + s[2] + '</span></div><pre class="code" style="cursor:copy" data-copy="' + esc(s[3]) + '" title="Click to copy"><span class="c">$</span> ' + esc(s[3]) + '</pre><pre class="code">' + esc(s[4]) + "</pre></div>";
      }).join("") + "</div></div>" +
      '<div class="wrap section" id="build-agents"><div class="grid g2" style="align-items:start"><div class="stack"><div class="eyebrow ember">AI agents and MCP</div><h2 style="font-size:var(--t-xl);font-weight:800;text-transform:uppercase">Let agents pay per call</h2>' +
      '<p class="muted">An MCP tool answers a call with a JSON-RPC 402 error that carries a price. The agent mines or buys notes bound to the server origin and the current epoch, then retries with the notes in <code>params._meta.sharenote</code>. No account, no API key.</p>' +
      '<div class="row"><a class="btn primary sm" href="#tool-access">Open the 402 playground</a><a class="btn sm" href="#snp-09">SNP-09</a></div></div>' +
      '<pre class="code"><span class="c">// MCP over HTTP, first call</span>\n{ "jsonrpc": "2.0", "id": 7,\n  "error": { "code": 402, "message": "work required",\n    "data": { "price": "g=sha256d;z=20z00;epoch=7;until=1763300000;period=3600;max=16" } } }\n\n<span class="c">// retry</span>\n{ "method": "tools/call", "params": { "name": "search",\n  "_meta": { "sharenote": ["<span class="e">534e3455…</span>"] } } }</pre></div></div>' +
      '<div class="wrap section"><div class="sec-h"><div><div class="eyebrow">Ecosystem</div><h2>What is being built</h2></div></div><div class="grid g3">' +
      eco.map(function (e) { return '<div class="card-dir"><div class="top"><h3>' + e[0] + '</h3><span class="chip ' + (e[2] === "planned" || e[2] === "early" ? "" : "draft") + '">' + e[2] + '</span></div><p class="muted" style="font-size:14px">' + e[1] + "</p></div>"; }).join("") + "</div></div>" +
      '<div class="wrap section" id="build-llms"><div class="grid g2"><div class="stack"><div class="eyebrow">For language models</div><h2 style="font-size:var(--t-xl);font-weight:800;text-transform:uppercase">llms.txt</h2><p class="muted">A short index at <code>/llms.txt</code> and the full spec text at <code>/llms-full.txt</code>, generated from the snps repo at build time so they never drift.</p></div>' +
      '<pre class="code"># Sharenote\n&gt; Proof of energy on Nostr. Specs SNP-01..09.\n\n## Specs\n- [SNP-01 Proof of Energy](https://sharenote.xyz/specs/01)\n- [SNP-09 Access Paid in Work](https://sharenote.xyz/specs/09)\n\n## SDKs\n- sharenotejs, go-sharenote, sharenotelib</pre></div></div>';
  }
  function mountBuild(anchor) {
    $$("[data-copy]").forEach(function (p) { p.addEventListener("click", function () { copy(p.dataset.copy); }); });
    if (anchor) { var el = document.getElementById(anchor); if (el) setTimeout(function () { el.scrollIntoView(); }, 30); }
  }

  function p404() {
    return '<div class="wrap section" style="text-align:center;padding-block:96px"><div style="max-width:420px;margin:0 auto;transform:rotate(-3deg)">' + noteCard({ zbit: "4z04", alg: "unknown", binding: "this page", verdict: "REJECT", foot: "check 1 failed: not found" }) +
      '</div><h1 style="font-size:var(--t-2xl);font-weight:900;text-transform:uppercase;margin-top:32px">No such page</h1><p class="muted" style="margin-top:8px">The link may use an old SNIP-era address.</p><div class="row" style="justify-content:center;margin-top:20px"><a class="btn primary" href="#home">Go home</a><a class="btn" href="#glossary-retired">Retired names</a></div></div>';
  }

  /* ---------- router ---------- */
  /* ---------- routes: prototype names -> real paths ---------- */
  function toPath(h) {
    var m;
    if (h === "home") return "/";
    if (h === "learn" || h === "specs" || h === "tools") return "/" + h + "/";
    if (h === "network" || h === "build") return "/" + h + "/";
    if (h === "glossary") return "/learn/glossary/";
    if (h === "glossary-retired") return "/learn/glossary/#retired";
    if (h === "build-agents" || h === "build-llms") return "/build/#" + h;
    if ((m = /^learn-(\w+)$/.exec(h)) && LEARN_ORDER.some(function (l) { return l[0] === m[1]; })) return "/learn/" + m[1] + "/";
    if ((m = /^snp-(\d\d)$/.exec(h))) return "/specs/" + m[1] + "/";
    if ((m = /^tool-(\w+)$/.exec(h)) && TOOL_META.some(function (t) { return t.id === m[1]; })) return "/tools/" + m[1] + "/";
    return null;
  }
  function fixLinks(html) { return html.replace(/href="#([a-z0-9-]+)"/g, function (all, n) { var p = toPath(n); return p ? 'href="' + p + '"' : all; }); }
  function pNetwork() {
    return pageHead([["Home", "home"], ["Network"]], "SNP-03 announcements", "The network", "Who sells notes, who serves block templates, and where each identity wants to be paid. Read from relays, verified in your browser.") + '<div class="wrap section" id="toolRoot">' + window.TOOLS.network.html() + "</div>";
  }
  /** pure: the page for a route name, its nav section and its title */
  function renderRoute(h) {
    var m, t;
    if (h === "home") return { html: pHome(), nav: "", title: "Sharenote · Proof of energy" };
    if (h === "learn") return { html: pLearn(), nav: "learn", title: "Learn" };
    if ((m = /^learn-(\w+)$/.exec(h)) && (window.SN_LEARN || {})[m[1]]) return { html: pLearnArticle(m[1]), nav: "learn", title: window.SN_LEARN[m[1]].title, description: window.SN_LEARN[m[1]].lede };
    if (h === "glossary") return { html: pGlossary(), nav: "learn", title: "Glossary", description: "Current Sharenote terms, and the retired names and numbers they replaced." };
    if (h === "specs") return { html: pSpecs(), nav: "specs", title: "Sharenote Proposals", description: "SNP-01 to 09: the layered spec series and the Nostr kind index." };
    if ((m = /^snp-(\d\d)$/.exec(h)) && (t = spec(m[1]))) return { html: pSpec(m[1]), nav: "specs", title: "SNP-" + t.n + " " + t.title, description: t.oneLine };
    if (h === "tools") return { html: pTools(), nav: "tools", title: "Tools", description: "Mint, convert, plan, audit and pay with work, all in your browser." };
    if ((m = /^tool-(\w+)$/.exec(h)) && (t = TOOL_META.filter(function (x) { return x.id === m[1]; })[0])) return { html: pTool(m[1]), nav: "tools", title: t.t, description: t.d };
    if (h === "network") return { html: pNetwork(), nav: "network", title: "Network", description: "Providers, NSPs and Pay announcements, and live notes." };
    if (h === "build") return { html: pBuild(), nav: "build", title: "Build", description: "SDKs, MCP for AI agents, and llms.txt." };
    return { html: p404(), nav: "", title: "Not found" };
  }
  function mountRoute(h) {
    var m;
    if (h === "home") mountHome();
    else if (h === "glossary") mountGlossary("");
    else if (/^snp-/.test(h)) mountSpec();
    else if ((m = /^tool-(\w+)$/.exec(h))) { var T = (window.TOOLS || {})[m[1]]; if (T && T.mount) T.mount($("#toolRoot")); }
    else if (h === "network") window.TOOLS.network.mount($("#toolRoot"));
    else if (h === "build") mountBuild("");
  }
  function routeNames() {
    return ["home", "learn", "glossary", "specs", "tools", "network", "build"]
      .concat(LEARN_ORDER.map(function (l) { return "learn-" + l[0]; }))
      .concat(SPECS().map(function (s) { return "snp-" + s.n; }))
      .concat(TOOL_META.map(function (t) { return "tool-" + t.id; }));
  }
  function navHtml(nav) { return header().replace('data-nav="' + nav + '"', 'data-nav="' + nav + '" aria-current="page"'); }

  /* ---------- search ---------- */
  function searchIndex() {
    var ix = [];
    ix.push({ ty: "page", t: "Home", d: "Print proof of energy", h: "home" }, { ty: "page", t: "Spec map", d: "SNP-01 to 09 and the kind index", h: "specs" }, { ty: "page", t: "Network", d: "Providers, NSPs, Pay announcements, live notes", h: "network" }, { ty: "page", t: "Build", d: "SDKs, MCP, llms.txt", h: "build" }, { ty: "page", t: "Retired names", d: "SNIP, old kinds and their replacements", h: "glossary-retired" });
    LEARN_ORDER.forEach(function (l) { var x = (window.SN_LEARN || {})[l[0]] || {}; ix.push({ ty: "learn", t: x.title || l[1], d: x.lede || "", h: "learn-" + l[0] }); });
    SPECS().forEach(function (s) { ix.push({ ty: "spec", t: "SNP-" + s.n + " " + s.title, d: s.oneLine, h: "snp-" + s.n, x: (s.kinds || []).map(function (k) { return k.kind; }).join(" ") }); });
    TOOL_META.forEach(function (t) { ix.push({ ty: "tool", t: t.t, d: t.d, h: "tool-" + t.id }); });
    (window.SN_GLOSSARY || []).forEach(function (g) { ix.push({ ty: "term", t: g.term, d: g.def, h: "glossary" }); });
    return ix;
  }
  var IX = null;
  function openSearch() {
    if (!IX) { fetch("/search.json").then(function (r) { return r.json(); }).then(function (d) { IX = d; openSearch(); }, function () { IX = []; openSearch(); }); return; }
    var ix = IX, sel = 0;
    var d = document.createElement("div"); d.className = "sdlg"; d.setAttribute("role", "dialog"); d.setAttribute("aria-label", "Search");
    d.innerHTML = '<div class="sbox"><input id="sIn" type="search" placeholder="Search specs, tools, terms, kinds…" autocomplete="off" aria-label="Search"><div class="sres" id="sRes"></div></div>';
    document.body.appendChild(d);
    var inp = $("#sIn", d), res = $("#sRes", d);
    function draw() {
      var q = inp.value.toLowerCase().trim(), hits = ix.filter(function (x) { return !q || (x.t + " " + x.d + " " + (x.x || "")).toLowerCase().indexOf(q) >= 0; }).slice(0, 12);
      sel = Math.min(sel, Math.max(0, hits.length - 1));
      res.innerHTML = hits.length ? hits.map(function (x, i) { return '<a href="' + (toPath(x.h) || "#" + x.h) + '"' + (i === sel ? ' class="on"' : "") + '><span class="ty">' + x.ty + '</span><span class="tt">' + esc(x.t) + '</span><span class="ds">' + esc(x.d) + "</span></a>"; }).join("") : '<div class="state">Nothing matches. Try a kind number like 1723, or a word like "receipt".</div>';
    }
    function close() { d.remove(); document.removeEventListener("keydown", key); }
    function key(e) {
      var links = $$("a", res);
      if (e.key === "Escape") close();
      else if (e.key === "ArrowDown") { sel = Math.min(links.length - 1, sel + 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
      else if (e.key === "Enter" && links[sel]) { location.href = links[sel].getAttribute("href"); close(); }
    }
    inp.addEventListener("input", function () { sel = 0; draw(); });
    d.addEventListener("click", function (e) { if (e.target === d || e.target.closest("a")) close(); });
    document.addEventListener("keydown", key);
    draw(); inp.focus();
  }

  /* ---------- theme ---------- */
  function isDark() { var t = document.documentElement.dataset.theme; return t ? t === "dark" : matchMedia("(prefers-color-scheme: dark)").matches; }
  function themeIcon() { $("#themeBtn").innerHTML = isDark() ? I.sun : I.moon; }
  function setTheme(t) { document.documentElement.dataset.theme = t; store.set("sn-theme", t); themeIcon(); paintGuil(document); }

  /* ---------- boot ---------- */
  function boot() {
    themeIcon();
    $("#themeBtn").addEventListener("click", function () { setTheme(isDark() ? "light" : "dark"); });
    $("#searchBtn").addEventListener("click", openSearch);
    $("#menuBtn").addEventListener("click", function () { var n = $("#nav"), o = n.classList.toggle("open"); this.setAttribute("aria-expanded", String(o)); });
    document.addEventListener("keydown", function (e) { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (!$(".sdlg")) openSearch(); } else if (e.key === "/" && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !$(".sdlg")) { e.preventDefault(); openSearch(); } });
    // links built at runtime in the prototype's "#name" form go to their real path
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented) return;
      var n = a.getAttribute("href").slice(1); if (!n || document.getElementById(n)) return;
      var p = toPath(n); if (p) { e.preventDefault(); location.href = p; }
    });
    window.addEventListener("hashchange", function () { var n = location.hash.slice(1); if (n && !document.getElementById(n)) { var p = toPath(n); if (p) location.replace(p); } });
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () { themeIcon(); paintGuil(document); });
    var rt; window.addEventListener("resize", function () { clearTimeout(rt); rt = setTimeout(function () { paintGuil(document); }, 150); });
    paintGuil(document);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { paintGuil(document); });
    var h = document.body.dataset.route || "home";
    mountRoute(h);
    document.dispatchEvent(new CustomEvent("sn:route", { detail: h }));
    if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("/sw.js").catch(function () {});
  }

  window.UI = { zfmt: zfmt, $: $, $$: $$, esc: esc, short: short, I: I, noteCard: noteCard, seal: seal, paintGuil: paintGuil, renderBytes: renderBytes, fmtHashes: fmtHashes, fmtRate: fmtRate, fmtDur: fmtDur, group: group, toast: toast, copy: copy, logo: logo };
  window.SNSite = { renderRoute: renderRoute, routeNames: routeNames, toPath: toPath, fixLinks: fixLinks, header: navHtml, footer: footer, searchIndex: searchIndex, WORKED: WORKED };
  if (typeof document !== "undefined" && document.body && document.body.dataset) {
    // boot after every module on the page has evaluated (shared chunks load before page-specific ones)
    var later = function () { setTimeout(boot, 0); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", later); else later();
  }
})();
