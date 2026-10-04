# Alterações

## 0.3.1 — 03/10/2026
- Camuflagem de elementos-isca ampliada para `getClientRects()`, com índice, `item()` e iteração coerentes com as medidas locais.
- Frames em domínios de anúncios conhecidos carregam um documento vazio da extensão. Nenhum conteúdo ou recurso do anúncio é carregado; navegação principal, pausas e exceções preservadas.
- Substituto GPT com slots e serviços mantidos em memória, listas de slots, targeting, associação, destruição e mapas de tamanhos. Callbacks anteriores continuam mesmo após uma falha; APIs existentes são preservadas.
- Sem geração de cliques, impressões, eventos de exibição ou requisições de publicidade.
- Removido `AGENTS.md` a pedido do usuário.
- Validação: dez testes automatizados e vinte e cinco verificações de integração no Comet, incluindo frames sem acesso ao servidor de anúncios, exceções, API GPT local, migração, coexistência, pausa e recuperação de erros.

## 0.3.0 — 03/10/2026
- Camuflagem geral (`shield.js`): elementos-isca ocultados por outros bloqueadores informam tamanho/visibilidade de elemento visível; testes `fetch`/XHR a scripts de anúncio conhecidos recebem resposta local vazia. Também em frames; funções alteradas respondem como nativas.
- Substitutos locais inertes em `stubs/` (AdSense, GPT, `ad_status.js`, pixel, script vazio, flags) via redirecionamento declarativo, com prioridade abaixo das exceções das listas e das pausas do AdVeil. Só com bloqueio de anúncios ligado.
- Limpeza visual passou de `<style>` injetado para folha de estilo da extensão (`cosmetic.css`), sem nó no DOM.
- Nova opção por site **Desligar camuflagem**; configuração schema 3 (migra a 0.2.0 sem perda; backups da versão 2 continuam importáveis).
- Scripts registrados por versões anteriores são substituídos ao atualizar.
- Popup: os interruptores agora aplicam na hora (antes exigiam "Salvar e recarregar", e parecia que ligar não fazia nada).
- Isca com texto em branco/`&nbsp;` passa a ser reconhecida; sondagem de imagem em `/favicon.ico` de hosts de anúncio recebe um ícone local 16x16 (um pixel 1x1 seria denunciado por alguns sites).
- Pacote do site `steamverde.net`: bloqueia terceiros que o próprio site chama (exceto uma lista de serviços necessários), para acompanhar redes de anúncio que trocam de domínio, e neutraliza `sys-analytics.js`. Respeita a pausa por site.
- Testes: oito de configuração/migração e vinte e dois de navegador (Comet) mais `npm run test:live` opcional.

## 0.2.0 — 03/10/2026
- Bloqueio próprio declarativo com EasyList, EasyPrivacy opcional e AdGuard Spanish/Portuguese.
- Perfis, exceções por domínio, filtros personalizados e configuração validada com recuperação após falha.
- Backup JSON, contador nativo de ações, nova logo e página de configurações.
- Módulos de compatibilidade separados e limpeza visual opcional.
- Quatro testes de configuração/proveniência e doze verificações no navegador.
- GPL-3.0-or-later e atribuições dos dados externos.

## 0.1.1
- Nome AdVeil e reorganização da pasta e do repositório.

## 0.1.0
- Adaptação do teste do MixuMenu/InvestCentro e das bibliotecas BlockAdBlock/FuckAdBlock.
