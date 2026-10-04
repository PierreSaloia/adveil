import {DEFAULTS,normalize,exclusions,networkRules} from './settings.js';
let queue=Promise.resolve(),lastError='';
const locked=task=>{const job=queue.catch(()=>{}).then(task);queue=job;return job;};
const read=async()=>normalize(await chrome.storage.local.get(DEFAULTS));
async function apply(s){
 const lists=s.enabled?['ads','regional','privacy'].filter(id=>s[id]):[];
 await chrome.declarativeNetRequest.updateEnabledRulesets({enableRulesetIds:lists,disableRulesetIds:['ads','regional','privacy'].filter(id=>!lists.includes(id))});
 const old=await chrome.declarativeNetRequest.getDynamicRules();
 await chrome.declarativeNetRequest.updateDynamicRules({removeRuleIds:old.map(r=>r.id),addRules:networkRules(s)});
 const wanted=[];
 function script(id,file,excluded,{world='MAIN',runAt='document_start',allFrames=false}={}){
  wanted.push({id,js:[file],matches:['http://*/*','https://*/*'],excludeMatches:exclusions(excluded),runAt,world,allFrames,persistAcrossSessions:true});
 }
 if(s.enabled){
  const excluded=[...new Set([...s.disabledHosts,...s.compatOff])];
  if(s.compat)script('compat','compat.js',excluded);
  if(s.detectors)script('detectors','detectors.js',excluded);
  if(s.stealth)script('shield','shield.js',[...new Set([...s.disabledHosts,...s.stealthOff])],{allFrames:true});
  // Extension stylesheet: nothing is added to the page DOM.
  if(s.cosmetic)wanted.push({id:'cosmetic',css:['cosmetic.css'],matches:['http://*/*','https://*/*'],excludeMatches:exclusions([...new Set([...s.disabledHosts,...s.cosmeticOff])]),runAt:'document_start',allFrames:false,persistAcrossSessions:true});
 }
 const registered=await chrome.scripting.getRegisteredContentScripts();
 const shape=r=>JSON.stringify([r.js||[],r.css||[],r.world||'ISOLATED',r.allFrames]);
 // Scripts whose files changed between versions (e.g. 0.2.0 cosmetic.js) are replaced, not updated in place.
 const stale=r=>{const w=wanted.find(x=>x.id===r.id);return !w||shape(w)!==shape(r);};
 const removed=registered.filter(stale).map(r=>r.id);
 if(removed.length)await chrome.scripting.unregisterContentScripts({ids:removed});
 const kept=registered.filter(r=>!removed.includes(r.id));
 const update=wanted.filter(w=>kept.some(r=>r.id===w.id)),add=wanted.filter(w=>!kept.some(r=>r.id===w.id));
 if(update.length)await chrome.scripting.updateContentScripts(update);
 if(add.length)await chrome.scripting.registerContentScripts(add);
 await chrome.action.setBadgeBackgroundColor({color:'#14685f'});
 await chrome.declarativeNetRequest.setExtensionActionOptions({displayActionCountAsBadgeText:s.enabled&&s.badge});
 if(!s.enabled||!s.badge)await chrome.action.setBadgeText({text:''});
}
async function initialize(){
 const settings=await read();await apply(settings);await chrome.storage.local.set(settings);
 await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});lastError='';
}
const initializeSafely=()=>locked(initialize).catch(error=>{lastError=error.message;console.error(error);});
chrome.runtime.onInstalled.addListener(initializeSafely);
chrome.runtime.onStartup.addListener(initializeSafely);
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
 if(sender.id!==chrome.runtime.id||!sender.url?.startsWith(chrome.runtime.getURL('')))return;
 locked(()=>handle(message)).then(data=>respond({ok:true,...data}),error=>respond({ok:false,error:error.message}));
 return true;
});
