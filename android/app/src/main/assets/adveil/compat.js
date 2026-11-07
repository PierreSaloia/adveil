(() => {
  'use strict';
  // Keep the correction narrow: do not falsify arbitrary network responses,
  // element sizes, video events or advertising impressions.
  const host = location.hostname;
  const isGateway = ['mixumenu.com', 'investcentro.com'].some(domain => host === domain || host.endsWith('.' + domain));
  if (isGateway && typeof window.fetch === 'function') {
    const originalFetch = window.fetch;
    window.fetch = new Proxy(originalFetch, {
      apply(target, receiver, args) {
        const [input, init] = args;
        let url;
        try { url = new URL(input instanceof Request ? input.url : String(input), location.href); }
        catch { return Reflect.apply(target, receiver, args); }
        const method = String(init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
        if (url.protocol === 'https:' && url.hostname === 'www.popads.net' && url.pathname === '/js/adblock.js' && method === 'GET') {
          const signal = init?.signal ?? (input instanceof Request ? input.signal : null);
          if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
          return Promise.resolve(new Response('/* local compatibility probe */', {
            status: 200, headers: {'Content-Type': 'application/javascript'}
          }));
        }
        return Reflect.apply(target, receiver, args);
      }
    });
  }

  const isSushi = ['sushianimes.com.br'].some(domain => host === domain || host.endsWith('.' + domain));
  if (isSushi) {
    const cleanResult = Object.freeze({ detected: false, blockerType: null, path: null, browser: null });

    try {
      Object.defineProperty(window, 'AABC_DETECTION', {
        configurable: true,
        enumerable: true,
        get: () => cleanResult,
        set: () => {}
      });
      Object.defineProperty(window, '__tlm', {
        configurable: true,
        enumerable: true,
        get: () => cleanResult,
        set: () => {}
      });
    } catch {}

    const origAddEventListener = window.addEventListener;
    window.addEventListener = function (type, listener, options) {
      if (type === 'aabc:detection' && typeof listener === 'function') {
        try {
          setTimeout(() => {
            try { listener.call(window, new CustomEvent('aabc:detection', { detail: cleanResult })); } catch {}
          }, 0);
        } catch {}
      }
      return origAddEventListener.call(window, type, listener, options);
    };

    let originalEnsure = null;
    Object.defineProperty(window, '__sushiGuardEnsureLayer', {
      configurable: true,
      enumerable: true,
      get: () => function () {
        if (typeof window.__sushiGuardApprove === 'function') {
          try { window.__sushiGuardApprove(); } catch {}
        }
        return document.getElementById('antiAdBlock');
      },
      set: fn => { originalEnsure = fn; }
    });

    let currentApprove = null;
    Object.defineProperty(window, '__sushiGuardApprove', {
      configurable: true,
      enumerable: true,
      get: () => currentApprove || function () {
        document.documentElement.classList.remove('sushi-guard-locked');
        if (document.body) document.body.classList.remove('sushi-guard-locked');
        const layer = document.getElementById('antiAdBlock');
        if (layer) {
          layer.classList.add('hidden');
          layer.style.setProperty('display', 'none', 'important');
        }
      },
      set: fn => {
        currentApprove = fn;
        try { fn(); } catch {}
      }
    });

    const origClassAdd = DOMTokenList.prototype.add;
    DOMTokenList.prototype.add = function (...tokens) {
      const allowed = tokens.filter(t => t !== 'sushi-guard-locked');
      if (allowed.length) {
        return origClassAdd.apply(this, allowed);
      }
    };

    function cleanElements(root) {
      if (!root || !root.querySelectorAll) return;
      const layer = root.id === 'antiAdBlock' ? root : root.querySelector?.('#antiAdBlock');
      if (layer) {
        layer.classList.add('hidden');
        layer.style.setProperty('display', 'none', 'important');
      }
      const adElements = root.querySelectorAll?.('.ads-embed, .sushipay-banner, [data-sushi-aabc-hidden]');
      if (adElements) {
        for (let i = 0; i < adElements.length; i++) {
          adElements[i].style.setProperty('display', 'none', 'important');
          adElements[i].style.setProperty('visibility', 'hidden', 'important');
        }
      }
    }

    if (document.documentElement) cleanElements(document.documentElement);
    if (window.MutationObserver) {
      const observer = new MutationObserver(mutations => {
        for (const m of mutations) {
          if (m.target === document.documentElement || m.target === document.body) {
            document.documentElement.classList.remove('sushi-guard-locked');
            if (document.body) document.body.classList.remove('sushi-guard-locked');
          }
          for (let i = 0; i < m.addedNodes.length; i++) {
            const node = m.addedNodes[i];
            if (node.nodeType === 1) cleanElements(node);
          }
        }
      });
      observer.observe(document.documentElement || document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    const origAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function (child) {
      if (child && child.nodeName === 'SCRIPT' && typeof child.src === 'string' && child.src.includes('wingsmob.com')) {
        return child;
      }
      return origAppendChild.call(this, child);
    };

    window.addEventListener('DOMContentLoaded', () => {
      if (typeof window.__sushiGuardApprove === 'function') {
        try { window.__sushiGuardApprove(); } catch {}
      }
    }, { once: true });
  }

  const isOtakulogia = location.hostname === 'otakulogia.com' || location.hostname.endsWith('.otakulogia.com');
  if (isOtakulogia) {
    const defineValue = (target, prop, value) => {
      try {
        Object.defineProperty(target, prop, { value, writable: true, configurable: true });
      } catch {}
    };

    const ANON_TOKEN = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJzdWIiOiJhbm9uIiwicm9sZSI6IlVTRVIiLCJleHAiOjQxMDI0NDQ3OTl9.local';
    const ANON_USER = Object.freeze({
      __typename: 'UserEntity',
      id: 'anon',
      name: 'Visitante Anônimo',
      username: 'anonimo',
      email: 'anon@otakulogia.local',
      role: 'USER',
      accountType: 'LOCAL',
      isVip: true,
      vipUntil: '2099-12-31T23:59:59.000Z',
      vipPlan: 'YEARLY'
    });

    const BLOCKED_STORAGE_KEYS = new Set([
      'otk_local_daily_watch',
      'otk_delayed_vip_play_used',
      'otk_soft_play_episode_count',
      'otk_soft_play_last_episode',
      'otk_play_link_opened_episodes',
      'otk_guest_anime_opened',
      'otk_guest_anime_open_count',
      'otakulogia.attribution.v1',
      'otk_pay_intent',
      'otk_pay_intent_reason',
      'otakulogia:apollo-cache:v1',
      'otakulogia:apollo-cache-meta:v1',
      'otakulogia_access_token',
      'otakulogia:user',
      'otakulogia:refresh_token_at'
    ]);

    const EPHEMERAL_ID_KEYS = new Set([
      'otk_visitor_id',
      'otakulogia_visitor_id'
    ]);

    const PROMPT_COOLDOWN_KEYS = new Set([
      'otakulogia-push-prompt-shown-at',
      'otakulogia-pwa-prompt-shown-at',
      'otakulogia-instagram-prompt-shown-at'
    ]);

    const randomVisitorId = () => 'v_' + Date.now() + '_' + Math.random().toString(36).slice(2, 11);
    const sessionVisitorId = randomVisitorId();

    const origGetItem = Storage.prototype.getItem;
    const origSetItem = Storage.prototype.setItem;
    const origRemoveItem = Storage.prototype.removeItem;

    try {
      for (const key of [...BLOCKED_STORAGE_KEYS, ...EPHEMERAL_ID_KEYS]) {
        try { origRemoveItem.call(localStorage, key); } catch {}
        try { origRemoveItem.call(sessionStorage, key); } catch {}
      }
    } catch {}

    defineValue(Storage.prototype, 'getItem', function (key) {
      const k = String(key);
      if (k === 'otk_local_daily_watch') {
        return JSON.stringify({ date: new Date().toISOString().slice(0, 10), seconds: 0 });
      }
      if ( k === 'otakulogia_access_token') {
        return ANON_TOKEN;
      }
      if (k === 'otakulogia:user') {
        return JSON.stringify(ANON_USER);
      }
      if (BLOCKED_STORAGE_KEYS.has(k)) {
        return null;
      }
      if (EPHEMERAL_ID_KEYS.has(k)) {
        return sessionVisitorId;
      }
      if (k === 'otakulogia-instagram-prompt-never' || k.startsWith('otakulogia-vip-discord-prompt-dismissed:')) {
        return '1';
      }
      if (PROMPT_COOLDOWN_KEYS.has(k)) {
        return String(Date.now());
      }
      return origGetItem.call(this, key);
    });

    defineValue(Storage.prototype, 'setItem', function (key, value) {
      const k = String(key);
      if (BLOCKED_STORAGE_KEYS.has(k) || EPHEMERAL_ID_KEYS.has(k)) {
        return;
      }
      return origSetItem.call(this, key, value);
    });

    const noop = () => {};
    if (!('fbq' in window)) {
      const fbq = function () {};
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      defineValue(window, 'fbq', fbq);
      defineValue(window, '_fbq', fbq);
    }
    if (!('gtag' in window)) {
      defineValue(window, 'gtag', noop);
    }

    // Block pop-under and external ad tab openings on play/episode clicks
    if (typeof window.open === 'function') {
      const origOpen = window.open.bind(window);
      defineValue(window, 'open', function (url, target, features) {
        try {
          const parsed = new URL(String(url || ''), location.href);
          if (parsed.hostname === location.hostname || parsed.hostname.endsWith('.otakulogia.com') || parsed.hostname.endsWith('.google.com')) {
            return origOpen(url, target, features);
          }
        } catch {}
        return null;
      });
    }

    // Anti-pause guard: prevent timers/paywalls from programmatically pausing active video playback
    let lastUserGestureAt = 0;
    const markUserGesture = (ev) => {
      if (!ev || ev.isTrusted !== false) {
        lastUserGestureAt = Date.now();
      }
    };
    for (const evt of ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown']) {
      try { window.addEventListener(evt, markUserGesture, true); } catch {}
    }
    if (typeof HTMLMediaElement !== 'undefined' && HTMLMediaElement.prototype && typeof HTMLMediaElement.prototype.pause === 'function') {
      const origPause = HTMLMediaElement.prototype.pause;
      defineValue(HTMLMediaElement.prototype, 'pause', function () {
        const withinGesture = (Date.now() - lastUserGestureAt) < 800;
        if (!withinGesture && !this.ended && this.currentTime > 0 && (!document.visibilityState || document.visibilityState === 'visible')) {
          return;
        }
        return origPause.apply(this, arguments);
      });
    }

    if (typeof navigator === 'object' && navigator && typeof navigator.sendBeacon === 'function') {
      const origSendBeacon = navigator.sendBeacon.bind(navigator);
      defineValue(navigator, 'sendBeacon', function (url, data) {
        const target = String(url || '');
        if (/google-analytics\.com|analytics\.google\.com|googletagmanager\.com|firebase|facebook\.com|connect\.facebook\.net|magsrv\.com|pemsrv\.com|exoclick\.com|otakulogia\.com\/graphql/i.test(target)) {
          return true;
        }
        return origSendBeacon(url, data);
      });
    }

    const episodeMediaCache = new Map();
    const cacheEpisodesFromData = (data) => {
      if (!data || typeof data !== 'object') return;
      const detailEps = data?.animeCatalogDetail?.episodes;
      if (Array.isArray(detailEps)) {
        for (const ep of detailEps) {
          const id = String(ep?.upstreamId ?? ep?.id ?? '');
          if (id && (ep.videoUrl || ep.videoUrlFhd || ep.videoUrlSd)) {
            episodeMediaCache.set(id, {
              id,
              video_title: ep.title || 'Episódio',
              video_url: ep.videoUrl || ep.videoUrlFhd || ep.videoUrlSd || '',
              video_url_fhd: ep.videoUrlFhd || ep.videoUrl || '',
              video_url_sd: ep.videoUrlSd || ep.videoUrl || '',
              video_thumbnail_s: ep.thumbnailSmall || null,
              video_thumbnail_b: ep.thumbnailLarge || null,
              audio_type: ep.audioType || null,
              video_type: ep.videoType || 'mp4',
              video_description: ep.description || null
            });
          }
        }
      }
      const catEps = data?.VideoByCatId;
      if (Array.isArray(catEps)) {
        for (const ep of catEps) {
          const id = String(ep?.id ?? ep?.video_id ?? '');
          if (id && (ep.video_url || ep.video_url_fhd || ep.video_url_sd)) {
            episodeMediaCache.set(id, ep);
          }
        }
      }
    };

    const jsonResponse = (body) => new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

    const buildLocalGraphQLResult = (payload) => {
      const q = String(payload?.query || '');
      const op = String(payload?.operationName || '');
      if (op === 'TrackActivity' || /\btrackActivity\s*\(/.test(q)) {
        return { data: { trackActivity: true } };
      }
      if (op === 'RecordWatchTime' || /\brecordWatchTime\s*\(/.test(q)) {
        return {
          data: {
            recordWatchTime: {
              __typename: 'WatchTimeStatus',
              secondsWatched: 0,
              dailyLimitSeconds: 86400,
              secondsRemaining: 86400,
              isVip: true,
              limitReached: false
            }
          }
        };
      }
      if (op === 'DailyWatchTime' || /\bdailyWatchTime\s*\(/.test(q)) {
        return {
          data: {
            dailyWatchTime: {
              __typename: 'WatchTimeStatus',
              secondsWatched: 0,
              dailyLimitSeconds: 86400,
              secondsRemaining: 86400,
              isVip: true,
              limitReached: false
            }
          }
        };
      }
      if (op === 'WatchPlayGate' || op === 'RequiresVipToWatch' || /\b(?:requiresVipToWatch|shouldShowSoftPlayPaywall)\b/.test(q)) {
        return {
          data: {
            requiresVipToWatch: false,
            shouldShowSoftPlayPaywall: false
          }
        };
      }
      if (op === 'DailyDownloadStatus' || /\bdailyDownloadStatus\b/.test(q)) {
        return {
          data: {
            dailyDownloadStatus: {
              __typename: 'DownloadLimitStatus',
              downloadsToday: 0,
              dailyLimitDownloads: 999,
              downloadsRemaining: 999,
              isVip: true,
              limitReached: false
            }
          }
        };
      }
      if (op === 'Me' || /\bquery\s+Me\b/.test(q)) {
        return { data: { me: ANON_USER } };
      }
      if (op === 'RefreshToken' || /\bmutation\s+RefreshToken\b/.test(q)) {
        return { data: { refreshToken: { __typename: 'AuthPayload', accessToken: ANON_TOKEN } } };
      }
      if (op === 'WatchProgress' || /\bwatchProgress\s*\(/.test(q)) {
        return { data: { watchProgress: null } };
      }
      if (op === 'AnimeWatchProgress' || /\banimeWatchProgress\s*\(/.test(q)) {
        return { data: { animeWatchProgress: [] } };
      }
      if (op === 'ContinueWatching' || /\bcontinueWatching\b/.test(q)) {
        return { data: { continueWatching: [] } };
      }
      if (op === 'MyList' || op === 'IsAnimeInMyList' || /\b(?:myList|isAnimeInMyList)\b/.test(q)) {
        return { data: { myList: [], isAnimeInMyList: false } };
      }
      if (op === 'UpsertWatchProgress' || /\bupsertWatchProgress\s*\(/.test(q)) {
        const input = payload?.variables?.input || {};
        return {
          data: {
            upsertWatchProgress: {
              __typename: 'WatchProgressEntity',
              id: 'anon-' + (input.upstreamEpisodeId ?? 0),
              upstreamEpisodeId: input.upstreamEpisodeId ?? 0,
              progressPercent: input.progressPercent ?? 0,
              completed: Boolean(input.completed),
              lastWatchedAt: new Date().toISOString()
            }
          }
        };
      }
      if (op === 'RemoveFromContinueWatching' || /\bremoveFromContinueWatching\b/.test(q)) {
        return { data: { removeFromContinueWatching: true } };
      }
      return null;
    };

    if (typeof window.fetch === 'function') {
      const origFetch = window.fetch.bind(window);
      defineValue(window, 'fetch', async function (input, init) {
        const url = typeof input === 'string' ? input : (input && typeof input.url === 'string' ? input.url : String(input || ''));
        if (/firebase\.googleapis\.com|firebaseinstallations\.googleapis\.com/i.test(url)) {
          return jsonResponse({
            fid: 'c_anon_00000000000000',
            refreshToken: 'anon',
            authToken: { token: 'anon', expiresIn: '604800s' },
            measurementId: 'G-0000000000'
          });
        }
        if (/google-analytics\.com|analytics\.google\.com|googletagmanager\.com|facebook\.com|connect\.facebook\.net|magsrv\.com|pemsrv\.com|exoclick\.com/i.test(url)) {
          return new Response(null, { status: 204 });
        }

        if (/\/graphql(?:[?#]|$)/i.test(url)) {
          let rawBody = init?.body;
          if (!rawBody && input && typeof input === 'object' && typeof input.clone === 'function') {
            try { rawBody = await input.clone().text(); } catch {}
          }
          if (typeof rawBody === 'string' && rawBody.trim().startsWith('{')) {
            try {
              const payload = JSON.parse(rawBody);
              const localResult = buildLocalGraphQLResult(payload);
              if (localResult) {
                return jsonResponse(localResult);
              }
              let modified = false;
              if (payload?.variables?.input && typeof payload.variables.input === 'object' && 'visitorId' in payload.variables.input) {
                payload.variables = {
                  ...payload.variables,
                  input: { ...payload.variables.input, visitorId: randomVisitorId() }
                };
                modified = true;
              }
              const nextHeaders = { ...(init?.headers || {}) };
              for (const hk of Object.keys(nextHeaders)) {
                if (hk.toLowerCase() === 'authorization') {
                  delete nextHeaders[hk];
                }
              }
              const nextInit = {
                ...(init || {}),
                headers: nextHeaders,
                ...(modified ? { body: JSON.stringify(payload) } : {})
              };
              const response = await origFetch(typeof input !== 'string' ? url : input, nextInit);
              const clone = response.clone();
              try {
                const body = await clone.json();
                if (body?.data) {
                  cacheEpisodesFromData(body.data);
                }
                let patched = false;
                if (body?.errors && (payload?.operationName === 'SingleVideo' || /\bSingleVideo\s*\(/.test(String(payload?.query || '')))) {
                  const vid = String(payload?.variables?.input?.videoId ?? '');
                  if (vid && episodeMediaCache.has(vid)) {
                    return jsonResponse({ data: { SingleVideo: { ARRAY: [episodeMediaCache.get(vid)] } } });
                  }
                }
                if (body?.data?.appSettings && typeof body.data.appSettings === 'object') {
                  body.data.appSettings = {
                    ...body.data.appSettings,
                    forcePaywall: false,
                    forcePaywallAfterOneEpisode: false,
                    forcePaywallAfterThreeEpisodes: false,
                    forcePaywallOlderAccounts: false,
                    forcePaywallNotTodayAccounts: false,
                    forcePaywallAccountAgeEnabled: false,
                    adsEnabled: false,
                    playLinkOnPlayEnabled: false,
                    guestAnimeLinkEnabled: false
                  };
                  patched = true;
                }
                if (body?.data && 'me' in body.data) {
                  body.data.me = ANON_USER;
                  patched = true;
                }
                if (patched) {
                  return jsonResponse(body);
                }
              } catch {}
              return response;
            } catch {}
          }
        }

        return origFetch(input, init);
      });
    }

    // Clear any stale Workbox image cache entries that may have cached blocked responses
    try {
      if (typeof caches === 'object' && caches && typeof caches.delete === 'function') {
        caches.delete('otakulogia-images').catch(() => {});
      }
    } catch {}

    // Auto-recover outdated/broken cover URLs stored in Otakulogia's catalog DB
    const anilistCoverCache = new Map();
    const anilistTitleCache = new Map();
    const pendingAnilistQueue = new Map();
    let anilistBatchTimer = null;

    const flushAnilistBatch = () => {
      anilistBatchTimer = null;
      const entries = [...pendingAnilistQueue.entries()].slice(0, 50);
      if (!entries.length) return;
      const ids = [];
      for (const [id] of entries) {
        pendingAnilistQueue.delete(id);
        ids.push(id);
      }
      if (pendingAnilistQueue.size > 0 && typeof setTimeout === 'function') {
        anilistBatchTimer = setTimeout(flushAnilistBatch, 60);
      }
      if (typeof window.fetch !== 'function') return;
      window.fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          query: 'query($ids:[Int]){Page(perPage:50){media(id_in:$ids,type:ANIME){id coverImage{extraLarge large medium}}}}',
          variables: { ids }
        })
      }).then(r => r.json()).then(res => {
        const list = res?.data?.Page?.media;
        const byId = new Map();
        if (Array.isArray(list)) {
          for (const item of list) {
            const url = item?.coverImage?.extraLarge || item?.coverImage?.large || item?.coverImage?.medium;
            if (item?.id && url) {
              byId.set(Number(item.id), url);
              anilistCoverCache.set(Number(item.id), url);
            }
          }
        }
        for (const [id, imgs] of entries) {
          const resolved = byId.get(id);
          for (const img of imgs) {
            try {
              img.dataset.adveilCoverRecovered = '1';
              if (resolved) {
                img.src = resolved;
              } else if (typeof img.src === 'string' && img.src.includes('/cover/large/')) {
                img.src = img.src.replace('/cover/large/', '/cover/medium/');
              }
            } catch {}
          }
        }
      }).catch(() => {});
    };

    const recoverCoverByTitle = (img, title) => {
      const cleanTitle = String(title || '').trim();
      if (!cleanTitle || typeof window.fetch !== 'function') return;
      if (anilistTitleCache.has(cleanTitle)) {
        const cached = anilistTitleCache.get(cleanTitle);
        if (cached) {
          img.dataset.adveilCoverRecovered = '1';
          img.src = cached;
        }
        return;
      }
      window.fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          query: 'query($s:String){Media(search:$s,type:ANIME){coverImage{extraLarge large medium}}}',
          variables: { s: cleanTitle }
        })
      }).then(r => r.json()).then(res => {
        const cover = res?.data?.Media?.coverImage;
        const url = cover?.extraLarge || cover?.large || cover?.medium || '';
        anilistTitleCache.set(cleanTitle, url);
        if (url) {
          img.dataset.adveilCoverRecovered = '1';
          img.src = url;
        }
      }).catch(() => {});
    };

    try {
      window.addEventListener('error', (ev) => {
        const img = ev?.target;
        if (!img || img.tagName !== 'IMG' || img.dataset?.adveilCoverRecovered === '1') return;
        const src = String(img.getAttribute('src') || img.src || '');
        if (!src || src.includes('/placeholder.png')) return;
        const match = src.match(/anilist\.co\/file\/anilistcdn\/media\/anime\/cover\/(?:large|medium|small)\/(?:bx?|)(\d+)/i);
        if (match) {
          const id = Number.parseInt(match[1], 10);
          if (!Number.isFinite(id) || id <= 0) return;
          try {
            ev.stopImmediatePropagation();
            ev.preventDefault();
          } catch {}
          if (anilistCoverCache.has(id)) {
            img.dataset.adveilCoverRecovered = '1';
            img.src = anilistCoverCache.get(id);
            return;
          }
          if (!pendingAnilistQueue.has(id)) {
            pendingAnilistQueue.set(id, []);
          }
          pendingAnilistQueue.get(id).push(img);
          if (!anilistBatchTimer && typeof setTimeout === 'function') {
            anilistBatchTimer = setTimeout(flushAnilistBatch, 60);
          }
          return;
        }
        const alt = String(img.getAttribute('alt') || img.alt || '').trim();
        if (alt && /thetvdb\.com|tmdb\.org|gigaclass\.top|myanimelist\.net|kitsu\.(?:io|app)/i.test(src)) {
          try {
            ev.stopImmediatePropagation();
            ev.preventDefault();
          } catch {}
          recoverCoverByTitle(img, alt);
        }
      }, true);
    } catch {}

    const PAYWALL_PATTERNS = /Seu teste acabou|Assine o VIP e continue sem limites|Seu plano VIP venceu|Seu tempo gratuito de hoje acabou|Ainda dá para continuar de graça/i;
    const hideOtakulogiaAds = () => {
      try {
        if (document.documentElement) {
          document.documentElement.dataset.exoclickDisplayAds = '0';
        }
        for (const id of ['exoclick-page-banners', 'exoclick-overlays']) {
          const el = document.getElementById(id);
          if (el) {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
          }
        }
        if (document.querySelectorAll) {
          const dialogs = document.querySelectorAll('[role="dialog"], .fixed.inset-0');
          for (let i = 0; i < dialogs.length; i++) {
            const dlg = dialogs[i];
            if (dlg && PAYWALL_PATTERNS.test(dlg.textContent || '')) {
              const closeBtn = dlg.querySelector('button[aria-label="Fechar"], button[aria-label="Close"]');
              if (closeBtn) {
                try { closeBtn.click(); } catch {}
              }
              dlg.style.setProperty('display', 'none', 'important');
              dlg.style.setProperty('pointer-events', 'none', 'important');
              const vid = document.querySelector('video');
              if (vid && vid.paused && !vid.ended && vid.currentTime > 0) {
                try { vid.play().catch(() => {}); } catch {}
              }
            }
          }
        }
      } catch {}
    };

    hideOtakulogiaAds();
    window.addEventListener('DOMContentLoaded', () => {
      hideOtakulogiaAds();
      if (typeof MutationObserver === 'function' && document.documentElement) {
        const obs = new MutationObserver(hideOtakulogiaAds);
        obs.observe(document.documentElement, { childList: true, subtree: true });
      }
    }, { once: true });
  }

})();