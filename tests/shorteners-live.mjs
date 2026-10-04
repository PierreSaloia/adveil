// Public link audit in a separate browser profile; never downloads destination files.
import {chromium} from 'playwright';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {startProxy} from './live-proxy.mjs';
import {walk} from './live-walk.mjs';
import {configureCometBlocker} from './comet-blocker.mjs';
const root=resolve(import.meta.dirname,'..');
const targets=JSON.parse(await readFile(new URL('./shortener-targets.json',import.meta.url),'utf8'));
const selected=process.argv.slice(2);const list=selected.length?targets.filter(t=>selected.includes(t.service)):targets;
const mode=process.env.ADVEIL_AUDIT_MODE||'protected';
const protectedMode=!mode.startsWith('baseline');
const output=resolve(root,'work/shortener-audit/'+mode);await mkdir(output,{recursive:true});
const proxy=await startProxy();
const context=await chromium.launchPersistentContext(resolve(output,'profile-'+Date.now()),{headless:process.env.ADVEIL_HEADED!=='1',...(process.env.ADVEIL_BROWSER?{executablePath:process.env.ADVEIL_BROWSER}:{channel:'chromium'}),acceptDownloads:false,proxy:{server:proxy.url},args:protectedMode?['--disable-extensions-except='+root,'--load-extension='+root]:[]});
const results=[];
context.setDefaultTimeout(10000);
try{
 const nativeBlocker=await configureCometBlocker(context,process.env.ADVEIL_COMET_BLOCKER);
 if(protectedMode){
  const worker=context.serviceWorkers().find(w=>w.url().endsWith('/background.js'))||await context.waitForEvent('serviceworker');
  const begin=Date.now();
  while(!(await worker.evaluate(()=>chrome.scripting.getRegisteredContentScripts())).some(s=>s.id==='shortener-compat')){
   if(Date.now()-begin>15000)throw Error('Extension scripts did not register');
   await new Promise(resolve=>setTimeout(resolve,100));
  }
 }
 // Sequential visits avoid two chains rotating the same service's CSRF/session cookie.
 let next=0;
 async function visit(){
  for(;;){const index=next++;if(index>=list.length)return;const target=list[index];const page=await context.newPage();const begin=Date.now();
   const deadline=setTimeout(()=>page.close().catch(()=>{}),150000);
   const row={...target,mode,nativeBlocker,visited:[],failedHosts:[],popups:[],responses:[],api:[],pageErrors:[],error:null};
   const pendingAPI=[];
   const requestTimes=new WeakMap();
   page.on('request',r=>requestTimes.set(r,Date.now()));
   page.on('pageerror',error=>{if(row.pageErrors.length<20)row.pageErrors.push(error.message.slice(0,300));});
   page.on('framenavigated',frame=>{if(frame===page.mainFrame()&&frame.url()!=='about:blank')row.visited.push(frame.url());});
   page.on('requestfailed',r=>{try{row.failedHosts.push({host:new URL(r.url()).hostname,error:r.failure()?.errorText});}catch{}});
   page.on('popup',popup=>{row.popups.push(popup.url());popup.close().catch(()=>{});});
   page.on('download',download=>download.cancel().catch(()=>{}));
   page.on('response',response=>{
    const request=response.request();
    if(request.isNavigationRequest()&&request.frame()===page.mainFrame())row.responses.push({url:response.url(),status:response.status(),method:request.method(),location:response.headers().location||null});
    // Capture only inspected service verification endpoints, never ad/tracking bodies or tokens.
    if(!/\/(?:api\/(?:session|verify|go)|links\/go|ln\.php)(?:[?#]|$)/.test(response.url())||row.api.length>=25)return;
    const endpoint=new URL(response.url());endpoint.search='';endpoint.hash='';
    const entry={url:endpoint.href,status:response.status(),method:request.method(),elapsedMs:Date.now()-(requestTimes.get(request)||Date.now())};row.api.push(entry);
    pendingAPI.push(response.text().then(body=>{
     let result;try{result=JSON.parse(body);}catch{entry.format=body.trim().startsWith('<')?'html':'non-json';return;}
     entry.keys=Object.keys(result||{});
     for(const key of ['status','success','error','message'])if(typeof result?.[key]==='boolean'||typeof result?.[key]==='number'||(typeof result?.[key]==='string'&&result[key].length<=200))entry[key==='status'?'resultStatus':key]=result[key];
     for(const value of [result?.url,result?.target,result?.message?.url])if(typeof value==='string'&&/^https?:\/\//i.test(value))entry.destination=value;
    }).catch(()=>{}));
   });
   try{
    await page.goto(target.url,{waitUntil:'domcontentloaded',timeout:20000});
    await page.waitForTimeout(4000);
   }catch(error){row.error=error.message.split('\n')[0];}
   if(process.env.ADVEIL_WALK==='1')await walk(page,target,row,output,writeFile,resolve).catch(error=>{row.walkError=error.message.split('\n')[0];});
   else if(protectedMode&&['DropLink','SafelinkU'].includes(target.service)){
    // Allow extension-driven navigation to settle before capturing an intermediate page.
    await page.waitForFunction(()=>!/^(?:[\w-]+\.)?(?:sfl\.gl|safelinku\.com|khaddavi\.net|tech8s\.net|game5s\.com|droplink\.co)$/.test(location.hostname),{},{timeout:45000}).catch(()=>{});
   }
   row.finalPage=page.url();row.elapsedMs=Date.now()-begin;
   try{
    row.title=await page.title();
    row.state=await page.evaluate(()=>({text:(document.body?.innerText||'').slice(0,14000),
     controls:[...document.querySelectorAll('a[href],button,input[type=submit],input[type=button]')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').slice(0,80).map(e=>({tag:e.tagName,id:e.id,text:(e.innerText||e.value||'').trim().slice(0,150),href:e.href||null,disabled:!!e.disabled})),
     forms:[...document.forms].map(f=>({id:f.id,action:new URL(f.getAttribute('action')||location.href,location.href).href,method:f.getAttribute('method')||'get',fields:[...f.elements].filter(e=>e.name).map(e=>({name:e.name,type:e.type,value:/token|captcha|csrf/i.test(e.name)?'[present]':String(e.value).slice(0,160)}))})),
     clientFlags:{forceAdblock:window.app_vars?.force_disable_adblock,adblockAllowed:window.app_vars?.adblock_allowed,cutyAllowed:document.querySelector('.link-container')?.getAttribute('data-allows-adblock')},
     scripts:[...document.scripts].filter(s=>s.src).map(s=>s.src)}));
    await writeFile(resolve(output,target.service.replace(/[^a-z0-9]/gi,'_')+'.html'),await page.content());
    try{row.snapshot=await page.locator('body').ariaSnapshot({timeout:3000});}catch(error){row.snapshotError=error.message.split('\n')[0];}
    await page.screenshot({path:resolve(output,target.service.replace(/[^a-z0-9]/gi,'_')+'.png'),timeout:5000});
   }catch(error){row.inspectionError=error.message.split('\n')[0];}
   row.finalPage=page.url();
   await Promise.allSettled(pendingAPI);
   await writeFile(resolve(output,target.service.replace(/[^a-z0-9]/gi,'_')+'.json'),JSON.stringify(row,null,2));
   results.push(row);console.log(JSON.stringify({service:row.service,mode,finalPage:row.finalPage,title:row.title,error:row.error,status:row.responses.at(-1)?.status,controls:row.state?.controls.slice(0,6),text:row.state?.text.slice(0,750)}));
   clearTimeout(deadline);
   await page.close();
  }
 }
 await visit();
 await writeFile(resolve(output,'results.json'),JSON.stringify(results,null,2));
}finally{await context.close();await proxy.close();}
