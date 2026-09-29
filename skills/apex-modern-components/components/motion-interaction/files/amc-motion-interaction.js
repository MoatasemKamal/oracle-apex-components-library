/* APEX Modern Components - Motion Interaction runtime
 * Ripple, magnetic, tilt, spotlight and like-toggle behavior. The like toggle fires a
 * bubbling "amc-like-change" event (detail: { liked, value }) that a Dynamic Action
 * with a Custom event can react to, for example to save the like with an Ajax process. */
(function () {
  "use strict";
  if (window.amcMotionInteraction) {
    return;
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var springs = [];

  function ripple(root) {
    var btn = root.querySelector(".amc-ix-ripple");
    function make(x, y) {
      if (reduceMotion) { return; }
      var r = document.createElement("span");
      r.className = "amc-rp";
      r.style.left = x + "px";
      r.style.top = y + "px";
      btn.appendChild(r);
      r.addEventListener("animationend", function () { r.remove(); });
    }
    btn.addEventListener("pointerdown", function (e) {
      var b = btn.getBoundingClientRect();
      make(e.clientX - b.left, e.clientY - b.top);
    });
    btn.addEventListener("click", function (e) { if (e.detail === 0) { make(btn.offsetWidth / 2, btn.offsetHeight / 2); } });
  }

  function magnetic(root) {
    var btn = root.querySelector(".amc-ix-mag");
    var label = btn.querySelector(".t-Button-label");
    if (label) { label.style.display = "inline-block"; }
    var s = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    root.addEventListener("pointermove", function (e) {
      var b = btn.getBoundingClientRect();
      var dx = e.clientX - (b.left + b.width / 2 - s.x);
      var dy = e.clientY - (b.top + b.height / 2 - s.y);
      if (Math.hypot(dx, dy) < 120) { s.tx = dx * 0.4; s.ty = dy * 0.4; } else { s.tx = s.ty = 0; }
    });
    root.addEventListener("pointerleave", function () { s.tx = s.ty = 0; });
    springs.push({ root: root, tick: function (dt) {
      for (var i = 0; i < 3; i++) {
        var h = dt / 3;
        s.vx += (180 * (s.tx - s.x) - 16 * s.vx) * h;
        s.vy += (180 * (s.ty - s.y) - 16 * s.vy) * h;
        s.x += s.vx * h; s.y += s.vy * h;
      }
      btn.style.transform = "translate(" + s.x + "px," + s.y + "px)";
      if (label) { label.style.transform = "translate(" + s.x * 0.35 + "px," + s.y * 0.35 + "px)"; }
    } });
  }

  function tilt(root) {
    var card = root.querySelector(".amc-ix-tilt");
    var s = { rx: 0, ry: 0, trx: 0, try: 0, gx: 50, gy: 30 };
    root.addEventListener("pointermove", function (e) {
      var b = card.getBoundingClientRect();
      var px = (e.clientX - b.left) / b.width;
      var py = (e.clientY - b.top) / b.height;
      s.trx = (0.5 - py) * 22; s.try = (px - 0.5) * 26; s.gx = px * 100; s.gy = py * 100;
    });
    root.addEventListener("pointerleave", function () { s.trx = s.try = 0; s.gx = 50; s.gy = 30; });
    springs.push({ root: root, tick: function (dt) {
      var k = 1 - Math.exp(-dt * 10);
      s.rx += (s.trx - s.rx) * k; s.ry += (s.try - s.ry) * k;
      card.style.transform = "rotateX(" + s.rx + "deg) rotateY(" + s.ry + "deg)";
      card.style.setProperty("--gx", s.gx + "%");
      card.style.setProperty("--gy", s.gy + "%");
    } });
  }

  function spotlight(root) {
    var panel = root.querySelector(".amc-ix-spot");
    panel.addEventListener("pointermove", function (e) {
      var b = panel.getBoundingClientRect();
      panel.style.setProperty("--mx", (e.clientX - b.left) + "px");
      panel.style.setProperty("--my", (e.clientY - b.top) + "px");
    });
  }

  function like(root) {
    var btn = root.querySelector(".amc-ix-heart");
    btn.addEventListener("click", function () {
      var on = !btn.classList.contains("amc-on");
      btn.classList.remove("amc-pop");
      btn.classList.toggle("amc-on", on);
      btn.setAttribute("aria-pressed", String(on));
      if (on) { void btn.offsetWidth; btn.classList.add("amc-pop"); }
      btn.dispatchEvent(new CustomEvent("amc-like-change", {
        bubbles: true,
        detail: { liked: on, value: btn.getAttribute("data-amc-value") }
      }));
    });
  }

  var BEHAVIORS = { ripple: ripple, magnetic: magnetic, tilt: tilt, spotlight: spotlight, like: like };

  function init(scope) {
    var list = (scope || document).querySelectorAll(".amc-Motion--ix:not([data-amc-init])");
    Array.prototype.forEach.call(list, function (root) {
      root.setAttribute("data-amc-init", "Y");
      var fn = BEHAVIORS[root.getAttribute("data-amc-ix")];
      if (fn) { fn(root); }
    });
  }

  var last = 0;
  function frame(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    springs = springs.filter(function (s) { return s.root.isConnected; });
    if (!reduceMotion) { springs.forEach(function (s) { s.tick(dt); }); }
    window.requestAnimationFrame(frame);
  }

  function start() {
    init(document);
    window.requestAnimationFrame(frame);
    new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
  }

  window.amcMotionInteraction = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
