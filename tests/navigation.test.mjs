import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {normalize,PRESETS,isAdvertisingURL} from '../settings.js';
const source=await readFile(new URL('../link-policy.js',import.meta.url),'utf8');
const links=runInNewContext(source+';adveilLinkPolicy',{URL,atob});

test('older settings gain navigation protection and retain every previous exception',()=>{
 const previous=normalize({schema:3,enabled:false,stealth:false,disabledHosts:['example.com'],allowDomains:['cdn.example.com']});
 assert.equal(previous.schema,4);assert.equal(previous.enabled,false);assert.equal(previous.stealth,false);
 assert.equal(previous.popups,true);assert.equal(previous.shorteners,true);assert.deepEqual(previous.popupOff,[]);
 assert.deepEqual(previous.disabledHosts,['example.com']);assert.deepEqual(previous.allowDomains,['cdn.example.com']);
 for(const preset of Object.values(PRESETS)){assert.equal(preset.popups,true);assert.equal(preset.shorteners,true);}
 const paused=normalize({popups:false,shorteners:false,popupOff:['LOGIN.example.com'],shortenerOff:['bit.ly']});
 assert.deepEqual(paused.popupOff,['login.example.com']);assert.equal(paused.popups,false);
 assert.throws(()=>normalize({popups:'true'}));assert.throws(()=>normalize({shortenerOff:['https://bit.ly']}));
});
test('known ad destinations use exact domain boundaries; ordinary and non-web URLs stay alone',()=>{
 assert.equal(isAdvertisingURL('https://ads.popads.net/path'),true);
 assert.equal(isAdvertisingURL('https://ad.doubleclick.net/path'),true);
 for(const url of ['https://notpopads.net','https://popads.net.example.com','https://accounts.google.com','https://bit.ly/abc','javascript:alert(1)','invalid'])assert.equal(isAdvertisingURL(url),false,url);
});
test('explicit URL wrappers across the requested domains resolve without fetching or guessing codes',()=>{
 for(const host of ['bitly.com','rebrandly.com','short.io','bl.ink','cutt.ly','tinyurl.com','t2mio.com','sniply.io','dub.co','linklyhq.com','encurtador.com.br','technons.com']){
  assert.equal(links.destination('https://'+host+'/go?url='+encodeURIComponent('https://destination.example/file?a=1#part')),'https://destination.example/file?a=1#part',host);
  assert.equal(links.destination('https://'+host+'/abc123'),null,host+' opaque code');
 }
 assert.equal(links.destination('https://bit.ly/abc?url='+encodeURIComponent('https://destination.example')),'https://destination.example/');
 assert.equal(links.destination('https://notbit.ly/go?url=https://destination.example'),null);
 assert.equal(links.destination('https://bit.ly.example.com/go?url=https://destination.example'),null);
});

test('all 31 audit inputs are recognized but opaque examples are never invented',async()=>{
 const targets=JSON.parse(await readFile(new URL('./shortener-targets.json',import.meta.url),'utf8'));
 assert.equal(targets.length,31);
 for(const target of targets){assert.equal(links.supported(new URL(target.url).hostname),true,target.service);assert.equal(links.destination(target.url),null,target.service);}
 assert.equal(links.safeURL('javascript:alert(1)'),null);
 assert.equal(links.safeURL('https://user:pass@destination.example'),null);
});
test('nested, percent-encoded and base64 destinations preserve query strings and fragments',()=>{
 const end='https://destination.example/path?token=a%2Fb&lang=pt#download';
 const inner='https://cutt.ly/go?target='+encodeURIComponent(end);
 assert.equal(links.destination('https://technons.com/go?url='+encodeURIComponent(inner)),end);
 assert.equal(links.destination('https://tinyurl.com/go?url='+encodeURIComponent(encodeURIComponent(end))),end);
 assert.equal(links.destination('https://technons.com/go?url='+Buffer.from(end).toString('base64url')),end);
});
test('unsafe, ambiguous and account URLs never trigger an automatic shortcut',()=>{
 for(const raw of ['javascript:alert(1)','data:text/html,x','file:///c:/secret','https://user:pass@example.com','https://example.com/\npath','/relative','//example.com', 'x'.repeat(9000)]){
  assert.equal(links.destination('https://bit.ly/go?url='+encodeURIComponent(raw)),null,raw.slice(0,60));
 }
 assert.equal(links.destination('https://bit.ly/go?url=https://one.example&target=https://two.example'),null);
 assert.equal(links.destination('https://bit.ly/go?url=%ZZ'),null);
 for(const path of ['login','account/settings','oauth/authorize','api/links','wp-admin'])assert.equal(links.destination('https://technons.com/'+path+'?url=https://destination.example'),null,path);
 for(const path of ['login','account/settings','checkout','subscription','subscriber/issue'])assert.equal(links.linkPage('https://adfoc.us/'+path),false,path);
});
