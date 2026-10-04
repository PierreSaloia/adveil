export const DEFAULTS=Object.freeze({schema:3,enabled:true,ads:true,regional:true,privacy:false,compat:true,detectors:true,stealth:true,cosmetic:false,badge:true,disabledHosts:[],compatOff:[],stealthOff:[],cosmeticOff:[],blockDomains:[],allowDomains:[]});
export const PRESETS=Object.freeze({balanced:{ads:true,regional:true,privacy:false,compat:true,detectors:true,stealth:true,cosmetic:false},strong:{ads:true,regional:true,privacy:true,compat:true,detectors:true,stealth:true,cosmetic:true},companion:{ads:false,regional:false,privacy:false,compat:true,detectors:true,stealth:true,cosmetic:false}});
export const booleanKeys=['enabled','ads','regional','privacy','compat','detectors','stealth','cosmetic','badge'];
export const listKeys=['disabledHosts','compatOff','stealthOff','cosmeticOff','blockDomains','allowDomains'];
// Domains whose scripts/pixels are answered with local, inert stand-ins instead of an error.
export const AD_DOMAINS=Object.freeze(['doubleclick.net','googlesyndication.com','googleadservices.com','2mdn.net','adnxs.com','taboola.com','outbrain.com','criteo.com','criteo.net','amazon-adsystem.com','pubmatic.com','rubiconproject.com','openx.net','adsrvr.org','advertising.com','moatads.com','adform.net','smartadserver.com','casalemedia.com','popads.net']);
export function domain(value){
 if(typeof value!=='string')throw Error('Domínio inválido.');
 const input=value.trim().toLowerCase().replace(/\.$/,'');
 if(!input||/[\s/:?#@*\\]/.test(input))throw Error('Use somente o domínio, sem endereço ou caminho: '+value);
 const host=new URL('https://'+input).hostname;
 if(host.length>253||!host.split('.').every(p=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(p)))throw Error('Domínio inválido: '+value);
 return host;
}
export function normalize(raw={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Configuração inválida.');
 const result={...DEFAULTS};
 for(const key of booleanKeys){
  if(raw[key]!==undefined&&typeof raw[key]!=='boolean')throw Error('Valor inválido: '+key);
  result[key]=raw[key]??DEFAULTS[key];
 }
 for(const key of listKeys){
  const list=raw[key]??[];
  if(!Array.isArray(list)||list.length>200)throw Error('Máximo de 200 domínios por lista: '+key);
  result[key]=[...new Set(list.map(domain))].sort();
 }
 if(result.blockDomains.some(d=>result.allowDomains.includes(d)))throw Error('Um domínio não pode estar nas duas listas de recursos.');
 return result;
}
export function matchesHost(host,entries){return entries.some(d=>host===d||host.endsWith('.'+d));}
export function exclusions(entries){return entries.map(d=>'*://*.'+d+'/*');}
// Local stand-ins (extension-owned files). Priority 20 sits above list blocks (10) and below list
// exceptions (30/40) and every AdVeil pause/allow rule, so exceptions keep winning.
export function stealthRules(s){
 if(!s.enabled||!s.ads||!s.stealth)return [];
 const skip=s.stealthOff.length?{excludedInitiatorDomains:s.stealthOff}:{};
 const redirect=(id,priority,path,condition)=>({id,priority,action:{type:'redirect',redirect:{extensionPath:path}},condition:{...condition,...skip}});
 return [
  redirect(10,20,'/stubs/adsbygoogle.js',{urlFilter:'||googlesyndication.com/pagead/js/adsbygoogle.js',resourceTypes:['script']}),
  redirect(11,20,'/stubs/googletag.js',{urlFilter:'||googletagservices.com/tag/js/gpt.js',resourceTypes:['script']}),
  redirect(12,20,'/stubs/googletag.js',{urlFilter:'||doubleclick.net/tag/js/gpt.js',resourceTypes:['script']}),
  redirect(13,20,'/stubs/ad-status.js',{urlFilter:'||doubleclick.net/instream/ad_status.js',resourceTypes:['script']}),
  redirect(14,20,'/stubs/flags.js',{regexFilter:'^https?://[^/]+/(?:[^?#]*/)?(?:ads|adframe|adverts?|ad-provider|prebid-ads|show_ads)\\.js(?:[?#]|$)',resourceTypes:['script']}),
  redirect(15,15,'/stubs/noop.js',{requestDomains:[...AD_DOMAINS],resourceTypes:['script']}),
  redirect(16,15,'/stubs/pixel.gif',{requestDomains:[...AD_DOMAINS],resourceTypes:['image']}),
  // Reachability probes read the image size, so /favicon.ico gets a 16x16 image instead of the 1x1 pixel.
  redirect(17,20,'/stubs/icon.png',{requestDomains:[...AD_DOMAINS],urlFilter:'/favicon.ico',resourceTypes:['image']}),
  // Load an empty local document in ad frames. This preserves the frame's load lifecycle
  // without loading ad content, tracking pixels, or sending an impression to its server.
  // Main-frame navigation and all existing pause/allow exceptions remain untouched.
  redirect(18,15,'/stubs/frame.html',{requestDomains:[...AD_DOMAINS],resourceTypes:['sub_frame']})
 ];
}
// Per-site packs for sites whose ads come from rotating third-party domains. Rules apply only to
// requests started by the site itself; the allowlist keeps the services the page really needs.
export const SITE_PACKS=Object.freeze([{
 id:'steamverde',host:'steamverde.net',
 allowThirdParty:['fontawesome.com','googleapis.com','gstatic.com','sucuri.net','cloudflareinsights.com','cloudflare.com','googletagmanager.com','google-analytics.com','google.com','discord.com','discordapp.com','discordapp.net','youtube.com','youtube-nocookie.com','ytimg.com','gravatar.com','wp.com','w.org','jsdelivr.net'],
 inertScripts:['||steamverde.net/sys-analytics.js']
}]);
export function sitePackRules(s){
 if(!s.enabled||!s.ads)return [];
 const rules=[];
 SITE_PACKS.forEach((pack,index)=>{
  if(s.disabledHosts.some(d=>pack.host===d||pack.host.endsWith('.'+d)))return;
  const base=100+index*10;
  rules.push({id:base,priority:18,action:{type:'block'},condition:{initiatorDomains:[pack.host],domainType:'thirdParty',excludedRequestDomains:[...pack.allowThirdParty],excludedResourceTypes:['main_frame']}});
  pack.inertScripts.forEach((urlFilter,n)=>rules.push({id:base+1+n,priority:20,action:{type:'redirect',redirect:{extensionPath:'/stubs/noop.js'}},condition:{urlFilter,resourceTypes:['script']}}));
 });
 return rules;
}
export function networkRules(s){
 if(!s.enabled)return [];
 const rules=[];
 // Allow exceptions apply only to AdVeil, never to another extension.
 if(s.disabledHosts.length){
  rules.push({id:1,priority:1000000,action:{type:'allowAllRequests'},condition:{requestDomains:s.disabledHosts,resourceTypes:['main_frame','sub_frame']}});
  rules.push({id:2,priority:1000000,action:{type:'allow'},condition:{initiatorDomains:s.disabledHosts}});
 }
 if(s.allowDomains.length)rules.push({id:3,priority:900000,action:{type:'allow'},condition:{requestDomains:s.allowDomains}});
 if(s.blockDomains.length)rules.push({id:4,priority:800000,action:{type:'block'},condition:{requestDomains:s.blockDomains,excludedResourceTypes:['main_frame']}});
 return rules.concat(stealthRules(s),sitePackRules(s));
}
