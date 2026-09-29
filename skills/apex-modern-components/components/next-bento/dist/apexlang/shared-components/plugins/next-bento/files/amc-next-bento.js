/* APEX Modern Components - Next Bento runtime
 * Pointer tracking for three styles; everything else is CSS. Pointer spotlight idea
 * adapted from Magic UI "magic-card" (MIT License, (c) Magic UI, https://magicui.design).
 *   spotlightGlow : --amc-mx / --amc-my (px) on every tile, relative to that tile,
 *                   so one light spans the whole grid; .amc-is-lit on the grid root.
 *   tiltTiles     : --amc-rx / --amc-ry (deg) and --amc-mx / --amc-my (%) on the tile
 *                   under the pointer.
 *   layeredGlass  : --amc-mx / --amc-my (unitless -0.5..0.5) on the grid root.
 * One delegated pointermove listener on document (refreshed regions keep working),
 * throttled to one update per animation frame. Only parsed numbers are written.
 * Does nothing for touch input, without hover, or when reduced motion is preferred. */
(function () {
  "use strict";
  if (window.amcNextBento) {
    return;
  }

  var mqReduce = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var mqHover = window.matchMedia ? window.matchMedia("(hover: hover)") : null;
  var STYLE_RE = /\bamc-NBento--(spotlightGlow|tiltTiles|layeredGlass)\b/;
  var TILT_X = 10;
  var TILT_Y = 12;

  var pending = null;
  var frame = 0;
  var activeRoot = null;
  var activeTile = null;

  function round(n, d) {
    var f = Math.pow(10, d);
    return Math.round(n * f) / f;
  }

  function clamp(n, lo, hi) {
    return n < lo ? lo : (n > hi ? hi : n);
  }

  function styleOf(root) {
    var m = STYLE_RE.exec(root.className);
    return m ? m[1] : null;
  }

  function findUp(el, cls) {
    while (el && el.nodeType === 1) {
      if (el.classList && el.classList.contains(cls)) {
        return el;
      }
      el = el.parentNode;
    }
    return null;
  }

  function resetTile(tile) {
    tile.style.removeProperty("--amc-rx");
    tile.style.removeProperty("--amc-ry");
    tile.style.removeProperty("--amc-mx");
    tile.style.removeProperty("--amc-my");
    tile.classList.remove("amc-is-tilting");
  }

  function leaveRoot(root) {
    root.classList.remove("amc-is-lit");
    if (styleOf(root) === "layeredGlass") {
      root.style.removeProperty("--amc-mx");
      root.style.removeProperty("--amc-my");
    }
  }

  function spotlight(root, x, y) {
    var tiles = root.querySelectorAll(".amc-NBento-tile");
    var i, r;
    for (i = 0; i < tiles.length; i += 1) {
      r = tiles[i].getBoundingClientRect();
      tiles[i].style.setProperty("--amc-mx", round(x - r.left, 1) + "px");
      tiles[i].style.setProperty("--amc-my", round(y - r.top, 1) + "px");
    }
    root.classList.add("amc-is-lit");
  }

  function tilt(tile, x, y) {
    var r = tile.getBoundingClientRect();
    if (!r.width || !r.height) {
      return;
    }
    var px = clamp((x - r.left) / r.width, 0, 1);
    var py = clamp((y - r.top) / r.height, 0, 1);
    tile.style.setProperty("--amc-rx", round((0.5 - py) * TILT_X, 2) + "deg");
    tile.style.setProperty("--amc-ry", round((px - 0.5) * TILT_Y, 2) + "deg");
    tile.style.setProperty("--amc-mx", round(px * 100, 1) + "%");
    tile.style.setProperty("--amc-my", round(py * 100, 1) + "%");
    tile.classList.add("amc-is-tilting");
  }

  function parallax(root, x, y) {
    var r = root.getBoundingClientRect();
    if (!r.width || !r.height) {
      return;
    }
    root.style.setProperty("--amc-mx", round(clamp((x - r.left) / r.width, 0, 1) - 0.5, 3));
    root.style.setProperty("--amc-my", round(clamp((y - r.top) / r.height, 0, 1) - 0.5, 3));
  }

  function update() {
    var e = pending;
    var root, style, tile;
    frame = 0;
    pending = null;
    if (!e) {
      return;
    }
    root = findUp(e.target, "amc-NBento");
    style = root ? styleOf(root) : null;
    if (!style) {
      root = null;
    }
    if (activeRoot && activeRoot !== root) {
      leaveRoot(activeRoot);
    }
    tile = style === "tiltTiles" ? findUp(e.target, "amc-NBento-tile") : null;
    if (activeTile && activeTile !== tile) {
      resetTile(activeTile);
    }
    activeRoot = root;
    activeTile = tile;
    if (!root) {
      return;
    }
    if (style === "spotlightGlow") {
      spotlight(root, e.clientX, e.clientY);
    } else if (style === "tiltTiles" && tile) {
      tilt(tile, e.clientX, e.clientY);
    } else if (style === "layeredGlass") {
      parallax(root, e.clientX, e.clientY);
    }
  }

  function schedule(e) {
    pending = { target: e.target, clientX: e.clientX, clientY: e.clientY };
    if (!frame) {
      frame = window.requestAnimationFrame(update);
    }
  }

  function enabled(e) {
    if (e.pointerType === "touch") {
      return false;
    }
    if (mqReduce && mqReduce.matches) {
      return false;
    }
    return !(mqHover && !mqHover.matches);
  }

  document.addEventListener("pointermove", function (e) {
    if (enabled(e)) {
      schedule(e);
    }
  }, { passive: true });

  /* pointer left the window */
  document.addEventListener("pointerout", function (e) {
    if (!e.relatedTarget && (activeRoot || activeTile)) {
      pending = { target: document.documentElement, clientX: 0, clientY: 0 };
      if (!frame) {
        frame = window.requestAnimationFrame(update);
      }
    }
  });

  window.amcNextBento = { version: "1.0.0" };
})();
