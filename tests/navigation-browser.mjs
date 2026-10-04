import assert from 'node:assert/strict';
export async function testNavigation({context,worker,page,request,baseline,port,pass}) {
 const origin='http://page.adveil.test:'+port;
 const final='http://clean.adveil.test:'+port+'/destination?token=a%2Fb#download';
 const ad='http://ad.doubleclick.net:'+port+'/ad-tab';
 const settings={...baseline,ads:false,regional:false,privacy:false};
 const waitUntil=async check=>{const start=Date.now();while(!await check()){if(Date.now()-start>5000)throw Error('Navigation assertion timed out');await new Promise(r=>setTimeout(r,25));}};
 const fresh=async overrides=>{await request({type:'save',settings:{...settings,...overrides}});await page.goto(origin);};
 const close=async tab=>{if(!tab.isClosed())await tab.close();};
 await fresh();
 const count=context.pages().length;
 assert.equal(await page.evaluate(url=>window.open(url)===null,final),true);
 assert.equal(await page.evaluate(url=>{window.name='_blank';const blocked=window.open(url)===null;window.name='';return blocked;},final),true);
 assert.equal(await page.evaluate(()=>String(window.open)),'function open() { [native code] }');
 assert.equal(await page.evaluate(url=>{const a=document.createElement('a');a.href=url;a.target='_blank';document.body.append(a);const e=new MouseEvent('click',{bubbles:true,cancelable:true});a.dispatchEvent(e);return e.defaultPrevented;},final),true);
 await page.evaluate(url=>{const a=document.createElement('a');a.href=url;a.target='_blank';document.body.append(a);a.click();const f=document.createElement('form');f.action=url;f.target='_blank';document.body.append(f);f.submit();f.requestSubmit();},final);
 assert.equal(context.pages().length,count);
 pass('automatic window.open, synthetic new-tab links and form submissions create no tabs');

 await page.evaluate(url=>{const div=document.createElement('div');div.id='body-click';div.textContent='Article text';div.onclick=()=>{window.bodyPopupBlocked=window.open(url)===null;};document.body.append(div);},final);
 await page.locator('#body-click').click();assert.equal(await page.evaluate(()=>window.bodyPopupBlocked),true);
 pass('clicking ordinary content cannot authorize a pop-under');

 await fresh();
 await page.evaluate(url=>{const b=document.createElement('button');b.id='login';b.textContent='Login';b.onclick=()=>{window.openResults=[!!window.open(url),!!window.open(url)];};document.body.append(b);},final);
 let opened=context.waitForEvent('page');await page.locator('#login').click();let tab=await opened;
 assert.deepEqual(await page.evaluate(()=>window.openResults),[true,false]);await close(tab);
 pass('a real login button can open one window; a second scripted window is suppressed');

 await fresh();
 await page.evaluate(([expected,other])=>{const a=document.createElement('a');a.id='real-link';a.textContent='Continue';a.href=expected;a.target='_blank';a.onclick=()=>{window.hijackBlocked=window.open(other)===null;};document.body.append(a);},[final,origin+'/advertisement']);
 opened=context.waitForEvent('page');await page.locator('#real-link').click();tab=await opened;
 assert.equal(await page.evaluate(()=>window.hijackBlocked),true);await tab.waitForURL(final);await close(tab);
 pass('an unrelated script popup is blocked while the clicked link opens its intended destination');

 await fresh();
 await page.evaluate(url=>{const b=document.createElement('button');b.id='async-login';b.textContent='Continue login';b.onclick=()=>Promise.resolve().then(()=>{window.asyncOpened=!!window.open(url);});document.body.append(b);},final);
 opened=context.waitForEvent('page');await page.locator('#async-login').click();tab=await opened;
 assert.equal(await page.evaluate(()=>window.asyncOpened),true);await close(tab);
 await fresh();
 await page.evaluate(url=>{const f=document.createElement('form');f.action=url;f.target='_blank';f.innerHTML='<button id="submit-real">Submit</button>';document.body.append(f);},final);
 opened=context.waitForEvent('page');await page.locator('#submit-real').click();tab=await opened;await close(tab);
 pass('asynchronous login callbacks and genuine forms with a new-tab target remain usable');
 await fresh();
 await page.evaluate(url=>{const b=document.createElement('button');b.id='named-login';b.textContent='Login with form';b.onclick=()=>{
  window.open('about:blank','login-window');const f=document.createElement('form');f.action=url;f.target='login-window';document.body.append(f);f.submit();
 };document.body.append(b);},origin+'/login-form');
 opened=context.waitForEvent('page');await page.locator('#named-login').click();tab=await opened;
 await tab.waitForURL(url=>url.origin===origin&&url.pathname==='/login-form');assert.equal(context.pages().length,count+1);await close(tab);
 pass('a login form can reuse the named window opened by the same action without creating extra tabs');

 await fresh();
 await page.evaluate(()=>{const f=document.createElement('iframe');f.id='blank-frame';document.body.append(f);});
 assert.equal(await page.frames().find(f=>f!==page.mainFrame()).evaluate(url=>window.open(url)===null,final),true);
 pass('the popup guard also runs in a freshly created about:blank frame');

 // Call native open in the isolated world to exercise the browser-level fallback independently.
 const installNative=async()=>worker.evaluate(async({url,ad})=>{
  const [source]=await chrome.tabs.query({url:url+'/*'});
  await chrome.scripting.executeScript({target:{tabId:source.id},world:'ISOLATED',func:destination=>{
   const b=document.createElement('button');b.id='native-ad';b.textContent='Native popup test';b.onclick=()=>window.open(destination);document.body.append(b);
  },args:[ad]});
 },{url:origin,ad});
 await fresh();await installNative();opened=context.waitForEvent('page');await page.locator('#native-ad').click();tab=await opened;
 await waitUntil(()=>tab.isClosed());
 pass('browser navigation fallback closes a known ad tab opened with an unpatched API');
 await fresh();
 await worker.evaluate(async({url,ad})=>{
  const [source]=await chrome.tabs.query({url:url+'/*'});
  await chrome.scripting.executeScript({target:{tabId:source.id},world:'ISOLATED',func:destination=>{
   const b=document.createElement('button');b.id='delayed-ad';b.textContent='Delayed popup';b.onclick=()=>{const popup=window.open('about:blank');setTimeout(()=>{if(popup)popup.location.href=destination;},50);};document.body.append(b);
  },args:[ad]});
 },{url:origin,ad});
 opened=context.waitForEvent('page');await page.locator('#delayed-ad').click();tab=await opened;
 await waitUntil(()=>tab.isClosed());
 pass('a new blank tab subsequently redirected to an advertising host is also closed');
 for(const override of [{popupOff:['page.adveil.test']},{disabledHosts:['page.adveil.test']},{allowDomains:['doubleclick.net']}]){
  await fresh(override);await installNative();opened=context.waitForEvent('page');await page.locator('#native-ad').click();tab=await opened;
  await tab.waitForURL(ad);assert.equal(tab.isClosed(),false);await close(tab);
 }
 pass('popup site exceptions, complete site pause and allowed ad domains disable the fallback');
 await fresh({popupOff:['page.adveil.test']});
 opened=context.waitForEvent('page');await page.evaluate(url=>{window.open(url);},final);tab=await opened;await close(tab);
 pass('a popup exception removes the page hook after reload');

 await fresh();
 await page.evaluate(url=>{window.open(url,'_self');},final);await page.waitForURL(final);
 pass('window.open targeting the current page preserves ordinary navigation');

 await context.route('https://technons.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Shortener fixture</title><h1>Intermediate page</h1>'}));
 await context.route('https://bit.ly/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Opaque short code fixture</title>'}));
 const wrapped='https://technons.com/go?url='+encodeURIComponent('https://bit.ly/go?target='+encodeURIComponent(final));
 await fresh();
 await page.goto(wrapped,{waitUntil:'commit'}).catch(error=>{if(!error.message.includes('ERR_ABORTED'))throw error;});
 await page.waitForURL(final);assert.equal(await page.locator('h1').textContent(),'Ordinary content');
 pass('an explicit nested shortener destination opens directly in the same tab');
 await fresh({shortenerOff:['technons.com']});await page.goto(wrapped);assert.equal(page.url(),wrapped);
 await fresh({shorteners:false});await page.goto(wrapped);assert.equal(page.url(),wrapped);
 pass('global and per-site shortcut switches retain the original intermediate page');
 await fresh();await page.goto('https://bit.ly/opaque-code');assert.equal(page.url(),'https://bit.ly/opaque-code');
 await page.goto('https://technons.com/login?url='+encodeURIComponent(final));assert.equal(new URL(page.url()).pathname,'/login');
 pass('opaque short codes and account pages are left to the service rather than guessed');
 await page.goto(origin);
 await page.evaluate(url=>{const a=document.createElement('a');a.id='wrapped-link';a.href=url;a.textContent='Final destination';document.body.append(a);},wrapped);
 await waitUntil(()=>page.locator('#wrapped-link').getAttribute('href').then(href=>href===final));
 await page.locator('#wrapped-link').click();await page.waitForURL(final);
 pass('shortener URLs in dynamically inserted links are cleaned before a normal click');

 await context.route('https://adfoc.us/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Published skip destination</title><a href="https://ads.example/download">Download ad</a><span id="showSkip" hidden><a class="nv-skip" href="'+final.replaceAll('&','&amp;')+'">Continue to your file</a></span>'}));
 await fresh();await page.goto('https://adfoc.us/x1',{waitUntil:'commit'}).catch(error=>{if(!error.message.includes('ERR_ABORTED'))throw error;});await page.waitForURL(final);
 await fresh({shortenerOff:['adfoc.us']});await page.goto('https://adfoc.us/x1');assert.equal(page.url(),'https://adfoc.us/x1');
 pass('the published AdFoc.us destination skips the ad page; a site exception restores it');

 await context.route('https://exeygo.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Client policy fixture</title><script>var app_vars={force_disable_adblock:"1",adblock_allowed:false,please_disable_adblock:"Please disable Adblock",enable_captcha:"yes",counter_value:6};</script><form><input name="_csrfToken" value="original-signed-token"><button id="verify" disabled>Verify CAPTCHA</button></form>'}));
 await fresh();await page.goto('https://exeygo.com/code');
 assert.deepEqual(await page.evaluate(()=>({force:app_vars.force_disable_adblock,allowed:app_vars.adblock_allowed,captcha:app_vars.enable_captcha,counter:app_vars.counter_value,token:document.querySelector('input').value,disabled:document.querySelector('button').disabled})),{force:'0',allowed:true,captcha:'yes',counter:6,token:'original-signed-token',disabled:true});
 await fresh({stealthOff:['exeygo.com']});await page.goto('https://exeygo.com/code');assert.equal(await page.evaluate(()=>app_vars.force_disable_adblock),'1');
 pass('shortener client policy allows adblock while preserving CAPTCHA, timers and signed data; camouflage exceptions are honored');

 await context.route('https://exeygo.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><script>const policy={force_disable_adblock:"1",adblock_allowed:false,enable_captcha:"yes"};Object.defineProperty(window,"app_vars",{get:()=>policy,configurable:false});</script><h1>Native blocker policy</h1>'}));
 await fresh();await page.goto('https://exeygo.com/native-policy');
 assert.deepEqual(await page.evaluate(()=>({force:app_vars.force_disable_adblock,allowed:app_vars.adblock_allowed,captcha:app_vars.enable_captcha,configurable:Object.getOwnPropertyDescriptor(window,'app_vars').configurable})),{force:'0',allowed:true,captcha:'yes',configurable:false});
 pass('an existing non-configurable adblock policy without warning text is adapted while its accessor and CAPTCHA remain intact');

 await context.route('https://cuttty.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><div class="link-container" data-allows-adblock="0"><button disabled>Verify CAPTCHA</button></div><script>setTimeout(()=>{const d=document.createElement("div");d.className="link-container";d.setAttribute("data-allows-adblock","0");document.body.append(d);},0);</script>'}));
 await fresh();await page.goto('https://cuttty.com/code');
 await waitUntil(()=>page.locator('.link-container[data-allows-adblock="1"]').count().then(count=>count===2));assert.equal(await page.locator('button').isDisabled(),true);
 await fresh({shorteners:false});await page.goto('https://cuttty.com/code');assert.equal(await page.locator('.link-container').first().getAttribute('data-allows-adblock'),'0');
 pass('Cuty compatibility covers initial and inserted containers; the shortcut switch restores its client policy');

 await context.route('https://bcvcgo.xyz/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><div id="redirectSc" style="display:none">Normal continuation</div><script src="https://cdn.bvmcdn.net/opdis.js?v=test" onload="document.getElementById(\'redirectSc\').style.display=\'block\'"></script>'}));
 await context.route('https://cdn.bvmcdn.net/opdis.js*',route=>route.fulfill({contentType:'application/javascript',body:'window.externalAdScript=true;'}));
 await fresh({ads:true});await page.goto('https://bcvcgo.xyz/code');
 assert.equal(await page.locator('#redirectSc').isVisible(),true);assert.equal(await page.evaluate(()=>window.externalAdScript),undefined);
 const matchPopupScript=initiator=>worker.evaluate(async initiator=>chrome.declarativeNetRequest.testMatchOutcome({url:'https://cdn.bvmcdn.net/opdis.js?v=1',initiator,type:'script'}),initiator);
 assert.ok((await matchPopupScript('https://bcvcgo.xyz')).matchedRules.some(rule=>rule.ruleId===19));
 assert.equal((await matchPopupScript(origin)).matchedRules.some(rule=>rule.ruleId===19),false);
 await fresh({ads:true,stealthOff:['bcvcgo.xyz']});assert.equal((await matchPopupScript('https://bcvcgo.xyz')).matchedRules.some(rule=>rule.ruleId===19),false);
 pass('BCVC continuation receives its script load event without executing ads; the substitute is scoped to the service and honors exclusions');

 await context.route('https://bcvcgo.xyz/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><script>var mtx_id="signed-layout";</script><div id="signed-layout" style="display:none"><div id="redirectSc"><button id="getLink" disabled>Wait for server countdown</button></div></div><div id="bcvcNotifyLayout">Please wait</div><script src="prebid-ads.js"></script>'}));
 await fresh({ads:true});await page.goto('https://bcvcgo.xyz/layout');
 assert.equal(await page.locator('#signed-layout').isVisible(),true);assert.equal(await page.locator('#bcvcNotifyLayout').isVisible(),false);assert.equal(await page.locator('#getLink').isDisabled(),true);
 await fresh({ads:true,shortenerOff:['bcvcgo.xyz']});await page.goto('https://bcvcgo.xyz/layout');assert.equal(await page.locator('#signed-layout').isVisible(),false);
 pass('BCVC layout is restored after its ad stub loads without enabling its countdown control; the per-site exception disables restoration');

 await fresh();
 const urls=await page.evaluate(async()=>{
  const url='https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
  const response=await fetch(url);
  const xhr=await new Promise(resolve=>{const x=new XMLHttpRequest();x.open('HEAD',url);const before=x.responseURL;x.onload=()=>resolve({before,status:x.status,url:x.responseURL});x.send();});
  const ordinary=await new Promise(resolve=>{const x=new XMLHttpRequest();x.open('GET','/ordinary');x.onload=()=>resolve(x.responseURL);x.send();});
  return {fetchURL:response.url,length:response.headers.get('content-length'),body:await response.text(),xhr,ordinary};
 });
 assert.deepEqual(urls,{fetchURL:'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',length:'0',body:'',xhr:{before:'',status:200,url:'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'},ordinary:origin+'/ordinary'});
 pass('SafelinkU header and Smoner response-URL probes see consistent local results; ordinary XHR URLs stay native');

 const signedBody='<form id="go-link" method="post" action="/links/go"><input name="ad_form_data" type="hidden" value="signed-payload"><input name="_csrfToken" type="hidden" value="signed-csrf"><input name="_Token[fields]" type="hidden" value="signed-fields"><button disabled>Wait 15 seconds</button></form>';
 let requests=[];
 await context.route('https://smoner.com/**',route=>{
  if(new URL(route.request().url()).pathname==='/links/go'){
   requests.push(Object.fromEntries(new URLSearchParams(route.request().postData())));
   return route.fulfill({contentType:'application/json',body:JSON.stringify({status:'success',url:final})});
  }
  return route.fulfill({contentType:'text/html',body:'<!doctype html>'+signedBody+(new URL(route.request().url()).pathname==='/captcha'?'<textarea name="h-captcha-response"></textarea>':'')});
 });
 await fresh();await page.goto('https://smoner.com/ready',{waitUntil:'commit'}).catch(error=>{if(!error.message.includes('ERR_ABORTED'))throw error;});await page.waitForURL(final);
 assert.deepEqual(requests,[{ad_form_data:'signed-payload',_csrfToken:'signed-csrf','_Token[fields]':'signed-fields'}]);
 await fresh();await page.goto('https://smoner.com/captcha');await page.waitForTimeout(100);assert.equal(page.url(),'https://smoner.com/captcha');assert.equal(requests.length,1);
 await fresh({shorteners:false});await page.goto('https://smoner.com/ready');assert.equal(page.url(),'https://smoner.com/ready');assert.equal(requests.length,1);
 pass('a signed final form accepts only a server-confirmed URL and preserves its fields; pending CAPTCHA and the off switch prevent submission');

 await context.route('https://smoner.com/**',route=>new URL(route.request().url()).pathname==='/links/go'?route.fulfill({contentType:'application/json',body:JSON.stringify({status:'success',url:'javascript:alert(1)'})}):route.fulfill({contentType:'text/html',body:'<!doctype html>'+signedBody}));
 await fresh();await page.goto('https://smoner.com/unsafe');await page.waitForTimeout(100);assert.equal(page.url(),'https://smoner.com/unsafe');assert.equal(await page.locator('button').textContent(),'Wait 15 seconds');
 pass('an invalid server destination retains the service page and its original control');

 const tokenForm=signedBody.replace('</form>','<textarea name="h-captcha-response"></textarea></form>');
 requests=[];
 await context.route('https://smoner.com/**',route=>{
  if(new URL(route.request().url()).pathname!=='/links/go')return route.fulfill({contentType:'text/html',body:'<!doctype html>'+tokenForm});
  const fields=Object.fromEntries(new URLSearchParams(route.request().postData()));requests.push(fields);
  return route.fulfill({contentType:'application/json',body:JSON.stringify(fields['h-captcha-response']==='renewed-valid-response'?{status:'success',url:final}:{status:'error',message:'expired token'})});
 });
 await fresh();await page.goto('https://smoner.com/token-renewal');await page.waitForTimeout(550);assert.equal(requests.length,0);
 await page.evaluate(()=>{document.querySelector('textarea').value='expired-response';});
 await waitUntil(()=>requests.length===1);await page.waitForTimeout(650);assert.equal(requests.length,1);assert.equal(page.url(),'https://smoner.com/token-renewal');
 await page.evaluate(()=>{document.querySelector('textarea').value='';});await page.waitForTimeout(550);assert.equal(requests.length,1);
 await page.evaluate(()=>{document.querySelector('textarea').value='renewed-valid-response';});await page.waitForURL(final);
 assert.equal(requests.length,2);assert.equal(requests[1]['h-captcha-response'],'renewed-valid-response');assert.equal(requests[1]._csrfToken,'signed-csrf');
 pass('CAPTCHA property-only updates resume signed verification; empty or unchanged responses do not retry, and a renewed token is preserved');

 const continuation='<form id="link-view" method="post" action="/resume"><input type="hidden" name="_csrfToken" value="original-csrf"><input type="hidden" name="_Token[fields]" value="original-fields"><div id="captchaShortlink"><input type="hidden" name="cf-turnstile-response" value=""></div><button id="invisibleCaptchaShortlink" type="submit" name="continue" value="original-button" disabled>I am not a robot</button></form>';
 const resumed=[];
 await context.route('https://exeygo.com/**',route=>{
  if(route.request().method()==='POST'){
   resumed.push(Object.fromEntries(new URLSearchParams(route.request().postData())));
   return route.fulfill({status:302,headers:{location:final},body:''});
  }
  return route.fulfill({contentType:'text/html',body:'<!doctype html>'+continuation});
 });
 await fresh();await page.goto('https://exeygo.com/resume');
 await page.evaluate(()=>{document.querySelector('[name="cf-turnstile-response"]').value='actual-provider-response';});await page.waitForTimeout(650);assert.equal(resumed.length,0);
 await page.evaluate(()=>{document.querySelector('button').disabled=false;});await page.waitForURL(final);
 assert.deepEqual(resumed,[{_csrfToken:'original-csrf','_Token[fields]':'original-fields','cf-turnstile-response':'actual-provider-response',continue:'original-button'}]);
 await fresh({shortenerOff:['exeygo.com']});await page.goto('https://exeygo.com/resume');
 await page.evaluate(()=>{document.querySelector('[name="cf-turnstile-response"]').value='actual-provider-response';document.querySelector('button').disabled=false;});await page.waitForTimeout(650);assert.equal(resumed.length,1);
 pass('a solved CAPTCHA resumes the observed same-origin continuation only after its own callback enables the button; fields and site exceptions are preserved');

 await context.route('https://exeygo.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html>'+continuation+'<script>window.submissions=0;document.querySelector("form").onsubmit=e=>{e.preventDefault();window.submissions++;};</script>'}));
 await fresh();await page.goto('https://exeygo.com/resume');
 await page.evaluate(()=>{document.querySelector('[name="cf-turnstile-response"]').value='site-handled-response';document.querySelector('button').disabled=false;document.querySelector('form').requestSubmit(document.querySelector('button'));});
 await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.submissions),1);
 pass('the service can submit its own solved challenge without receiving a duplicate automatic submission');

 requests=[];
 await context.route('https://smoner.com/**',route=>{
  if(new URL(route.request().url()).pathname==='/links/go'){requests.push(route.request().postData());return route.fulfill({contentType:'application/json',body:JSON.stringify({status:'error'})});}
  return route.fulfill({contentType:'text/html',body:'<!doctype html>'+signedBody+'<div class="cf-turnstile" data-response-field-name="challenge-token"></div>'});
 });
 await fresh();await page.goto('https://smoner.com/widget-loading');await page.waitForTimeout(550);assert.equal(requests.length,0);
 await page.evaluate(()=>{const i=document.createElement('input');i.type='hidden';i.name='challenge-token';document.querySelector('form').append(i);});await page.waitForTimeout(550);assert.equal(requests.length,0);
 await page.evaluate(()=>{document.querySelector('[name="challenge-token"]').value='custom-provider-response';});await waitUntil(()=>requests.length===1);assert.equal(new URLSearchParams(requests[0]).get('challenge-token'),'custom-provider-response');
 pass('an initializing CAPTCHA widget waits for its response field, including a custom provider field name');

 let continuationPosts=0;
 await context.route('https://tech8s.net/**',route=>{
  if(route.request().method()==='POST'){continuationPosts++;return route.fulfill({contentType:'text/html',body:'<!doctype html><button id="droplink-step-one">Ad task one</button><button id="droplink-step-two">Ad task two</button><a id="go_d2" hidden href="https://game5s.com/safe2.php?link=flow-code">Continue</a>'});}
  return route.fulfill({contentType:'text/html',body:'<!doctype html><a class="site-logo" href="https://droplink.co/payout-rates"></a><button id="stepOne">Ad one</button><button id="stepTwo">Ad two</button><form name="tp" method="post"><input type="hidden" name="tp2" value="flow-code"><button id="go_d2" hidden>Continue</button></form>'});
 });
 await context.route('https://game5s.com/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><button id="stepOne">Ad</button><a id="go_d2" hidden href="https://droplink.co/flow-code">Continue</a>'}));
 await context.route('https://droplink.co/**',route=>{
  const url=new URL(route.request().url());
  if(url.pathname==='/flow-start')return route.fulfill({status:302,headers:{location:'https://tech8s.net/safe.php?link=flow-code'},body:''});
  if(url.pathname==='/links/go')return route.fulfill({contentType:'application/json',body:JSON.stringify({status:'success',url:final})});
  return route.fulfill({contentType:'text/html',body:'<!doctype html>'+signedBody});
 });
 await fresh();
 let chainPage=await context.newPage();
 // Start at the observed intermediate code URL, as a normal shortener redirect does.
 await chainPage.goto('https://tech8s.net/safe.php?link=flow-code',{waitUntil:'commit'}).catch(error=>{if(!error.message.includes('ERR_ABORTED'))throw error;});
 await chainPage.waitForURL(final);assert.equal(continuationPosts,1);await chainPage.close();
 pass('DropLink intermediate forms and published links advance the same code directly without opening ad tasks');

 chainPage=await context.newPage();
 await chainPage.goto('https://tech8s.net/safe.php?link=different-original');await chainPage.waitForTimeout(700);assert.equal(continuationPosts,1);assert.equal(new URL(chainPage.url()).hostname,'tech8s.net');await chainPage.close();
 await fresh({shortenerOff:['tech8s.net']});chainPage=await context.newPage();
 await chainPage.goto('https://tech8s.net/safe.php?link=flow-code');await chainPage.waitForTimeout(600);assert.equal(continuationPosts,1);await chainPage.close();
 pass('a substituted short code and a per-site exception leave intermediate controls intact');

 await fresh();
 await context.route('https://game5s.com/**',route=>route.fulfill({status:302,headers:{location:'https://tech8s.net/rotating-article'},body:''}));
 chainPage=await context.newPage();await chainPage.goto('https://tech8s.net/safe.php?link=flow-code',{waitUntil:'commit'}).catch(error=>{if(!error.message.includes('ERR_ABORTED'))throw error;});
 await chainPage.waitForURL('https://tech8s.net/rotating-article');await chainPage.waitForTimeout(1300);assert.equal(continuationPosts,3);await chainPage.close();
 pass('a rotating intermediate loop stops before repeating a continuation POST');

 const readyPage=url=>'<!doctype html><button id="published-final">OPEN LINK</button><script>document.getElementById("published-final").addEventListener("click",function(){window.location.href='+JSON.stringify(url)+';});</script>';
 await context.route('https://sfl.gl/**',route=>route.fulfill({contentType:'text/html',body:readyPage(final)}));
 await fresh();await page.goto('https://sfl.gl/ready/go?t=signed-token',{waitUntil:'commit'}).catch(error=>{if(!error.message.includes('ERR_ABORTED'))throw error;});await page.waitForURL(final);
 await context.route('https://sfl.gl/**',route=>route.fulfill({contentType:'text/html',body:readyPage('javascript:alert(1)')}));
 await page.goto('https://sfl.gl/ready/go?t=signed-token');await page.waitForTimeout(550);assert.equal(new URL(page.url()).hostname,'sfl.gl');
 pass('the published SafelinkU final URL is parsed as a literal without executing page code; unsafe destinations are refused');

 await context.route('https://app.khaddavi.net/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><div id="verify"><button class="slbtn wait" disabled>Wait... 3s</button></div><script>window.flowClicks=0;document.querySelector("button").onclick=()=>{window.flowClicks++;document.querySelector("button").textContent="Verifying...";};</script>'}));
 await fresh();await page.goto('https://app.khaddavi.net/article');await page.waitForTimeout(550);assert.equal(await page.evaluate(()=>window.flowClicks),0);
 await page.evaluate(()=>{const b=document.querySelector('button');b.textContent='Next';b.disabled=false;b.classList.remove('wait');});await waitUntil(()=>page.evaluate(()=>window.flowClicks===1));await page.waitForTimeout(550);assert.equal(await page.evaluate(()=>window.flowClicks),1);
 await context.route('https://app.khaddavi.net/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><div id="second_open_placeholder"><input name="passcode"><button class="slbtn">Open</button></div><script>window.flowClicks=0;document.querySelector("button").onclick=()=>window.flowClicks++;</script>'}));
 await page.goto('https://app.khaddavi.net/article');await page.waitForTimeout(600);assert.equal(await page.evaluate(()=>window.flowClicks),0);
 pass('SafelinkU resumes only ready continuation controls once; pending timers and passcode forms require their normal validation');

 await fresh();
 const camouflage=await page.evaluate(()=>new Promise(resolve=>{
  const bait=document.createElement('div');bait.className='adsbox';document.body.append(bait);
  const plain=document.createElement('div');plain.style.display='none';document.body.append(plain);
  const img=new Image();img.onload=()=>resolve({baitVisible:bait.checkVisibility(),plainVisible:plain.checkVisibility(),width:img.naturalWidth,src:img.getAttribute('src')});img.onerror=()=>resolve({error:true});
  img.setAttribute('src','https://popads.net/favicon.ico?probe=attribute');
 }));
 assert.deepEqual(camouflage,{baitVisible:true,plainVisible:false,width:16,src:'https://popads.net/favicon.ico?probe=attribute'});
 pass('visibility and setAttribute image probes are camouflaged despite a real second blocker');
 await request({type:'save',settings:baseline});
}
