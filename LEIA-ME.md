# AdVeil 0.3.1

A pasta principal é `C:\Projetos Desenvolvidos\Extensões\AdVeil`.

## Atualizar no Comet
1. Abra `chrome://extensions`.
2. No cartão **AdVeil**, clique em **Recarregar**.
3. Se necessário, revise a nova permissão de bloqueio de rede.
4. Recarregue as páginas abertas.
5. Abra **AdVeil → Todas as configurações**.

Se ainda estiver usando outra pasta, carregue esta pasta com **Carregar sem compactação** e desative a cópia antiga para evitar duplicação.

## Escolher proteção
- **Equilibrado:** bloqueio de anúncios, compatibilidade e camuflagem.
- **Reforçado:** acrescenta rastreadores e limpeza visual conservadora (sem rastro na página).
- **Complemento:** deixa as listas de bloqueio desligadas e mantém compatibilidade e camuflagem de JavaScript, sem redirecionamentos. Seus filtros personalizados, se houver, continuam ativos.

A **camuflagem** responde localmente aos testes comuns de detecção (elementos-isca, geometria e requisições a scripts de anúncio conhecidos) e usa substitutos inertes que não exibem nem solicitam anúncios. A versão 0.3.1 acrescenta frames vazios locais e melhora os retornos da API GPT. Não gera cliques ou impressões de publicidade. Pode ser desligada por site. Se um site quebrar, pause o AdVeil nele.

Você pode pausar por site, editar domínios, importar e exportar preferências. A versão tem 13.605 regras de rede disponíveis, contando bloqueios e exceções; 4.599 estão nas listas padrão.

As exceções do AdVeil não liberam recursos bloqueados por outra extensão. A cobertura contra detecção é parcial e vale somente para este navegador, não para todo o computador.

Detalhes, testes, privacidade e limites: README.md. Créditos das listas: NOTICE.md.
