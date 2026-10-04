// Loaded only in the extension's isolated world. No property or API is added to the page.
const adveilLinkPolicy = (() => {
  'use strict';
  const hosts = Object.freeze(['bitly.com','bit.ly','rebrandly.com','rebrand.ly','short.io','short.gy','bl.ink','cuttly.com','cutt.ly','tinyurl.com','t2mio.com','t2m.io','sniply.io','snip.ly','dub.co','dub.sh','linklyhq.com','encurtador.com.br','technons.com',
    'linkvertise.com','shrinkme.vip','shrinkme.io','ouo.io','ouo.press','exe.io','exeygo.com','ckk.ai','srnky.com','gplinks.co','cuty.io','cuttty.com','work.ink','loot-link.com','lootlabs.gg','lockr.net','stfly.me','adshrink.it','smoner.com','sfl.gl','safelinku.com','app.khaddavi.net','adfoc.us','fc-lc.com','droplink.co','tech8s.net','game5s.com','cutwin.com','www.masrawytrend.com','link4m.com','payskip.org','mitly.us','v2links.com','v2links.me','aii.sh','bc.vc','bcvcgo.xyz','linksfire.co','tech.techssoftwares.com','adshort.co','techgeek.digital','shortyearn.com','pahe.plus','ez4short.com','icutlink.com','linkjust.com']);
  const keys = ['url','u','destination','dest','target','redirect','redirect_url','link','to'];
  const reserved = /^\/(?:login|signin|sign-in|signup|sign-up|account|accounts|oauth|authorize|auth|api|dashboard|settings|admin|wp-admin|payment|checkout|subscriber|subscription)(?:\/|$)/i;
  const supported = host => hosts.some(base => host === base || host.endsWith('.' + base));
  function absolute(value) {
    if (typeof value !== 'string' || value.length > 8192 || /[\u0000-\u0020\u007f]/.test(value) || !/^https?:\/\//i.test(value)) return null;
    try { const url = new URL(value); return !url.username && !url.password && url.hostname ? url : null; } catch { return null; }
  }
  function decode(value) {
    if (typeof value !== 'string' || value.length > 8192) return null;
    for (let depth = 0; depth < 4; depth++) {
      const url = absolute(value);
      if (url) return url;
      try {
        if (/%[0-9a-f]{2}/i.test(value)) { const decoded = decodeURIComponent(value); if (decoded !== value) { value = decoded; continue; } }
        if (!/^[a-z0-9+/_-]+={0,2}$/i.test(value)) return null;
        value = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
      } catch { return null; }
    }
    return absolute(value);
  }
  function destination(value) {
    let current = absolute(value);
    if (!current || !supported(current.hostname)) return null;
    const seen = new Set([current.href]);
    let changed = false;
    for (let depth = 0; depth < 5; depth++) {
      if (!supported(current.hostname) || reserved.test(current.pathname)) break;
      const candidates = new Map();
      for (const key of keys) for (const raw of current.searchParams.getAll(key)) {
        const parsed = decode(raw); if (parsed) candidates.set(parsed.href, parsed);
      }
      // Multiple distinct destinations and loops are ambiguous; leave the original link alone.
      if (candidates.size > 1) return null;
      if (!candidates.size) break;
      const next = [...candidates.values()][0];
      if (seen.has(next.href)) return null;
      seen.add(next.href); current = next; changed = true;
    }
    return changed ? current.href : null;
  }
  return Object.freeze({hosts, supported, destination, safeURL:value=>absolute(value)?.href||null, linkPage:value=>{const url=absolute(value);return !!url&&supported(url.hostname)&&!reserved.test(url.pathname);}});
})();
