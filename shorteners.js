(() => {
  'use strict';
  const direct = adveilLinkPolicy.destination(location.href);
  // A short code whose destination exists only on the server uses its normal HTTP redirect.
  // Never guess URLs or invent CAPTCHA answers and server authorization.
  if (direct && window === window.top) { location.replace(direct); return; }
  let navigating = false;
  let suspended = false;
  let poll = null;
  let inFlight = null;
  const attempts = new WeakMap();
  const captchaNames = new Set(['g-recaptcha-response','h-captcha-response','cf-turnstile-response']);
  function challengeFields(root) {
    const names = new Set(captchaNames);
    document.querySelectorAll('[data-response-field-name]').forEach(widget=>names.add(widget.getAttribute('data-response-field-name')));
    return [...root.querySelectorAll('input[name],textarea[name]')].filter(field=>!field.disabled && names.has(field.name));
  }
  function remember(form, signature) {
    const previous = attempts.get(form) || [];
    if (previous.includes(signature)) return false;
    // In-memory state only, bounded even when a provider repeatedly renews its token.
    previous.push(signature);
    if (previous.length > 4) previous.shift();
    attempts.set(form,previous);
    return true;
  }
  function formAction(form) {
    if (form.getAttribute('method')?.toLowerCase() !== 'post') return null;
    try {
      const action = new URL(form.getAttribute('action') || location.href,location.href);
      return action.origin === location.origin ? action : null;
    } catch { return null; }
  }
  function payload(form) {
    const fields = new FormData(form);
    const challenges=challengeFields(form);
    if ([...form.elements].some(field=>field.name&&!field.disabled&&!(field.tagName==='INPUT'&&field.type==='hidden')&&!(field.tagName==='TEXTAREA'&&challenges.includes(field))&&!(field.type==='submit'))) return null;
    if ([...fields.values()].some(value=>typeof value!=='string')) return null;
    return new URLSearchParams(fields);
  }
  function signature(form,action,fields) {
    const ready=document.querySelector('a.get-link:not(.disabled):not([aria-disabled="true"])');
    return action.href+'\n'+fields.toString()+(form.id==='go-link'?'\n'+challengeFields(document).map(field=>field.name+'='+field.value).join('&')+'\nready='+!!ready:'');
  }
  function safelinkReady() {
    if(navigating||suspended||!['sfl.gl','safelinku.com'].includes(location.hostname)||location.pathname!=='/ready/go')return;
    const destinations=new Set();
    // Parse only the service's complete, observed literal click handler. No eval, remote
    // execution, ciphertext guessing or URLs collected from unrelated advertisements.
    for(const script of document.scripts){
      if(script.src)continue;
      const match=script.textContent.match(/^\s*document\.getElementById\(\s*(['"])([\w-]{1,80})\1\s*\)\.addEventListener\(\s*(['"])click\3\s*,\s*function\s*\(\s*\)\s*\{\s*window\.location\.href\s*=\s*("(?:[^"\\]|\\.)*")\s*;\s*\}\s*\)\s*;\s*$/);
      const button=match&&document.getElementById(match[2]);
      if(!button||button.tagName!=='BUTTON'||button.disabled||button.textContent.trim()!=='OPEN LINK')continue;
      try{const url=adveilLinkPolicy.safeURL(JSON.parse(match[4]));if(url&&url!==location.href)destinations.add(url);}catch{/* malformed literals are left to the original page */}
    }
    if(destinations.size===1){navigating=true;location.replace([...destinations][0]);}
  }
  function safelinkContinuation() {
    if(location.hostname!=='app.khaddavi.net')return false;
    let watch=false;
    for(const holder of document.querySelectorAll('#verify,#second_open_placeholder')){
      const button=holder.querySelector('button.slbtn');
      if(!button)continue;watch=true;
      const text=button.textContent.trim();
      if(button.disabled||button.classList.contains('wait')||!button.getClientRects().length||!['Open','Next','Continue','Go to Link'].includes(text))continue;
      const challenges=challengeFields(holder);
      // Custom challenges and passcodes need the user's own action. A provider widget
      // without a real response also waits, even before its hidden field has appeared.
      if([...holder.querySelectorAll('input,textarea')].some(field=>!challenges.includes(field))||holder.querySelector('.cf-turnstile,.g-recaptcha,.h-captcha')&&!challenges.length||challenges.some(field=>!field.value.trim()))continue;
      if(remember(button,text+'\n'+challenges.map(field=>field.value).join('\n')))button.click();
    }
    return watch;
  }
  function publishedDestination() {
    if (navigating || window !== window.top) return;
    // This is the service's actual skip link, observed on the public AdFoc.us test.
    // Ignore unrelated download ads and leave reports, accounts and other pages alone.
    if (!/(?:^|\.)adfoc\.us$/.test(location.hostname) || !/^\/[^/]+$/.test(location.pathname) || !adveilLinkPolicy.linkPage(location.href)) return;
    const destinations = new Set([...document.querySelectorAll('#showSkip a.nv-skip[href]')].map(a=>adveilLinkPolicy.safeURL(a.href)).filter(url=>url&&url!==location.href));
    if (destinations.size === 1) { navigating = true; location.replace([...destinations][0]); }
  }
  async function intermediateDestination() {
    if(navigating||suspended||window!==window.top||!adveilLinkPolicy.linkPage(location.href))return;
    const host=location.hostname;
    if(!['tech8s.net','game5s.com'].includes(host)||challengeFields(document).some(field=>!field.value.trim()))return;
    const link=document.querySelector('a#go_d2[href]');
    const destination=link&&adveilLinkPolicy.safeURL(link.href);
    let form,button,action,code;
    if(host==='tech8s.net'&&document.querySelector('#stepOne')&&document.querySelector('#stepTwo')&&document.querySelector('a.site-logo[href="https://droplink.co/payout-rates"]')){
      form=document.querySelector('form[name="tp"]');button=form?.querySelector('button#go_d2');action=form&&formAction(form);
      const fields=form&&payload(form);
      if(!button||button.disabled||!action||action.href!==location.href||!fields||[...fields.keys()].join()!=='tp2'||!/^[a-z0-9_-]{1,64}$/i.test(fields.get('tp2')))return;
      code=fields.get('tp2');
      if(!remember(form,signature(form,action,fields)))return;
    }else if(!destination)return;
    else{
      const url=new URL(destination);
      const eligible=host==='tech8s.net'&&document.querySelector('#droplink-step-one')&&document.querySelector('#droplink-step-two')&&url.hostname==='game5s.com'&&url.pathname==='/safe2.php'&&/^[a-z0-9_-]{1,64}$/i.test(url.searchParams.get('link')||'')
        ||host==='game5s.com'&&document.querySelector('#stepOne')&&url.hostname==='droplink.co'&&/^\/[a-z0-9_-]{1,64}$/i.test(url.pathname)&&!url.search;
      if(!eligible)return;
      code=url.hostname==='game5s.com'?url.searchParams.get('link'):url.pathname.slice(1);
    }
    navigating=true;
    try{
      const permission=await chrome.runtime.sendMessage({type:'shortener-hop',destination:form?action.href:destination,method:form?'POST':'GET',code});
      if(!permission?.ok||!permission.allowed||suspended){navigating=false;return;}
      if(form)HTMLFormElement.prototype.requestSubmit.call(form,button);
      else location.replace(destination);
    }catch{navigating=false; /* keep the original control if the worker is unavailable */}
  }
  async function signedDestination(form,action,fields,signature) {
    // This server-created final form already contains its signed authorization. Keep every
    // field and let the service decide whether it can release the URL before its client timer.
    if (!remember(form,signature)) return;
    const controller = new AbortController();
    inFlight = controller;
    const timeout = setTimeout(()=>controller.abort(),8000);
    try {
      const response = await fetch(action.href, {method:'POST', credentials:'same-origin', headers:{Accept:'application/json','X-Requested-With':'XMLHttpRequest'}, body:fields, signal:controller.signal});
      if (!response.ok) return;
      const result = await response.json();
      const destination = result.status === 'success' && adveilLinkPolicy.safeURL(result.url);
      if (destination && destination !== location.href && !navigating && !suspended) { navigating = true; location.replace(destination); }
    } catch { /* the original button remains available when verification or the request fails */ }
    finally { clearTimeout(timeout); if(inFlight===controller)inFlight=null; }
  }
  function captchaContinuation() {
    const host = location.hostname;
    const matches = domains => domains.some(domain=>host===domain||host.endsWith('.'+domain));
    // Only the two same-origin, token-backed continuation forms observed in the audit.
    // Their own submit handlers and server CAPTCHA validation remain in control.
    const form = matches(['exe.io','exeygo.com','smoner.com','pahe.plus']) ? document.querySelector('form#link-view:has(#captchaShortlink)')
      : matches(['cuty.io','cuttty.com']) ? document.querySelector('form#free-submit-form:has(#turnstile-container)') : null;
    const action = form && formAction(form);
    if (!action || action.pathname !== location.pathname || action.search !== location.search) return false;
    const challenges = challengeFields(form);
    if (!challenges.length) return false;
    if (challenges.some(field=>!field.value.trim())) return true;
    const fields = payload(form);
    if (!fields || !(fields.get('_token') || (fields.get('_csrfToken')&&fields.get('_Token[fields]')))) return false;
    const button = form.querySelector('#invisibleCaptchaShortlink,#submit-button,#continue-btn');
    // Never enable a control disabled by its provider callback, an error or server policy.
    if (!button || button.form!==form || button.disabled || button.getAttribute('aria-disabled')==='true' || !button.getClientRects().length) return true;
    if (remember(form,signature(form,action,fields))) HTMLFormElement.prototype.requestSubmit.call(form,button);
    return true;
  }
  function inspect() {
    clearTimeout(poll);poll=null;
    if (navigating || suspended || document.hidden || document.readyState==='loading' || window!==window.top || !adveilLinkPolicy.linkPage(location.href)) return;
    safelinkReady();
    if(navigating)return;
    const form = document.querySelector('form#go-link');
    const action = form && formAction(form);
    const fields = action?.pathname==='/links/go' ? payload(form) : null;
    let watch = false;
    if (fields?.get('ad_form_data') && fields.get('_csrfToken') && fields.get('_Token[fields]')) {
      watch = true;
      const challenges = challengeFields(document);
      const pendingWidget=document.querySelector('.cf-turnstile,.g-recaptcha,.h-captcha,#captchaShortlink')&&!challenges.length;
      if (!inFlight && !pendingWidget && challenges.every(field=>field.value.trim())) {
        void signedDestination(form,action,fields,signature(form,action,fields));
      }
    } else watch = captchaContinuation() || safelinkContinuation();
    // CAPTCHA SDKs often assign .value without an attribute mutation or input event.
    // Poll only recognized continuation forms, and stop while hidden or leaving the page.
    if (watch && !navigating) poll=setTimeout(inspect,500);
    if(!watch)void intermediateDestination();
  }
  function clean(link) {
    if (link.hasAttribute('download')) return;
    const destination = adveilLinkPolicy.destination(link.href);
    if (destination) link.href = destination;
  }
  function cleanTree(root) {
    if (root instanceof Element && root.matches('a[href],area[href]')) clean(root);
    root.querySelectorAll?.('a[href],area[href]').forEach(clean);
  }
  cleanTree(document);
  publishedDestination();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',inspect,{once:true});
  else inspect();
  new MutationObserver(records => {
    for (const record of records) {
      if (record.type === 'attributes' && record.attributeName==='href') clean(record.target);
      else for (const node of record.addedNodes) cleanTree(node);
    }
    publishedDestination();
    inspect();
  }).observe(document, {subtree:true, childList:true, attributes:true, attributeFilter:['href','value','disabled','name','action']});
  document.addEventListener('input',inspect,true);
  document.addEventListener('change',inspect,true);
  document.addEventListener('visibilitychange',inspect);
  // A site that already resumes itself must not receive our second submission.
  document.addEventListener('submit',event=>{
    if(!adveilLinkPolicy.linkPage(location.href)||!event.target.matches('form#go-link,form#link-view,form#free-submit-form,form[name="tp"]'))return;
    const fields=payload(event.target);
    const action=formAction(event.target);
    if(fields&&action)remember(event.target,signature(event.target,action,fields));
  },true);
  window.addEventListener('pagehide',()=>{suspended=true;clearTimeout(poll);inFlight?.abort();});
  window.addEventListener('pageshow',()=>{suspended=false;inspect();});
  function cleanClick(event) {
    if (!event.isTrusted || event.defaultPrevented) return;
    const link = event.composedPath().find(node => node instanceof Element && node.matches('a[href],area[href]'));
    if (!link || link.hasAttribute('download')) return;
    // Catch href changes made immediately before a click, and keep native navigation intact.
    clean(link);
  }
  window.addEventListener('click', cleanClick, true);
  window.addEventListener('auxclick', cleanClick, true);
})();
