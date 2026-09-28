/* APEX Modern Components - Star Rating item
 * Registers an apex.item() interface so Dynamic Actions, apex.item().getValue(),
 * setValue(), enable() and disable() behave like native items (APEX 23.1+). */
/* global apex */
window.amc = window.amc || {};

(function (amc) {
  "use strict";

  function inputs(root) {
    return Array.prototype.slice.call(root.querySelectorAll("input.amc-Rating-input"));
  }

  function selected(root) {
    var checked = root.querySelector("input.amc-Rating-input:checked");
    return checked ? checked.value : "";
  }

  function paint(root, upTo) {
    var stars = root.querySelectorAll(".amc-Rating-star");
    for (var i = 0; i < stars.length; i++) {
      stars[i].classList.toggle("is-on", i < upTo);
    }
  }

  function repaint(root) {
    paint(root, Number(selected(root)) || 0);
  }

  amc.starRating = {
    init: function (itemId) {
      var root = document.getElementById(itemId);
      if (!root || root.dataset.amcInit) {
        return;
      }
      root.dataset.amcInit = "Y";

      root.addEventListener("change", function () {
        repaint(root);
      });
      root.addEventListener("mouseover", function (event) {
        var star = event.target.closest(".amc-Rating-star");
        if (star && !root.disabled) {
          paint(root, Number(document.getElementById(star.htmlFor).value));
        }
      });
      root.addEventListener("mouseleave", function () {
        repaint(root);
      });

      var clear = root.querySelector(".amc-Rating-clear");
      if (clear) {
        clear.addEventListener("click", function () {
          apex.item(itemId).setValue("");
          var first = inputs(root)[0];
          if (first) {
            first.focus();
          }
        });
      }

      apex.item.create(itemId, {
        nullValue: "",
        getValue: function () {
          return selected(root);
        },
        setValue: function (value) {
          inputs(root).forEach(function (input) {
            input.checked = input.value === String(value);
          });
          repaint(root);
        },
        disable: function () {
          root.disabled = true;
          root.classList.add("is-disabled");
        },
        enable: function () {
          root.disabled = false;
          root.classList.remove("is-disabled");
        },
        isDisabled: function () {
          return root.disabled;
        },
        setFocusTo: function () {
          var target = root.querySelector("input.amc-Rating-input:checked") || inputs(root)[0];
          if (target) {
            target.focus();
          }
        }
      });
    }
  };
})(window.amc);
