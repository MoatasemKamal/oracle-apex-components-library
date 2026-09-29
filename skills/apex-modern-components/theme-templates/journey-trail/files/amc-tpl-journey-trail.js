/* Journey Trail: records the pages this user opens in this browser tab and renders "Continue where
   you left off" as a trail above the developer's destinations. The recorder runs on every page
   that loads this file (put the list on the pages that matter, on Page 0, or add the file to the
   application's JavaScript file URLs); when it is only on the home page, the page the user came
   back from (document.referrer, same application) is added too. Stored in sessionStorage under
   amc-tpl-journey-trail:<appId>: key, link, title, time, count; at most 25 pages; gone when the
   tab closes. Pages inside dialogs (iframes) are not recorded. Without JavaScript or storage the
   template is just the list of destinations. ES5, textContent only. */
(function () {
  "use strict";
  if (window.amcTplJourneyTrail) { return; }

  var ROOT = "amc-TJourneyTrail";
  var SLUG = "amc-tpl-journey-trail";
  var MAX = 25;
  var C = function (part) { return "." + ROOT + "-" + part; };

  // ------------------------------------------------------------ storage (never throws)
  function storage() {
    try {
      var s = window.sessionStorage;
      s.setItem("amc-tpl-probe", "1");
      s.removeItem("amc-tpl-probe");
      return s;
    } catch (e) { return null; }
  }
  function readJSON(s, key) { try { var v = s.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function writeJSON(s, key, v) { try { s.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } }

  // ------------------------------------------------------------ identity
  function appOf(u) {
    var m = /\/r\/[^\/]+\/[^\/]+/.exec(u.pathname);
    if (m) { return m[0].toLowerCase(); }
    var p = u.searchParams.get("p");
    return p ? p.split(":")[0] : u.pathname.replace(/[^\/]*$/, "");
  }
  function appId() {
    var env = window.apex && window.apex.env;
    if (env && env.APP_ID) { return String(env.APP_ID); }
    return appOf(new URL(location.href));
  }
  function storeKey() { return SLUG + ":" + appId(); }

  var DROP = { session: 1, cs: 1, clear: 1, debug: 1, p_trace: 1, success_msg: 1, request: 0 };
  function urlKey(raw) {
    raw = String(raw || "").trim();
    if (!raw || raw === "#" || /^javascript:/i.test(raw)) { return ""; }
    var u;
    try { u = new URL(raw, location.href); } catch (e) { return ""; }
    if (!/^(https?|file):$/.test(u.protocol)) { return ""; }
    var params = [];
    u.searchParams.forEach(function (v, k) {
      k = k.toLowerCase();
      if (DROP[k]) { return; }
      if (k === "p") {
        var p = v.split(":");
        v = [p[0], p[1], "", p[3] || "", "", "", p[6] || "", p[7] || ""].join(":").replace(/:+$/, "");
      }
      params.push(k + "=" + v);
    });
    params.sort();
    return u.pathname.replace(/\/+$/, "").toLowerCase() + (params.length ? "?" + params.join("&") : "") + (u.hash.length > 1 ? u.hash : "");
  }

  // Title of a page: the matching destination's text, else the current list entry, else a
  // cleaned document.title, else the friendly-URL page alias ("customer-details" -> "Customer details").
  function entryText(li) {
    var l = li && li.querySelector(C("label"));
    return l ? l.textContent.trim() : "";
  }
  function titleFor(key, isHere) {
    var items = document.querySelectorAll(C("item"));
    for (var i = 0; i < items.length; i++) {
      var a = items[i].querySelector(C("link"));
      if (a && urlKey(a.getAttribute("href")) === key) { return entryText(items[i]); }
    }
    if (isHere) {
      var cur = document.querySelector(C("item") + ".is-current");
      if (cur) { return entryText(cur); }
      var t = (document.title || "").trim();
      if (t) { return t; }
    }
    var m = /\/([^\/?#]+)(?:[?#]|$)/.exec(key);
    var alias = m ? decodeURIComponent(m[1]).replace(/[-_]+/g, " ") : "";
    return alias ? alias.charAt(0).toUpperCase() + alias.slice(1) : key;
  }

  function inDialog() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }

  function upsert(trail, step) {
    var n = 0;
    for (var i = trail.length - 1; i >= 0; i--) {
      if (trail[i].k === step.k) { n = trail[i].n || 1; trail.splice(i, 1); }
    }
    step.n = n + 1;
    trail.push(step);
    while (trail.length > MAX) { trail.shift(); }
  }

  // ------------------------------------------------------------ record this page
  var recorded = false;
  function record(force) {
    if ((recorded && !force) || inDialog()) { return; }
    var s = storage();
    if (!s) { return; }
    recorded = true;
    var key = storeKey();
    var trail = readJSON(s, key) || [];
    var here = urlKey(location.href);
    var now = Date.now();
    var fresh = true;
    try {
      var nav = window.performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
      fresh = !nav || nav.type === "navigate";
    } catch (e) { /* assume a fresh navigation */ }
    // Came back from a page that does not load this file? Add it just before this one.
    try {
      if (document.referrer && !force && fresh) {
        var ref = new URL(document.referrer);
        var refKey = urlKey(document.referrer);
        var last = trail.length ? trail[trail.length - 1].k : "";
        if (ref.origin === location.origin && appOf(ref) === appOf(new URL(location.href)) && refKey && refKey !== here && refKey !== last) {
          upsert(trail, { k: refKey, h: document.referrer, t: titleFor(refKey, false), at: now - 1000 });
        }
      }
    } catch (e) { /* ignore referrer */ }
    var lastStep = trail[trail.length - 1];
    if (here && lastStep && lastStep.k === here && !fresh && !force) {
      lastStep.at = now; // reload or back/forward to the same page: same visit
    } else if (here) {
      upsert(trail, { k: here, h: location.href, t: titleFor(here, true), at: now });
    }
    writeJSON(s, key, trail);
  }

  // ------------------------------------------------------------ render
  function lang() { return document.documentElement.getAttribute("lang") || navigator.language || "en"; }
  function ago(ms) {
    if (!window.Intl || !Intl.RelativeTimeFormat) { return ""; }
    var rtf = new Intl.RelativeTimeFormat(lang(), { numeric: "auto" });
    var sec = Math.round(ms / 1000);
    if (sec < 45) { return rtf.format(0, "second"); }
    var min = Math.round(sec / 60);
    if (min < 60) { return rtf.format(-min, "minute"); }
    return rtf.format(-Math.round(min / 60), "hour");
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = ROOT + "-" + cls; }
    if (text !== undefined) { e.textContent = text; }
    return e;
  }
  function icon(cls) {
    var i = el("span", "stepIcon");
    i.className += " fa " + cls;
    i.setAttribute("aria-hidden", "true");
    return i;
  }
  function limit(root) { return root.classList.contains(ROOT + "--long") ? 8 : 5; }

  function render(root) {
    var s = storage();
    if (!s) { return; }
    root.classList.add("is-enhanced");
    var trail = readJSON(s, storeKey()) || [];
    var here = urlKey(location.href);
    var now = Date.now();
    var box = root.querySelector(C("trail"));
    var steps = root.querySelector(C("steps"));
    var destHead = root.querySelector(C("heading--dest"));
    if (!box || !steps) { return; }
    while (steps.firstChild) { steps.removeChild(steps.firstChild); }

    var past = trail.filter(function (t) { return t.k !== here; }).slice(-limit(root));
    var current = null;
    for (var i = 0; i < trail.length; i++) { if (trail[i].k === here) { current = trail[i]; } }
    var times = !root.classList.contains(ROOT + "--noTimes");

    past.forEach(function (t, n) {
      var li = el("li", "step");
      var last = n === past.length - 1;
      if (last) { li.classList.add("is-resume"); }
      var a = el("a", "stepLink");
      if (/^(https?|file):/i.test(String(t.h))) { a.href = t.h; }
      a.appendChild(el("span", "stepDot"));
      var text = el("span", "stepText");
      text.appendChild(el("span", "stepTitle", t.t));
      var meta = el("span", "stepMeta");
      if (last) { meta.appendChild(el("span", "stepContinue", root.getAttribute("data-continue") || "")); }
      if (times) {
        var when = el("span", "stepTime", ago(now - t.at));
        when.setAttribute("data-at", String(t.at));
        meta.appendChild(when);
      }
      if (meta.firstChild) { text.appendChild(meta); }
      a.appendChild(text);
      if (last) { a.appendChild(icon("fa-arrow-right " + ROOT + "-stepGo")); }
      li.appendChild(a);
      steps.appendChild(li);
    });
    if (current && past.length) {
      var liH = el("li", "step");
      liH.classList.add("is-here");
      var span = el("span", "stepLink");
      span.setAttribute("aria-current", "page");
      span.appendChild(el("span", "stepDot"));
      var textH = el("span", "stepText");
      textH.appendChild(el("span", "stepTitle", current.t));
      var metaH = el("span", "stepMeta");
      metaH.appendChild(el("span", "stepHere", root.getAttribute("data-here") || ""));
      textH.appendChild(metaH);
      span.appendChild(textH);
      liH.appendChild(span);
      steps.appendChild(liH);
    }
    box.hidden = past.length === 0;
    if (destHead) { destHead.hidden = past.length === 0; }

    // Destinations visited in this tab get a quiet "Visited 5 minutes ago".
    var seenAt = {};
    trail.forEach(function (t) { seenAt[t.k] = t.at; });
    var items = root.querySelectorAll(C("item"));
    for (var j = 0; j < items.length; j++) {
      var old = items[j].querySelector(C("seen"));
      if (old) { old.parentNode.removeChild(old); }
      var link = items[j].querySelector(C("link"));
      var k = link ? urlKey(link.getAttribute("href")) : "";
      var at = k && k !== here ? seenAt[k] : 0;
      items[j].classList.toggle("is-visited", !!at);
      if (at && link) {
        var seen = el("span", "seen");
        var ic = el("span", "seenIcon");
        ic.className += " fa fa-check";
        ic.setAttribute("aria-hidden", "true");
        seen.appendChild(ic);
        var label = root.getAttribute("data-visited") || "";
        var seenText = el("span", "seenText", times && now - at >= 45000 ? label + " " + ago(now - at) : label);
        if (times) { seenText.setAttribute("data-at", String(at)); }
        seenText.setAttribute("data-label", label);
        seen.appendChild(seenText);
        link.appendChild(seen);
      }
    }
    // Keep the most recent step in view in a horizontal trail.
    if (steps.scrollWidth > steps.clientWidth) {
      var rtl = getComputedStyle(steps).direction === "rtl";
      steps.scrollLeft = rtl ? -steps.scrollWidth : steps.scrollWidth;
    }
  }

  function say(root, text) {
    var status = root.querySelector(C("status"));
    if (!status) { return; }
    status.textContent = "";
    window.setTimeout(function () { status.textContent = text; }, 60);
  }

  function renderAll() {
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { if (roots[i].amcTjtReady) { render(roots[i]); } }
  }

  function init(root) {
    if (root.amcTjtReady) { return; }
    root.amcTjtReady = true;
    render(root);
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(C("clear"));
    if (!btn) { return; }
    var root = btn.closest("." + ROOT);
    var s = storage();
    if (!s || !root) { return; }
    try { s.removeItem(storeKey()); } catch (err) { /* ignore */ }
    renderAll();
    say(root, root.getAttribute("data-cleared") || "");
    var first = root.querySelector(C("link"));
    if (first) { first.focus(); }
  });

  // In-page navigation (hash links) counts as a page too.
  window.addEventListener("hashchange", function () { record(true); renderAll(); });
  // Back/forward cache restores an old DOM: record again and refresh.
  window.addEventListener("pageshow", function (e) { if (e.persisted) { record(true); renderAll(); } });

  // Relative times stay fresh; nothing moves.
  window.setInterval(function () {
    var nodes = document.querySelectorAll(C("stepTime") + "," + C("seenText"));
    var now = Date.now();
    for (var i = 0; i < nodes.length; i++) {
      var at = +nodes[i].getAttribute("data-at");
      if (!at) { continue; }
      var t = ago(now - at);
      nodes[i].textContent = nodes[i].classList.contains(ROOT + "-seenText") ? (nodes[i].getAttribute("data-label") || "") + (now - at >= 45000 ? " " + t : "") : t;
    }
  }, 60000);

  // ------------------------------------------------------------ lifecycle
  var queued = false;
  function scan() {
    queued = false;
    record(false);
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { init(roots[i]); }
  }
  function queue() {
    if (queued) { return; }
    queued = true;
    (window.requestAnimationFrame || window.setTimeout)(scan);
  }
  if (window.apex && window.apex.jQuery) { window.apex.jQuery(document).on("apexafterrefresh", queue); }
  if (window.MutationObserver) {
    new MutationObserver(function (records) {
      for (var i = 0; i < records.length; i++) { if (records[i].addedNodes.length) { queue(); return; } }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", scan); } else { scan(); }

  window.amcTplJourneyTrail = { key: storeKey, refresh: renderAll };
})();
