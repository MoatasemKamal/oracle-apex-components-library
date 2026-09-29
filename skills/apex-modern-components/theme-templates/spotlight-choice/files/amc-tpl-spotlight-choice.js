/* Spotlight Choice: a plan or option chooser. Exactly one entry is the recommended one
   (Attribute 2 = recommended; the first such entry wins), visually isolated (von Restorff) and
   placed by serial position: first by default, in the middle with the Centre stage option.
   When a page item is named, in data-item on the wrapper or data-amc-choice-item on an
   ancestor such as the region (Custom Attributes), the list becomes a radio group: arrow keys
   move and select, Space and Enter select, a click selects, and the chosen entry's value
   (Attribute 4, else its label) is written to that item. Without an item the cards are links.
   ES5, textContent only. */
(function () {
  "use strict";
  if (window.amcTplSpotlightChoice) { return; }

  var ROOT = "amc-TSpotlightChoice";
  var C = function (part) { return "." + ROOT + "-" + part; };

  function items(root) { return Array.prototype.slice.call(root.querySelectorAll(C("item"))); }
  function card(li) { return li.querySelector(C("card")); }
  function valueOf(li) {
    var v = (li.getAttribute("data-value") || "").trim();
    if (v) { return v; }
    var n = li.querySelector(C("name"));
    return n ? n.textContent.replace(/\s+/g, " ").trim() : "";
  }
  function itemName(root) {
    var own = (root.getAttribute("data-item") || "").trim();
    if (own) { return own; }
    var host = root.parentNode && root.parentNode.closest ? root.parentNode.closest("[data-amc-choice-item]") : null;
    return host ? (host.getAttribute("data-amc-choice-item") || "").trim() : "";
  }

  // ------------------------------------------------------------ page item access (guarded)
  function getValue(name) {
    try {
      if (window.apex && window.apex.item) {
        var it = window.apex.item(name);
        if (it && it.node && typeof it.getValue === "function") {
          var v = it.getValue();
          if (v !== undefined && v !== null && v !== "") { return String(v); }
        }
      }
    } catch (e) { /* not an APEX page */ }
    var el = document.getElementById(name);
    return el && "value" in el ? String(el.value || "") : "";
  }
  function setValue(name, value) {
    var done = false;
    try {
      if (window.apex && window.apex.item) {
        var it = window.apex.item(name);
        if (it && it.node && typeof it.setValue === "function") { it.setValue(value); done = true; }
      }
    } catch (e) { /* fall back below */ }
    if (!done) {
      var el = document.getElementById(name);
      if (el && "value" in el) {
        el.value = value;
        var ev;
        try { ev = new Event("change", { bubbles: true }); } catch (e2) { ev = document.createEvent("Event"); ev.initEvent("change", true, false); }
        el.dispatchEvent(ev);
      }
    }
  }

  // ------------------------------------------------------------ recommended + position
  function arrange(root) {
    var list = root.querySelector(C("list"));
    var all = items(root);
    var rec = null;
    all.forEach(function (li) {
      if (li.classList.contains(ROOT + "-item--recommended")) {
        if (rec) { li.classList.remove(ROOT + "-item--recommended"); } else { rec = li; }
      }
    });
    root.amcTscRecommended = rec;
    if (!rec || !list || all.length < 2) { return; }
    rec.classList.add("is-recommended");
    var others = all.filter(function (li) { return li !== rec; });
    // Serial position: first (primacy) by default; Centre stage puts it in the middle, where
    // its isolation keeps it out of the serial-position valley.
    var at = root.classList.contains(ROOT + "--middle") ? Math.floor((all.length - 1) / 2) : 0;
    others.splice(at, 0, rec);
    others.forEach(function (li) { list.appendChild(li); });
  }

  // ------------------------------------------------------------ radio behaviour
  function select(root, li, write) {
    items(root).forEach(function (x) {
      var on = x === li;
      x.classList.toggle("is-selected", on);
      var a = card(x);
      if (a) {
        a.setAttribute("aria-checked", on ? "true" : "false");
        a.setAttribute("tabindex", on ? "0" : "-1");
      }
    });
    if (write) { setValue(root.amcTscItem, valueOf(li)); }
  }
  function focusable(root) {
    var list = items(root);
    var sel = list.filter(function (x) { return x.classList.contains("is-selected"); })[0];
    var target = sel || root.amcTscRecommended || list[0];
    list.forEach(function (x) { var a = card(x); if (a) { a.setAttribute("tabindex", x === target ? "0" : "-1"); } });
  }

  function init(root) {
    if (root.amcTscReady) { return; }
    root.amcTscReady = true;
    arrange(root);
    root.classList.add("is-enhanced");
    var name = itemName(root);
    if (!name) { return; } // link mode: the cards stay links
    root.amcTscItem = name;
    root.classList.add("is-choice");
    var list = root.querySelector(C("list"));
    list.setAttribute("role", "radiogroup");
    var labelled = root.closest ? root.closest("[aria-labelledby]") : null;
    if (labelled && labelled !== root) { list.setAttribute("aria-labelledby", labelled.getAttribute("aria-labelledby")); } else { list.setAttribute("aria-label", root.getAttribute("data-group-label") || "Choose an option"); }
    items(root).forEach(function (li) {
      li.setAttribute("role", "presentation");
      var a = card(li);
      if (!a) { return; }
      a.setAttribute("role", "radio");
      a.setAttribute("aria-checked", "false");
      a.removeAttribute("aria-current");
    });
    var current = getValue(name);
    var match = current ? items(root).filter(function (li) { return valueOf(li) === current; })[0] : null;
    if (match) {
      select(root, match, false);
    } else if (root.classList.contains(ROOT + "--preselect") && root.amcTscRecommended) {
      select(root, root.amcTscRecommended, true);
    }
    focusable(root);
  }

  // ------------------------------------------------------------ events
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) { return; }
    var a = t.closest(C("card"));
    var root = a && a.closest("." + ROOT);
    if (!root || !root.amcTscItem) { return; } // link mode: follow the link
    e.preventDefault();
    select(root, a.closest(C("item")), true);
    a.focus();
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains(ROOT + "-card")) { return; }
    var root = t.closest("." + ROOT);
    if (!root || !root.amcTscItem) { return; }
    var list = items(root);
    var i = list.indexOf(t.closest(C("item")));
    var rtl = getComputedStyle(root).direction === "rtl";
    var next = null;
    switch (e.key) {
      case "ArrowDown": next = i + 1; break;
      case "ArrowUp": next = i - 1; break;
      case "ArrowRight": next = rtl ? i - 1 : i + 1; break;
      case "ArrowLeft": next = rtl ? i + 1 : i - 1; break;
      case "Home": next = 0; break;
      case "End": next = list.length - 1; break;
      case " ": case "Spacebar": case "Enter":
        e.preventDefault();
        select(root, list[i], true);
        return;
      default: return;
    }
    e.preventDefault();
    next = (next + list.length) % list.length;
    select(root, list[next], true);
    card(list[next]).focus();
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

  window.amcTplSpotlightChoice = {
    refresh: scan,
    value: function (root) { root = root || document.querySelector("." + ROOT); var s = root && root.querySelector("." + ROOT + "-item.is-selected"); return s ? valueOf(s) : null; }
  };
})();
