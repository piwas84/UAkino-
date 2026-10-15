/* UAKino Safe for Lampa
 * Official uakino.ax/lampa.js without breaking CUB/TMDB menu.
 * Install: Lampa → Extensions → Add:
 *   http://YOUR_SERVER:9118/plugins/uakino_safe.js
 * Or host this file and use its URL.
 * Remove direct https://uakino.ax/lampa.js from extensions.
 */
(function () {
  'use strict';
  if (window.uakino_safe_loader) return;
  window.uakino_safe_loader = true;

  // Keep Lampa menu, home, CUB/TMDB intact
  window.UAK_NATIVE_MENU = true;
  window.UAK_NATIVE_HERO = true;

  var s = document.createElement('script');
  s.src = 'https://uakino.ax/lampa.js';
  s.async = true;
  s.onerror = function () {
    try {
      if (window.Lampa && Lampa.Noty) {
        Lampa.Noty.show('UAKino: не вдалося завантажити uakino.ax/lampa.js');
      }
    } catch (e) {}
  };
  (document.head || document.documentElement).appendChild(s);
})();
