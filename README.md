# Draftaco

Protótipo mobile em React para explorar a experiência de Pitaco e Draftea com apostas esportivas, cassino, promoções e betslip.

O projeto também funciona como uma camada prática de validação dos tokens exportados do Figma. A intenção é aproximar decisões de produto, comportamento de interface e uso real dos tokens em componentes navegáveis.

## Como rodar

Use Node.js 20.

```bash
npm ci
npm run dev
```

O Vite abre o app localmente em:

```text
http://localhost:5173/pitaco
http://localhost:5173/draftea
```

Para testar a câmera no celular, acesse pela rede local usando HTTPS:

```text
VITE_DEV_HTTPS=1 npm run dev -- --host 0.0.0.0
https://<IP-da-máquina>:5173/pitaco
```

O navegador pode pedir confirmação do certificado local na primeira abertura. Use sempre `https://`; em `http://<IP>:<porta>/`, navegadores móveis bloqueiam `getUserMedia` e a câmera fica indisponível.

Scripts úteis:

```bash
npm run dev      # servidor local
npm run build    # typecheck + build de produção
npm run check:brands # contratos das marcas
npm run check:nfl # contratos determinísticos do replay NFL
npm run lint     # ESLint
npm run preview  # preview do build
```

### Auditoria semântica opcional do replay NFL

O campinho continua determinístico e não chama IA durante a reprodução. Para comparar os
lances ambíguos (`no_play` e sack) com o texto oficial do nflverse, copie `.env.example` para
`.env.typesafe.local`, preencha `TYPESAFE_API_KEY` e execute:

```bash
npm run qa:nfl:typesafe -- --dry-run
npm run qa:nfl:typesafe
```

O auditor envia os candidatos em uma única chamada ao Jev, informa uso de tokens e confiança,
e não altera o fixture. Por padrão, confiança abaixo de `0.75` ou divergência exige revisão e
retorna código de saída `1`. É possível restringir lances ou mudar o limite:

```bash
npm run qa:nfl:typesafe -- --ids=360,696 --threshold=0.8
```

Em produção, o app usa o base path `/draftaco`.

## Fluxo de colaboração e deploy

Leia [o guia de colaboração](docs/COLLABORATION.md). O destino é `design-draftea/draftaco`; permissões, proteção de branch e publicação no novo repositório ainda serão configuradas na etapa remota. Os workflows herdados descrevem o fluxo esperado após essa configuração.

- `main` é a versão oficial e publicada do protótipo.
- Cada mudança deve começar em uma branch própria e chegar à `main` por Pull Request.
- Pull Requests para `main` executam o build no GitHub Actions.
- O merge na `main` publica automaticamente no GitHub Pages. Não existe deploy manual por `gh-pages`.

O lint permanece disponível para acompanhamento, mas ainda possui erros preexistentes e não é bloqueio de merge. A correção deve acontecer em uma tarefa de manutenção dedicada, sem misturar mudanças funcionais.

## Rotas principais

Cassino está desativado nas duas marcas (`features.casino: false`): item visível e sem ação na navbar, sem filtro/cards de promoções de cassino ou acesso pela rota. A implementação está preservada para reativação futura.

`<marca>` é `pitaco` ou `draftea`; a URL determina o idioma. Draftea mantém “Crear cuenta” visível e sem ação, inclusive com bloqueio da URL de cadastro. Pitaco preserva o cadastro.

- `/<marca>/apostas`: home de apostas esportivas.
- `/<marca>/cassino`: indisponível nesta fase; redireciona para apostas.
- `/<marca>/promocoes`: página de promoções.

Rotas desconhecidas são normalizadas para o produto padrão de apostas.

## Estrutura

```text
src/
  brands/        configuração, logos e textos por marca
  features/      auth, home, sports, casino, betslip, promotions e games
  shared/        brand, i18n, hooks, utils e types reutilizáveis
  assets/        recursos comuns existentes
  components/    biblioteca de componentes comuns
  data/          dados mockados compartilhados
  services/      integrações auxiliares existentes
  styles/        tokens, reset e estilos globais
```

## Tokens e tema

Os tokens ficam em `src/styles/tokens.css` e foram gerados a partir dos exports `Dark.tokens.json` e `Light.tokens.json` do Figma. Componentes devem preferir variáveis semânticas `--tokens-*` em vez de cores ou medidas hardcoded.

O tema é inicializado em `src/theme.ts`. O padrão atual é `dark`, com suporte a `light` e `system`. Também é possível forçar o tema por query string:

```text
/?theme=dark
/?theme=light
```

Ao alterar tokens, valide pelo menos:

- contraste de texto e odds nos temas claro e escuro;
- estados de seleção, hover, pressed, disabled e focus-visible;
- comportamento mobile com safe area e bottom navigation;
- motion com `prefers-reduced-motion`.

## Cuidados de design

- A Home de apostas é densa. Antes de adicionar novos blocos, confirme se eles ajudam a tarefa principal: encontrar um evento, escolher uma odd e concluir o bilhete.
- O filtro por esporte reduz ruído e deve continuar recebendo prioridade na navegação.
- O betslip compacto é uma peça central da experiência; qualquer mudança nele deve preservar clareza de seleções, odds, valor apostado e retorno potencial.
- Evite misturar chamadas de cassino dentro do contexto de apostas esportivas, exceto quando houver uma regra explícita de produto.
- Cores de time, badges e acentos promocionais podem existir, mas devem ser mapeados para tokens ou constantes documentadas quando virarem padrão.

## Atenções abertas

- Revisar tokens de `line-height` exportados com unidade `px`; eles devem ser unitless antes de serem consumidos como tokens tipográficos.
- Reduzir gradualmente cores hexadecimais soltas em CSS/TSX.
- Consolidar aliases globais como `--color-*`, `--spacing-*` e `--radius-*` para evitar duas fontes de verdade.
- Completar o README com o processo real de export/sync dos tokens do Figma quando esse fluxo estiver definido.
