# Contexto compartilhado do Draftaco

Este arquivo contém contexto durável para Codex e Claude. Para o estado da tarefa atual, consulte [AI_HANDOFF.md](AI_HANDOFF.md).

## Produto

- Draftaco é um protótipo mobile em React para explorar experiências do Rei do Pitaco relacionadas a apostas esportivas, cassino, promoções, betslip e handoff de produto.
- O projeto também valida, em componentes navegáveis, tokens e decisões provenientes do Figma.
- Use dados mockados. O protótipo público não deve conter credenciais, dados pessoais nem endpoints internos.

## Stack e execução

- React 19, TypeScript, Vite 5 e CSS.
- Use Node.js 20.
- Instalação reproduzível: `npm ci`.
- Desenvolvimento: `npm run dev`.
- Build com typecheck: `npm run build`.
- Lint: `npm run lint`; existem erros preexistentes, portanto registre o resultado sem mascará-los nem ampliar o escopo da tarefa.
- Preview de produção: `npm run preview`.
- Em produção, o Vite usa o base path `/draftaco-v0/`.

## Rotas principais

- `/apostas`: home de apostas esportivas.
- `/cassino`: home de cassino.
- `/promocoes`: promoções.
- `/handoff`: contrato vivo de produto e comportamento.

Rotas desconhecidas são normalizadas para o produto padrão de apostas. Após publicar, valide a rota-alvo; o sucesso da raiz do GitHub Pages não comprova a navegação direta de uma rota SPA.

## Organização do código

- `src/App.tsx`: orquestração de rotas, estados globais e fluxos de entrada.
- `src/assets/`: imagens, ícones e logos.
- `src/components/`: componentes reutilizáveis.
- `src/components/BottomSheet/`: shell e variações de bottom sheets.
- `src/components/DepositPanel/`: fluxo de depósito e contas Pix.
- `src/components/ProfileBottomSheet/`: perfil e integrações embutidas, inclusive depósito.
- `src/components/PromoDraftaco/`: promoções e abertura de detalhes.
- `src/data/`: dados mockados.
- `src/hooks/`: estado compartilhado e feature flags.
- `src/pages/`: telas principais.
- `src/styles/`: tokens, temas e estilos globais.
- `src/utils/`: navegação e formatação.

## Design e Figma

- O nó e o arquivo de Figma fornecidos são a fonte de verdade visual.
- Obtenha contexto e screenshot do nó exato antes de implementar.
- Reutilize assets, máscaras e tokens reais; não aproxime artes complexas.
- Prefira variáveis semânticas `--tokens-*` a valores hardcoded quando existir um token equivalente.
- Compare o resultado no navegador, na mesma viewport e no mesmo estado da referência.
- Valide também estados interativos, temas aplicáveis, safe areas e navegação mobile.

## Fluxo Git e publicação

- `main` representa a versão oficial publicada e não deve receber trabalho direto.
- Crie uma branch por tarefa e mantenha mudanças não relacionadas fora dela.
- Preserve um caminho de rollback para experimentos e mudanças temporárias.
- Apresente a versão local antes da Pull Request.
- Pull Request, merge e deploy exigem autorizações explícitas e separadas.
- O deploy ocorre pelo GitHub Actions após incorporação à `main`; não use `gh-pages` manualmente.

## Critério de entrega

Uma tarefa só pode ser descrita como concluída quando o escopo solicitado foi implementado e a validação proporcional ao risco foi executada. Relate separadamente:

1. código alterado;
2. build e verificações técnicas;
3. validação visual e interativa local;
4. Pull Request;
5. merge;
6. deploy e rota validada.
