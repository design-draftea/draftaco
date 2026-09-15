import { useState, useEffect, useRef } from 'react'
import { CaretRightIcon, CaretUpIcon } from '@phosphor-icons/react'
import './LiveSection.css'
import { LiveMatchCard } from '../LiveMatchCard'
import type { LiveEventMatch, LiveEventOpenPayload } from '../../features/sports/LiveEventPage'
import { getTeamLogo } from '../../data/teamLogos'
import { useHomeMarketStickyState } from '../../shared/hooks/useHomeMarketStickyVisible'
import { useSlidingActiveIndicator } from '../../shared/hooks/useSlidingActiveIndicator'
import {
  getCompetitionLinkTarget,
  type CompetitionLinkTarget,
} from '../../shared/utils/competitionNavigation'
import { updateLiveClock } from '../../shared/utils/liveClock'

import iconBasquete from '../../assets/iconSports/basketball.png'
import iconEsoccer from '../../assets/iconSports/e-soccer.png'
import iconFutebol from '../../assets/iconSports/soccer.png'
import iconTenis from '../../assets/iconSports/tennis.png'
import iconVolei from '../../assets/iconSports/volleyball.png'
import flagBrasil from '../../assets/iconPaises/brasil.png'
import flagMundo from '../../assets/iconPaises/mundo.png'
import flagArgentina from '../../assets/iconPaises/argentina.png'
import flagUSA from '../../assets/iconPaises/estados-unidos.png'
import escudoFlamengo from '../../assets/escudoFlamengo.png'
import escudoCruzeiro from '../../assets/escudoCruzeiro.png'
import escudoInter from '../../assets/escudoInter.png'
import escudoBragantino from '../../assets/escudoBragantino.png'
import escudoAtleticoMadrid from '../../assets/escudoAtleticoMadrid.png'
import escudoInterItalia from '../../assets/escudoInterItalia.png'
import escudoPSG from '../../assets/escudoPSG.png'
import escudoLyon from '../../assets/escudoLyon.png'
import escudoBocaJr from '../../assets/escudoBocaJr.png'
import escudoArgentinoJrs from '../../assets/escudoArgentinoJrs.png'
import escudoRacing from '../../assets/escudoRacing.png'
import escudoRiverPlate from '../../assets/escudoRiverPlate.png'
import escudoInterMiami from '../../assets/escudoInterMiami.png'
import escudoWhitecaps from '../../assets/escudoWhitecaps.png'
import escudoCincinnati from '../../assets/escudoCincinnati.png'
import escudoChicagoFire from '../../assets/escudoChicagoFire.png'
import escudoDinamo from '../../assets/escudoDinamo.png'
import escudoAstonVila from '../../assets/escudoAstonVila.png'
import escudoFenerbahce from '../../assets/escudoFenerbahce.png'
import escudoPorto from '../../assets/escudoPorto.png'
import escudoMirasol from '../../assets/escudoMirasol.png'
import escudoSaoPaulo from '../../assets/escudoSaoPaulo.png'
import escudoNewcastle from '../../assets/escudoNewcastle.png'
import escudoNapoli from '../../assets/escudoNapoli.png'
import escudoSanLorenzo from '../../assets/escudoSanLorenzo.png'
import escudoCordoba from '../../assets/escudoCordoba.png'
import escudoNashville from '../../assets/escudoNashiville.png'
import escudoNewYorkCity from '../../assets/escudoNewYorkCity.png'
import escudoPanathinaikos from '../../assets/escudoPanathinaikos.png'
import escudoNottinghamForest from '../../assets/escudoNottinghamForest.png'
// NBA Teams
import escudoJazz from '../../assets/escudoJazz.png'
import escudoThunder from '../../assets/escudoThunder.png'
import escudoKnicks from '../../assets/escudoKnics.png'
import escudoMagic from '../../assets/escudoMagic.png'
import escudoKennesaw from '../../assets/escudoKennesaw.png'
import escudoWesleyan from '../../assets/escudoWesleyan.png'
// Basketball Flags
import flagGrecia from '../../assets/iconPaises/grecia.png'
import flagItalia from '../../assets/iconPaises/italia.png'
import flagBulgaria from '../../assets/iconPaises/bulgaria.png'
interface SportChip {
  id: string
  icon: string
  label: string
  disabled?: boolean
}

interface MarketChip {
  id: string
  label: string
}

interface Team {
  name: string
  icon: string
  score: number
}

interface Match {
  id: string
  time: string
  status?: 'running' | 'halftime' // halftime = Intervalo
  homeTeam: Team
  awayTeam: Team
  odds: {
    home: string
    draw?: string
    away: string
  }
  doubleChanceOdds?: {
    homeOrDraw: string
    homeOrAway: string
    awayOrDraw: string
  }
  extraBets?: number // Número de apostas extras (+2, +20, etc)
  bothTeamsScoreOdds?: {
    yes: string
    no: string
  }
  totalGoalsOdds?: {
    line: number
    under: string
    over: string
  }
  totalCornersOdds?: {
    line: number
    under: string
    over: string
  }
  // Basketball specific
  totalPointsOdds?: {
    line: number
    under: string
    over: string
  }
  handicapOdds?: {
    line: number
    home: string
    away: string
  }
  q3TotalOdds?: {
    line: number
    under: string
    over: string
  }
  q4TotalOdds?: {
    line: number
    under: string
    over: string
  }
}

interface League {
  id: string
  name: string
  flag: string
  isOpen: boolean
  matches: Match[]
  sport: string
}

const sportChips: SportChip[] = [
  { id: 'futebol', icon: iconFutebol, label: 'Futebol' },
  { id: 'basquete', icon: iconBasquete, label: 'Basquete' },
  { id: 'tenis', icon: iconTenis, label: 'Tênis', disabled: true },
  { id: 'volei', icon: iconVolei, label: 'Vôlei', disabled: true },
  { id: 'esoccer', icon: iconEsoccer, label: 'Esoccer', disabled: true },
]

const footballMarketChips: MarketChip[] = [
  { id: 'resultado-final', label: 'Resultado Final' },
  { id: 'finalizacao-gol', label: 'Finalizações ao Gol' },
  { id: 'dupla-chance', label: 'Dupla Chance' },
  { id: 'assistencias', label: 'Assistências' },
  { id: 'ambos-marcam', label: 'Ambos Marcam' },
  { id: 'total-gols', label: 'Total de Gols' },
  { id: 'escanteios', label: 'Total de Escanteios' },
]

const basketballMarketChips: MarketChip[] = [
  { id: 'vencedor', label: 'Resultado Final' },
  { id: 'pontos-jogador', label: 'Pontos do Jogador' },
  { id: 'total-pontos', label: 'Total de Pontos' },
  { id: 'assistencias', label: 'Assistências' },
  { id: 'handicap', label: 'Handicap' },
  { id: 'q3-total', label: '3° Quarto - Total de Pontos' },
  { id: 'q4-total', label: '4° Quarto - Total de Pontos' },
]

const liveEventSports = new Set(['futebol', 'basquete'])

const leagues: League[] = [
  {
    id: 'brasil-serie-a',
    name: 'Brasil - Série A',
    flag: flagBrasil,
    isOpen: true,
    sport: 'futebol',
    matches: [
      {
        id: '1',
        time: '2T 22:12',
        homeTeam: { name: 'Flamengo', icon: getTeamLogo("Flamengo", escudoFlamengo), score: 2 },
        awayTeam: { name: 'Cruzeiro', icon: getTeamLogo("Cruzeiro", escudoCruzeiro), score: 1 },
        odds: { home: '1.25x', draw: '5.50x', away: '9.00x' },
        doubleChanceOdds: { homeOrDraw: '1.10x', homeOrAway: '1.15x', awayOrDraw: '3.20x' },
        bothTeamsScoreOdds: { yes: '1.45x', no: '2.60x' },
        totalGoalsOdds: { line: 3.5, under: '1.35x', over: '3.10x' },
        totalCornersOdds: { line: 9.5, under: '1.75x', over: '2.00x' },
        extraBets: 2,
      },
      {
        id: '2',
        time: '1T 38:45',
        homeTeam: { name: 'Internacional', icon: getTeamLogo("Internacional", escudoInter), score: 1 },
        awayTeam: { name: 'Bragantino', icon: getTeamLogo("Bragantino", escudoBragantino), score: 1 },
        odds: { home: '2.10x', draw: '3.40x', away: '3.25x' },
        doubleChanceOdds: { homeOrDraw: '1.30x', homeOrAway: '1.28x', awayOrDraw: '1.65x' },
        bothTeamsScoreOdds: { yes: '1.55x', no: '2.30x' },
        totalGoalsOdds: { line: 2.5, under: '1.50x', over: '2.50x' },
        totalCornersOdds: { line: 9.5, under: '1.85x', over: '1.90x' },
      },
      {
        id: '11',
        time: 'Intervalo',
        status: 'halftime',
        homeTeam: { name: 'Mirassol', icon: getTeamLogo("Mirassol", escudoMirasol), score: 0 },
        awayTeam: { name: 'São Paulo', icon: getTeamLogo("São Paulo", escudoSaoPaulo), score: 1 },
        odds: { home: '4.50x', draw: '3.80x', away: '1.70x' },
        doubleChanceOdds: { homeOrDraw: '2.05x', homeOrAway: '1.25x', awayOrDraw: '1.18x' },
        bothTeamsScoreOdds: { yes: '1.85x', no: '1.90x' },
        totalGoalsOdds: { line: 2.5, under: '1.75x', over: '2.00x' },
        totalCornersOdds: { line: 9.5, under: '1.90x', over: '1.85x' },
        extraBets: 2,
      },
    ],
  },
  {
    id: 'champions-league',
    name: 'Champions League',
    flag: flagMundo,
    isOpen: true,
    sport: 'futebol',
    matches: [
      {
        id: '3',
        time: '1T 12:23',
        homeTeam: { name: 'Atlético Madrid', icon: getTeamLogo("Atlético Madrid", escudoAtleticoMadrid), score: 0 },
        awayTeam: { name: 'Inter', icon: getTeamLogo("Inter", escudoInterItalia), score: 0 },
        odds: { home: '2.35x', draw: '3.20x', away: '2.90x' },
        doubleChanceOdds: { homeOrDraw: '1.35x', homeOrAway: '1.30x', awayOrDraw: '1.52x' },
        bothTeamsScoreOdds: { yes: '1.70x', no: '2.05x' },
        totalGoalsOdds: { line: 2.5, under: '1.90x', over: '1.85x' },
        totalCornersOdds: { line: 10.5, under: '1.80x', over: '1.95x' },
      },
      {
        id: '4',
        time: '2T 34:15',
        homeTeam: { name: 'PSG', icon: getTeamLogo("PSG", escudoPSG), score: 2 },
        awayTeam: { name: 'Lyon', icon: getTeamLogo("Lyon", escudoLyon), score: 2 },
        odds: { home: '1.65x', draw: '4.00x', away: '4.75x' },
        doubleChanceOdds: { homeOrDraw: '1.18x', homeOrAway: '1.22x', awayOrDraw: '2.15x' },
        bothTeamsScoreOdds: { yes: '1.40x', no: '2.85x' },
        totalGoalsOdds: { line: 4.5, under: '1.45x', over: '2.70x' },
        totalCornersOdds: { line: 10.5, under: '1.70x', over: '2.05x' },
      },
      {
        id: '12',
        time: '1T 08:47',
        homeTeam: { name: 'Newcastle', icon: getTeamLogo("Newcastle", escudoNewcastle), score: 0 },
        awayTeam: { name: 'Napoli', icon: getTeamLogo("Napoli", escudoNapoli), score: 0 },
        odds: { home: '2.60x', draw: '3.30x', away: '2.70x' },
        doubleChanceOdds: { homeOrDraw: '1.45x', homeOrAway: '1.32x', awayOrDraw: '1.48x' },
        bothTeamsScoreOdds: { yes: '1.75x', no: '2.00x' },
        totalGoalsOdds: { line: 2.5, under: '1.85x', over: '1.90x' },
        totalCornersOdds: { line: 10.5, under: '1.88x', over: '1.88x' },
      },
    ],
  },
  {
    id: 'argentina',
    name: 'Argentina - Liga Profesional',
    flag: flagArgentina,
    isOpen: false,
    sport: 'futebol',
    matches: [
      {
        id: '5',
        time: '2T 18:32',
        homeTeam: { name: 'Boca Juniors', icon: getTeamLogo("Boca Juniors", escudoBocaJr), score: 3 },
        awayTeam: { name: 'Argentinos Jrs', icon: getTeamLogo("Argentinos Jrs", escudoArgentinoJrs), score: 0 },
        odds: { home: '1.15x', draw: '6.50x', away: '12.00x' },
        doubleChanceOdds: { homeOrDraw: '1.05x', homeOrAway: '1.10x', awayOrDraw: '4.50x' },
        bothTeamsScoreOdds: { yes: '2.20x', no: '1.60x' },
        totalGoalsOdds: { line: 3.5, under: '1.55x', over: '2.40x' },
        totalCornersOdds: { line: 9.5, under: '1.82x', over: '1.92x' },
      },
      {
        id: '6',
        time: '2T 05:47',
        homeTeam: { name: 'Racing', icon: getTeamLogo("Racing", escudoRacing), score: 0 },
        awayTeam: { name: 'River Plate', icon: getTeamLogo("River Plate", escudoRiverPlate), score: 0 },
        odds: { home: '2.80x', draw: '3.10x', away: '2.45x' },
        doubleChanceOdds: { homeOrDraw: '1.48x', homeOrAway: '1.32x', awayOrDraw: '1.38x' },
        bothTeamsScoreOdds: { yes: '1.80x', no: '1.95x' },
        totalGoalsOdds: { line: 1.5, under: '1.70x', over: '2.10x' },
        totalCornersOdds: { line: 8.5, under: '1.75x', over: '2.00x' },
      },
      {
        id: '13',
        time: '1T 25:18',
        homeTeam: { name: 'San Lorenzo', icon: getTeamLogo("San Lorenzo", escudoSanLorenzo), score: 1 },
        awayTeam: { name: 'Córdoba', icon: getTeamLogo("Córdoba", escudoCordoba), score: 0 },
        odds: { home: '1.95x', draw: '3.40x', away: '3.90x' },
        doubleChanceOdds: { homeOrDraw: '1.25x', homeOrAway: '1.30x', awayOrDraw: '1.82x' },
        bothTeamsScoreOdds: { yes: '1.90x', no: '1.85x' },
        totalGoalsOdds: { line: 2.5, under: '1.65x', over: '2.20x' },
        totalCornersOdds: { line: 9.5, under: '1.85x', over: '1.90x' },
      },
    ],
  },
  {
    id: 'mls',
    name: 'EUA - MLS',
    flag: flagUSA,
    isOpen: false,
    sport: 'futebol',
    matches: [
      {
        id: '7',
        time: '1T 28:14',
        homeTeam: { name: 'Inter Miami', icon: getTeamLogo("Inter Miami", escudoInterMiami), score: 1 },
        awayTeam: { name: 'Whitecaps', icon: getTeamLogo("Whitecaps", escudoWhitecaps), score: 0 },
        odds: { home: '1.40x', draw: '4.50x', away: '6.25x' },
        doubleChanceOdds: { homeOrDraw: '1.12x', homeOrAway: '1.18x', awayOrDraw: '2.55x' },
        bothTeamsScoreOdds: { yes: '1.95x', no: '1.80x' },
        totalGoalsOdds: { line: 2.5, under: '1.80x', over: '1.95x' },
        totalCornersOdds: { line: 9.5, under: '1.90x', over: '1.85x' },
      },
      {
        id: '8',
        time: '1T 03:22',
        homeTeam: { name: 'Cincinnati', icon: getTeamLogo("Cincinnati", escudoCincinnati), score: 0 },
        awayTeam: { name: 'Chicago Fire', icon: getTeamLogo("Chicago Fire", escudoChicagoFire), score: 0 },
        odds: { home: '1.95x', draw: '3.60x', away: '3.80x' },
        doubleChanceOdds: { homeOrDraw: '1.28x', homeOrAway: '1.30x', awayOrDraw: '1.85x' },
        bothTeamsScoreOdds: { yes: '1.85x', no: '1.90x' },
        totalGoalsOdds: { line: 2.5, under: '1.90x', over: '1.85x' },
        totalCornersOdds: { line: 9.5, under: '1.88x', over: '1.88x' },
      },
      {
        id: '14',
        time: '1T 32:05',
        homeTeam: { name: 'Nashville', icon: getTeamLogo("Nashville", escudoNashville), score: 2 },
        awayTeam: { name: 'New York City', icon: getTeamLogo("New York City", escudoNewYorkCity), score: 1 },
        odds: { home: '1.85x', draw: '3.70x', away: '4.00x' },
        doubleChanceOdds: { homeOrDraw: '1.25x', homeOrAway: '1.28x', awayOrDraw: '1.92x' },
        bothTeamsScoreOdds: { yes: '1.50x', no: '2.45x' },
        totalGoalsOdds: { line: 3.5, under: '1.40x', over: '2.90x' },
        totalCornersOdds: { line: 9.5, under: '1.78x', over: '1.98x' },
      },
    ],
  },
  {
    id: 'europa-league',
    name: 'Europe League',
    flag: flagMundo,
    isOpen: false,
    sport: 'futebol',
    matches: [
      {
        id: '9',
        time: '1T 15:08',
        homeTeam: { name: 'Dinamo', icon: getTeamLogo("Dinamo", escudoDinamo), score: 0 },
        awayTeam: { name: 'Aston Villa', icon: getTeamLogo("Aston Villa", escudoAstonVila), score: 1 },
        odds: { home: '4.20x', draw: '3.80x', away: '1.75x' },
        doubleChanceOdds: { homeOrDraw: '1.98x', homeOrAway: '1.25x', awayOrDraw: '1.20x' },
        bothTeamsScoreOdds: { yes: '1.75x', no: '2.00x' },
        totalGoalsOdds: { line: 2.5, under: '1.72x', over: '2.05x' },
        totalCornersOdds: { line: 10.5, under: '1.85x', over: '1.90x' },
      },
      {
        id: '10',
        time: '2T 12:45',
        homeTeam: { name: 'Fenerbahçe', icon: getTeamLogo("Fenerbahçe", escudoFenerbahce), score: 2 },
        awayTeam: { name: 'Porto', icon: getTeamLogo("Porto", escudoPorto), score: 1 },
        odds: { home: '1.55x', draw: '4.50x', away: '5.00x' },
        doubleChanceOdds: { homeOrDraw: '1.15x', homeOrAway: '1.20x', awayOrDraw: '2.35x' },
        bothTeamsScoreOdds: { yes: '1.45x', no: '2.65x' },
        totalGoalsOdds: { line: 3.5, under: '1.50x', over: '2.55x' },
        totalCornersOdds: { line: 10.5, under: '1.72x', over: '2.02x' },
      },
      {
        id: '15',
        time: '1T 18:33',
        homeTeam: { name: 'Panathinaikos', icon: getTeamLogo("Panathinaikos", escudoPanathinaikos), score: 0 },
        awayTeam: { name: 'Nottingham', icon: getTeamLogo("Nottingham", escudoNottinghamForest), score: 0 },
        odds: { home: '3.10x', draw: '3.20x', away: '2.30x' },
        doubleChanceOdds: { homeOrDraw: '1.58x', homeOrAway: '1.32x', awayOrDraw: '1.35x' },
        bothTeamsScoreOdds: { yes: '1.80x', no: '1.95x' },
        totalGoalsOdds: { line: 2.5, under: '1.95x', over: '1.80x' },
        totalCornersOdds: { line: 10.5, under: '1.90x', over: '1.85x' },
      },
    ],
  },
  // Basketball
  {
    id: 'nba',
    name: 'NBA',
    flag: flagUSA,
    isOpen: true,
    sport: 'basquete',
    matches: [
      {
        id: 'nba-1',
        time: 'Q1 08:22',
        homeTeam: { name: 'Jazz', icon: getTeamLogo("Jazz", escudoJazz), score: 8 },
        awayTeam: { name: 'Thunder', icon: getTeamLogo("Thunder", escudoThunder), score: 11 },
        odds: { home: '2.35x', away: '1.58x' },
        totalPointsOdds: { line: 218.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: 6.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 54.5, under: '1.85x', over: '1.95x' },
        q4TotalOdds: { line: 56.5, under: '1.90x', over: '1.90x' },
        extraBets: 20,
      },
      {
        id: 'nba-2',
        time: 'Q2 05:00',
        homeTeam: { name: 'Knicks', icon: getTeamLogo("Knicks", escudoKnicks), score: 42 },
        awayTeam: { name: 'Magic', icon: getTeamLogo("Magic", escudoMagic), score: 38 },
        odds: { home: '1.72x', away: '2.15x' },
        totalPointsOdds: { line: 212.5, under: '1.85x', over: '1.95x' },
        handicapOdds: { line: -3.5, home: '1.90x', away: '1.90x' },
        q3TotalOdds: { line: 52.5, under: '1.88x', over: '1.92x' },
        q4TotalOdds: { line: 55.5, under: '1.85x', over: '1.95x' },
      },
    ],
  },
  {
    id: 'grecia-elite',
    name: 'Grécia - Liga de Elite',
    flag: flagGrecia,
    isOpen: true,
    sport: 'basquete',
    matches: [
      {
        id: 'grecia-1',
        time: 'Q3 06:43',
        homeTeam: { name: 'AEPS Machitis', icon: '', score: 38 },
        awayTeam: { name: 'ASA Koroivos', icon: '', score: 46 },
        odds: { home: '3.20x', away: '1.32x' },
        totalPointsOdds: { line: 158.5, under: '1.88x', over: '1.92x' },
        handicapOdds: { line: 8.5, home: '1.85x', away: '1.95x' },
        q3TotalOdds: { line: 38.5, under: '1.90x', over: '1.90x' },
        q4TotalOdds: { line: 40.5, under: '1.88x', over: '1.92x' },
      },
    ],
  },
  {
    id: 'ncaab',
    name: 'NCAAB',
    flag: flagUSA,
    isOpen: false,
    sport: 'basquete',
    matches: [
      {
        id: 'ncaab-1',
        time: 'Q1 00:21',
        homeTeam: { name: 'Southern Wesleyan', icon: escudoWesleyan, score: 22 },
        awayTeam: { name: 'Kennesaw State', icon: escudoKennesaw, score: 65 },
        odds: { home: '8.50x', away: '1.05x' },
        totalPointsOdds: { line: 145.5, under: '1.85x', over: '1.95x' },
        handicapOdds: { line: 42.5, home: '1.90x', away: '1.90x' },
        q3TotalOdds: { line: 35.5, under: '1.88x', over: '1.92x' },
        q4TotalOdds: { line: 36.5, under: '1.90x', over: '1.90x' },
      },
    ],
  },
  {
    id: 'italia-lega1',
    name: 'Itália - Lega 1',
    flag: flagItalia,
    isOpen: false,
    sport: 'basquete',
    matches: [
      {
        id: 'italia-1',
        time: 'Q3 08:32',
        homeTeam: { name: 'Vanoli Cremona', icon: '', score: 42 },
        awayTeam: { name: 'Varese', icon: '', score: 41 },
        odds: { home: '1.95x', away: '1.85x' },
        totalPointsOdds: { line: 162.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: -1.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 40.5, under: '1.85x', over: '1.95x' },
        q4TotalOdds: { line: 42.5, under: '1.90x', over: '1.90x' },
      },
      {
        id: 'italia-2',
        time: 'Q1 03:24',
        homeTeam: { name: 'Virtus Bologna', icon: '', score: 11 },
        awayTeam: { name: 'Tortona', icon: '', score: 12 },
        odds: { home: '1.45x', away: '2.70x' },
        totalPointsOdds: { line: 168.5, under: '1.88x', over: '1.92x' },
        handicapOdds: { line: -5.5, home: '1.90x', away: '1.90x' },
        q3TotalOdds: { line: 42.5, under: '1.90x', over: '1.90x' },
        q4TotalOdds: { line: 44.5, under: '1.85x', over: '1.95x' },
      },
    ],
  },
  {
    id: 'bulgaria-nbl',
    name: 'Bulgária - NBL',
    flag: flagBulgaria,
    isOpen: false,
    sport: 'basquete',
    matches: [
      {
        id: 'bulgaria-1',
        time: 'Q2 04:43',
        homeTeam: { name: 'Beroe', icon: '', score: 21 },
        awayTeam: { name: 'Balkan Botevgrad', icon: '', score: 34 },
        odds: { home: '2.85x', away: '1.42x' },
        totalPointsOdds: { line: 152.5, under: '1.90x', over: '1.90x' },
        handicapOdds: { line: 12.5, home: '1.88x', away: '1.92x' },
        q3TotalOdds: { line: 38.5, under: '1.85x', over: '1.95x' },
        q4TotalOdds: { line: 40.5, under: '1.90x', over: '1.90x' },
      },
    ],
  },
]

interface LiveSectionProps {
  disableInteractions?: boolean
  onMatchClick?: (payload: LiveEventOpenPayload) => void
  onOpenCompetition?: (target: CompetitionLinkTarget) => void
}

export function LiveSection({ disableInteractions = false, onMatchClick, onOpenCompetition }: LiveSectionProps = {}) {
  const [activeSport, setActiveSport] = useState('futebol')
  const [activeMarket, setActiveMarket] = useState('resultado-final')
  const [openLeagues, setOpenLeagues] = useState<string[]>(
    leagues.filter((l) => l.isOpen).map((l) => l.id)
  )
  
  // Refs for auto-scroll chips
  const sectionRef = useRef<HTMLElement>(null)
  const sportChipsRef = useRef<HTMLDivElement>(null)
  const marketChipsRef = useRef<HTMLDivElement>(null)
  const sportChipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const marketChipRefs = useRef<(HTMLButtonElement | null)[]>([])
  const marketStickyState = useHomeMarketStickyState(sectionRef, marketChipsRef)

  // Reset market chips scroll position when sport changes
  useEffect(() => {
    if (marketChipsRef.current) {
      marketChipsRef.current.scrollTo({ left: 0, behavior: 'smooth' })
    }
  }, [activeSport])

  // Get current market chips and filtered leagues based on sport
  const currentMarketChips = activeSport === 'basquete' ? basketballMarketChips : footballMarketChips
  const filteredLeagues = leagues.filter((l) => l.sport === activeSport)
  const activeSportChipIndex = sportChips.findIndex((chip) => chip.id === activeSport)
  const activeMarketChipIndex = currentMarketChips.findIndex((chip) => chip.id === activeMarket)
  const marketIndicatorKey = `${activeSport}:${activeMarket}:${currentMarketChips.map((chip) => chip.id).join('|')}`

  useSlidingActiveIndicator({
    activeKey: activeSport,
    containerRef: sportChipsRef,
    getActiveElement: () => sportChipRefs.current[activeSportChipIndex],
  })

  useSlidingActiveIndicator({
    activeKey: marketIndicatorKey,
    containerRef: marketChipsRef,
    getActiveElement: () => marketChipRefs.current[activeMarketChipIndex],
  })

  const openCompetitionFromLeague = (leagueId: string) => {
    if (disableInteractions) return

    const target = getCompetitionLinkTarget(leagueId)
    if (!target) return
    onOpenCompetition?.(target)
  }

  // State for match times
  const [matchTimes, setMatchTimes] = useState<Record<string, string>>(() => {
    const times: Record<string, string> = {}
    leagues.forEach((league) => {
      league.matches.forEach((match) => {
        times[match.id] = match.time
      })
    })
    return times
  })

  // Update times every second
  useEffect(() => {
    const interval = setInterval(() => {
      setMatchTimes((prevTimes) => {
        const newTimes: Record<string, string> = {}
        Object.keys(prevTimes).forEach((matchId) => {
          newTimes[matchId] = updateLiveClock(prevTimes[matchId])
        })
        return newTimes
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const toggleLeague = (leagueId: string) => {
    setOpenLeagues((prev) =>
      prev.includes(leagueId)
        ? prev.filter((id) => id !== leagueId)
        : [...prev, leagueId]
    )
  }

  // Helper to get current time for a match
  const getMatchTime = (matchId: string, defaultTime: string): string => {
    return matchTimes[matchId] || defaultTime
  }

  const toLiveEventMatch = (league: League, match: Match): LiveEventMatch => ({
    id: match.id,
    leagueId: league.id,
    leagueName: league.name,
    leagueFlag: league.flag,
    sport: league.sport,
    isLive: true,
    time: match.time,
    dateTime: match.time,
    currentTime: getMatchTime(match.id, match.time),
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    odds: match.odds,
    doubleChanceOdds: match.doubleChanceOdds,
    bothTeamsScoreOdds: match.bothTeamsScoreOdds,
    totalGoalsOdds: match.totalGoalsOdds,
    totalCornersOdds: match.totalCornersOdds,
    totalPointsOdds: match.totalPointsOdds,
    handicapOdds: match.handicapOdds,
    q3TotalOdds: match.q3TotalOdds,
    q4TotalOdds: match.q4TotalOdds,
    extraBets: match.extraBets,
  })

  const openLiveEvent = (league: League, selectedIndex: number) => {
    if (disableInteractions) return
    if (!liveEventSports.has(league.sport)) return
    const selectedMatch = league.matches[selectedIndex]
    if (!selectedMatch) return

    const eventEntries = filteredLeagues.flatMap((eventLeague) => (
      eventLeague.matches.map((match) => ({ league: eventLeague, match }))
    ))
    const selectedEventIndex = eventEntries.findIndex(({ league: eventLeague, match }) => (
      eventLeague.id === league.id && match.id === selectedMatch.id
    ))

    const currentTimes = eventEntries.reduce<Record<string, string>>((times, { match }) => {
      times[match.id] = getMatchTime(match.id, match.time)
      return times
    }, {})

    onMatchClick?.({
      matches: eventEntries.map(({ league: eventLeague, match }) => toLiveEventMatch(eventLeague, match)),
      selectedIndex: Math.max(0, selectedEventIndex),
      leagueName: league.name,
      leagueFlag: league.flag,
      sport: league.sport,
      currentTimes,
    })
  }

  return (
    <section id="section-aovivo" className="live-section" ref={sectionRef}>
      {/* Header */}
      <div className="live-section__header">
        <div className="live-section__title">
          <span>Ao Vivo</span>
          <CaretRightIcon aria-hidden="true" className="live-section__arrow" weight="bold" />
        </div>
      </div>

      {/* Sport Chips */}
      <div className="live-section__chips sliding-chip-group" ref={sportChipsRef}>
        <span className="sliding-chip-indicator" aria-hidden="true" />
        {sportChips.map((chip, index) => (
          <button
            key={chip.id}
            ref={(el) => { sportChipRefs.current[index] = el }}
            className={`live-section__chip sliding-chip ${activeSport === chip.id ? 'live-section__chip--active' : ''} ${chip.disabled ? 'live-section__chip--disabled' : ''}`}
            onClick={() => {
              if (disableInteractions) return
              if (chip.disabled) return
              setActiveSport(chip.id)
              setActiveMarket(chip.id === 'basquete' ? 'vencedor' : 'resultado-final')
              // Scroll to make chip visible
              const chipEl = sportChipRefs.current[index]
              const containerEl = sportChipsRef.current
              if (chipEl && containerEl) {
                const chipLeft = chipEl.offsetLeft
                const chipWidth = chipEl.offsetWidth
                const containerWidth = containerEl.offsetWidth
                const containerScroll = containerEl.scrollLeft
                const padding = 12
                if (chipLeft + chipWidth > containerScroll + containerWidth - padding) {
                  containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
                } else if (chipLeft < containerScroll + padding) {
                  containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
                }
              }
            }}
            disabled={disableInteractions || chip.disabled}
            aria-disabled={disableInteractions || chip.disabled}
          >
            <img src={chip.icon} alt="" className="live-section__chip-icon" />
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Market Chips */}
      <div className={`live-section__chips live-section__chips--sticky sliding-chip-group sliding-chip-group--indicator-ready${marketStickyState.isStuck ? ' live-section__chips--sticky-stuck' : ''}${marketStickyState.isVisible ? '' : ' live-section__chips--sticky-hidden'}`} ref={marketChipsRef}>
        <span className="sliding-chip-indicator" aria-hidden="true" />
        {currentMarketChips.map((chip, index) => (
          <button
            key={chip.id}
            ref={(el) => { marketChipRefs.current[index] = el }}
            className={`live-section__chip live-section__chip--market sliding-chip ${activeMarket === chip.id ? 'live-section__chip--active' : ''}`}
            onClick={() => {
              if (disableInteractions) return

              setActiveMarket(chip.id)
              // Scroll to make chip visible
              const chipEl = marketChipRefs.current[index]
              const containerEl = marketChipsRef.current
              if (chipEl && containerEl) {
                const chipLeft = chipEl.offsetLeft
                const chipWidth = chipEl.offsetWidth
                const containerWidth = containerEl.offsetWidth
                const containerScroll = containerEl.scrollLeft
                const padding = 12
                if (chipLeft + chipWidth > containerScroll + containerWidth - padding) {
                  containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
                } else if (chipLeft < containerScroll + padding) {
                  containerEl.scrollTo({ left: chipLeft - padding, behavior: 'smooth' })
                }
              }
            }}
            disabled={disableInteractions}
            aria-disabled={disableInteractions}
          >
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Leagues */}
      <div className="live-section__leagues">
        {filteredLeagues.map((league) => (
          <div key={league.id} className={`live-section__league ${openLeagues.includes(league.id) ? 'live-section__league--open' : ''}`}>
            {/* League Header */}
            <button
              className="live-section__league-header"
              onClick={() => toggleLeague(league.id)}
            >
              <div className="live-section__league-title">
                {league.flag ? (
                  <img src={league.flag} alt="" className="live-section__league-flag" />
                ) : (
                  <div className="live-section__league-flag--placeholder" />
                )}
                <span>{league.name}</span>
              </div>
              <CaretUpIcon
                aria-hidden="true"
                className={`live-section__accordion-icon ${openLeagues.includes(league.id) ? 'live-section__accordion-icon--open' : ''}`}
                weight="bold"
              />
            </button>

            {/* League Matches with Animation */}
            {league.matches.length > 0 && (
              <div className={`live-section__matches-wrapper ${openLeagues.includes(league.id) ? 'live-section__matches-wrapper--open' : ''}`}>
                <div className="live-section__matches-inner">
                  <div className="live-section__matches">
                    {league.matches.map((match, matchIndex) => (
                      <LiveMatchCard
                        key={match.id}
                        match={{
                          ...match,
                          leagueId: league.id,
                          leagueName: league.name,
                        }}
                        sport={league.sport}
                        activeMarket={activeMarket}
                        currentTime={getMatchTime(match.id, match.time)}
                        disableInteractions={disableInteractions}
                        onClick={!disableInteractions && liveEventSports.has(league.sport) ? () => openLiveEvent(league, matchIndex) : undefined}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    className="live-section__league-more"
                    disabled={disableInteractions}
                    onClick={() => openCompetitionFromLeague(league.id)}
                  >
                    <span>Veja mais {league.name}</span>
                    <CaretRightIcon aria-hidden="true" className="live-section__league-more-icon" weight="bold" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* More Button */}
      <div className="live-section__more">
        <button className="live-section__more-btn" disabled={disableInteractions}>
          <span>Mais {activeSport === 'basquete' ? 'Basquete' : 'Futebol'} Ao Vivo</span>
          <CaretRightIcon aria-hidden="true" className="live-section__more-icon" weight="bold" />
        </button>
      </div>
    </section>
  )
}
