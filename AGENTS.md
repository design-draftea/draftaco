# Draftaco — instruções de trabalho

## Início de qualquer tarefa

- Responda à pessoa usuária em português do Brasil.
- Leia [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md) quando a tarefa depender de produto, arquitetura, marcas, rotas ou comandos do projeto.
- Antes de editar ou retomar trabalho compartilhado, leia [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md) para verificar o estado operacional atual.
- Consulte [docs/COLLABORATION.md](docs/COLLABORATION.md) quando a tarefa envolver arquitetura entre marcas, Git, validação completa ou publicação.
- Antes de editar, confirme o diretório atual, a raiz do Git, a branch e `git status --short --branch`.
- Se houver mudanças não commitadas, trate-as como trabalho da pessoa usuária ou de outro agente. Não sobrescreva, reverta, mova ou inclua essas mudanças sem autorização explícita.
- Não edite na `main`. Se a pasta principal estiver na `main` ou contiver trabalho não relacionado, use uma branch e, quando necessário, um worktree isolado.
- Em uma mesma pasta de trabalho, apenas um agente deve editar por vez. O outro agente pode revisar ou planejar, mas não deve alterar os mesmos arquivos simultaneamente.

## Continuidade entre Codex e Claude

- Este arquivo é a fonte única das regras de trabalho compartilhadas por Codex e Claude. Arquivos específicos de ferramenta devem apenas apontar para ele.
- [docs/AI_CONTEXT.md](docs/AI_CONTEXT.md) contém somente contexto durável. Atualize-o quando arquitetura, comandos, rotas ou decisões permanentes realmente mudarem.
- [docs/AI_HANDOFF.md](docs/AI_HANDOFF.md) registra somente o estado operacional atual. Mova relatos extensos ou etapas superadas para `docs/handoffs/` e mantenha no arquivo principal um link para o histórico relevante.
- Atualize o handoff antes de transferir trabalho entre Codex e Claude ou ao encerrar uma sessão com trabalho incompleto.
- O handoff deve registrar objetivo, branch/worktree, arquivos alterados, decisões, validações executadas, pendências e próximo passo concreto.
- Não declare como concluído algo que não foi verificado. Diferencie claramente implementação, validação local, Pull Request, merge e deploy.
- Nunca registre credenciais, tokens, dados pessoais, URLs privadas ou segredos nos arquivos de contexto ou handoff.

## Fluxo de Git

- `main` é a versão oficial publicada. Nunca trabalhe ou faça push diretamente nela.
- Crie uma branch por tarefa a partir de `main`, usando `feature/`, `fix/`, `chore/` ou `docs/` no nome.
- Abra uma Pull Request para `main`; não faça merge automático.
- O deploy é feito exclusivamente pelo GitHub Actions quando uma mudança é incorporada à `main`. Como o merge dispara a publicação, explique esse efeito antes de pedir autorização para o merge. Não use `gh-pages` nem crie uma branch de deploy.
- Use um worktree separado apenas para tarefas paralelas que precisam de isolamento.
- Nunca remova a pasta principal do projeto (checkout local selecionado pela pessoa usuária). A limpeza pode remover somente worktrees temporários criados para uma tarefa.
- Depois do merge e com autorização explícita para limpeza, arquive a tarefa associada, remova o worktree temporário e a branch local. Não apague a branch remota sem autorização explícita.

## Segurança e escopo

- Use dados mockados. Nunca inclua credenciais, tokens, dados pessoais ou endpoints internos no repositório ou no protótipo público.
- Não adicione dependências nem altere o workflow de deploy sem explicar a necessidade na Pull Request.
- Preserve os produtos e fluxos existentes; mantenha mudanças restritas ao pedido.
- Dentro do escopo autorizado, tome decisões reversíveis sem pedir confirmação a cada etapa. Conclua a implementação, execute verificações proporcionais ao risco e corrija falhas introduzidas antes de apresentar o resultado.
- Pedidos de análise, revisão ou conversa autorizam inspeção e recomendação, mas não edição ou publicação.

## Figma

- Se o pedido incluir um link do Figma ou identificador de nó, abra e visualize o design no Figma Desktop antes de implementar.
- O Figma fornecido é a fonte de verdade visual. Não invente detalhes de interface, espaçamentos, cores, estados ou assets por suposição.
- Se o arquivo ou nó não estiver acessível, informe o bloqueio e peça acesso ou uma referência visual; não prossiga com uma interpretação própria.
- Reutilize os assets, máscaras e tokens reais do repositório. Não aproxime artes complexas com gradientes ou desenhos substitutos.

## Validação

- Para mudanças de interface ou fluxo, implemente primeiro na branch e apresente a versão local para validação da pessoa responsável pelo protótipo.
- Valide no navegador em execução, na rota, viewport e estado relevantes. Build concluído não comprova fidelidade visual nem interação correta.
- Ajuste a validação ao alcance da mudança. Mudanças compartilhadas de marca, navegação ou estado exigem conferir Pitaco e Draftea; ajustes locais devem ser verificados no fluxo afetado sem repetir testes que não ganharam novo risco.
- Quando a pessoa usuária pedir para testar o protótipo, inicie o servidor e informe uma URL local ou LAN utilizável, conforme o caso.
- Não abra Pull Request antes de receber aprovação explícita da versão local. Depois da aprovação, execute as verificações técnicas, abra a Pull Request e aguarde nova autorização explícita para o merge e a publicação automática decorrente dele.
- Antes de abrir uma Pull Request, execute `npm ci` e `npm run build`.
- `npm run lint` existe, mas contém erros preexistentes e não é um bloqueio de merge. Não desabilite regras para contorná-los; trate a limpeza em uma tarefa separada.
- Depois de um deploy, verifique a rota-alvo diretamente; a raiz responder não prova que uma rota SPA específica funciona.

## Movimento

- Neste protótipo, as animações definidas pela interface devem ser executadas mesmo quando o desktop informar a preferência `prefers-reduced-motion: reduce`. Não use essa preferência para reduzir ou desativar animações.
