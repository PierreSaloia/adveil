// Optional live check (needs internet): npm run test:live
import {chromium} from 'playwright';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const url=process.argv[2]||'https://steamverde.net/?%2Ffiles%2Ffile%2F40-grand-theft-auto-v-gta-5-159-update-167-pt-br%2F&tab=reviews&sort=newest';
const context=await chromium.launchPersistentContext(resolve(root,'work/live-'+Date.now()),{headless:true,...(process.env.ADVEIL_BROWSER?{executablePath:process.env.ADVEIL_BROWSER}:{channel:'chromium'}),args:process.env.ADVEIL_NOEXT?[]:[`--disable-extensions-except=${root}`,`--load-extension=${root}`]});
try{
 if(!process.env.ADVEIL_NOEXT&&!context.serviceWorkers().length)await context.waitForEvent('serviceworker');
 const page=await context.newPage();const logs=[],failed=[],requested=new Set();
 page.on('console',m=>logs.push(m.text()));
 page.on('requestfailed',r=>failed.push(new URL(r.url()).hostname));
 page.on('request',r=>requested.add(new URL(r.url()).hostname));
 await page.goto(url,{waitUntil:'load',timeout:60000});await page.waitForTimeout(7000);
 const state=await page.evaluate(()=>{const m=document.getElementById('sys-notify-4524');return {noticeDisplayed:!!m&&getComputedStyle(m).display!=='none',title:document.title};});
 console.log(JSON.stringify({state,detection:logs.filter(l=>l.includes('SV-DETEC')),failedHosts:[...new Set(failed)],requestedHosts:[...requested]},null,1));
}finally{await context.close();}
