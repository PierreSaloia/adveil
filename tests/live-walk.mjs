// Only controls inspected in the public pages are used. Never buys, subscribes or downloads.
export async function walk(page,target,row,output,writeFile,resolve){
 row.steps=[];
 const name=target.service.replace(/[^a-z0-9]/gi,'_');
 const started=Date.now();
 for(let step=0;step<24&&Date.now()-started<90000;step++){
  await page.waitForLoadState('domcontentloaded',{timeout:20000}).catch(()=>{});
  let state;
  for(let retry=0;retry<3;retry++){
   state=await page.evaluate(()=>({url:location.href,text:(document.body?.innerText||'').slice(0,14000),buttons:[...document.querySelectorAll('button,input[type=submit]')].map(b=>({id:b.id,text:(b.innerText||b.value||'').trim(),disabled:!!b.disabled})),captcha:[...document.querySelectorAll('input[name*="captcha"],textarea[name*="captcha"],input[name*="turnstile"]')].map(e=>({name:e.name,solved:!!e.value}))})).catch(()=>null);
   if(state)break;await page.waitForTimeout(1000);
  }
  if(!state){await page.waitForTimeout(1500);continue;}
  const current={...state,action:null};row.steps.push(current);
  await writeFile(resolve(output,name+'-step-'+step+'.html'),await page.content());
  console.log(JSON.stringify({service:target.service,step,url:state.url,buttons:state.buttons,text:state.text.slice(0,450)}));
  if(new URL(state.url).hostname==='www.google.com'&&new URL(state.url).pathname==='/'){row.confirmedDestination=state.url;break;}
  if(state.captcha.some(c=>!c.solved)||/Please (?:solve|complete).*captcha|Executando verificação|Verify you are human|Confirm you are human/i.test(state.text)){current.stop='CAPTCHA or human validation';break;}
  if(target.service==='SafelinkU'&&!state.buttons.some(button=>/^(Open|Next|Continue|Go to Link)$/.test(button.text))&&/Your link is being processed|Verifying|Getting Link|Wait\.\.\./.test(state.text)){
   current.action='Wait for service verification or initialization';
   await page.waitForTimeout(3000);continue;
  }
  let control;
  if(target.service==='GPLinks')control=page.getByRole('link',{name:/^Continue with ads/});
  else if(target.service==='Exe.io')control=page.getByRole('button',{name:'Continue',exact:true});
  else if(target.service==='Cuty')control=page.locator('#submit-button');
  else if(target.service==='Smoner'){
   if(await page.locator('#continue-btn').count())control=page.locator('#continue-btn');
   else{
    control=page.locator('a.get-link');
    await page.waitForFunction(()=>{const a=document.querySelector('a.get-link');return a&&!a.classList.contains('disabled');},{},{timeout:20000}).catch(()=>{});
   }
  }
  else if(target.service==='AdShort')control=page.getByRole('button',{name:'CLICK HERE TO CONTINUE',exact:true});
  else if(target.service==='BCVC')control=page.locator('#getLink');
  else if(target.service==='SafelinkU')control=new URL(state.url).hostname==='sfl.gl'&&new URL(state.url).pathname==='/ready/go'?page.getByRole('button',{name:'OPEN LINK',exact:true}):page.locator('button.slbtn').filter({hasText:/^(Open|Next|Continue|Go to Link)$/}).first();
  else if(target.service==='DropLink'||target.service==='EZ4Short'){
   const hasContinuation=await page.locator('form[name=tp] input[name=tp2]').count();
   if(hasContinuation){
    const code=await page.locator('form[name=tp] input[name=tp2]').inputValue();
    if(code!==new URL(target.url).pathname.slice(1)){current.stop='Published continuation substituted the original short code';break;}
    current.action='Submit published continuation form';
    await page.evaluate(()=>{const form=document.querySelector('form[name=tp]');if(form?.querySelector('#go_d2')&&new URL(form.getAttribute('action')||location.href,location.href).origin===location.origin)HTMLFormElement.prototype.submit.call(form);});
    await page.waitForTimeout(5000);continue;
   }
   const continuation=await page.locator('a#go_d2[href]').getAttribute('href').catch(()=>null);
   if(continuation&&((new URL(continuation).hostname==='game5s.com'&&new URL(continuation).pathname==='/safe2.php')||(new URL(state.url).hostname==='game5s.com'&&new URL(continuation).hostname==='droplink.co'))){
    const url=new URL(continuation),code=url.hostname==='game5s.com'?url.searchParams.get('link'):url.pathname.slice(1);
    if(code!==new URL(target.url).pathname.slice(1)){current.stop='Published continuation substituted the original short code';break;}
    current.action='Follow published continuation URL';await page.goto(continuation,{waitUntil:'domcontentloaded',timeout:20000}).catch(()=>{});await page.waitForTimeout(5000);continue;
   }
   control=page.locator('#go-link .get-link, a.get-link');
  }
  if(!control||!await control.count()){current.stop='No inspected continuation control available';break;}
  try{
   await control.waitFor({state:'visible',timeout:15000});
   if(await control.isDisabled())await page.waitForFunction(()=>{const b=[...document.querySelectorAll('button,input[type=submit],#getLink')].find(e=>/^(Continue|CLICK HERE TO CONTINUE|Get link|SKIP AD|Open|Next|Go to Link)$/i.test((e.innerText||e.value||'').trim()));return b&&!b.disabled;},{},{timeout:20000}).catch(()=>{});
   if(await control.isDisabled()){current.stop='Continuation remains disabled';break;}
   current.action='Click '+(await control.innerText().catch(()=>control.getAttribute('value')));
   await control.click({timeout:5000});
   await page.waitForTimeout(target.service==='SafelinkU'?12000:5000);
  }catch(error){current.stop=error.message.split('\n')[0];break;}
 }
}
