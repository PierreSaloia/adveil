import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AD_DOMAINS, SITE_PACKS } from '../../settings.js';

const root = resolve(import.meta.dirname, '../..');
const assetRoot = resolve(import.meta.dirname, '../app/src/main/assets');
const sets = { balanced: [], strong: [] };
for (const profile of ['balanced', 'strong']) {
  const sources = profile === 'balanced' ? ['ads.json', 'regional.json'] : ['ads.json', 'regional.json', 'privacy.json'];
  for (const list of sources) {
    const rules = JSON.parse(await readFile(resolve(root, 'rules', list), 'utf8'));
    for (const rule of rules) {
      const c = rule.condition ?? {};
      if (rule.action?.type !== 'block' && rule.action?.type !== 'allow') continue;
      if (c.regexFilter || c.tabIds || c.excludedTabIds || c.requestMethods || c.excludedRequestMethods || c.responseHeaders || c.excludedResponseHeaders) continue;
      sets[profile].push({
        action: { type: rule.action.type }, priority: rule.priority ?? 1,
        condition: Object.fromEntries(Object.entries({
          urlFilter: c.urlFilter,
          requestDomains: c.requestDomains,
          excludedRequestDomains: c.excludedRequestDomains,
          initiatorDomains: c.initiatorDomains,
          excludedInitiatorDomains: c.excludedInitiatorDomains,
          domainType: c.domainType,
          resourceTypes: c.resourceTypes,
          excludedResourceTypes: c.excludedResourceTypes,
        }).filter(([, v]) => v !== undefined)),
      });
    }
  }
}
for (const [profile, rules] of Object.entries(sets)) {
  await writeFile(resolve(import.meta.dirname, `../app/src/main/assets/adveil-rules-${profile}.json`), JSON.stringify(rules));
  console.log(`${profile}: ${rules.length} regras exportadas.`);
}
const license = await readFile(resolve(root, 'LICENSE'), 'utf8');
const notice = await readFile(resolve(root, 'NOTICE.md'), 'utf8');
await writeFile(
  resolve(import.meta.dirname, '../app/src/main/assets/OPEN_SOURCE_LICENSES.txt'),
  `AdVeil Browser incorporates the AdVeil project and network rules.\n\n${notice}\n\nAndroidX WebKit (androidx.webkit:webkit 1.16.0) is distributed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0\n\nGPL-3.0 License\n\n${license}`,
);
await writeFile(resolve(assetRoot, 'adveil-ad-domains.json'), JSON.stringify(AD_DOMAINS));
await writeFile(resolve(assetRoot, 'adveil-site-packs.json'), JSON.stringify(SITE_PACKS));
const stubsDir = resolve(assetRoot, 'stubs');
await mkdir(stubsDir, { recursive: true });
for (const name of await readdir(resolve(root, 'stubs'))) {
  await copyFile(resolve(root, 'stubs', name), resolve(stubsDir, name));
}

const scriptDir = resolve(assetRoot, 'adveil');
await mkdir(scriptDir, { recursive: true });
for (const name of ['compat.js', 'detectors.js', 'shield.js', 'popups.js', 'shortener-compat.js']) {
  await writeFile(resolve(scriptDir, name), await readFile(resolve(root, name), 'utf8'));
}
const shortenerPolicy = await readFile(resolve(root, 'link-policy.js'), 'utf8');
let shorteners = await readFile(resolve(root, 'shorteners.js'), 'utf8');
const shortenerCompatibility = await readFile(resolve(root, 'shortener-compat.js'), 'utf8');
const extensionCall = "chrome.runtime.sendMessage({type:'shortener-hop',destination:form?action.href:destination,method:form?'POST':'GET',code})";
const androidCall = `new Promise(resolve=>{
      const bridge=window.AdVeilNativeBridge;
      if(!bridge){resolve({ok:false,allowed:false});return;}
      const requestId=Date.now().toString(36)+Math.random().toString(36).slice(2);
      const finish=value=>{bridge.removeEventListener('message',receive);clearTimeout(timer);resolve(value);};
      const receive=event=>{try{const value=JSON.parse(event.data);if(value.requestId===requestId)finish(value);}catch{}};
      const timer=setTimeout(()=>finish({ok:false,allowed:false}),1500);
      bridge.addEventListener('message',receive);
      try{bridge.postMessage(JSON.stringify({requestId,type:'shortener-hop',destination:form?action.href:destination,method:form?'POST':'GET',code}));}
      catch{finish({ok:false,allowed:false});}
    })`;
if (!shorteners.includes(extensionCall)) throw new Error('Não foi possível adaptar a chamada de encurtador do AdVeil para o WebView.');
shorteners = shorteners.replace(extensionCall, androidCall);
await writeFile(resolve(scriptDir, 'shorteners.js'), `${shortenerPolicy}\n${shorteners}\n${shortenerCompatibility}`);
await writeFile(resolve(scriptDir, 'cosmetic.css'), await readFile(resolve(root, 'cosmetic.css'), 'utf8'));
