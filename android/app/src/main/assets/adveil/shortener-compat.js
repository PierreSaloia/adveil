(() => {
  'use strict';
  const host = location.hostname;
  const matches = domains => domains.some(domain => host === domain || host.endsWith('.' + domain));
  // BCVC's prebid-ads.js also reveals the normal link UI on load. Its generic inert
  // substitute loses that non-advertising behavior. Restore only the observed layout;
  // the service's countdown, CAPTCHA and click/redirect handlers still run normally.
  if (matches(['bc.vc','bcvcgo.xyz'])) {
    const reveal = () => {
      const id = window.mtx_id;
      const container = typeof id === 'string' && document.getElementById(id);
      if (!container || !container.querySelector('#redirectSc #getLink') || !document.getElementById('bcvcNotifyLayout')) return;
      // ave.js checks the inert marker created by prebid-ads.js in a later load handler.
      // Without it an adblock overlay covers the otherwise usable continuation link.
      if (!document.getElementById('bcvc5842awd3')) {
        const marker=document.createElement('div');marker.id='bcvc5842awd3';marker.style.display='none';document.body.appendChild(marker);
      }
      container.style.display = 'block';
      document.getElementById('bcvcNotifyLayout').style.display = 'none';
    };
    if (document.readyState === 'complete') reveal();
    else window.addEventListener('load',reveal,{once:true});
  }
  // AdLinkFly exposes these two switches as its own client-side adblock policy. Keep the
  // CAPTCHA settings, signed form data, timers and server verification completely intact.
  if (matches(['exe.io','exeygo.com','smoner.com','droplink.co','ez4short.com','pahe.plus','aii.sh','shrinkbixby.com','srnky.com','fc-lc.com','payskip.org','mitly.us','v2links.com','v2links.me'])) {
    function adapt(config) {
      // Another blocker may already remove the warning text or own app_vars through
      // a non-configurable accessor. Recognize the remaining policy fields as well.
      if (!config || typeof config !== 'object' || !('force_disable_adblock' in config) || !(typeof config.please_disable_adblock==='string' || 'adblock_allowed' in config || 'enable_captcha' in config)) return config;
      try {
        config.force_disable_adblock = typeof config.force_disable_adblock === 'string' ? '0' : false;
        config.adblock_allowed = true;
      } catch { /* leave read-only page configuration usable */ }
      return config;
    }
    const original = Object.getOwnPropertyDescriptor(window, 'app_vars');
    // An early inline var can already own a non-configurable property. Its existing
    // configuration is still mutable; do not replace unrelated page accessors.
    const current = () => {try{adapt(window.app_vars);}catch{/* an unrelated getter may throw */}};
    if(original)current();
    if (!original || (original.configurable && !original.get && !original.set)) {
      let value = adapt(original?.value);
      Object.defineProperty(window, 'app_vars', {configurable:true, enumerable:true, get:()=>value, set:config=>{value=adapt(config);}});
    }
    if(document.readyState!=='loading')current();
    else document.addEventListener('DOMContentLoaded',current,{once:true});
  }
  // Cuty's gate reads the publisher's opt-out flag before starting its local detector.
  if (matches(['cuty.io','cuttty.com'])) {
    const allow = root => {
      if (root instanceof Element && root.matches('.link-container[data-allows-adblock="0"]')) root.setAttribute('data-allows-adblock','1');
      root.querySelectorAll?.('.link-container[data-allows-adblock="0"]').forEach(node=>node.setAttribute('data-allows-adblock','1'));
    };
    allow(document);
    new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)allow(node);}).observe(document,{childList:true,subtree:true});
  }
})();
