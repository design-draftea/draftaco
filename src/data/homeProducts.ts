import type {
  Banner,
  CasinoGameSection,
  CasinoRailItem,
  HomeCompetitionHighlight,
  HomeCompetitionMatch,
  HomeOfferCarouselItem,
  NavbarConfig,
  ProductMode,
  ProductRailSection,
  Promotion,
} from '../shared/types/home'

import imgPromoPiggy from '../assets/img-promo-piggy.png'
import imgPromoRabbit from '../assets/img-promo-rabbit.webp'
import imgTesouroRei from '../assets/img-promo-tesouro-do-rei.png'
import imgMissao100k from '../assets/img-missao-100k.webp'
import imgTorneioWazdan from '../assets/img-torneio-wazdan.webp'
import imgJogoFortune from '../assets/img-jogo-fortune.webp'
import imgJogoMacaco from '../assets/img-jogo-macaco.webp'
import imgAviator from '../assets/imgAviator.png'
import imgRoletaSorte from '../assets/imgRoletaSorte.png'
import imgFutebolStudio from '../assets/imgFutebolStudio.png'
import imgRabbit from '../assets/imgRabbit.png'
import imgTigrinho from '../assets/imgTigrinho.png'
import imgRatinho from '../assets/img-ratinho.webp'
import promoHighlightFlamengoGlow from '../assets/bgPromoBlue.png'
import promoHighlightCopaGlow from '../assets/bgPromoGreen.png'
import promoHighlightNbaGlow from '../assets/bgPromoYellow.png'
import bgCombinada from '../assets/bgCombinada.png'
import bgSuperCombinada from '../assets/bgSuperCombinada.png'
import bgGarantida from '../assets/bgGarantida.png'
import mbappeCard from '../assets/mbappe-card.png'
import escudoBarcelonaGde from '../assets/escudoBarcelonaGde.png'
import escudoRealGde from '../assets/escudoRealGde.png'
import escudoArsenal from '../assets/escudoArsenal.png'
import escudoFlamengoGde from '../assets/escudoFlamengoGde.png'
import escudoCruzeiro from '../assets/escudoCruzeiro.png'
import escudoPalmeiras from '../assets/escudoPalmeiras.png'
import escudoFluminense from '../assets/escudoFluminense.png'
import escudoBullsGde from '../assets/escudoBullsGde.png'
import escudoLakers from '../assets/escudoLakers.png'
import escudoMiami from '../assets/escudoMiami.png'
import escudoWarriorsGde from '../assets/escudoWarriosGde.png'

import iconBlackjack from '../assets/iconSports/blackjack.png'
import iconCasino from '../assets/iconSports/casino.png'
import iconCrash from '../assets/iconSports/crash.png'
import iconDestaque from '../assets/iconSports/fire.png'
import iconMore from '../assets/iconSports/more.png'
import iconProvedores from '../assets/iconSports/provedores.png'
import iconRoleta from '../assets/iconSports/roleta.png'
import iconSlots from '../assets/iconSports/slots.png'

import navApostas from '../assets/navApostas.svg'
import navBusca from '../assets/navBusca.svg'
import navCassino from '../assets/navCassino.svg'
import navEntrada from '../assets/navEntrada.svg'
import navPitacoClubIniciante from '../brands/pitaco/assets/navPitacoClubIniciante.png'

export const productLabels: Record<ProductMode, string> = {
  apostas: 'APOSTAS',
  cassino: 'CASSINO',
}

export const productNavbarConfigs: Record<ProductMode, NavbarConfig> = {
  apostas: {
    activeItemId: 'home',
    mainItems: [
      { id: 'home', icon: navApostas, label: 'Apostas' },
      { id: 'entradas', icon: navEntrada, label: 'Entradas' },
      { id: 'ao-vivo', icon: navCassino, label: 'Cassino' },
      { id: 'promocoes', icon: navPitacoClubIniciante, label: 'Pitaco Club' },
    ],
    searchItem: { id: 'buscar', icon: navBusca, label: 'Buscar' },
  },
  cassino: {
    activeItemId: 'home',
    mainItems: [
      { id: 'home', icon: navApostas, label: 'Apostas' },
      { id: 'entradas', icon: navEntrada, label: 'Entradas' },
      { id: 'ao-vivo', icon: navCassino, label: 'Cassino' },
      { id: 'promocoes', icon: navPitacoClubIniciante, label: 'Pitaco Club' },
    ],
    searchItem: { id: 'buscar', icon: navBusca, label: 'Buscar' },
  },
}

export const sportsBanners: Banner[] = [
  {
    id: 1,
    type: 'market',
    headerLeft: '',
    headerRight: '',
    background: '',
    title: '',
    description: '',
    marketBanner: {
      variant: 'football-live',
      sport: 'futebol',
      league: 'CHAMPIONS LEAGUE',
      footerLabel: '35 min',
      live: true,
      liveClock: '35 min',
      teams: [
        {
          name: 'Paris Saint-Germain',
          imageSourceName: 'PSG',
          glowColor: '20 75 168',
          score: '2',
          stats: [
            { icon: 'red-card', value: '0' },
            { icon: 'yellow-card', value: '1' },
            { icon: 'corner', value: '3' },
          ],
        },
        {
          name: 'Manchester City',
          imageSourceName: 'Manchester City',
          glowColor: '108 171 221',
          score: '1',
          stats: [
            { icon: 'red-card', value: '0' },
            { icon: 'yellow-card', value: '1' },
            { icon: 'corner', value: '1' },
          ],
        },
      ],
      odds: [
        { label: 'PSG', value: '1.75x', outcomeId: 'home' },
        { label: 'EMPATE', value: '3.50x', outcomeId: 'draw' },
        { label: 'MCI', value: '2.10x', outcomeId: 'away' },
      ],
      alternativeMarkets: [
        {
          id: 'total-escanteios',
          label: 'Total des Escanteios',
          odds: [
            { label: '8.5', value: '1.75x', outcomeId: 'corners-over', trend: 'up' },
            { label: '8.5', value: '1.95x', outcomeId: 'corners-under', trend: 'down' },
          ],
        },
        {
          id: 'total-gols',
          label: 'Total de Gols',
          odds: [
            { label: '2.5', value: '1.82x', outcomeId: 'goals-over', trend: 'up' },
            { label: '2.5', value: '2.05x', outcomeId: 'goals-under', trend: 'down' },
          ],
        },
      ],
      playerProps: [
        {
          id: 'psg-dembele-shots',
          playerName: 'Dembélé',
          position: 'ATA',
          subtitle: 'Finalizações ao Gol',
          teamName: 'Paris Saint-Germain',
          odds: [
            { label: '1.0+', value: '1.42x', outcomeId: 'dembele-shots-1' },
            { label: '2.0+', value: '1.53x', outcomeId: 'dembele-shots-2' },
            { label: '3.0+', value: '2.80x', outcomeId: 'dembele-shots-3' },
          ],
        },
        {
          id: 'city-haaland-shots',
          playerName: 'Haaland',
          position: 'ATA',
          subtitle: 'Finalizações ao Gol',
          teamName: 'Manchester City',
          odds: [
            { label: '1.0+', value: '1.35x', outcomeId: 'haaland-shots-1' },
            { label: '2.0+', value: '1.53x', outcomeId: 'haaland-shots-2' },
            { label: '3.0+', value: '2.65x', outcomeId: 'haaland-shots-3' },
          ],
        },
      ],
    },
  },
  {
    id: 2,
    type: 'market',
    headerLeft: '',
    headerRight: '',
    background: '',
    title: '',
    description: '',
    marketBanner: {
      variant: 'football-pre',
      sport: 'futebol',
      league: 'BRASILEIRÃO',
      footerLabel: 'Amanhã 20:00',
      teams: [
        {
          name: 'Palmeiras',
          image: escudoPalmeiras,
          glowColor: '0 126 82',
        },
        {
          name: 'Fluminense',
          image: escudoFluminense,
          glowColor: '128 23 48',
        },
      ],
      odds: [
        { label: 'PAL', value: '1.85x', outcomeId: 'home' },
        { label: 'EMPATE', value: '3.30x', outcomeId: 'draw' },
        { label: 'FLU', value: '4.10x', outcomeId: 'away' },
      ],
      alternativeMarkets: [
        {
          id: 'pal-flu-total-escanteios',
          label: 'Total de Escanteios',
          odds: [
            { label: '9.5', value: '1.80x', outcomeId: 'corners-over', trend: 'up' },
            { label: '9.5', value: '1.90x', outcomeId: 'corners-under', trend: 'down' },
          ],
        },
        {
          id: 'pal-flu-total-gols',
          label: 'Total de Gols',
          odds: [
            { label: '2.5', value: '1.88x', outcomeId: 'goals-over', trend: 'up' },
            { label: '2.5', value: '1.98x', outcomeId: 'goals-under', trend: 'down' },
          ],
        },
      ],
      playerProps: [
        {
          id: 'pal-flaco-shots',
          playerName: 'Flaco López',
          position: 'ATA',
          subtitle: 'Finalizações ao Gol',
          teamName: 'Palmeiras',
          odds: [
            { label: '1.0+', value: '1.45x', outcomeId: 'flaco-shots-1' },
            { label: '2.0+', value: '1.95x', outcomeId: 'flaco-shots-2' },
            { label: '3.0+', value: '3.10x', outcomeId: 'flaco-shots-3' },
          ],
        },
        {
          id: 'flu-cano-shots',
          playerName: 'Cano',
          position: 'ATA',
          subtitle: 'Finalizações ao Gol',
          teamName: 'Fluminense',
          odds: [
            { label: '1.0+', value: '1.58x', outcomeId: 'cano-shots-1' },
            { label: '2.0+', value: '2.10x', outcomeId: 'cano-shots-2' },
            { label: '3.0+', value: '3.75x', outcomeId: 'cano-shots-3' },
          ],
        },
      ],
    },
  },
  {
    id: 3,
    type: 'market',
    headerLeft: '',
    headerRight: '',
    background: '',
    title: '',
    description: '',
    marketBanner: {
      variant: 'basketball-pre',
      sport: 'basquete',
      league: 'NBA',
      footerLabel: 'Amanhã 21:30',
      teams: [
        {
          name: 'Chicago Bulls',
          image: escudoBullsGde,
          glowColor: '206 17 65',
        },
        {
          name: 'Miami Heat',
          image: escudoMiami,
          glowColor: '152 0 46',
        },
      ],
      odds: [
        { label: 'CHI', value: '2.45x', outcomeId: 'home' },
        { label: 'MIA', value: '1.58x', outcomeId: 'away' },
      ],
      alternativeMarkets: [
        {
          id: 'bulls-heat-handicap',
          label: 'Handicap',
          odds: [
            { label: 'CHI +5.5', value: '1.87x', outcomeId: 'handicap-home' },
            { label: 'MIA -5.5', value: '1.94x', outcomeId: 'handicap-away' },
          ],
        },
        {
          id: 'bulls-heat-total-pontos',
          label: 'Total de Pontos',
          odds: [
            { label: '218.5', value: '1.89x', outcomeId: 'points-over', trend: 'up' },
            { label: '218.5', value: '1.92x', outcomeId: 'points-under', trend: 'down' },
          ],
        },
      ],
      playerProps: [
        {
          id: 'bulls-lavine-points',
          playerName: 'Z. LaVine',
          position: 'ALA',
          subtitle: 'Pontos',
          teamName: 'Chicago Bulls',
          odds: [
            { label: '18.0+', value: '1.60x', outcomeId: 'lavine-points-18' },
            { label: '22.0+', value: '2.18x', outcomeId: 'lavine-points-22' },
            { label: '26.0+', value: '3.70x', outcomeId: 'lavine-points-26' },
          ],
        },
        {
          id: 'heat-butler-assists',
          playerName: 'J. Butler',
          position: 'ALA',
          subtitle: 'Assistências',
          teamName: 'Miami Heat',
          odds: [
            { label: '4.0+', value: '1.62x', outcomeId: 'butler-assists-4' },
            { label: '6.0+', value: '2.48x', outcomeId: 'butler-assists-6' },
            { label: '8.0+', value: '4.90x', outcomeId: 'butler-assists-8' },
          ],
        },
      ],
    },
  },
]

export const casinoBanners: Banner[] = [
  {
    id: 101,
    type: 'virtuais',
    headerLeft: 'Slots',
    headerRight: 'Pragmatic Play',
    background: imgJogoFortune,
    title: '',
    description: '',
    hideContent: true,
    casinoGameId: 'fortune-tiger',
  },
  {
    id: 102,
    type: 'virtuais',
    headerLeft: 'Slots',
    headerRight: 'Pragmatic Play',
    background: imgJogoMacaco,
    title: '',
    description: '',
    hideContent: true,
    casinoGameId: 'lucky-monkey',
  },
  {
    id: 103,
    type: 'missao',
    headerLeft: 'Missão',
    headerRight: 'Termina em 3 dias',
    background: imgMissao100k,
    title: 'R$ 100 MIL na\u00a0hora!',
    description: 'Quanto mais você aposta,\nmaiores são as chances de\nver um prêmio!',
    buttonText: 'Ativar Missão',
    showInfoBtn: true,
    noWrapTitle: true,
  },
  {
    id: 104,
    type: 'torneio',
    headerLeft: 'Torneio',
    headerRight: 'Termina em 3 dias',
    background: imgTorneioWazdan,
    title: 'R$ 450.000!',
    description: 'Drop de Prêmios Wazdan.\nTorneio recheado de\nprêmios para você.',
    buttonText: 'Jogar Torneio',
    showInfoBtn: true,
  },
]

export const sportsPromotions: Promotion[] = [
  {
    id: 'selecao-copa',
    type: 'missao',
    timeLabel: '23h : 23m',
    hasTimer: true,
    label: ['Seleções da copa'],
    title: 'Aposte e ganhe R$10',
    description: 'Aposte nas seleções da copa e ganhe R$10.',
    image: promoHighlightCopaGlow,
    headline: 'Seleções da copa',
    titleLines: ['APOSTE', 'E GANHE', 'R$10'],
    countdownLabel: '23h : 23m',
    countdownMinutes: 23 * 60 + 23,
    rulesLabel: 'Ver regras',
    glowImage: promoHighlightCopaGlow,
    accent: 'mint',
  },
  {
    id: 'nba-tarefas',
    type: 'missao',
    timeLabel: '23h : 23m',
    hasTimer: true,
    label: ['NBA no Pitaco'],
    title: 'Complete tarefas e ganhe',
    description: 'Complete tarefas da NBA no Pitaco e ganhe.',
    image: promoHighlightNbaGlow,
    headline: 'NBA NO PITACO',
    titleLines: ['COMPLETE', 'TAREFAS', 'E GANHE'],
    countdownLabel: '18h : 07m',
    countdownMinutes: 18 * 60 + 7,
    rulesLabel: 'Ver regras',
    glowImage: promoHighlightNbaGlow,
    accent: 'gold',
  },
  {
    id: 'flamengo-liberta',
    type: 'missao',
    timeLabel: '23h : 23m',
    hasTimer: true,
    label: ['Ganhe R$20'],
    title: 'Flamengo na liberta é aqui',
    description: 'Ganhe R$20 com Flamengo na Liberta.',
    image: promoHighlightFlamengoGlow,
    headline: 'GANHE R$20',
    titleLines: ['FLAMENGO', 'NA LIBERTA', 'É AQUI'],
    countdownLabel: '06h : 42m',
    countdownMinutes: 6 * 60 + 42,
    rulesLabel: 'Ver regras',
    glowImage: promoHighlightFlamengoGlow,
    accent: 'cyan',
  },
]

export const drafteaSportsPromotions: Promotion[] = [
  {
    id: 'draftea-ambos-anotan',
    type: 'missao',
    timeLabel: '23h : 23m',
    hasTimer: true,
    label: ['EM PARLAYS de Min. 4 SELECiones'],
    title: 'AMBOS ANOTAN +40%',
    description: 'EM PARLAYS de Min. 4 SELECiones',
    image: promoHighlightCopaGlow,
    headline: 'EM PARLAYS de Min. 4 SELECiones',
    titleLines: ['AMBOS ANOTAN +40%'],
    countdownLabel: '23h : 23m',
    rulesLabel: 'Ver reglas',
    glowImage: promoHighlightCopaGlow,
    accent: 'mint',
  },
  {
    id: 'draftea-mexico-coreia',
    type: 'missao',
    timeLabel: '23h : 23m',
    hasTimer: true,
    label: ['EM PARLAYS de Min. 3 SELECiones'],
    title: 'mexico vs coreia +20%',
    description: 'EM PARLAYS de Min. 3 SELECiones',
    image: promoHighlightNbaGlow,
    headline: 'EM PARLAYS de Min. 3 SELECiones',
    titleLines: ['mexico vs coreia +20%'],
    countdownLabel: '23h : 23m',
    rulesLabel: 'Ver reglas',
    glowImage: promoHighlightNbaGlow,
    accent: 'gold',
  },
  {
    id: 'draftea-nba-hot',
    type: 'missao',
    timeLabel: '23h : 23m',
    hasTimer: true,
    label: ['EM PARLAYS de Min. 8 SELECiones'],
    title: 'nba hot +80%',
    description: 'EM PARLAYS de Min. 8 SELECiones',
    image: promoHighlightFlamengoGlow,
    headline: 'EM PARLAYS de Min. 8 SELECiones',
    titleLines: ['nba hot +80%'],
    countdownLabel: '23h : 23m',
    rulesLabel: 'Ver reglas',
    glowImage: promoHighlightFlamengoGlow,
    accent: 'cyan',
  },
]

export const homeOfferCarouselItems: HomeOfferCarouselItem[] = [
  {
    id: 'craque-demais',
    title: 'Craque demais!',
    badge: 'GARANTIDA',
    badgeTone: 'garantida',
    matchup: 'REA vs ARS',
    dateLabel: '21/jan (15:00)',
    background: bgGarantida,
    odd: '1.75x',
    player: {
      name: 'K. Mbappé',
      teamName: 'Real Madrid',
      image: mbappeCard,
    },
    boost: {
      from: '3.5',
      to: '0.5+',
      marketLabel: 'Finalizações ao gol',
    },
    restrictions: ['Até R$50', '3+ seleções de 1.20+', 'Odd total mín. 3.50x'],
  },
  {
    id: 'combinada-top',
    title: 'Combinada top!',
    badge: 'SUPER COMBINADA',
    badgeTone: 'super-combinada',
    matchup: 'FCB vs SLB',
    dateLabel: '21/jan (15:00)',
    background: bgSuperCombinada,
    oldOdd: '4.30x',
    odd: '7.30x',
    legs: [
      { id: 'total-gols', icon: 'total-goals', label: 'Total de gols', detail: '2.5' },
      { id: 'lewandowski', image: escudoBarcelonaGde, label: 'R. Lewandowski', detail: '2.0+ Finalizações ao gol' },
      { id: 'yamal', image: escudoBarcelonaGde, label: 'L. Yamal', detail: 'Sim Para Marcar Gol' },
    ],
    footerAction: {
      label: 'Ver todos (5 )',
    },
  },
  {
    id: 'dobradinha-premier',
    title: 'Dobradinha da rodada',
    badge: 'COMBINADA',
    badgeTone: 'combinada',
    matchup: 'ARS vs CHE',
    dateLabel: '21/jan (17:30)',
    background: bgCombinada,
    odd: '3.10x',
    legs: [
      { id: 'arsenal-vence', image: escudoArsenal, label: 'Arsenal', detail: 'Vence a partida' },
      { id: 'total-gols-premier', icon: 'total-goals', label: 'Total de gols', detail: '1.5+' },
      { id: 'saka', image: escudoArsenal, label: 'B. Saka', detail: '1.0+ Finalizações ao gol' },
    ],
    footerAction: {
      label: 'Ver todos (5 )',
    },
  },
]

export const drafteaHomeOfferCarouselItems: HomeOfferCarouselItem[] = [
  ...homeOfferCarouselItems
    .filter((offer) => offer.badgeTone !== 'garantida')
    .map((offer) => {
      if (offer.badgeTone === 'super-combinada') {
        return { ...offer, badge: 'PROBABLE' }
      }

      if (offer.badgeTone === 'combinada') {
        return { ...offer, badge: 'MODERADA' }
      }

      return offer
    }),
  {
    id: 'draftea-nba-moderada',
    title: 'NBA moderada',
    badge: 'MODERADA',
    badgeTone: 'combinada',
    matchup: 'LAL vs GSW',
    dateLabel: '22/jan (21:30)',
    background: bgCombinada,
    odd: '4.10x',
    legs: [
      { id: 'draftea-nba-lebron-puntos', image: escudoLakers, label: 'LeBron James', detail: '25+ Puntos' },
      { id: 'draftea-nba-curry-triples', image: escudoWarriorsGde, label: 'Stephen Curry', detail: '4+ Triples' },
      { id: 'draftea-nba-lakers-gana', image: escudoLakers, label: 'Lakers', detail: 'Gana el partido' },
    ],
    footerAction: {
      label: 'Ver todos (5 )',
    },
  },
]

export const sportHomeOfferCarouselItemsBySport: Record<string, HomeOfferCarouselItem[]> = {
  futebol: [
    {
      id: 'sport-fut-super-raphinha',
      title: 'Tá voando!',
      badge: 'SUPER COMBINADA',
      badgeTone: 'super-combinada',
      matchup: 'FCB vs RMA',
      dateLabel: '11/set (16:00)',
      background: bgSuperCombinada,
      oldOdd: '2.85x',
      odd: '3.50x',
      legs: [
        { id: 'barcelona-vence-super', image: escudoBarcelonaGde, label: 'Barcelona', detail: 'Resultado Final' },
        { id: 'raphinha-finalizacoes-super', image: escudoBarcelonaGde, label: 'Raphinha', detail: '1.5+ Finalizações ao gol' },
        { id: 'real-gols-super', image: escudoRealGde, label: 'Real Madrid', detail: '0.5+ Gols' },
      ],
      footerAction: {
        label: 'Ver todos (5 )',
      },
    },
    {
      id: 'sport-fut-super-arrascaeta',
      title: 'Maestro em campo!',
      badge: 'SUPER COMBINADA',
      badgeTone: 'super-combinada',
      matchup: 'FLA vs CRU',
      dateLabel: 'Hoje',
      background: bgSuperCombinada,
      oldOdd: '3.20x',
      odd: '4.00x',
      legs: [
        { id: 'flamengo-vence-super', image: escudoFlamengoGde, label: 'Flamengo', detail: 'Resultado Final' },
        { id: 'arrascaeta-finalizacoes-super', image: escudoFlamengoGde, label: 'Arrascaeta', detail: '2.5+ Finalizações ao gol' },
        { id: 'cruzeiro-escanteios-super', image: escudoCruzeiro, label: 'Cruzeiro', detail: '3.5+ Escanteios' },
      ],
      footerAction: {
        label: 'Ver todos (5 )',
      },
    },
    {
      id: 'sport-fut-aumentada-lewa',
      title: 'Artilheiro na área!',
      badge: 'COMBINADA',
      badgeTone: 'combinada',
      matchup: 'FCB vs RMA',
      dateLabel: '11/set (16:00)',
      background: bgCombinada,
      oldOdd: '1.75x',
      odd: '2.10x',
      legs: [
        { id: 'lewandowski-gol-aumentada', image: escudoBarcelonaGde, label: 'R. Lewandowski', detail: 'Sim Para Marcar Gol' },
        { id: 'barcelona-gols-aumentada', image: escudoBarcelonaGde, label: 'Barcelona', detail: '1.5+ Gols' },
        { id: 'total-gols-aumentada', icon: 'total-goals', label: 'Total de gols', detail: '2.5+' },
      ],
      footerAction: {
        label: 'Ver todos (5 )',
      },
    },
    {
      id: 'sport-fut-combinada-classico',
      title: 'Clássico quente!',
      badge: 'COMBINADA',
      badgeTone: 'combinada',
      matchup: 'FLA vs CRU',
      dateLabel: 'Hoje',
      background: bgCombinada,
      odd: '4.25x',
      legs: [
        { id: 'flamengo-gols', image: escudoFlamengoGde, label: 'Flamengo', detail: '1.5+ Gols' },
        { id: 'kaio-jorge', image: escudoCruzeiro, label: 'Kaio Jorge', detail: 'Sim Para Marcar Gol' },
        { id: 'cruzeiro-escanteios', image: escudoCruzeiro, label: 'Cruzeiro', detail: '4.5+ Escanteios' },
      ],
      footerAction: {
        label: 'Ver todos (4 )',
      },
    },
  ],
  basquete: [
    {
      id: 'sport-bask-super-lebron',
      title: 'Favoritos da NBA!',
      badge: 'SUPER COMBINADA',
      badgeTone: 'super-combinada',
      matchup: 'NBA',
      dateLabel: 'Rodada completa',
      background: bgSuperCombinada,
      oldOdd: '5.90x',
      odd: '8.50x',
      legs: [
        { id: 'heat-vence-super', image: escudoMiami, label: 'Heat', detail: 'Resultado Final' },
        { id: 'lakers-vence-super', image: escudoLakers, label: 'Lakers', detail: 'Resultado Final' },
        { id: 'warriors-pontos-super', image: escudoWarriorsGde, label: 'Warriors', detail: '110.5+ Pontos' },
      ],
      footerAction: {
        label: 'Ver todos (5 )',
      },
    },
    {
      id: 'sport-bask-super-curry',
      title: 'Chef de três!',
      badge: 'SUPER COMBINADA',
      badgeTone: 'super-combinada',
      matchup: 'GSW vs LAL',
      dateLabel: '14/set (22:30)',
      background: bgSuperCombinada,
      oldOdd: '4.30x',
      odd: '7.30x',
      legs: [
        { id: 'curry-triplos-super', image: escudoWarriorsGde, label: 'Stephen Curry', detail: '5+ Cestas de 3' },
        { id: 'lebron-pontos-super', image: escudoLakers, label: 'LeBron James', detail: '30+ Pontos' },
        { id: 'warriors-vence-super', image: escudoWarriorsGde, label: 'Warriors', detail: 'Resultado Final' },
      ],
      footerAction: {
        label: 'Ver todos (5 )',
      },
    },
    {
      id: 'sport-bask-aumentada-curry',
      title: 'Splash Brothers!',
      badge: 'COMBINADA',
      badgeTone: 'combinada',
      matchup: 'GSW vs LAL',
      dateLabel: '14/set (22:30)',
      background: bgCombinada,
      oldOdd: '2.10x',
      odd: '2.70x',
      legs: [
        { id: 'warriors-triplos-aumentada', image: escudoWarriorsGde, label: 'Warriors', detail: '14.5+ Cestas de 3' },
        { id: 'curry-triplos-aumentada', image: escudoWarriorsGde, label: 'Stephen Curry', detail: '5+ Cestas de 3' },
        { id: 'lakers-pontos-aumentada', image: escudoLakers, label: 'Lakers', detail: '105.5+ Pontos' },
      ],
      footerAction: {
        label: 'Ver todos (5 )',
      },
    },
    {
      id: 'sport-bask-combinada-pontos',
      title: 'Noite de pontos!',
      badge: 'COMBINADA',
      badgeTone: 'combinada',
      matchup: 'NBA',
      dateLabel: 'Rodada completa',
      background: bgCombinada,
      oldOdd: '6.10x',
      odd: '7.80x',
      legs: [
        { id: 'lebron-pontos', image: escudoLakers, label: 'LeBron James', detail: '30+ Pontos' },
        { id: 'curry-triplos', image: escudoWarriorsGde, label: 'Stephen Curry', detail: '5+ Cestas de 3' },
        { id: 'jimmy-pontos', image: escudoMiami, label: 'Jimmy Butler', detail: '22+ Pontos' },
      ],
      footerAction: {
        label: 'Ver todos (5 )',
      },
    },
  ],
}

export const drafteaSportHomeOfferCarouselItemsBySport: Record<string, HomeOfferCarouselItem[]> =
  Object.fromEntries(
    Object.entries(sportHomeOfferCarouselItemsBySport).map(([sport, offers]) => [
      sport,
      offers.map((offer) => {
        if (offer.badgeTone === 'super-combinada') {
          return { ...offer, badge: 'PROBABLE' }
        }

        if (offer.badgeTone === 'combinada') {
          return { ...offer, badge: 'MODERADA' }
        }

        return offer
      }),
    ])
  ) as Record<string, HomeOfferCarouselItem[]>

export const homeCompetitionHighlight: HomeCompetitionHighlight = {
  title: 'Champions League',
  sportLabel: 'Futebol',
  matches: [
    {
      id: 'ucl-psg-city-live',
      homeTeam: 'Paris Saint-Germain',
      awayTeam: 'Manchester City',
      sport: 'futebol',
      homeScore: '2',
      awayScore: '1',
      marketLabel: 'RESULTADO FINAL',
      tags: ['90’'],
      footerLabel: '1T 34:22',
      live: true,
      liveClock: '1T 34:22',
      odds: [
        { label: 'PSG', value: '1.78x' },
        { label: 'EMPATE', value: '3.50x' },
        { label: 'MCI', value: '2.10x' },
      ],
    },
    {
      id: 'ucl-real-bayern',
      homeTeam: 'Real Madrid',
      awayTeam: 'Bayern',
      sport: 'futebol',
      marketLabel: 'RESULTADO FINAL',
      tags: ['PA', '90’'],
      footerLabel: '21/jan (15:00)',
      odds: [
        { label: 'RMA', value: '2.15x' },
        { label: 'EMPATE', value: '3.40x' },
        { label: 'BAY', value: '3.10x' },
      ],
    },
    {
      id: 'ucl-barca-inter',
      homeTeam: 'Barcelona',
      awayTeam: 'Inter',
      sport: 'futebol',
      marketLabel: 'RESULTADO FINAL',
      tags: ['PA', '90’'],
      footerLabel: '21/jan (15:00)',
      odds: [
        { label: 'BAR', value: '1.95x' },
        { label: 'EMPATE', value: '3.55x' },
        { label: 'INT', value: '3.75x' },
      ],
    },
  ],
  playerProps: [
    {
      id: 'prop-dembele',
      playerName: 'O. Dembele',
      position: 'ATA',
      marketLabel: 'Finalizações no Gol',
      matchLabel: 'PSG vs MCI',
      timeLabel: 'AO VIVO',
      teamName: 'Paris Saint-Germain',
      teamAbbreviation: 'PSG',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.53x' },
        { label: '2.0+', value: '2.12x' },
        { label: '3.0+', value: '4.20x' },
      ],
    },
    {
      id: 'prop-haaland',
      playerName: 'Haaland',
      position: 'ATA',
      marketLabel: 'Chutes Totais',
      matchLabel: 'PSG vs MCI',
      timeLabel: 'AO VIVO',
      teamName: 'Manchester City',
      teamAbbreviation: 'MCI',
      sport: 'futebol',
      odds: [
        { label: '2.0+', value: '1.44x' },
        { label: '3.0+', value: '2.08x' },
        { label: '4.0+', value: '3.55x' },
      ],
    },
    {
      id: 'prop-vini',
      playerName: 'Vini Jr.',
      position: 'ATA',
      marketLabel: 'Dribles Completos',
      matchLabel: 'RMA vs BAY',
      timeLabel: 'HOJE 15:00',
      teamName: 'Real Madrid',
      teamAbbreviation: 'RMA',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.48x' },
        { label: '2.0+', value: '2.35x' },
        { label: '3.0+', value: '4.75x' },
      ],
    },
    {
      id: 'prop-kane',
      playerName: 'H. Kane',
      position: 'ATA',
      marketLabel: 'Total de Gols',
      matchLabel: 'RMA vs BAY',
      timeLabel: 'HOJE 15:00',
      teamName: 'Bayern',
      teamAbbreviation: 'BAY',
      sport: 'futebol',
      odds: [
        { label: '0.5+', value: '2.05x' },
        { label: '1.0+', value: '4.10x' },
        { label: '2.0+', value: '9.80x' },
      ],
    },
    {
      id: 'prop-yamal',
      playerName: 'L. Yamal',
      position: 'ATA',
      marketLabel: 'Finalizações no Gol',
      matchLabel: 'BAR vs INT',
      timeLabel: 'HOJE 20:00',
      teamName: 'Barcelona',
      teamAbbreviation: 'BAR',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.53x' },
        { label: '2.0+', value: '2.05x' },
        { label: '3.0+', value: '3.80x' },
      ],
    },
    {
      id: 'prop-lautaro',
      playerName: 'Lautaro',
      position: 'ATA',
      marketLabel: 'Chutes Totais',
      matchLabel: 'BAR vs INT',
      timeLabel: 'HOJE 20:00',
      teamName: 'Inter',
      teamAbbreviation: 'INT',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.62x' },
        { label: '2.0+', value: '2.55x' },
        { label: '3.0+', value: '5.10x' },
      ],
    },
    {
      id: 'prop-mbappe',
      playerName: 'K. Mbappe',
      position: 'ATA',
      marketLabel: 'Chutes Totais',
      matchLabel: 'RMA vs BAY',
      timeLabel: 'HOJE 15:00',
      teamName: 'Real Madrid',
      teamAbbreviation: 'RMA',
      sport: 'futebol',
      odds: [
        { label: '2.0+', value: '1.42x' },
        { label: '3.0+', value: '2.18x' },
        { label: '4.0+', value: '3.95x' },
      ],
    },
    {
      id: 'prop-foden',
      playerName: 'P. Foden',
      position: 'MEI',
      marketLabel: 'Finalizações no Gol',
      matchLabel: 'PSG vs MCI',
      timeLabel: 'AO VIVO',
      teamName: 'Manchester City',
      teamAbbreviation: 'MCI',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.74x' },
        { label: '2.0+', value: '2.90x' },
        { label: '3.0+', value: '6.20x' },
      ],
    },
  ],
}

const championsLeagueAdditionalEventMatches = [
  {
    id: 'ucl-arsenal-liverpool',
    homeTeam: 'Arsenal',
    awayTeam: 'Liverpool',
    sport: 'futebol',
    marketLabel: 'RESULTADO FINAL',
    tags: ['PA', '90’'],
    footerLabel: '21/jan (17:30)',
    odds: [
      { label: 'ARS', value: '2.25x' },
      { label: 'EMPATE', value: '3.35x' },
      { label: 'LIV', value: '2.95x' },
    ],
  },
  {
    id: 'ucl-chelsea-napoli',
    homeTeam: 'Chelsea',
    awayTeam: 'Napoli',
    sport: 'futebol',
    marketLabel: 'RESULTADO FINAL',
    tags: ['PA', '90’'],
    footerLabel: '22/jan (15:00)',
    odds: [
      { label: 'CHE', value: '2.35x' },
      { label: 'EMPATE', value: '3.25x' },
      { label: 'NAP', value: '2.85x' },
    ],
  },
  {
    id: 'ucl-lyon-newcastle',
    homeTeam: 'Lyon',
    awayTeam: 'Newcastle',
    sport: 'futebol',
    marketLabel: 'RESULTADO FINAL',
    tags: ['PA', '90’'],
    footerLabel: '22/jan (17:30)',
    odds: [
      { label: 'LYO', value: '2.80x' },
      { label: 'EMPATE', value: '3.40x' },
      { label: 'NEW', value: '2.38x' },
    ],
  },
  {
    id: 'ucl-benfica-ajax',
    homeTeam: 'Benfica',
    awayTeam: 'Ajax',
    sport: 'futebol',
    marketLabel: 'RESULTADO FINAL',
    tags: ['PA', '90’'],
    footerLabel: '22/jan (15:00)',
    odds: [
      { label: 'BEN', value: '2.05x' },
      { label: 'EMPATE', value: '3.45x' },
      { label: 'AJX', value: '3.20x' },
    ],
  },
] satisfies HomeCompetitionMatch[]

export const championsLeagueEventMatches: HomeCompetitionMatch[] = [
  ...homeCompetitionHighlight.matches,
  ...championsLeagueAdditionalEventMatches,
]

export const premierLeagueCompetitionHighlight: HomeCompetitionHighlight = {
  title: 'Premier League',
  sportLabel: 'Futebol',
  matches: [
    {
      id: 'pl-arsenal-chelsea',
      homeTeam: 'Arsenal',
      awayTeam: 'Chelsea',
      sport: 'futebol',
      marketLabel: 'RESULTADO FINAL',
      tags: ['PA', '90’'],
      footerLabel: '21/jan (15:00)',
      odds: [
        { label: 'ARS', value: '2.28x' },
        { label: 'EMPATE', value: '3.45x' },
        { label: 'CHE', value: '2.95x' },
      ],
    },
    {
      id: 'pl-liverpool-tottenham',
      homeTeam: 'Liverpool',
      awayTeam: 'Tottenham',
      sport: 'futebol',
      marketLabel: 'RESULTADO FINAL',
      tags: ['PA', '90’'],
      footerLabel: '21/jan (17:30)',
      odds: [
        { label: 'LIV', value: '1.88x' },
        { label: 'EMPATE', value: '3.70x' },
        { label: 'TOT', value: '3.90x' },
      ],
    },
    {
      id: 'pl-newcastle-aston-villa',
      homeTeam: 'Newcastle',
      awayTeam: 'Aston Villa',
      sport: 'futebol',
      marketLabel: 'RESULTADO FINAL',
      tags: ['PA', '90’'],
      footerLabel: '22/jan (12:30)',
      odds: [
        { label: 'NEW', value: '2.10x' },
        { label: 'EMPATE', value: '3.35x' },
        { label: 'AVL', value: '3.25x' },
      ],
    },
  ],
  playerProps: [
    {
      id: 'pl-prop-saka',
      playerName: 'B. Saka',
      position: 'ATA',
      marketLabel: 'Finalizações no Gol',
      matchLabel: 'ARS vs CHE',
      timeLabel: 'HOJE 15:00',
      teamName: 'Arsenal',
      teamAbbreviation: 'ARS',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.58x' },
        { label: '2.0+', value: '2.22x' },
        { label: '3.0+', value: '4.10x' },
      ],
    },
    {
      id: 'pl-prop-palmer',
      playerName: 'C. Palmer',
      position: 'MEI',
      marketLabel: 'Chutes Totais',
      matchLabel: 'ARS vs CHE',
      timeLabel: 'HOJE 15:00',
      teamName: 'Chelsea',
      teamAbbreviation: 'CHE',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.46x' },
        { label: '2.0+', value: '2.18x' },
        { label: '3.0+', value: '4.45x' },
      ],
    },
    {
      id: 'pl-prop-salah',
      playerName: 'M. Salah',
      position: 'ATA',
      marketLabel: 'Total de Gols',
      matchLabel: 'LIV vs TOT',
      timeLabel: 'HOJE 17:30',
      teamName: 'Liverpool',
      teamAbbreviation: 'LIV',
      sport: 'futebol',
      odds: [
        { label: '0.5+', value: '2.05x' },
        { label: '1.0+', value: '4.20x' },
        { label: '2.0+', value: '10.50x' },
      ],
    },
    {
      id: 'pl-prop-son',
      playerName: 'Son',
      position: 'ATA',
      marketLabel: 'Finalizações no Gol',
      matchLabel: 'LIV vs TOT',
      timeLabel: 'HOJE 17:30',
      teamName: 'Tottenham',
      teamAbbreviation: 'TOT',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.72x' },
        { label: '2.0+', value: '2.85x' },
        { label: '3.0+', value: '5.80x' },
      ],
    },
    {
      id: 'pl-prop-isak',
      playerName: 'A. Isak',
      position: 'ATA',
      marketLabel: 'Chutes Totais',
      matchLabel: 'NEW vs AVL',
      timeLabel: 'AMANHÃ 12:30',
      teamName: 'Newcastle',
      teamAbbreviation: 'NEW',
      sport: 'futebol',
      odds: [
        { label: '2.0+', value: '1.62x' },
        { label: '3.0+', value: '2.38x' },
        { label: '4.0+', value: '4.75x' },
      ],
    },
    {
      id: 'pl-prop-watkins',
      playerName: 'Watkins',
      position: 'ATA',
      marketLabel: 'Total de Gols',
      matchLabel: 'NEW vs AVL',
      timeLabel: 'AMANHÃ 12:30',
      teamName: 'Aston Villa',
      teamAbbreviation: 'AVL',
      sport: 'futebol',
      odds: [
        { label: '0.5+', value: '2.35x' },
        { label: '1.0+', value: '5.10x' },
        { label: '2.0+', value: '13.00x' },
      ],
    },
    {
      id: 'pl-prop-havertz',
      playerName: 'K. Havertz',
      position: 'ATA',
      marketLabel: 'Finalizações no Gol',
      matchLabel: 'ARS vs CHE',
      timeLabel: 'HOJE 15:00',
      teamName: 'Arsenal',
      teamAbbreviation: 'ARS',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.66x' },
        { label: '2.0+', value: '2.70x' },
        { label: '3.0+', value: '5.60x' },
      ],
    },
    {
      id: 'pl-prop-gordon',
      playerName: 'A. Gordon',
      position: 'ATA',
      marketLabel: 'Chutes Totais',
      matchLabel: 'NEW vs AVL',
      timeLabel: 'AMANHÃ 12:30',
      teamName: 'Newcastle',
      teamAbbreviation: 'NEW',
      sport: 'futebol',
      odds: [
        { label: '1.0+', value: '1.44x' },
        { label: '2.0+', value: '2.12x' },
        { label: '3.0+', value: '4.40x' },
      ],
    },
  ],
}

export const nbaCompetitionHighlight: HomeCompetitionHighlight = {
  title: 'NBA',
  sportLabel: 'Basquete',
  matches: [
    {
      id: 'nba-jazz-thunder-live',
      homeTeam: 'Utah Jazz',
      awayTeam: 'Oklahoma City Thunder',
      sport: 'basquete',
      homeScore: '8',
      awayScore: '11',
      marketLabel: 'NBA',
      tags: [],
      footerLabel: 'Intervalo',
      live: true,
      liveClock: 'Intervalo',
      marketColumns: [
        {
          label: 'Vencer',
          homeOdd: { label: 'UTA', value: '3.10x' },
          awayOdd: { label: 'OKC', value: '1.36x' },
        },
        {
          label: 'Handicap',
          homeOdd: { label: 'UTA +7.5', value: '1.91x' },
          awayOdd: { label: 'OKC -7.5', value: '1.91x' },
        },
        {
          label: 'Total',
          homeOdd: { label: '221.5+', value: '1.86x' },
          awayOdd: { label: '221.5-', value: '1.95x' },
        },
      ],
      odds: [
        { label: 'UTA', value: '3.10x' },
        { label: 'OKC', value: '1.36x' },
        { label: 'TOTAL', value: '1.86x' },
      ],
    },
    {
      id: 'nba-knicks-magic',
      homeTeam: 'New York Knicks',
      awayTeam: 'Orlando Magic',
      sport: 'basquete',
      marketLabel: 'NBA',
      tags: [],
      footerLabel: '21/jan (15:00)',
      marketColumns: [
        {
          label: 'Vencer',
          tag: 'PA',
          homeOdd: { label: 'NYK', value: '1.72x' },
          awayOdd: { label: 'ORL', value: '2.15x' },
        },
        {
          label: 'Handicap',
          homeOdd: { label: 'NYK -4.5', value: '1.93x' },
          awayOdd: { label: 'ORL +4.5', value: '1.88x' },
        },
        {
          label: 'Total',
          homeOdd: { label: '212.5+', value: '1.90x' },
          awayOdd: { label: '212.5-', value: '1.90x' },
        },
      ],
      odds: [
        { label: 'NYK', value: '1.72x' },
        { label: 'ORL', value: '2.15x' },
        { label: 'TOTAL', value: '1.90x' },
      ],
    },
    {
      id: 'nba-bulls-heat',
      homeTeam: 'Chicago Bulls',
      awayTeam: 'Miami Heat',
      sport: 'basquete',
      marketLabel: 'NBA',
      tags: [],
      footerLabel: '21/jan (17:30)',
      marketColumns: [
        {
          label: 'Vencer',
          tag: 'PA',
          homeOdd: { label: 'CHI', value: '2.45x' },
          awayOdd: { label: 'MIA', value: '1.58x' },
        },
        {
          label: 'Handicap',
          homeOdd: { label: 'CHI +5.5', value: '1.87x' },
          awayOdd: { label: 'MIA -5.5', value: '1.94x' },
        },
        {
          label: 'Total',
          homeOdd: { label: '218.5+', value: '1.89x' },
          awayOdd: { label: '218.5-', value: '1.92x' },
        },
      ],
      odds: [
        { label: 'CHI', value: '2.45x' },
        { label: 'MIA', value: '1.58x' },
        { label: 'TOTAL', value: '1.89x' },
      ],
    },
  ],
  playerProps: [
    {
      id: 'nba-prop-markkanen',
      playerName: 'L. Markkanen',
      position: 'ALA',
      marketLabel: 'Pontos',
      matchLabel: 'UTA vs OKC',
      timeLabel: 'AO VIVO',
      teamName: 'Utah Jazz',
      teamAbbreviation: 'UTA',
      sport: 'basquete',
      odds: [
        { label: '18.0+', value: '1.58x' },
        { label: '22.0+', value: '2.05x' },
        { label: '26.0+', value: '3.25x' },
      ],
    },
    {
      id: 'nba-prop-shai',
      playerName: 'S. Gilgeous-Alexander',
      position: 'ARM',
      marketLabel: 'Pontos',
      matchLabel: 'UTA vs OKC',
      timeLabel: 'AO VIVO',
      teamName: 'Oklahoma City Thunder',
      teamAbbreviation: 'OKC',
      sport: 'basquete',
      odds: [
        { label: '25.0+', value: '1.50x' },
        { label: '30.0+', value: '2.12x' },
        { label: '35.0+', value: '3.90x' },
      ],
    },
    {
      id: 'nba-prop-brunson',
      playerName: 'J. Brunson',
      position: 'ARM',
      marketLabel: 'Assistências',
      matchLabel: 'NYK vs ORL',
      timeLabel: 'HOJE 15:00',
      teamName: 'New York Knicks',
      teamAbbreviation: 'NYK',
      sport: 'basquete',
      odds: [
        { label: '5.0+', value: '1.48x' },
        { label: '7.0+', value: '2.22x' },
        { label: '9.0+', value: '4.15x' },
      ],
    },
    {
      id: 'nba-prop-banchero',
      playerName: 'P. Banchero',
      position: 'ALA',
      marketLabel: 'Rebotes',
      matchLabel: 'NYK vs ORL',
      timeLabel: 'HOJE 15:00',
      teamName: 'Orlando Magic',
      teamAbbreviation: 'ORL',
      sport: 'basquete',
      odds: [
        { label: '5.0+', value: '1.54x' },
        { label: '7.0+', value: '2.30x' },
        { label: '9.0+', value: '4.35x' },
      ],
    },
    {
      id: 'nba-prop-lavine',
      playerName: 'Z. LaVine',
      position: 'ALA',
      marketLabel: 'Pontos',
      matchLabel: 'CHI vs MIA',
      timeLabel: 'HOJE 17:30',
      teamName: 'Chicago Bulls',
      teamAbbreviation: 'CHI',
      sport: 'basquete',
      odds: [
        { label: '18.0+', value: '1.60x' },
        { label: '22.0+', value: '2.18x' },
        { label: '26.0+', value: '3.70x' },
      ],
    },
    {
      id: 'nba-prop-butler',
      playerName: 'J. Butler',
      position: 'ALA',
      marketLabel: 'Assistências',
      matchLabel: 'MIA vs CHI',
      timeLabel: 'HOJE 17:30',
      teamName: 'Miami Heat',
      teamAbbreviation: 'MIA',
      sport: 'basquete',
      odds: [
        { label: '4.0+', value: '1.62x' },
        { label: '6.0+', value: '2.48x' },
        { label: '8.0+', value: '4.90x' },
      ],
    },
    {
      id: 'nba-prop-randle',
      playerName: 'J. Randle',
      position: 'ALA',
      marketLabel: 'Rebotes',
      matchLabel: 'NYK vs ORL',
      timeLabel: 'HOJE 15:00',
      teamName: 'New York Knicks',
      teamAbbreviation: 'NYK',
      sport: 'basquete',
      odds: [
        { label: '6.0+', value: '1.57x' },
        { label: '8.0+', value: '2.25x' },
        { label: '10.0+', value: '4.05x' },
      ],
    },
    {
      id: 'nba-prop-herro',
      playerName: 'T. Herro',
      position: 'ARM',
      marketLabel: 'Pontos',
      matchLabel: 'MIA vs CHI',
      timeLabel: 'HOJE 17:30',
      teamName: 'Miami Heat',
      teamAbbreviation: 'MIA',
      sport: 'basquete',
      odds: [
        { label: '16.0+', value: '1.52x' },
        { label: '20.0+', value: '2.18x' },
        { label: '24.0+', value: '3.95x' },
      ],
    },
  ],
}

export const homeCompetitionHighlights: HomeCompetitionHighlight[] = [
  homeCompetitionHighlight,
  premierLeagueCompetitionHighlight,
  nbaCompetitionHighlight,
]

export const casinoPromotions: Promotion[] = [
  {
    id: 'casino-1',
    type: 'missao',
    timeLabel: 'Missão',
    hasTimer: true,
    label: ['Progresso:', 'R$0 de R$100'],
    title: 'Fortune Rabbit',
    description: 'Aposte R$100 no jogo Fortune Rabbit e ganhe mais 50 coroas.',
    image: imgPromoRabbit,
  },
  {
    id: 'casino-2',
    type: 'missao',
    timeLabel: 'Missão',
    hasTimer: true,
    label: ['Missão'],
    title: 'Lucky Piggy',
    description: 'Aposte R$100 no jogo Lucky Piggy e ganhe 20 coroas.',
    image: imgPromoPiggy,
  },
  {
    id: 'casino-3',
    type: 'missao',
    timeLabel: 'Missão',
    hasTimer: true,
    label: ['Missão'],
    title: 'Ratinho Sortudo',
    description: 'Aposte R$20 no jogo do Ratinho Sortudo e ganhe 5 Rodadas Grátis.',
    image: imgRatinho,
  },
  {
    id: 'casino-4',
    type: 'vantagem',
    timeLabel: 'Só no Rei',
    hasTimer: false,
    label: ['Tesouro', 'do Pitaco'],
    title: 'Tesouro do Pitaco',
    description: 'Quanto mais você jogar mais chaves irá conseguir.',
    image: imgTesouroRei,
  },
]

export const casinoRailSections: ProductRailSection<CasinoRailItem>[] = [
  {
    id: 'destaques',
    className: 'sport-rail__section--lead',
    items: [
      {
        id: 'casino:destaques',
        categoryId: 'destaques',
        icon: iconDestaque,
        label: 'Destaques',
        clickable: true,
      },
    ],
  },
  {
    id: 'cassino',
    className: 'sport-rail__section--divided',
    items: [
      {
        id: 'casino:slots',
        categoryId: 'slots',
        icon: iconSlots,
        label: 'Slots',
        clickable: true,
      },
      {
        id: 'casino:crash',
        categoryId: 'crash',
        icon: iconCrash,
        label: 'Crash',
        clickable: true,
      },
    ],
  },
  {
    id: 'cassino-ao-vivo',
    className: 'sport-rail__section--divided',
    items: [
      {
        id: 'casino:ao-vivo',
        categoryId: 'ao-vivo',
        icon: iconCasino,
        label: 'Ao Vivo',
        clickable: true,
      },
      {
        id: 'casino:roletas',
        categoryId: 'roletas',
        icon: iconRoleta,
        label: 'Roleta',
        clickable: true,
      },
      {
        id: 'casino:blackjack',
        categoryId: 'blackjack',
        icon: iconBlackjack,
        label: 'BlackJack',
        clickable: true,
      },
    ],
  },
  {
    id: 'provedores',
    className: 'sport-rail__section--divided',
    items: [
      {
        id: 'casino:provedores',
        categoryId: 'provedores',
        icon: iconProvedores,
        label: 'Provedores',
        clickable: true,
      },
    ],
  },
  {
    id: 'mais-cassino',
    className: 'sport-rail__section--tail',
    items: [
      {
        id: 'casino:mais',
        categoryId: 'destaques',
        icon: iconMore,
        label: 'Mais',
        clickable: true,
        isMore: true,
      },
    ],
  },
]

export const casinoGameSections: CasinoGameSection[] = [
  {
    id: 'mais-jogados',
    title: 'Mais jogados',
    categoryIds: ['destaques', 'slots'],
    games: [
      { id: 'fortune-tiger', name: 'Fortune Tiger', provider: 'PG Soft', image: imgTigrinho, categoryIds: ['destaques', 'slots'] },
      { id: 'fortune-rabbit', name: 'Fortune Rabbit', provider: 'PG Soft', image: imgRabbit, categoryIds: ['destaques', 'slots'] },
      { id: 'aviator', name: 'Aviator', provider: 'Spribe', image: imgAviator, categoryIds: ['destaques', 'crash'] },
      { id: 'ratinho', name: 'Ratinho Sortudo', provider: 'Pragmatic', image: imgRatinho, categoryIds: ['destaques', 'slots'] },
    ],
  },
  {
    id: 'cassino-ao-vivo',
    title: 'Cassino ao vivo',
    categoryIds: ['destaques', 'ao-vivo', 'roletas'],
    games: [
      { id: 'roleta-sorte', name: 'Roleta da Sorte', provider: 'Evolution', image: imgRoletaSorte, categoryIds: ['destaques', 'ao-vivo', 'roletas'], isLive: true },
      { id: 'futebol-studio', name: 'Futebol Studio', provider: 'Evolution', image: imgFutebolStudio, categoryIds: ['destaques', 'ao-vivo'], isLive: true },
      { id: 'fortune-live', name: 'Fortune Ao Vivo', provider: 'Playtech', image: imgJogoFortune, categoryIds: ['ao-vivo', 'slots'], isLive: true },
    ],
  },
  {
    id: 'crash-e-rapidos',
    title: 'Crash e jogos rápidos',
    categoryIds: ['destaques', 'crash'],
    games: [
      { id: 'aviator-rapido', name: 'Aviator Turbo', provider: 'Spribe', image: imgAviator, categoryIds: ['destaques', 'crash'] },
      { id: 'macaco-sortudo', name: 'Macaco Sortudo', provider: 'Rei Games', image: imgJogoMacaco, categoryIds: ['crash', 'slots'] },
      { id: 'fortune-rush', name: 'Fortune Rush', provider: 'Wazdan', image: imgJogoFortune, categoryIds: ['crash', 'promocoes'] },
    ],
  },
  {
    id: 'promocoes-cassino',
    title: 'Jogos com promoção',
    categoryIds: ['destaques', 'promocoes'],
    games: [
      { id: 'rabbit-bonus', name: 'Rabbit Bonus', provider: 'PG Soft', image: imgPromoRabbit, categoryIds: ['destaques', 'promocoes', 'slots'] },
      { id: 'piggy-bank', name: 'Piggy Bank', provider: 'Wazdan', image: imgPromoPiggy, categoryIds: ['promocoes', 'slots'] },
      { id: 'wazdan-torneio', name: 'Wazdan Torneio', provider: 'Wazdan', image: imgTorneioWazdan, categoryIds: ['promocoes'] },
    ],
  },
]
