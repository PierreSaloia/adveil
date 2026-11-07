(() => {
  'use strict';
  // Inert stand-in for AntiAdBlockCore: answers detection probe as not detected, renders no recovery dialog.
  const result = Object.freeze({ detected: false, blockerType: null, path: null, browser: null });
  try {
    window.AABC_DETECTION = result;
    window.__tlm = result;
    window.dispatchEvent(new CustomEvent('aabc:detection', { detail: result }));
    if (typeof window.AABC_ON_DETECT === 'function') window.AABC_ON_DETECT(result);
  } catch {}
})();
