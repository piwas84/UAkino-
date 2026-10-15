/* UAKino Safe for Lampa * Official plugin without breaking CUB menu + UA flag on button like UAFX */
(function () {
  "use strict";
  if (window.uakino_safe_loader) return;
  window.uakino_safe_loader = true;

  window.UAK_NATIVE_MENU = true;
  window.UAK_NATIVE_HERO = true;

  function addFlag() {
    try {
      document
        .querySelectorAll(
          ".view--uakino, .view--uakino-lite, .full-start__button"
        )
        .forEach(function (btn) {
          var t = (btn.textContent || "").replace(/\s+/g, " ").trim();
          if (!/uakino/i.test(t)) return;
          if (/ðŸ‡ºðŸ‡¦/.test(t)) return;
          var span = btn.querySelector("span");
          if (span) {
            var st = span.textContent.trim();
            if (/uakino/i.test(st) && st.indexOf("ðŸ‡ºðŸ‡¦") < 0) {
              span.textContent = st.replace(/uakino/i, "UAKino") + " ðŸ‡ºðŸ‡¦";
            }
          } else if (t.indexOf("ðŸ‡ºðŸ‡¦") < 0) {
            btn.appendChild(document.createTextNode(" ðŸ‡ºðŸ‡¦"));
          }
        });
    } catch (e) {}
  }

  var s = document.createElement("script");
  s.src = "https://uakino.ax/lampa.js";
  s.async = true;
  s.onload = function () {
    addFlag();
    setTimeout(addFlag, 800);
    setTimeout(addFlag, 2500);
    try {
      if (window.MutationObserver) {
        new MutationObserver(function () {
          addFlag();
        }).observe(document.body, { childList: true, subtree: true });
      }
    } catch (e) {}
  };
  s.onerror = function () {
    try {
      if (window.Lampa && Lampa.Noty) {
        Lampa.Noty.show(
          "UAKino: Ð½Ðµ Ð²Ð´Ð°Ð»Ð¾ÑÑ Ð·Ð°Ð²Ð°Ð½Ñ‚Ð°Ð¶Ð¸Ñ‚Ð¸ uakino.ax/lampa.js"
        );
      }
    } catch (e) {}
  };
  (document.head || document.documentElement).appendChild(s);
})();
