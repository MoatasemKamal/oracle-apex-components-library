/* Hick Menu: a long list (report catalogues, admin menus) cut into named groups (Attribute 1)
   of at most 7 visible entries each (Hick's law: fewer simultaneous choices; Miller's law:
   meaningful chunks), with "Show all 12 in Finance" for the rest, a filter box that appears
   only when the list is longer than a threshold, and the entries this user opened most
   recently on top. Recent entries live in localStorage under
     amc-tpl-hick-menu:<appId>:<listId>   [{ k: entry key, t: time }]
   and never leave the browser; Clear recent forgets them. Without JavaScript the template is a
   flat list of links with the group name beside each entry. ES5, textContent only. */
(function () {
  "use strict";
  if (window.amcTplHickMenu) { return; }

  var ROOT = "amc-THickMenu";
  var SLUG = "amc-tpl-hick-menu";
  var C = function (part) { return "." + ROOT + "-" + part; };
  var uid = 0;

  // ------------------------------------------------------------ storage (never throws)
  function storage() {
    try {
      var s = window.localStorage;
      s.setItem("amc-tpl-probe", "1");
      s.removeItem("amc-tpl-probe");
      return s;
    } catch (e) { return null; }
  }
  function readJSON(key) { var s = storage(); if (!s) { return null; } try { var v = s.getItem(key); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function writeJSON(key, v) { var s = storage(); if (!s) { return; } try { s.setItem(key, JSON.stringify(v)); } catch (e) { /* full or blocked */ } }
  function remove(key) { var s = storage(); if (!s) { return; } try { s.removeItem(key); } catch (e) { /* ignore */ } }

  function appId() {
    var env = window.apex && window.apex.env;
    if (env && env.APP_ID) { return String(env.APP_ID); }
    return location.pathname.replace(/[^\/]*$/, "");
  }
  function storeKey(root) { return SLUG + ":" + appId() + ":" + (root.getAttribute("data-list-key") || root.id || "list"); }

  // An entry is known by its link without session values, or by its text.
  function entryKey(li) {
    var a = li.querySelector(C("link"));
    var href = a ? String(a.getAttribute("href") || "") : "";
    href = href.replace(/([?&])session=[^&#]*&?/i, "$1").replace(/(f\?p=[^:]*:[^:]*:)[^:&#]*/i, "$1").replace(/([?&])cs=[^&#]*/i, "$1");
    var label = li.querySelector(C("label"));
    var text = label ? label.textContent.replace(/\s+/g, " ").trim() : "";
    return (href && href !== "#" ? href : "") + "|" + text;
  }

  function fill(text, map) {
    return String(text || "").replace(/\{(\w+)\}/g, function (m, k) { return k in map ? map[k] : m; });
  }
  function num(n) {
    try { return new Intl.NumberFormat(document.documentElement.getAttribute("lang") || undefined).format(n); } catch (e) { return String(n); }
  }
  function intAttr(root, name, fallback) {
    var n = parseInt(root.getAttribute(name), 10);
    return isFinite(n) && n > 0 ? n : fallback;
  }
  function chunkOf(root) {
    return root.classList.contains(ROOT + "--tight") ? 4 : intAttr(root, "data-chunk", 7);
  }
  // Case and accent insensitive; keeps Arabic letters, drops tashkeel.
  function norm(s) {
    s = String(s || "").toLowerCase();
    try { s = s.normalize("NFD"); } catch (e) { /* old engine */ }
    return s.replace(/[̀-ًͯ-ٰٟ]/g, "").replace(/\s+/g, " ").trim();
  }
  function textOf(el, part) { var n = el.querySelector(C(part)); return n ? n.textContent.replace(/\s+/g, " ").trim() : ""; }

  // ------------------------------------------------------------ build groups
  function build(root) {
    var list = root.querySelector(C("list"));
    if (!list) { return; }
    var items = Array.prototype.slice.call(list.children).filter(function (li) { return li.classList.contains(ROOT + "-item"); });
    var other = root.getAttribute("data-other") || "Other";
    var order = [], byName = {};
    items.forEach(function (li) {
      var name = (li.getAttribute("data-group") || "").trim() || other;
      if (!byName[name]) { byName[name] = []; order.push(name); }
      byName[name].push(li);
      li.amcThmKey = entryKey(li);
    });
    var host = document.createElement("div");
    host.className = ROOT + "-groups";
    host.id = (root.id || ROOT) + "-groups";
    var folded = root.classList.contains(ROOT + "--folded");
    order.forEach(function (name) {
      var id = (root.id || ROOT) + "-g" + (++uid);
      var sec = document.createElement("section");
      sec.className = ROOT + "-group";
      sec.setAttribute("aria-labelledby", id + "-h");
      sec.amcThmName = name;
      var h = document.createElement("h3");
      h.className = ROOT + "-groupHead";
      h.id = id + "-h";
      var toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = ROOT + "-groupToggle";
      toggle.setAttribute("aria-controls", id);
      var gName = document.createElement("span");
      gName.className = ROOT + "-groupName";
      gName.textContent = name;
      var gCount = document.createElement("span");
      gCount.className = ROOT + "-groupCount";
      gCount.textContent = num(byName[name].length);
      var chev = document.createElement("span");
      chev.className = ROOT + "-chevron fa fa-chevron-down";
      chev.setAttribute("aria-hidden", "true");
      toggle.appendChild(gName);
      toggle.appendChild(gCount);
      toggle.appendChild(chev);
      h.appendChild(toggle);
      var ul = document.createElement("ul");
      ul.className = ROOT + "-groupList";
      ul.id = id;
      byName[name].forEach(function (li) { ul.appendChild(li); });
      var more = document.createElement("button");
      more.type = "button";
      more.className = ROOT + "-more";
      more.setAttribute("aria-controls", id);
      more.setAttribute("aria-expanded", "false");
      var chip = document.createElement("span");
      chip.className = ROOT + "-moreCount";
      chip.setAttribute("aria-hidden", "true");
      var moreText = document.createElement("span");
      moreText.className = ROOT + "-moreText";
      more.appendChild(chip);
      more.appendChild(moreText);
      sec.appendChild(h);
      sec.appendChild(ul);
      sec.appendChild(more);
      host.appendChild(sec);
      var hasCurrent = byName[name].some(function (li) { return li.classList.contains("is-current"); });
      setOpen(sec, !folded || hasCurrent);
      sec.amcThmExpanded = false;
      if (hasCurrent) {
        // The current page is always visible: if it sits past the chunk, show the whole group.
        var idx = byName[name].filter(function (li) { return li.classList.contains("is-current"); })[0];
        sec.amcThmExpanded = byName[name].indexOf(idx) >= chunkOf(root);
      }
    });
    list.parentNode.insertBefore(host, list.nextSibling);
    list.hidden = true;
    root.amcThmItems = items;
  }

  function setOpen(sec, open) {
    sec.classList.toggle("is-closed", !open);
    var t = sec.querySelector(C("groupToggle"));
    if (t) { t.setAttribute("aria-expanded", open ? "true" : "false"); }
  }

  // ------------------------------------------------------------ chunking and filter
  function apply(root) {
    var chunk = chunkOf(root);
    var input = root.querySelector(C("input"));
    var q = input && !root.querySelector(C("tools")).hidden ? norm(input.value) : "";
    var words = q ? q.split(" ") : [];
    var total = 0, matches = 0;
    var secs = root.querySelectorAll(C("group"));
    for (var i = 0; i < secs.length; i++) {
      var sec = secs[i];
      var lis = sec.querySelectorAll(C("item"));
      var shown = 0, hit = 0;
      var hideable = lis.length - chunk >= 2; // never hide a single entry behind a button
      for (var j = 0; j < lis.length; j++) {
        var li = lis[j];
        total++;
        var ok = true;
        if (words.length) {
          if (!li.amcThmHay) { li.amcThmHay = norm([textOf(li, "label"), textOf(li, "desc"), textOf(li, "meta"), sec.amcThmName].join(" ")); }
          for (var w = 0; w < words.length; w++) { if (li.amcThmHay.indexOf(words[w]) === -1) { ok = false; break; } }
        }
        if (ok) { hit++; matches++; }
        var overflow = !words.length && hideable && !sec.amcThmExpanded && j >= chunk;
        li.classList.toggle("is-filtered", !ok);
        li.classList.toggle("is-overflow", overflow);
        if (ok && !overflow) { shown++; }
      }
      sec.hidden = words.length > 0 && hit === 0;
      sec.classList.toggle("is-filtering", words.length > 0);
      if (words.length && hit) { setOpen(sec, true); }
      var more = sec.querySelector(C("more"));
      var name = sec.amcThmName;
      more.hidden = words.length > 0 || !hideable;
      more.setAttribute("aria-expanded", sec.amcThmExpanded ? "true" : "false");
      sec.querySelector(C("moreText")).textContent = fill(root.getAttribute(sec.amcThmExpanded ? "data-show-fewer" : "data-show-all"), { count: num(lis.length), group: name });
      sec.querySelector(C("moreCount")).textContent = sec.amcThmExpanded ? "" : fill(root.getAttribute("data-more-count") || "+{count}", { count: num(Math.max(lis.length - chunk, 0)) });
    }
    var empty = root.querySelector(C("empty"));
    if (empty) {
      empty.hidden = !(words.length && matches === 0);
      empty.textContent = empty.hidden ? "" : fill(root.getAttribute("data-no-match"), { query: "“" + input.value.trim() + "”" });
    }
    var recent = root.querySelector(C("recent"));
    if (recent) { recent.classList.toggle("is-filtering", words.length > 0); }
    var clear = root.querySelector(C("clearFilter"));
    if (clear) { clear.hidden = !(input && input.value); }
    root.classList.toggle("is-filtering", words.length > 0);
    return { total: total, matches: matches, filtering: words.length > 0 };
  }

  // ------------------------------------------------------------ recent
  function recentList(root) {
    var v = readJSON(storeKey(root));
    return Object.prototype.toString.call(v) === "[object Array]" ? v : [];
  }
  function remember(root, li) {
    if (root.classList.contains(ROOT + "--noRecent")) { return; }
    var k = li.amcThmKey || entryKey(li);
    var list = recentList(root).filter(function (r) { return r && r.k !== k; });
    list.unshift({ k: k, t: Date.now() });
    writeJSON(storeKey(root), list.slice(0, 20));
  }
  function renderRecent(root) {
    var box = root.querySelector(C("recent"));
    var ul = root.querySelector(C("recentList"));
    if (!box || !ul) { return; }
    while (ul.firstChild) { ul.removeChild(ul.firstChild); }
    if (root.classList.contains(ROOT + "--noRecent")) { box.hidden = true; return; }
    var max = intAttr(root, "data-recent-max", 5);
    var byKey = {};
    (root.amcThmItems || []).forEach(function (li) { if (!byKey[li.amcThmKey]) { byKey[li.amcThmKey] = li; } });
    var n = 0;
    recentList(root).forEach(function (r) {
      if (n >= max || !r || !byKey[r.k]) { return; }
      var copy = byKey[r.k].cloneNode(true);
      copy.className = ROOT + "-recentItem" + (byKey[r.k].classList.contains("is-current") ? " is-current" : "");
      copy.removeAttribute("id");
      copy.amcThmKey = r.k;
      copy.amcThmSource = byKey[r.k];
      ul.appendChild(copy);
      n++;
    });
    box.hidden = n === 0;
  }

  function say(root, text) {
    var status = root.querySelector(C("status"));
    if (!status) { return; }
    status.textContent = "";
    window.setTimeout(function () { status.textContent = text; }, 60);
  }

  // ------------------------------------------------------------ init
  function init(root) {
    if (root.amcThmReady) { return; }
    root.amcThmReady = true;
    build(root);
    var total = (root.amcThmItems || []).length;
    var tools = root.querySelector(C("tools"));
    var input = root.querySelector(C("input"));
    if (tools && input && total > intAttr(root, "data-threshold", 15)) {
      tools.hidden = false;
      var label = fill(root.getAttribute("data-filter-label"), { count: num(total) });
      input.setAttribute("placeholder", label);
      input.setAttribute("aria-label", label);
      input.setAttribute("aria-controls", (root.querySelector(C("groups")) || {}).id || "");
    }
    root.classList.add("is-enhanced");
    renderRecent(root);
    apply(root);
  }

  // ------------------------------------------------------------ events
  var timer = null;
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains(ROOT + "-input")) { return; }
    var root = t.closest("." + ROOT);
    var r = apply(root);
    window.clearTimeout(timer);
    timer = window.setTimeout(function () {
      if (r.filtering) { say(root, r.matches ? fill(root.getAttribute("data-matches"), { count: num(r.matches), total: num(r.total) }) : root.querySelector(C("empty")).textContent); }
    }, 400);
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains(ROOT + "-input")) { return; }
    var root = t.closest("." + ROOT);
    if ((e.key === "Escape" || e.key === "Esc") && t.value) {
      e.preventDefault();
      e.stopPropagation();
      t.value = "";
      apply(root);
    } else if (e.key === "ArrowDown") {
      // Jump from the filter to the first visible entry.
      var first = firstVisibleLink(root);
      if (first) { e.preventDefault(); first.focus(); }
    }
  });
  function firstVisibleLink(root) {
    var links = root.querySelectorAll(C("groups") + " " + C("link"));
    for (var i = 0; i < links.length; i++) { if (links[i].offsetParent !== null) { return links[i]; } }
    return null;
  }
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) { return; }
    var root = t.closest("." + ROOT);
    if (!root || !root.amcThmReady) { return; }
    var more = t.closest(C("more"));
    var toggle = t.closest(C("groupToggle"));
    var reset = t.closest(C("reset"));
    var clear = t.closest(C("clearFilter"));
    var link = t.closest(C("link"));
    if (more) {
      var sec = more.closest(C("group"));
      sec.amcThmExpanded = !sec.amcThmExpanded;
      apply(root);
      var lis = sec.querySelectorAll(C("item"));
      if (sec.amcThmExpanded) {
        var a = lis[chunkOf(root)] && lis[chunkOf(root)].querySelector(C("link"));
        if (a) { a.focus(); }
        say(root, fill(root.getAttribute("data-shown"), { count: num(lis.length), group: sec.amcThmName }));
      } else {
        more.focus();
      }
    } else if (toggle) {
      var s = toggle.closest(C("group"));
      setOpen(s, s.classList.contains("is-closed"));
    } else if (reset) {
      remove(storeKey(root));
      renderRecent(root);
      say(root, root.getAttribute("data-cleared") || "");
      var focusTo = root.querySelector(C("tools")).hidden ? firstVisibleLink(root) : root.querySelector(C("input"));
      if (focusTo) { focusTo.focus(); }
    } else if (clear) {
      var input = root.querySelector(C("input"));
      input.value = "";
      apply(root);
      input.focus();
    } else if (link) {
      var li = link.closest(C("item")) || link.closest(C("recentItem"));
      if (li) { remember(root, li.amcThmSource || li); }
      // Same-page links (previews, #anchors) show the new order at once.
      var href = link.getAttribute("href") || "";
      if (href.charAt(0) === "#") { window.setTimeout(function () { renderRecent(root); }, 0); }
    }
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
        var added = records[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var n = added[j];
          if (n.nodeType === 1 && (n.classList.contains(ROOT) || (n.querySelector && n.querySelector("." + ROOT + ":not(.is-enhanced)")))) { queue(); return; }
        }
      }
    }).observe(document.documentElement, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", scan); } else { scan(); }

  window.amcTplHickMenu = {
    refresh: scan,
    clearRecent: function (root) {
      var roots = root ? [root] : Array.prototype.slice.call(document.querySelectorAll("." + ROOT));
      roots.forEach(function (r) { remove(storeKey(r)); renderRecent(r); });
    },
    key: storeKey
  };
})();
