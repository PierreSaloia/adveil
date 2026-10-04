<p align="center"><img src="assets/icon-128.png" width="96" alt="Logo AdVeil"></p>
<h1 align="center">AdVeil</h1>
<p align="center">Menos anúncios. Mais controle.</p>

**Versão 0.3.1.** Bloqueador de anúncios Manifest V3 para Comet/Chromium, com camuflagem contra detectores conhecidos, rastreadores opcionais e configurações por domínio.

> A cobertura é parcial: não existe garantia de invisibilidade universal. O AdVeil protege somente o navegador onde está instalado.

## O que mudou

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
5. Recarregue as páginas abertas. A nova versão adiciona a permissão de bloqueio de rede; o navegador pode solicitar revisão das permissões.
6. Abra AdVeil no menu de extensões e clique em **Todas as configurações**.

Requer Chromium 120 ou mais recente. A compatibilidade de execução foi testada no Comet. Não há atualização automática da instalação local nem das listas.

## Perfis

| Perfil | Anúncios + regional | Rastreadores | Compatibilidade | Camuflagem | Limpeza visual |
| --- | --- | --- | --- | --- | --- |
| Equilibrado, padrão | Sim | Não | Sim | Sim | Não |
| Reforçado | Sim | Sim | Sim | Sim | Sim |
| Complemento | Não | Não | Sim | Sim (sem redirecionamentos) | Não |

Os perfis preservam exceções e filtros personalizados. No modo Complemento, filtros personalizados que você tiver criado continuam ativos; remova-os se quiser deixar todo o bloqueio de rede com outra extensão.

## Convivência com outros bloqueadores

O AdVeil não gerencia extensões e não altera o bloqueador nativo do Comet. As permissões de recursos e pausas valem somente para o AdVeil: não liberam algo que outra extensão tenha bloqueado. Foi testada a coexistência com uma segunda extensão declarativa independente.

Isso não garante ausência de conflitos com todos os bloqueadores. Dois filtros podem afetar a mesma página. Para diagnosticar uma falha, pause o AdVeil nesse site; use Complemento quando quiser manter apenas suas correções de compatibilidade.

## Camuflagem contra detecção (0.3.1)

Os sites percebem um bloqueador pelos **efeitos**: um script de anúncio que não carrega, um elemento-isca que fica oculto, uma variável que não aparece. A camuflagem responde a esses testes **localmente**, sem contatar servidores de anúncios.

- **Elementos-isca.** Um elemento vazio com classe/id típico de isca (`adsbox`, `ad-banner`, `pub_300x250`, `text-ad` etc.) que outro bloqueador ocultou passa a informar tamanho, `display` e `offsetParent` de elemento visível. Elementos com conteúdo e elementos comuns continuam verdadeiros. As funções alteradas respondem como nativas a `toString()`.
- **Testes de requisição.** `fetch`/XHR GET ou HEAD para scripts de anúncio conhecidos (AdSense, GPT, `ad_status.js`, PopAds, e nomes-isca como `ads.js`) recebem resposta local vazia, sem requisição de rede. Outros métodos, domínios e cancelamentos mantêm o comportamento nativo.
- **Substitutos locais inertes** (somente com o bloqueio de anúncios ligado): scripts, pixels e frames de uma lista curta de domínios de anúncio são redirecionados a arquivos da própria extensão em `stubs/`. O carregamento “dá certo”, a API de AdSense/GPT existe e executa a fila de callbacks, mas nenhum anúncio é solicitado ou exibido. Frames recebem um documento vazio sem scripts ou recursos externos; a navegação principal não é redirecionada. Isso depende de `declarativeNetRequest` e as exceções do AdVeil continuam valendo.
- **Geometria e API coerentes.** `getClientRects()` acompanha as medidas dos elementos-isca, incluindo índice, `item()` e iteração. O substituto GPT mantém slots, serviços, targeting e mapas de tamanhos apenas em memória, para evitar erros em páginas que usam esses retornos. Não emite eventos de requisição, exibição ou impressão. Métodos foram ajustados consultando a [referência oficial GPT](https://developers.google.com/publisher-tag/reference); o substituto implementa somente um subconjunto da API.
- **Limpeza visual sem rastro.** A camada opcional agora é uma folha de estilo da extensão: não há nó `<style>` no documento.
- Correção MixuMenu / InvestCentro e adaptação de BlockAdBlock/FuckAdBlock continuam disponíveis.
- Tudo pode ser desligado globalmente ou por domínio (**Desligar camuflagem**). A camuflagem de JavaScript também atua em frames; o modo **Complemento** a mantém, mas não instala redirecionamentos.

Limites: não simula cliques, impressões ou conteúdo de anúncios; não falsifica respostas de ad servers além do teste vazio; não faz nada contra verificações no servidor, contra anúncios inseridos no próprio vídeo ou contra testes novos que ainda não conhecemos. Uma regra mais ampla pode quebrar um site: pause o AdVeil ali para diagnosticar. Não há garantia de invisibilidade em todos os sites.

## Pacotes por site

Para sites cujos anúncios vêm de domínios que mudam o tempo todo, `settings.js` (`SITE_PACKS`) define regras só para as requisições feitas pelo próprio site. Hoje: `steamverde.net` — bloqueia terceiros, exceto serviços necessários (fontes, Discord, Sucuri, Cloudflare, Google Analytics/Tag Manager, YouTube etc.), e neutraliza o `sys-analytics.js`. Se algo deixar de funcionar nesse site, pause o AdVeil nele. O pacote só vale com o bloqueio de anúncios ligado.

## Configurações e exceções

Informe domínios sem esquema, caminho ou curingas, um por linha. Subdomínios estão incluídos. Até 200 entradas por lista.

- **Pausar todo o AdVeil:** desliga as próprias regras para aquele site e seus frames, após recarregar.
- **Desligar compatibilidade / limpeza visual:** mantém as outras camadas.
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

Validação da 0.3.1: dez testes de configurações, migração, proveniência e substitutos e vinte e cinco verificações de integração no Comet. Cobrem bloqueio real contra servidor local, listas, coexistência, pausas, migração da 0.2.0, elementos-isca e `getClientRects`, testes de requisição, substitutos locais, frames sem acesso ao servidor de anúncios, exceções de camuflagem, API GPT sem eventos publicitários, ausência de folha de estilo na página, callbacks, cancelamento, backup e rollback de falha simulada. Não comprovam reprodução de todos os players nem compatibilidade universal.

A pasta principal deste projeto é `C:\Projetos Desenvolvidos\Extensões\AdVeil`. As atualizações locais são feitas nela.
