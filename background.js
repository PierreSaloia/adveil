const DEFAULTS = { enabled: true, disabledHosts: [] };
let queue = Promise.resolve();
function sync() {
  const job = queue.catch(() => {}).then(async () => {
    const settings = await chrome.storage.local.get(DEFAULTS);
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    const wanted = {
      id: 'compat', matches: ['http://*/*', 'https://*/*'],
      excludeMatches: settings.disabledHosts.flatMap(host => [`http://${host}/*`, `https://${host}/*`]),
      js: ['compat.js'], runAt: 'document_start', world: 'MAIN',
      allFrames: true, persistAcrossSessions: true
    };
    if (!settings.enabled) {
      if (scripts.some(s => s.id === 'compat')) await chrome.scripting.unregisterContentScripts({ids: ['compat']});
    } else if (scripts.some(s => s.id === 'compat')) {
      await chrome.scripting.updateContentScripts([wanted]);
    } else {
      await chrome.scripting.registerContentScripts([wanted]);
    }
  });
  queue = job;
  return job;
}
chrome.runtime.onInstalled.addListener(() => sync().catch(console.error));
chrome.runtime.onStartup.addListener(() => sync().catch(console.error));
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message?.type !== 'sync') return;
  sync().then(() => respond({ok: true}), error => respond({ok: false, error: error.message}));
  return true;
});
