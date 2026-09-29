/* Command List: filter-as-you-type and arrow-key navigation for the AMC Command List template.
   Everything is delegated on document, so refreshed regions keep working; text is only ever
   written with textContent. Without this file the template is a plain list of links. */
(function () {
  "use strict";
  if (window.amcTplCommandList) { return; }
  window.amcTplCommandList = true;

  var ROOT = "amc-TCommandList";
  var C = function (part) { return "." + ROOT + "-" + part; };

  function lower(s) { return String(s || "").toLocaleLowerCase(); }

  function init(root) {
    if (root.amcTcmdReady) { return; }
    root.amcTcmdReady = true;
    var search = root.querySelector(C("search"));
    if (search) { search.hidden = false; }
    var items = root.querySelectorAll(C("item"));
    for (var i = 0; i < items.length; i++) {
      var label = items[i].querySelector(C("label"));
      var desc = items[i].querySelector(C("desc"));
      items[i].amcTcmdLabel = label ? label.textContent : "";
      items[i].amcTcmdHay = lower((label ? label.textContent : "") + " " + (desc ? desc.textContent : ""));
      splitKeys(items[i].querySelector("kbd" + C("kbd")));
    }
  }

  // "Ctrl+Shift+N" -> one key chip per key inside a wrapping <kbd>.
  function splitKeys(kbd) {
    if (!kbd) { return; }
    var text = kbd.textContent.trim();
    var keys = text.length > 1 ? text.split(/\s*\+\s*/) : [text];
    if (keys.length < 2 || keys.indexOf("") !== -1) { return; }
    var group = document.createElement("kbd");
    group.className = ROOT + "-keys";
    for (var i = 0; i < keys.length; i++) {
      var k = document.createElement("kbd");
      k.className = ROOT + "-kbd";
      k.textContent = keys[i];
      group.appendChild(k);
    }
    kbd.parentNode.replaceChild(group, kbd);
  }

  function highlight(item, tokens) {
    var label = item.querySelector(C("label"));
    if (!label) { return; }
    var text = item.amcTcmdLabel;
    while (label.firstChild) { label.removeChild(label.firstChild); }
    var hay = lower(text);
    var at = -1;
    var len = 0;
    for (var i = 0; i < tokens.length && at === -1; i++) {
      at = hay.indexOf(tokens[i]);
      len = tokens[i].length;
    }
    if (at === -1 || !len) {
      label.textContent = text;
      return;
    }
    label.appendChild(document.createTextNode(text.slice(0, at)));
    var mark = document.createElement("mark");
    mark.className = ROOT + "-mark";
    mark.textContent = text.slice(at, at + len);
    label.appendChild(mark);
    label.appendChild(document.createTextNode(text.slice(at + len)));
  }

  function filter(root, value) {
    init(root);
    var query = lower(value).trim();
    var tokens = query ? query.split(/\s+/) : [];
    var items = root.querySelectorAll(C("item"));
    var shown = 0;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var ok = true;
      for (var t = 0; t < tokens.length; t++) {
        if (item.amcTcmdHay.indexOf(tokens[t]) === -1) { ok = false; break; }
      }
      item.hidden = !ok;
      item.classList.remove("is-first");
      if (ok) {
        if (!shown && tokens.length) { item.classList.add("is-first"); }
        shown++;
      }
      highlight(item, ok ? tokens : []);
    }
    var empty = root.querySelector(C("empty"));
    if (empty) { empty.hidden = shown > 0; }
    var status = root.querySelector(C("status"));
    if (status) {
      status.textContent = !tokens.length ? "" : shown ? shown + " " + (status.getAttribute("data-results") || "") : (empty ? empty.textContent : "");
    }
  }

  function visibleLinks(root) {
    var links = root.querySelectorAll(C("item") + ":not([hidden]) " + C("link"));
    return Array.prototype.slice.call(links);
  }

  function inputOf(root) {
    var input = root.querySelector(C("input"));
    return input && input.offsetParent !== null ? input : null;
  }

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t.classList || !t.classList.contains(ROOT + "-input")) { return; }
    filter(t.closest("." + ROOT), t.value);
  });

  document.addEventListener("keydown", function (e) {
    var t = e.target;
    var root = t.closest && t.closest("." + ROOT);
    if (!root || e.altKey || e.ctrlKey || e.metaKey) { return; }
    init(root);
    var links = visibleLinks(root);
    var input = inputOf(root);
    var key = e.key;

    if (t.classList.contains(ROOT + "-input")) {
      if (key === "ArrowDown" && links.length) {
        e.preventDefault();
        links[0].focus();
      } else if (key === "Enter" && t.value.trim() && links.length) {
        e.preventDefault();
        links[0].click();
      } else if (key === "Escape" && t.value) {
        e.preventDefault();
        t.value = "";
        filter(root, "");
      }
      return;
    }
    var at = links.indexOf(t);
    if (at === -1) { return; }
    var next = null;
    if (key === "ArrowDown") { next = links[Math.min(at + 1, links.length - 1)]; }
    else if (key === "ArrowUp") { next = at > 0 ? links[at - 1] : input || links[0]; }
    else if (key === "Home") { next = links[0]; }
    else if (key === "End") { next = links[links.length - 1]; }
    else if (key === "Escape" && input) { next = input; }
    if (next) {
      e.preventDefault();
      next.focus();
    }
  });

  function scan() {
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) { init(roots[i]); }
  }
  if (window.apex && window.apex.jQuery) {
    window.apex.jQuery(document).on("apexafterrefresh", scan);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
})();
