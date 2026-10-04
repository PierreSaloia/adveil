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

})();