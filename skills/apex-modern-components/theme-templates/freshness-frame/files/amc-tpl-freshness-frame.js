/* Freshness Frame: region template script. Knows how old the data in the region is: shows
   "Updated just now / 3 min ago" in the header and burns a fuse along the top edge whose glow
   decays until the stale threshold (1, 5 or 15 minutes, or data-amc-stale-seconds). Then the frame
   turns to a warning "Out of date" state with a Refresh button that calls
   apex.region(id).refresh() when that API exists, and resets on apexafterrefresh. The data time is
   the page load, or a data-amc-updated ISO timestamp on the region or inside its body. One timer
   for all regions, every 10 seconds; nothing runs while the tab is hidden except on return.
   Without JavaScript the region is a plain frame. */
(function (w, d) {
  "use strict";
  if (w.amcTplFreshnessFrame) return;
  var ROOT = "amc-TFreshnessFrame", P = ROOT + "-", TICK = 10000, BUSY_MAX = 20000;
  var rtf = null, timer = null;

  function closest(el, cls) {
    while (el && el.nodeType === 1) { if (el.classList.contains(cls)) return el; el = el.parentNode; }
    return null;
  }
  function label(root, key, fallback) { return root.getAttribute("data-amc-label-" + key) || fallback; }
  function has(root, opt) { return root.classList.contains(ROOT + "--" + opt); }
  function parts(root) {
    if (root._amcFF) return root._amcFF;
    var p = {}, all = root.querySelectorAll("[class*='" + P + "']");
    for (var i = 0; i < all.length; i++) {
      if (closest(all[i].parentNode, ROOT) !== root) continue; // skip nested frames
      var m = /amc-TFreshnessFrame-(\w+)/.exec(typeof all[i].className === "string" ? all[i].className : "");
      if (m && !p[m[1]]) p[m[1]] = all[i];
    }
    if (!p.status || !p.age || !p.body) return null;
    root._amcFF = p;
    return p;
  }
  function thresholdMs(root) {
    var s = parseFloat(root.getAttribute("data-amc-stale-seconds"));
    if (s > 0) return s * 1000;
    if (has(root, "stale1")) return 60000;
    if (has(root, "stale5")) return 300000;
    if (has(root, "stale15")) return 900000;
    return 300000;
  }
  // The data time: data-amc-updated on the region or on an element inside the body (for example
  // a hidden span with the last load time), otherwise now.
  function dataTime(root, p) {
    var now = Date.now(), src = root.getAttribute("data-amc-updated");
    if (!src) { var e = p.body.querySelector("[data-amc-updated]"); if (e) src = e.getAttribute("data-amc-updated"); }
    var t = src ? Date.parse(src) : NaN;
    return isFinite(t) ? Math.min(t, now) : now;
  }
  function ago(root, ms) {
    var s = Math.max(0, ms / 1000);
    if (s < 45) return label(root, "now", "just now");
    var lang = d.documentElement.lang || undefined, v, unit;
    // Whole units elapsed, like a clock: 2 min ago until the third minute is complete.
    if (s < 3600) { v = Math.max(1, Math.floor(s / 60)); unit = "minute"; }
    else if (s < 86400) { v = Math.floor(s / 3600); unit = "hour"; }
    else if (s < 2592000) { v = Math.floor(s / 86400); unit = "day"; }
    else { v = Math.floor(s / 2592000); unit = "month"; }
    try {
      if (!rtf && w.Intl && Intl.RelativeTimeFormat) rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto", style: "short" });
      if (rtf) return rtf.format(-v, unit);
    } catch (e) { rtf = null; }
    return v + " " + unit + (v === 1 ? "" : "s") + " ago";
  }
  function regionApi(root) {
    if (!root.id || !w.apex || typeof w.apex.region !== "function") return null;
    try {
      var r = w.apex.region(root.id);
      return r && typeof r.refresh === "function" ? r : null;
    } catch (e) { return null; }
  }
  function announce(root, text) {
    var p = parts(root);
    if (!p || !p.live) return;
    p.live.textContent = "";
    setTimeout(function () { p.live.textContent = text; }, 60);
  }

  /* ------------------------------------------------------------ state */
  function update(root, now) {
    var p = parts(root), st = root._amcState;
    if (!p || !st) return;
    var age = now - st.t0, fresh = Math.max(0, Math.min(1, 1 - age / st.limit)), stale = age >= st.limit;
    root.style.setProperty("--amc-tff-fresh", fresh.toFixed(3));
    p.age.textContent = label(root, "updated", "Updated %0").replace("%0", ago(root, age));
    if (stale !== st.stale) {
      st.stale = stale;
      root.classList.toggle("is-stale", stale);
      if (p.flag) p.flag.textContent = stale ? label(root, "stale", "Out of date") : "";
      if (p.refresh) p.refresh.hidden = !(stale && regionApi(root));
      if (stale) announce(root, label(root, "stale-announce", "The data in this region may be out of date."));
    }
    if (stale && has(root, "autoRefresh") && !st.busy && !st.autoTried && d.visibilityState !== "hidden" && regionApi(root)) {
      st.autoTried = true;
      refresh(root);
    }
  }
  function reset(root, announceIt) {
    var p = parts(root), st = root._amcState;
    if (!p || !st) return;
    st.t0 = dataTime(root, p);
    st.limit = thresholdMs(root);
    st.autoTried = false;
    setBusy(root, false);
    var t = new Date(st.t0);
    p.age.setAttribute("datetime", t.toISOString());
    try { p.age.title = t.toLocaleString(d.documentElement.lang || undefined); } catch (e) { p.age.title = t.toString(); }
    // Jump back to full freshness without animating the fuse backwards.
    root.classList.add("is-resetting");
    update(root, Date.now());
    void root.offsetWidth;
    root.classList.remove("is-resetting");
    if (announceIt) {
      announce(root, label(root, "refreshed", "Data refreshed."));
      root.classList.remove("is-renewed");
      void root.offsetWidth;
      root.classList.add("is-renewed");
    }
  }
  function setBusy(root, busy) {
    var p = parts(root), st = root._amcState;
    if (!st) return;
    st.busy = busy;
    clearTimeout(st.busyTimer);
    root.classList.toggle("is-busy", busy);
    if (p.body) { if (busy) p.body.setAttribute("aria-busy", "true"); else p.body.removeAttribute("aria-busy"); }
    if (p.refresh) {
      p.refresh.disabled = busy;
      if (busy) p.refresh.setAttribute("aria-label", label(root, "refreshing", "Refreshing")); else p.refresh.removeAttribute("aria-label");
    }
    if (busy) st.busyTimer = setTimeout(function () { setBusy(root, false); }, BUSY_MAX);
  }
  function refresh(root) {
    var api = regionApi(root), st = root._amcState;
    if (!api || !st || st.busy) return;
    setBusy(root, true);
    try {
      var r = api.refresh();
      if (r && typeof r.then === "function") r.then(function () { if (st.busy) reset(root, true); }, function () { setBusy(root, false); });
    } catch (e) { setBusy(root, false); }
  }

  /* ------------------------------------------------------------ lifecycle */
  function init(root) {
    if (root._amcState) return;
    var p = parts(root);
    if (!p) return;
    root._amcState = { t0: Date.now(), limit: thresholdMs(root), stale: false, busy: false, autoTried: false };
    p.status.hidden = false;
    root.classList.add("is-live");
    reset(root, false);
    if (w.MutationObserver) {
      // Fallback for refreshes that do not trigger apexafterrefresh: new body content while we
      // are waiting for our own refresh counts as done.
      new MutationObserver(function () {
        if (root._amcState.busy) { clearTimeout(root._amcMo); root._amcMo = setTimeout(function () { if (root._amcState.busy) reset(root, true); }, 250); }
      }).observe(p.body, { childList: true, subtree: true });
    }
    if (!timer) timer = setInterval(tickAll, TICK);
  }
  function each(fn) {
    var roots = d.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) fn(roots[i]);
  }
  function tickAll() {
    if (d.visibilityState === "hidden") return;
    var now = Date.now();
    each(function (r) { update(r, now); });
  }
  function initAll() { each(init); }

  d.addEventListener("click", function (e) {
    var t = e.target && e.target.nodeType === 1 ? e.target : null, b = t && closest(t, P + "refresh"), root = b && closest(b, ROOT);
    if (root) refresh(root);
  });
  d.addEventListener("visibilitychange", function () {
    if (d.visibilityState !== "hidden") { each(init); tickAll(); }
  });
  if (w.apex && w.apex.jQuery) {
    var match = function (e, fn) {
      var t = e.target && e.target.nodeType === 1 ? e.target : null;
      each(function (r) { if (!t || r === t || r.contains(t) || t.contains(r)) { init(r); fn(r); } });
    };
    w.apex.jQuery(d).on("apexbeforerefresh", function (e) { match(e, function (r) { setBusy(r, true); }); });
    w.apex.jQuery(d).on("apexafterrefresh", function (e) { match(e, function (r) { reset(r, true); }); });
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", initAll); else initAll();

  w.amcTplFreshnessFrame = {
    init: initAll,
    tick: tickAll,
    refresh: function (elm) { var r = closest(elm, ROOT); if (r) { init(r); refresh(r); } },
    reset: function (elm) { var r = closest(elm, ROOT); if (r) { init(r); reset(r, true); } },
    state: function (elm) {
      var r = closest(elm, ROOT), s = r && r._amcState;
      return s ? { updated: new Date(s.t0).toISOString(), ageMs: Date.now() - s.t0, thresholdMs: s.limit, stale: s.stale, busy: s.busy } : null;
    }
  };
})(window, document);
