# Créditos e licença

AdVeil 0.3.0 é distribuído sob GNU GPL versão 3 ou posterior. Veja LICENSE.

As regras de rede são um subconjunto das regras declarativas compiladas pelo projeto **uBlock Origin Lite**, de Raymond Hill e colaboradores, GPL-3.0, no repositório https://github.com/uBlockOrigin/uBOL-home. Não há afiliação ou endosso desses projetos ao AdVeil.

Fontes: **EasyList**, **EasyPrivacy** (EasyList authors, https://easylist.to/, licença GPL-3.0 selecionada dentre as opções da distribuição) e **AdGuard Spanish/Portuguese** (AdGuard Software Ltd. e colaboradores, https://github.com/AdguardTeam/AdguardFilters, GPL-3.0).

`rules/metadata.json` registra revisão, URL e SHA-256 de cada fonte. `vendor/` contém os JSON originais utilizados. `scripts/update-rules.mjs` contém a transformação: preservar regras block/allow e omitir redirect/modifyHeaders. Não são importados scriptlets, regras cosméticas ou regras regex de arquivos separados. Os números representam somente o subconjunto implementado, não a cobertura integral do uBO Lite.

`shield.js`, `compat.js`, `detectors.js` e os arquivos de `stubs/` são código original do AdVeil, escritos para este projeto; não contêm código copiado do uBlock Origin nem de suas bibliotecas de recursos. A camuflagem segue a ideia pública de responder localmente a testes de detecção, sem redistribuir arquivos de terceiros.

Marca e logo AdVeil: criadas para este projeto. Logo gerada com a ferramenta de imagens integrada. Prompt: A geométrico com fitas em turquesa, véu e olho em espaço negativo, sem texto, em fundo transparente. Não utiliza a marca uBlock Origin.
