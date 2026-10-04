import {matchesHost} from './settings.js';
const $=id=>document.getElementById(id);
let tab,host,settings,parentPaused,parentCompat,parentStealth;
async function request(message){const r=await chrome.runtime.sendMessage(message);if(!r?.ok)throw Error(r?.error||'Serviço indisponível.');return r;}
function error(e){$('status').textContent=e.message;$('status').classList.add('error');}
(async()=>{
 [tab]=await chrome.tabs.query({active:true,currentWindow:true});
 const url=new URL(tab?.url||'about:blank');host=/^https?:$/.test(url.protocol)?url.hostname:null;
 const data=await request({type:'get'});settings=data.settings;
 $('host').textContent=host||'Abra um site para configurar';
 $('enabled').checked=settings.enabled;$('enabled').disabled=false;
 parentPaused=host&&settings.disabledHosts.some(d=>d!==host&&matchesHost(host,[d]));
 parentCompat=host&&settings.compatOff.some(d=>d!==host&&matchesHost(host,[d]));
 parentStealth=host&&settings.stealthOff.some(d=>d!==host&&matchesHost(host,[d]));
 $('site').checked=!!host&&!matchesHost(host,settings.disabledHosts);$('site').disabled=!host||parentPaused;
 $('stealthSite').checked=!!host&&!matchesHost(host,settings.stealthOff);$('stealthSite').disabled=!host||parentStealth;
 $('compatSite').checked=!!host&&!matchesHost(host,settings.compatOff);$('compatSite').disabled=!host||parentCompat;
 $('siteStatus').textContent=!settings.enabled?'AdVeil pausado em todos os sites':!$('site').checked?'Proteção pausada neste site':'Proteção ativa neste site';
 $('summary').textContent=data.activeLists.length+' listas de rede ativas · compatibilidade '+(settings.compat||settings.detectors?'ligada':'desligada')+' · camuflagem '+(settings.stealth?'ligada':'desligada');
 if(parentPaused||parentCompat||parentStealth)$('status').textContent='Exceção herdada do domínio principal. Altere em Configurações.';
 if(data.lastError)error(Error(data.lastError))
})().catch(error);
$('options').onclick=()=>chrome.runtime.openOptionsPage();
// Each switch applies immediately; changes are serialized so quick clicks cannot overwrite one another.
let pending=Promise.resolve();
const toggles=['enabled','site','compatSite','stealthSite'];
async function commit(){
 for(const id of toggles)$(id).disabled=true;
 try{
  const fresh=(await request({type:'get'})).settings;fresh.enabled=$('enabled').checked;
  for(const [key,id,inherited] of [['disabledHosts','site',parentPaused],['compatOff','compatSite',parentCompat],['stealthOff','stealthSite',parentStealth]]){
   if(!host||inherited)continue;const set=new Set(fresh[key]);if($(id).checked)set.delete(host);else set.add(host);fresh[key]=[...set];
  }
  await request({type:'save',settings:fresh});settings=fresh;
  $('siteStatus').textContent=!settings.enabled?'AdVeil pausado em todos os sites':!$('site').checked?'Proteção pausada neste site':'Proteção ativa neste site';
  $('status').classList.remove('error');$('status').textContent='Aplicado. A página foi recarregada; recarregue outras abas abertas.';
  if(host)await chrome.tabs.reload(tab.id);
 }catch(e){error(e);const data=await request({type:'get'}).catch(()=>null);if(data){settings=data.settings;$('enabled').checked=settings.enabled;if(host){$('site').checked=!matchesHost(host,settings.disabledHosts);$('compatSite').checked=!matchesHost(host,settings.compatOff);$('stealthSite').checked=!matchesHost(host,settings.stealthOff);}}}
 finally{
  $('enabled').disabled=false;
  $('site').disabled=!host||parentPaused;$('compatSite').disabled=!host||parentCompat;$('stealthSite').disabled=!host||parentStealth;
 }
}
for(const id of toggles)$(id).addEventListener('change',()=>{pending=pending.then(commit);});
