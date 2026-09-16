# Colaboração no Draftaco

## Um projeto, duas marcas

Pitaco e Draftea compartilham um aplicativo. Cada marca tem sua configuração em `src/brands/<marca>/config.ts`, assets próprios e textos. Não crie branches permanentes por marca nem copie o app para implementar variações.

- `src/features`: telas e comportamento por domínio: auth, home, sports, casino, betslip, promotions e games.
- `src/shared/brand`: contrato das marcas, resolução de URLs, inicialização e persistência.
- `src/shared/hooks`, `src/shared/utils`, `src/shared/types`: estado e regras reutilizados entre funcionalidades.
- `src/shared/i18n`: tradução durante a criação dos elementos React. Não há MutationObserver alterando o DOM.
- `src/components`, `src/data`, `src/assets`, `src/styles` e `src/services`: biblioteca e recursos comuns existentes; não representam uma terceira marca. Extraia um componente para uma feature quando ele pertencer exclusivamente àquele domínio.

Para uma diferença de comportamento, defina uma capacidade na configuração da marca e consuma-a na feature. O cadastro é o primeiro exemplo: Pitaco permite o fluxo; Draftea mantém “Crear cuenta” visível, com abertura bloqueada e redirecionamento de URL direta para apostas. Se os fluxos divergirem mais, crie implementações em `src/brands/<marca>/features` com a mesma interface de props e selecione-as na composição da feature. Não espalhe condições de marca por cada controle.

Cassino está desativado nas duas marcas por `features.casino: false`. O item cassino permanece visível e sem ação na navbar; as promoções não oferecem cassino e a rota direta volta para apostas. Reativação futura pode ser feita individualmente por marca; a implementação foi preservada.

As flags existentes usam os defaults da marca e preferências locais isoladas. `lockToDefault` mantém uma flag presa ao default daquela marca. Adicione capacidades novas ao tipo `BrandConfig` e configure ambas as marcas explicitamente.

## Localização, estilo e estado

A URL é a fonte de verdade: `/pitaco` usa `pt-BR`; `/draftea` usa `es-MX`. O seletor de marca navega com recarga completa para limpar estado transitório. Navegação normal conserva o prefixo, query e histórico. Rotas antigas sem marca recebem Pitaco; links desconhecidos caem na home da marca atual.

Novos textos devem usar mensagens explícitas na configuração/catálogos da marca, como o cabeçalho já faz. `legacyCopy.ts` conserva o catálogo existente para a migração: o adaptador JSX traduz textos de elementos nativos, fragments e atributos acessíveis antes da renderização. Não traduz valores de inputs nem props de componentes. Para conteúdo fornecido por usuário, marque o elemento que contém diretamente o texto com `data-brand-localization-skip="true"`; a opção não é herdada por descendentes. Não use tradução textual para selecionar fluxos, moeda ou identidade de componentes.

O adaptador também cobre JSX de desenvolvimento e o fallback `createElement`. Ele fica fora do pré-bundle de dependências do Vite para que edições nos catálogos apareçam no HMR. A cobertura do catálogo herdado não equivale a uma revisão linguística de todas as telas. Moedas, artes e dados mockados brasileiros existentes foram preservados; não há conversão financeira nem substituição de artes embutidas.

Use `brandStorage` para preferências persistentes: `draftaco:<marca>:<chave>`. Tema, flags, favoritos e recordes/atalhos dos jogos não atravessam marcas. O cache público de logos esportivos continua compartilhado. Estados de sessão React são reiniciados ao trocar a marca. Para CSS exclusivo, use módulo/classe do componente ou o seletor `html[data-brand-mode="draftea"]`; não altere tokens globais para atender somente uma marca.

## Trabalho diário

Depois da publicação inicial no novo destino, cada pessoa deverá fazer seu próprio clone de `design-draftea/draftaco`. Não compartilhe uma pasta editável entre pessoas.

```bash
git clone git@github.com:design-draftea/draftaco.git
cd draftaco
npm ci
git switch main
git pull --ff-only
git switch -c feature/pitaco-nome-da-tarefa
npm run dev
```

Use `feature/`, `fix/`, `chore/` ou `docs/`, indicando domínio/marca quando útil. Commits devem ter escopo claro, por exemplo `feat(draftea): ajustar entrada do login` ou `fix(shared): preservar prefixo da marca`. Se uma pessoa precisar de tarefas simultâneas, use um worktree por tarefa, a partir de uma base atualizada. Não copie `.git` nem metadados de worktrees. Só um agente edita cada pasta por vez.

Antes de editar, siga `AGENTS.md`, confirme branch, status e remoto, e consulte `AI_HANDOFF.md`. Leia `AI_CONTEXT.md` quando a tarefa depender de produto, arquitetura, marcas, rotas ou comandos. Mudanças compartilhadas precisam de validação em ambas as marcas. Na PR, explique quais marcas/rotas mudaram e anexe evidências da versão local aprovada.

1. Implemente na branch e valide no navegador mobile.
2. Apresente URLs locais e aguarde aprovação da versão local.
3. Antes da PR, rode `npm ci`, `npm run build` e, para mudanças compartilhadas ou de marca, `npm run check:brands`; registre lint separadamente.
4. Abra PR para `main`, peça revisão e aguarde autorização para o merge, deixando explícito que ele dispara o deploy.
5. Depois do deploy, valide as rotas profundas de ambas as marcas diretamente e após recarga.

Proteção da main, permissões, reviewers obrigatórios e previews por PR são configurações remotas a estabelecer posteriormente. A presença dos workflows no código não comprova que o novo repositório esteja publicado ou configurado.

## Validação local

```bash
npm run dev -- --host 0.0.0.0 --port 5180
# http://localhost:5180/pitaco
# http://localhost:5180/draftea
npm run build
npm run check:brands
npm run preview -- --host 0.0.0.0 --port 5181
# http://localhost:5181/draftaco/pitaco
# http://localhost:5181/draftaco/draftea
```

Use viewport abaixo de 500px (ex.: 390 × 844). Valide apostas, cassino visível e sem ação na navbar e redirecionamento de suas rotas enquanto desativado, abrir e fechar login, cadastro Pitaco, botão sem ação e URL bloqueada na Draftea, voltar/avançar, recarga, query strings, tema/flags isolados e ausência de erros de runtime. Os testes de contratos cobrem `/` e `/draftaco/`, idioma, bloqueio inicial do cadastro, persistência, JSX de produção/desenvolvimento e valores de formulário intactos.
