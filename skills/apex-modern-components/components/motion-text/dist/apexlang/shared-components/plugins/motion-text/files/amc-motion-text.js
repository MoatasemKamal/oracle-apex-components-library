/* APEX Modern Components - Motion Text runtime
 * Text effects from the Motion Gallery. Splits text into letters or words for the
 * CSS effects and drives typewriter and scramble. Text is set with textContent only,
 * so values from columns or items can never inject markup.
 * Multiple phrases for typewriter and scramble are separated with "|". */
(function () {
  "use strict";
  if (window.amcMotionText) {
    return;
  }

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var runners = [];

  function phrasesOf(el) {
    return (el.getAttribute("data-amc-phrases") || el.textContent)
      .split("|")
      .map(function (p) { return p.trim(); })
      .filter(Boolean);
  }

  // Scripts whose letters join or shape together (Arabic, Syriac, Thaana, N'Ko, Indic,
  // Thai, Lao, Tibetan, Myanmar, Khmer, Mongolian): splitting them into letters breaks
  // the words, so letter effects animate whole words instead.
  var JOINING = /[\u0590-\u08FF\u0900-\u0DFF\u0E00-\u0EFF\u0F00-\u109F\u1780-\u18AF\uFB1D-\uFDFF\uFE70-\uFEFF]/;

  // Visible characters (keeps accents, emoji and flags whole where Intl.Segmenter exists).
  function graphemes(text) {
    if (window.Intl && Intl.Segmenter) {
      var out = [];
      var it = new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)[Symbol.iterator]();
      for (var r = it.next(); !r.done; r = it.next()) { out.push(r.value.segment); }
      return out;
    }
    return Array.prototype.slice.call(text);
  }

  function splitLetters(el) {
    var text = el.textContent;
    el.setAttribute("aria-label", text);
    // Order the pieces by the text's own direction, not the page's: inline-block pieces
    // are laid out in the paragraph direction, which reversed Latin text on RTL pages.
    el.setAttribute("dir", "auto");
    el.textContent = "";
    var pieces = JOINING.test(text) ? text.split(/(\s+)/).filter(Boolean) : graphemes(text);
    var n = 0;
    pieces.forEach(function (piece) {
      var span = document.createElement("span");
      span.setAttribute("aria-hidden", "true");
      span.textContent = /^\s+$/.test(piece) ? "\u00a0" : piece;
      span.style.setProperty("--i", String(n++));
      el.appendChild(span);
    });
  }

  function splitWords(el) {
    var words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", words.join(" "));
    el.setAttribute("dir", "auto");
    el.textContent = "";
    words.forEach(function (word, i) {
      var mask = document.createElement("span");
      var inner = document.createElement("span");
      mask.className = "amc-w";
      mask.setAttribute("aria-hidden", "true");
      inner.textContent = word;
      inner.style.setProperty("--i", String(i));
      mask.appendChild(inner);
      el.appendChild(mask);
      el.appendChild(document.createTextNode(" "));
    });
  }

  function typewriter(el) {
    var out = el.querySelector(".amc-tx-text");
    var phrases = phrasesOf(el);
    var p = 0;
    var i = phrases[0].length;
    var mode = "hold";
    var t = 0;
    el.setAttribute("aria-label", phrases.join(". "));
    out.setAttribute("aria-hidden", "true");
    out.textContent = phrases[0];
    return function (dt) {
      t += dt;
      var s = phrases[p];
      if (mode === "type" && t > 0.07) {
        t = 0; i++; out.textContent = s.slice(0, i);
        if (i >= s.length) { mode = "hold"; }
      } else if (mode === "hold" && t > 1.4 && phrases.length > 0) {
        t = 0; mode = "del";
      } else if (mode === "del" && t > 0.035) {
        t = 0; i--; out.textContent = s.slice(0, i);
        if (i <= 0) { mode = "type"; p = (p + 1) % phrases.length; }
      }
    };
  }

  function scramble(el) {
    var words = phrasesOf(el);
    var glyphs = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=?";
    var w = 0;
    var t = 0;
    var flick = 0;
    el.setAttribute("aria-label", words.join(", "));
    el.textContent = words[0];
    return function (dt) {
      t += dt; flick += dt;
      if (t > 3.2) { t = 0; w = (w + 1) % words.length; }
      if (flick < 0.05) { return; }
      flick = 0;
      var word = words[w];
      // Joining scripts would be torn apart letter by letter: show them whole.
      if (JOINING.test(word)) { if (el.textContent !== word) { el.textContent = word; } return; }
      var s = "";
      for (var k = 0; k < word.length; k++) {
        s += word[k] === " " || t > 0.25 + k * 0.1 ? word[k] : glyphs[Math.random() * glyphs.length | 0];
      }
      el.textContent = s;
    };
  }

  function init(root) {
    var list = (root || document).querySelectorAll(".amc-Motion--text:not([data-amc-init])");
    Array.prototype.forEach.call(list, function (motion) {
      motion.setAttribute("data-amc-init", "Y");
      var el;
      if ((el = motion.querySelector("[data-amc-split='letters']"))) { splitLetters(el); }
      if ((el = motion.querySelector("[data-amc-split='words']"))) { splitWords(el); }
      if ((el = motion.querySelector(".amc-tx-glitch"))) { el.setAttribute("aria-label", el.textContent); }
      if (reduceMotion) { return; }
      if ((el = motion.querySelector(".amc-tx-type"))) { runners.push({ el: motion, tick: typewriter(el) }); }
      if ((el = motion.querySelector(".amc-tx-scr"))) { runners.push({ el: motion, tick: scramble(el) }); }
    });
  }

  var last = 0;
  function frame(now) {
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    runners = runners.filter(function (r) { return r.el.isConnected; });
    runners.forEach(function (r) { r.tick(dt); });
    window.requestAnimationFrame(frame);
  }

  function start() {
    init(document);
    window.requestAnimationFrame(frame);
    // Region refresh, pagination and lazy loading insert new markup.
    new MutationObserver(function () { init(document); }).observe(document.body, { childList: true, subtree: true });
  }

  window.amcMotionText = { init: init };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
