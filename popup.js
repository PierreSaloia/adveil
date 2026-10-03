'use strict';
const enabled = document.getElementById('enabled');
const site = document.getElementById('site');
const save = document.getElementById('save');
const status = document.getElementById('status');
let tab, host;
(async () => {
  [tab] = await chrome.tabs.query({active: true, currentWindow: true});
  const url = new URL(tab?.url || 'about:blank');
  host = /^https?:$/.test(url.protocol) ? url.hostname : null;
  const settings = await chrome.storage.local.get({enabled: true, disabledHosts: []});
  document.getElementById('host').textContent = host || 'Abra um site para configurar';
  enabled.checked = settings.enabled;
  site.checked = !!host && !settings.disabledHosts.includes(host);
  enabled.disabled = false;
  site.disabled = !host;
  save.disabled = false;
})().catch(error => {status.textContent = error.message;});
save.addEventListener('click', async () => {
  save.disabled = true;
  try {
    const previous = await chrome.storage.local.get({enabled: true, disabledHosts: []});
    const hosts = new Set(previous.disabledHosts);
    if (host) { if (site.checked) hosts.delete(host); else hosts.add(host); }
    await chrome.storage.local.set({enabled: enabled.checked, disabledHosts: [...hosts]});
    const result = await chrome.runtime.sendMessage({type: 'sync'});
    if (!result?.ok) {
      await chrome.storage.local.set(previous);
      await chrome.runtime.sendMessage({type: 'sync'});
      throw new Error(result?.error || 'Não foi possível aplicar a configuração.');
    }
    if (host) await chrome.tabs.reload(tab.id);
    status.textContent = 'Salvo. Outras abas abertas precisam ser recarregadas.';
  } catch (error) {status.textContent = 'Erro: ' + error.message;}
  finally {save.disabled = false;}
});
