/* mobile.js — the phone app layer: tab bar, sheets, sticky actions, swipe/flip, step flows. Desktop is untouched. */
(function () {
  "use strict";
  var mq = matchMedia("(max-width: 767px), (orientation: landscape) and (max-height: 500px)");
  var isM = function () { return mq.matches; };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var U = function () { return window.UI; };
  var reduced = matchMedia("(prefers-reduced-motion: reduce)");
  function buzz(p) { try { if (navigator.vibrate && !reduced.matches) navigator.vibrate(p || 12); } catch (e) {} }

  /* ---------- tab bar ---------- */
  var ICON = {
    home: '<path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z"/>',
    learn: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM13 4h5.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13z"/>',
    specs: '<path d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    tools: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    network: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="18" r="2.5"/><path d="M8 7.5 10.8 16M16 7.5 13.2 16M8.5 6h7"/>'
  };
  var TABS = [["home", "Home"], ["learn", "Learn"], ["specs", "Specs"], ["tools", "Tools"], ["network", "Network"]];
  function tabOf(h) { return /^(learn|glossary)/.test(h) ? "learn" : /^(specs|snp-|build)/.test(h) ? "specs" : /^tool/.test(h) ? "tools" : h === "network" ? "network" : "home"; }
  function ensureTabbar() {
    if ($(".tabbar")) return;
    var n = document.createElement("nav"); n.className = "tabbar"; n.setAttribute("aria-label", "Sections");
    n.innerHTML = TABS.map(function (t) { return '<a href="#' + t[0] + '" data-tab="' + t[0] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[t[0]] + "</svg><span>" + t[1] + "</span></a>"; }).join("");
    n.addEventListener("touchstart", function () { buzz(6); }, { passive: true });
    document.body.appendChild(n);
  }
  var lastY = 0;
  window.addEventListener("scroll", function () {
    var y = window.scrollY;
    if (y > lastY + 8 && y > 140) document.body.classList.add("tb-hide");
    else if (y < lastY - 8 || y < 60) document.body.classList.remove("tb-hide");
    lastY = y;
    var rb = $(".readbar"); if (rb) { var max = document.documentElement.scrollHeight - innerHeight; rb.style.width = (max > 0 ? Math.min(100, 100 * y / max) : 0) + "%"; }
  }, { passive: true });

  /* ---------- bottom sheets ---------- */
  var cur = null;
  function openSheet(title, content, onClose) {
    closeSheet(true);
    var bd = document.createElement("div"); bd.className = "sheet-bd";
    var sh = document.createElement("div"); sh.className = "sheet"; sh.setAttribute("role", "dialog"); sh.setAttribute("aria-modal", "true"); sh.setAttribute("aria-label", title);
    sh.innerHTML = '<div class="sheet-grab"><span></span></div><div class="sheet-h"><h3></h3><button class="icon-btn sheet-x" type="button" aria-label="Close">' + U().I.x + '</button></div><div class="sheet-b"></div>';
    $("h3", sh).textContent = title;
    var body = $(".sheet-b", sh);
    if (typeof content === "string") body.innerHTML = content; else body.appendChild(content);
    document.body.appendChild(bd); document.body.appendChild(sh);
    document.documentElement.classList.add("sheet-lock");
    requestAnimationFrame(function () { bd.classList.add("open"); sh.classList.add("open"); });
    cur = { bd: bd, sh: sh, onClose: onClose };
    try { history.pushState({ sheet: 1 }, "", location.href); } catch (e) {}
    bd.addEventListener("click", function () { closeSheet(); });
    $(".sheet-x", sh).addEventListener("click", function () { closeSheet(); });
    var y0 = null, dy = 0;
    function down(e) { y0 = e.clientY; dy = 0; sh.style.transition = "none"; (e.target.setPointerCapture && e.pointerId != null) && e.target.setPointerCapture(e.pointerId); }
    function move(e) { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); sh.style.transform = "translateY(" + dy + "px)"; }
    function up() { if (y0 == null) return; y0 = null; sh.style.transition = ""; sh.style.transform = ""; if (dy > 110) closeSheet(); }
    [$(".sheet-grab", sh), $(".sheet-h", sh)].forEach(function (el) { el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); });
    setTimeout(function () { var f = $(".sheet-x", sh); if (f) f.focus({ preventScroll: true }); }, 50);
    buzz(8);
    return sh;
  }
  function closeSheet(silent) {
    if (!cur) return; var c = cur; cur = null;
    c.sh.classList.remove("open"); c.bd.classList.remove("open");
    document.documentElement.classList.remove("sheet-lock");
    setTimeout(function () { c.sh.remove(); c.bd.remove(); }, 300);
    if (c.onClose) c.onClose();
    if (!silent && history.state && history.state.sheet) history.back();
  }
  window.addEventListener("popstate", function () { if (cur) closeSheet(true); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && cur) closeSheet();
    if (e.key === "Tab" && cur) { var f = $$("button, a, input, select, textarea", cur.sh).filter(function (x) { return !x.disabled && x.offsetParent; }); if (!f.length) return; var a = f[0], z = f[f.length - 1]; if (e.shiftKey && document.activeElement === a) { z.focus(); e.preventDefault(); } else if (!e.shiftKey && document.activeElement === z) { a.focus(); e.preventDefault(); } }
  });
  window.SNSheet = { open: openSheet, close: closeSheet };

  /* panels marked data-sheet collapse into a chip row; tapping a chip moves the live panel into a sheet */
  function sheetables(root) {
    var ps = $$("[data-sheet]", root); if (!ps.length) return;
    var row = $(".sheet-chips", root), ssr = !!row;
    if (!row) { row = document.createElement("div"); row.className = "sheet-chips"; }
    ps.forEach(function (p, i) {
      var mark = document.createComment("sheet-slot"); p.parentNode.insertBefore(mark, p); p.classList.add("m-hidden");
      var b = ssr ? $$("button", row)[i] : document.createElement("button");
      if (!ssr) { b.type = "button"; b.className = "btn sm"; b.innerHTML = U().esc(p.dataset.sheet) + " <span aria-hidden=\"true\">›</span>"; }
      b.addEventListener("click", function () {
        p.classList.remove("m-hidden");
        openSheet(p.dataset.sheet, p, function () { mark.parentNode && mark.parentNode.insertBefore(p, mark.nextSibling); p.classList.add("m-hidden"); });
      });
      if (!ssr) row.appendChild(b);
    });
    if (!ssr) ps[0].parentNode.insertBefore(row, ps[0]);
  }

  /* ---------- sticky primary action ---------- */
  function actionbar(h) {
    var old = $(".actionbar"); if (old) old.remove(); document.body.classList.remove("has-actionbar");
    var bar = document.createElement("div"); bar.className = "actionbar";
    bar.innerHTML = '<div class="ab-status" aria-live="polite"></div><button class="btn primary ab-btn" type="button"></button>';
    var ab = $(".ab-btn", bar), st = $(".ab-status", bar), src = null, sync;
    if (h === "tool-access") {
      var done = {};
      ["x1", "x2", "x3"].forEach(function (id) { var b = $("#" + id); if (b) b.addEventListener("click", function () { done[id] = 1; setTimeout(sync, 30); }); });
      var steps = [["x1", "Call the API (no payment)"], ["x2", "Mine 14z00 and retry"], ["x3", "Replay the same note"], ["x4", "Advance two epochs"]];
      sync = function () {
        var nx = steps.filter(function (s) { return !done[s[0]] || s[0] === "x4"; })[0], t = nx && $("#" + nx[0]);
        ab.textContent = nx ? nx[1] : ""; ab.disabled = !t || t.disabled; ab.dataset.target = nx ? nx[0] : "";
        st.textContent = ($("#xP") || {}).textContent || "Step " + (Object.keys(done).length + 1) + " of 3";
      };
      ab.addEventListener("click", function () { var t = $("#" + ab.dataset.target); if (t && !t.disabled) { buzz(10); t.click(); } });
      var stack = $("#x1") && $("#x1").parentNode; if (stack) stack.classList.add("m-src");
      var log = $("#xLog"); if (log) new MutationObserver(function () { var last = log.lastElementChild; if (last && last.scrollIntoView) last.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "center" }); }).observe(log, { childList: true });
      var mo = new MutationObserver(sync); ["#xLog", "#xP", "#x2", "#x3"].forEach(function (s) { var el = $(s); if (el) mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true }); });
    } else {
      src = $("[data-sticky]"); if (!src) return;
      var status = src.dataset.stickyStatus ? $(src.dataset.stickyStatus) : null;
      sync = function () { ab.textContent = src.textContent; ab.disabled = src.disabled; st.textContent = status ? status.textContent : ""; st.hidden = !status; };
      ab.addEventListener("click", function () { buzz(10); src.click(); });
      src.classList.add("m-src");
      var mo2 = new MutationObserver(sync); mo2.observe(src, { childList: true, subtree: true, characterData: true, attributes: true }); if (status) mo2.observe(status, { childList: true, subtree: true, characterData: true });
    }
    document.body.appendChild(bar); document.body.classList.add("has-actionbar"); sync();
  }

  /* ---------- the bill: tap to flip (record bytes on the back), hold to copy ---------- */
  var pressT = null, pressed = false;
  document.addEventListener("pointerdown", function (e) {
    if (!isM()) return; var b = e.target.closest(".bill[data-rec]"); if (!b) return;
    pressed = false; clearTimeout(pressT);
    pressT = setTimeout(function () { pressed = true; U().copy(b.dataset.rec); buzz([10, 30, 10]); }, 550);
  });
  ["pointerup", "pointercancel", "pointermove"].forEach(function (ev) { document.addEventListener(ev, function (e) { if (ev === "pointermove" && Math.abs(e.movementY || 0) + Math.abs(e.movementX || 0) < 4) return; clearTimeout(pressT); }); });
  document.addEventListener("click", function (e) {
    if (!isM()) return;
    var host = e.target.closest(".bill-host"); if (!host) return;
    if (pressed) { pressed = false; return; }
    var bill = $(".bill[data-rec]", host); if (!bill) return;
    var back = $(".bill-back", host);
    if (!back || back.dataset.rec !== bill.dataset.rec) {
      if (back) back.remove();
      back = document.createElement("div"); back.className = "bill-back"; back.dataset.rec = bill.dataset.rec;
      back.innerHTML = '<div class="row" style="justify-content:space-between"><strong>SN4U record</strong><span class="mono muted" style="font-size:11px">' + (bill.dataset.rec.length / 2) + ' bytes</span></div><div class="bytes"></div><div class="legend"></div><p class="hint">Tap to flip back · hold the note to copy the record</p>';
      U().renderBytes($(".bytes", back), $(".legend", back), SN.unhex(bill.dataset.rec));
      host.appendChild(back);
    }
    host.classList.toggle("flipped"); buzz(6);
  });
  function markBillHosts() { $$("#heroNote, #mNote").forEach(function (h) { h.classList.add("bill-host"); }); }

  /* ---------- home: denomination stepper with the size jokes inline ---------- */
  function homeStepper() {
    var sel = $("#heroZ"), w = $(".zstep-wrap"); if (!sel || !w || w.dataset.bound) return;
    w.dataset.bound = "1"; var z = 16;
    var bs = $$("button", w);
    function set(nz) {
      z = Math.max(8, Math.min(96, nz)); var f = z + "z00";
      $(".zv", w).innerHTML = '<span class="zn">' + f + "</span>";
      if (!$('option[value="' + f + '"]', sel) && ![].some.call(sel.options, function (o) { return o.text === f; })) { var o = document.createElement("option"); o.value = f; o.text = f; sel.insertBefore(o, sel.lastElementChild); }
      sel.value = f;
      var j = window.SNJoke ? window.SNJoke({ z: z, cc: 0 }) : null;
      $(".zjoke", w).textContent = j ? j.msg : ""; $(".zjoke", w).className = "zjoke " + (j ? j.cls : "");
      var mb = $("#heroMint"); if (mb && !mb.dataset.busy) mb.textContent = j && j.cls !== "ok" ? j.btn : "Mint it in your browser";
    }
    bs[0].addEventListener("click", function () { set(z - 1); buzz(6); });
    bs[1].addEventListener("click", function () { set(z + 1); buzz(6); });
    set(16);
  }

  /* ---------- history of value: swipe + flip cards + paging dots ---------- */
  function historySwiper() {
    var rail = $(".hov-rail"), dots = $(".hov-dots"); if (!rail || !dots || dots.dataset.bound) return;
    dots.dataset.bound = "1"; var eras = $$(".era", rail);
    var db = $$("button", dots);
    function active() { var i = Math.round(rail.scrollLeft / (eras[1].offsetLeft - eras[0].offsetLeft || 1)); db.forEach(function (b, k) { b.classList.toggle("on", k === i); }); }
    rail.addEventListener("scroll", active, { passive: true });
    db.forEach(function (b, i) { b.addEventListener("click", function () { rail.scrollTo({ left: eras[i].offsetLeft - eras[0].offsetLeft, behavior: "smooth" }); }); });
    rail.addEventListener("click", function (e) { var era = e.target.closest(".era"); if (era && isM()) { era.classList.toggle("flipped"); buzz(6); } });
    var now = eras.length - 1; requestAnimationFrame(function () { rail.scrollLeft = eras[now - 1].offsetLeft - eras[0].offsetLeft; active(); });
  }

  /* ---------- specs: "On this page" pill → sheet ---------- */
  function tocPill() {
    var toc = $(".toc"); if (!toc) return;
    var b = document.createElement("button"); b.type = "button"; b.className = "toc-pill"; b.innerHTML = "On this page";
    b.addEventListener("click", function () {
      var list = document.createElement("div"); list.className = "toc-sheet";
      $$("a", toc).forEach(function (a) { var x = document.createElement("button"); x.type = "button"; x.textContent = a.textContent; x.addEventListener("click", function () { closeSheet(); var el = document.getElementById(a.dataset.jump); if (el) setTimeout(function () { el.scrollIntoView({ behavior: "smooth" }); }, 320); }); list.appendChild(x); });
      openSheet("On this page", list);
    });
    $("#main").appendChild(b);
  }

  /* ---------- network: provider/NSP sheets, pull to refresh ---------- */
  function networkMobile() {
    var root = $("#toolRoot"); if (!root) return;
    root.addEventListener("click", function (e) {
      if (!isM()) return; var c = e.target.closest(".card-dir"); if (!c || e.target.closest("a")) return;
      var clone = c.cloneNode(true); clone.classList.add("in-sheet"); openSheet(($("h3", c) || {}).textContent || "Details", clone);
    });
    var ptr = document.createElement("div"); ptr.className = "ptr"; ptr.textContent = "Pull to refresh"; root.insertBefore(ptr, root.firstChild);
    var y0 = null, dy = 0;
    root.addEventListener("touchstart", function (e) { if (window.scrollY <= 0) { y0 = e.touches[0].clientY; dy = 0; } }, { passive: true });
    root.addEventListener("touchmove", function (e) { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); ptr.style.height = Math.min(64, dy * .5) + "px"; ptr.textContent = dy > 90 ? "Release to refresh" : "Pull to refresh"; }, { passive: true });
    root.addEventListener("touchend", function () {
      if (y0 == null) return; y0 = null;
      if (dy > 90) { ptr.textContent = "Asking relays…"; buzz(10); setTimeout(function () { ptr.style.height = "0"; var t = $('#nTabs [aria-selected="true"]'); if (t) t.click(); U().toast("Up to date"); }, 700); }
      else ptr.style.height = "0";
    });
  }

  /* ---------- search: full screen with quick chips on phones ---------- */
  new MutationObserver(function (ms) {
    if (!isM()) return;
    ms.forEach(function (m) { m.addedNodes.forEach(function (n) {
      if (!(n.classList && n.classList.contains("sdlg"))) return;
      var inp = $("#sIn", n), row = document.createElement("div"); row.className = "s-chips";
      row.innerHTML = '<button type="button" class="btn sm s-cancel">Cancel</button>' + ["1723", "mint", "402", "receipt", "Z-bit", "NSP", "offer"].map(function (q) { return '<button type="button" class="chip" data-q="' + q + '">' + q + "</button>"; }).join("");
      inp.parentNode.insertBefore(row, inp.nextSibling);
      row.addEventListener("click", function (e) {
        var b = e.target.closest("button"); if (!b) return;
        if (b.classList.contains("s-cancel")) { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })); return; }
        inp.value = b.dataset.q; inp.dispatchEvent(new Event("input"));
      });
      inp.setAttribute("enterkeyhint", "search");
    }); });
  }).observe(document.body, { childList: true });

  /* ---------- per-route enhancement ---------- */
  function fades() { $$(".scroll-x, .prose pre, .prose table, pre.code").forEach(function (el) { el.classList.toggle("fade-r", el.scrollWidth > el.clientWidth + 2); }); }
  function enhance(h) {
    h = h || document.body.dataset.route || "home";
    closeSheet(true);
    ensureTabbar();
    $$(".tabbar a").forEach(function (a) { if (a.dataset.tab === tabOf(h)) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
    var rb = $(".readbar"); if (rb) rb.remove();
    var tp = $(".toc-pill"); if (tp) tp.remove();
    document.body.classList.remove("tb-hide");
    $$(".in").forEach(function (i) { if (!i.getAttribute("enterkeyhint")) i.setAttribute("enterkeyhint", "done"); });
    if (!isM()) { var ab = $(".actionbar"); if (ab) ab.remove(); document.body.classList.remove("has-actionbar"); return; }
    markBillHosts();
    var main = $("#main");
    sheetables(main);
    actionbar(h);
    if (h === "home") { homeStepper(); historySwiper(); }
    if (/^learn-/.test(h)) { var b = document.createElement("div"); b.className = "readbar"; document.body.appendChild(b); }
    if (/^snp-/.test(h)) tocPill();
    if (h === "network") networkMobile();
    setTimeout(fades, 60);
  }
  document.addEventListener("sn:route", function (e) { enhance(e.detail); });
  mq.addEventListener("change", function () { location.reload(); });
  window.addEventListener("resize", function () { if (isM()) fades(); });
  // app.js boot dispatches "sn:route" once the page is mounted; that runs enhance()
})();
