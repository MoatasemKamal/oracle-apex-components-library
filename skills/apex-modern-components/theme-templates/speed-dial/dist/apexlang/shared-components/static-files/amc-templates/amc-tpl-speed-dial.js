/* Speed Dial list template: optional behaviour. The dial opens and closes without JavaScript
   (<details>/<summary>); this adds Escape to close (focus returns to the button), closing on a
   click outside and closing when keyboard focus leaves the dial. Delegated on document, so
   refreshed List regions keep working. */
(function () {
  "use strict";
  if (window.amcTplSpeedDial) { return; }
  window.amcTplSpeedDial = true;

  function dialOf(el) {
    while (el && el !== document) {
      if (el.classList && el.classList.contains("amc-TSpeedDial")) { return el; }
      el = el.parentNode;
    }
    return null;
  }
  function closeDial(dial, focusButton) {
    var d = dial && dial.querySelector(".amc-TSpeedDial-toggle");
    if (d && d.open) {
      d.open = false;
      if (focusButton) {
        var s = d.querySelector(".amc-TSpeedDial-fab");
        if (s) { s.focus(); }
      }
    }
  }
  function closeAll(except) {
    var open = document.querySelectorAll(".amc-TSpeedDial-toggle[open]");
    for (var i = 0; i < open.length; i++) {
      var dial = dialOf(open[i]);
      if (dial !== except) { open[i].open = false; }
    }
  }

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape" && e.key !== "Esc") { return; }
    var dial = dialOf(e.target);
    if (dial) {
      var d = dial.querySelector(".amc-TSpeedDial-toggle");
      if (d && d.open) { e.preventDefault(); }
      closeDial(dial, true);
      if (document.activeElement && dial.querySelector(".amc-TSpeedDial-list").contains(document.activeElement)) {
        dial.querySelector(".amc-TSpeedDial-fab").focus();
      }
    }
  });
  document.addEventListener("click", function (e) {
    closeAll(dialOf(e.target));
  });
  document.addEventListener("focusin", function (e) {
    closeAll(dialOf(e.target));
  });
})();
