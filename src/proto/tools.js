/* tools.js — interactive tools. Each TOOLS[id] = { html(): string, mount(root) }. Uses window.UI lazily. */
(function () {
  "use strict";
  var U = function () { return window.UI; };
  var esc = function (s) { return U().esc(s); };
  // panels may live in a mobile sheet (outside root): fall back to the document; ids are unique
  var $ = function (s, r) { return (r || document).querySelector(s) || (r ? document.querySelector(s) : null); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var TOOLS = {};
  window.TOOLS = TOOLS;
  /* a Z-bit handed from one page to the next (pages are real page loads, so it survives in sessionStorage) */
  window.SNPrefill = {
    set: function (z) { window.SN_PREFILL_Z = z; try { sessionStorage.setItem("sn-prefill-z", z); } catch (e) {} },
    take: function () { var z = window.SN_PREFILL_Z; try { z = z || sessionStorage.getItem("sn-prefill-z"); sessionStorage.removeItem("sn-prefill-z"); } catch (e) {} window.SN_PREFILL_Z = null; return z || null; }
  };

  /* ---------- miner (Web Worker over the inlined zmath source) ---------- */
  var MINER_SRC = "self.onmessage=function(e){var d=e.data,rec=new Uint8Array(d.rec),tgt=SN.unhex(d.target),n=rec.length,t0=Date.now(),i=0;" +
    "function le(h){for(var k=0;k<32;k++){if(h[k]<tgt[k])return true;if(h[k]>tgt[k])return false;}return true;}" +
    "for(;;i++){rec[n-4]=(i>>>24)&255;rec[n-3]=(i>>>16)&255;rec[n-2]=(i>>>8)&255;rec[n-1]=i&255;var h=SN.sha256d(rec);" +
    "if(le(h)){self.postMessage({done:true,rec:rec.buffer,tries:i+1,ms:Date.now()-t0},[rec.buffer]);return;}" +
    "if((i&8191)===8191)self.postMessage({tries:i+1,ms:Date.now()-t0});}};";
  var worker = null, fallbackTimer = null;
  window.SNMine = {
    start: function (f, onProgress, onDone) {
      this.cancel();
      var rec = SN.encodeRecord({ algorithm: f.algorithm, identity: f.identity, zbit: f.zbit, binding: f.binding, nonce: new Uint8Array(4) });
      var tgt = SN.hex64(SN.target(f.zbit));
      function done(r) { onDone({ record: new Uint8Array(r.rec), tries: r.tries, ms: r.ms }); }
      try {
        var src = (window.ZMATH_SRC || (document.getElementById("zmath-src") || {}).textContent || "") + "\n" + MINER_SRC;
        worker = new Worker(URL.createObjectURL(new Blob([src], { type: "text/javascript" })));
        worker.onmessage = function (e) { var d = e.data; if (d.done) { worker.terminate(); worker = null; done(d); } else onProgress({ tries: d.tries, rate: d.tries / Math.max(.001, d.ms / 1000) }); };
        worker.onerror = function () { worker = null; main(); };
        worker.postMessage({ rec: rec.buffer.slice(0), target: tgt });
      } catch (e) { main(); }
      function main() {
        var n = rec.length, t = SN.unhex(tgt), i = 0, t0 = Date.now();
        (function chunk() {
          for (var k = 0; k < 4000; k++, i++) {
            rec[n - 4] = (i >>> 24) & 255; rec[n - 3] = (i >>> 16) & 255; rec[n - 2] = (i >>> 8) & 255; rec[n - 1] = i & 255;
            var h = SN.sha256d(rec), ok = true;
            for (var j = 0; j < 32; j++) { if (h[j] < t[j]) break; if (h[j] > t[j]) { ok = false; break; } }
            if (ok) { fallbackTimer = null; done({ rec: rec.slice().buffer, tries: i + 1, ms: Date.now() - t0 }); return; }
          }
          onProgress({ tries: i, rate: i / Math.max(.001, (Date.now() - t0) / 1000) });
          fallbackTimer = setTimeout(chunk, 0);
        })();
      }
      this._onDone = onDone;
    },
    cancel: function () {
      var was = !!(worker || fallbackTimer);
      if (worker) { worker.terminate(); worker = null; }
      if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null; }
      if (was && this._onDone) { var cb = this._onDone; this._onDone = null; cb(null); }
    }
  };
  function mineOnce(f, onP) { return new Promise(function (res) { window.SNMine.start(f, onP || function () {}, res); }); }

  /* small helpers */
  function zOpts(from, to, sel) { var o = ""; for (var z = from; z <= to; z++) o += '<option value="' + z + 'z00"' + (z + "z00" === sel ? " selected" : "") + ">" + z + "z00</option>"; return o; }
  function vline(kind, text) { return '<div class="verdict-line ' + kind + '">' + (kind === "ok" ? U().I.check : kind === "bad" ? U().I.x : U().I.warn) + "<span>" + text + "</span></div>"; }
  function stat(k, v, sm) { return '<div class="stat"><div class="k">' + k + '</div><div class="v' + (sm ? " sm" : "") + '">' + v + "</div></div>"; }
  function bigDec(v) { return U().group(v.toString()); }
  function seg(id, items, cur) { return '<div class="seg" id="' + id + '" role="group">' + items.map(function (x) { return '<button type="button" data-v="' + x[0] + '" aria-pressed="' + (x[0] === cur) + '">' + x[1] + "</button>"; }).join("") + "</div>"; }
  function onSeg(root, id, fn) { var s = $("#" + id, root); s.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; $$("button", s).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); }); fn(b.dataset.v); }); return function () { return $("button[aria-pressed=true]", s).dataset.v; }; }
  function sha256Hex(s) { return SN.hex(SN.sha256(SN.utf8(s))); }

  /* =====================================================================
   * SNP-01 Z-bit converter
   * ===================================================================== */
  TOOLS.zbit = {
    html: function () {
      return '<div class="tool"><div class="panel stack"><label class="f">Z-bit<input class="in mono" id="zIn" value="20z00" autocomplete="off" spellcheck="false"><span class="hint">Write it as <code>NNzcc</code>: whole bits, a lowercase z, two centi-bit digits.</span></label>' +
        '<label class="f">Whole bits <span class="hint" id="zLbl"></span><input type="range" id="zR" min="1" max="96" value="20"></label>' +
        '<label class="f">Centi-bits<input type="range" id="cR" min="0" max="99" value="0"></label>' +
        '<label class="f">Or paste a target (hex)<input class="in mono" id="tIn" placeholder="0000100000…" autocomplete="off" spellcheck="false"><span class="hint">Reads it back to the Z-bit it clears, the SNP-01 way.</span></label></div>' +
        '<div class="out"><div id="zNote"></div><div class="grid g2" id="zStats"></div><div class="panel"><h3>Time to mint one note</h3><p class="muted" style="font-size:14px;margin-top:4px">Expected time at a steady hashrate. Real time varies a lot for a single note.</p><div class="scroll-x" style="margin-top:12px"><table class="t" id="zTimes"></table></div></div></div></div>';
    },
    mount: function (root) {
      var zIn = $("#zIn", root), zR = $("#zR", root), cR = $("#cR", root), tIn = $("#tIn", root);
      function draw(zb) {
        var T = SN.target(zb), W = SN.weight(zb), D = SN.value(zb), Df = SN.valueFloat(zb), f = SN.formatZBit(zb);
        $("#zNote", root).innerHTML = U().noteCard({ zbit: f, verdict: "PENDING", foot: "≈ " + U().fmtHashes(Df) + " hashes · not minted yet", binding: "—" });
        U().paintGuil($("#zNote", root));
        $("#zStats", root).innerHTML = stat("Target T", SN.hex64(T), true) + stat("Expected hashes D = 2²⁵⁶ / T", bigDec(D) + '<div class="hint" style="font-family:var(--f-sans)">≈ 2^' + SN.zReal(zb).toFixed(2) + " · " + U().fmtHashes(Df) + "</div>", true) +
          stat("Weight w = ⌊2³⁸⁴ / T⌋", bigDec(W), true) + stat("Doubling", "+1 whole bit doubles the work. +1 centi-bit adds about 0.7%.", true);
        var rigs = [["Laptop CPU (this demo)", 2e6], ["Gaming GPU", 2e9], ["One ASIC (S21-class)", 2e14], ["A 1 EH/s pool", 1e18]];
        $("#zTimes", root).innerHTML = "<thead><tr><th>Hardware</th><th class=n>Hashrate</th><th class=n>Per note</th><th class=n>Notes per hour</th></tr></thead><tbody>" +
          rigs.map(function (r) { var s = Df / r[1]; return "<tr><td>" + r[0] + '</td><td class="n">' + U().fmtRate(r[1]) + '</td><td class="n">' + U().fmtDur(s) + '</td><td class="n">' + (3600 / s >= 1e6 ? (3600 / s).toExponential(1) : U().group(Math.floor(3600 / s))) + "</td></tr>"; }).join("") + "</tbody>";
        $("#zLbl", root).textContent = zb.z;
      }
      function fromText() { var zb = SN.parseZBit(zIn.value); zIn.setAttribute("aria-invalid", String(!zb)); if (zb) { zR.value = Math.min(96, zb.z); cR.value = zb.cc; draw(zb); } }
      function fromRange() { var zb = { z: +zR.value, cc: +cR.value }; zIn.value = SN.formatZBit(zb); draw(zb); }
      zIn.addEventListener("input", fromText); zR.addEventListener("input", fromRange); cR.addEventListener("input", fromRange);
      tIn.addEventListener("input", function () { try { var t = BigInt("0x" + tIn.value.replace(/[^0-9a-f]/gi, "")); var zb = SN.zbitOfTarget(t); zIn.value = SN.formatZBit(zb); fromText(); } catch (e) {} });
      fromText();
    }
  };

  /* =====================================================================
   * SNP-01 Minter + inspector
   * ===================================================================== */
  var mintState = null;
  var WORKED_REC = "534e34550100077368613235366479be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798140000000004001644e1";
  /* the note the minter opens with (server-rendered, so nothing moves when the page wakes up) */
  function mintStartCard() { var rec = SN.unhex(WORKED_REC), v = SN.verifyRecord(rec); return U().noteCard({ zbit: "20z00", alg: "sha256d", identity: SN_FIX.G, binding: "unbound", verdict: v.verdict, H: SN.hex(v.hash), record: rec }); }

  /* ---------- how fast is this tab, and how absurd is the ask ---------- */
  var LAST_RATE = 0;
  function rateHere() {
    if (LAST_RATE > 0) return LAST_RATE;
    var b = new Uint8Array(110), t0 = performance.now(), n = 0;
    while (performance.now() - t0 < 25) { b[0] = n & 255; b[1] = n >> 8 & 255; SN.sha256d(b); n++; }
    LAST_RATE = Math.max(1e4, n / ((performance.now() - t0) / 1000) * 1.3); // the worker runs a little faster than the main thread
    return LAST_RATE;
  }
  var YEAR = 31557600, NET = 8e20; // ~800 EH/s, a Bitcoin-network-sized hashrate
  function fmtYears(y) {
    if (y < 1e3) return U().group(Math.round(y)) + " years";
    if (y < 1e6) return U().group(Math.round(y / 1e3)) + " thousand years";
    if (y < 1e9) return (y / 1e6).toFixed(y < 1e7 ? 1 : 0) + " million years";
    if (y < 1e12) return (y / 1e9).toFixed(1) + " billion years";
    var e = Math.floor(Math.log10(y)); return (y / Math.pow(10, e)).toFixed(1) + " × 10^" + e + " years";
  }
  function joke(s, zb, rate) {
    var f = SN.formatZBit(zb), y = s / YEAR, net = SN.valueFloat(zb) / NET, alts = "", cls, msg, btn = "Mint note";
    var netTxt = net < 1 ? "under a second" : net < 3600 ? U().fmtDur(net) : net / YEAR < 1 ? U().fmtDur(net) : fmtYears(net / YEAR);
    if (s < 20) { cls = "ok"; msg = "About " + U().fmtDur(s) + " in this tab. Blink and it’s minted."; }
    else if (s < 300) { cls = "warn"; msg = "About " + U().fmtDur(s) + ". Long enough to make tea, short enough to watch."; btn = "Mint it, I have tea"; }
    else if (s < 3600) { cls = "warn"; msg = "About " + U().fmtDur(s) + ". Your laptop fan will start narrating."; btn = "Mint anyway"; }
    else if (s < 86400) { cls = "warn"; msg = "About " + U().fmtDur(s) + " of a very warm laptop. Doable, if you trust your battery and your patience."; btn = "Mint anyway (brave)"; }
    else if (y < 1) { cls = "warn"; msg = "About " + U().fmtDur(s) + ". Keep this tab open, the charger in, and your expectations calm."; btn = "Start anyway (heroic)"; }
    else if (y < 80) { cls = "warn"; msg = "About " + fmtYears(y) + ". Put the tab in your will. Your grandchildren can collect the note."; btn = "Start anyway (for the heirs)"; }
    else if (y < 5000) { cls = "warn"; msg = "About " + fmtYears(y) + ". The pyramids are younger than this to-do item."; btn = "Start anyway (pharaoh mode)"; }
    else if (y < 3e5) { cls = "warn"; msg = "About " + fmtYears(y) + ". Ostriches may learn to fly first. They have the time."; btn = "Start anyway (ostrich patience)"; }
    else if (y < 4.5e9) { cls = "warn"; msg = "About " + fmtYears(y) + ". Longer than humans have existed. Geology will finish before you do."; btn = "Start anyway (geologic)"; }
    else if (y < 1.38e10) { cls = "warn"; msg = "About " + fmtYears(y) + ". The Sun burns out first. Bring a sweater."; btn = "Start anyway (solar)"; }
    else if (y < 1e20) { cls = "warn"; msg = "About " + (y / 1.38e10 < 1e6 ? U().group(Math.round(y / 1.38e10)) : (y / 1.38e10).toExponential(1)) + " times the age of the universe. The stars go out before your note does."; btn = "Start anyway (cosmic)"; }
    else { cls = "warn"; msg = "About " + fmtYears(y) + ". Physics has no plans that far ahead. Neither should your browser tab."; btn = "Start anyway (why not)"; }
    if (s >= 300) {
      var k = Math.max(1, Math.ceil(Math.log2(s / 10))), small = { z: Math.max(1, zb.z - k), cc: zb.cc }, count = Math.pow(2, Math.min(k, zb.z - 1));
      alts += '<div class="muted"><strong style="color:var(--ink)">Smarter ways to get ' + f + "</strong></div><ul style=\"margin:0;padding-left:18px;display:grid;gap:4px\">" +
        '<li><a href="#tool-buy" data-buy="' + f + '">Buy it from a mining provider</a>. They have ASICs and no sense of humour.</li>' +
        (count <= 1e6 ? "<li>Mint " + U().group(count) + " × <code>" + SN.formatZBit(small) + "</code> about 10 s each, then <a href=\"#tool-sum\">add them</a>. Weights add up to exactly <code>" + f + "</code>.</li>" : "<li>Minting small notes and adding them would take 2^" + k + " notes. We checked. No.</li>") +
        (zb.z >= 28 ? '<li>Already mining a chain? <a href="#tool-merged">Merged mining</a> turns your shares into notes this size for free.</li>' : "") +
        "<li>A Bitcoin-network-sized miner (~800 EH/s) would need " + netTxt + ".</li></ul>";
    }
    return { cls: cls, msg: msg, btn: btn, alts: alts };
  }
  function buzz() { try { if (navigator.vibrate && !matchMedia("(prefers-reduced-motion: reduce)").matches) navigator.vibrate([16, 40, 16]); } catch (e) {} }
  window.SNJoke = function (zb) { var r = rateHere(); return joke(SN.valueFloat(zb) / r, zb, r); };
  var MINING_QUIPS = [
    function (ms, s) { return "Still mining. Expected finish: " + (s > YEAR ? fmtYears((s - ms / 1000) / YEAR) : U().fmtDur(Math.max(1, s - ms / 1000))) + " from now. Give or take luck."; },
    function () { return "Each hash is a lottery ticket. This one wasn’t it either."; },
    function () { return "The note will be worth exactly its Z-bit. Getting lucky early earns no bonus, only bragging rights."; },
    function () { return "Tip: stopping is free. The work done so far stays a fine warm-up."; },
    function (ms) { return U().fmtDur(ms / 1000) + " in. Your fan has entered its spoken-word era."; }
  ];
  TOOLS.mint = {
    html: function () {
      return '<div class="tool"><div class="panel stack">' +
        '<label class="f">Denomination<input class="in mono" id="mZ" value="16z00" autocomplete="off" spellcheck="false"><span class="hint">Any Z-bit from 1z00 to 255z99. Each whole bit doubles the work.</span></label>' +
        '<input type="range" id="mZr" min="1" max="96" value="16" aria-label="Whole bits">' +
        '<div class="row" style="gap:6px">' + ["12z00", "16z00", "20z00", "24z00", "32z00", "48z00", "64z00", "128z00", "255z99"].map(function (z) { return '<button class="btn sm" type="button" data-zq="' + z + '">' + z + "</button>"; }).join("") + "</div>" +
        '<div id="mFun">' + vline("ok", "Blink and it’s minted.") + '</div>' +
        '<label class="f">Algorithm<select class="in mono" id="mA"><option>sha256d</option><option disabled>scrypt (use an SDK)</option></select></label>' +
        '<label class="f">Credited identity (x-only hex)<input class="in mono" id="mI" spellcheck="false" autocomplete="off"><span class="hint">Default: the secp256k1 generator, used by the spec’s worked example. A real minter uses your npub.</span></label>' +
        '<div class="f">Binding' + seg("mB", [["none", "Unbound"], ["text", "Text"], ["event", "Event id"], ["epoch", "API epoch"]], "none") + '</div>' +
        '<input class="in mono" id="mBV" placeholder="" hidden autocomplete="off" spellcheck="false">' +
        '<div class="row"><button class="btn primary" id="mGo" type="button" data-sticky data-sticky-status="#mP">Mint note</button><span class="mono muted" id="mP" style="font-size:12px"></span></div>' +
        '<div class="meter"><i id="mM"></i></div></div>' +
        '<div class="out"><div id="mNote">' + mintStartCard() + '</div><div class="panel stack" data-sheet="SN4U record"><div class="row" style="justify-content:space-between"><h3>SN4U record</h3><span class="muted mono" id="mLen" style="font-size:12px"></span></div><div class="bytes" id="mBytes"></div><div class="legend" id="mLeg"></div></div>' +
        '<div class="panel stack" data-sheet="Tamper with it"><h3>Tamper with it</h3><p class="muted" style="font-size:14px">Change one thing and verify again. A note is worth exactly its Z-bit, and the credit can’t be moved.</p>' +
        '<div class="row"><button class="btn sm" data-t="id" type="button">Swap the identity</button><button class="btn sm" data-t="z" type="button">Claim 30z00</button><button class="btn sm" data-t="nonce" type="button">Change the nonce</button><button class="btn sm" data-t="tag" type="button">Break the tag</button><button class="btn sm ghost" data-t="reset" type="button">Restore</button></div><div id="mV"></div></div>' +
        '<div class="panel stack" data-sheet="kind:1723 event"><div class="row" style="justify-content:space-between"><h3>kind:1723 event</h3><div class="row" style="gap:6px"><button class="btn sm" id="mShare" type="button">Share</button><button class="btn sm" id="mCopy" type="button">Copy JSON</button></div></div><pre class="code" id="mEv"></pre><p class="muted" style="font-size:12px">Unsigned. The pubkey is the identity. A relay stores it only after checking the work.</p></div></div></div>';
    },
    mount: function (root) {
      var I = $("#mI", root), bv = $("#mBV", root); I.value = SN_FIX.G;
      var bindMode = onSeg(root, "mB", function (v) {
        bv.hidden = v === "none";
        bv.value = v === "text" ? "hello from sharenote.xyz" : v === "event" ? SN_FIX.hexid() : v === "epoch" ? "https://api.example epoch 7" : "";
        bv.placeholder = v === "epoch" ? "origin epoch N" : "";
      });
      function binding() {
        var m = bindMode(), v = bv.value.trim();
        if (m === "text") return { b: SN.utf8(v), label: "“" + v + "”" };
        if (m === "event") return { b: SN.unhex(v.padEnd(64, "0").slice(0, 64)), label: "event " + U().short(v, 8, 4) };
        if (m === "epoch") { var mm = /^(\S+)\s+epoch\s+(\d+)$/.exec(v) || [0, "https://api.example", "7"]; var ep = +mm[2]; return { b: SN.concat([SN.sha256(SN.utf8(mm[1])), Uint8Array.of(ep >>> 24 & 255, ep >>> 16 & 255, ep >>> 8 & 255, ep & 255)]), label: mm[1] + " · epoch " + ep }; }
        return { b: new Uint8Array(0), label: "unbound" };
      }
      function show(rec, label) {
        mintState = mintState || {}; mintState.rec = rec; mintState.label = label;
        var v = SN.verifyRecord(rec), f = v.fields || {};
        $("#mNote", root).innerHTML = U().noteCard({ zbit: f.zbit ? SN.formatZBit(f.zbit) : "?z??", alg: f.algorithm || "?", identity: f.identity ? SN.hex(f.identity) : "", binding: label, verdict: v.verdict, H: v.hash ? SN.hex(v.hash) : "", record: rec, check: v.check, reason: v.reason });
        U().paintGuil($("#mNote", root));
        U().renderBytes($("#mBytes", root), $("#mLeg", root), rec);
        $("#mLen", root).textContent = rec.length + " bytes";
        $("#mV", root).innerHTML = v.verdict === "ATTRIBUTED" ? vline("ok", "ATTRIBUTED · H = " + U().short(SN.hex(v.hash), 16, 8) + " ≤ T(" + SN.formatZBit(f.zbit) + ")")
          : vline("bad", v.verdict + " at check " + v.check + " · " + ({ work: "the hash does not clear the committed target", tag: "the record does not start with SN4U", version: "unknown version", truncated: "bytes missing" }[v.reason] || v.reason));
        var hexr = SN.hex(rec), tags = [["g", f.algorithm || ""], ["z", f.zbit ? SN.formatZBit(f.zbit) : ""]].concat(f.binding && f.binding.length ? [["b", SN.hex(f.binding)]] : []);
        var ev = { kind: 1723, pubkey: f.identity ? SN.hex(f.identity) : "", created_at: Math.floor(Date.now() / 1000), tags: tags, content: hexr };
        $("#mEv", root).textContent = JSON.stringify(ev, null, 2);
        mintState.ev = ev;
      }
      $("#mCopy", root).addEventListener("click", function () { if (mintState && mintState.ev) U().copy(JSON.stringify(mintState.ev)); });
      $("#mShare", root).addEventListener("click", function () {
        if (!mintState || !mintState.ev) return; var text = JSON.stringify(mintState.ev);
        if (navigator.share) navigator.share({ title: "Sharenote " + mintState.ev.tags[1][1], text: text }).catch(function () { U().copy(text); }); else U().copy(text);
      });
      $('[data-sheet="Tamper with it"]', root).addEventListener("click", function (e) {
        var b = e.target.closest("[data-t]"); if (!b || !mintState || !mintState.orig) return;
        var r = mintState.orig.slice(), t = b.dataset.t, al = (r[5] << 8) | r[6], idAt = 7 + al;
        if (t === "id") r[idAt + 5] ^= 0x5a;
        if (t === "z") { r[idAt + 32] = 30; r[idAt + 33] = 0; }
        if (t === "nonce") r[r.length - 1] ^= 1;
        if (t === "tag") r[2] = 0x4f;
        show(r, mintState.label);
      });
      var go = $("#mGo", root), zIn = $("#mZ", root), zR = $("#mZr", root), quipT = null, previewOn = false;
      var pre = window.SNPrefill.take(); if (pre && SN.parseZBit(pre)) zIn.value = pre;
      function curZ() { return SN.parseZBit(zIn.value); }
      function updateFun() {
        var zb = curZ(); zIn.setAttribute("aria-invalid", String(!zb));
        if (!zb) { $("#mFun", root).innerHTML = vline("warn", "Write it as <code>NNzcc</code>, from <code>1z00</code> to <code>255z99</code>. Lowercase z, two digits after it."); go.disabled = true; go.textContent = "Mint note"; return; }
        go.disabled = false; zR.value = Math.min(96, zb.z);
        var r = rateHere(), s = SN.valueFloat(zb) / r, J = joke(s, zb, r);
        $("#mFun", root).innerHTML = '<div class="verdict-line ' + J.cls + '" style="align-items:start">' + (J.cls === "ok" ? U().I.check : U().I.warn) + '<span style="font-weight:600">' + J.msg + "</span></div>" + (J.alts ? '<div class="stack" style="gap:8px;font-size:13.5px">' + J.alts + "</div>" : "");
        go.textContent = J.btn;
        if (!go.dataset.busy && previewOn) { $("#mNote", root).innerHTML = U().noteCard({ zbit: SN.formatZBit(zb), identity: I.value, binding: "your choice", verdict: "PENDING", foot: "≈ " + U().fmtHashes(SN.valueFloat(zb)) + " hashes · not minted yet" }); U().paintGuil($("#mNote", root)); }
        previewOn = true;
        $$("[data-buy]", root).forEach(function (a) { a.addEventListener("click", function () { window.SNPrefill.set(a.dataset.buy); }); });
      }
      zIn.addEventListener("input", updateFun);
      zR.addEventListener("input", function () { var zb = curZ() || { cc: 0 }; zIn.value = zR.value + "z" + String(zb.cc).padStart(2, "0"); updateFun(); });
      $$("[data-zq]", root).forEach(function (b) { b.addEventListener("click", function () { zIn.value = b.dataset.zq; updateFun(); }); });
      go.addEventListener("click", function () {
        if (go.dataset.busy) { window.SNMine.cancel(); return; }
        var zb = curZ(), idh = I.value.replace(/[^0-9a-f]/gi, "").toLowerCase();
        if (!zb) return;
        if (idh.length !== 64) { $("#mV", root).innerHTML = vline("bad", "The identity must be 64 hex characters (32 bytes)."); return; }
        var bd = binding(), expect = SN.valueFloat(zb), t0 = Date.now(), sExp = expect / rateHere();
        go.dataset.busy = "1"; go.textContent = "Stop";
        $("#mNote", root).innerHTML = U().noteCard({ zbit: SN.formatZBit(zb), identity: idh, binding: bd.label, verdict: "PENDING", foot: "mining… expect about " + U().fmtHashes(expect) + " hashes" }); U().paintGuil($("#mNote", root));
        if (sExp > 30) { var qi = 0; $("#mFun", root).insertAdjacentHTML("beforeend", '<p class="hint" id="mQuip" style="font-style:italic"></p>'); clearInterval(quipT); quipT = setInterval(function () { var q = $("#mQuip", root); if (!q) { clearInterval(quipT); return; } q.textContent = MINING_QUIPS[qi++ % MINING_QUIPS.length](Date.now() - t0, sExp); }, 4000); }
        window.SNMine.start({ algorithm: "sha256d", identity: SN.unhex(idh), zbit: zb, binding: bd.b }, function (p) {
          LAST_RATE = p.rate;
          var pct = 100 * p.tries / expect;
          $("#mM", root).style.width = Math.min(100, pct / 2) + "%";
          $("#mP", root).textContent = U().group(p.tries) + " hashes · " + U().fmtRate(p.rate) + (pct < 0.01 ? " · " + pct.toExponential(1) + "% of the way, statistically" : "");
        }, function (res) {
          clearInterval(quipT); var q = $("#mQuip", root); if (q) q.remove();
          delete go.dataset.busy; go.textContent = "Mint another";
          if (!res) updateFun();
          if (!res) { $("#mP", root).textContent = "Stopped"; return; }
          $("#mM", root).style.width = "100%";
          $("#mP", root).textContent = U().group(res.tries) + " hashes in " + (res.ms / 1000).toFixed(2) + " s";
          mintState = { orig: res.record.slice() }; show(res.record, bd.label);
          if (SN.verifyRecord(res.record).verdict === "ATTRIBUTED") buzz();
        });
      });
      updateFun();
      var start = window.SN_LAST ? window.SN_LAST.record : SN.unhex(WORKED_REC);
      mintState = { orig: start.slice() }; show(start, window.SN_LAST ? "“hello from sharenote.xyz”" : "unbound");
    }
  };

  /* =====================================================================
   * SNP-01 Add & split
   * ===================================================================== */
  var SUM_PRESETS = {
    basic: { reward: 10, rows: [["Alice", "1z00"], ["Bob", "2z00"]] },
    snp04: { reward: 1000, rows: [["Alice", "8z00"], ["Alice", "9z00"], ["Bob", "10z00"]] },
    snp05: { reward: 1000, rows: [["Alice", "8z00"], ["Alice", "9z00"], ["Bob", "10z00"], ["Carol", "9z00"]] },
    quirk: { reward: 100, rows: [["Dana", "2z01"], ["Eve", "2z01"]] }
  };
  TOOLS.sum = {
    html: function () {
      return '<div class="tool"><div class="panel stack"><div class="f">Examples' + seg("sP", [["basic", "1z00 + 2z00"], ["snp04", "SNP-04"], ["snp05", "SNP-05"], ["quirk", "2z01 + 2z01"]], "basic") + "</div>" +
        '<div id="sRows" class="stack"></div><button class="btn sm" id="sAdd" type="button">Add a note</button>' +
        '<label class="f">Reward to split (whole units)<input class="in mono" id="sR" inputmode="numeric" value="10"></label>' +
        '<p class="hint">Add weights, never Z-bits. One algorithm per sum. Leftover units go to the largest remainders; ties go to the smallest H.</p></div>' +
        '<div class="out"><div class="grid g2" id="sStats"></div><div class="panel"><h3>Split</h3><div class="scroll-x" style="margin-top:10px"><table class="t" id="sTab"></table></div></div>' +
        '<div class="panel"><h3>Why the total is not 3z00</h3><p class="muted" style="font-size:14px;margin-top:6px">Z-bits are logarithmic. <code>1z00</code> is 2 expected hashes and <code>2z00</code> is 4. Together they are 6, and 6 hashes is <code>2z58</code>, because 2^2.58 ≈ 6. Two equal notes add exactly one bit: <code>20z00 + 20z00 = 21z00</code>.</p></div></div></div>';
    },
    mount: function (root) {
      var rows = $("#sRows", root);
      function load(p) { var P = SUM_PRESETS[p]; $("#sR", root).value = P.reward; rows.innerHTML = ""; P.rows.forEach(function (r) { addRow(r[0], r[1]); }); calc(); }
      function addRow(who, zb) {
        var d = document.createElement("div"); d.className = "row"; d.style.flexWrap = "nowrap";
        d.innerHTML = '<input class="in" style="flex:1;min-width:0" value="' + esc(who) + '" aria-label="Recipient"><input class="in mono" style="width:110px" value="' + esc(zb) + '" aria-label="Z-bit"><button class="icon-btn" type="button" aria-label="Remove">' + U().I.x + "</button>";
        rows.appendChild(d);
      }
      rows.addEventListener("input", calc);
      rows.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { b.parentNode.remove(); calc(); } });
      $("#sAdd", root).addEventListener("click", function () { addRow("Frank", "9z00"); calc(); });
      $("#sR", root).addEventListener("input", calc);
      onSeg(root, "sP", load);
      function calc() {
        var list = $$(".row", rows).map(function (r) { var i = $$("input", r); return { who: i[0].value.trim() || "?", zb: SN.parseZBit(i[1].value), el: i[1] }; });
        list.forEach(function (x) { x.el.setAttribute("aria-invalid", String(!x.zb)); });
        var good = list.filter(function (x) { return x.zb; });
        if (!good.length) { $("#sStats", root).innerHTML = vline("warn", "Add at least one valid Z-bit."); $("#sTab", root).innerHTML = ""; return; }
        var W = good.reduce(function (a, x) { return a + SN.weight(x.zb); }, 0n), tot = SN.zbitOfWeight(W);
        $("#sStats", root).innerHTML = stat("Total", '<span class="big" style="font-size:28px">' + SN.formatZBit(tot).replace("z", '<span class="z">z</span>') + "</span>") + stat("Notes", good.length + " · " + good.map(function (x) { return SN.formatZBit(x.zb); }).join(" + "), true);
        var by = {}; good.forEach(function (x, i) { (by[x.who] = by[x.who] || { w: 0n, n: [], minH: BigInt(i + 1) }).w += SN.weight(x.zb); by[x.who].n.push(SN.formatZBit(x.zb)); });
        var keys = Object.keys(by), R; try { R = BigInt(($("#sR", root).value || "0").replace(/\D/g, "") || "0"); } catch (e) { R = 0n; }
        var shares = SN.split(R, keys.map(function (k) { return { weight: by[k].w, minH: by[k].minH }; }));
        var Wf = Number(W >> 100n) || 1;
        $("#sTab", root).innerHTML = "<thead><tr><th>Recipient</th><th>Notes</th><th>Contribution</th><th class=n>Share</th><th class=n>Paid</th></tr></thead><tbody>" + keys.map(function (k, i) {
          var pct = Number(by[k].w >> 100n) / Wf * 100;
          return "<tr><td><strong>" + esc(k) + '</strong></td><td class="mono">' + by[k].n.join(" + ") + '</td><td class="mono">' + SN.formatZBit(SN.zbitOfWeight(by[k].w)) + '</td><td class="n">' + pct.toFixed(1) + '%<div class="bar" style="margin-top:4px"><i class="e" style="width:' + pct + '%"></i></div></td><td class="n"><strong>' + shares[i].toString() + "</strong></td></tr>";
        }).join("") + '</tbody><tfoot><tr><td colspan="4" class="muted">Total paid</td><td class="n"><strong>' + shares.reduce(function (a, b) { return a + b; }, 0n).toString() + "</strong></td></tr></tfoot>";
      }
      load("basic");
    }
  };

  /* =====================================================================
   * SNP-01/02 Planner
   * ===================================================================== */
  var UNITS = [["H/s", 1], ["kH/s", 1e3], ["MH/s", 1e6], ["GH/s", 1e9], ["TH/s", 1e12], ["PH/s", 1e15], ["EH/s", 1e18]];
  TOOLS.planner = {
    html: function () {
      return '<div class="tabs" role="tablist" id="plTabs"><button role="tab" aria-selected="true" data-p="out">What do I mint?</button><button role="tab" aria-selected="false" data-p="need">What do I need?</button><button role="tab" aria-selected="false" data-p="est">Hashrate from shares</button></div>' +
        '<div style="margin-top:20px">' +
        '<div data-pane="out" class="tool"><div class="panel stack"><div class="row" style="flex-wrap:nowrap"><label class="f" style="flex:1">Hashrate<input class="in mono" id="pR" value="200" inputmode="decimal"></label><label class="f" style="width:110px">Unit<select class="in" id="pU">' + UNITS.map(function (u) { return "<option" + (u[0] === "TH/s" ? " selected" : "") + ">" + u[0] + "</option>"; }).join("") + "</select></label></div>" +
        '<div class="f">Presets<div class="row">' + [["CPU", "5", "MH/s"], ["GPU", "2", "GH/s"], ["S21", "200", "TH/s"], ["L9 scrypt", "16", "GH/s"]].map(function (p) { return '<button class="btn sm" type="button" data-pr="' + p[1] + "|" + p[2] + '">' + p[0] + "</button>"; }).join("") + "</div></div>" +
        '<label class="f">Window<select class="in" id="pW"><option value="1">1 second</option><option value="60" selected>1 minute</option><option value="3600">1 hour</option><option value="86400">1 day</option></select></label>' +
        '<p class="hint">Notes per second ≈ R / 2^z. A miner can mint any Z-bit; bigger notes are rarer, smaller notes are more frequent.</p></div>' +
        '<div class="out"><div class="grid g2" id="pBig"></div><div class="panel"><h3>Output by denomination</h3><div class="scroll-x" style="margin-top:10px"><table class="t" id="pTab"></table></div></div></div></div>' +
        '<div data-pane="need" class="tool" hidden><div class="panel stack"><label class="f">Note size<input class="in mono" id="nZ" value="30z00"></label><label class="f">How many<input class="in mono" id="nN" value="10" inputmode="numeric"></label><label class="f">Within<select class="in" id="nT"><option value="60">1 minute</option><option value="3600" selected>1 hour</option><option value="86400">1 day</option></select></label></div>' +
        '<div class="out" id="nOut"></div></div>' +
        '<div data-pane="est" class="tool" hidden><div class="panel stack"><label class="f">Shares seen<input type="range" id="eN" min="1" max="2000" value="100"><span class="hint" id="eNl"></span></label><label class="f">Share size<input class="in mono" id="eZ" value="40z00"></label><label class="f">Over (seconds)<input class="in mono" id="eT" value="600" inputmode="numeric"></label>' +
        '<p class="hint">SNP-02: shares are public, so anyone can estimate a miner’s rate as Σ D / t. The error shrinks as 1/√n.</p></div><div class="out" id="eOut"></div></div></div>';
    },
    mount: function (root) {
      $("#plTabs", root).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; $$("button", this).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); }); $$("[data-pane]", root).forEach(function (p) { p.hidden = p.dataset.pane !== b.dataset.p; }); });
      function rate() { var v = parseFloat($("#pR", root).value) || 0, u = UNITS.filter(function (x) { return x[0] === $("#pU", root).value; })[0][1]; return v * u; }
      function out() {
        var R = rate(), w = +$("#pW", root).value;
        if (!(R > 0)) { $("#pBig", root).innerHTML = vline("warn", "Enter a hashrate above zero."); $("#pTab", root).innerHTML = ""; return; }
        var best = SN.zbitForHashes(R * w);
        $("#pBig", root).innerHTML = stat("Largest note you expect once per " + $("#pW", root).selectedOptions[0].text, '<span class="big" style="font-size:30px">' + SN.formatZBit(best).replace("z", '<span class="z">z</span>') + "</span>") +
          stat("Work per " + $("#pW", root).selectedOptions[0].text, U().fmtHashes(R * w) + " hashes · total " + SN.formatZBit(SN.zbitForHashes(R * w)) + " of notes", true);
        var zs = []; for (var z = Math.max(8, best.z - 12); z <= best.z + 6; z += 2) zs.push(z);
        $("#pTab", root).innerHTML = "<thead><tr><th>Note</th><th class=n>Every</th><th class=n>Per hour</th><th class=n>Per day</th></tr></thead><tbody>" + zs.map(function (z) {
          var D = SN.valueFloat({ z: z, cc: 0 }), s = D / R, fmtN = function (n) { return n >= 1e6 ? n.toExponential(1) : n >= 10 ? U().group(Math.round(n)) : n.toFixed(2); };
          return "<tr" + (z === best.z ? ' style="background:var(--ember-wash)"' : "") + '><td class="mono"><strong>' + z + 'z00</strong></td><td class="n">' + U().fmtDur(s) + '</td><td class="n">' + fmtN(3600 / s) + '</td><td class="n">' + fmtN(86400 / s) + "</td></tr>";
        }).join("") + "</tbody>";
      }
      ["pR", "pU", "pW"].forEach(function (id) { $("#" + id, root).addEventListener("input", out); });
      $$("[data-pr]", root).forEach(function (b) { b.addEventListener("click", function () { var p = b.dataset.pr.split("|"); $("#pR", root).value = p[0]; $("#pU", root).value = p[1]; out(); }); });
      function need() {
        var zb = SN.parseZBit($("#nZ", root).value), n = +$("#nN", root).value || 0, t = +$("#nT", root).value;
        if (!zb || !(n > 0)) { $("#nOut", root).innerHTML = vline("warn", "Enter a Z-bit like 30z00 and a count above zero."); return; }
        var R = SN.valueFloat(zb) * n / t;
        $("#nOut", root).innerHTML = '<div class="grid g2">' + stat("Hashrate needed on average", '<span class="big" style="font-size:30px">' + U().fmtRate(R) + "</span>") + stat("For " + n + " × " + SN.formatZBit(zb), U().fmtHashes(SN.valueFloat(zb) * n) + " hashes in " + $("#nT", root).selectedOptions[0].text, true) + "</div>" +
          '<div class="panel"><h3>Or buy them</h3><p class="muted" style="font-size:14px;margin-top:6px">A mining provider can mine these for you and stream them back. See the cost in <a href="#tool-buy">Buy work</a>.</p></div>';
      }
      ["nZ", "nN", "nT"].forEach(function (id) { $("#" + id, root).addEventListener("input", need); });
      function est() {
        var n = +$("#eN", root).value, zb = SN.parseZBit($("#eZ", root).value) || { z: 40, cc: 0 }, t = +$("#eT", root).value || 1;
        $("#eNl", root).textContent = n + " shares";
        var list = []; for (var i = 0; i < n; i++) list.push(zb);
        var r = SN.estimateHashrate(list, t), e = 1 / Math.sqrt(n), lo = r * (1 - e), hi = r * (1 + e);
        var max = r * 2.2, X = function (v) { return 20 + 520 * Math.min(1, v / max); };
        $("#eOut", root).innerHTML = '<div class="grid g2">' + stat("Estimated hashrate", '<span class="big" style="font-size:30px">' + U().fmtRate(r) + "</span>") + stat("Precision (1σ)", "± " + (e * 100).toFixed(1) + "% · " + U().fmtRate(lo) + " to " + U().fmtRate(hi), true) + "</div>" +
          '<div class="panel"><div class="svgbox"><svg viewBox="0 0 560 90" role="img" aria-label="Estimate with error band"><line x1="20" y1="50" x2="540" y2="50" stroke="var(--line-2)" stroke-width="2"/>' +
          '<rect x="' + X(lo) + '" y="38" width="' + (X(hi) - X(lo)) + '" height="24" rx="4" fill="var(--ember-wash)" stroke="var(--ember)" stroke-width="1"/><line x1="' + X(r) + '" y1="30" x2="' + X(r) + '" y2="70" stroke="var(--ember)" stroke-width="3"/>' +
          '<text x="' + X(r) + '" y="22" text-anchor="middle" font-size="12" font-weight="700">' + U().fmtRate(r) + '</text><text x="20" y="86" font-size="11" fill="var(--muted)">0</text><text x="540" y="86" text-anchor="end" font-size="11">' + U().fmtRate(max) + "</text></svg></div>" +
          '<p class="muted" style="font-size:13px">±32% at 10 shares, ±10% at 100, ±3% at 1,000. Use smaller shares to measure faster.</p></div>';
      }
      ["eN", "eZ", "eT"].forEach(function (id) { $("#" + id, root).addEventListener("input", est); });
      out(); need(); est();
    }
  };

  /* =====================================================================
   * SNP-02/07 Merged mining
   * ===================================================================== */
  TOOLS.merged = {
    html: function () {
      return '<div class="grid" style="gap:20px"><div class="panel"><div class="row" style="justify-content:space-between"><h3>One template, two chances</h3><div class="row"><span class="chip sig">z-chain slot 0x534E</span><span class="chip">scrypt-aux · sha256d-aux</span></div></div>' +
        '<div class="svgbox" style="margin-top:14px" id="mgSvg"></div></div>' +
        '<div class="tool"><div class="panel stack"><h3>Where does this hash land?</h3><label class="f">Your share size (note Z-bit)<input class="in mono" id="mgZ" value="32z00"></label><label class="f">Parent block difficulty (Z-bit)<input class="in mono" id="mgB" value="52z40"><span class="hint">From the template’s bits. Roughly Dogecoin-sized here.</span></label>' +
        '<label class="f">Header hash, as leading zero bits<input type="range" id="mgH" min="20" max="60" step=".1" value="34"><span class="hint" id="mgHl"></span></label></div><div class="out" id="mgOut"></div></div>' +
        '<div class="tool"><div class="panel stack"><h3>Who gets paid</h3><label class="f">Block reward (coins)<input class="in mono" id="fR" value="10000"></label><label class="f">NSP fee (ppm, from its 31725 announcement)<input class="in mono" id="fP" value="5000"></label><p class="hint">SNP-07: the coinbase pays the client. The NSP takes at most its announced fee. A client refuses any template that pays anyone else.</p></div><div class="out" id="fOut"></div></div></div>';
    },
    mount: function (root) {
      var svg = '<svg viewBox="0 0 900 290" role="img" aria-label="Merged mining: template, coinbase, aux tree, header">' +
        '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 10 5 0 10z" fill="var(--ink)"/></marker></defs>' +
        box(20, 30, 170, 70, "NSP template", "gRPC WorkStream", "var(--sheet)") +
        box(240, 30, 200, 70, "Coinbase", "pays the client · fee ≤ ppm", "var(--sheet)") +
        box(500, 20, 170, 90, "Parent header", "merkle root ← coinbase", "var(--sheet)") +
        box(720, 30, 160, 70, "Hash H", "vs two targets", "var(--ember-wash)") +
        arrow(190, 65, 240, 65) + arrow(440, 65, 500, 65) + arrow(670, 65, 720, 65) +
        '<line x1="340" y1="100" x2="340" y2="150" stroke="var(--ink)" stroke-dasharray="4 3" marker-end="url(#ar)"/>' +
        '<text x="350" y="130" font-size="11" fill="var(--muted)">FA BE 6D 6D · root · size · nonce</text>' +
        box(240, 150, 200, 50, "Aux merkle tree", "height 2 · 4 slots", "var(--sheet)") +
        slot(180, 230, "slot 0", "other aux chain", false) + slot(290, 230, "slot 1", "z-chain 0x534E", true) + slot(400, 230, "slot 2", "empty", false) + slot(510, 230, "slot 3", "empty", false) +
        '<line x1="340" y1="200" x2="340" y2="230" stroke="var(--ink)"/>' +
        '<text x="625" y="248" font-size="12" fill="var(--signal)" font-weight="700">← SHA-256d of your SN4U record (empty nonce)</text>' +
        '<text x="625" y="266" font-size="11" fill="var(--muted)">identity · Z-bit · binding, committed before you hash</text>' +
        "</svg>";
      function box(x, y, w, h, t, s, f) { return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + f + '" stroke="var(--ink)" stroke-width="1.5"/><text x="' + (x + w / 2) + '" y="' + (y + h / 2 - 3) + '" text-anchor="middle" font-size="14" font-weight="800">' + t + '</text><text x="' + (x + w / 2) + '" y="' + (y + h / 2 + 15) + '" text-anchor="middle" font-size="11" fill="var(--muted)">' + s + "</text>"; }
      function arrow(x1, y1, x2, y2) { return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + (x2 - 4) + '" y2="' + y2 + '" stroke="var(--ink)" stroke-width="1.5" marker-end="url(#ar)"/>'; }
      function slot(x, y, t, s, on) { return '<rect x="' + x + '" y="' + y + '" width="100" height="44" rx="6" fill="' + (on ? "var(--signal-wash)" : "var(--paper-2)") + '" stroke="' + (on ? "var(--signal)" : "var(--line-2)") + '" stroke-width="' + (on ? 2 : 1) + '"/><text x="' + (x + 50) + '" y="' + (y + 18) + '" text-anchor="middle" font-size="11" font-weight="700">' + t + '</text><text x="' + (x + 50) + '" y="' + (y + 34) + '" text-anchor="middle" font-size="10" fill="' + (on ? "var(--signal)" : "var(--muted)") + '">' + s + "</text>"; }
      $("#mgSvg", root).innerHTML = svg;
      function land() {
        var zs = SN.parseZBit($("#mgZ", root).value), zbk = SN.parseZBit($("#mgB", root).value), h = +$("#mgH", root).value;
        $("#mgHl", root).textContent = "H ≈ 2^" + (256 - h).toFixed(1) + " (" + h.toFixed(1) + " leading zero bits)";
        if (!zs || !zbk) { $("#mgOut", root).innerHTML = vline("warn", "Enter Z-bits like 32z00."); return; }
        var share = h >= SN.zReal(zs), block = h >= SN.zReal(zbk);
        var W = 520, X = function (v) { return 20 + (v - 20) / 40 * W; };
        $("#mgOut", root).innerHTML = (block ? vline("ok", "Block! Submit it to the NSP. It is also a merged note worth " + SN.formatZBit(zs) + ".") : share ? vline("ok", "Share: a merged note worth exactly " + SN.formatZBit(zs) + ". Not a block.") : vline("warn", "Neither. Keep hashing.")) +
          '<div class="panel"><div class="svgbox"><svg viewBox="0 0 560 100" role="img" aria-label="Hash against share and block targets"><rect x="20" y="40" width="' + W + '" height="16" rx="8" fill="var(--wash)"/>' +
          '<rect x="' + X(SN.zReal(zs)) + '" y="40" width="' + Math.max(0, X(60) - X(SN.zReal(zs))) + '" height="16" fill="var(--signal-wash)"/><rect x="' + X(Math.min(60, SN.zReal(zbk))) + '" y="40" width="' + Math.max(0, X(60) - X(Math.min(60, SN.zReal(zbk)))) + '" height="16" fill="var(--ember-wash)"/>' +
          '<line x1="' + X(SN.zReal(zs)) + '" y1="30" x2="' + X(SN.zReal(zs)) + '" y2="66" stroke="var(--signal)" stroke-width="2"/><text x="' + X(SN.zReal(zs)) + '" y="24" text-anchor="middle" font-size="11" font-weight="700">share ' + SN.formatZBit(zs) + "</text>" +
          '<line x1="' + X(Math.min(60, SN.zReal(zbk))) + '" y1="30" x2="' + X(Math.min(60, SN.zReal(zbk))) + '" y2="66" stroke="var(--ember)" stroke-width="2"/><text x="' + X(Math.min(60, SN.zReal(zbk))) + '" y="82" text-anchor="middle" font-size="11" font-weight="700">block ' + SN.formatZBit(zbk) + "</text>" +
          '<circle cx="' + X(h) + '" cy="48" r="7" fill="var(--ink)"/><text x="' + X(h) + '" y="98" text-anchor="middle" font-size="10" fill="var(--muted)">your hash</text></svg></div>' +
          '<p class="muted" style="font-size:13px">Every share is a note. A miner hashing R gets about R / 2^z notes a second from hashes it already makes. The note’s value is the committed Z-bit, never the luck of H.</p></div>';
      }
      ["mgZ", "mgB", "mgH"].forEach(function (id) { $("#" + id, root).addEventListener("input", land); });
      function fee() {
        var R = parseFloat($("#fR", root).value) || 0, p = Math.max(0, Math.min(1e6, parseInt($("#fP", root).value, 10) || 0)), f = R * p / 1e6;
        $("#fOut", root).innerHTML = '<div class="grid g2">' + stat("Client (you)", U().group((R - f).toFixed(2))) + stat("NSP fee", U().group(f.toFixed(2)) + " · " + (p / 1e4).toFixed(2) + "%") + "</div>" +
          '<div class="bar" style="height:16px"><i class="e" style="width:' + (100 - p / 1e4) + '%"></i></div>' + vline("ok", "Check 3 passes: outputs pay only your script, plus one NSP output within " + p + " ppm.");
      }
      ["fR", "fP"].forEach(function (id) { $("#" + id, root).addEventListener("input", fee); });
      land(); fee();
    }
  };

  /* =====================================================================
   * SNP-04 Work offer
   * ===================================================================== */
  TOOLS.offer = {
    html: function () {
      return '<div class="tool"><div class="panel stack"><h3>Boost a post</h3><p class="muted" style="font-size:14px">Reward likes that carry work. Likers mine notes bound to their own reaction (<code>via 7</code>) on your post (<code>target</code>).</p>' +
        '<label class="f">Post (event id)<input class="in mono" id="oT" spellcheck="false"></label>' +
        '<div class="row" style="flex-wrap:nowrap"><label class="f" style="flex:1">Reward<input class="in mono" id="oR" value="21000" inputmode="numeric"></label><label class="f" style="width:120px">Method<select class="in" id="oM"><option>lightning</option><option>onchain</option></select></label></div>' +
        '<div class="row" style="flex-wrap:nowrap"><label class="f" style="flex:1">Algorithm<select class="in mono" id="oG"><option>sha256d</option><option>scrypt</option><option>sha256d-aux</option><option>scrypt-aux</option></select></label><label class="f" style="width:120px">At least<input class="in mono" id="oZ" value="16z00"></label></div>' +
        '<label class="f">Closes in<select class="in" id="oC"><option value="3600">1 hour</option><option value="86400" selected>1 day</option><option value="604800">1 week</option></select></label>' +
        '<div class="row"><button class="btn primary" id="oSim" type="button" data-sticky>Simulate likes with work</button><button class="btn sm ghost" id="oReset" type="button">Reset</button></div></div>' +
        '<div class="out"><div class="panel"><div class="row" style="justify-content:space-between"><h3>Leaderboard</h3><span class="chip ember" id="oLive"><span class="dot"></span>idle</span></div><div class="scroll-x" style="margin-top:10px"><table class="t" id="oTab"></table></div><p class="muted" style="font-size:12px;margin-top:8px">The reward is a promise. Nothing is escrowed. The payout receipt (SNP-05) makes it auditable.</p></div>' +
        '<div class="panel stack" data-sheet="kind:1726 offer"><div class="row" style="justify-content:space-between"><h3>kind:1726 offer</h3><button class="btn sm" id="oCopy" type="button">Copy JSON</button></div><pre class="code" id="oEv"></pre></div></div></div>';
    },
    mount: function (root) {
      $("#oT", root).value = SN_FIX.hexid();
      var likers = ["mara", "otto", "jun", "pia", "sol", "kai", "ines", "rafe"], contrib = {}, timer = null;
      function ev() {
        var now = Math.floor(Date.now() / 1000);
        return { kind: 1726, created_at: now, tags: [["g", $("#oG", root).value], ["z", $("#oZ", root).value], ["reward", $("#oR", root).value, "sat"], ["method", $("#oM", root).value], ["closes", String(now + +$("#oC", root).value)], ["target", $("#oT", root).value], ["via", "7"], ["relay", "wss://relay.sharenote.example"]], content: "" };
      }
      function draw() {
        $("#oEv", root).textContent = JSON.stringify(ev(), null, 2);
        var keys = Object.keys(contrib);
        if (!keys.length) { $("#oTab", root).innerHTML = '<tbody><tr><td><div class="state">No work yet. Press “Simulate likes with work” to watch notes arrive.</div></td></tr></tbody>'; return; }
        keys.sort(function (a, b) { return contrib[b].w > contrib[a].w ? 1 : -1; });
        var R = BigInt(($("#oR", root).value || "0").replace(/\D/g, "") || "0"), sh = SN.split(R, keys.map(function (k) { return { weight: contrib[k].w, minH: contrib[k].h }; }));
        $("#oTab", root).innerHTML = "<thead><tr><th>Liker</th><th class=n>Notes</th><th>Contribution</th><th class=n>Would get</th></tr></thead><tbody>" + keys.map(function (k, i) {
          return '<tr class="fadein"><td><strong>' + k + '</strong></td><td class="n">' + contrib[k].n + '</td><td class="mono">' + SN.formatZBit(SN.zbitOfWeight(contrib[k].w)) + '</td><td class="n">' + U().group(sh[i].toString()) + " sat</td></tr>";
        }).join("") + "</tbody>";
      }
      function tick() {
        var minz = SN.parseZBit($("#oZ", root).value) || { z: 16, cc: 0 }, who = likers[Math.floor(Math.random() * likers.length)], z = minz.z + Math.floor(Math.random() * 5);
        var c = contrib[who] = contrib[who] || { w: 0n, n: 0, h: BigInt(Math.floor(Math.random() * 1e9)) };
        c.w += SN.weight({ z: z, cc: 0 }); c.n++; draw();
      }
      $("#oSim", root).addEventListener("click", function () {
        if (timer) { clearInterval(timer); timer = null; this.textContent = "Simulate likes with work"; $("#oLive", root).innerHTML = '<span class="dot"></span>paused'; return; }
        tick(); timer = setInterval(function () { if (!document.body.contains(root)) { clearInterval(timer); return; } tick(); }, 900);
        this.textContent = "Pause"; $("#oLive", root).innerHTML = '<span class="dot"></span>notes arriving';
      });
      $("#oReset", root).addEventListener("click", function () { contrib = {}; draw(); });
      $("#oCopy", root).addEventListener("click", function () { U().copy(JSON.stringify(ev())); });
      root.addEventListener("input", draw);
      draw();
    }
  };

  /* =====================================================================
   * SNP-05 Receipt audit
   * ===================================================================== */
  TOOLS.audit = {
    html: function () {
      return '<div class="tool"><div class="panel stack"><h3>The offer</h3><dl class="kv"><dt>Algorithm</dt><dd>sha256d</dd><dt>At least</dt><dd>8z00</dd><dt>Reward</dt><dd>1000 sat</dd></dl>' +
        '<h3 style="margin-top:8px">Notes on the relays</h3><div id="aNotes" class="stack"></div><p class="hint">Untick a note to drop it from the receipt. The note still exists on relays, so an auditor can name it.</p>' +
        '<h3 style="margin-top:8px">Amounts the issuer wrote</h3><div id="aAmts" class="stack"></div><div class="row"><button class="btn sm" id="aHonest" type="button">Use the honest split</button><button class="btn sm" id="aCheat" type="button">Shift 50 sat to Alice</button></div></div>' +
        '<div class="out"><div id="aVerdict"></div><div class="panel"><h3>Audit</h3><div class="scroll-x" style="margin-top:10px"><table class="t" id="aTab"></table></div></div><div class="panel stack" data-sheet="kind:1727 receipt"><h3>kind:1727 receipt</h3><pre class="code" id="aEv"></pre></div></div></div>';
    },
    mount: function (root) {
      var notes = [{ who: "Alice", z: "8z00", on: true }, { who: "Alice", z: "9z00", on: true }, { who: "Bob", z: "10z00", on: true }, { who: "Carol", z: "9z00", on: true }];
      notes.forEach(function (n, i) { n.H = SN_FIX.hexid(); n.minH = BigInt(i + 1); });
      var people = ["Alice", "Bob", "Carol"], amts = { Alice: 333, Bob: 445, Carol: 222 };
      $("#aNotes", root).innerHTML = notes.map(function (n, i) { return '<label class="row" style="flex-wrap:nowrap;font-size:14px"><input type="checkbox" data-n="' + i + '" checked style="width:20px;height:20px;accent-color:var(--ember-fill)"><strong style="width:56px">' + n.who + '</strong><span class="mono">' + n.z + '</span><span class="mono muted" style="font-size:11px;overflow:hidden;text-overflow:ellipsis">sha256d:' + n.H.slice(0, 12) + "…</span></label>"; }).join("");
      $("#aAmts", root).innerHTML = people.map(function (p) { return '<label class="row" style="flex-wrap:nowrap"><strong style="width:56px">' + p + '</strong><input class="in mono" data-a="' + p + '" value="' + amts[p] + '" inputmode="numeric" style="flex:1"><span class="muted">sat</span></label>'; }).join("");
      function honest() {
        var counted = notes.filter(function (n) { return n.on; }), by = {};
        counted.forEach(function (n) { (by[n.who] = by[n.who] || { w: 0n, h: n.minH }).w += SN.weight(SN.parseZBit(n.z)); });
        var ks = Object.keys(by), sh = ks.length ? SN.split(1000n, ks.map(function (k) { return { weight: by[k].w, minH: by[k].h }; })) : [];
        var o = {}; people.forEach(function (p) { o[p] = 0; }); ks.forEach(function (k, i) { o[k] = Number(sh[i]); }); return { amounts: o, by: by };
      }
      function audit() {
        notes.forEach(function (n, i) { n.on = $('[data-n="' + i + '"]', root).checked; });
        people.forEach(function (p) { amts[p] = parseInt($('[data-a="' + p + '"]', root).value, 10) || 0; });
        var H = honest(), wrong = people.filter(function (p) { return amts[p] !== H.amounts[p]; }), omitted = notes.filter(function (n) { return !n.on; });
        var v = wrong.length ? vline("bad", "Provably false. From the offer and the counted weights, the split gives " + people.map(function (p) { return p + " " + H.amounts[p]; }).join(", ") + ".")
          : omitted.length ? vline("warn", "Consistent, but omission: " + omitted.map(function (n) { return n.who + "’s " + n.z; }).join(", ") + " exists on relays and was not counted.")
          : vline("ok", "Consistent. Every note counted, every amount matches the split.");
        $("#aVerdict", root).innerHTML = v;
        $("#aTab", root).innerHTML = "<thead><tr><th>Identity</th><th>Weight counted</th><th class=n>Receipt says</th><th class=n>Split gives</th><th>Finding</th></tr></thead><tbody>" + people.map(function (p) {
          var w = H.by[p] ? SN.formatZBit(SN.zbitOfWeight(H.by[p].w)) : "—", bad = amts[p] !== H.amounts[p], om = notes.some(function (n) { return n.who === p && !n.on; });
          return "<tr><td><strong>" + p + '</strong></td><td class="mono">' + w + '</td><td class="n">' + amts[p] + '</td><td class="n">' + H.amounts[p] + "</td><td>" + (bad ? '<span class="chip bad">provably false</span>' : om ? '<span class="chip draft">omission</span>' : '<span class="chip ok">ok</span>') + "</td></tr>";
        }).join("") + "</tbody>";
        var tags = [["e", "<offer id>"], ["reward", "1000", "sat"]].concat(people.filter(function (p) { return H.by[p] || amts[p]; }).map(function (p) { return ["pay", "<" + p.toLowerCase() + " pubkey>", String(amts[p]), H.by[p] ? H.by[p].w.toString().slice(0, 12) + "…" : "0", "<min H>"]; }))
          .concat(notes.filter(function (n) { return n.on; }).map(function (n) { return ["n", "sha256d:" + n.H.slice(0, 16) + "…"]; }));
        $("#aEv", root).textContent = JSON.stringify({ kind: 1727, tags: tags, content: "" }, null, 1).replace(/\n\s+(?=[\]"\d<])/g, " ");
      }
      root.addEventListener("input", audit); root.addEventListener("change", audit);
      $("#aHonest", root).addEventListener("click", function () { var H = honest(); people.forEach(function (p) { $('[data-a="' + p + '"]', root).value = H.amounts[p]; }); audit(); });
      $("#aCheat", root).addEventListener("click", function () { var a = $('[data-a="Alice"]', root), b = $('[data-a="Bob"]', root); a.value = (+a.value) + 50; b.value = (+b.value) - 50; audit(); });
      audit();
    }
  };

  /* =====================================================================
   * SNP-06 Buy work
   * ===================================================================== */
  TOOLS.buy = {
    html: function () {
      var P = SN_FIX.PROVIDERS;
      return '<ol class="steps" id="bSteps"><li class="on">Choose</li><li>Order 1724</li><li>Quote 1725</li><li>Pay</li><li>Mining 1731</li><li>Delivered</li></ol>' +
        '<div class="tool" style="margin-top:16px"><div class="panel stack"><label class="f">Provider (from SNP-03 announcements)<select class="in" id="bP">' + P.map(function (p, i) { return '<option value="' + i + '"' + (p.live ? "" : " disabled") + ">" + esc(p.name) + " · " + p.alg + " · " + p.price.amount + " sat / " + p.price.z + (p.live ? "" : " (offline)") + "</option>"; }).join("") + "</select></label>" +
        '<div class="row" style="flex-wrap:nowrap"><label class="f" style="flex:1">Each note<input class="in mono" id="bZ" value="28z00"></label><label class="f" style="width:110px">Count<input class="in mono" id="bN" value="12" inputmode="numeric"></label></div>' +
        '<label class="f">Credit to<select class="in" id="bW"><option>Me</option><option>A friend (gift)</option></select></label>' +
        '<label class="f">Bind to<select class="in" id="bB"><option>Nothing (prepaid work)</option><option>https://api.example · epoch 7</option><option>An offer’s template</option></select></label>' +
        '<div id="bCost"></div><button class="btn primary" id="bGo" type="button" data-sticky>Send order</button><p class="hint">Everything travels as gift-wrapped DMs to the provider’s inbox relays, so a rig behind NAT can sell.</p></div>' +
        '<div class="out"><div id="bState"></div><div class="panel"><div class="row" style="justify-content:space-between"><h3>Delivered notes</h3><span class="mono muted" id="bCnt" style="font-size:12px"></span></div><div class="feed" id="bFeed" style="margin-top:8px"><div class="state">Notes appear here as the provider streams them. You verify each one.</div></div></div></div></div>';
    },
    mount: function (root) {
      var timer = null;
      function pv() { return SN_FIX.PROVIDERS[+$("#bP", root).value]; }
      function cost() {
        var p = pv(), zb = SN.parseZBit($("#bZ", root).value), n = parseInt($("#bN", root).value, 10);
        if (!zb || !(n > 0)) return { err: "invalid-tag", msg: "Enter a Z-bit and a count." };
        if (SN.zReal(zb) > SN.zReal(SN.parseZBit(p.maxZ))) return { err: "z-too-large", msg: p.name + " mines notes up to " + p.maxZ + "." };
        if (n > p.max) return { err: "count-out-of-range", msg: p.name + " takes at most " + p.max + " notes per order." };
        return { sats: SN.costCap(p.price.amount, n, zb, SN.parseZBit(p.price.z)), zb: zb, n: n, p: p };
      }
      function drawCost() {
        var c = cost();
        $("#bCost", root).innerHTML = c.err ? vline("bad", "The provider would refuse: <code>" + c.err + "</code>. " + c.msg) :
          '<div class="stat"><div class="k">Price cap · ⌈amount · count · w(z) / w(priced z)⌉</div><div class="v">' + U().group(c.sats.toString()) + " sat</div><div class=\"hint\">" + c.n + " × " + SN.formatZBit(c.zb) + " at " + c.p.price.amount + " sat per " + c.p.price.z + ". The quote must not ask more.</div></div>";
        $("#bGo", root).disabled = !!c.err;
      }
      ["bP", "bZ", "bN"].forEach(function (id) { $("#" + id, root).addEventListener("input", drawCost); });
      var preZ = window.SNPrefill.take();
      if (preZ && SN.parseZBit(preZ)) {
        var pz = SN.parseZBit(preZ);
        $("#bZ", root).value = SN.formatZBit(pz); $("#bN", root).value = "1";
        var fit = SN_FIX.PROVIDERS.map(function (p, i) { return { p: p, i: i }; }).filter(function (x) { return x.p.live && x.p.alg === "sha256d" && SN.zReal(SN.parseZBit(x.p.maxZ)) >= SN.zReal(pz); })[0];
        if (fit) $("#bP", root).value = fit.i;
        else setTimeout(function () { $("#bState", root).innerHTML = vline("warn", "No provider here mines notes as big as " + SN.formatZBit(pz) + ". The largest on offer is 44z00. Even ASICs have limits, and a sense of proportion."); }, 0);
      }
      function step(i) { $$("#bSteps li", root).forEach(function (li, k) { li.className = k < i ? "done" : k === i ? "on" : ""; }); }
      $("#bGo", root).addEventListener("click", function () {
        var c = cost(); if (c.err) return; clearInterval(timer);
        var btn = this; btn.disabled = true; step(1);
        $("#bFeed", root).innerHTML = ""; $("#bCnt", root).textContent = "";
        $("#bState", root).innerHTML = vline("warn", "Order sent to " + esc(c.p.name) + "’s inbox relays (kind 1724, gift-wrapped).");
        setTimeout(function () {
          step(2);
          $("#bState", root).innerHTML = '<div class="panel stack"><div class="row" style="justify-content:space-between"><h3>Quote received</h3><span class="chip ok">within the cap</span></div><dl class="kv"><dt>Amount</dt><dd>' + U().group(c.sats.toString()) + ' sat</dd><dt>Invoice</dt><dd>lnbc' + c.sats + "n1p" + SN_FIX.hexid(40) + '…</dd><dt>Expires</dt><dd>10 min</dd></dl><button class="btn primary" id="bPay" type="button">Pay invoice (simulated)</button></div>';
          $("#bPay", root).addEventListener("click", function () {
            step(3); this.disabled = true; this.textContent = "Paid";
            setTimeout(function () {
              step(4); var got = 0;
              $("#bState", root).innerHTML = vline("warn", "Status: mining. Notes stream back as they are found.");
              timer = setInterval(function () {
                if (!document.body.contains(root)) { clearInterval(timer); return; }
                got++;
                var it = document.createElement("div"); it.className = "item fadein";
                it.innerHTML = '<span class="zb">' + SN.formatZBit(c.zb) + '</span><span class="who">' + c.p.alg + ":" + SN_FIX.hexid(24) + '…</span><span class="seal-sm">' + U().I.check + "ATTRIBUTED</span>";
                $("#bFeed", root).prepend(it); $("#bCnt", root).textContent = got + " of " + c.n + " · verified";
                if (got >= c.n) { clearInterval(timer); step(6); $("#bState", root).innerHTML = vline("ok", "Done. " + c.n + " notes delivered and verified. Total " + SN.formatZBit(SN.addZBits(Array(c.n).fill(c.zb))) + "."); btn.disabled = false; btn.textContent = "Order again"; }
              }, 380);
            }, 700);
          });
        }, 900);
      });
      drawCost();
    }
  };

  /* =====================================================================
   * SNP-08 Ask
   * ===================================================================== */
  TOOLS.ask = {
    html: function () {
      return '<div class="tool"><div class="panel stack"><h3>Ask your rig</h3>' +
        '<p style="font-size:var(--t-lg);line-height:1.9">Mine <select class="in mono" id="kZ" style="width:auto;display:inline-block;min-height:36px">' + zOpts(16, 40, "24z00") + '</select> notes for <select class="in" id="kB" style="width:auto;display:inline-block;min-height:36px"><option>my API epoch</option><option>an offer</option><option>a friend</option></select> until <select class="in" id="kU" style="width:auto;display:inline-block;min-height:36px"><option>tonight</option><option>tomorrow</option><option>Friday</option></select>, about <select class="in mono" id="kW" style="width:auto;display:inline-block;min-height:36px"><option>34z00</option><option selected>36z00</option><option>38z00</option></select> in total.</p>' +
        '<div class="row" style="flex-wrap:nowrap"><label class="f" style="flex:1">Send as<select class="in" id="kO"><option value="1">Owner rank 1 (you)</option><option value="2">Owner rank 2 (partner)</option><option value="3">Owner rank 3 (guest)</option></select></label><label class="f" style="width:120px">Priority<select class="in" id="kP"><option>0</option><option selected>5</option><option>9</option></select></label></div>' +
        '<button class="btn primary" id="kGo" type="button" data-sticky>Send ask (kind 1728)</button><p class="hint">Gift-wrapped to the rig. The rig orders its queue by owner rank, then priority, then arrival. When the queue is empty it returns to its usual work.</p></div>' +
        '<div class="out"><div class="panel"><div class="row" style="justify-content:space-between"><h3>Rig “garage-s21” · 200 TH/s</h3><span class="chip sig"><span class="dot"></span>reachable</span></div><div class="queue" id="kQ" style="margin-top:12px"></div></div><div class="panel"><h3>Status updates (kind 1729)</h3><div class="feed" id="kLog" style="margin-top:8px"></div></div></div></div>';
    },
    mount: function (root) {
      var q = [
        { id: 1, label: "Mine 30z00 for an offer until Friday", rank: 2, pri: 5, arr: 1, want: 1, got: .62, st: "running" },
        { id: 2, label: "Mine 20z00 for my API epoch until tonight", rank: 3, pri: 9, arr: 2, want: 1, got: 0, st: "queued" }
      ], nid = 3, timer;
      function order() { q.sort(function (a, b) { return a.rank - b.rank || b.pri - a.pri || a.arr - b.arr; }); var first = q.filter(function (x) { return x.st === "running" || x.st === "queued"; })[0]; q.forEach(function (x) { if (x.st === "running" && x !== first) { x.st = "queued"; log("queued", x.label + " · preempted"); } }); if (first && first.st === "queued") { first.st = "running"; log("running", first.label); } }
      function log(st, text) { var it = document.createElement("div"); it.className = "item fadein"; it.innerHTML = '<span class="chip ' + (st === "running" ? "ember" : st === "done" ? "ok" : "") + '">' + st + '</span><span style="font-size:13px">' + esc(text) + '</span><span class="mono muted" style="font-size:11px">' + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + "</span>"; $("#kLog", root).prepend(it); }
      function draw() {
        var live = q.filter(function (x) { return x.st !== "done"; });
        $("#kQ", root).innerHTML = (live.length ? "" : '<div class="state">Queue empty. The rig is doing its usual work.</div>') + q.map(function (x) {
          return '<div class="qi ' + (x.st === "running" ? "running" : "") + '"><span class="rk">rank ' + x.rank + " · p" + x.pri + "</span><div><div style=\"font-size:14px;font-weight:600\">" + esc(x.label) + '</div><div class="bar" style="margin-top:6px"><i class="e" style="width:' + Math.round(x.got * 100) + '%"></i></div></div><span class="chip ' + (x.st === "running" ? "ember" : x.st === "done" ? "ok" : "") + '">' + x.st + "</span></div>";
        }).join("");
      }
      $("#kGo", root).addEventListener("click", function () {
        var label = "Mine " + $("#kZ", root).value + " for " + $("#kB", root).value + " until " + $("#kU", root).value;
        q.push({ id: nid, label: label, rank: +$("#kO", root).value, pri: +$("#kP", root).value, arr: nid++, want: 1, got: 0, st: "queued" });
        log("queued", label); order(); draw();
      });
      timer = setInterval(function () {
        if (!document.body.contains(root)) { clearInterval(timer); return; }
        var r = q.filter(function (x) { return x.st === "running"; })[0]; if (!r) return;
        r.got = Math.min(1, r.got + .04 + Math.random() * .03);
        if (r.got >= 1) { r.st = "done"; log("done", r.label); order(); }
        draw();
      }, 700);
      log("running", q[0].label); order(); draw();
    }
  };

  var ACCESS_ROWS = [["1", "at most max notes", "count"], ["2", "record size", "size"], ["3", "SN4U checks 1–4", "proof"], ["4", "binding = SHA-256(origin) ‖ current or previous epoch", "binding"], ["5", "one priced algorithm", "algorithm"], ["6", "no record twice", "duplicate"], ["7", "not in the spent-set", "spent"], ["8", "total weight ≥ w(14z00)", "amount"], ["9", "caller proof (keyed only)", "caller"], ["10", "work hash, heaviest first", "proof"]];
  function accessChecks(failAt, keyed) {
    return "<thead><tr><th>#</th><th>Check</th><th>Result</th></tr></thead><tbody>" + ACCESS_ROWS.map(function (r, i) {
      var n = i + 1, res = failAt == null ? "—" : n < failAt ? '<span class="seal-sm">' + U().I.check + "pass</span>" : n === failAt ? '<span class="seal-sm bad">' + U().I.x + r[2] + "</span>" : '<span class="muted">not run</span>';
      if (n === 9 && !keyed && failAt != null && n < failAt) res = '<span class="muted">skipped</span>';
      return '<tr><td class="mono">' + r[0] + "</td><td>" + r[1] + (n <= 9 ? ' <span class="muted" style="font-size:11px">· no hashing</span>' : "") + "</td><td>" + res + "</td></tr>";
    }).join("") + "</tbody>";
  }
  function accessBindShort(ep) { return U().short(SN.hex(SN.sha256(SN.utf8("https://api.example"))) + ep.toString(16).padStart(8, "0"), 12, 8); }

  /* =====================================================================
   * SNP-09 Access paid in work
   * ===================================================================== */
  TOOLS.access = {
    html: function () {
      return '<div class="row" style="justify-content:space-between"><div class="tabs" role="tablist" id="xTabs" style="border:0"><button role="tab" aria-selected="true" data-m="http">HTTP API</button><button role="tab" aria-selected="false" data-m="mcp">MCP tool</button></div>' +
        '<label class="row" style="font-size:14px;font-weight:600"><input type="checkbox" id="xKeyed" style="width:18px;height:18px;accent-color:var(--ember-fill)">Keyed mode (caller proof)</label></div>' +
        '<div class="tool" style="margin-top:16px"><div class="panel stack"><h3>Service</h3><dl class="kv"><dt>Origin</dt><dd>https://api.example</dd><dt>Price</dt><dd>sha256d · 14z00</dd><dt>Epoch</dt><dd id="xEp">7</dd><dt>Binding</dt><dd id="xBind">' + accessBindShort(7) + '</dd></dl>' +
        '<div class="stack"><button class="btn" id="x1" type="button">1 · Call without paying</button><button class="btn primary" id="x2" type="button" disabled>2 · Mine a 14z00 note and retry</button><button class="btn" id="x3" type="button" disabled>3 · Replay the same note</button><button class="btn" id="x4" type="button">Advance two epochs</button></div>' +
        '<div class="meter"><i id="xM"></i></div><span class="mono muted" id="xP" style="font-size:12px"></span><p class="hint">No account, no API key. A note is spendable only at the origin and epoch it was mined for, and only once.</p></div>' +
        '<div class="out"><div class="http" id="xLog"><div class="state">Press step 1 to make an unpaid call.</div></div><div class="panel"><h3>Service checks</h3><div class="scroll-x" style="margin-top:8px"><table class="t" id="xChecks">' + accessChecks(null, false) + '</table></div></div></div></div>';
    },
    mount: function (root) {
      var mode = "http", epoch = 7, note = null, spent = {}, ORIGIN = "https://api.example";
      $("#xTabs", root).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; $$("button", this).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); }); mode = b.dataset.m; reset(); });
      function bindHex(ep) { return SN.hex(SN.sha256(SN.utf8(ORIGIN))) + ep.toString(16).padStart(8, "0"); }
      function priceHdr() { return "g=sha256d;z=14z00;epoch=" + epoch + ";until=" + (1763300000 + epoch * 3600) + ";period=3600;max=16" + ($("#xKeyed", root).checked ? ";keyed=1" : ""); }
      function msg(cls, title, right, body) { return '<div class="msg ' + cls + ' fadein"><header><span>' + title + "</span><span>" + right + "</span></header><pre>" + esc(body) + "</pre></div>"; }
      function push(html) { var l = $("#xLog", root); if ($(".state", l)) l.innerHTML = ""; l.insertAdjacentHTML("beforeend", html); }
      function checks(failAt) { $("#xChecks", root).innerHTML = accessChecks(failAt, $("#xKeyed", root).checked); }
      function reset() { note = null; $("#xLog", root).innerHTML = '<div class="state">Press step 1 to make an unpaid call.</div>'; $("#x2", root).disabled = true; $("#x3", root).disabled = true; checks(null); $("#xBind", root).textContent = U().short(bindHex(epoch), 12, 8); $("#xEp", root).textContent = epoch; }
      function request(withNote) {
        var keyed = $("#xKeyed", root).checked;
        if (mode === "http") return "GET /v1/search?q=ostrich HTTP/1.1\nHost: api.example" + (withNote ? "\nSharenote: " + U().short(SN.hex(withNote), 40, 12) + (keyed ? "\nSharenote-Auth: eyJraW5kIjoyNzIzNSwidGFncyI6W1sidSIs…  (NIP-98, signs this payment)" : "") : "");
        return JSON.stringify({ jsonrpc: "2.0", id: 7, method: "tools/call", params: Object.assign({ name: "search", arguments: { q: "ostrich" } }, withNote ? { _meta: { sharenote: [U().short(SN.hex(withNote), 40, 12)] } } : {}) }, null, 2);
      }
      function r402(err) {
        if (mode === "http") return "HTTP/1.1 402 Payment Required\nSharenote-Price: " + priceHdr() + (err ? "\nSharenote-Error: " + err : "");
        return JSON.stringify({ jsonrpc: "2.0", id: 7, error: Object.assign({ code: 402, message: err ? "payment refused" : "work required", data: { price: priceHdr() } }, err ? { data: { price: priceHdr(), error: err } } : {}) }, null, 2);
      }
      function r200() { return mode === "http" ? 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"results":[{"title":"Ostriches run at 70 km/h"}]}' : JSON.stringify({ jsonrpc: "2.0", id: 7, result: { content: [{ type: "text", text: "Ostriches run at 70 km/h" }] } }, null, 2); }
      function serve(rec) {
        var v = SN.verifyRecord(rec), f = v.fields, bh = f ? SN.hex(f.binding) : "", key = SN.hex(SN.sha256(rec));
        var okBind = bh === bindHex(epoch) || bh === bindHex(epoch - 1);
        if (!okBind) return { fail: 4, err: "binding" };
        if (spent[key]) return { fail: 7, err: "spent" };
        if (v.verdict !== "ATTRIBUTED") return { fail: 10, err: "proof" };
        spent[key] = 1; return { ok: true };
      }
      $("#x1", root).addEventListener("click", function () { push(msg("req", "Request", mode === "http" ? "HTTP" : "MCP over HTTP", request(null))); push(msg("r402", "402 · unpaid", "price, no error", r402(null))); checks(null); $("#x2", root).disabled = false; });
      $("#x2", root).addEventListener("click", function () {
        var btn = this; btn.disabled = true; $("#xP", root).textContent = "mining…";
        var ep = epoch, b = SN.unhex(bindHex(ep));
        window.SNMine.start({ algorithm: "sha256d", identity: SN.unhex(SN_FIX.G), zbit: { z: 14, cc: 0 }, binding: b }, function (p) { $("#xM", root).style.width = Math.min(100, 100 * p.tries / 32768) + "%"; $("#xP", root).textContent = U().group(p.tries) + " hashes · " + U().fmtRate(p.rate); }, function (res) {
          if (!res) { btn.disabled = false; return; }
          note = res.record; $("#xM", root).style.width = "100%"; $("#xP", root).textContent = "Mined in " + (res.ms / 1000).toFixed(2) + " s · " + U().group(res.tries) + " hashes";
          push(msg("req", "Request", "with payment", request(note)));
          var r = serve(note);
          if (r.ok) { push(msg("r200", "200 · served", "note recorded as spent", r200())); checks(11); }
          else { push(msg("rbad", "402 · refused", r.err, r402(r.err))); checks(r.fail); }
          $("#x3", root).disabled = false;
        });
      });
      $("#x3", root).addEventListener("click", function () { if (!note) return; push(msg("req", "Request", "same note again", request(note))); var r = serve(note); push(msg("rbad", "402 · refused", r.err || "?", r402(r.err))); checks(r.fail); });
      $("#x4", root).addEventListener("click", function () { epoch += 2; $("#xEp", root).textContent = epoch; $("#xBind", root).textContent = U().short(bindHex(epoch), 12, 8); if (note) { push(msg("req", "Request", "old note, epoch now " + epoch, request(note))); var r = serve(note); push(msg("rbad", "402 · refused", r.err, r402(r.err))); checks(r.fail); } else U().toast("Epoch is now " + epoch); });
      $("#xKeyed", root).addEventListener("change", function () { U().toast(this.checked ? "Keyed: notes must share one identity and carry a NIP-98 proof" : "Bearer mode: whoever presents a note first spends it"); });
      reset();
    }
  };

  /* =====================================================================
   * SNP-03 Network directory
   * ===================================================================== */
  /* network notes view: pure builders, so the server can render the first view and nothing moves */
  function netFeedHtml(feed, filter) {
    var list = feed.filter(function (n) { return filter === "all" || n.alg === filter; });
    return list.length ? list.map(function (n) {
      return '<div class="item"><span class="zb">' + n.zbit + '</span><div style="min-width:0"><div class="who">' + n.alg + " · " + U().short(n.id, 8, 6) + '</div><div class="muted" style="font-size:12px">' + n.bind + " · " + (n.ago < 60 ? n.ago + " s" : Math.floor(n.ago / 60) + " min") + ' ago</div></div><span class="seal-sm' + (n.ok ? "" : " bad") + '">' + (n.ok ? U().I.check + "VERIFIED" : U().I.x + "DROPPED") + "</span></div>";
    }).join("") : '<div class="state">No ' + filter + " notes yet on these relays.</div>";
  }
  function netStatsHtml(feed) {
    var ok = feed.filter(function (n) { return n.ok; }), byAlg = {};
    ok.forEach(function (n) { (byAlg[n.alg] = byAlg[n.alg] || []).push(SN.parseZBit(n.zbit)); });
    return "<h3>Last 10 minutes</h3>" + Object.keys(byAlg).map(function (a) { return '<div class="row" style="justify-content:space-between"><span class="mono">' + a + '</span><span class="mono"><strong>' + SN.formatZBit(SN.addZBits(byAlg[a])) + '</strong> · ≈ ' + U().fmtRate(SN.estimateHashrate(byAlg[a], 600)) + "</span></div>"; }).join("") + '<p class="hint">Sums are per algorithm. Z-bits from different algorithms never add.</p>';
  }
  function netNotesHtml(feed, filter, paused) {
    return '<div class="row" style="justify-content:space-between;margin-bottom:12px">' + seg("nF", [["all", "All"], ["sha256d", "sha256d"], ["sha256d-aux", "sha256d-aux"], ["scrypt-aux", "scrypt-aux"]], filter) + '<button class="btn sm" id="nPause" type="button">' + (paused ? "Resume" : "Pause") + '</button></div><div class="grid g2" style="align-items:start"><div class="panel"><div class="feed" id="nFeed">' + netFeedHtml(feed, filter) + '</div></div><div class="stack"><div class="panel stack" id="nStats">' + netStatsHtml(feed) + '</div><div class="panel stack"><h3>How relays keep spam out</h3><p class="muted" style="font-size:14px">A PoW-gated relay stores a kind 1723 note only after it checks the work. Readers still check again. A note that fails is dropped, and shows here with a rose seal.</p></div></div></div>';
  }
  TOOLS.network = {
    html: function () {
      var R = SN_FIX.RELAYS;
      return '<div class="panel" style="margin-bottom:16px"><div class="row" style="justify-content:space-between"><div class="row">' + R.map(function (r) {
        return '<span class="chip ' + (r.state === "connected" ? "sig" : r.state === "error" ? "bad" : "draft") + '" title="' + r.state + '"><span class="dot"></span>' + esc(r.url.replace("wss://", "")) + (r.gate ? " · PoW-gated" : "") + "</span>";
      }).join("") + '</div><span class="muted" style="font-size:12px">Example data · 2 of 4 relays connected</span></div></div>' +
        '<div class="tabs" role="tablist" id="nTabs"><button role="tab" aria-selected="true" data-t="notes">Live notes · 1723</button><button role="tab" aria-selected="false" data-t="prov">Providers · 31724</button><button role="tab" aria-selected="false" data-t="nsp">NSPs · 31725</button><button role="tab" aria-selected="false" data-t="pay">Pay · 31726</button></div><div id="nBody" style="margin-top:20px">' + netNotesHtml(SN_FIX.NOTES.slice(0, 14), "all", false) + '</div>';
    },
    mount: function (root) {
      var F = SN_FIX, timer = null, filter = "all", paused = false, feed = F.NOTES.slice(0, 14);
      function notes() { return netNotesHtml(feed, filter, paused); }
      function drawFeed() { $("#nFeed", root).innerHTML = netFeedHtml(feed, filter); $("#nStats", root).innerHTML = netStatsHtml(feed); }
      function prov() {
        return '<div class="grid g3">' + F.PROVIDERS.map(function (p) {
          return '<div class="card-dir"><div class="top"><div style="min-width:0"><h3>' + esc(p.name) + '</h3><div class="npub">' + U().short(p.id, 10, 6) + '</div></div><span class="chip ' + (p.live ? "sig" : "") + '"><span class="dot"></span>' + (p.live ? "live" : "offline") + '</span></div><dl class="kv"><dt>Algorithm</dt><dd>' + p.alg + "</dd><dt>Up to</dt><dd>" + p.maxZ + " · " + p.max + " notes</dd><dt>Price</dt><dd>" + p.price.amount + " sat per " + p.price.z + "</dd><dt>Horizon</dt><dd>" + U().fmtDur(p.horizon) + '</dd></dl><p class="muted" style="font-size:13px">' + esc(p.note) + '</p><a class="btn sm' + (p.live ? "" : " ghost") + '" href="#tool-buy">' + (p.live ? "Order notes" : "Unavailable") + "</a></div>";
        }).join("") + "</div>";
      }
      function nsp() {
        return '<div class="scroll-x"><table class="t"><thead><tr><th>Operator</th><th>Chain</th><th>Algorithm</th><th>Endpoint</th><th class=n>Fee</th></tr></thead><tbody>' + F.NSPS.map(function (n) {
          var c = F.CHAINS[n.chain]; return "<tr><td><strong>" + esc(n.name) + '</strong><div class="npub">' + U().short(n.id, 8, 6) + "</div></td><td>" + c.name + '<div class="npub">genesis ' + U().short(c.genesis, 8, 6) + '</div></td><td class="mono">' + c.alg + '</td><td class="mono" style="font-size:12px">' + esc(n.url) + '</td><td class="n">' + (n.fee ? (n.fee / 1e4).toFixed(2) + "%" : "none") + "<div class=\"npub\">" + n.fee + " ppm</div></td></tr>";
        }).join("") + '</tbody></table></div><p class="muted" style="font-size:13px;margin-top:12px">An NSP serves block templates over gRPC. You mine with your own commitment, every share is a merged note, and blocks pay you. <a href="#tool-merged">See how</a>.</p>';
      }
      function pay() {
        return '<div class="grid g2">' + F.PAYS.map(function (p) {
          return '<div class="card-dir"><div class="top"><h3>' + p.who + '</h3><span class="chip">' + (p.d === "lightning" ? "lightning" : F.CHAINS[p.d].name) + '</span></div><dl class="kv"><dt>Method</dt><dd>' + p.method + "</dd><dt>Destination</dt><dd>" + esc(U().short(p.dest, 18, 6)) + "</dd><dt>Minimum</dt><dd>" + U().group(p.min) + " " + (p.method === "lightning" ? "sat" : "units") + "</dd></dl></div>";
        }).join("") + '</div><p class="muted" style="font-size:13px;margin-top:12px">Issuers pay each identity at its announced destination. With none, they ask for an invoice by DM.</p>';
      }
      function show(t) {
        clearInterval(timer);
        $("#nBody", root).innerHTML = t === "notes" ? notes() : t === "prov" ? prov() : t === "nsp" ? nsp() : pay();
        if (t === "notes") {
          onSeg(root, "nF", function (v) { filter = v; drawFeed(); });
          $("#nPause", root).addEventListener("click", function () { paused = !paused; this.textContent = paused ? "Resume" : "Pause"; });
          drawFeed();
          timer = setInterval(function () {
            if (!document.body.contains(root)) { clearInterval(timer); return; }
            if (paused) return;
            var n = F.NOTES[Math.floor(Math.random() * F.NOTES.length)];
            feed.unshift({ alg: n.alg, zbit: n.zbit, id: F.hexid(), bind: n.bind, ago: 0, ok: Math.random() > .05 });
            feed.forEach(function (x, i) { if (i) x.ago += 2; }); feed = feed.slice(0, 16); drawFeed();
          }, 2000);
        }
      }
      $("#nTabs", root).addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; $$("button", this).forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); }); show(b.dataset.t); });
      show("notes");
    }
  };
})();
