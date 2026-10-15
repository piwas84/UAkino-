/* UAKino Safe — CUB/меню цілі + прапор на кнопці як у UAFX */
(function () {
  "use strict";
  if (window.uakino_safe_loader) return;
  window.uakino_safe_loader = true;

  window.UAK_NATIVE_MENU = true;
  window.UAK_NATIVE_HERO = true;

  var FLAG = " \uD83C\uDDFA\uD83C\uDDE6"; // 🇺🇦

  function injectCss() {
    if (document.getElementById("uakino-flag-css")) return;
    var st = document.createElement("style");
    st.id = "uakino-flag-css";
    st.textContent = [
      ".view--uakino span::after,",
      ".view--uakino-lite span::after {",
      ' content: "' + FLAG + '";',
      "}",
    ].join("");
    (document.head || document.documentElement).appendChild(st);
  }

  function patchButtons(root) {
    try {
      var scope = root && root.querySelectorAll ? root : document;
      var list = scope.querySelectorAll(
        ".view--uakino, .view--uakino-lite, .full-start__button"
      );
      for (var i = 0; i < list.length; i++) {
        var btn = list[i];
        var span = btn.querySelector("span");
        if (!span) continue;
        var t = (span.textContent || "").trim();
        if (!/uakino/i.test(t)) continue;
        if (t.indexOf("\uD83C\uDDFA") >= 0) continue;
        span.textContent = "UAKino" + FLAG;
      }
    } catch (e) {}
  }

  function wire() {
    injectCss();
    patchButtons(document);
    if (!(window.Lampa && Lampa.Listener)) return;
    Lampa.Listener.follow("full", function (e) {
      if (e.type !== "complite") return;
      setTimeout(function () {
        injectCss();
        try {
          var el = e.object.activity.render();
          patchButtons(el && el[0] ? el[0] : document);
        } catch (err) {
          patchButtons(document);
        }
      }, 300);
    });
  }

  var s = document.createElement("script");
  s.src = "https://uakino.ax/lampa.js";
  s.async = true;
  s.onload = function () {
    if (window.appready) wire();
    else if (window.Lampa && Lampa.Listener) {
      Lampa.Listener.follow("app", function (e) {
        if (e.type === "ready") wire();
      });
    }
    setTimeout(wire, 2000);
  };
  (document.head || document.documentElement).appendChild(s);
})();
