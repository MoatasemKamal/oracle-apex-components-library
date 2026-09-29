/* APEX Modern Components - Design Pricing runtime
 * Turns the |-separated Features value into a real list (ul/li) with a decorative
 * check mark. Text is set with textContent only, so column values can never inject
 * markup. Without this file the plain feature text stays visible. */
(function () {
  "use strict";
  if (window.amcDesignPricing) {
    return;
  }

  function build(el) {
    var items = el.textContent.split("|")
      .map(function (s) { return s.replace(/\s+/g, " ").trim(); })
      .filter(Boolean);
    el.setAttribute("data-amc-init", "Y");
    if (!items.length) {
      return;
    }
    var list = document.createElement("ul");
    list.className = "amc-DPricing-list";
    items.forEach(function (text) {
      var li = document.createElement("li");
      var mark = document.createElement("span");
      var label = document.createElement("span");
      li.className = "amc-DPricing-feature";
      mark.className = "amc-DPricing-check";
      mark.setAttribute("aria-hidden", "true");
      label.className = "amc-DPricing-featureText";
      label.textContent = text;
      li.appendChild(mark);
      li.appendChild(label);
      list.appendChild(li);
    });
    el.textContent = "";
    el.appendChild(list);
  }

  function init(root) {
    var nodes = (root || document).querySelectorAll(".amc-DPricing-features:not([data-amc-init])");
    Array.prototype.forEach.call(nodes, build);
  }

  function start() {
    init(document);
    // Region refresh, pagination and lazy loading insert new markup.
    new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
  }

  window.amcDesignPricing = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
