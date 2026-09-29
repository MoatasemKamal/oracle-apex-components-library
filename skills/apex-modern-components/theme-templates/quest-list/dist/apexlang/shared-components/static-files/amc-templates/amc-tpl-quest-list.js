/* Quest List: an onboarding checklist. A task (list entry) completes by itself once the user has
   opened its link's page, or when the user ticks it. This file records visited pages on every
   page that loads it (plus the page the user came back from, and quest links as they are
   clicked), so the list works on the home page alone. Stored in localStorage:
     amc-tpl-quest-list:<appId>:visits     page keys (link without session values) -> first visit
     amc-tpl-quest-list:<appId>:<listId>   manual ticks, tasks already seen as done, celebrated
   Nothing leaves the browser; Reset progress forgets both for this list's tasks. Without
   JavaScript or storage the template is a plain numbered list of links. ES5, textContent only. */
(function () {
  "use strict";
  if (window.amcTplQuestList) { return; }

  var ROOT = "amc-TQuestList";
  var SLUG = "amc-tpl-quest-list";
  var MAX_VISITS = 300;
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
  function visitsKey() { return SLUG + ":" + appId() + ":visits"; }
  function listKey(root) { return SLUG + ":" + appId() + ":" + (root.id || "list"); }

  var DROP = { session: 1, cs: 1, clear: 1, debug: 1, p_trace: 1, success_msg: 1 };
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
  // A visit counts for a task when the page is the same and carries at least the task link's
  // values (the task "Orders" is done by /orders?p10_id=5 too). f?p links compare app and page.
  function split(key) {
    var h = key.indexOf("#");
    var hash = h >= 0 ? key.slice(h) : "";
    var rest = h >= 0 ? key.slice(0, h) : key;
    var q = rest.indexOf("?");
    return { path: q >= 0 ? rest.slice(0, q) : rest, params: q >= 0 ? rest.slice(q + 1).split("&") : [], hash: hash };
  }
  function covers(taskKey, visitKey) {
    if (!taskKey || !visitKey) { return false; }
    if (taskKey === visitKey) { return true; }
    var t = split(taskKey), v = split(visitKey);
    if (t.path !== v.path || t.hash !== v.hash) { return false; }
    for (var i = 0; i < t.params.length; i++) {
      var p = t.params[i];
      if (p.indexOf("p=") === 0) {
        var tp = p.slice(2).split(":"), found = false;
        for (var j = 0; j < v.params.length; j++) {
          if (v.params[j].indexOf("p=") === 0) {
            var vp = v.params[j].slice(2).split(":");
            found = tp[0] === vp[0] && tp[1] === vp[1];
          }
        }
        if (!found) { return false; }
      } else if (v.params.indexOf(p) === -1) { return false; }
    }
    return true;
  }

  // ------------------------------------------------------------ recorder
  function visit(key, s) {
    if (!key || !(s = s || storage())) { return; }
    var v = readJSON(s, visitsKey()) || {};
    if (!v[key]) {
      v[key] = Date.now();
      var keys = Object.keys(v);
      if (keys.length > MAX_VISITS) {
        keys.sort(function (a, b) { return v[a] - v[b]; });
        for (var i = 0; i < keys.length - MAX_VISITS; i++) { delete v[keys[i]]; }
      }
      writeJSON(s, visitsKey(), v);
    }
  }
  var recorded = false;
  function recordPage() {
    if (recorded) { return; }
    var s = storage();
    if (!s) { return; }
    recorded = true;
    visit(urlKey(location.href), s);
    try {
      if (document.referrer) {
        var ref = new URL(document.referrer);
        if (ref.origin === location.origin && appOf(ref) === appOf(new URL(location.href))) { visit(urlKey(document.referrer), s); }
      }
    } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------ state
  function items(root) { return Array.prototype.slice.call(root.querySelectorAll(C("item"))); }
  function taskKey(li) {
    var a = li.querySelector(C("link"));
    return a ? urlKey(a.getAttribute("href")) : "";
  }
  function stateKey(li) {
    var k = taskKey(li);
    var l = li.querySelector(C("label"));
    return k || "text:" + (l ? l.textContent.trim() : "");
  }
  function pointsOf(li) {
    var v = li.querySelector(C("ptsValue"));
    var n = v ? parseFloat(String(v.textContent).replace(/[^\d.\-]/g, "")) : NaN;
    return isFinite(n) && n > 0 ? n : 0;
  }
  function visitedBy(root, li, visits) {
    if (root.classList.contains(ROOT + "--manual")) { return false; }
    var k = taskKey(li);
    var match = (li.getAttribute("data-match") || "").trim().toLowerCase();
    for (var v in visits) {
      if (!Object.prototype.hasOwnProperty.call(visits, v)) { continue; }
      if (covers(k, v)) { return true; }
      if (match && v.indexOf(match) !== -1) { return true; }
    }
    return false;
  }
  function fill(text, map) {
    return String(text || "").replace(/\{(\w+)\}/g, function (m, k) { return k in map ? map[k] : m; });
  }
  function num(n) {
    try { return new Intl.NumberFormat(document.documentElement.getAttribute("lang") || undefined).format(n); } catch (e) { return String(n); }
  }

  // ------------------------------------------------------------ render
  function render(root, announce) {
    var s = storage();
    if (!s) { return; }
    var state = readJSON(s, listKey(root)) || {};
    var manual = state.m || {};
    var seen = state.seen || [];
    var visits = readJSON(s, visitsKey()) || {};
    var list = items(root);
    var done = 0, points = 0, max = 0, fresh = [], nextSet = false;

    list.forEach(function (li) {
      var sk = stateKey(li);
      var auto = visitedBy(root, li, visits);
      var own = manual[sk];
      var isDone = own === true || (own !== false && auto);
      var pts = pointsOf(li);
      max += pts;
      li.classList.toggle("is-done", isDone);
      li.classList.toggle("is-auto", isDone && own !== true && auto);
      li.classList.remove("is-next", "is-fresh");
      var tick = li.querySelector(C("tick"));
      var label = li.querySelector(C("label"));
      var name = label ? label.textContent.trim() : "";
      if (tick) {
        tick.hidden = false;
        tick.setAttribute("aria-pressed", isDone ? "true" : "false");
        tick.setAttribute("aria-label", root.getAttribute("data-mark") + ": " + name);
      }
      var st = li.querySelector(C("state"));
      if (st) {
        st.textContent = isDone ? root.getAttribute(li.classList.contains("is-auto") ? "data-by-visit" : "data-by-hand") : "";
      }
      if (isDone) {
        done++;
        points += pts;
        if (seen.indexOf(sk) === -1) {
          fresh.push({ li: li, name: name, pts: pts });
          seen.push(sk);
        }
      } else if (!nextSet) {
        nextSet = true;
        li.classList.add("is-next");
        if (st) { st.textContent = root.getAttribute("data-next") || ""; }
      }
    });
    // Unticked tasks may count again later.
    seen = seen.filter(function (k) {
      for (var i = 0; i < list.length; i++) { if (stateKey(list[i]) === k) { return list[i].classList.contains("is-done"); } }
      return false;
    });

    var total = list.length;
    var pct = total ? Math.round(done / total * 100) : 0;
    root.style.setProperty("--amc-tql-p", String(pct));
    var ring = root.querySelector(C("ring"));
    var progressText = fill(root.getAttribute("data-progress"), { done: num(done), total: num(total) });
    if (ring) { ring.setAttribute("aria-label", progressText); }
    var ringText = root.querySelector(C("ringText"));
    if (ringText) { ringText.textContent = num(done) + "/" + num(total); }
    var prog = root.querySelector(C("progress"));
    if (prog) { prog.textContent = progressText; }
    var pts = root.querySelector(C("points"));
    if (pts) {
      pts.textContent = max ? fill(root.getAttribute("data-points"), { points: num(points), max: num(max) }) : "";
      pts.hidden = !max;
    }
    var complete = total > 0 && done === total;
    root.classList.toggle("is-complete", complete);
    var head = root.querySelector(C("head"));
    if (head) { head.hidden = false; }
    var reset = root.querySelector(C("reset"));
    if (reset) { reset.hidden = done === 0 && !Object.keys(manual).length; }
    var fold = root.querySelector(C("fold"));
    if (fold && root.classList.contains(ROOT + "--fold")) {
      fold.hidden = !complete;
      var listEl = root.querySelector(C("list"));
      if (listEl && !listEl.id) { listEl.id = (root.id || ROOT) + "-tasks-" + (++uid); }
      if (listEl) { fold.setAttribute("aria-controls", listEl.id); }
      if (complete && !root.amcTqlFoldTouched) { fold.setAttribute("aria-expanded", "false"); }
      if (!complete) { fold.setAttribute("aria-expanded", "true"); }
      root.classList.toggle("is-folded", complete && fold.getAttribute("aria-expanded") === "false");
    }

    var messages = [];
    if (announce && fresh.length) {
      fresh.forEach(function (f) { f.li.classList.add("is-fresh"); });
      messages.push(root.getAttribute("data-completed") + " " + fresh.map(function (f) { return f.name + (f.pts ? " (+" + num(f.pts) + ")" : ""); }).join(", ") + ".");
    }
    if (complete && !state.cel && announce) {
      state.cel = true;
      celebrate(root);
      messages.push(fill(root.getAttribute("data-all-done"), { points: num(points) }));
    }
    if (!complete) { state.cel = false; }
    if (announce) {
      state.seen = seen;
      writeJSON(s, listKey(root), state);
    }
    if (messages.length) { say(root, messages.join(" ")); }
  }
  var uid = 0;

  function celebrate(root) {
    var burst = root.querySelector(C("burst"));
    if (!burst) { return; }
    while (burst.firstChild) { burst.removeChild(burst.firstChild); }
    root.classList.remove("is-celebrating");
    for (var i = 0; i < 16; i++) { burst.appendChild(document.createElement("i")).className = ROOT + "-spark"; }
    void root.offsetWidth;
    root.classList.add("is-celebrating");
    window.setTimeout(function () { root.classList.remove("is-celebrating"); }, 2600);
  }

  function say(root, text) {
    var status = root.querySelector(C("status"));
    if (!status) { return; }
    status.textContent = "";
    window.setTimeout(function () { status.textContent = text; }, 80);
  }

  function renderAll(announce) {
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { if (roots[i].amcTqlReady) { render(roots[i], announce); } }
  }

  function renderOthers(root) {
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { if (roots[i] !== root && roots[i].amcTqlReady) { render(roots[i], false); } }
  }

  function init(root) {
    if (root.amcTqlReady) { return; }
    root.amcTqlReady = true;
    if (!storage()) { return; }
    root.classList.add("is-enhanced");
    render(root, true);
  }

  // ------------------------------------------------------------ events
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) { return; }
    var tick = t.closest(C("tick"));
    var reset = t.closest(C("reset"));
    var fold = t.closest(C("fold"));
    var link = t.closest(C("link"));
    var root = t.closest("." + ROOT);
    var s = storage();
    if (!root || !s) { return; }
    var state = readJSON(s, listKey(root)) || {};
    state.m = state.m || {};
    if (tick) {
      var li = tick.closest(C("item"));
      var on = tick.getAttribute("aria-pressed") !== "true";
      state.m[stateKey(li)] = on;
      writeJSON(s, listKey(root), state);
      render(root, true); // the list the user is in announces; copies just follow
      renderOthers(root);
      tick.focus();
    } else if (reset) {
      var v = readJSON(s, visitsKey()) || {};
      items(root).forEach(function (li) {
        var k = taskKey(li);
        var match = (li.getAttribute("data-match") || "").trim().toLowerCase();
        for (var key in v) {
          if (Object.prototype.hasOwnProperty.call(v, key) && (covers(k, key) || (match && key.indexOf(match) !== -1))) { delete v[key]; }
        }
      });
      writeJSON(s, visitsKey(), v);
      try { s.removeItem(listKey(root)); } catch (err) { /* ignore */ }
      render(root, false);
      renderOthers(root);
      say(root, root.getAttribute("data-reset-done") || "");
      var first = root.querySelector(C("tick"));
      if (first) { first.focus(); }
    } else if (fold) {
      root.amcTqlFoldTouched = true;
      var open = fold.getAttribute("aria-expanded") !== "true";
      fold.setAttribute("aria-expanded", open ? "true" : "false");
      root.classList.toggle("is-folded", !open);
    } else if (link) {
      // Following a task's link is visiting its page; it shows as done when the user comes back.
      visit(taskKey(link.closest(C("item"))), s);
    }
  });
  window.addEventListener("hashchange", function () { visit(urlKey(location.href)); renderAll(true); });
  window.addEventListener("pageshow", function (e) { if (e.persisted) { renderAll(true); } });

  // ------------------------------------------------------------ lifecycle
  var queued = false;
  function scan() {
    queued = false;
    recordPage();
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

  window.amcTplQuestList = { refresh: function () { renderAll(true); }, keys: function (root) { return { visits: visitsKey(), list: listKey(root) }; }, covers: covers };
})();
