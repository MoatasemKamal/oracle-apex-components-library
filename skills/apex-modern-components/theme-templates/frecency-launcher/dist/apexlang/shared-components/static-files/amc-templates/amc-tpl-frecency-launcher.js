/* Frecency Launcher: a launcher that learns. Every open of an entry is stored (time stamps only) in
   localStorage under amc-tpl-frecency-launcher:<appId>:<listId>. At page load each entry gets a
   frecency score (sum of 0.5 ^ (age / half-life) over its opens); the top 3 (or 4) move into the
   "Your most used" list, the rest keep the developer's order. List items are MOVED in the DOM, so
   keyboard and screen-reader order always match what is on screen, and the order never changes
   while the user looks at it: clicks are only recorded and take effect on the next page load.
   Nothing leaves the browser. Storage blocked: the template stays the plain list it rendered as.
   ES5, delegated listeners, textContent only. */
(function () {
  "use strict";
  if (window.amcTplFrecencyLauncher) { return; }

  var ROOT = "amc-TFrecencyLauncher";
  var SLUG = "amc-tpl-frecency-launcher";
  var DAY = 864e5;
  var MAX_STAMPS = 30;
  var FORGET_AFTER = 120 * DAY;
  var MIN_OPENS = 2;
  var C = function (part) { return "." + ROOT + "-" + part; };

  // ------------------------------------------------------------ storage (never throws)
  function storage() {
    try {
      var s = window.localStorage;
      s.setItem("amc-tpl-probe", "1");
      s.removeItem("amc-tpl-probe");
      return s;
    } catch (e) { return null; }
  }
  function readJSON(s, key) {
    try { var v = s.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }
  function writeJSON(s, key, value) {
    try { s.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function removeKey(s, key) { try { s.removeItem(key); } catch (e) { /* ignore */ } }

  // ------------------------------------------------------------ identity
  function appId() {
    var env = window.apex && window.apex.env;
    if (env && env.APP_ID) { return String(env.APP_ID); }
    var m = /\/r\/[^\/]+\/[^\/]+/.exec(location.pathname);
    if (m) { return m[0]; }
    m = /[?&]p=([^:&]+)/.exec(location.search);
    return m ? m[1] : location.pathname;
  }
  function storeKey(root) { return SLUG + ":" + appId() + ":" + (root.id || "list"); }

  // Stable key of an entry: Attribute 3 when set, else its link without session, checksum,
  // clear-cache and debug values (they change every login), else its label.
  var DROP = { session: 1, cs: 1, clear: 1, debug: 1, p_trace: 1, success_msg: 1 };
  function urlKey(raw) {
    raw = String(raw || "").trim();
    if (!raw || raw === "#" || /^javascript:/i.test(raw)) { return ""; }
    var u;
    try { u = new URL(raw, location.href); } catch (e) { return raw; }
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
  function entryKey(li) {
    if (li.amcTfrKey !== undefined) { return li.amcTfrKey; }
    var own = (li.getAttribute("data-key") || "").trim();
    var link = li.querySelector(C("link"));
    var label = li.querySelector(C("label"));
    var key = own ? "key:" + own : urlKey(link && link.getAttribute("href"));
    if (!key) { key = "text:" + (label ? label.textContent.trim() : ""); }
    li.amcTfrKey = key;
    return key;
  }

  // ------------------------------------------------------------ scoring
  function halfLife(root) { return (root.classList.contains(ROOT + "--fast") ? 3 : 10) * DAY; }
  function topCount(root) { return root.classList.contains(ROOT + "--four") ? 4 : 3; }

  function score(stamps, now, hl) {
    var s = 0;
    for (var i = 0; i < stamps.length; i++) {
      var age = Math.max(0, now - stamps[i]);
      s += Math.pow(0.5, age / hl);
    }
    return s;
  }

  function lang() {
    return document.documentElement.getAttribute("lang") || navigator.language || "en";
  }
  function relative(ms) {
    if (!window.Intl || !Intl.RelativeTimeFormat) { return ""; }
    var rtf = new Intl.RelativeTimeFormat(lang(), { numeric: "auto" });
    var min = Math.round(ms / 6e4);
    if (min < 60) { return rtf.format(-Math.max(min, 0), "minute"); }
    var h = Math.round(min / 60);
    if (h < 24) { return rtf.format(-h, "hour"); }
    var d = Math.round(h / 24);
    if (d < 14) { return rtf.format(-d, "day"); }
    return rtf.format(-Math.round(d / 7), "week");
  }

  // ------------------------------------------------------------ render
  function items(root) {
    return Array.prototype.slice.call(root.querySelectorAll(C("item")));
  }

  function clearMeta(li) {
    var old = li.querySelectorAll(C("rank") + "," + C("meta"));
    for (var i = 0; i < old.length; i++) { old[i].parentNode.removeChild(old[i]); }
    li.classList.remove("is-fav", "is-new");
  }

  function addMeta(li, rank, heat, lastUse, now, opened) {
    var link = li.querySelector(C("link"));
    if (!link) { return; }
    var r = document.createElement("span");
    r.className = ROOT + "-rank";
    r.setAttribute("aria-hidden", "true");
    r.textContent = String(rank);
    link.insertBefore(r, link.firstChild);
    var meta = document.createElement("span");
    meta.className = ROOT + "-meta";
    var bar = document.createElement("span");
    bar.className = ROOT + "-heat";
    bar.setAttribute("aria-hidden", "true");
    var fill = document.createElement("span");
    fill.className = ROOT + "-heatFill";
    bar.appendChild(fill);
    bar.style.setProperty("--amc-tfr-heat", String(Math.max(0.08, Math.min(1, heat))));
    meta.appendChild(bar);
    var when = relative(now - lastUse);
    if (when) {
      var t = document.createElement("span");
      t.className = ROOT + "-when";
      t.textContent = (opened ? opened + " " : "") + when;
      meta.appendChild(t);
    }
    link.appendChild(meta);
  }

  function restoreOrder(root) {
    var grid = root.querySelector(C("grid"));
    var all = items(root).sort(function (a, b) { return a.amcTfrIndex - b.amcTfrIndex; });
    for (var i = 0; i < all.length; i++) {
      clearMeta(all[i]);
      grid.appendChild(all[i]);
    }
  }

  function render(root, announce) {
    var s = storage();
    if (!s) { return; }
    var key = storeKey(root);
    var data = readJSON(s, key) || {};
    var used = data.e || {};
    var now = Date.now();
    var hl = halfLife(root);
    var list = items(root);
    var ranked = [];
    for (var i = 0; i < list.length; i++) {
      var k = entryKey(list[i]);
      var stamps = used[k] || [];
      if (stamps.length >= MIN_OPENS) {
        ranked.push({ li: list[i], score: score(stamps, now, hl), last: stamps[stamps.length - 1], idx: list[i].amcTfrIndex });
      }
    }
    ranked.sort(function (a, b) { return (b.score - a.score) || (a.idx - b.idx); });
    ranked = ranked.slice(0, topCount(root));

    restoreOrder(root);
    var top = root.querySelector(C("top"));
    var favs = root.querySelector(C("favs"));
    var restHead = root.querySelector(C("heading--rest"));
    var learned = ranked.length > 0;
    var names = [];
    var max = ranked.length ? ranked[0].score : 1;
    for (var r = 0; r < ranked.length; r++) {
      var li = ranked[r].li;
      li.classList.add("is-fav");
      addMeta(li, r + 1, ranked[r].score / max, ranked[r].last, now, root.getAttribute("data-opened"));
      top.appendChild(li);
      var label = li.querySelector(C("label"));
      names.push(label ? label.textContent.trim() : "");
    }
    root.classList.toggle("is-learned", learned);
    if (favs) { favs.hidden = !learned; }
    if (restHead) { restHead.hidden = !learned || items(root).length === ranked.length; }
    var head = root.querySelector(C("head"));
    if (head) { head.hidden = false; }
    var reset = root.querySelector(C("reset"));
    if (reset) { reset.hidden = !Object.keys(used).length; }

    // Announce only when the favourites differ from what this user saw last time.
    var sig = names.join("|");
    if (announce && learned && data.sig !== sig) {
      for (var n = 0; n < ranked.length; n++) {
        if (!data.sig || data.sig.split("|").indexOf(names[n]) === -1) { ranked[n].li.classList.add("is-new"); }
      }
      say(root, root.getAttribute("data-announce") + " " + names.join(", "));
      data.sig = sig;
      writeJSON(s, key, data);
    }
  }

  function say(root, text) {
    var status = root.querySelector(C("status"));
    if (!status) { return; }
    status.textContent = "";
    window.setTimeout(function () { status.textContent = text; }, 60);
  }

  function init(root) {
    if (root.amcTfrReady) { return; }
    root.amcTfrReady = true;
    var list = items(root);
    for (var i = 0; i < list.length; i++) { list[i].amcTfrIndex = i; }
    if (!storage()) { return; }
    root.classList.add("is-enhanced");
    render(root, true);
  }

  // ------------------------------------------------------------ record
  function record(li) {
    var root = li.closest("." + ROOT);
    var s = storage();
    if (!root || !s) { return; }
    var key = storeKey(root);
    var data = readJSON(s, key) || {};
    var used = data.e || {};
    var now = Date.now();
    var k = entryKey(li);
    var stamps = (used[k] || []).concat(now);
    used[k] = stamps.slice(-MAX_STAMPS);
    for (var name in used) {
      if (Object.prototype.hasOwnProperty.call(used, name)) {
        var last = used[name][used[name].length - 1];
        if (!last || now - last > FORGET_AFTER) { delete used[name]; }
      }
    }
    data.v = 1;
    data.e = used;
    writeJSON(s, key, data);
    var reset = root.querySelector(C("reset"));
    if (reset) { reset.hidden = false; }
  }

  function onActivate(e) {
    if (e.type === "auxclick" && e.button !== 1) { return; }
    var link = e.target.closest && e.target.closest(C("link"));
    if (!link) { return; }
    var li = link.closest(C("item"));
    if (li) { record(li); }
  }
  document.addEventListener("click", onActivate);
  document.addEventListener("auxclick", onActivate);

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest(C("reset"));
    if (!btn) { return; }
    var root = btn.closest("." + ROOT);
    var s = storage();
    if (!root || !s) { return; }
    removeKey(s, storeKey(root));
    // Every copy of this list on the page forgets together.
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) {
      if (roots[i].id === root.id && roots[i].amcTfrReady) { render(roots[i], false); }
    }
    say(root, root.getAttribute("data-reset-done") || "");
    var first = root.querySelector(C("link"));
    if (first) { first.focus(); }
  });

  // ------------------------------------------------------------ lifecycle
  var queued = false;
  function scan() {
    queued = false;
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
      for (var i = 0; i < records.length; i++) {
        if (records[i].addedNodes.length) { queue(); return; }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  // Back/forward cache: re-rank with the opens recorded since.
  window.addEventListener("pageshow", function (e) {
    if (!e.persisted) { return; }
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { if (roots[i].amcTfrReady) { render(roots[i], false); } }
  });
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", scan); } else { scan(); }

  window.amcTplFrecencyLauncher = { refresh: scan, key: storeKey };
})();
