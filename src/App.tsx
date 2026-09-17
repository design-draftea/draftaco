import { brandBasePath, parseBrandPath } from './shared/brand/routing'
import { getBrandConfig } from './shared/brand/config'
import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { LiveEventOpenPayload } from './features/sports/LiveEventPage'
import { MobileOnly } from './components/MobileOnly'
import { Navbar } from './components/Navbar'
import { Betslip } from './components/Betslip'
import { HeaderV2 } from './components/HeaderV2'
import {
  DepositPanel,
  type DepositAccount,
  type DepositAccountId,
} from './components/DepositPanel'
import { FeatureFlagsPanel } from './components/FeatureFlagsPanel'
import { NflPlaysStatsBottomSheet } from './components/BottomSheet'
import { ProfileBottomSheet } from './components/ProfileBottomSheet'
import { LocationPermissionGate } from './components/LocationPermissionGate'
import { BetslipProvider } from './shared/hooks/BetslipProvider'
import { FeatureFlagsProvider } from './shared/hooks/FeatureFlagsProvider'
import { useFeatureFlags } from './shared/hooks/useFeatureFlags'
import { useBetslip } from './shared/hooks/useBetslip'
import { getBetslipTurboEligibleSelectionCount } from './shared/hooks/betslipTurboBonus'
import type { ProductMode } from './shared/types/home'
import { BETSLIP_LIVE_EVENT_OPEN_EVENT } from './shared/utils/betslipLiveEvent'
import type { PixKeyType } from './shared/utils/pixKeyValidation'
import { LoginPage } from './features/auth/LoginPage'
import type { BetSuccessReceipt } from './features/betslip/BetSuccessPage'

const Home = lazy(() => import('./features/home/Home').then((m) => ({ default: m.Home })))
const SportsPageV2 = lazy(() => import('./features/sports/SportsPageV2').then((m) => ({ default: m.SportsPageV2 })))
const PromotionsPage = lazy(() => import('./features/promotions/PromotionsPage').then((m) => ({ default: m.PromotionsPage })))
const BetslipPageV2 = lazy(() => import('./features/betslip/BetslipPageV2').then((m) => ({ default: m.BetslipPageV2 })))
const BetSuccessPage = lazy(() => import('./features/betslip/BetSuccessPage').then((m) => ({ default: m.BetSuccessPage })))
const CamisaPremiadaStaticPreviewPage = lazy(() => import('./features/betslip/BetSuccessPage').then((m) => ({
  default: m.CamisaPremiadaStaticPreviewPage,
})))
const LiveEventPage = lazy(() => import('./features/sports/LiveEventPage').then((m) => ({ default: m.LiveEventPage })))
const EmbaixadinhaPage = lazy(() => import('./features/games/EmbaixadinhaPage').then((m) => ({ default: m.EmbaixadinhaPage })))
const MemoriaPage = lazy(() => import('./features/games/MemoriaPage').then((m) => ({ default: m.MemoriaPage })))
const PongPage = lazy(() => import('./features/games/PongPage').then((m) => ({ default: m.PongPage })))
const EntriesPage = lazy(() => import('./features/entries/EntriesPage').then((m) => ({ default: m.EntriesPage })))

const RouteFallback = () => (
  <div
    style={{ minHeight: '100dvh', background: 'var(--ds-background-app, var(--tokens-background-background))' }}
    aria-busy="true"
  />
)

const defaultProduct: ProductMode = 'apostas'
const productRoutes: ProductMode[] = ['apostas', 'cassino']
const sportsV2RouteSegment = 'apostas2'
const promotionsRouteSegment = 'promocoes'
const entriesRouteSegment = 'entradas'
const nflPlaysRouteSegment = 'nfl'
const embaixadinhaRouteSegment = 'embaixadinha'
const memoriaRouteSegment = 'memoria'
const pongRouteSegment = 'pong'
const camisaPremiadaRouteSegment = 'camisa-premiada'
const penaltiPremiadoRouteSegment = 'penalti-premiado'
const loginRouteSegment = 'entrar'
const signupRouteSegment = 'criar-conta'
const ENABLE_APP_PROMOTIONS_NAV_LINK = false
const brasileiraoLeagueIdPattern = /(?:brasil-serie-a|fut-brasileir|fut-brasileirao-a)/
const brasileiraoLeagueNamePattern = /(?:brasileir|brasileir[aã]o|brasil\s*-\s*s[eé]rie\s*a|s[eé]rie\s*a)/i

const getBasePath = brandBasePath
const stripBasePath = (pathname: string) => parseBrandPath(pathname).path

const getNormalizedAppPath = (pathname: string) => stripBasePath(pathname).replace(/\/+$/, '') || '/'

const getRouteSegments = (pathname: string) => getNormalizedAppPath(pathname).split('/').filter(Boolean)

const isPromotionsPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return (
    routeSegments[0] === promotionsRouteSegment &&
    routeSegments.length <= 2
  )
}

const isNflPlaysPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return routeSegments.length === 1 && routeSegments[0] === nflPlaysRouteSegment
}

const isEntriesPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return routeSegments.length === 1 && routeSegments[0] === entriesRouteSegment
}

const isSportsV2Path = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return routeSegments.length === 1 && routeSegments[0] === sportsV2RouteSegment
}

const isEmbaixadinhaPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return routeSegments.length === 1 && routeSegments[0] === embaixadinhaRouteSegment
}

const isMemoriaPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return routeSegments.length === 1 && routeSegments[0] === memoriaRouteSegment
}

const isPongPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return routeSegments.length === 1 && routeSegments[0] === pongRouteSegment
}

const isCamisaPremiadaPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return routeSegments.length === 1 && routeSegments[0] === camisaPremiadaRouteSegment
}

const isPenaltiPremiadoPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return routeSegments.length === 1 && routeSegments[0] === penaltiPremiadoRouteSegment
}

const isLoginPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return routeSegments.length === 1 && routeSegments[0] === loginRouteSegment
}

const isSignupPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)

  return getBrandConfig().features.signup && routeSegments.length === 1 && routeSegments[0] === signupRouteSegment
}

const isAuthPath = (pathname: string) => isLoginPath(pathname) || isSignupPath(pathname)

const isCanonicalPromotionsPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)
  return routeSegments.length === 1 && routeSegments[0] === promotionsRouteSegment
}

const resolveProductFromPath = (pathname: string) => {
  const routeSegments = getRouteSegments(pathname)
  const routeProduct = productRoutes.find((route) => route === routeSegments[0])
  const product = routeProduct === 'cassino' && !getBrandConfig().features.casino
    ? defaultProduct : routeProduct ?? defaultProduct
  const isCanonicalProductRoute = routeSegments.length === 1 && routeSegments[0] === product

  return {
    product,
    isCanonicalProductRoute,
  }
}

const buildProductPath = (product: ProductMode) => {
  const basePath = getBasePath()
  return `${basePath}/${product}`
}

const buildSportsV2Path = () => {
  const basePath = getBasePath()
  return `${basePath}/${sportsV2RouteSegment}`
}

const buildPromotionsPath = () => {
  const basePath = getBasePath()
  return `${basePath}/${promotionsRouteSegment}`
}

const buildLoginPath = () => {
  const basePath = getBasePath()
  return `${basePath}/${loginRouteSegment}`
}

const buildSignupPath = () => {
  const basePath = getBasePath()
  return `${basePath}/${signupRouteSegment}`
}

const getCurrentPathWithSearch = () => `${window.location.pathname}${window.location.search}`

const getPathnameFromPathWithSearch = (pathWithSearch: string) => pathWithSearch.split('?')[0] || '/'

const hasGarantidaBannerParam = (search: string) => new URLSearchParams(search).get('banner') === 'garantida'

const getGarantidaBannerSearch = (search: string) => (hasGarantidaBannerParam(search) ? '?banner=garantida' : '')

const getCamisaPremiadaOutcomeOverride = (search: string) => {
  const outcome = new URLSearchParams(search).get('resultado')

  return outcome === 'ganhou' || outcome === 'perdeu' ? outcome : undefined
}

const hasCamisaPremiadaStaticParam = (search: string) => new URLSearchParams(search).has('estatico')

const withSearch = (path: string, search: string) => `${path}${search}`

type AuthVariant = 'logged-in' | 'logged-out'
type AuthOverlayOrigin = 'default' | 'betslip'
type LoginMotionState = 'entering' | 'open' | 'exiting'
type DepositPanelOrigin = 'standard' | 'signup'
type SignupPendingRequirement = 'identity' | 'limits'
type AuthScrollLockState = {
  scrollY: number
  bodyOverflow: string
  rootOverflow: string
}

const loginMotionDurationMs = 320
const loggedInInitialWithdrawableBalanceCents = 0
const signupInitialWithdrawableBalanceCents = 0
const promotionalBalanceCents = 2000
const freeBetBalanceCents = 1000
const nubankDepositAccount: DepositAccount = {
  id: 'nubank',
  bankName: 'Nu Pagamentos S.A.',
  lastDigits: '548',
  pixKeyType: 'cpf',
  pixKeyValue: '12345678909',
}
const santanderDepositAccount: DepositAccount = {
  id: 'santander',
  bankName: 'Banco Santander (Brasil) S.A.',
  lastDigits: '217',
  pixKeyType: 'phone',
  pixKeyValue: '+5511982736451',
}
const caixaDepositAccount: DepositAccount = {
  id: 'caixa',
  bankName: 'Caixa Econômica Federal',
  lastDigits: '234',
  pixKeyType: 'email',
  pixKeyValue: 'usuario@exemplo.com',
}
const depositAccountCatalog: DepositAccount[] = [
  nubankDepositAccount,
  santanderDepositAccount,
  caixaDepositAccount,
]

function AppContent() {
  const [pathname, setPathname] = useState(() => window.location.pathname)
  const [search, setSearch] = useState(() => window.location.search)
  const [isSignupGarantidaBannerEnabled, setIsSignupGarantidaBannerEnabled] = useState(() => (
    !isAuthPath(window.location.pathname) && hasGarantidaBannerParam(window.location.search)
  ))
  const loginReturnPathRef = useRef<string | null>(
    isAuthPath(window.location.pathname) ? buildProductPath(defaultProduct) : null
  )
  const loginMotionTimerRef = useRef<number | null>(null)
  const signupDepositExitPathRef = useRef<string | null>(null)
  const authScrollLockRef = useRef<AuthScrollLockState | null>(null)
  const [authVariant, setAuthVariant] = useState<AuthVariant>('logged-out')
  const [withdrawableBalanceCents, setWithdrawableBalanceCents] = useState(0)
  const playableBalanceCents = withdrawableBalanceCents + promotionalBalanceCents
  const [savedDepositAccounts, setSavedDepositAccounts] = useState<DepositAccount[]>([])
  const [activeDepositAccountId, setActiveDepositAccountId] = useState<DepositAccountId | null>(null)
  const [savedWithdrawalAccounts, setSavedWithdrawalAccounts] = useState<DepositAccount[]>([])
  const [activeWithdrawalAccountId, setActiveWithdrawalAccountId] = useState<DepositAccountId | null>(null)
  const nextDepositAccountId = useMemo(() => {
    if (!activeDepositAccountId) return depositAccountCatalog[0]?.id ?? null

    const activeAccountIndex = depositAccountCatalog.findIndex((account) => (
      account.id === activeDepositAccountId
    ))

    if (activeAccountIndex < 0) return depositAccountCatalog[0]?.id ?? null

    return depositAccountCatalog[
      (activeAccountIndex + 1) % depositAccountCatalog.length
    ]?.id ?? null
  }, [activeDepositAccountId])
  const nextWithdrawalAccountId = useMemo(() => (
    depositAccountCatalog.find((account) => (
      !savedWithdrawalAccounts.some((savedAccount) => savedAccount.id === account.id)
    ))?.id ?? null
  ), [savedWithdrawalAccounts])
  const [loginMotionState, setLoginMotionState] = useState<LoginMotionState | null>(
    isAuthPath(window.location.pathname) ? 'open' : null
  )
  const [authOverlayOrigin, setAuthOverlayOrigin] = useState<AuthOverlayOrigin>('default')
  const { selections: betslipSelections, summary: betslipSummary } = useBetslip()
  const { isFeatureEnabled } = useFeatureFlags()
  const betslipTurboEligibleSelectionCount = useMemo(
    () => getBetslipTurboEligibleSelectionCount(betslipSelections),
    [betslipSelections]
  )
  const hasOnlyBrasileiraoSelections = useMemo(() => (
    betslipSelections.length > 0 && betslipSelections.every((selection) => (
      (!!selection.leagueId && brasileiraoLeagueIdPattern.test(selection.leagueId)) ||
      (!!selection.leagueName && brasileiraoLeagueNamePattern.test(selection.leagueName))
    ))
  ), [betslipSelections])
  const actualProductRoute = useMemo(() => resolveProductFromPath(pathname), [pathname])
  const isCurrentSportsV2Page = useMemo(() => isSportsV2Path(pathname), [pathname])
  const isCurrentPromotionsPage = useMemo(() => isPromotionsPath(pathname), [pathname])
  const isCurrentEntriesPage = useMemo(() => isEntriesPath(pathname), [pathname])
  const isEmbaixadinhaPage = useMemo(() => isEmbaixadinhaPath(pathname), [pathname])
  const isMemoriaPage = useMemo(() => isMemoriaPath(pathname), [pathname])
  const isPongPage = useMemo(() => isPongPath(pathname), [pathname])
  const isCurrentNflPlaysPage = useMemo(() => isNflPlaysPath(pathname), [pathname])
  const isCurrentCamisaPremiadaPage = useMemo(() => isCamisaPremiadaPath(pathname), [pathname])
  const isCurrentPenaltiPremiadoPage = useMemo(() => isPenaltiPremiadoPath(pathname), [pathname])
  const isCamisaPremiadaStaticPreview = isCurrentCamisaPremiadaPage && hasCamisaPremiadaStaticParam(search)
  const isStandalonePage = isEmbaixadinhaPage
    || isMemoriaPage
    || isPongPage
    || isCamisaPremiadaStaticPreview
  const isLoginPage = useMemo(() => isLoginPath(pathname), [pathname])
  const isSignupPage = useMemo(() => isSignupPath(pathname), [pathname])
  const isAuthPage = isLoginPage || isSignupPage
  const renderedPathname = isAuthPage
    ? getPathnameFromPathWithSearch(loginReturnPathRef.current ?? buildProductPath(defaultProduct))
    : pathname
  const productRoute = useMemo(() => resolveProductFromPath(renderedPathname), [renderedPathname])
  const isSportsV2Page = useMemo(() => isSportsV2Path(renderedPathname), [renderedPathname])
  const isPromotionsPage = useMemo(() => isPromotionsPath(renderedPathname), [renderedPathname])
  const isEntriesPage = useMemo(() => isEntriesPath(renderedPathname), [renderedPathname])
  const isNflPlaysPage = useMemo(() => isNflPlaysPath(renderedPathname), [renderedPathname])
  const isCamisaPremiadaMode = useMemo(() => isCamisaPremiadaPath(renderedPathname), [renderedPathname])
  const isPenaltiPremiadoMode = useMemo(() => isPenaltiPremiadoPath(renderedPathname), [renderedPathname])
  const isPremiadaMode = isCamisaPremiadaMode || isPenaltiPremiadoMode
  const premiadaFeatureName = isPenaltiPremiadoMode ? 'Pênalti Premiado' : 'Camisa Premiada'
  const camisaPremiadaOutcomeOverride = useMemo(
    () => isPremiadaMode ? getCamisaPremiadaOutcomeOverride(search) : undefined,
    [isPremiadaMode, search]
  )
  const [promotionsProduct, setPromotionsProduct] = useState<ProductMode>(() => productRoute.product)
  const [isFullBetslipOpen, setIsFullBetslipOpen] = useState(false)
  const [betSuccessReceipt, setBetSuccessReceipt] = useState<BetSuccessReceipt | null>(null)
  const [isCompactBetslipSuppressed, setIsCompactBetslipSuppressed] = useState(false)
  const [isDepositPanelOpen, setIsDepositPanelOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [depositPanelOrigin, setDepositPanelOrigin] = useState<DepositPanelOrigin>('standard')
  const [signupPendingDepositAmountCents, setSignupPendingDepositAmountCents] = useState<number | null>(null)
  const [signupPendingRequirement, setSignupPendingRequirement] = useState<SignupPendingRequirement | null>(null)
  const [isFeatureFlagsPanelOpen, setIsFeatureFlagsPanelOpen] = useState(false)
  const [liveEventUi, setLiveEventUi] = useState({
    isOpen: false,
    isEventBetslipVisible: false,
    betslipMotionKey: 0,
  })
  const [betslipOriginLiveEvent, setBetslipOriginLiveEvent] = useState<{
    isOpen: boolean
    payload: LiveEventOpenPayload
  } | null>(null)
  const activeProduct = isPromotionsPage ? promotionsProduct : productRoute.product
  const showSignupGarantidaBanner = isSignupPage && isSignupGarantidaBannerEnabled
  const hasSignupDepositPending = signupPendingDepositAmountCents !== null
  const hasSignupIdentityPending = signupPendingRequirement === 'identity'
  const hasSignupLimitsPending = signupPendingRequirement === 'limits'
  const headerDepositStatus = hasSignupDepositPending
    ? 'deposit-pending'
    : hasSignupIdentityPending
      ? 'identity-pending'
      : hasSignupLimitsPending
        ? 'limits-pending'
        : undefined
  const depositConfirmationMode = depositPanelOrigin === 'signup' ? 'on-pix-copy' : 'on-pix-generated'
  const depositPanelInitialView = depositPanelOrigin === 'signup' && hasSignupDepositPending ? 'pix' : 'form'
  const depositPanelInitialAmountCents = depositPanelOrigin === 'signup'
    ? signupPendingDepositAmountCents
    : null
  const isDepositRequiredForBetting = authVariant === 'logged-in' && playableBalanceCents <= 0

  const syncBrowserLocation = useCallback(() => {
    const nextPathname = window.location.pathname
    const nextSearch = window.location.search

    setPathname(nextPathname)
    setSearch(nextSearch)

    if (!isAuthPath(nextPathname)) {
      setIsSignupGarantidaBannerEnabled(hasGarantidaBannerParam(nextSearch))
    }
  }, [])

  useEffect(() => {
    if (isCurrentSportsV2Page) return
    if (isCurrentPromotionsPage) return
    if (isCurrentEntriesPage) return
    if (isCurrentNflPlaysPage) return
    if (isStandalonePage) return
    if (isAuthPage) return
    if (isCurrentCamisaPremiadaPage) return
    if (isCurrentPenaltiPremiadoPage) return
    if (actualProductRoute.isCanonicalProductRoute) return

    const nextPath = withSearch(buildProductPath(actualProductRoute.product), getGarantidaBannerSearch(search))
    window.history.replaceState({}, '', nextPath)
    const timer = window.setTimeout(() => {
      syncBrowserLocation()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [actualProductRoute, isCurrentCamisaPremiadaPage, isCurrentEntriesPage, isCurrentNflPlaysPage, isCurrentPenaltiPremiadoPage, isCurrentPromotionsPage, isCurrentSportsV2Page, isAuthPage, isStandalonePage, search, syncBrowserLocation])

  useEffect(() => {
    if (!isCurrentPromotionsPage) return
    if (isCanonicalPromotionsPath(pathname)) return

    const nextPath = withSearch(buildPromotionsPath(), getGarantidaBannerSearch(search))
    window.history.replaceState({}, '', nextPath)
    const timer = window.setTimeout(() => {
      syncBrowserLocation()
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isCurrentPromotionsPage, pathname, search, syncBrowserLocation])

  useEffect(() => {
    const handlePopState = () => {
      syncBrowserLocation()
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [syncBrowserLocation])

  const handleProductChange = useCallback((product: ProductMode) => {
    if (product === 'cassino' && !getBrandConfig().features.casino) return
    if (isPromotionsPage) {
      setPromotionsProduct(product)
      const nextPath = withSearch(buildProductPath(product), getGarantidaBannerSearch(search))

      if (getCurrentPathWithSearch() !== nextPath) {
        window.history.pushState({}, '', nextPath)
      }

      syncBrowserLocation()
      return
    }

    const nextPath = withSearch(buildProductPath(product), getGarantidaBannerSearch(search))

    if (getCurrentPathWithSearch() !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    syncBrowserLocation()
  }, [isPromotionsPage, search, syncBrowserLocation])

  const handleSportsV2Home = useCallback(() => {
    const nextPath = withSearch(buildSportsV2Path(), getGarantidaBannerSearch(search))

    if (getCurrentPathWithSearch() !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    syncBrowserLocation()
  }, [search, syncBrowserLocation])

  const handleAuthOpen = useCallback((nextPath: string) => {
    if (!getBrandConfig().features.signup && parseBrandPath(nextPath).path === '/criar-conta') return
    const isCurrentlyAuthPath = isAuthPath(window.location.pathname)

    if (!isCurrentlyAuthPath) {
      loginReturnPathRef.current = getCurrentPathWithSearch()
      setLoginMotionState('entering')
    } else if (!loginMotionState) {
      loginReturnPathRef.current = loginReturnPathRef.current ?? buildProductPath(defaultProduct)
      setLoginMotionState('open')
    }

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    syncBrowserLocation()
  }, [loginMotionState, syncBrowserLocation])

  const handleLoginOpen = useCallback(() => {
    if (!isAuthPath(window.location.pathname)) {
      setAuthOverlayOrigin('default')
    }

    handleAuthOpen(buildLoginPath())
  }, [handleAuthOpen])

  const handleCreateAccountClick = useCallback(() => {
    if (!isAuthPath(window.location.pathname)) {
      setAuthOverlayOrigin('default')
    }

    handleAuthOpen(buildSignupPath())
  }, [handleAuthOpen])

  const handleSignupIdentityOpen = useCallback(() => {
    if (!isAuthPath(window.location.pathname)) {
      setAuthOverlayOrigin('default')
    }

    handleAuthOpen(buildSignupPath())
  }, [handleAuthOpen])

  const handleSignupLimitsOpen = useCallback(() => {
    if (!isAuthPath(window.location.pathname)) {
      setAuthOverlayOrigin('default')
    }

    handleAuthOpen(buildSignupPath())
  }, [handleAuthOpen])

  const handleBetslipLoginOpen = useCallback(() => {
    setAuthOverlayOrigin('betslip')
    handleAuthOpen(buildLoginPath())
  }, [handleAuthOpen])

  const handleBetslipCreateAccountClick = useCallback(() => {
    setAuthOverlayOrigin('betslip')
    handleAuthOpen(buildSignupPath())
  }, [handleAuthOpen])

  const handleBetslipIdentityOpen = useCallback(() => {
    setAuthOverlayOrigin('betslip')
    handleAuthOpen(buildSignupPath())
  }, [handleAuthOpen])

  const handleBetslipLimitsOpen = useCallback(() => {
    setAuthOverlayOrigin('betslip')
    handleAuthOpen(buildSignupPath())
  }, [handleAuthOpen])

  const completeLoginExit = useCallback((nextPath: string, onComplete?: () => void) => {
    if (loginMotionTimerRef.current !== null) {
      window.clearTimeout(loginMotionTimerRef.current)
      loginMotionTimerRef.current = null
    }

    setLoginMotionState('exiting')

    loginMotionTimerRef.current = window.setTimeout(() => {
      loginMotionTimerRef.current = null
      onComplete?.()
      loginReturnPathRef.current = null
      setAuthOverlayOrigin('default')
      setLoginMotionState(null)

      if (getCurrentPathWithSearch() !== nextPath) {
        window.history.pushState({}, '', nextPath)
      }

      syncBrowserLocation()
    }, loginMotionDurationMs)
  }, [syncBrowserLocation])

  const handleLoginBack = useCallback(() => {
    if (loginMotionState === 'exiting') return

    const fallbackPath = buildProductPath(defaultProduct)
    const nextPath = loginReturnPathRef.current ?? fallbackPath

    completeLoginExit(nextPath)
  }, [completeLoginExit, loginMotionState])

  const handleLoginSuccess = useCallback(() => {
    if (loginMotionState === 'exiting') return

    const fallbackPath = buildProductPath(defaultProduct)
    const nextPath = loginReturnPathRef.current ?? fallbackPath

    setAuthVariant('logged-in')
    setWithdrawableBalanceCents(loggedInInitialWithdrawableBalanceCents)
    setSavedDepositAccounts([])
    setActiveDepositAccountId(null)
    setSavedWithdrawalAccounts([])
    setActiveWithdrawalAccountId(null)
    setSignupPendingDepositAmountCents(null)
    setSignupPendingRequirement(null)
    completeLoginExit(nextPath)
  }, [completeLoginExit, loginMotionState])

  const handleSignupIdentityExit = useCallback(() => {
    if (loginMotionState === 'exiting') return

    const fallbackPath = buildProductPath(defaultProduct)
    const nextPath = loginReturnPathRef.current ?? fallbackPath

    setAuthVariant('logged-in')
    setWithdrawableBalanceCents(signupInitialWithdrawableBalanceCents)
    setSavedDepositAccounts([])
    setActiveDepositAccountId(null)
    setSavedWithdrawalAccounts([])
    setActiveWithdrawalAccountId(null)
    setSignupPendingDepositAmountCents(null)
    setSignupPendingRequirement('identity')
    completeLoginExit(nextPath)
  }, [completeLoginExit, loginMotionState])

  const handleSignupIdentityVerificationStart = useCallback(() => {
    setSignupPendingRequirement((currentRequirement) => (
      currentRequirement === 'identity' ? null : currentRequirement
    ))
  }, [])

  const handleSignupLimitsExit = useCallback(() => {
    if (loginMotionState === 'exiting') return

    const fallbackPath = buildProductPath(defaultProduct)
    const nextPath = loginReturnPathRef.current ?? fallbackPath

    setAuthVariant('logged-in')
    setWithdrawableBalanceCents(signupInitialWithdrawableBalanceCents)
    setSavedDepositAccounts([])
    setActiveDepositAccountId(null)
    setSavedWithdrawalAccounts([])
    setActiveWithdrawalAccountId(null)
    setSignupPendingDepositAmountCents(null)
    setSignupPendingRequirement('limits')
    completeLoginExit(nextPath)
  }, [completeLoginExit, loginMotionState])

  const handleSignupDepositOpen = useCallback(() => {
    if (loginMotionState === 'exiting') return

    const fallbackPath = buildProductPath(defaultProduct)
    const nextPath = loginReturnPathRef.current ?? fallbackPath

    setAuthVariant('logged-in')
    setWithdrawableBalanceCents(signupInitialWithdrawableBalanceCents)
    setSavedDepositAccounts([])
    setActiveDepositAccountId(null)
    setSavedWithdrawalAccounts([])
    setActiveWithdrawalAccountId(null)
    setSignupPendingDepositAmountCents(null)
    setSignupPendingRequirement(null)
    setDepositPanelOrigin('signup')
    signupDepositExitPathRef.current = nextPath
    setIsDepositPanelOpen(true)
  }, [loginMotionState])

  const handleDepositPanelEnterComplete = useCallback(() => {
    const nextPath = signupDepositExitPathRef.current
    if (!nextPath) return

    signupDepositExitPathRef.current = null
    completeLoginExit(nextPath)
  }, [completeLoginExit])

  const handleLoginEnterComplete = useCallback(() => {
    setLoginMotionState((currentState) => (
      currentState === 'entering' ? 'open' : currentState
    ))
  }, [])

  useEffect(() => {
    if (!isAuthPage) return
    if (loginReturnPathRef.current) return

    loginReturnPathRef.current = buildProductPath(defaultProduct)
  }, [isAuthPage])

  useEffect(() => {
    if (isAuthPage || loginMotionState === 'exiting') return
    if (!loginMotionState) return

    setLoginMotionState(null)
  }, [isAuthPage, loginMotionState])

  useEffect(() => {
    if (isAuthPage || authOverlayOrigin === 'default') return

    setAuthOverlayOrigin('default')
  }, [authOverlayOrigin, isAuthPage])

  useEffect(() => () => {
    if (loginMotionTimerRef.current !== null) {
      window.clearTimeout(loginMotionTimerRef.current)
    }
  }, [])

  const handleNavbarItemSelect = useCallback((itemId: string) => {
    if (itemId === 'home' || itemId === 'ao-vivo') {
      handleProductChange(itemId === 'home' ? 'apostas' : 'cassino')
      return
    }
    // Entradas continua visível na navbar e sem ação, como o item de cassino: a
    // tela ainda está em construção e só é alcançada pela URL direta.
    if (itemId === entriesRouteSegment) return
    if (itemId === promotionsRouteSegment) {
      if (!ENABLE_APP_PROMOTIONS_NAV_LINK) return

      const nextPath = withSearch(buildPromotionsPath(), getGarantidaBannerSearch(search))
      setPromotionsProduct(activeProduct)

      if (getCurrentPathWithSearch() !== nextPath) {
        window.history.pushState({}, '', nextPath)
      }

      syncBrowserLocation()
      return
    }
  }, [activeProduct, handleProductChange, search, syncBrowserLocation])

  const handleNflPlaysClose = useCallback(() => {
    const nextPath = withSearch(buildProductPath(defaultProduct), getGarantidaBannerSearch(search))
    window.history.pushState({}, '', nextPath)
    syncBrowserLocation()
  }, [search, syncBrowserLocation])

  const handleBetslipClose = useCallback(() => {
    setIsFullBetslipOpen(false)
  }, [])

  const handleBetSuccess = useCallback((receipt: BetSuccessReceipt) => {
    setBetSuccessReceipt(receipt)
  }, [])

  const handleBetSuccessShare = useCallback(() => {
    // Placeholder until the prototype gets a real share integration.
  }, [])

  const handleBetSuccessNewBet = useCallback(() => {
    setBetSuccessReceipt(null)
    setIsCompactBetslipSuppressed(false)

    if (isPremiadaMode) {
      syncBrowserLocation()
      return
    }

    const nextPath = withSearch(buildProductPath(defaultProduct), getGarantidaBannerSearch(search))

    if (getCurrentPathWithSearch() !== nextPath) {
      window.history.pushState({}, '', nextPath)
    }

    syncBrowserLocation()
  }, [isPremiadaMode, search, syncBrowserLocation])

  const handleBetslipOpen = useCallback(() => {
    setIsCompactBetslipSuppressed(false)
    setIsFullBetslipOpen(true)
    setLiveEventUi((current) => (
      current.isOpen
        ? {
            ...current,
            isOpen: false,
            isEventBetslipVisible: false,
          }
        : current
    ))
  }, [])

  const handleCompactBetslipSuppress = useCallback(() => {
    setIsCompactBetslipSuppressed(true)
  }, [])

  const handleDepositPanelOpen = useCallback(() => {
    setDepositPanelOrigin(signupPendingDepositAmountCents !== null ? 'signup' : 'standard')
    setIsDepositPanelOpen(true)
  }, [signupPendingDepositAmountCents])

  const handleDepositPanelClose = useCallback(() => {
    setIsDepositPanelOpen(false)
  }, [])

  const handleProfileOpen = useCallback(() => {
    setIsProfileOpen(true)
  }, [])

  const handleProfileClose = useCallback(() => {
    setIsProfileOpen(false)
  }, [])

  const handleDepositConfirmed = useCallback((
    depositAmountCents: number,
    accountId: DepositAccountId,
  ) => {
    setWithdrawableBalanceCents((currentBalanceCents) => currentBalanceCents + depositAmountCents)
    setSavedDepositAccounts((currentAccounts) => {
      if (currentAccounts.some((account) => account.id === accountId)) return currentAccounts

      const accountToSave = depositAccountCatalog.find((account) => account.id === accountId)
      if (!accountToSave) return currentAccounts

      const activeAccountIndex = currentAccounts.findIndex((account) => (
        account.id === activeDepositAccountId
      ))

      if (activeAccountIndex < 0) return [...currentAccounts, accountToSave]

      return currentAccounts.map((account, index) => (
        index === activeAccountIndex ? accountToSave : account
      ))
    })
    setActiveDepositAccountId(accountId)
    const confirmedAccount = depositAccountCatalog.find((account) => account.id === accountId)
    if (confirmedAccount) {
      setSavedWithdrawalAccounts((currentAccounts) => {
        if (
          currentAccounts.length >= 3
          || currentAccounts.some((account) => account.id === accountId)
        ) return currentAccounts

        return [...currentAccounts, confirmedAccount]
      })
      setActiveWithdrawalAccountId((currentAccountId) => currentAccountId ?? accountId)
    }
    setSignupPendingDepositAmountCents(null)
  }, [activeDepositAccountId])

  const handleWithdrawalConfirmed = useCallback((withdrawalAmountCents: number) => {
    const normalizedWithdrawalAmountCents = Number.isFinite(withdrawalAmountCents)
      ? Math.max(0, Math.round(withdrawalAmountCents))
      : 0

    if (normalizedWithdrawalAmountCents <= 0) return

    setWithdrawableBalanceCents((currentBalanceCents) => (
      Math.max(0, currentBalanceCents - normalizedWithdrawalAmountCents)
    ))
  }, [])

  const handleDepositAccountSelect = useCallback((accountId: DepositAccountId) => {
    setActiveDepositAccountId(accountId)
  }, [])

  const handleDepositAccountRemove = useCallback((accountId: DepositAccountId) => {
    const remainingAccounts = savedDepositAccounts.filter((account) => account.id !== accountId)

    if (remainingAccounts.length === 0 || remainingAccounts.length === savedDepositAccounts.length) return

    setSavedDepositAccounts(remainingAccounts)
    setActiveDepositAccountId((currentAccountId) => (
      currentAccountId === accountId
        || !remainingAccounts.some((account) => account.id === currentAccountId)
        ? remainingAccounts[0].id
        : currentAccountId
    ))
  }, [savedDepositAccounts])

  const handleWithdrawalAccountAdd = useCallback((
    accountId: DepositAccountId,
    pixKeyType: PixKeyType,
    pixKeyValue: string,
  ) => {
    const accountTemplate = depositAccountCatalog.find((account) => account.id === accountId)
    if (!accountTemplate) return

    setSavedWithdrawalAccounts((currentAccounts) => {
      if (currentAccounts.some((account) => account.id === accountId)) return currentAccounts

      return [
        ...currentAccounts,
        {
          ...accountTemplate,
          pixKeyType,
          pixKeyValue,
        },
      ]
    })
    setActiveWithdrawalAccountId(accountId)
  }, [])

  const handleWithdrawalAccountSelect = useCallback((accountId: DepositAccountId) => {
    setActiveWithdrawalAccountId(accountId)
  }, [])

  const handleWithdrawalAccountRemove = useCallback((accountId: DepositAccountId) => {
    const remainingAccounts = savedWithdrawalAccounts.filter((account) => account.id !== accountId)

    if (
      remainingAccounts.length === 0
      || remainingAccounts.length === savedWithdrawalAccounts.length
    ) return

    setSavedWithdrawalAccounts(remainingAccounts)
    setActiveWithdrawalAccountId((currentAccountId) => (
      currentAccountId === accountId
        || !remainingAccounts.some((account) => account.id === currentAccountId)
        ? remainingAccounts[0].id
        : currentAccountId
    ))
  }, [savedWithdrawalAccounts])

  const handleSignupDepositPending = useCallback((pendingAmountCents: number) => {
    setSignupPendingDepositAmountCents(pendingAmountCents)
  }, [])

  const handleFeatureFlagsPanelClose = useCallback(() => {
    setIsFeatureFlagsPanelOpen(false)
  }, [])

  const handleLiveEventOpenChange = useCallback((isOpen: boolean) => {
    setLiveEventUi((current) => {
      if (current.isOpen === isOpen) return current

      if (isOpen) {
        return {
          isOpen: true,
          isEventBetslipVisible: false,
          betslipMotionKey: current.betslipMotionKey,
        }
      }

      return {
        ...current,
        isOpen: false,
        isEventBetslipVisible: false,
      }
    })
  }, [])

  const handleLiveEventOpenSettled = useCallback(() => {
    setLiveEventUi((current) => {
      if (!current.isOpen || current.isEventBetslipVisible) return current

      return {
        ...current,
        isEventBetslipVisible: true,
        betslipMotionKey: current.betslipMotionKey + 1,
      }
    })
  }, [])

  const handleLiveEventCloseStart = useCallback(() => {
    setLiveEventUi((current) => {
      if (!current.isEventBetslipVisible) return current

      return {
        ...current,
        isEventBetslipVisible: false,
      }
    })
  }, [])

  useEffect(() => {
    const handleBetslipLiveEventOpen = (event: Event) => {
      const payload = (event as CustomEvent<LiveEventOpenPayload>).detail
      if (!payload?.matches?.length) return

      setIsFullBetslipOpen(true)
      setBetslipOriginLiveEvent({ isOpen: true, payload })
      handleLiveEventOpenChange(true)
    }

    window.addEventListener(BETSLIP_LIVE_EVENT_OPEN_EVENT, handleBetslipLiveEventOpen)
    return () => window.removeEventListener(BETSLIP_LIVE_EVENT_OPEN_EVENT, handleBetslipLiveEventOpen)
  }, [handleLiveEventOpenChange])

  const handleBetslipOriginLiveEventClose = useCallback(() => {
    setBetslipOriginLiveEvent(null)
    handleLiveEventOpenChange(false)
  }, [handleLiveEventOpenChange])

  const handleEventBetslipOpen = useCallback(() => {
    if (!betslipOriginLiveEvent) {
      handleBetslipOpen()
      return
    }

    setIsFullBetslipOpen(true)
    handleLiveEventCloseStart()
    setBetslipOriginLiveEvent((current) => (
      current ? { ...current, isOpen: false } : current
    ))
  }, [betslipOriginLiveEvent, handleBetslipOpen, handleLiveEventCloseStart])

  useEffect(() => {
    if (!isCompactBetslipSuppressed || betslipSummary.hasSelections) return

    setIsCompactBetslipSuppressed(false)
  }, [betslipSummary.hasSelections, isCompactBetslipSuppressed])

  useEffect(() => {
    if (!betslipSummary.hasSelections) return

    void import('./features/betslip/BetslipPageV2')
  }, [betslipSummary.hasSelections])

  const showCompactBetslip = activeProduct === 'apostas'
    && !isPromotionsPage
    && !isStandalonePage
    && !isAuthPage
    && betslipSummary.hasSelections
    && !isCompactBetslipSuppressed
  const shouldShowEventBetslip = showCompactBetslip && liveEventUi.isOpen && liveEventUi.isEventBetslipVisible
  const showFreeBetTag = isFeatureEnabled('freeBetsAvailable') && hasOnlyBrasileiraoSelections
  const isAuthOverlayOpen = !isStandalonePage && (isAuthPage || loginMotionState !== null)
  const shouldRenderFullBetslip = !isStandalonePage
    && isFullBetslipOpen
    && (!isAuthPage || authOverlayOrigin === 'betslip')

  useEffect(() => {
    document.documentElement.toggleAttribute('data-betslip-compact-visible', showCompactBetslip)
    document.documentElement.toggleAttribute('data-live-event-betslip-visible', shouldShowEventBetslip)
  }, [showCompactBetslip, shouldShowEventBetslip])

  useEffect(() => {
    const restoreAuthScrollLock = () => {
      const lockState = authScrollLockRef.current

      if (!lockState) return

      document.documentElement.style.overflow = lockState.rootOverflow
      document.body.style.overflow = lockState.bodyOverflow
      authScrollLockRef.current = null
      window.scrollTo(0, lockState.scrollY)
    }

    document.documentElement.toggleAttribute('data-auth-page-open', isAuthOverlayOpen)

    if (isAuthOverlayOpen && authScrollLockRef.current === null) {
      authScrollLockRef.current = {
        scrollY: window.scrollY,
        bodyOverflow: document.body.style.overflow,
        rootOverflow: document.documentElement.style.overflow,
      }

      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
    } else if (!isAuthOverlayOpen) {
      restoreAuthScrollLock()
    }

    return () => {
      restoreAuthScrollLock()
      document.documentElement.removeAttribute('data-auth-page-open')
    }
  }, [isAuthOverlayOpen])

  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-betslip-compact-visible')
      document.documentElement.removeAttribute('data-live-event-betslip-visible')
      document.documentElement.removeAttribute('data-auth-page-open')
    }
  }, [])

  return (
    <div className="app-shell">
      <LocationPermissionGate isEnabled={!isStandalonePage} />
      {!isCamisaPremiadaStaticPreview ? <MobileOnly /> : null}
      <Suspense fallback={<RouteFallback />}>
        {isCamisaPremiadaStaticPreview ? (
          <CamisaPremiadaStaticPreviewPage />
        ) : isEmbaixadinhaPage ? (
          <EmbaixadinhaPage />
        ) : isMemoriaPage ? (
          <MemoriaPage />
        ) : isPongPage ? (
          <PongPage />

        ) : isEntriesPage ? (
          <EntriesPage
            activeProduct={activeProduct}
            authVariant={authVariant}
            balanceCents={playableBalanceCents}
            depositStatus={headerDepositStatus}
            HeaderComponent={HeaderV2}
            isProfileOpen={isProfileOpen}
            onLoginClick={handleLoginOpen}
            onCreateAccountClick={handleCreateAccountClick}
            onDepositOpen={handleDepositPanelOpen}
            onIdentityOpen={handleSignupIdentityOpen}
            onLimitsOpen={handleSignupLimitsOpen}
            onProfileOpen={handleProfileOpen}
            onProductChange={handleProductChange}
          />
        ) : isPromotionsPage ? (
          <PromotionsPage
            activeProduct={activeProduct}
            authVariant={authVariant}
            balanceCents={playableBalanceCents}
            depositStatus={headerDepositStatus}
            HeaderComponent={HeaderV2}
            isProfileOpen={isProfileOpen}
            onLoginClick={handleLoginOpen}
            onCreateAccountClick={handleCreateAccountClick}
            onDepositOpen={handleDepositPanelOpen}
            onIdentityOpen={handleSignupIdentityOpen}
            onLimitsOpen={handleSignupLimitsOpen}
            onProfileOpen={handleProfileOpen}
            onProductChange={handleProductChange}
          />
        ) : isSportsV2Page ? (
          <SportsPageV2
            authVariant={authVariant}
            balanceCents={playableBalanceCents}
            depositStatus={headerDepositStatus}
            isProfileOpen={isProfileOpen}
            onLoginClick={handleLoginOpen}
            onCreateAccountClick={handleCreateAccountClick}
            onDepositOpen={handleDepositPanelOpen}
            onIdentityOpen={handleSignupIdentityOpen}
            onLimitsOpen={handleSignupLimitsOpen}
            onProfileOpen={handleProfileOpen}
            onLiveEventOpenChange={handleLiveEventOpenChange}
            onSportsHomeClick={handleSportsV2Home}
          />
        ) : (
          <Home
            activeProduct={activeProduct}
            authVariant={authVariant}
            balanceCents={playableBalanceCents}
            depositStatus={headerDepositStatus}
            HeaderComponent={HeaderV2}
            isLiveEventSuppressed={isFullBetslipOpen}
            isProfileOpen={isProfileOpen}
            onLoginClick={handleLoginOpen}
            onCreateAccountClick={handleCreateAccountClick}
            onDepositOpen={handleDepositPanelOpen}
            onIdentityOpen={handleSignupIdentityOpen}
            onLimitsOpen={handleSignupLimitsOpen}
            onProfileOpen={handleProfileOpen}
            onProductChange={handleProductChange}
            onLiveEventOpenChange={handleLiveEventOpenChange}
            onLiveEventOpenSettled={handleLiveEventOpenSettled}
            onLiveEventCloseStart={handleLiveEventCloseStart}
          />
        )}
      </Suspense>
      {!isStandalonePage && isAuthPage ? (
        <LoginPage
          mode={isSignupPage ? 'signup' : 'login'}
          motionState={loginMotionState ?? 'open'}
          overlayVariant={authOverlayOrigin === 'betslip' ? 'over-betslip' : 'default'}
          onBack={handleLoginBack}
          onCreateAccountClick={handleCreateAccountClick}
          onDepositOpen={handleSignupDepositOpen}
          onEnterComplete={handleLoginEnterComplete}
          onIdentityExit={handleSignupIdentityExit}
          onIdentityVerificationStart={handleSignupIdentityVerificationStart}
          onLoginClick={handleLoginOpen}
          onLoginSuccess={handleLoginSuccess}
          onLimitsExit={handleSignupLimitsExit}
          resumeSignupIdentity={hasSignupIdentityPending}
          resumeSignupLimits={hasSignupLimitsPending}
          showSignupGarantidaBanner={showSignupGarantidaBanner}
        />
      ) : null}
      {shouldRenderFullBetslip ? (
        <Suspense fallback={null}>
          <BetslipPageV2
            authVariant={authVariant}
            balanceCents={playableBalanceCents}
            camisaPremiadaOutcomeOverride={camisaPremiadaOutcomeOverride}
            isCamisaPremiadaMode={isPremiadaMode}
            premiadaFeatureName={premiadaFeatureName}
            isCoveredByEvent={!!betslipOriginLiveEvent}
            onCreateAccountClick={handleBetslipCreateAccountClick}
            onDepositClick={handleDepositPanelOpen}
            onIdentityClick={handleBetslipIdentityOpen}
            onLimitsClick={handleBetslipLimitsOpen}
            onLoginClick={handleBetslipLoginOpen}
            onClose={handleBetslipClose}
            onBetSuccess={handleBetSuccess}
            onSelectionsEmptyExitStart={handleCompactBetslipSuppress}
            requiresIdentity={hasSignupIdentityPending}
            requiresDeposit={isDepositRequiredForBetting}
            requiresLimits={hasSignupLimitsPending}
          />
        </Suspense>
      ) : null}
      {!isStandalonePage && betSuccessReceipt ? (
        <Suspense fallback={null}>
          <BetSuccessPage
            receipt={betSuccessReceipt}
            onShare={handleBetSuccessShare}
            onNewBet={handleBetSuccessNewBet}
          />
        </Suspense>
      ) : null}
      {!isStandalonePage && !isAuthPage && betslipOriginLiveEvent ? (
        <Suspense fallback={null}>
          <LiveEventPage
            isOpen={betslipOriginLiveEvent.isOpen}
            onClose={handleBetslipOriginLiveEventClose}
            onOpenSettled={handleLiveEventOpenSettled}
            onCloseStart={handleLiveEventCloseStart}
            matches={betslipOriginLiveEvent.payload.matches}
            railEvents={betslipOriginLiveEvent.payload.railEvents}
            selectedIndex={betslipOriginLiveEvent.payload.selectedIndex}
            currentTimes={betslipOriginLiveEvent.payload.currentTimes}
            leagueName={betslipOriginLiveEvent.payload.leagueName}
            leagueFlag={betslipOriginLiveEvent.payload.leagueFlag}
            sport={betslipOriginLiveEvent.payload.sport}
          />
        </Suspense>
      ) : null}
      {!isStandalonePage && (!isAuthPage || isDepositPanelOpen) ? (
        <DepositPanel
          isOpen={isDepositPanelOpen}
          onClose={handleDepositPanelClose}
          presentation={depositPanelOrigin === 'signup' ? 'fullscreen' : 'bottom-sheet'}
          confirmationMode={depositConfirmationMode}
          initialAmountCents={depositPanelInitialAmountCents}
          initialView={depositPanelInitialView}
          savedAccounts={savedDepositAccounts}
          activeAccountId={activeDepositAccountId}
          newBankAccountId={nextDepositAccountId}
          onEnterComplete={handleDepositPanelEnterComplete}
          onRemoveAccount={handleDepositAccountRemove}
          onSelectAccount={handleDepositAccountSelect}
          onDepositConfirmed={handleDepositConfirmed}
          onDepositPending={depositPanelOrigin === 'signup' ? handleSignupDepositPending : undefined}
        />
      ) : null}
      {!isStandalonePage && !isAuthPage && authVariant === 'logged-in' ? (
        <ProfileBottomSheet
          isOpen={isProfileOpen}
          onClose={handleProfileClose}
          onWithdrawalConfirmed={handleWithdrawalConfirmed}
          withdrawableBalanceCents={withdrawableBalanceCents}
          promotionalBalanceCents={promotionalBalanceCents}
          freeBetBalanceCents={freeBetBalanceCents}
          depositFlow={{
            savedAccounts: savedDepositAccounts,
            activeAccountId: activeDepositAccountId,
            newBankAccountId: nextDepositAccountId,
            onRemoveAccount: handleDepositAccountRemove,
            onSelectAccount: handleDepositAccountSelect,
            onDepositConfirmed: handleDepositConfirmed,
          }}
          withdrawalFlow={{
            savedAccounts: savedWithdrawalAccounts,
            activeAccountId: activeWithdrawalAccountId,
            newBankAccountId: nextWithdrawalAccountId,
            onRemoveAccount: handleWithdrawalAccountRemove,
            onSelectAccount: handleWithdrawalAccountSelect,
            onAddAccount: handleWithdrawalAccountAdd,
          }}
        />
      ) : null}
      {!isStandalonePage && isNflPlaysPage ? (
        <Suspense fallback={null}>
          <NflPlaysStatsBottomSheet isOpen={true} onClose={handleNflPlaysClose} />
        </Suspense>
      ) : null}
      {!isStandalonePage && !isAuthPage ? (
        <FeatureFlagsPanel isOpen={isFeatureFlagsPanelOpen} onClose={handleFeatureFlagsPanelClose} />
      ) : null}
      {!isStandalonePage && !isAuthPage ? (
        <>
          <Betslip
            visible={showCompactBetslip}
            summary={betslipSummary}
            suppressTurboBoost={isPremiadaMode}
            turboEligibleSelectionCount={betslipTurboEligibleSelectionCount}
            showFreeBetTag={showFreeBetTag && !shouldShowEventBetslip}
            presentationKey="base"
            onOpen={handleBetslipOpen}
          />
          <Betslip
            visible={shouldShowEventBetslip}
            summary={betslipSummary}
            suppressTurboBoost={isPremiadaMode}
            turboEligibleSelectionCount={betslipTurboEligibleSelectionCount}
            compactOnly={true}
            showFreeBetTag={showFreeBetTag && shouldShowEventBetslip}
            presentationKey={`live-event-${liveEventUi.betslipMotionKey}`}
            onOpen={handleEventBetslipOpen}
          />
        </>
      ) : null}
      {!isStandalonePage ? (
        <Navbar
          activeProduct={activeProduct}
          activeItemId={isEntriesPage
            ? entriesRouteSegment
            : isPromotionsPage ? promotionsRouteSegment : activeProduct === 'cassino' ? 'ao-vivo' : 'home'}
          onItemSelect={handleNavbarItemSelect}
        />
      ) : null}
    </div>
  )
}

function App() {
  return (
    <FeatureFlagsProvider>
      <BetslipProvider>
        <AppContent />
      </BetslipProvider>
    </FeatureFlagsProvider>
  )
}

export default App
