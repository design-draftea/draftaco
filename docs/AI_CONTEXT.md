# Contexto compartilhado do Draftaco

Este arquivo contém contexto durável para Codex e Claude. Para o estado da tarefa atual, consulte [AI_HANDOFF.md](AI_HANDOFF.md).

## Produto

- Draftaco é um protótipo mobile em React para explorar experiências de Pitaco (pt-BR) e Draftea (es-MX) relacionadas a apostas esportivas, cassino, promoções, betslip e handoff de produto.
- O projeto também valida, em componentes navegáveis, tokens e decisões provenientes do Figma.
- Use dados mockados. O protótipo público não deve conter credenciais, dados pessoais nem endpoints internos.

## Stack e execução

- React 19, TypeScript, Vite 5 e CSS.
- Use Node.js 20.
- Instalação reproduzível: `npm ci`.
- Desenvolvimento: `npm run dev`.
- Build com typecheck: `npm run build`.
- Contratos das marcas: `npm run check:brands`.
- Lint: `npm run lint`; existem erros preexistentes, portanto registre o resultado sem mascará-los nem ampliar o escopo da tarefa.
- Preview de produção: `npm run preview`.
- Em produção, o Vite usa o base path `/draftaco/`.

## Rotas principais

Cassino está desativado nas duas marcas (`features.casino: false`): item visível e sem ação na navbar, sem filtro/cards de promoções de cassino ou acesso pela rota. A implementação está preservada para reativação futura.

- `/<marca>/apostas`: home de apostas esportivas.
- `/<marca>/cassino`: indisponível nesta fase; redireciona para apostas.
- `/<marca>/promocoes`: promoções.
- `/<marca>/handoff`: contrato vivo de produto e comportamento.

`<marca>` é `pitaco` ou `draftea`. `/pitaco` e `/draftea` abrem apostas. `/<marca>/entrar` abre login. Somente `/pitaco/criar-conta` permite cadastro; a mesma rota na Draftea volta para apostas. O botão Crear cuenta permanece visível e sem ação.

Rotas desconhecidas são normalizadas para o produto padrão de apostas. Após publicar, valide a rota-alvo; o sucesso da raiz do GitHub Pages não comprova a navegação direta de uma rota SPA.

## Organização do código

- `src/App.tsx`: orquestração de rotas, estados globais e fluxos de entrada.
- `src/assets/`: imagens, ícones e logos.
- `src/components/`: componentes reutilizáveis.
- `src/components/BottomSheet/`: shell e variações de bottom sheets.
- `src/components/DepositPanel/`: fluxo de depósito e contas Pix.
- `src/components/ProfileBottomSheet/`: perfil e integrações embutidas, inclusive depósito.
- `src/features/promotions/PromoDraftaco/`: promoções e abertura de detalhes.
- `src/data/`: dados mockados.
- `src/shared/hooks/`: estado compartilhado e feature flags.
- `src/features/`: telas e comportamento agrupados por domínio.
- `src/styles/`: tokens, temas e estilos globais.
- `src/shared/utils/`: navegação e formatação.

- `src/brands/pitaco` e `src/brands/draftea`: configuração, logos e catálogos de texto por marca.
- `src/shared/brand`: URL como fonte de marca, capacidades e storage com namespace por marca.
- `src/shared/i18n`: adaptador de renderização React para o catálogo legado; mensagens explícitas para novos textos. Sem mutação do DOM.
- A troca de marca recarrega a aplicação e limpa estado transitório; tema, flags, favoritos e recordes usam `brandStorage`.
- O Vite preview usa `/draftaco/`, assim como o build. O servidor dev usa `/`.
- Consulte [COLLABORATION.md](COLLABORATION.md) para limites, exemplos e validação nas duas marcas.

## Design e Figma

- O nó e o arquivo de Figma fornecidos são a fonte de verdade visual.
- Obtenha contexto e screenshot do nó exato antes de implementar.
- Reutilize assets, máscaras e tokens reais; não aproxime artes complexas.
- Prefira variáveis semânticas `--tokens-*` a valores hardcoded quando existir um token equivalente.
- Compare o resultado no navegador, na mesma viewport e no mesmo estado da referência.
- Valide também estados interativos, temas aplicáveis, safe areas e navegação mobile.

## Localização e pré-bundle do Vite

- A marca vem da URL e a tradução da Draftea acontece na criação dos elementos React, via `jsxImportSource: '@draftaco/i18n'` (alias para `src/shared/i18n`).
- `@vitejs/plugin-react` injeta o runtime JSX de `jsxImportSource` em `optimizeDeps.include`, e include vence exclude. Como o runtime aqui é código-fonte, o pré-bundle inlineava todo o grafo dele — inclusive `src/brands/draftea/legacyCopy.ts`. O cache de deps não invalida com mudança de fonte, então editar o catálogo não tinha efeito no dev até apagar `node_modules/.vite`.
- O plugin `draftaco-i18n-source-runtime` em `vite.config.ts` remove as entradas `@draftaco/i18n*` de `optimizeDeps.include` na config resolvida, devolvendo efeito ao `exclude`. O runtime passa a ser servido como fonte e o catálogo reflete por HMR.
- Se algum dia o runtime de i18n voltar a aparecer em `node_modules/.vite/deps`, é sinal de que esse plugin parou de funcionar (por exemplo, após atualizar o `@vitejs/plugin-react`). O sintoma visível é texto novo aparecendo em pt-BR na Draftea.

## Fluxo Git e publicação

- Destino desta cópia: `design-draftea/draftaco`. Nunca publicar em `draftaco-v0`.
- O novo destino ainda requer validação/configuração remota; workflows herdados não são prova de deploy, permissões ou proteção de branch aplicados.

- `main` representa a versão oficial publicada e não deve receber trabalho direto.
- Crie uma branch por tarefa e mantenha mudanças não relacionadas fora dela.
- Preserve um caminho de rollback para experimentos e mudanças temporárias.
- Apresente a versão local antes da Pull Request.
- Abrir a Pull Request exige aprovação da versão local. Incorporar a mudança à `main` exige uma nova autorização explícita.
- O merge em `main` dispara o deploy pelo GitHub Actions; portanto, a autorização para merge deve informar e abranger essa publicação automática. Não use `gh-pages` manualmente.

## Critério de entrega

Uma tarefa só pode ser descrita como concluída quando o escopo solicitado foi implementado e a validação proporcional ao risco foi executada. Relate separadamente:

1. código alterado;
2. build e verificações técnicas;
3. validação visual e interativa local;
4. Pull Request;
5. merge;
6. deploy e rota validada.
