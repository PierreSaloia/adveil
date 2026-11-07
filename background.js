import {DEFAULTS,normalize,exclusions,networkRules,matchesHost,isAdvertisingURL} from './settings.js';
let queue=Promise.resolve(),lastError='';
const locked=task=>{const job=queue.catch(()=>{}).then(task);queue=job;return job;};
const read=async()=>normalize(await chrome.storage.local.get(DEFAULTS));
async function apply(s,force=false){
 const lists=s.enabled?['ads','regional','privacy'].filter(id=>s[id]):[];
 await chrome.declarativeNetRequest.updateEnabledRulesets({enableRulesetIds:lists,disableRulesetIds:['ads','regional','privacy'].filter(id=>!lists.includes(id))});
 const old=await chrome.declarativeNetRequest.getDynamicRules();
 await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:old.map(r=>r.id),addRules:networkRules(s)});
 const wanted=[];
 function script(id,file,excluded,{world='MAIN',runAt='document_start',allFrames=false,matchOriginAsFallback=false}={}){
  wanted.push({id,js:Array.isArray(file)?file:[file],matches:['http://*/*','https://*/*'],excludeMatches:exclusions(excluded),runAt,world,allFrames,matchOriginAsFallback,persistAcrossSessions:true});
 }
 if(s.enabled){
  const excluded=[...new Set([...s.disabledHosts,...s.compatOff])];
  if(s.compat)script('compat','compat.js',excluded);
  if(s.detectors)script('detectors','detectors.js',excluded);
  if(s.stealth)script('shield','shield.js',[...new Set([...s.disabledHosts,...s.stealthOff])],{allFrames:true});
  if(s.popups)script('popups','popups.js',[...new Set([...s.disabledHosts,...s.popupOff])],{allFrames:true,matchOriginAsFallback:true});
  if(s.shorteners)script('shorteners',['link-policy.js','shorteners.js'],[...new Set([...s.disabledHosts,...s.shortenerOff])],{world:'ISOLATED'});
  if(s.shorteners&&s.stealth)script('shortener-compat','shortener-compat.js',[...new Set([...s.disabledHosts,...s.shortenerOff,...s.stealthOff])]);
  // Extension stylesheet: nothing is added to the page DOM.
  if(s.cosmetic)wanted.push({id:'cosmetic',css:['cosmetic.css'],matches:['http://*/*','https://*/*'],excludeMatches:exclusions([...new Set([...s.disabledHosts,...s.cosmeticOff])]),runAt:'document_start',allFrames:false,persistAcrossSessions:true});
 }
 const registered=await chrome.scripting.getRegisteredContentScripts();
 const shape=r=>JSON.stringify([r.js||[],r.css||[],r.world||'ISOLATED',r.allFrames,!!r.matchOriginAsFallback]);
 // Scripts whose files changed between versions (e.g. 0.2.0 cosmetic.js) are replaced, not updated in place.
 const stale=r=>{const w=wanted.find(x=>x.id===r.id);return !w||shape(w)!==shape(r);};
 const removed=registered.filter(stale).map(r=>r.id);
 if(removed.length)await chrome.scripting.unregisterContentScripts({ids:removed});
 const kept=registered.filter(r=>!removed.includes(r.id));
 const config=r=>JSON.stringify([r.js||[],r.css||[],r.matches,r.excludeMatches||[],r.world||'ISOLATED',r.runAt,!!r.allFrames,!!r.matchOriginAsFallback,r.persistAcrossSessions!==false]);
 // Saving an unrelated setting must not unregister/update every page script again.
 const update=wanted.filter(w=>kept.some(r=>r.id===w.id&&(force||config(r)!==config(w)))),add=wanted.filter(w=>!kept.some(r=>r.id===w.id));
 if(update.length)await chrome.scripting.updateContentScripts(update);
 if(add.length)await chrome.scripting.registerContentScripts(add);
 await chrome.action.setBadgeBackgroundColor({color:'#14685f'});
 await chrome.declarativeNetRequest.setExtensionActionOptions({displayActionCountAsBadgeText:s.enabled&&s.badge});
 if(!s.enabled||!s.badge)await chrome.action.setBadgeText({text:''});
}
async function initialize(){
 const settings=await read();await apply(settings,true);await chrome.storage.local.set(settings);
 await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});lastError='';
}
const initializeSafely=()=>locked(initialize).catch(error=>{lastError=error.message;console.error(error);});
chrome.runtime.onInstalled.addListener(initializeSafely);
chrome.runtime.onStartup.addListener(initializeSafely);
initializeSafely();
// Remember only recently created navigation targets in memory. This also covers open('')
// followed by assigning the ad URL, or an HTTP redirect into a known advertising host.
const createdTargets=new Map();
const shortenerHops=new Map();
function observeShortenerCode(details){
 if(details.frameId!==0)return;
 let url;try{url=new URL(details.url);}catch{return;}
 const input=['droplink.co','ez4short.com'].includes(url.hostname)&&/^\/[a-z0-9_-]{1,64}$/i.test(url.pathname)?url.pathname.slice(1):null;
 const intermediate=['tech8s.net','game5s.com'].includes(url.hostname)&&/^\/safe2?\.php$/.test(url.pathname)?url.searchParams.get('link'):null;
 const code=input||intermediate;
 if(!code||!/^[a-z0-9_-]{1,64}$/i.test(code))return;
 const time=Date.now();
 for(const [id,value]of shortenerHops)if(value.expires<=time)shortenerHops.delete(id);
 if(shortenerHops.has(details.tabId))return;
 if(shortenerHops.size>=64)shortenerHops.delete(shortenerHops.keys().next().value);
 shortenerHops.set(details.tabId,{code,expires:time+600000,steps:new Set()});
}
function enforcePopup(details){
 if(!isAdvertisingURL(details.url))return;
 void locked(async()=>{
  const s=await read();
  if(!s.enabled||!s.popups||!isAdvertisingURL(details.url))return;
  const destination=new URL(details.url);
  if(matchesHost(destination.hostname,s.allowDomains))return;
  const source=await chrome.tabs.get(details.sourceTabId).catch(()=>null);
  if(!source?.url||!/^https?:/.test(source.url))return;
  const excluded=[...s.disabledHosts,...s.popupOff];
  if(matchesHost(new URL(source.url).hostname,excluded))return;
  if(details.sourceFrameId!==0){
   const frame=await chrome.webNavigation.getFrame({tabId:details.sourceTabId,frameId:details.sourceFrameId}).catch(()=>null);
   if(frame?.url&&/^https?:/.test(frame.url)&&matchesHost(new URL(frame.url).hostname,excluded))return;
  }
  const target=await chrome.tabs.get(details.tabId).catch(()=>null);
  if(!target||![target.pendingUrl,target.url].some(url=>url===details.url||isAdvertisingURL(url)))return;
  await chrome.tabs.remove(details.tabId);
 }).catch(error=>console.error('Popup protection:',error.message));
}
chrome.webNavigation.onCreatedNavigationTarget.addListener(details=>{
 const time=Date.now();
 for(const [id,target] of createdTargets)if(target.expires<=time)createdTargets.delete(id);
 if(createdTargets.size>=256)createdTargets.delete(createdTargets.keys().next().value);
 createdTargets.set(details.tabId,{...details,expires:time+15000});
 enforcePopup(details);
});
chrome.webNavigation.onBeforeNavigate.addListener(details=>{
 observeShortenerCode(details);
 if(details.frameId!==0)return;
 const target=createdTargets.get(details.tabId);
 if(!target)return;
 if(target.expires<=Date.now()){createdTargets.delete(details.tabId);return;}
 enforcePopup({...target,url:details.url});
});
// Once real content commits, it is an ordinary tab and no longer a pending popup.
chrome.webNavigation.onCommitted.addListener(details=>{
 if(details.frameId===0&&/^https?:/.test(details.url))createdTargets.delete(details.tabId);
 if(details.frameId!==0)return;
 let url;try{url=new URL(details.url);}catch{return;}
 // Redirects can inherit the original "typed" transition through search wrappers.
 // Preserve the original code until the tab actually leaves this shortener chain.
 if(!['droplink.co','ez4short.com','tech8s.net','game5s.com','www.google.com','www.bing.com'].includes(url.hostname))shortenerHops.delete(details.tabId);
});
chrome.tabs.onRemoved.addListener(tabId=>{createdTargets.delete(tabId);shortenerHops.delete(tabId);});
async function permitShortenerHop(message,sender){
 const denied={allowed:false};
 if(sender.frameId!==0||!Number.isInteger(sender.tab?.id)||typeof message.destination!=='string'||message.destination.length>8192)return denied;
 let source,destination;
 try{source=new URL(sender.url);destination=new URL(message.destination);}catch{return denied;}
 if(!['tech8s.net','game5s.com'].includes(source.hostname)||!/^https?:$/.test(destination.protocol)||destination.username||destination.password)return denied;
 const s=await read();
 if(!s.enabled||!s.shorteners||matchesHost(source.hostname,[...s.disabledHosts,...s.shortenerOff]))return denied;
 const time=Date.now();
 for(const [id,value]of shortenerHops)if(value.expires<=time)shortenerHops.delete(id);
 if(shortenerHops.size>=64&&!shortenerHops.has(sender.tab.id))shortenerHops.delete(shortenerHops.keys().next().value);
 const chain=shortenerHops.get(sender.tab.id);
 // A cached article can contain somebody else's code (observed in EZ4Short). Only
 // continue the exact code from this tab's original navigation, never a substituted one.
 if(!chain||chain.code!==message.code)return denied;
 const step=source.href+'\n'+destination.href+'\n'+(message.method==='POST'?'POST':'GET');
 // Stop a repeated intermediate or a rotating redirect loop; the original control remains.
 if(chain.steps.has(step)||chain.steps.size>=6)return denied;
 chain.steps.add(step);shortenerHops.set(sender.tab.id,chain);
 return {allowed:true};
}
async function handle(message){
 if(message.type==='get')return {settings:await read(),activeLists:await chrome.declarativeNetRequest.getEnabledRulesets(),lastError};
 if(message.type!=='save')throw Error('Comando desconhecido.');
 const previous=await read(),next=normalize(message.settings);
 try{await apply(next);await chrome.storage.local.set(next);lastError='';return {settings:next};}
 catch(error){
  lastError=error.message;
  try{await apply(previous);await chrome.storage.local.set(previous);}catch(rollback){lastError+='; recuperação falhou: '+rollback.message;}
  throw Error(lastError);
 }
}
chrome.runtime.onMessage.addListener((message,sender,respond)=>{
 if(sender.id!==chrome.runtime.id)return;
 if(message.type==='shortener-hop'){
  locked(()=>permitShortenerHop(message,sender)).then(data=>respond({ok:true,...data}),error=>respond({ok:false,error:error.message}));
  return true;
 }
 if(!sender.url?.startsWith(chrome.runtime.getURL('')))return;
 locked(()=>handle(message)).then(data=>respond({ok:true,...data}),error=>respond({ok:false,error:error.message}));
 return true;
});
