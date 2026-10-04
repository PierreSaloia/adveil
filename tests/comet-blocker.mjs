// Configure only the throwaway profile supplied by the caller, through Comet's own UI.
export async function configureCometBlocker(context,setting) {
 if(!setting)return null;
 if(!['on','off'].includes(setting))throw Error('ADVEIL_COMET_BLOCKER must be on or off');
 const page=await context.newPage();
 try{
  await page.goto('chrome://settings/adBlock');
  const toggle=page.getByRole('button',{name:/^(Bloquear rastreadores e anúncios conhecidos|Block known trackers and ads)$/});
  await toggle.waitFor();
  const enabled=()=>toggle.getAttribute('aria-pressed').then(value=>value==='true');
  if(await enabled()!==(setting==='on'))await toggle.click();
  if(await enabled()!==(setting==='on'))throw Error('Comet blocker setting did not apply');
  return {enabled:await enabled(),configuredThrough:'chrome://settings/adBlock',personalProfile:false};
 }finally{await page.close();}
}
