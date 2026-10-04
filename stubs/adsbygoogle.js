(() => {
  'use strict';
  // Inert stand-in for the AdSense loader: reports itself loaded, renders nothing, sends nothing.
  const queue = Array.isArray(window.adsbygoogle) ? window.adsbygoogle : [];
  if (queue.loaded) return;
  queue.loaded = true;
  queue.push = function () { return this.length; };
  window.adsbygoogle = queue;
})();
