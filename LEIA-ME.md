# AdVeil 0.1.1

Extensão experimental Manifest V3 para Comet/Chromium. Cobertura parcial, sem garantia de invisibilidade universal.

## O que faz
- Adapta os callbacks das bibliotecas BlockAdBlock e FuckAdBlock.
- Em mixumenu.com e investcentro.com (e subdomínios), responde localmente apenas ao teste GET https://www.popads.net/js/adblock.js. A correção foi baseada no código público da etapa intermediária vinculada ao Animes Digital em 03/10/2026.
- Mantém a contagem e o carregamento normal do player. Não faz solicitações ou cliques de publicidade, não gera impressões e não altera requisições de vídeo.
- Oferece ativação geral e exceções por domínio. A configuração se aplica após recarregar; outras abas já abertas também precisam de recarga. Cada iframe segue a configuração do próprio domínio.

## Instalação local
1. No Comet, abra chrome://extensions.
2. Ative Modo do desenvolvedor e selecione Carregar sem compactação.
3. Selecione esta pasta, que contém manifest.json.
4. Recarregue a página afetada. No menu Extensões, abra AdVeil para ajustar.

Mantenha esta pasta no mesmo lugar enquanto usar a extensão. Para atualizar arquivos, clique Recarregar no cartão da extensão. Para remover, use Remover nesse cartão.

## Permissões e limites
O acesso a páginas HTTP/HTTPS permite atuar antes dos detectores. storage guarda somente preferências localmente; scripting registra o código; activeTab permite configurar e recarregar a aba escolhida. Não há coleta de histórico, cookies, senhas ou telemetria nem servidor externo da extensão.

Sites podem detectar outras diferenças, usar testes no servidor ou alterar os scripts. Esta versão não modifica testes arbitrários de rede, dimensões de elementos ou todos os detectores existentes. Um player pode ter problemas independentes de anúncios. Se uma página quebrar, desative a extensão naquele domínio.
