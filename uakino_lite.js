/* UAKino Lite+ для Siaivo/Lampa
   - кнопка UAKino на картці (фільм / серіал)
   - пункт UAKino у бічному меню
   - тема + логотип
   - CUB/TMDB і меню Lampa не ламаємо
*/
(function () {
  'use strict';
  if (window.uakino_lite_ready) return;
  window.uakino_lite_ready = true;

  var API = 'https://uakino.ax';
  var LOGO = 'https://tv.uakino.ax/img/uakino-mark.svg';
  var BLUE = '#1F6FEB', BLUE2 = '#4C9AFF', GOLD = '#ffd700';

  var uakinoFetch = (typeof window.fetch === 'function')
    ? function (u, o) { return window.fetch(u, o); }
    : function (url, opts) {
        opts = opts || {};
        return new Promise(function (resolve, reject) {
          var x = new XMLHttpRequest();
          x.open(opts.method || 'GET', url, true);
          if (opts.headers) for (var k in opts.headers) {
            try { x.setRequestHeader(k, opts.headers[k]); } catch (e) {}
          }
          if (opts.cache === 'no-store') {
            try { x.setRequestHeader('Cache-Control', 'no-cache'); } catch (e) {}
          }
          x.onload = function () {
            resolve({
              ok: x.status >= 200 && x.status < 300,
              status: x.status,
              text: function () { return Promise.resolve(x.responseText); },
              json: function () {
                try { return Promise.resolve(JSON.parse(x.responseText)); }
                catch (e) { return Promise.reject(e); }
              }
            });
          };
          x.onerror = function () { reject(new Error('network')); };
          x.ontimeout = function () { reject(new Error('timeout')); };
          x.send(opts.body || null);
        });
      };

  var MIC = '<div class="uak-qi"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3"/></svg></div>';
  var TIERS = [2160, 1080, 720, 480];
  var TIER_NAME = { 2160: '2160p', 1080: '1080p', 720: '720p', 480: '480p' };
  var TIER_KEY = { 2160: '4K · 2160p', 1080: 'FHD · 1080p', 720: 'HD · 720p', 480: 'SD · 480p' };
  var TIER_BADGE = { 2160: '4K', 1080: 'FHD', 720: 'HD', 480: 'SD' };

  function logoImg(style) {
    return '<img src="https://tv.uakino.ax/img/uakino-mark.svg" alt="UAKino" style="' + (style || 'width:1.4em;height:1.4em;object-fit:contain') + '">';
  }

  function sid() {
    var s = Lampa.Storage.get('uakino_sid', '');
    if (!s) {
      s = 'lp' + Math.random().toString(36).slice(2) + Date.now().toString(36);
      Lampa.Storage.set('uakino_sid', s);
    }
    return s;
  }
  function hevc() {
    try {
      if (Lampa.Platform.is('android')) return 1;
      var t = 'video/mp4; codecs="hvc1.1.6.L153.90"';
      if (window.MediaSource && MediaSource.isTypeSupported && MediaSource.isTypeSupported(t)) return 1;
      if (document.createElement('video').canPlayType(t)) return 1;
    } catch (e) {}
    return 0;
  }
  function q(o) {
    return Object.keys(o).filter(function (k) {
      return o[k] !== undefined && o[k] !== null && o[k] !== '';
    }).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&');
  }
  function getJSON(url) {
    return uakinoFetch(url, { cache: 'no-store' }).then(function (r) {
      return r.json().then(function (j) {
        if (!r.ok && !j.found && r.status !== 404) throw new Error(j.error || String(r.status));
        return j;
      });
    });
  }
  function find(movie) {
    var tv = !!(movie.name || movie.number_of_seasons || movie.first_air_date);
    var date = movie.release_date || movie.first_air_date || '';
    return getJSON(API + '/hls/api/lampa/find?' + q({
      tmdb: movie.id,
      imdb: movie.imdb_id,
      type: tv ? 'tv' : 'movie',
      year: date.slice(0, 4),
      title: movie.title || movie.name,
      orig: movie.original_title || movie.original_name
    }));
  }
  function play(movieId, opt) {
    opt = opt || {};
    return getJSON(API + '/hls/api/play?' + q({
      movie: movieId, s: sid(), hevc: hevc(),
      voice: opt.voice, season: opt.season, episode: opt.episode, q: opt.q
    }));
  }
  function m3u8(u) { return u && !/\.m3u8($|\?)/.test(u) ? u + '.m3u8' : u; }
  function absUrl(u) { return /^https?:/i.test(u) ? u : API + u; }
  function tierOf(w, h) {
    return (w >= 3200 || h >= 1500) ? 2160 : (w >= 1800 || h >= 1000) ? 1080 : (w >= 1200 || h >= 680) ? 720 : 480;
  }
  function variants(master) {
    return uakinoFetch(master, { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t) {
      var L = t.split(/\r?\n/), out = [], seen = {};
      for (var i = 0; i < L.length; i++) {
        if (L[i].indexOf('#EXT-X-STREAM-INF') !== 0) continue;
        var m = /RESOLUTION=(\d+)x(\d+)/.exec(L[i]), u = (L[i + 1] || '').trim();
        if (!m || !u) continue;
        var tier = tierOf(+m[1], +m[2]);
        if (!seen[tier]) { seen[tier] = 1; out.push({ t: tier, url: absUrl(u) }); }
      }
      return out;
    }).catch(function () { return []; });
  }
  function timeline(movie, s, e) {
    try {
      var orig = movie.original_title || movie.original_name || movie.title || movie.name || '';
      var key = s != null ? [s, s > 10 ? ':' : '', e, orig].join('') : orig;
      return Lampa.Timeline.view(Lampa.Utils.hash(key));
    } catch (err) { return undefined; }
  }
  function mark(view) {
    if (!view || !view.percent) return '';
    return view.percent >= 90 ? ' ✓' : ' · ' + view.percent + '%';
  }
  function back() { try { Lampa.Controller.toggle('full_start'); } catch (e) {} }
  function getPrefQ() {
    var v = parseInt(Lampa.Storage.get('uakino_q', '0'), 10);
    return TIERS.indexOf(v) >= 0 ? v : 0;
  }
  function setPrefQ(t) { Lampa.Storage.set('uakino_q', String(t || 0)); }
  function qbadge(label, gold) {
    return '<div class="uak-qb' + (gold ? ' uak-qb--gold' : '') + '">' + label + '</div>';
  }
  function isSerial(movie) {
    return !!(movie && (
      movie.name ||
      movie.number_of_seasons ||
      movie.first_air_date ||
      movie.media_type === 'tv' ||
      (movie.seasons && movie.seasons.length)
    ));
  }

  function injectTheme() {
    if (document.getElementById('uakino-lite-theme')) return;
    var css = [
      '.menu__item.active .menu__ico>*{fill:' + BLUE2 + '!important}',
      '.menu__item.active .menu__text{color:' + BLUE2 + '!important}',
      '.menu__item[data-uak="lite"] .menu__ico img{width:1.5em;height:1.5em;object-fit:contain;display:block}',
      '.card__vote,.card__quality,.full-start__rate>div:first-child{color:' + GOLD + '!important}',
      '.time-line>div,.player-panel__position{background:' + BLUE + '!important}',
      '.full-start__button.button--play.focus,.view--uakino-lite.focus{background:' + BLUE + '!important}',
      '.view--uakino-lite img{vertical-align:middle;margin-right:.35em}',
      '.uak-qb{display:inline-block;padding:.15em .45em;border-radius:.4em;background:rgba(255,255,255,.12);font-size:.85em;font-weight:700}',
      '.uak-qb--gold{color:' + GOLD + ';background:rgba(255,215,0,.15)}',
      '.uak-chip{display:inline-flex;align-items:center;gap:.35em;padding:.45em .9em;margin:.25em;border-radius:2em;background:rgba(255,255,255,.08);font-weight:600}',
      '.uak-chip--on,.uak-chip.focus{background:' + BLUE + ';color:#fff}',
      '.uak-ep{display:flex;gap:.8em;padding:.7em;margin:.35em 0;border-radius:.6em;background:rgba(255,255,255,.05)}',
      '.uak-ep.focus{background:rgba(31,111,235,.35)}',
      '.uak-ep__img{width:9em;height:5.2em;border-radius:.4em;background:#222 center/cover no-repeat;flex:none}',
      '.uak-ep__t{font-weight:700;margin-bottom:.2em}',
      '.uak-ep__s{opacity:.7;font-size:.92em}',
      '.uak-row{display:flex;flex-wrap:wrap;padding:.4em 1em}',
      '.uak-head{padding:1em 1.2em .4em;font-size:1.35em;font-weight:700}',
      '.uak-sub{padding:0 1.2em .6em;opacity:.7}'
    ].join('\n');
    var st = document.createElement('style');
    st.id = 'uakino-lite-theme';
    st.textContent = css;
    document.head.appendChild(st);
  }
  function brandHead() {
    try {
      $('.head__logo-icon img, .head .logo-icon img, .menu__logo img').each(function () {
        if (this.getAttribute('src') !== LOGO) this.setAttribute('src', LOGO);
      });
    } catch (e) {}
  }

  function filmItem(p, vars, want, title, view, meta) {
    var master = m3u8(p.manifest_abs || (API + p.manifest));
    var item = { title: title, url: master, timeline: view, uakino: meta, hls_type: 'hlsjs' };
    if (vars && vars.length) {
      var pick = null;
      if (want) {
        vars.forEach(function (v) { if (v.t <= want && (!pick || v.t > pick.t)) pick = v; });
        if (!pick) vars.forEach(function (v) { if (!pick || v.t < pick.t) pick = v; });
      }
      if (pick) item.url = pick.url;
      if (vars.length > 1) {
        var map = { 'Авто': master };
        vars.forEach(function (v) { map[TIER_KEY[v.t]] = v.url; });
        item.quality = map;
      }
    }
    if (p.subs && p.subs.length) {
      item.subtitles = p.subs.map(function (s) { return { label: s.label, url: API + s.url }; });
    }
    return item;
  }
  function playItem(item) {
    Lampa.Player.play(item);
    Lampa.Player.playlist([item]);
  }

  function chooseQuality(movie, f, p, vars, season, episode, voice) {
    var pref = getPrefQ(), avail = {};
    (vars || []).forEach(function (v) { avail[v.t] = true; });
    if (p.alt4k && hevc()) avail[2160] = true;
    if (!hevc()) delete avail[2160];

    var items = [{
      title: 'Авто', subtitle: 'за швидкістю', template: 'selectbox_icon',
      icon: qbadge('AUTO'), tier: 0, selected: !pref || !avail[pref]
    }];
    TIERS.forEach(function (t) {
      if (avail[t]) items.push({
        title: TIER_NAME[t], template: 'selectbox_icon',
        icon: qbadge(TIER_BADGE[t], t === 2160), tier: t, selected: pref === t
      });
    });
    var voices = p.voices || [];
    if (voices.length > 1) {
      items.push({
        title: 'Озвучка: ' + (voice || voices[0] || 'українська'),
        subtitle: 'змінити', template: 'selectbox_icon', icon: MIC, voiceRow: true
      });
    }
    if (items.length === 1) return startPlay(movie, f, p, vars, 0, voice, season, episode);

    Lampa.Select.show({
      title: movie.title || movie.name || 'UAKino',
      items: items, onBack: back,
      onSelect: function (it) {
        if (it.voiceRow) {
          Lampa.Select.show({
            title: 'Озвучка',
            items: voices.map(function (v) {
              return { title: v, voice: v, selected: v === voice, template: 'selectbox_icon', icon: MIC };
            }),
            onBack: function () { chooseQuality(movie, f, p, vars, season, episode, voice); },
            onSelect: function (v) {
              Lampa.Loading.start(function () { Lampa.Loading.stop(); });
              play(f.movie_id, { voice: v.voice, season: season, episode: episode }).then(function (pp) {
                return variants(m3u8(pp.manifest_abs || (API + pp.manifest))).then(function (vv) {
                  Lampa.Loading.stop();
                  chooseQuality(movie, f, pp, vv, season, episode, v.voice);
                });
              }).catch(function (e) {
                Lampa.Loading.stop();
                Lampa.Noty.show('UAKino: ' + (e && e.message || 'помилка'));
              });
            }
          });
          return;
        }
        setPrefQ(it.tier);
        startPlay(movie, f, p, vars, it.tier, voice, season, episode);
      }
    });
  }

  function startPlay(movie, f, p, vars, tier, voice, season, episode) {
    var meta = { movie: f.movie_id, voice: voice, season: season, episode: episode };
    var view = timeline(movie, season, episode);
    var title = movie.title || movie.name || 'UAKino';
    if (season != null) title += ' S' + season + 'E' + episode;
    if (tier === 2160 && p.alt4k && hevc()) {
      Lampa.Loading.start(function () { Lampa.Loading.stop(); });
      return play(f.movie_id, { voice: voice, season: season, episode: episode, q: '2160' }).then(function (pp) {
        Lampa.Loading.stop();
        playItem(filmItem(pp, [], 0, title + ' · 4K', view, meta));
      }).catch(function (e) {
        Lampa.Loading.stop();
        Lampa.Noty.show('UAKino: ' + (e && e.message || '4K недоступно'));
      });
    }
    playItem(filmItem(p, vars, tier, title, view, meta));
  }

  function SeriesPage(object) {
    var scroll = new Lampa.Scroll({ mask: true, over: true });
    var body = $('<div class="uak-series"></div>');
    var movie = object.movie || object.card;
    var f = object.uak_find;
    var st = { p: null, voice: null, season: 1 };
    var self = this;

    this.create = function () {
      this.activity.loader(true);
      scroll.render().find('.scroll__content').append(body);
      play(f.movie_id, {}).then(function (p) {
        st.p = p;
        var voices = p.voices || [];
        st.voice = Lampa.Storage.get('uakino_voice_' + f.movie_id, '') || voices[0] || null;
        if (voices.indexOf(st.voice) < 0) st.voice = voices[0] || null;
        var eps = (p.episodes || []).filter(function (e) {
          return (e.voice || null) === (st.voice || null) && e.episode != null;
        });
        if (!eps.length && p.episodes && p.episodes.length) {
          st.voice = p.episodes[0].voice || null;
          eps = p.episodes.filter(function (e) { return e.episode != null; });
        }
        var seasons = eps.map(function (e) { return e.season; })
          .filter(function (s, i, a) { return a.indexOf(s) === i; })
          .sort(function (a, b) { return a - b; });
        if (!seasons.length) seasons = [1];
        st.season = seasons[0];
        renderAll(voices, seasons);
        self.activity.loader(false);
        self.activity.toggle();
      }).catch(function (e) {
        body.append('<div class="uak-sub">Помилка: ' + (e && e.message || 'немає даних') + '</div>');
        self.activity.loader(false);
        self.activity.toggle();
      });
    };

    function renderAll(voices, seasons) {
      body.empty();
      body.append('<div class="uak-head">' + (movie.title || movie.name || 'Серіал') + '</div>');
      body.append('<div class="uak-sub">UAKino · озвучка, сезон, серія</div>');

      if (voices && voices.length) {
        var rowV = $('<div class="uak-row"></div>');
        voices.forEach(function (v) {
          var ch = $('<div class="uak-chip selector' + (v === st.voice ? ' uak-chip--on' : '') + '">' + v + '</div>');
          ch.on('hover:enter', function () {
            st.voice = v;
            Lampa.Storage.set('uakino_voice_' + f.movie_id, v);
            var eps = (st.p.episodes || []).filter(function (e) {
              return (e.voice || null) === (v || null) && e.episode != null;
            });
            var ss = eps.map(function (e) { return e.season; })
              .filter(function (s, i, a) { return a.indexOf(s) === i; })
              .sort(function (a, b) { return a - b; });
            if (!ss.length) ss = seasons;
            st.season = ss[0] || 1;
            renderAll(voices, ss);
          });
          rowV.append(ch);
        });
        body.append(rowV);
      }

      var rowS = $('<div class="uak-row"></div>');
      seasons.forEach(function (s) {
        var ch = $('<div class="uak-chip selector' + (s === st.season ? ' uak-chip--on' : '') + '">Сезон ' + s + '</div>');
        ch.on('hover:enter', function () {
          st.season = s;
          renderAll(voices, seasons);
        });
        rowS.append(ch);
      });
      body.append(rowS);

      var list = $('<div class="uak-eps" style="padding:.5em 1em 2em"></div>');
      var eps = (st.p.episodes || []).filter(function (e) {
        return e.season === st.season && e.episode != null &&
          ((e.voice || null) === (st.voice || null) || !(st.p.voices || []).length);
      });
      eps.sort(function (a, b) { return a.episode - b.episode; });

      if (!eps.length) {
        list.append('<div class="uak-sub">Немає серій для цієї озвучки/сезону</div>');
      } else {
        eps.forEach(function (ep) {
          var view = timeline(movie, ep.season, ep.episode);
          var img = ep.scene || ep.poster || '';
          if (img && !/^https?:/i.test(img)) img = API + img;
          var el = $('<div class="uak-ep selector">' +
            '<div class="uak-ep__img"' + (img ? ' style="background-image:url(' + img + ')"' : '') + '></div>' +
            '<div><div class="uak-ep__t">Серія ' + ep.episode + mark(view) + '</div>' +
            '<div class="uak-ep__s">' + (ep.title || ep.name || '') +
            (ep.air_date ? ' · ' + ep.air_date : '') + '</div></div></div>');
          el.on('hover:enter', function () {
            Lampa.Loading.start(function () { Lampa.Loading.stop(); });
            play(f.movie_id, {
              voice: st.voice, season: ep.season, episode: ep.episode
            }).then(function (pp) {
              return variants(m3u8(pp.manifest_abs || (API + pp.manifest))).then(function (vv) {
                Lampa.Loading.stop();
                chooseQuality(movie, f, pp, vv, ep.season, ep.episode, st.voice);
              });
            }).catch(function (e) {
              Lampa.Loading.stop();
              Lampa.Noty.show('UAKino: ' + (e && e.message || 'помилка'));
            });
          });
          list.append(el);
        });
      }
      body.append(list);
      try {
        Lampa.Controller.collectionSet(scroll.render());
        Lampa.Controller.collectionFocus(body.find('.selector').first()[0], scroll.render());
      } catch (e) {}
    }

    this.start = function () {
      Lampa.Controller.add('content', {
        toggle: function () {
          Lampa.Controller.collectionSet(scroll.render());
          Lampa.Controller.collectionFocus(false, scroll.render());
        },
        left: function () {
          if (Navigator.canmove('left')) Navigator.move('left');
          else Lampa.Controller.toggle('menu');
        },
        right: function () { Navigator.move('right'); },
        up: function () {
          if (Navigator.canmove('up')) Navigator.move('up');
          else Lampa.Controller.toggle('head');
        },
        down: function () { Navigator.move('down'); },
        back: function () { Lampa.Activity.backward(); }
      });
      Lampa.Controller.toggle('content');
    };
    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return scroll.render(); };
    this.destroy = function () { try { scroll.destroy(); } catch (e) {} };
  }

  function openFilm(movie) {
    Lampa.Loading.start(function () { Lampa.Loading.stop(); });
    find(movie).then(function (f) {
      if (!f || !f.found) {
        Lampa.Loading.stop();
        Lampa.Noty.show('UAKino: не знайдено');
        return;
      }
      return play(f.movie_id, {}).then(function (p) {
        return variants(m3u8(p.manifest_abs || (API + p.manifest))).then(function (vars) {
          Lampa.Loading.stop();
          chooseQuality(movie, f, p, vars, null, null, null);
        });
      });
    }).catch(function (e) {
      Lampa.Loading.stop();
      Lampa.Noty.show('UAKino: ' + (e && e.message || 'немає звʼязку'));
    });
  }

  function openSeries(movie) {
    Lampa.Loading.start(function () { Lampa.Loading.stop(); });
    find(movie).then(function (f) {
      Lampa.Loading.stop();
      if (!f || !f.found) {
        Lampa.Noty.show('UAKino: не знайдено');
        return;
      }
      Lampa.Activity.push({
        url: '',
        title: movie.title || movie.name || 'UAKino',
        component: 'uakino_series_lite',
        movie: movie,
        uak_find: f
      });
    }).catch(function (e) {
      Lampa.Loading.stop();
      Lampa.Noty.show('UAKino: ' + (e && e.message || 'немає звʼязку'));
    });
  }

  function addButton(e) {
    try {
      var render = e.object.activity.render();
      if (render.find('.view--uakino-lite').length) return;
      var movie = e.data.movie;      Lampa.Select.show({
            title: 'Озвучка',
            items: voices.map(function (v) {
              return { title: v, voice: v, selected: v === voice, template: 'selectbox_icon', icon: MIC };
            }),
            onBack: function () { chooseQuality(movie, f, p, vars, season, episode, voice); },
            onSelect: function (v) {
              Lampa.Loading.start(function () { Lampa.Loading.stop(); });
              play(f.movie_id, { voice: v.voice, season: season, episode: episode }).then(function (pp) {
                return variants(m3u8(pp.manifest_abs || (API + pp.manifest))).then(function (vv) {
                  Lampa.Loading.stop();
                  chooseQuality(movie, f, pp, vv, season, episode, v.voice);
                });
              }).catch(function (e) {
                Lampa.Loading.stop();
                Lampa.Noty.show('UAKino: ' + (e && e.message || 'помилка'));
              });
            }
          });
          return;
        }
        setPrefQ(it.tier);
        startPlay(movie, f, p, vars, it.tier, voice, season, episode);
      }
    });
  }

  function startPlay(movie, f, p, vars, tier, voice, season, episode) {
    var meta = { movie: f.movie_id, voice: voice, season: season, episode: episode };
    var view = timeline(movie, season, episode);
    var title = movie.title || movie.name || 'UAKino';
    if (season != null) title += ' S' + season + 'E' + episode;
    if (tier === 2160 && p.alt4k && hevc()) {
      Lampa.Loading.start(function () { Lampa.Loading.stop(); });
      return play(f.movie_id, { voice: voice, season: season, episode: episode, q: '2160' }).then(function (pp) {
        Lampa.Loading.stop();
        playItem(filmItem(pp, [], 0, title + ' · 4K', view, meta));
      }).catch(function (e) {
        Lampa.Loading.stop();
        Lampa.Noty.show('UAKino: ' + (e && e.message || '4K недоступно'));
      });
    }
    playItem(filmItem(p, vars, tier, title, view, meta));
  }

  // ─── сторінка серіалу ───
  function SeriesPage(object) {
    var scroll = new Lampa.Scroll({ mask: true, over: true });
    var body = $('<div class="uak-series"></div>');
    var movie = object.movie || object.card;
    var f = object.uak_find;
    var st = { p: null, voice: null, season: 1 };
    var self = this;

    this.create = function () {
      this.activity.loader(true);
      scroll.render().find('.scroll__content').append(body);
      play(f.movie_id, {}).then(function (p) {
        st.p = p;
        var voices = p.voices || [];
        st.voice = Lampa.Storage.get('uakino_voice_' + f.movie_id, '') || voices[0] || null;
        if (voices.indexOf(st.voice) < 0) st.voice = voices[0] || null;
        var eps = (p.episodes || []).filter(function (e) {
          return (e.voice || null) === (st.voice || null) && e.episode != null;
        });
        if (!eps.length && p.episodes && p.episodes.length) {
          st.voice = p.episodes[0].voice || null;
          eps = p.episodes.filter(function (e) { return e.episode != null; });
        }
        var seasons = eps.map(function (e) { return e.season; })
          .filter(function (s, i, a) { return a.indexOf(s) === i; })
          .sort(function (a, b) { return a - b; });
        if (!seasons.length) seasons = [1];
        st.season = seasons[0];
        renderAll(voices, seasons);
        self.activity.loader(false);
        self.activity.toggle();
      }).catch(function (e) {
        body.append('<div class="uak-sub">Помилка: ' + (e && e.message || 'немає даних') + '</div>');
        self.activity.loader(false);
        self.activity.toggle();
      });
    };

    function renderAll(voices, seasons) {
      body.empty();
      body.append('<div class="uak-head">' + (movie.title || movie.name || 'Серіал') + '</div>');
      body.append('<div class="uak-sub">UAKino · оберіть озвучку, сезон і серію</div>');

      if (voices && voices.length) {
        var rowV = $('<div class="uak-row"></div>');
        voices.forEach(function (v) {
          var ch = $('<div class="uak-chip selector' + (v === st.voice ? ' uak-chip--on' : '') + '">' + v + '</div>');
          ch.on('hover:enter', function () {
            st.voice = v;
            Lampa.Storage.set('uakino_voice_' + f.movie_id, v);
            var eps = (st.p.episodes || []).filter(function (e) {
              return (e.voice || null) === (v || null) && e.episode != null;
            });
            var ss = eps.map(function (e) { return e.season; })
              .filter(function (s, i, a) { return a.indexOf(s) === i; })
              .sort(function (a, b) { return a - b; });
            if (!ss.length) ss = seasons;
            st.season = ss[0] || 1;
            renderAll(voices, ss);
          });
          rowV.append(ch);
        });
        body.append(rowV);
      }

      var rowS = $('<div class="uak-row"></div>');
      seasons.forEach(function (s) {
        var ch = $('<div class="uak-chip selector' + (s === st.season ? ' uak-chip--on' : '') + '">Сезон ' + s + '</div>');
        ch.on('hover:enter', function () {
          st.season = s;
          renderAll(voices, seasons);
        });
        rowS.append(ch);
      });
      body.append(rowS);

      var list = $('<div class="uak-eps" style="padding:.5em 1em 2em"></div>');
      var eps = (st.p.episodes || []).filter(function (e) {
        return e.season === st.season && e.episode != null &&
          ((e.voice || null) === (st.voice || null) || !(st.p.voices || []).length);
      });
      eps.sort(function (a, b) { return a.episode - b.episode; });

      if (!eps.length) {
        list.append('<div class="uak-sub">Немає серій для цієї озвучки/сезону</div>');
      } else {
        eps.forEach(function (ep) {
          var view = timeline(movie, ep.season, ep.episode);
          var img = ep.scene || ep.poster || '';
          if (img && !/^https?:/i.test(img)) img = API + img;
          var el = $('<div class="uak-ep selector">' +
            '<div class="uak-ep__img"' + (img ? ' style="background-image:url(' + img + ')"' : '') + '></div>' +
            '<div><div class="uak-ep__t">Серія ' + ep.episode + mark(view) + '</div>' +
            '<div class="uak-ep__s">' + (ep.title || ep.name || '') +
            (ep.air_date ? ' · ' + ep.air_date : '') + '</div></div></div>');
          el.on('hover:enter', function () {
            Lampa.Loading.start(function () { Lampa.Loading.stop(); });
            play(f.movie_id, {
              voice: st.voice, season: ep.season, episode: ep.episode
            }).then(function (pp) {
              return variants(m3u8(pp.manifest_abs || (API + pp.manifest))).then(function (vv) {
                Lampa.Loading.stop();
                chooseQuality(movie, f, pp, vv, ep.season, ep.episode, st.voice);
              });
            }).catch(function (e) {
              Lampa.Loading.stop();
              Lampa.Noty.show('UAKino: ' + (e && e.message || 'помилка'));
            });
          });
          list.append(el);
        });
      }
      body.append(list);
      try {
        Lampa.Controller.collectionSet(scroll.render());
        Lampa.Controller.collectionFocus(body.find('.selector').first()[0], scroll.render());
      } catch (e) {}
    }

    this.start = function () {
      Lampa.Controller.add('content', {
        toggle: function () {
          Lampa.Controller.collectionSet(scroll.render());
          Lampa.Controller.collectionFocus(false, scroll.render());
        },
        left: function () { if (Navigator.canmove('left')) Navigator.move('left'); else Lampa.Controller.toggle('menu'); },
        right: function () { Navigator.move('right'); },
        up: function () { if (Navigator.canmove('up')) Navigator.move('up'); else Lampa.Controller.toggle('head'); },
        down: function () { Navigator.move('down'); },
        back: function () { Lampa.Activity.backward(); }
      });
      Lampa.Controller.toggle('content');
    };
    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return scroll.render(); };
    this.destroy = function () { try { scroll.destroy(); } catch (e) {} };
  }

  // ─── кнопка на картці ───
  function open(movie) {
    Lampa.Loading.start(function () { Lampa.Loading.stop(); });
    find(movie).then(function (f) {
      if (!f || !f.found) {
        Lampa.Loading.stop();
        Lampa.Noty.show('UAKino: не знайдено');
        return;
      }
      var isSerial = !!(movie.name || movie.number_of_seasons || movie.first_air_date || f.is_series);
      if (isSerial) {
        Lampa.Loading.stop();
        Lampa.Activity.push({
          url: '',
          title: movie.title || movie.name || 'UAKino',
          component: 'uakino_series_lite',
          movie: movie,
          uak_find: f
        });
        return;
      }
      return play(f.movie_id, {}).then(function (p) {
        return variants(m3u8(p.manifest_abs || (API + p.manifest))).then(function (vars) {
          Lampa.Loading.stop();
          chooseQuality(movie, f, p, vars, null, null, null);
        });
      });
    }).catch(function (e) {
      Lampa.Loading.stop();
      Lampa.Noty.show('UAKino: ' + (e && e.message || 'немає звʼязку'));
    });
  }

  function addButton(e) {
    try {
      var render = e.object.activity.render();
      if (render.find('.view--uakino-lite').length) return;
      var movie = e.data.movie;
      if (!movie) return;
      var btn = $('<div class="full-start__button selector view--uakino-lite" data-subtitle="uakino.ax">' +
        ICON + '<span>UAKino</span></div>');
      btn.on('hover:enter', function () { open(movie); });
      var anchor = render.find('.view--torrent, .view--online, .button--play').first();
      if (anchor.length) anchor.after(btn);
      else render.find('.full-start-new__buttons, .full-start__buttons').first().append(btn);
    } catch (err) {
      console.log('uakino_lite btn', err);
    }
  }

  function ready() {
    injectTheme();
    brandHead();
    try {
      if (window.MutationObserver) {
        new MutationObserver(function () { brandHead(); })
          .observe(document.body, { childList: true, subtree: true });
      }
    } catch (e) {}

    Lampa.Component.add('uakino_series_lite', SeriesPage);
    Lampa.Listener.follow('full', function (e) {
      if (e.type === 'complite') {
        try { addButton(e); } catch (err) { console.log('uakino_lite', err); }
      }
    });
  }

  if (window.appready) ready();
  else {
    Lampa.Listener.follow('app', function (e) {
      if (e.type === 'ready') ready();
    });
  }
})();
