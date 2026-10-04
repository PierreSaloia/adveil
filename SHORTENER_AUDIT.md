# Teste dos encurtadores — 4 de outubro de 2026

Foram visitados os **31 links fornecidos**, em perfis separados do Comet, com e sem o AdVeil. Depois da comparação inicial, foram repetidos os casos de detecção corrigidos e percorridos os controles de continuação identificados. Na atualização **0.4.1**, BCVC, SafelinkU, DropLink e EZ4Short foram investigados novamente com o bloqueador nativo do Comet explicitamente ligado, conforme a configuração informada pelo usuário. Exe.io também avançou sem aviso de adblock até a validação humana pendente. No Cuty, a primeira etapa avançou, mas uma repetição mostrou novamente o aviso de adblock na etapa de CAPTCHA; a compatibilidade permanece parcial.

**Seis destinos finais foram confirmados.** Os demais exemplos terminaram em links removidos, domínio estacionado, CAPTCHA, tarefas ou etapas cujo servidor não entregou o destino correto durante o teste. Um HTTP 200, uma página intermediária ou uma URL citada em outro catálogo não contam como resolução.

## Destinos confirmados

| Serviço | Entrada | Destino confirmado | Resultado |
| --- | --- | --- | --- |
| ICutLink | [icutlink.com/rcfkldu](https://icutlink.com/rcfkldu) | [Google](https://www.google.com/) | Redirecionamento HTTP normal, com e sem a extensão. |
| AdFoc.us | [adfoc.us/x1](http://adfoc.us/x1) | [Google](https://www.google.com/?gws_rd=ssl) | O AdVeil encontrou o link real de continuação na página e navegou diretamente. |
| Smoner | [smoner.com/G97PFz](https://smoner.com/G97PFz) | [YouTube: JoR2jqxnSTk](https://www.youtube.com/watch?v=JoR2jqxnSTk) | Percorridas as etapas até a resposta final do serviço. O YouTube informa que o vídeo não está mais disponível. |
| BCVC | [bc.vc/R4a9Ehl](https://bc.vc/R4a9Ehl) | [Artigo do MyNetFreedom](https://mynetfreedom.com/make-money-with-file-sharing) | Área de continuação restaurada; botão normal clicado após o contador. A API `/ln.php` confirmou a URL. Resultado repetido com e sem AdVeil, com bloqueador nativo do Comet ligado. |
| SafelinkU | [sfl.gl/18PZXXI9](https://sfl.gl/18PZXXI9) | [Google](https://www.google.com/) | O fluxo próprio confirmou `/api/verify` e `/api/go`. Na etapa `/ready/go`, o endereço literal do botão OPEN LINK foi extraído sem executar o script. Avanço automático confirmado com bloqueador nativo do Comet ligado. |
| DropLink | [droplink.co/32vaVK](https://droplink.co/32vaVK) | [Compartilhamento TeraBox](https://www.1024tera.com/portuguese/sharing/link?surl=dhmxvAB81nGUCrIMIsN1lA) | Etapas tech8s.net/game5s.com percorridas mantendo o código original. A API do serviço liberou `freeterabox.com/s/1dhmxvAB81nGUCrIMIsN1lA`, que redirecionou à página de compartilhamento. Nenhum arquivo baixado. |

## Resultado de todos os exemplos

| Serviço | Link testado | Resultado observado |
| --- | --- | --- |
| Linkvertise | [1258318/Vr7ey6u4J0zZ](https://linkvertise.com/1258318/Vr7ey6u4J0zZ) | A própria página informa que a publicação foi removida. O mesmo ocorre sem AdVeil. |
| ShrinkMe | [dLG2iDSz](https://shrinkme.vip/dLG2iDSz) | Domínio estacionado pela ParkLogic, com e sem AdVeil. Não é uma sequência ativa de encurtador. |
| Ouo | [o4Fbxg](https://ouo.io/o4Fbxg) | Verificação Cloudflare / HTTP 403 nos dois perfis. Destino não obtido. |
| Exe.io | [vkRI1](https://exe.io/vkRI1) | Redireciona a exeygo.com. Aviso de adblock corrigido; o botão Continue avança para Turnstile. Destino depende dessa validação. |
| ShrinkEarn | [jJ98lzwdXHr](https://ckk.ai/jJ98lzwdXHr) | Redireciona a srnky.com e retorna 404 nos dois perfis. |
| GPLinks | [YVTC](https://gplinks.co/YVTC) | Seguido o link gratuito “Continue with ads”, sem pagamento. Chegou a fakepe.com/blog/, sem destino final identificado. |
| Cuty | [AfaX6jx](https://cuty.io/AfaX6jx) | Redireciona a cuttty.com. A correção da primeira etapa permite Continue chegar à verificação “I am not a robot”. Uma repetição com o bloqueador nativo ligado apresentou “Please disable Adblock to continue” nessa segunda etapa, mesmo com a opção local de adblock permitida. Destino não confirmado; compatibilidade parcial. |
| Work.ink | [22/test](https://work.ink/22/test) | HTTP 403 e desafio de verificação humana nos dois perfis. |
| LootLabs | [s?qo0f](https://loot-link.com/s?qo0f) | Chegou a links.lootlabs.gg: “Redirect API test”. Tarefas/verificação humana e CLAIM REWARD desabilitado. Destino não liberado. |
| Lockr | [u97pzgra](https://lockr.net/u97pzgra) | HTTP 200, mas o conteúdo de desbloqueio não terminou de carregar nos dois perfis. Nenhum destino confirmado. |
| ShrtFly | [tHyM](https://stfly.me/tHyM) | 404; a página informa que o link não está mais disponível. |
| AdShrink | [5AP7F3](https://adshrink.it/5AP7F3) | 404 nos dois perfis. |
| Smoner | [G97PFz](https://smoner.com/G97PFz) | **Resolvido para o YouTube**, conforme tabela acima. Corrigida a detecção que comparava `XHR.responseURL`. |
| SafelinkU | [18PZXXI9](https://sfl.gl/18PZXXI9) | **Resolvido automaticamente para o Google**, com bloqueador nativo do Comet ligado. O estado de verificação agora é aguardado e a etapa final publicada é reconhecida. |
| AdFoc.us | [x1](http://adfoc.us/x1) | **Resolvido diretamente para o Google**, conforme tabela acima. |
| FC.LC | [r96ocR](https://fc-lc.com/r96ocR) | 404 nos dois perfis. |
| DropLink | [32vaVK](https://droplink.co/32vaVK) | **Resolvido automaticamente para o compartilhamento TeraBox**, conforme tabela acima, com bloqueador nativo do Comet ligado. A primeira resposta antecipada foi recusada; a liberação do controle permitiu uma nova tentativa bem-sucedida. |
| CutWin | [mP4X4s4G](https://cutwin.com/mP4X4s4G) | Chegou a masrawytrend.com e pediu CAPTCHA. Destino não confirmado. |
| Link4M | [eRyHM](https://link4m.com/eRyHM) | Verificação Cloudflare / HTTP 403 nos dois perfis. |
| PaySkip | [Q9p](https://payskip.org/Q9p) | 404 nos dois perfis. |
| MitLy | [7Lmsr](https://mitly.us/7Lmsr) | 404 nos dois perfis. |
| V2Links | [BqBMXs](https://v2links.com/BqBMXs) | Redireciona a v2links.me e retorna 404 nos dois perfis. |
| ShrinkBixby | [CBygg8fn2s3](https://aii.sh/CBygg8fn2s3) | Turnstile e Continue desabilitado nos dois perfis; o campo token não revelou uma URL final pública. |
| BCVC | [R4a9Ehl](https://bc.vc/R4a9Ehl) | **Resolvido para o artigo MyNetFreedom**, conforme tabela acima. Restaurada a parte funcional de prebid-ads.js: área principal, marcador inerte e retirada de “Please wait...”. Contador e autorização originais preservados. |
| LinksFire | [6KC0](https://linksfire.co/6KC0) | Chegou a tech.techssoftwares.com e encontrou reCAPTCHA. Não confundido com o destino final. |
| AdShort | [REHTq](https://adshort.co/REHTq) | Chegou a techgeek.digital. O botão CLICK HERE TO CONTINUE avançou para CAPTCHA obrigatório. |
| ShortyEarn | [r6LemL](https://shortyearn.com/r6LemL) | 404 nos dois perfis. |
| Pahe+ | [ulGPTtZ](https://pahe.plus/ulGPTtZ) | CAPTCHA com botão de continuação desabilitado nos dois perfis. |
| EZ4Short | [qSyPzeo](https://ez4short.com/qSyPzeo) | **Destino correto não confirmado.** A página intermediária chegou a publicar o código `32vaVK` de DropLink, diferente de `qSyPzeo`. O destino desse outro código foi descartado. A versão final interrompe avanço automático com código substituído; outro reteste permaneceu no carregamento de tech8s.net/Google. |
| ICutLink | [rcfkldu](https://icutlink.com/rcfkldu) | **Resolvido para o Google** nos dois perfis. |
| LinkJust | [bNJZJspWM](https://linkjust.com/bNJZJspWM) | Verificação Cloudflare / HTTP 403 nos dois perfis. |

## Melhorias implementadas e limites do teste

- Bloqueio de aberturas automáticas por scripts, links e formulários; fechamento de abas publicitárias conhecidas e de abas vazias que depois recebem um anúncio.
- Destinos explícitos em URLs reconhecidas e extração dos destinos publicados por AdFoc.us/SafelinkU. Formulários finais `go-link` preservam os campos e aceitam somente sucesso do servidor; nova resposta de CAPTCHA, dados renovados ou liberação do controle permitem nova tentativa, sem repetição para estado idêntico.
- Retomada de formulários de CAPTCHA conhecidos após a resposta real e a habilitação do botão pelo próprio site, incluindo atualização de `.value` sem evento, campos personalizados e renovação. Sem respostas falsas ou alteração de controles desabilitados.
- Restauração local da área funcional do BCVC e avanço das etapas publicadas de DropLink, com código original e limite de repetições por aba.
- Compatibilidade com as opções de adblock do cliente AdLinkFly e do Cuty. CAPTCHAs, dados assinados e configurações de validação permanecem intactos.
- Respostas locais de teste com comprimento coerente e URL original; testes de visibilidade e imagem mascarados mesmo com uma segunda extensão bloqueadora independente.

Validação final da extensão: **16 testes unitários e 60 verificações do navegador aprovados**. Esses testes incluem exceções, modos desligados, preservação de formulários de login, campos assinados, CAPTCHA pendente/renovado, configuração não substituível do Comet, códigos divergentes, repetição de etapas e rejeição de destinos inválidos.

Os perfis de teste não usam a conta, cookies, senhas ou extensões pessoais do usuário. A comparação inicial mede AdVeil ativo/ausente. A convivência controlada usa uma extensão de teste; os fluxos pendentes foram repetidos com o bloqueador nativo real do Comet ligado pela tela `chrome://settings/adBlock` no perfil isolado. Foram observadas requisições publicitárias realmente bloqueadas pelo Comet no perfil sem AdVeil. A suíte controlada desliga esse bloqueador somente no perfil descartável para separar seus resultados dos substitutos do AdVeil.

As novas abas emitidas durante a auditoria são registradas e fechadas pelo próprio teste; sua contagem não prova, sozinha, que o AdVeil bloqueou todas elas. Esse comportamento é validado separadamente na suíte de navegador. Os testes externos passaram a registrar respostas dos endpoints de continuação sem copiar os campos de autorização nos resumos, e são sequenciais: visitas simultâneas ao mesmo serviço podem trocar o cookie CSRF e gerar um falso erro de compatibilidade.

A passagem pelo DropLink não comprova invisibilidade: o servidor liberou a URL com a mensagem “Go without Earn because Adblock”. O destino foi confirmado, mas esse detector continua percebendo o bloqueio nesse ambiente. O Cuty também apresentou detecção posterior à primeira etapa em uma repetição; alterar sua opção local não garante a liberação da etapa seguinte. Não há evidência de ocultação universal do bloqueador nativo ou de todas as outras extensões.

Não foram baixados arquivos, compradas assinaturas ou forjadas impressões, cliques publicitários, códigos de resgate ou respostas de CAPTCHA. URLs finais descritas em fontes externas não foram usadas como substituto de uma resolução real nem gravadas no código como atalhos fixos.

Resultados são específicos destes links, deste ambiente e desta data. Não garantem passagem por todos os links de cada serviço ou invisibilidade universal. Os detalhes brutos locais, HTML e capturas ficam na pasta ignorada `work/shortener-audit/`; a lista pública de entradas está em `tests/shortener-targets.json`.

## Reproduzir

Com Node e Playwright instalados, defina `ADVEIL_BROWSER` com o caminho do seu Chromium/Comet ou instale o Chromium do Playwright. Execute `npm run test:shorteners`; modos começando com `ADVEIL_AUDIT_MODE=baseline` fazem a comparação sem a extensão. `ADVEIL_COMET_BLOCKER=on` liga e verifica o bloqueador nativo somente no perfil isolado, `off` o desliga ali. `ADVEIL_WALK=1` percorre controles inspecionados, recusando códigos divergentes. `ADVEIL_HEADED=1` permite observar o navegador de teste. É possível passar nomes de serviços como argumentos para repetir só um caso.

A auditoria usa um túnel local sem registro para resolver o DNS pelo sistema, sem interceptar TLS nem alterar o perfil pessoal. Cada visita tem limite de tempo e os resultados ficam em `work/`. Para verificar somente as funções da extensão com cenários controlados, use `npm test` e `npm run test:browser`.
