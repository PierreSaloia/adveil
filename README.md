# Comet Compat

Extensão experimental para Comet e navegadores Chromium, com adaptações para alguns detectores de bloqueadores de anúncios e controle por domínio.

**Versão 0.1.0 — cobertura parcial. Não garante que o bloqueador fique invisível em todos os sites.**

## Recursos

- Compatibilidade com a interface de callbacks de BlockAdBlock e FuckAdBlock.
- Correção específica para MixuMenu e InvestCentro: responde localmente ao teste GET de `https://www.popads.net/js/adblock.js` nesses domínios e subdomínios.
- Ativação geral e exceções por domínio pelo botão da extensão.
- Preferências armazenadas localmente, sem telemetria ou servidor da extensão.

O teste específico foi identificado na etapa intermediária vinculada ao player do Animes Digital em 3 de outubro de 2026. A extensão mantém a contagem normal da página e não faz cliques nem solicitações de anúncios. Não altera requisições de vídeo.

## Instalação no Comet

1. Neste repositório, escolha **Code → Download ZIP** e extraia o arquivo em uma pasta permanente.
2. Abra `chrome://extensions` no Comet.
3. Ative **Modo do desenvolvedor**.
4. Clique em **Carregar sem compactação** e selecione a pasta que contém `manifest.json`.
5. Recarregue a página afetada. Abra **Comet Compat** pelo menu de extensões para ajustar as opções.

Mantenha a pasta no mesmo lugar enquanto usar a extensão. Instalar esta versão não substitui nem configura automaticamente o bloqueador de anúncios do navegador.

## Uso e atualização

Use **Ativar neste domínio** para permitir ou desativar a extensão no site aberto, e **Salvar e recarregar** para aplicar. Outras abas abertas também precisam ser recarregadas. Cada documento, incluindo players em iframes, segue a configuração de seu próprio domínio.

Para atualizar, substitua os arquivos na pasta instalada e clique em **Recarregar** no cartão da extensão em `chrome://extensions`. Para desinstalar, use **Remover** nesse cartão.

## Permissões e privacidade

| Permissão | Finalidade |
| --- | --- |
| Acesso a páginas HTTP e HTTPS | Aplicar adaptações no início do carregamento, antes dos detectores conhecidos. |
| `scripting` | Registrar e atualizar os scripts de compatibilidade. |
| `storage` | Guardar as preferências e os domínios desativados neste computador. |
| `activeTab` | Configurar o domínio da aba escolhida e recarregá-la. |

O código não coleta histórico, cookies, senhas ou dados de formulários e não transmite preferências. Não contém código remoto.

## Limites e validação

Sites podem usar outros testes, verificações no servidor ou mudar o código. Um player também pode falhar por motivos independentes dos anúncios. Se uma página apresentar problemas, desative a extensão naquele domínio.

A versão inicial foi testada em um perfil isolado do Comet, incluindo registro dos scripts, exceções por domínio, desativação geral, callbacks e preservação de requisições não relacionadas. Em uma reprodução local do HTML público do gateway, o aviso apareceu sem a extensão e o iframe do player foi criado após a contagem com a extensão ativa e as requisições de anúncios bloqueadas. Isso não comprova reprodução de vídeo nem funcionamento em todos os sites.

## Arquivos

- `manifest.json`: configuração e permissões Manifest V3.
- `background.js`: registro dos scripts e aplicação das preferências.
- `compat.js`: adaptações executadas nas páginas.
- `popup.html`, `popup.css`, `popup.js`: controles da extensão.
- `LEIA-ME.md`: guia resumido em português.

Ao relatar um problema, informe o domínio, a versão do Comet e o texto do aviso. Remova tokens, dados pessoais e parâmetros privados dos endereços antes de publicá-los.
