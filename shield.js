(() => {
  'use strict';
  // Camouflage layer. It answers the standard "is something blocking ads?" probes locally,
  // without sending anything to an ad server and without fabricating impressions, clicks or
  // ad content. Scope: (1) empty bait elements that a blocker hid, (2) probe fetch/XHR requests
  // for well-known ad scripts. Everything else keeps its native behavior.

  const originalToString = Function.prototype.toString;
  const disguised = new WeakMap();
  const nativeText = name => 'function ' + name + '() { [native code] }';
  function mask(fn, name) { disguised.set(fn, nativeText(name || fn.name)); return fn; }
  const toString = { toString() { return disguised.has(this) ? disguised.get(this) : originalToString.call(this); } }.toString;
  mask(toString, 'toString');
  Object.defineProperty(Function.prototype, 'toString', { value: toString, writable: true, configurable: true });

  // ---- Bait elements -------------------------------------------------------------------
  // Only connected elements with no child elements and no visible text (whitespace and &nbsp; allowed)
  // that carry a well-known bait token are affected. Real ad containers hold content.
  const BAIT = new Set(['adsbox', 'ads-box', 'adbox', 'ad-box', 'ad-banner', 'adbanner', 'ad_banner', 'ads-banner',
    'banner-ad', 'banner_ad', 'bannerad', 'ad-placement', 'ad_placement', 'ad-unit', 'ad_unit', 'adunit',
    'pub_300x250', 'pub_300x250m', 'pub_728x90', 'text-ad', 'textad', 'text_ad', 'text_ads', 'text-ads',
    'text-ad-links', 'adsense', 'ad-text', 'sponsored-text-link', 'afs_ads', 'ad-lads']);
  function isBait(element) {
    try {
      if (!(element instanceof Element) || !element.isConnected || element.childElementCount || element.textContent.trim()) return false;
      const tokens = String(element.getAttribute('class') || '').toLowerCase().split(/\s+/);
      tokens.push(String(element.id || '').toLowerCase());
      return tokens.some(token => BAIT.has(token));
    } catch { return false; }
  }
  function inlinePixels(element, property) {
    const value = parseFloat(element.style && element.style[property]);
    return value > 0 ? Math.round(value) : 1;
  }
  function patchGetter(proto, name, nominal) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, name);
    if (!descriptor || typeof descriptor.get !== 'function') return;
    const real = descriptor.get;
    const holder = { get [name]() {
      const value = Reflect.apply(real, this, []);
      return value === 0 && isBait(this) ? nominal(this) : value;
    } };
    const patched = Object.getOwnPropertyDescriptor(holder, name).get;
    mask(patched, 'get ' + name);
    Object.defineProperty(proto, name, { ...descriptor, get: patched });
  }
  patchGetter(HTMLElement.prototype, 'offsetHeight', el => inlinePixels(el, 'height'));
  patchGetter(HTMLElement.prototype, 'offsetWidth', el => inlinePixels(el, 'width'));
  patchGetter(Element.prototype, 'clientHeight', el => inlinePixels(el, 'height'));
  patchGetter(Element.prototype, 'clientWidth', el => inlinePixels(el, 'width'));
  {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetParent');
    if (descriptor && descriptor.get) {
      const real = descriptor.get;
      const holder = { get offsetParent() {
        const value = Reflect.apply(real, this, []);
        return value === null && isBait(this) && document.body !== this ? document.body : value;
      } };
      const patched = Object.getOwnPropertyDescriptor(holder, 'offsetParent').get;
      mask(patched, 'get offsetParent');
      Object.defineProperty(HTMLElement.prototype, 'offsetParent', { ...descriptor, get: patched });
    }
  }
  {
    const real = Element.prototype.getBoundingClientRect;
    const holder = { getBoundingClientRect() {
      const rect = Reflect.apply(real, this, []);
      if (rect.height !== 0 || rect.width !== 0 || !isBait(this)) return rect;
      return new DOMRect(rect.x, rect.y, inlinePixels(this, 'width'), inlinePixels(this, 'height'));
    } };
    Object.defineProperty(Element.prototype, 'getBoundingClientRect', { value: mask(holder.getBoundingClientRect, 'getBoundingClientRect'), writable: true, configurable: true });
  }
  {
    // Some detectors use getClientRects() instead of offset sizes. Keep both probes
    // consistent for empty bait only, without changing the actual page layout.
    const real = Element.prototype.getClientRects;
    const holder = { getClientRects() {
      const rects = Reflect.apply(real, this, []);
      if (rects.length || !isBait(this)) return rects;
      const rect = this.getBoundingClientRect();
      return new Proxy(rects, {
        get(target, key) {
          if (key === 'length') return 1;
          if (key === '0') return rect;
          if (key === 'item') return index => (Number(index) >>> 0) === 0 ? rect : null;
          if (key === Symbol.iterator) return function* () { yield rect; };
          const value = Reflect.get(target, key, target);
          return typeof value === 'function' ? value.bind(target) : value;
        }
      });
    } };
    Object.defineProperty(Element.prototype, 'getClientRects', { value: mask(holder.getClientRects, 'getClientRects'), writable: true, configurable: true });
  }
  {
    const real = window.getComputedStyle;
    const holder = { getComputedStyle(element, ...rest) {
      const style = Reflect.apply(real, this, [element, ...rest]);
      try {
        const hidden = style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0';
        if (!hidden || !isBait(element)) return style;
        const override = { display: 'block', visibility: 'visible', opacity: '1' };
        return new Proxy(style, {
          get(target, key) {
            if (typeof key === 'string' && key in override && (target[key] === 'none' || target[key] === 'hidden' || target[key] === '0')) return override[key];
            if (key === 'getPropertyValue') return name => {
              const value = target.getPropertyValue(name);
              return name in override && (value === 'none' || value === 'hidden' || value === '0') ? override[name] : value;
            };
            const value = Reflect.get(target, key, target);
            return typeof value === 'function' ? value.bind(target) : value;
          }
        });
      } catch { return style; }
    } };
    Object.defineProperty(window, 'getComputedStyle', { value: mask(holder.getComputedStyle, 'getComputedStyle'), writable: true, configurable: true });
  }

  // ---- Reachability probes made with images ---------------------------------------------
  // Some sites load /favicon.ico from an ad host and treat an error (or a 1x1 stand-in) as a blocker.
  // Answer with a local 16x16 transparent image; nothing is requested from the ad host.
  const AD_DOMAINS = ['doubleclick.net', 'googlesyndication.com', 'googleadservices.com', '2mdn.net', 'adnxs.com', 'taboola.com',
    'outbrain.com', 'criteo.com', 'criteo.net', 'amazon-adsystem.com', 'pubmatic.com', 'rubiconproject.com', 'openx.net',
    'adsrvr.org', 'advertising.com', 'moatads.com', 'adform.net', 'smartadserver.com', 'casalemedia.com', 'popads.net'];
  const isAdHost = host => AD_DOMAINS.some(domain => host === domain || host.endsWith('.' + domain));
  const ICON = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAEklEQVR4nGNgGAWjYBSMAggAAAQQAAFVN1rQAAAAAElFTkSuQmCC';
  const originalSrc = new WeakMap();
  function isImageProbe(value) {
    try {
      const url = new URL(String(value), location.href);
      return (url.protocol === 'https:' || url.protocol === 'http:') && isAdHost(url.hostname) && url.pathname.endsWith('/favicon.ico');
    } catch { return false; }
  }
  {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    if (descriptor && descriptor.get && descriptor.set) {
      const realGet = descriptor.get, realSet = descriptor.set;
      const holder = {
        get src() { const value = Reflect.apply(realGet, this, []); return originalSrc.has(this) && value === ICON ? originalSrc.get(this) : value; },
        set src(value) {
          if (isImageProbe(value)) { originalSrc.set(this, new URL(String(value), location.href).href); value = ICON; } else originalSrc.delete(this);
          Reflect.apply(realSet, this, [value]);
        }
      };
      const own = Object.getOwnPropertyDescriptor(holder, 'src');
      mask(own.get, 'get src'); mask(own.set, 'set src');
      Object.defineProperty(HTMLImageElement.prototype, 'src', { ...descriptor, get: own.get, set: own.set });
    }
  }

  // ---- Probe requests ------------------------------------------------------------------
  const PROBE_HOSTS = [
    [/(?:^|\.)googlesyndication\.com$/, /^\/pagead\//],
    [/(?:^|\.)doubleclick\.net$/, /^\/(?:instream\/ad_status\.js|tag\/js\/gpt\.js|pagead\/)/],
    [/(?:^|\.)googletagservices\.com$/, /^\/tag\/js\/gpt\.js$/],
    [/(?:^|\.)popads\.net$/, /^\/js\/adblock\.js$/]
  ];
  const PROBE_NAME = /(?:^|\/)(?:ads|adframe|adverts?|ad-provider|prebid-ads|show_ads)\.js$/;
  function isProbe(url) {
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return false;
    return PROBE_NAME.test(url.pathname) || PROBE_HOSTS.some(([host, path]) => host.test(url.hostname) && path.test(url.pathname));
  }
  if (typeof window.fetch === 'function') {
    const real = window.fetch;
    const holder = { fetch(input, init) {
      try {
        const url = new URL(input instanceof Request ? input.url : String(input), location.href);
        const method = String(init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase();
        if ((method === 'GET' || method === 'HEAD') && isProbe(url)) {
          const signal = init?.signal ?? (input instanceof Request ? input.signal : null);
          if (signal?.aborted) return Promise.reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
          return Promise.resolve(new Response(method === 'HEAD' ? null : '', { status: 200, headers: { 'Content-Type': 'application/javascript' } }));
        }
      } catch { /* fall through to the native call */ }
      return Reflect.apply(real, this, [input, init]);
    } };
    Object.defineProperty(window, 'fetch', { value: mask(holder.fetch, 'fetch'), writable: true, configurable: true });
  }
  if (typeof XMLHttpRequest === 'function') {
    const real = XMLHttpRequest.prototype.open;
    const holder = { open(method, url, ...rest) {
      try {
        const parsed = new URL(String(url), location.href);
        if (/^(?:GET|HEAD)$/i.test(String(method)) && isProbe(parsed)) return Reflect.apply(real, this, [method, 'data:application/javascript,', ...rest]);
      } catch { /* fall through to the native call */ }
      return Reflect.apply(real, this, [method, url, ...rest]);
    } };
    Object.defineProperty(XMLHttpRequest.prototype, 'open', { value: mask(holder.open, 'open'), writable: true, configurable: true });
  }
})();
