/* Marquee Links: repeats the entry group so the ticker loops seamlessly (technique adapted from
   Magic UI marquee, MIT, https://github.com/magicuidesign/magicui). Copies are aria-hidden and
   their links leave the tab order. Nothing moves, and no copies are made, under reduced motion. */
(function () {
  "use strict";
  if (window.amcTplMarqueeLinks) { return; }
  window.amcTplMarqueeLinks = true;

  var ROOT = "amc-TMarqueeLinks";
  var MAX_COPIES = 12;
  var reduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var observer = window.ResizeObserver ? new ResizeObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      schedule(entries[i].target.closest("." + ROOT));
    }
  }) : null;
  var queue = [];
  var frame = 0;

  function reduced() { return !!(reduce && reduce.matches); }

  function schedule(root) {
    if (!root || queue.indexOf(root) !== -1) { return; }
    queue.push(root);
    if (!frame) {
      frame = window.requestAnimationFrame(function () {
        var list = queue;
        queue = [];
        frame = 0;
        for (var i = 0; i < list.length; i++) { setup(list[i]); }
      });
    }
  }

  function parts(root) {
    var viewport = root.querySelector("." + ROOT + "-viewport");
    var group = viewport && viewport.querySelector("." + ROOT + "-group:not([aria-hidden])");
    return { viewport: viewport, group: group, toggle: root.querySelector("." + ROOT + "-toggle") };
  }

  function reset(root, p) {
    var clones = p.viewport.querySelectorAll("." + ROOT + "-group[aria-hidden]");
    for (var i = 0; i < clones.length; i++) { clones[i].parentNode.removeChild(clones[i]); }
    root.classList.remove("is-looping");
    if (p.toggle) { p.toggle.hidden = true; }
  }

  function setup(root) {
    var p = parts(root);
    if (!p.viewport || !p.group) { return; }
    if (observer && !root.amcTmqObserved) {
      observer.observe(p.viewport);
      root.amcTmqObserved = true;
    }
    var width = p.viewport.clientWidth;
    if (root.amcTmqWidth === width && root.amcTmqReduced === reduced()) { return; }
    root.amcTmqWidth = width;
    root.amcTmqReduced = reduced();
    reset(root, p);
    if (reduced() || !width) { return; }

    root.classList.add("is-looping");
    var style = window.getComputedStyle(p.viewport);
    var gap = parseFloat(style.columnGap) || 0;
    var groupWidth = p.group.getBoundingClientRect().width;
    if (!groupWidth) { reset(root, p); return; }
    var copies = Math.min(MAX_COPIES, Math.ceil(width / (groupWidth + gap)) + 1);
    for (var i = 0; i < copies; i++) {
      var clone = p.group.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      clone.removeAttribute("id");
      var nodes = clone.querySelectorAll("[id]");
      for (var n = 0; n < nodes.length; n++) { nodes[n].removeAttribute("id"); }
      var links = clone.querySelectorAll("a, button, input, select, textarea, [tabindex]");
      for (var k = 0; k < links.length; k++) {
        links[k].setAttribute("tabindex", "-1");
        links[k].removeAttribute("aria-current");
      }
      p.viewport.appendChild(clone);
    }
    var pps = parseFloat(window.getComputedStyle(root).getPropertyValue("--amc-tmq-pps")) || 48;
    root.style.setProperty("--amc-tmq-duration", Math.max(8, (groupWidth + gap) / pps).toFixed(2) + "s");
    if (p.toggle) { p.toggle.hidden = false; }
  }

  function scan() {
    var roots = document.querySelectorAll("." + ROOT);
    for (var i = 0; i < roots.length; i++) {
      roots[i].amcTmqWidth = -1;
      schedule(roots[i]);
    }
  }

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("." + ROOT + "-toggle");
    if (!btn) { return; }
    var root = btn.closest("." + ROOT);
    var paused = btn.getAttribute("aria-pressed") !== "true";
    btn.setAttribute("aria-pressed", paused ? "true" : "false");
    root.classList.toggle("is-paused", paused);
  });

  // After keyboard focus leaves, return the strip to its start before it moves again.
  document.addEventListener("focusout", function (e) {
    var root = e.target.closest && e.target.closest("." + ROOT);
    if (!root) { return; }
    window.requestAnimationFrame(function () {
      if (!root.contains(document.activeElement)) {
        var p = parts(root);
        if (p.viewport) { p.viewport.scrollLeft = 0; }
      }
    });
  });

  if (reduce) {
    if (reduce.addEventListener) { reduce.addEventListener("change", scan); } else if (reduce.addListener) { reduce.addListener(scan); }
  }
  if (!observer) { window.addEventListener("resize", scan); }
  if (window.apex && window.apex.jQuery) {
    window.apex.jQuery(document).on("apexafterrefresh", scan);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan);
  } else {
    scan();
  }
})();
