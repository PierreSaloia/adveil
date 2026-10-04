<p align="center"><img src="assets/icon-128.png" width="96" alt="Logo AdVeil"></p>
<h1 align="center">AdVeil</h1>
<p align="center">Menos anúncios. Mais controle.</p>

**Versão 0.4.1.** Bloqueador de anúncios Manifest V3 para Comet/Chromium, com proteção contra abas de anúncios, atalhos de encurtadores, camuflagem contra detectores conhecidos e configurações por domínio.

> A cobertura é parcial: não existe garantia de invisibilidade universal. O AdVeil protege somente o navegador onde está instalado.

## O que mudou

- Proteção contra `window.open`, links e formulários que tentam abrir abas sem uma ação real. Um clique em conteúdo comum não autoriza um pop-under; um botão pode abrir uma janela e links preservam o destino clicado.
- Fechamento de novas abas que apontam para domínios publicitários conhecidos, incluindo aberturas feitas por APIs que escapem da proteção da página. Essa camada pode fechar a aba depois de ela aparecer brevemente; não bloqueia toda navegação externa nem todos os domínios rotativos.
- Atalhos para URLs de encurtadores com destino explícito, inclusive percent-encoding, Base64 e encadeamentos limitados. Links sem destino local conhecido seguem o comportamento do serviço.
- Destinos publicados pelo AdFoc.us e SafelinkU e respostas de formulários finais assinados: segue somente a URL publicada pelo serviço ou liberada pelo próprio servidor.
- Retomada após CAPTCHA real, incluindo respostas preenchidas sem evento, campos personalizados e renovação de tokens. Preserva os dados assinados e espera o próprio site habilitar a continuação.
- Correções de compatibilidade no Exe.io, SafelinkU, Smoner, DropLink, BCVC e na primeira etapa do Cuty, incluindo a configuração já alterada pelo bloqueador nativo do Comet. O Cuty ainda apresentou detecção na etapa seguinte, e o DropLink liberou o destino informando que percebeu o bloqueio. A [auditoria dos 31 exemplos reais](SHORTENER_AUDIT.md) registra os destinos confirmados e os bloqueios restantes.
- Etapas publicadas em tech8s.net/game5s.com avançam sem abrir tarefas de anúncios, somente quando mantêm o código original. Códigos substituídos e sequências repetidas interrompem o avanço automático.
- Camuflagem de `checkVisibility()` em elementos-isca e de testes por imagem criados com `setAttribute('src', ...)`, inclusive com outro bloqueador ativo.
- Controles globais e por site para as novas camadas; migração automática e importação de backups das versões 2, 3 e 4.
- Bloqueio próprio de rede pelo mecanismo declarativo do navegador.
- **13.605 regras disponíveis:** 3.702 EasyList, 9.006 EasyPrivacy e 897 AdGuard Spanish/Portuguese. Os números incluem bloqueios e exceções de compatibilidade.
- Perfis **Equilibrado**, **Reforçado** e **Complemento**.
- Pausa por site, exceções de compatibilidade e limpeza visual.
- Domínios personalizados de bloqueio e permissão.
- Backup JSON, validação de importações e recuperação de configuração após falha.
- Logo, ícones, painel de configurações e contador de ações no ícone.

## Instalar ou atualizar no Comet

1. Baixe o ZIP da versão ou use **Code → Download ZIP** e extraia em uma pasta permanente.
2. Abra `chrome://extensions` no Comet e ative **Modo do desenvolvedor**.
3. Em **Carregar sem compactação**, escolha a pasta que contém `manifest.json`.
4. Para atualizar uma instalação existente, mantenha a mesma pasta e clique em **Recarregar** no cartão AdVeil.
5. Recarregue as páginas abertas. As versões 0.4 adicionam a permissão `webNavigation` para identificar a origem de novas abas de anúncios; o navegador pode solicitar revisão das permissões.
6. Abra AdVeil no menu de extensões e clique em **Todas as configurações**.

Requer Chromium 120 ou mais recente. A compatibilidade de execução foi testada no Comet. Não há atualização automática da instalação local nem das listas.

## Perfis

| Perfil | Anúncios + regional | Rastreadores | Compatibilidade | Camuflagem | Limpeza visual |
| --- | --- | --- | --- | --- | --- |
| Equilibrado, padrão | Sim | Não | Sim | Sim | Não |
| Reforçado | Sim | Sim | Sim | Sim | Sim |
| Complemento | Não | Não | Sim | Sim (sem redirecionamentos) | Não |

Os perfis preservam exceções e filtros personalizados. No modo Complemento, filtros personalizados que você tiver criado continuam ativos; remova-os se quiser deixar todo o bloqueio de rede com outra extensão.

Todos os perfis ativam a proteção contra novas abas e os atalhos de encurtadores. As duas funções também podem ser desligadas individualmente, sem desligar a camuflagem.

## Abas automáticas e encurtadores

A proteção da página roda desde o início do documento, também em frames compatíveis e frames locais `about:blank`. Bloqueia janelas sem uma ativação real recente de um controle, links sintéticos com novo alvo e submissões automáticas de formulários que abririam uma aba. Mantém navegação na mesma página, cliques normais, callbacks rápidos de login e formulários acionados pelo usuário. Sites que abrem uma janela depois de uma operação demorada, controles personalizados ou fluxos com várias janelas podem precisar de uma exceção em **Permitir novas janelas nestes sites**.

A camada do navegador verifica a aba de origem antes de fechar uma nova aba de domínio publicitário conhecido. Também acompanha por até 15 segundos uma aba inicialmente vazia, caso ela seja direcionada depois para anúncios; encerra esse acompanhamento quando conteúdo HTTP/HTTPS se confirma. Guarda essa relação apenas em memória, com limite de 256 entradas. Respeita a pausa global, a pausa por site, as exceções de novas janelas e a lista de domínios permitidos. Não fecha abas já existentes ou abertas manualmente na barra de endereços. Essa proteção cobre uma lista limitada de domínios: anúncios de origens desconhecidas que imitam um botão legítimo ainda podem escapar.

Os scripts dentro de frames seguem as exceções do domínio do próprio frame. Em conteúdo incorporado de outro domínio, pode ser necessário adicionar também esse domínio à exceção; a pausa da página principal não se estende automaticamente a esses scripts. A camada de fechamento de abas verifica tanto a origem principal quanto o frame de origem.

Os atalhos reconhecem os domínios compartilhados de Bitly/bit.ly, Rebrandly/rebrand.ly, Short.io/short.gy, BL.INK, Cuttly/cutt.ly, TinyURL, T2M, Sniply/snip.ly, Dub/dub.sh, Linkly e Encurtador.com.br, além de Technons e dos 31 serviços da auditoria, com alguns domínios intermediários observados. Isso é reconhecimento de URLs com parâmetros de destino, não integração com as APIs ou garantia de acesso a todos os links desses serviços. Domínios personalizados desses serviços não entram automaticamente no reconhecimento.

Quando uma URL reconhecida contém um único destino HTTP/HTTPS válido em `url`, `u`, `destination`, `dest`, `target`, `redirect`, `redirect_url`, `link` ou `to`, o AdVeil remove a etapa intermediária. Também corrige links inseridos dinamicamente, preservando o clique normal. Rejeita destinos ambíguos, credenciais na URL, outros esquemas e páginas de conta/login. Não usa serviços externos para descobrir o destino e não cria histórico adicional do link resolvido.

No AdFoc.us, segue o destino publicado no link de continuação. Na página final `/ready/go` do SafelinkU, reconhece apenas o endereço literal associado ao botão OPEN LINK, sem executar o código da página. Em páginas reconhecidas com formulário final `go-link` e ação `/links/go`, preserva os campos assinados e consulta o próprio servidor. Se ele liberar um destino válido, segue diretamente; se houver CAPTCHA pendente, erro ou recusa, mantém a página e o controle original. Uma resposta real renovada ou a liberação do botão permite uma nova tentativa; estados idênticos não geram requisições repetidas.

Os formulários de CAPTCHA observados em Exe.io, Cuty, Smoner e Pahe+ retomam a submissão normal somente após a resposta real e a habilitação do botão. O SafelinkU também avança seus controles prontos; códigos de acesso e desafios personalizados continuam aguardando o usuário. [Turnstile](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/widget-configurations/) e [hCaptcha](https://docs.hcaptcha.com/) validam a resposta no servidor: essa retomada não fabrica respostas nem garante a aprovação do desafio.

Nas etapas publicadas de DropLink em tech8s.net/game5s.com, preserva a submissão do formulário e segue os links de continuação da própria página, verificando o código original e limitando repetições. O BCVC recebe a restauração local da sua área de continuação, sem alterar o contador ou seu pedido de autorização. Nenhum destino dos exemplos é gravado no código. As adaptações de política de adblock do cliente dependem de **Camuflagem** e **Atalhos de encurtadores**, e respeitam suas exceções.

Um código como `bit.ly/abc123` não contém o destino: o navegador segue o redirecionamento HTTP normal. CAPTCHAs, senhas, links expirados, tokens, pagamentos e etapas geradas/validadas no servidor continuam dependendo do serviço. Não há bypass universal. O artigo Technons fornecido foi acessível, mas não expôs a sequência do encurtador nesse acesso. A auditoria confirmou destinos finais no ICutLink, AdFoc.us e Smoner; os demais resultados, incluindo links removidos e incompatibilidades pendentes, estão no relatório.

## Convivência com outros bloqueadores

O AdVeil não gerencia extensões e não altera o bloqueador nativo do Comet. As permissões de recursos e pausas valem somente para o AdVeil: não liberam algo que outro bloqueador tenha bloqueado. Foi testada a coexistência com uma segunda extensão declarativa independente e foram repetidos os fluxos pendentes com o bloqueador nativo do Comet explicitamente ligado em um perfil isolado.

Isso não garante ausência de conflitos com todos os bloqueadores. Dois filtros podem afetar a mesma página. Para diagnosticar uma falha, pause o AdVeil nesse site; use Complemento quando quiser manter apenas suas correções de compatibilidade.

## Camuflagem contra detecção

Os sites percebem um bloqueador pelos **efeitos**: um script de anúncio que não carrega, um elemento-isca que fica oculto, uma variável que não aparece. A camuflagem responde a esses testes **localmente**, sem contatar servidores de anúncios.

- **Elementos-isca.** Um elemento vazio com classe/id típico de isca (`adsbox`, `ad-banner`, `pub_300x250`, `text-ad` etc.) que outro bloqueador ocultou passa a informar tamanho, `display` e `offsetParent` de elemento visível. Elementos com conteúdo e elementos comuns continuam verdadeiros. As funções alteradas respondem como nativas a `toString()`.
- **Testes de requisição.** `fetch`/XHR GET ou HEAD para scripts de anúncio conhecidos (AdSense, GPT, `ad_status.js`, PopAds, e nomes-isca como `ads.js`) recebem resposta local vazia, sem requisição de rede. A resposta informa a URL original e `fetch` recebe comprimento zero coerente com o corpo, atendendo os testes observados no Smoner e SafelinkU. Outros métodos, domínios e cancelamentos mantêm o comportamento nativo.
- **Substitutos locais inertes** (somente com o bloqueio de anúncios ligado): scripts, pixels e frames de uma lista curta de domínios de anúncio são redirecionados a arquivos da própria extensão em `stubs/`. O carregamento “dá certo”, a API de AdSense/GPT existe e executa a fila de callbacks, mas nenhum anúncio é solicitado ou exibido. Frames recebem um documento vazio sem scripts ou recursos externos; a navegação principal não é redirecionada. Isso depende de `declarativeNetRequest` e as exceções do AdVeil continuam valendo.
- **Geometria e API coerentes.** `getClientRects()` acompanha as medidas dos elementos-isca, incluindo índice, `item()` e iteração. O substituto GPT mantém slots, serviços, targeting e mapas de tamanhos apenas em memória, para evitar erros em páginas que usam esses retornos. Não emite eventos de requisição, exibição ou impressão. Métodos foram ajustados consultando a [referência oficial GPT](https://developers.google.com/publisher-tag/reference); o substituto implementa somente um subconjunto da API.
- **Limpeza visual sem rastro.** A camada opcional agora é uma folha de estilo da extensão: não há nó `<style>` no documento.
- **Novos testes locais.** `checkVisibility()` informa visibilidade para elementos-isca vazios ocultados por bloqueadores; elementos comuns e iscas com conteúdo preservam a resposta nativa. A imagem local de 16×16 também atende testes de favicon definidos por `setAttribute`, mantendo a URL original nas consultas comuns ao elemento.
- Correção MixuMenu / InvestCentro e adaptação de BlockAdBlock/FuckAdBlock continuam disponíveis.
- Tudo pode ser desligado globalmente ou por domínio (**Desligar camuflagem**). A camuflagem de JavaScript também atua em frames; o modo **Complemento** a mantém, mas não instala redirecionamentos.

Limites: não simula cliques, impressões ou conteúdo de anúncios; não falsifica respostas de ad servers além do teste vazio; não faz nada contra verificações no servidor, contra anúncios inseridos no próprio vídeo ou contra testes novos que ainda não conhecemos. Uma regra mais ampla pode quebrar um site: pause o AdVeil ali para diagnosticar. Não há garantia de invisibilidade em todos os sites.

## Pacotes por site

Para sites cujos anúncios vêm de domínios que mudam o tempo todo, `settings.js` (`SITE_PACKS`) define regras só para as requisições feitas pelo próprio site. Hoje: `steamverde.net` — bloqueia terceiros, exceto serviços necessários (fontes, Discord, Sucuri, Cloudflare, Google Analytics/Tag Manager, YouTube etc.), e neutraliza o `sys-analytics.js`. Se algo deixar de funcionar nesse site, pause o AdVeil nele. O pacote só vale com o bloqueio de anúncios ligado.

## Configurações e exceções

Informe domínios sem esquema, caminho ou curingas, um por linha. Subdomínios estão incluídos. Até 200 entradas por lista.

- **Pausar todo o AdVeil:** desliga as próprias regras para aquele site e seus frames, após recarregar.
- **Desligar compatibilidade / limpeza visual:** mantém as outras camadas.
- **Permitir novas janelas / desligar atalhos de encurtadores:** cria uma exceção somente para a camada escolhida; salve e recarregue.
- **Bloquear recursos de:** bloqueia sub-recursos desse domínio; não impede abrir o domínio como página principal.
- **Permitir recursos de:** sobrepõe os filtros do AdVeil, mas não os de outras extensões.
- **Contador no ícone:** ações de rede atribuídas pelo navegador ao AdVeil, não um contador total de todos os bloqueadores.

Exceções herdadas de um domínio principal são editadas no painel. Salve e recarregue abas abertas para aplicar todas as mudanças.

## Privacidade e permissões

Sem cadastro, telemetria, código remoto ou sincronização automática. As preferências ficam em `storage.local`, acessível somente a contextos confiáveis da extensão. O backup inclui os domínios cadastrados; não inclui histórico de navegação.

| Permissão | Uso |
| --- | --- |
| HTTP/HTTPS | Executar correções nas páginas autorizadas. |
| `declarativeNetRequest` | Bloquear recursos usando listas locais e exceções. |
| `scripting` | Registrar scripts por módulo e domínio. |
| `storage` | Guardar preferências localmente. |
| `activeTab` | Identificar e recarregar a aba escolhida. |
| `webNavigation` | Identificar a aba/frame que criou uma nova aba publicitária. Não grava histórico de navegação. |

## Listas e licença

As listas são um **subconjunto block/allow** dos JSON declarativos do uBlock Origin Lite. Não incluem os scriptlets, regras cosméticas, redirects, alterações de cabeçalho ou arquivos regex desse projeto. Créditos e licenças em [NOTICE.md](NOTICE.md) e [LICENSE](LICENSE). AdVeil é GPL-3.0-or-later e não tem afiliação com uBlock Origin ou AdGuard.

A revisão e os hashes estão em `rules/metadata.json`; os arquivos originais estão em `vendor/`. Atualizações de listas são manuais e revisadas: `npm run rules:update` reproduz a revisão fixada no script, sem executar código baixado.

## Desenvolvimento e testes

```text
npm ci
npm test
npx playwright install chromium
npm run test:browser
```

Para testar com um Comet já instalado, defina `ADVEIL_BROWSER` com o caminho do executável antes de `npm run test:browser`. Os testes usam perfis isolados em `work/` e não o perfil pessoal.

Os testes cobrem configurações, migração, hashes das listas, validação de destinos, substitutos, bloqueio real de rede, coexistência com outra extensão, pausas, elementos-isca, requisições, API GPT, backup e recuperação após falha. A suíte de navegador também verifica aberturas automáticas, cliques desviados, janelas de login, formulários, frames locais, o fechamento de abas publicitárias, atalhos de destinos explícitos e exceções. As URLs de encurtadores usadas nessa suíte são fixtures controladas: não comprovam a passagem por links reais de todos os serviços ou compatibilidade universal.

Validação desta atualização: **16 testes unitários e 60 verificações de navegador aprovadas**. A auditoria externa separada, com `npm run test:shorteners`, usa os 31 links reais e é descrita em [SHORTENER_AUDIT.md](SHORTENER_AUDIT.md). Seis destinos foram confirmados, incluindo os novos BCVC, SafelinkU e DropLink. Use `ADVEIL_AUDIT_MODE=baseline` para o perfil sem extensão, `ADVEIL_COMET_BLOCKER=on` para verificar o bloqueador nativo do Comet ligado no perfil isolado e `ADVEIL_WALK=1` para percorrer os controles inspecionados. A suíte controlada usa o bloqueador nativo desligado em seu próprio perfil descartável e uma segunda extensão de teste; isso mantém a verificação dos substitutos independente da atuação do Comet. Os resultados detalhados e capturas ficam em `work/shortener-audit/`, sem downloads de arquivos finais.

A pasta principal deste projeto é `C:\Projetos Desenvolvidos\Extensões\AdVeil`. As atualizações locais são feitas nela.
