import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal } from 'react-dom'
import backHeaderIcon from '../../assets/iconsDraftaco/backHeader.svg'
import closeIcon from '../../assets/iconsDraftaco/closeBS.svg'
import chevronRightIcon from '../../assets/iconsDraftaco/chevronRight.svg'
import freeBetIcon from '../../assets/iconsDraftaco/iconMenuApostaGratis.png'
import settingsIcon from '../../assets/iconsDraftaco/iconMenuConfiguracoes.svg'
import depositIcon from '../../assets/iconsDraftaco/iconMenuDepositar.svg'
import faqIcon from '../../assets/iconsDraftaco/iconMenuDuvidasFrequentes.svg'
import earningsIcon from '../../assets/iconsDraftaco/iconMenuGanhosPerdas.svg'
import incomeReportIcon from '../../assets/iconsDraftaco/iconMenuInformeRendimentos.svg'
import responsibleGamingIcon from '../../assets/iconsDraftaco/iconMenuJogoResponsavel.svg'
import personalDataIcon from '../../assets/iconsDraftaco/iconMenuMeusDados.svg'
import activitiesIcon from '../../assets/iconsDraftaco/iconMenuMinhasAtividades.svg'
import privacyIcon from '../../assets/iconsDraftaco/iconMenuPoliticaPrivacidade.svg'
import responsibleGamingPolicyIcon from '../../assets/iconsDraftaco/iconMenuPoliticaJogoResp.svg'
import rulesIcon from '../../assets/iconsDraftaco/iconMenuRegrasApostas.svg'
import freeSpinIcon from '../../assets/iconsDraftaco/iconMenuRodadaGratis.png'
import withdrawIcon from '../../assets/iconsDraftaco/iconMenuSacar.svg'
import removePixIcon from '../../assets/iconsDraftaco/iconRemoverPixGde.svg'
import withdrawalNewPixInputIcon from '../../assets/iconsDraftaco/iconInputChavePix.svg'
import inputErrorIcon from '../../assets/iconsDraftaco/iconError.svg'
import withdrawalInfoIcon from '../../assets/iconsDraftaco/iconSaqueInfo.svg'
import promotionalBalanceIcon from '../../assets/iconSports/iconSaldoPromo.svg'
import withdrawalRemovePixIllustration from '../../assets/iconsDraftaco/iconSaqueRemoverPix.png'
import withdrawalSuccessIllustration from '../../assets/iconsDraftaco/iconSaqueSucesso.png'
import withdrawalBankIcon from '../../assets/iconsDraftaco/iconBanco.svg'
import withdrawalAccountIcon from '../../assets/iconsDraftaco/iconConta.svg'
import withdrawalCpfIcon from '../../assets/iconsDraftaco/iconCPF.svg'
import logoutIcon from '../../assets/iconsDraftaco/iconMenuSair.svg'
import suggestionsIcon from '../../assets/iconsDraftaco/iconMenuSugestoes.svg'
import supportIcon from '../../assets/iconsDraftaco/iconMenuSuporte.svg'
import termsIcon from '../../assets/iconsDraftaco/iconMenuTermos.svg'
import balanceChevronDownIcon from '../../assets/iconsDraftaco/profileBalanceChevronDown.svg'
import profileCardLight from '../../assets/iconsDraftaco/profileCardLight.svg'
import { useStableKeyboardViewport } from '../../hooks/useStableKeyboardViewport'
import { useTapFocusScrollGuard } from '../../hooks/useTapFocusScrollGuard'
import { useTouchScrollFence } from '../../hooks/useTouchScrollFence'
import {
  formatPixKeyInput,
  getAmbiguousPixKeyTypes,
  validatePixKey,
  type PixKeyNumericType,
  type PixKeyType,
} from '../../utils/pixKeyValidation'
import {
  DepositPanel,
  type DepositAccount,
  type DepositAccountId,
} from '../DepositPanel'
import { BottomSheet } from '../BottomSheet'
import {
  FacialVerificationCapture,
  IdentityVerificationLoading,
} from '../IdentityVerification'
import '../DepositPanel/DepositPanel.css'
import './ProfileBottomSheet.css'

export interface ProfileDepositFlowProps {
  savedAccounts?: DepositAccount[]
  activeAccountId?: DepositAccountId | null
  newBankAccountId?: DepositAccountId | null
  onRemoveAccount?: (accountId: DepositAccountId) => void
  onSelectAccount?: (accountId: DepositAccountId) => void
  onDepositConfirmed?: (amountCents: number, accountId: DepositAccountId) => void
}

export interface ProfileWithdrawalFlowProps {
  savedAccounts?: DepositAccount[]
  activeAccountId?: DepositAccountId | null
  newBankAccountId?: DepositAccountId | null
  onRemoveAccount?: (accountId: DepositAccountId) => void
  onSelectAccount?: (accountId: DepositAccountId) => void
  onAddAccount?: (
    accountId: DepositAccountId,
    pixKeyType: PixKeyType,
    pixKeyValue: string,
  ) => void
}

interface ProfileBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  onWithdrawalConfirmed?: (amountCents: number) => void
  withdrawableBalanceCents?: number
  promotionalBalanceCents?: number
  freeBetBalanceCents?: number
  depositFlow?: ProfileDepositFlowProps
  withdrawalFlow?: ProfileWithdrawalFlowProps
}

type ProfileSheetMotionState = 'entering' | 'open' | 'closing'
type ProfileHeaderDragPhase = 'idle' | 'dragging' | 'closing'
type ProfileRoute = 'profile' | 'deposit' | 'withdrawal'
type EmbeddedDepositView = 'form' | 'pix'
type WithdrawalVerificationStage = 'face' | 'loading'
type BalanceInfoContext = 'withdrawal' | 'promotional'

interface WithdrawalReceipt {
  amountCents: number
  bankName: string
  lastDigits: string
}

interface ProfileHeaderDragState {
  captureTarget: HTMLElement
  pointerId: number
  startX: number
  startY: number
}

const profileSheetMotionDurationMs = 300
const profileHeaderDragIntentThresholdPx = 8
const profileHeaderCloseThresholdPx = 48
const withdrawalVerificationFadeDurationMs = 180
const withdrawalLoadingFadeDurationMs = 240
const withdrawalContinueLoadingDurationMs = 1500
const withdrawalVerificationLoadingDurationMs = 1500
const withdrawalSuccessDelayDurationMs = 150
const defaultWithdrawableBalanceCents = 25000
const defaultPromotionalBalanceCents = 2000
const defaultFreeBetBalanceCents = 1000
const maxWithdrawalInputCents = 999999999
const maxSavedPixAccounts = 3
const duplicatePixKeyErrorMessage = 'Você já tem essa chave Pix cadastrada.'
const withdrawalMockCpf = '123.456.789-00'

const profileMenuSections = [
  {
    id: 'account',
    title: 'MINHA CONTA',
    options: [
      { label: 'Minhas atividades', icon: activitiesIcon },
      { label: 'Jogo Responsável', icon: responsibleGamingIcon },
      { label: 'Meus dados', icon: personalDataIcon },
      { label: 'Configurações de aposta', icon: settingsIcon },
    ],
  },
  {
    id: 'support',
    title: 'SUPORTE',
    options: [
      { label: 'Dúvidas Frequentes', icon: faqIcon },
      { label: 'Regras de Jogos e Apostas', icon: rulesIcon },
    ],
  },
  {
    id: 'legal',
    title: 'LEGAL',
    options: [
      { label: 'Ganhos e Perdas', icon: earningsIcon },
      { label: 'Termos e Condições', icon: termsIcon },
      { label: 'Política de Privacidade', icon: privacyIcon },
      { label: 'Política de Jogo Responsável', icon: responsibleGamingPolicyIcon },
      { label: 'Informe de Rendimentos', icon: incomeReportIcon },
    ],
  },
]

const formatBalance = (amountCents: number) => {
  const safeAmountCents = Number.isFinite(amountCents) ? Math.max(0, amountCents) : 0

  return `R$ ${(safeAmountCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const formatWithdrawalAmountInput = (amountCents: number) => (
  (amountCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
)

const formatPromotionalBalance = (amountCents: number) => (
  (amountCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
)

const formatWithdrawalAvailableLimit = (amountCents: number) => (
  `R$ ${(amountCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: amountCents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
)

const parseWithdrawalAmountCents = (value: string) => {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0

  const amountCents = Math.min(Number(digits), maxWithdrawalInputCents)
  return Number.isFinite(amountCents) ? amountCents : 0
}

export function ProfileBottomSheet({
  isOpen,
  onClose,
  onWithdrawalConfirmed,
  withdrawableBalanceCents = defaultWithdrawableBalanceCents,
  promotionalBalanceCents = defaultPromotionalBalanceCents,
  freeBetBalanceCents = defaultFreeBetBalanceCents,
  depositFlow,
  withdrawalFlow,
}: ProfileBottomSheetProps) {
  const [shouldRender, setShouldRender] = useState(false)
  const [motionState, setMotionState] = useState<ProfileSheetMotionState>('entering')
  const [headerDragPhase, setHeaderDragPhase] = useState<ProfileHeaderDragPhase>('idle')
  const shouldRenderRef = useRef(false)
  const openTimerRef = useRef<number | null>(null)
  const closeTimerRef = useRef<number | null>(null)
  const routeTimerRef = useRef<number | null>(null)
  const routeFrameRef = useRef<number | null>(null)
  const withdrawalNewPixSubmitTimerRef = useRef<number | null>(null)
  const withdrawalContinueTimerRef = useRef<number | null>(null)
  const withdrawalVerificationTimerRef = useRef<number | null>(null)
  const withdrawalSuccessDelayTimerRef = useRef<number | null>(null)
  const hasConfirmedWithdrawalRef = useRef(false)
  const headerDragRef = useRef<ProfileHeaderDragState | null>(null)
  const shouldSuppressHeaderClickRef = useRef(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const sheetRef = useRef<HTMLElement | null>(null)
  const withdrawalAmountInputRef = useRef<HTMLInputElement | null>(null)
  const withdrawalNewPixInputRef = useRef<HTMLInputElement | null>(null)
  const [route, setRoute] = useState<ProfileRoute>('profile')
  const [isRouteTransitioning, setIsRouteTransitioning] = useState(false)
  const [isDepositMounted, setIsDepositMounted] = useState(false)
  const [depositView, setDepositView] = useState<EmbeddedDepositView>('form')
  const [depositHost, setDepositHost] = useState<HTMLDivElement | null>(null)
  const [isProfileBalanceExpanded, setIsProfileBalanceExpanded] = useState(false)
  const [withdrawalAmountInput, setWithdrawalAmountInput] = useState('')
  const [isWithdrawalContinueLoading, setIsWithdrawalContinueLoading] = useState(false)
  const [isWithdrawalBackgroundHidden, setIsWithdrawalBackgroundHidden] = useState(false)
  const [withdrawalVerificationStage, setWithdrawalVerificationStage] = useState<WithdrawalVerificationStage | null>(null)
  const [isWithdrawalVerificationFadingOut, setIsWithdrawalVerificationFadingOut] = useState(false)
  const [isWithdrawalSuccessOpen, setIsWithdrawalSuccessOpen] = useState(false)
  const [withdrawalReceipt, setWithdrawalReceipt] = useState<WithdrawalReceipt | null>(null)
  const [isWithdrawalInfoOpen, setIsWithdrawalInfoOpen] = useState(false)
  const [balanceInfoContext, setBalanceInfoContext] = useState<BalanceInfoContext>('withdrawal')
  const [isWithdrawalKeySheetOpen, setIsWithdrawalKeySheetOpen] = useState(false)
  const [isWithdrawalNewPixSheetOpen, setIsWithdrawalNewPixSheetOpen] = useState(false)
  const [isWithdrawalNewPixStacked, setIsWithdrawalNewPixStacked] = useState(false)
  const [withdrawalNewPixKey, setWithdrawalNewPixKey] = useState('')
  const [withdrawalNewPixNumericType, setWithdrawalNewPixNumericType] = useState<PixKeyNumericType | null>(null)
  const [isWithdrawalNewPixKeyTouched, setIsWithdrawalNewPixKeyTouched] = useState(false)
  const [isWithdrawalNewPixSubmitting, setIsWithdrawalNewPixSubmitting] = useState(false)
  const [recentlyAddedWithdrawalAccountId, setRecentlyAddedWithdrawalAccountId] = useState<DepositAccountId | null>(null)
  const [withdrawalAccountPendingRemovalId, setWithdrawalAccountPendingRemovalId] = useState<DepositAccountId | null>(null)
  const withdrawalAccounts = withdrawalFlow?.savedAccounts ?? []
  const activeWithdrawalAccount = withdrawalAccounts.find((account) => account.id === withdrawalFlow?.activeAccountId) ?? null
  const withdrawalAccountPendingRemoval = withdrawalAccounts.find((account) => (
    account.id === withdrawalAccountPendingRemovalId
  )) ?? null
  const hasMultipleWithdrawalAccounts = withdrawalAccounts.length > 1
  const hasReachedWithdrawalAccountLimit = withdrawalAccounts.length >= maxSavedPixAccounts
  const ambiguousWithdrawalNewPixKeyTypes = getAmbiguousPixKeyTypes(withdrawalNewPixKey)
  const hasAmbiguousWithdrawalNewPixKey = ambiguousWithdrawalNewPixKeyTypes.length === 2
  const withdrawalNewPixValidation = validatePixKey(
    withdrawalNewPixKey,
    withdrawalNewPixNumericType,
  )
  const isWithdrawalNewPixKeyDuplicate = withdrawalNewPixValidation.isValid
    && withdrawalAccounts.some((account) => {
      const savedNumericType = account.pixKeyType === 'cpf' || account.pixKeyType === 'phone'
        ? account.pixKeyType
        : null
      const savedKeyValidation = validatePixKey(account.pixKeyValue, savedNumericType)

      return account.pixKeyType === withdrawalNewPixValidation.type
        && savedKeyValidation.normalizedValue === withdrawalNewPixValidation.normalizedValue
    })
  const withdrawalNewPixKeyError = isWithdrawalNewPixKeyDuplicate
    ? duplicatePixKeyErrorMessage
    : withdrawalNewPixValidation.errorMessage
  const visibleWithdrawalNewPixKeyError = !isWithdrawalNewPixSubmitting && isWithdrawalNewPixKeyTouched
    ? withdrawalNewPixKeyError
    : null
  const hasValidWithdrawalNewPixKey = withdrawalNewPixValidation.isValid
    && !isWithdrawalNewPixKeyDuplicate
  const availableWithdrawalCents = Number.isFinite(withdrawableBalanceCents)
    ? Math.max(0, Math.round(withdrawableBalanceCents))
    : 0
  const availablePromotionalCents = Number.isFinite(promotionalBalanceCents)
    ? Math.max(0, Math.round(promotionalBalanceCents))
    : 0
  const availableFreeBetCents = Number.isFinite(freeBetBalanceCents)
    ? Math.max(0, Math.round(freeBetBalanceCents))
    : 0
  const playableBalanceCents = availableWithdrawalCents + availablePromotionalCents
  const withdrawalAmountCents = parseWithdrawalAmountCents(withdrawalAmountInput)
  const hasWithdrawalAmountError = withdrawalAmountCents > availableWithdrawalCents
  const hasValidWithdrawalAmount = withdrawalAmountCents > 0
    && !hasWithdrawalAmountError
    && activeWithdrawalAccount !== null

  useStableKeyboardViewport({
    rootRef: containerRef,
    scrollContainerSelector: '.profile-withdrawal__main',
    stableHeightCssVariable: '--profile-stable-viewport-height',
    keyboardInsetCssVariable: '--profile-keyboard-inset',
    enabled: shouldRender,
  })

  const withdrawalAmountFocusGuard = useTapFocusScrollGuard({
    inputRef: withdrawalAmountInputRef,
    isEnabled: shouldRender && route === 'withdrawal',
  })

  const withdrawalNewPixFocusGuard = useTapFocusScrollGuard({
    inputRef: withdrawalNewPixInputRef,
    isEnabled: shouldRender && isWithdrawalNewPixSheetOpen && !isWithdrawalNewPixSubmitting,
  })

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current === null) return

    window.clearTimeout(openTimerRef.current)
    openTimerRef.current = null
  }, [])

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return

    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const clearRouteMotion = useCallback(() => {
    if (routeTimerRef.current !== null) {
      window.clearTimeout(routeTimerRef.current)
      routeTimerRef.current = null
    }

    if (routeFrameRef.current !== null) {
      window.cancelAnimationFrame(routeFrameRef.current)
      routeFrameRef.current = null
    }
  }, [])

  const clearWithdrawalNewPixSubmitTimer = useCallback(() => {
    if (withdrawalNewPixSubmitTimerRef.current === null) return

    window.clearTimeout(withdrawalNewPixSubmitTimerRef.current)
    withdrawalNewPixSubmitTimerRef.current = null
  }, [])

  const clearWithdrawalVerificationTimer = useCallback(() => {
    if (withdrawalVerificationTimerRef.current === null) return

    window.clearTimeout(withdrawalVerificationTimerRef.current)
    withdrawalVerificationTimerRef.current = null
  }, [])

  const clearWithdrawalContinueTimer = useCallback(() => {
    if (withdrawalContinueTimerRef.current === null) return

    window.clearTimeout(withdrawalContinueTimerRef.current)
    withdrawalContinueTimerRef.current = null
  }, [])

  const clearWithdrawalSuccessDelayTimer = useCallback(() => {
    if (withdrawalSuccessDelayTimerRef.current === null) return

    window.clearTimeout(withdrawalSuccessDelayTimerRef.current)
    withdrawalSuccessDelayTimerRef.current = null
  }, [])

  const requestClose = useCallback(() => {
    if (motionState === 'closing') return
    setIsWithdrawalInfoOpen(false)
    setIsWithdrawalKeySheetOpen(false)
    setIsWithdrawalNewPixStacked(false)
    setIsWithdrawalNewPixSheetOpen(false)
    clearWithdrawalContinueTimer()
    clearWithdrawalVerificationTimer()
    clearWithdrawalSuccessDelayTimer()
    setIsWithdrawalContinueLoading(false)
    setWithdrawalVerificationStage(null)
    setIsWithdrawalVerificationFadingOut(false)
    setIsWithdrawalSuccessOpen(false)
    setWithdrawalAccountPendingRemovalId(null)
    onClose()
  }, [clearWithdrawalContinueTimer, clearWithdrawalSuccessDelayTimer, clearWithdrawalVerificationTimer, motionState, onClose])

  const handleHeaderPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (motionState !== 'open') return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    shouldSuppressHeaderClickRef.current = false
    headerDragRef.current = {
      captureTarget: event.currentTarget,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    setHeaderDragPhase('dragging')
    sheetRef.current?.style.setProperty('--profile-header-drag-y', '0px')
    overlayRef.current?.style.setProperty('opacity', '1')

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture is optional; events can still finish inside the header.
    }
  }, [motionState])

  const handleHeaderPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = headerDragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    const dragOffsetY = Math.max(0, deltaY)
    const sheetHeight = sheetRef.current?.getBoundingClientRect().height ?? window.innerHeight
    const dragProgress = Math.min(dragOffsetY / Math.max(1, sheetHeight), 1)

    sheetRef.current?.style.setProperty('--profile-header-drag-y', `${dragOffsetY}px`)
    overlayRef.current?.style.setProperty('opacity', String(1 - dragProgress))

    if (Math.hypot(deltaX, deltaY) >= profileHeaderDragIntentThresholdPx) {
      shouldSuppressHeaderClickRef.current = true
    }

    if (deltaY > 0) event.preventDefault()
  }, [])

  const finishHeaderDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = headerDragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    const shouldClose = deltaY >= profileHeaderCloseThresholdPx
      && deltaY > Math.abs(deltaX)

    if (drag.captureTarget.hasPointerCapture(event.pointerId)) {
      drag.captureTarget.releasePointerCapture(event.pointerId)
    }

    headerDragRef.current = null

    if (shouldSuppressHeaderClickRef.current) {
      window.setTimeout(() => {
        shouldSuppressHeaderClickRef.current = false
      }, 0)
    }

    if (shouldClose) {
      setHeaderDragPhase('closing')
      overlayRef.current?.style.setProperty('opacity', '0')
      requestClose()
      return
    }

    setHeaderDragPhase('idle')
    sheetRef.current?.style.setProperty('--profile-header-drag-y', '0px')
    overlayRef.current?.style.removeProperty('opacity')
  }, [requestClose])

  const cancelHeaderDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = headerDragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    if (drag.captureTarget.hasPointerCapture(event.pointerId)) {
      drag.captureTarget.releasePointerCapture(event.pointerId)
    }

    headerDragRef.current = null
    shouldSuppressHeaderClickRef.current = false
    setHeaderDragPhase('idle')
    sheetRef.current?.style.setProperty('--profile-header-drag-y', '0px')
    overlayRef.current?.style.removeProperty('opacity')
  }, [])

  const handleHeaderClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!shouldSuppressHeaderClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    shouldSuppressHeaderClickRef.current = false
  }, [])

  const handleDepositOpen = useCallback(() => {
    if (!depositFlow || !depositHost || motionState === 'closing' || isRouteTransitioning) return

    clearRouteMotion()
    setDepositView('form')
    setIsDepositMounted(true)
    setIsRouteTransitioning(true)

    routeFrameRef.current = window.requestAnimationFrame(() => {
      routeFrameRef.current = null
      setRoute('deposit')
      routeTimerRef.current = window.setTimeout(() => {
        routeTimerRef.current = null
        setIsRouteTransitioning(false)
      }, profileSheetMotionDurationMs)
    })
  }, [clearRouteMotion, depositFlow, depositHost, isRouteTransitioning, motionState])

  const handleWithdrawalOpen = useCallback(() => {
    if (motionState === 'closing' || isRouteTransitioning) return

    clearRouteMotion()
    clearWithdrawalContinueTimer()
    clearWithdrawalVerificationTimer()
    clearWithdrawalSuccessDelayTimer()
    hasConfirmedWithdrawalRef.current = false
    setWithdrawalAmountInput('')
    setIsWithdrawalContinueLoading(false)
    setIsWithdrawalBackgroundHidden(false)
    setWithdrawalReceipt(null)
    setWithdrawalVerificationStage(null)
    setIsWithdrawalVerificationFadingOut(false)
    setIsWithdrawalSuccessOpen(false)
    setIsWithdrawalInfoOpen(false)
    setIsWithdrawalKeySheetOpen(false)
    setIsWithdrawalNewPixStacked(false)
    setIsWithdrawalNewPixSheetOpen(false)
    setWithdrawalAccountPendingRemovalId(null)
    setIsRouteTransitioning(true)

    routeFrameRef.current = window.requestAnimationFrame(() => {
      routeFrameRef.current = null
      setRoute('withdrawal')
      routeTimerRef.current = window.setTimeout(() => {
        routeTimerRef.current = null
        setIsRouteTransitioning(false)
      }, profileSheetMotionDurationMs)
    })
  }, [
    clearRouteMotion,
    clearWithdrawalContinueTimer,
    clearWithdrawalSuccessDelayTimer,
    clearWithdrawalVerificationTimer,
    isRouteTransitioning,
    motionState,
  ])

  const handleRouteBack = useCallback(() => {
    const isDepositForm = route === 'deposit' && depositView === 'form'
    if ((!isDepositForm && route !== 'withdrawal') || isRouteTransitioning) return

    clearRouteMotion()
    clearWithdrawalContinueTimer()
    setIsWithdrawalContinueLoading(false)
    setIsRouteTransitioning(true)
    setRoute('profile')
    setWithdrawalAmountInput('')
    setIsWithdrawalInfoOpen(false)
    setIsWithdrawalKeySheetOpen(false)
    setIsWithdrawalNewPixStacked(false)
    setIsWithdrawalNewPixSheetOpen(false)
    setWithdrawalAccountPendingRemovalId(null)
    routeTimerRef.current = window.setTimeout(() => {
      routeTimerRef.current = null
      if (isDepositForm) {
        setIsDepositMounted(false)
        setDepositView('form')
      }
      setIsRouteTransitioning(false)
    }, profileSheetMotionDurationMs)
  }, [clearRouteMotion, clearWithdrawalContinueTimer, depositView, isRouteTransitioning, route])

  const handleWithdrawalAmountChange = useCallback((value: string) => {
    const nextAmountCents = parseWithdrawalAmountCents(value)
    setWithdrawalAmountInput(nextAmountCents > 0 ? formatWithdrawalAmountInput(nextAmountCents) : '')
  }, [])

  const handleWithdrawalMax = useCallback(() => {
    setWithdrawalAmountInput(
      availableWithdrawalCents > 0 ? formatWithdrawalAmountInput(availableWithdrawalCents) : '',
    )
  }, [availableWithdrawalCents])

  const handleWithdrawalContinue = useCallback(() => {
    if (
      !hasValidWithdrawalAmount
      || !activeWithdrawalAccount
      || isWithdrawalContinueLoading
      || withdrawalVerificationStage !== null
      || isWithdrawalSuccessOpen
    ) return

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }

    clearWithdrawalContinueTimer()
    clearWithdrawalVerificationTimer()
    clearWithdrawalSuccessDelayTimer()
    hasConfirmedWithdrawalRef.current = false
    setWithdrawalReceipt({
      amountCents: withdrawalAmountCents,
      bankName: activeWithdrawalAccount.bankName,
      lastDigits: activeWithdrawalAccount.lastDigits,
    })
    setIsWithdrawalVerificationFadingOut(false)
    setIsWithdrawalContinueLoading(true)
    withdrawalContinueTimerRef.current = window.setTimeout(() => {
      withdrawalContinueTimerRef.current = null
      setIsWithdrawalContinueLoading(false)
      setWithdrawalVerificationStage('face')
    }, withdrawalContinueLoadingDurationMs)
  }, [
    activeWithdrawalAccount,
    clearWithdrawalContinueTimer,
    clearWithdrawalSuccessDelayTimer,
    clearWithdrawalVerificationTimer,
    hasValidWithdrawalAmount,
    isWithdrawalContinueLoading,
    isWithdrawalSuccessOpen,
    withdrawalAmountCents,
    withdrawalVerificationStage,
  ])

  const handleWithdrawalFacialVerificationComplete = useCallback(() => {
    if (withdrawalVerificationStage !== 'face' || isWithdrawalVerificationFadingOut) return

    clearWithdrawalVerificationTimer()
    setIsWithdrawalVerificationFadingOut(true)
    withdrawalVerificationTimerRef.current = window.setTimeout(() => {
      withdrawalVerificationTimerRef.current = null
      setWithdrawalVerificationStage('loading')
      setIsWithdrawalVerificationFadingOut(false)
    }, withdrawalVerificationFadeDurationMs)
  }, [clearWithdrawalVerificationTimer, isWithdrawalVerificationFadingOut, withdrawalVerificationStage])

  const handleWithdrawalVerificationEnterAnimationEnd = useCallback((animationName: string) => {
    if (withdrawalVerificationStage !== 'face' || animationName !== 'login-page-slide-in') return

    setIsWithdrawalBackgroundHidden(true)
  }, [withdrawalVerificationStage])

  const handleWithdrawalSuccessDismiss = useCallback(() => {
    if (!isWithdrawalSuccessOpen) return

    setIsWithdrawalSuccessOpen(false)
    requestClose()
  }, [isWithdrawalSuccessOpen, requestClose])

  const handleWithdrawalSuccessClosed = useCallback(() => {
    setIsWithdrawalSuccessOpen(false)
  }, [])

  const handleWithdrawalAccountSelect = useCallback((accountId: DepositAccountId) => {
    withdrawalFlow?.onSelectAccount?.(accountId)
  }, [withdrawalFlow])

  const handleWithdrawalKeySheetOpen = useCallback(() => {
    if (!hasMultipleWithdrawalAccounts) return

    setWithdrawalAccountPendingRemovalId(null)
    setIsWithdrawalKeySheetOpen(true)
  }, [hasMultipleWithdrawalAccounts])

  const handleWithdrawalKeySheetClose = useCallback(() => {
    setWithdrawalAccountPendingRemovalId(null)
    setIsWithdrawalKeySheetOpen(false)
  }, [])

  const handleWithdrawalNewPixSheetOpen = useCallback(() => {
    if (
      hasReachedWithdrawalAccountLimit
      || !withdrawalFlow?.newBankAccountId
      || !withdrawalFlow.onAddAccount
    ) return

    clearWithdrawalNewPixSubmitTimer()
    setWithdrawalNewPixKey('')
    setWithdrawalNewPixNumericType(null)
    setIsWithdrawalNewPixKeyTouched(false)
    setIsWithdrawalNewPixSubmitting(false)
    setIsWithdrawalNewPixSheetOpen(true)
    setIsWithdrawalNewPixStacked(true)
  }, [clearWithdrawalNewPixSubmitTimer, hasReachedWithdrawalAccountLimit, withdrawalFlow])

  const handleWithdrawalNewPixSheetCloseStart = useCallback(() => {
    setIsWithdrawalNewPixStacked(false)
  }, [])

  const handleWithdrawalNewPixSheetClose = useCallback(() => {
    clearWithdrawalNewPixSubmitTimer()
    setIsWithdrawalNewPixSheetOpen(false)
    setIsWithdrawalNewPixStacked(false)
    setWithdrawalNewPixKey('')
    setWithdrawalNewPixNumericType(null)
    setIsWithdrawalNewPixKeyTouched(false)
    setIsWithdrawalNewPixSubmitting(false)
  }, [clearWithdrawalNewPixSubmitTimer])

  const handleWithdrawalNewPixSubmit = useCallback(() => {
    const accountId = withdrawalFlow?.newBankAccountId
    const pixKeyType = withdrawalNewPixValidation.type

    if (
      isWithdrawalNewPixSubmitting
      || hasReachedWithdrawalAccountLimit
      || !hasValidWithdrawalNewPixKey
      || !accountId
      || !pixKeyType
      || !withdrawalFlow?.onAddAccount
    ) {
      setIsWithdrawalNewPixKeyTouched(withdrawalNewPixKey.trim().length > 0)
      return
    }

    clearWithdrawalNewPixSubmitTimer()
    setIsWithdrawalNewPixSubmitting(true)
    setIsWithdrawalNewPixKeyTouched(false)
    withdrawalFlow.onAddAccount(
      accountId,
      pixKeyType,
      withdrawalNewPixValidation.normalizedValue,
    )
    setRecentlyAddedWithdrawalAccountId(accountId)
    setIsWithdrawalNewPixStacked(false)
    setIsWithdrawalNewPixSheetOpen(false)

    withdrawalNewPixSubmitTimerRef.current = window.setTimeout(() => {
      withdrawalNewPixSubmitTimerRef.current = null
      setWithdrawalNewPixKey('')
      setWithdrawalNewPixNumericType(null)
      setIsWithdrawalNewPixKeyTouched(false)
      setIsWithdrawalNewPixSubmitting(false)
    }, profileSheetMotionDurationMs)
  }, [
    clearWithdrawalNewPixSubmitTimer,
    hasReachedWithdrawalAccountLimit,
    hasValidWithdrawalNewPixKey,
    isWithdrawalNewPixSubmitting,
    withdrawalNewPixKey,
    withdrawalNewPixValidation.normalizedValue,
    withdrawalNewPixValidation.type,
    withdrawalFlow,
  ])

  const handleWithdrawalMethodCardAnimationEnd = useCallback((accountId: DepositAccountId) => {
    setRecentlyAddedWithdrawalAccountId((currentAccountId) => (
      currentAccountId === accountId ? null : currentAccountId
    ))
  }, [])

  const handleWithdrawalNewPixKeyChange = useCallback((value: string) => {
    const remainsAmbiguous = getAmbiguousPixKeyTypes(value).length === 2
    const currentDigits = withdrawalNewPixKey.replace(/\D/g, '')
    const nextDigits = value.replace(/\D/g, '')
    const keepsCurrentAmbiguousValue = remainsAmbiguous && currentDigits === nextDigits
    const nextNumericType = keepsCurrentAmbiguousValue ? withdrawalNewPixNumericType : null

    setWithdrawalNewPixKey(formatPixKeyInput(value, nextNumericType))
    if (!keepsCurrentAmbiguousValue) setWithdrawalNewPixNumericType(null)
    setIsWithdrawalNewPixKeyTouched(false)
  }, [withdrawalNewPixKey, withdrawalNewPixNumericType])

  const handleWithdrawalNewPixNumericTypeSelect = useCallback((numericType: PixKeyNumericType) => {
    setWithdrawalNewPixNumericType(numericType)
    setWithdrawalNewPixKey((currentValue) => formatPixKeyInput(currentValue, numericType))
    setIsWithdrawalNewPixKeyTouched(true)
  }, [])

  const handleWithdrawalNewPixKeyBlur = useCallback(() => {
    setIsWithdrawalNewPixKeyTouched(withdrawalNewPixKey.trim().length > 0)
  }, [withdrawalNewPixKey])

  const handleWithdrawalAccountRemovalRequest = useCallback((accountId: DepositAccountId) => {
    if (!hasMultipleWithdrawalAccounts) return

    setWithdrawalAccountPendingRemovalId(accountId)
  }, [hasMultipleWithdrawalAccounts])

  const handleWithdrawalAccountRemovalCancel = useCallback(() => {
    setWithdrawalAccountPendingRemovalId(null)
  }, [])

  const handleWithdrawalAccountRemovalConfirm = useCallback(() => {
    if (!withdrawalAccountPendingRemovalId || !hasMultipleWithdrawalAccounts) return

    withdrawalFlow?.onRemoveAccount?.(withdrawalAccountPendingRemovalId)
    setWithdrawalAccountPendingRemovalId(null)

    if (withdrawalAccounts.length <= 2) {
      setIsWithdrawalKeySheetOpen(false)
    }
  }, [hasMultipleWithdrawalAccounts, withdrawalAccountPendingRemovalId, withdrawalAccounts.length, withdrawalFlow])

  useEffect(() => {
    if (
      withdrawalVerificationStage !== 'loading'
      || isWithdrawalSuccessOpen
      || !withdrawalReceipt
    ) return undefined

    clearWithdrawalVerificationTimer()
    withdrawalVerificationTimerRef.current = window.setTimeout(() => {
      withdrawalVerificationTimerRef.current = null
      setIsWithdrawalVerificationFadingOut(true)

      withdrawalVerificationTimerRef.current = window.setTimeout(() => {
        withdrawalVerificationTimerRef.current = null

        if (!hasConfirmedWithdrawalRef.current) {
          hasConfirmedWithdrawalRef.current = true
          onWithdrawalConfirmed?.(withdrawalReceipt.amountCents)
        }

        setWithdrawalVerificationStage(null)
        setIsWithdrawalVerificationFadingOut(false)
        clearWithdrawalSuccessDelayTimer()
        withdrawalSuccessDelayTimerRef.current = window.setTimeout(() => {
          withdrawalSuccessDelayTimerRef.current = null
          setIsWithdrawalSuccessOpen(true)
        }, withdrawalSuccessDelayDurationMs)
      }, withdrawalLoadingFadeDurationMs)
    }, withdrawalVerificationLoadingDurationMs)

    return clearWithdrawalVerificationTimer
  }, [
    clearWithdrawalSuccessDelayTimer,
    clearWithdrawalVerificationTimer,
    isWithdrawalSuccessOpen,
    onWithdrawalConfirmed,
    withdrawalReceipt,
    withdrawalVerificationStage,
  ])

  useEffect(() => {
    shouldRenderRef.current = shouldRender
  }, [shouldRender])

  useEffect(() => {
    clearOpenTimer()
    clearCloseTimer()

    if (isOpen) {
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null
        setHeaderDragPhase('idle')
        setShouldRender(true)
        setMotionState('entering')

        openTimerRef.current = window.setTimeout(() => {
          openTimerRef.current = null
          setMotionState('open')
        }, profileSheetMotionDurationMs)
      }, 0)

      return () => {
        clearOpenTimer()
        clearCloseTimer()
      }
    }

    if (!shouldRenderRef.current) return undefined

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      setMotionState('closing')

      closeTimerRef.current = window.setTimeout(() => {
        closeTimerRef.current = null
        setShouldRender(false)
        setMotionState('entering')
      }, profileSheetMotionDurationMs)
    }, 0)

    return () => {
      clearOpenTimer()
      clearCloseTimer()
    }
  }, [clearCloseTimer, clearOpenTimer, isOpen])

  useEffect(() => () => {
    clearOpenTimer()
    clearCloseTimer()
    clearRouteMotion()
    clearWithdrawalNewPixSubmitTimer()
    clearWithdrawalContinueTimer()
    clearWithdrawalVerificationTimer()
    clearWithdrawalSuccessDelayTimer()
  }, [
    clearCloseTimer,
    clearOpenTimer,
    clearRouteMotion,
    clearWithdrawalNewPixSubmitTimer,
    clearWithdrawalContinueTimer,
    clearWithdrawalSuccessDelayTimer,
    clearWithdrawalVerificationTimer,
  ])

  useEffect(() => {
    if (isOpen) return undefined

    const resetTimer = window.setTimeout(() => {
      clearRouteMotion()
      setRoute('profile')
      setIsDepositMounted(false)
      setDepositView('form')
      setIsProfileBalanceExpanded(false)
      setWithdrawalAmountInput('')
      clearWithdrawalContinueTimer()
      clearWithdrawalVerificationTimer()
      clearWithdrawalSuccessDelayTimer()
      hasConfirmedWithdrawalRef.current = false
      setWithdrawalReceipt(null)
      setIsWithdrawalContinueLoading(false)
      setIsWithdrawalBackgroundHidden(false)
      setWithdrawalVerificationStage(null)
      setIsWithdrawalVerificationFadingOut(false)
      setIsWithdrawalSuccessOpen(false)
      setIsWithdrawalInfoOpen(false)
      setIsWithdrawalKeySheetOpen(false)
      setIsWithdrawalNewPixStacked(false)
      setIsWithdrawalNewPixSheetOpen(false)
      setWithdrawalNewPixKey('')
      setWithdrawalNewPixNumericType(null)
      setIsWithdrawalNewPixKeyTouched(false)
      setIsWithdrawalNewPixSubmitting(false)
      setRecentlyAddedWithdrawalAccountId(null)
      setWithdrawalAccountPendingRemovalId(null)
      setIsRouteTransitioning(false)
    }, profileSheetMotionDurationMs)

    return () => window.clearTimeout(resetTimer)
  }, [clearRouteMotion, clearWithdrawalContinueTimer, clearWithdrawalSuccessDelayTimer, clearWithdrawalVerificationTimer, isOpen])

  useEffect(() => {
    if (!shouldRender) return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [shouldRender])

  useEffect(() => {
    if (!shouldRender) return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape'
        && !isWithdrawalInfoOpen
        && !isWithdrawalKeySheetOpen
        && !isWithdrawalNewPixSheetOpen
        && !isWithdrawalNewPixSubmitting
        && !isWithdrawalSuccessOpen
        && withdrawalVerificationStage === null
        && withdrawalAccountPendingRemovalId === null
      ) requestClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isWithdrawalInfoOpen, isWithdrawalKeySheetOpen, isWithdrawalNewPixSheetOpen, isWithdrawalNewPixSubmitting, isWithdrawalSuccessOpen, requestClose, shouldRender, withdrawalAccountPendingRemovalId, withdrawalVerificationStage])

  useTouchScrollFence(containerRef, shouldRender)

  if (!shouldRender) return null

  return createPortal(
    <div
      className="deposit-panel__container deposit-panel__container--bottom-sheet profile-bottom-sheet__container"
      ref={containerRef}
    >
      <div
        ref={overlayRef}
        className={[
          'deposit-panel__overlay',
          'profile-bottom-sheet__overlay',
          `deposit-panel__overlay--${motionState}`,
          headerDragPhase === 'dragging' ? 'profile-bottom-sheet__overlay--dragging' : '',
          headerDragPhase === 'closing' ? 'profile-bottom-sheet__overlay--drag-closing' : '',
          isWithdrawalBackgroundHidden ? 'profile-bottom-sheet__overlay--withdrawal-complete' : '',
        ].filter(Boolean).join(' ')}
        onClick={requestClose}
      />
      <aside
        ref={sheetRef}
        className={[
          'deposit-panel',
          'deposit-panel--bottom-sheet',
          'profile-bottom-sheet',
          `deposit-panel--${motionState}`,
          headerDragPhase === 'dragging' ? 'profile-bottom-sheet--dragging' : '',
          headerDragPhase === 'closing' ? 'profile-bottom-sheet--drag-closing' : '',
          isWithdrawalNewPixStacked ? 'profile-bottom-sheet--stacked' : '',
          isWithdrawalBackgroundHidden ? 'profile-bottom-sheet--withdrawal-complete' : '',
        ].filter(Boolean).join(' ')}
        role="dialog"
        aria-modal="true"
        aria-label={route === 'profile' ? 'Meu perfil' : route === 'deposit' ? 'Depositar' : 'Sacar'}
        inert={isWithdrawalNewPixSheetOpen || isWithdrawalNewPixSubmitting || withdrawalVerificationStage !== null || isWithdrawalSuccessOpen ? true : undefined}
        onClick={(event) => event.stopPropagation()}
        onPointerCancel={cancelHeaderDrag}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={finishHeaderDrag}
      >
        <header
          className="deposit-panel__header"
          onClickCapture={handleHeaderClickCapture}
          onPointerDown={handleHeaderPointerDown}
        >
          <button
            type="button"
            className={[
              'deposit-panel__back',
              'profile-bottom-sheet__back',
              (route === 'deposit' && depositView === 'form') || route === 'withdrawal'
                ? 'profile-bottom-sheet__back--visible'
                : '',
            ].filter(Boolean).join(' ')}
            aria-label="Voltar para meu perfil"
            aria-hidden={!((route === 'deposit' && depositView === 'form') || route === 'withdrawal')}
            tabIndex={(route === 'deposit' && depositView === 'form') || route === 'withdrawal' ? 0 : -1}
            disabled={isRouteTransitioning || !((route === 'deposit' && depositView === 'form') || route === 'withdrawal')}
            onClick={handleRouteBack}
          >
            <img src={backHeaderIcon} alt="" aria-hidden="true" />
          </button>
          <div className="profile-bottom-sheet__titles" aria-live="polite">
            <h2
              className={[
                'deposit-panel__title',
                'profile-bottom-sheet__title',
                route === 'profile' ? 'profile-bottom-sheet__title--visible' : '',
              ].filter(Boolean).join(' ')}
              aria-hidden={route !== 'profile'}
            >
              Meu perfil
            </h2>
            <h2
              className={[
                'deposit-panel__title',
                'profile-bottom-sheet__title',
                route === 'deposit' && depositView === 'form'
                  ? 'profile-bottom-sheet__title--visible'
                  : '',
              ].filter(Boolean).join(' ')}
              aria-hidden={route !== 'deposit' || depositView !== 'form'}
            >
              Deposite para jogar
            </h2>
            <h2
              className={[
                'deposit-panel__title',
                'profile-bottom-sheet__title',
                route === 'withdrawal' ? 'profile-bottom-sheet__title--visible' : '',
              ].filter(Boolean).join(' ')}
              aria-hidden={route !== 'withdrawal'}
            >
              Sacar
            </h2>
          </div>
          <button
            type="button"
            className="deposit-panel__close"
            aria-label={route === 'profile' ? 'Fechar meu perfil' : route === 'deposit' ? 'Fechar depósito' : 'Fechar saque'}
            onClick={requestClose}
          >
            <img src={closeIcon} alt="" aria-hidden="true" />
          </button>
        </header>

        <div
          className={[
            'deposit-panel__content',
            'profile-bottom-sheet__stage',
            `profile-bottom-sheet__stage--${route}`,
          ].join(' ')}
        >
          <div
            className="profile-bottom-sheet__route profile-bottom-sheet__route--profile"
            aria-hidden={route !== 'profile'}
            inert={route !== 'profile' ? true : undefined}
          >
            <div className="deposit-panel__view profile-bottom-sheet__content">
            <section
              className={[
                'profile-balance',
                isProfileBalanceExpanded ? 'profile-balance--expanded' : '',
              ].filter(Boolean).join(' ')}
              aria-label="Resumo do saldo"
            >
              <div className="profile-balance__header">
                <button
                  type="button"
                  className="profile-balance__summary-row"
                  aria-expanded={isProfileBalanceExpanded}
                  aria-controls="profile-balance-breakdown"
                  onClick={() => setIsProfileBalanceExpanded((isExpanded) => !isExpanded)}
                >
                  <span className="profile-balance__heading">
                    <span className="profile-balance__amount">{formatBalance(playableBalanceCents)}</span>
                    <span className="profile-balance__subtitle">Disponível para jogar</span>
                  </span>
                  <span className="profile-balance__expand" aria-hidden="true">
                    <img src={balanceChevronDownIcon} alt="" />
                  </span>
                </button>
                <span
                  className="profile-balance__breakdown"
                  id="profile-balance-breakdown"
                  aria-hidden={!isProfileBalanceExpanded}
                >
                  <span className="profile-balance__breakdown-row">
                    <span>Saldo sacável</span>
                    <strong>{formatBalance(availableWithdrawalCents)}</strong>
                  </span>
                  <span className="profile-balance__breakdown-row">
                    <button
                      type="button"
                      className="profile-balance__breakdown-info"
                      aria-label="Ver detalhes do saldo promocional"
                      onClick={() => {
                        setBalanceInfoContext('promotional')
                        setIsWithdrawalInfoOpen(true)
                      }}
                    >
                      <span>Saldo promocional</span>
                      <img src={withdrawalInfoIcon} alt="" aria-hidden="true" />
                    </button>
                    <strong className="profile-balance__promotional-value">
                      <img src={promotionalBalanceIcon} alt="" aria-hidden="true" />
                      <span>{formatPromotionalBalance(availablePromotionalCents)}</span>
                    </strong>
                  </span>
                </span>
              </div>

              <div className="profile-balance__actions">
                <button
                  type="button"
                  className="profile-balance__action profile-balance__action--secondary"
                  onClick={handleWithdrawalOpen}
                  disabled={isRouteTransitioning}
                >
                  <img src={withdrawIcon} alt="" aria-hidden="true" />
                  <span>Sacar</span>
                </button>
                <button
                  type="button"
                  className="profile-balance__action profile-balance__action--primary"
                  onClick={handleDepositOpen}
                  disabled={!depositFlow || isRouteTransitioning}
                >
                  <img src={depositIcon} alt="" aria-hidden="true" />
                  <span>Depositar</span>
                </button>
              </div>

              <div className="profile-balance__rewards">
                <div className="profile-balance__reward">
                  <p className="profile-balance__reward-label">Apostas Grátis</p>
                  <div className="profile-balance__reward-value">
                    <img className="profile-balance__reward-icon" src={freeBetIcon} alt="" aria-hidden="true" />
                    <span>{formatBalance(availableFreeBetCents)}</span>
                    <img className="profile-balance__reward-chevron" src={chevronRightIcon} alt="" aria-hidden="true" />
                  </div>
                </div>
                <div className="profile-balance__reward">
                  <p className="profile-balance__reward-label">Rodadas Grátis</p>
                  <div className="profile-balance__reward-value">
                    <img className="profile-balance__reward-icon" src={freeSpinIcon} alt="" aria-hidden="true" />
                    <span>10</span>
                    <img className="profile-balance__reward-chevron" src={chevronRightIcon} alt="" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </section>

            <div className="profile-shortcuts" aria-label="Atalhos do perfil">
              <button type="button" className="profile-shortcut-card">
                <img className="profile-shortcut-card__light" src={profileCardLight} alt="" aria-hidden="true" />
                <img className="profile-shortcut-card__icon" src={supportIcon} alt="" aria-hidden="true" />
                <span>Suporte</span>
              </button>
              <button type="button" className="profile-shortcut-card">
                <img className="profile-shortcut-card__light" src={profileCardLight} alt="" aria-hidden="true" />
                <img className="profile-shortcut-card__icon" src={suggestionsIcon} alt="" aria-hidden="true" />
                <span>Sugestões</span>
              </button>
            </div>

            <div className="profile-menu-groups">
              {profileMenuSections.map((section) => (
                <section className="profile-menu-section" key={section.id} aria-labelledby={`profile-menu-${section.id}`}>
                  <h3 className="profile-menu-section__title" id={`profile-menu-${section.id}`}>
                    {section.title}
                  </h3>
                  <div className="profile-menu-section__options">
                    {section.options.map((option) => (
                      <button type="button" className="profile-menu-option" key={option.label}>
                        <span className="profile-menu-option__icon-shell" aria-hidden="true">
                          <img src={option.icon} alt="" />
                        </span>
                        <span className="profile-menu-option__body">
                          <span>{option.label}</span>
                          <img className="profile-menu-option__chevron" src={chevronRightIcon} alt="" aria-hidden="true" />
                        </span>
                      </button>
                    ))}
                  </div>
                </section>
              ))}

              <section className="profile-menu-footer" aria-label="Sessão e versão">
                <button type="button" className="profile-menu-option profile-menu-option--logout">
                  <span className="profile-menu-option__icon-shell" aria-hidden="true">
                    <img src={logoutIcon} alt="" />
                  </span>
                  <span className="profile-menu-option__body">
                    <span>Sair</span>
                    <img className="profile-menu-option__chevron" src={chevronRightIcon} alt="" aria-hidden="true" />
                  </span>
                </button>
                <p>Versão 1.0.0</p>
              </section>
            </div>
          </div>
          </div>
          <div
            className="profile-bottom-sheet__route profile-bottom-sheet__route--deposit"
            ref={setDepositHost}
            aria-hidden={route !== 'deposit'}
            inert={route !== 'deposit' ? true : undefined}
          />
          <div
            className="profile-bottom-sheet__route profile-bottom-sheet__route--withdrawal"
            aria-hidden={route !== 'withdrawal'}
            inert={route !== 'withdrawal' || isWithdrawalContinueLoading ? true : undefined}
          >
            <div className="deposit-panel__view profile-withdrawal">
              <main className="profile-withdrawal__main">
                <section className="profile-withdrawal__balance" aria-label="Saldo disponível para saque">
                  <p className="profile-withdrawal__balance-amount">
                    <span className="profile-withdrawal__balance-currency">R$</span>
                    <span>{formatWithdrawalAmountInput(availableWithdrawalCents)}</span>
                  </p>
                  <button
                    type="button"
                    className="profile-withdrawal__balance-info"
                    onClick={() => {
                      setBalanceInfoContext('withdrawal')
                      setIsWithdrawalInfoOpen(true)
                    }}
                  >
                    <span>Disponível para saque</span>
                    <img src={withdrawalInfoIcon} alt="" aria-hidden="true" />
                  </button>
                </section>

                <section className="profile-withdrawal__amount-section">
                  <label
                    className={[
                      'profile-withdrawal__amount-input',
                      withdrawalAmountInput ? 'profile-withdrawal__amount-input--filled' : '',
                      hasWithdrawalAmountError ? 'profile-withdrawal__amount-input--error' : '',
                    ].filter(Boolean).join(' ')}
                    htmlFor="profile-withdrawal-amount"
                  >
                    <span className="profile-withdrawal__amount-label">Valor a sacar</span>
                    <span
                      className="profile-withdrawal__amount-field"
                      onPointerDown={withdrawalAmountFocusGuard.handleFieldPointerDown}
                      onPointerUp={withdrawalAmountFocusGuard.handleFieldPointerUp}
                      onPointerCancel={withdrawalAmountFocusGuard.handleFieldPointerCancel}
                    >
                      <span className="profile-withdrawal__amount-content">
                        <span className="profile-withdrawal__amount-currency" aria-hidden="true">R$</span>
                        <input
                          ref={withdrawalAmountInputRef}
                          id="profile-withdrawal-amount"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          placeholder="0,00"
                          value={withdrawalAmountInput}
                          aria-label="Valor a sacar"
                          aria-describedby={hasWithdrawalAmountError ? 'profile-withdrawal-amount-error' : undefined}
                          aria-invalid={hasWithdrawalAmountError || undefined}
                          onFocus={withdrawalAmountFocusGuard.handleFocus}
                          onChange={(event) => handleWithdrawalAmountChange(event.target.value)}
                        />
                      </span>
                      <button
                        type="button"
                        disabled={availableWithdrawalCents <= 0}
                        aria-label={`Usar valor máximo disponível: ${formatBalance(availableWithdrawalCents)}`}
                        onClick={handleWithdrawalMax}
                      >
                        Valor máx.
                      </button>
                    </span>
                    {hasWithdrawalAmountError ? (
                      <span
                        className="profile-withdrawal__amount-error"
                        id="profile-withdrawal-amount-error"
                      >
                        O valor disponível para saque é de {formatWithdrawalAvailableLimit(availableWithdrawalCents)}; insira esse valor ou um valor menor.
                      </span>
                    ) : null}
                  </label>
                </section>

                <section className="profile-withdrawal__method" aria-labelledby="profile-withdrawal-method-title">
                  <div className="profile-withdrawal__method-heading">
                    <h3 id="profile-withdrawal-method-title">Método de saque</h3>
                    {hasMultipleWithdrawalAccounts ? (
                      <button type="button" onClick={handleWithdrawalKeySheetOpen}>
                        <span>Editar</span>
                        <img src={chevronRightIcon} alt="" aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  {withdrawalAccounts.length > 0 ? (
                    <div className="profile-withdrawal__method-list" aria-label="Chaves Pix disponíveis para saque">
                      {withdrawalAccounts.map((account) => {
                        const isSelected = account.id === activeWithdrawalAccount?.id

                        return (
                          <button
                            type="button"
                            className={[
                              'profile-withdrawal__method-card',
                              isSelected ? 'profile-withdrawal__method-card--selected' : '',
                              recentlyAddedWithdrawalAccountId === account.id
                                ? 'profile-withdrawal__method-card--entering'
                                : '',
                            ].filter(Boolean).join(' ')}
                            aria-label={`${account.bankName}, conta final ${account.lastDigits}${isSelected ? ', selecionada' : ''}`}
                            aria-pressed={isSelected}
                            onClick={() => handleWithdrawalAccountSelect(account.id)}
                            onAnimationEnd={() => handleWithdrawalMethodCardAnimationEnd(account.id)}
                            key={account.id}
                          >
                            <span className="profile-withdrawal__account-copy">
                              <strong>{account.bankName}</strong>
                              <span>***{account.lastDigits}</span>
                            </span>
                            <span
                              className={[
                                'deposit-bank-sheet__radio',
                                isSelected ? 'deposit-bank-sheet__radio--selected' : '',
                              ].filter(Boolean).join(' ')}
                              aria-hidden="true"
                            />
                          </button>
                        )
                      })}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="profile-withdrawal__add-pix"
                    disabled={
                      hasReachedWithdrawalAccountLimit
                      || !withdrawalFlow?.newBankAccountId
                      || !withdrawalFlow?.onAddAccount
                    }
                    onClick={handleWithdrawalNewPixSheetOpen}
                  >
                    <span>Adicionar chave Pix</span>
                    <img src={chevronRightIcon} alt="" aria-hidden="true" />
                  </button>
                  {hasReachedWithdrawalAccountLimit ? (
                    <p className="profile-withdrawal__account-limit">
                      Limite de 3 chaves atingido. Toque em “Editar” para remover uma e liberar espaço.
                    </p>
                  ) : null}
                </section>
              </main>

              <footer className="deposit-panel__footer profile-withdrawal__footer">
                <button
                  type="button"
                  className={[
                    'deposit-panel__confirm',
                    isWithdrawalContinueLoading ? 'deposit-panel__confirm--loading' : '',
                  ].filter(Boolean).join(' ')}
                  disabled={!hasValidWithdrawalAmount || isWithdrawalContinueLoading}
                  aria-busy={isWithdrawalContinueLoading}
                  onClick={handleWithdrawalContinue}
                >
                  <span className="deposit-panel__confirm-label">Continuar</span>
                  <span className="deposit-panel__confirm-spinner-wrap" aria-hidden="true">
                    <span className="deposit-panel__confirm-spinner" />
                  </span>
                </button>
              </footer>
            </div>
          </div>
        </div>
      </aside>
      {depositHost && isDepositMounted ? (
        <DepositPanel
          isOpen
          onClose={requestClose}
          presentation="embedded"
          savedAccounts={depositFlow?.savedAccounts}
          activeAccountId={depositFlow?.activeAccountId}
          newBankAccountId={depositFlow?.newBankAccountId}
          onRemoveAccount={depositFlow?.onRemoveAccount}
          onSelectAccount={depositFlow?.onSelectAccount}
          onDepositConfirmed={depositFlow?.onDepositConfirmed}
          onViewChange={setDepositView}
          portalTarget={depositHost}
        />
      ) : null}
      <BottomSheet
        isOpen={isWithdrawalNewPixSheetOpen}
        onCloseStart={handleWithdrawalNewPixSheetCloseStart}
        onClose={handleWithdrawalNewPixSheetClose}
        title="Nova chave Pix"
        containerClassName="profile-withdrawal-new-pix-sheet-container"
        sheetClassName="profile-withdrawal-new-pix-sheet"
        bodyClassName="profile-withdrawal-new-pix-sheet__body"
        keyboardBehavior="stable-scroll"
        footerContent={(
          <button
            type="button"
            className="deposit-panel__confirm profile-withdrawal-new-pix-sheet__submit"
            disabled={
              !hasValidWithdrawalNewPixKey
              || isWithdrawalNewPixSubmitting
              || hasReachedWithdrawalAccountLimit
              || !withdrawalFlow?.newBankAccountId
              || !withdrawalFlow?.onAddAccount
            }
            aria-busy={isWithdrawalNewPixSubmitting || undefined}
            onClick={handleWithdrawalNewPixSubmit}
          >
            Adicionar
          </button>
        )}
        hideScrollIndicator
        closeOnEscape={!isWithdrawalNewPixSubmitting}
      >
        <div className="profile-withdrawal-new-pix-sheet__content">
          <p className="profile-withdrawal-new-pix-sheet__description">
            A chave Pix precisa estar vinculada a uma conta no seu próprio CPF.
          </p>
          <label
            className={[
              'profile-withdrawal-new-pix-sheet__field',
              withdrawalNewPixKey.length > 0 ? 'profile-withdrawal-new-pix-sheet__field--filled' : '',
              visibleWithdrawalNewPixKeyError ? 'profile-withdrawal-new-pix-sheet__field--error' : '',
            ].filter(Boolean).join(' ')}
            htmlFor="profile-withdrawal-new-pix-key"
          >
            <span className="profile-withdrawal-new-pix-sheet__label">
              Insira E-mail, celular, CPF e chave aleatória
            </span>
            <span
              className="profile-withdrawal-new-pix-sheet__input-shell"
              onPointerDown={withdrawalNewPixFocusGuard.handleFieldPointerDown}
              onPointerUp={withdrawalNewPixFocusGuard.handleFieldPointerUp}
              onPointerCancel={withdrawalNewPixFocusGuard.handleFieldPointerCancel}
            >
              <span className="profile-withdrawal-new-pix-sheet__input-content">
                <img
                  className="profile-withdrawal-new-pix-sheet__input-icon"
                  src={withdrawalNewPixInputIcon}
                  alt=""
                  aria-hidden="true"
                />
                <input
                  ref={withdrawalNewPixInputRef}
                  id="profile-withdrawal-new-pix-key"
                  className="profile-withdrawal-new-pix-sheet__input"
                  type="text"
                  inputMode="text"
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={77}
                  value={withdrawalNewPixKey}
                  aria-describedby={visibleWithdrawalNewPixKeyError ? 'profile-withdrawal-new-pix-key-error' : undefined}
                  aria-invalid={visibleWithdrawalNewPixKeyError ? true : undefined}
                  onFocus={withdrawalNewPixFocusGuard.handleFocus}
                  onBlur={() => {
                    handleWithdrawalNewPixKeyBlur()
                  }}
                  onChange={(event) => handleWithdrawalNewPixKeyChange(event.target.value)}
                />
                {visibleWithdrawalNewPixKeyError ? (
                  <img
                    className="profile-withdrawal-new-pix-sheet__error-icon"
                    src={inputErrorIcon}
                    alt=""
                    aria-hidden="true"
                  />
                ) : null}
              </span>
            </span>
            {visibleWithdrawalNewPixKeyError ? (
              <span
                className="profile-withdrawal-new-pix-sheet__error-message"
                id="profile-withdrawal-new-pix-key-error"
                aria-live="polite"
              >
                {visibleWithdrawalNewPixKeyError}
              </span>
            ) : null}
            {hasAmbiguousWithdrawalNewPixKey ? (
              <div
                className="profile-withdrawal-new-pix-sheet__type-options"
                role="group"
                aria-label="Escolha o tipo da chave Pix"
              >
                {ambiguousWithdrawalNewPixKeyTypes.map((numericType) => {
                  const isSelected = withdrawalNewPixNumericType === numericType

                  return (
                    <button
                      type="button"
                      className={[
                        'profile-withdrawal-new-pix-sheet__type-option',
                        isSelected ? 'profile-withdrawal-new-pix-sheet__type-option--selected' : '',
                      ].filter(Boolean).join(' ')}
                      aria-pressed={isSelected}
                      onClick={() => handleWithdrawalNewPixNumericTypeSelect(numericType)}
                      key={numericType}
                    >
                      <span>{numericType === 'cpf' ? 'CPF' : 'Celular'}</span>
                    </button>
                  )
                })}
              </div>
            ) : null}
          </label>
        </div>
      </BottomSheet>
      <BottomSheet
        isOpen={isWithdrawalInfoOpen}
        onClose={() => setIsWithdrawalInfoOpen(false)}
        title={balanceInfoContext === 'promotional' ? 'Saldo Promocional' : 'Disponível para saque'}
        containerClassName="profile-withdrawal-info-sheet-container"
        sheetClassName="profile-withdrawal-info-sheet"
        bodyClassName="profile-withdrawal-info-sheet__body"
        hideScrollIndicator
        blurBackdrop
      >
        <div className="profile-withdrawal-info-sheet__content">
          <div className="profile-withdrawal-info-sheet__breakdown" aria-label="Detalhamento do saldo">
            <div className="profile-withdrawal-info-sheet__breakdown-row">
              <span>Saldo sacável</span>
              <strong>{formatBalance(availableWithdrawalCents)}</strong>
            </div>
            <div className="profile-withdrawal-info-sheet__breakdown-row">
              <span>Saldo promocional</span>
              <strong className="profile-withdrawal-info-sheet__promotional-value">
                <img src={promotionalBalanceIcon} alt="" aria-hidden="true" />
                <span>{formatPromotionalBalance(availablePromotionalCents)}</span>
              </strong>
            </div>
          </div>
          <p className="profile-withdrawal-info-sheet__description">
            {balanceInfoContext === 'promotional'
              ? 'O saldo promocional é relacionado às promoções que o Pitaco atribui à sua conta. Esse saldo não pode ser sacado.'
              : 'Esse valor é referente aos seus depósitos e ganhos acumulados. Saldo promocional não pode ser sacado.'}
          </p>
        </div>
      </BottomSheet>
      <BottomSheet
        isOpen={isWithdrawalKeySheetOpen}
        onClose={handleWithdrawalKeySheetClose}
        title="Chave Pix"
        containerClassName="profile-withdrawal-key-sheet-container"
        sheetClassName="deposit-bank-sheet profile-withdrawal-key-sheet"
        bodyClassName="deposit-bank-sheet__body profile-withdrawal-key-sheet__body"
        hideScrollIndicator
        blurBackdrop
        closeOnEscape={withdrawalAccountPendingRemovalId === null}
      >
        <div className="deposit-bank-sheet__content profile-withdrawal-key-sheet__content">
          <p className="profile-withdrawal-key-sheet__hint">
            Você só pode ter, no máximo, 3 chaves Pix.
          </p>
          <div className="deposit-bank-sheet__accounts profile-withdrawal-key-sheet__accounts" aria-label="Chaves Pix salvas">
            {withdrawalAccounts.map((account) => (
              <button
                type="button"
                className="deposit-bank-sheet__saved-account profile-withdrawal-key-sheet__account"
                aria-label={`Excluir ${account.bankName}, conta final ${account.lastDigits}`}
                disabled={withdrawalAccountPendingRemovalId !== null || !hasMultipleWithdrawalAccounts}
                onClick={() => handleWithdrawalAccountRemovalRequest(account.id)}
                key={account.id}
              >
                <span className="deposit-bank-sheet__account-copy">
                  <strong>{account.bankName}</strong>
                  <span>Conta: ***{account.lastDigits}</span>
                </span>
                <img
                  className="deposit-bank-sheet__remove-account-icon"
                  src={removePixIcon}
                  alt=""
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
      </BottomSheet>
      <BottomSheet
        isOpen={withdrawalAccountPendingRemoval !== null}
        onClose={handleWithdrawalAccountRemovalCancel}
        containerClassName="profile-withdrawal-remove-sheet-container"
        sheetClassName="profile-withdrawal-remove-sheet"
        bodyClassName="profile-withdrawal-remove-sheet__body"
        hideScrollIndicator
        blurBackdrop
      >
        <div className="profile-withdrawal-remove-sheet__content">
          <img
            className="profile-withdrawal-remove-sheet__illustration"
            src={withdrawalRemovePixIllustration}
            alt=""
            aria-hidden="true"
            draggable="false"
          />
          <h3 className="profile-withdrawal-remove-sheet__heading">Remover chave Pix?</h3>
          <p className="profile-withdrawal-remove-sheet__message">
            Você não vai mais receber saques nesta chave. Pode adicioná-la de novo quando quiser.
          </p>
          <div className="profile-withdrawal-remove-sheet__actions">
            <button
              type="button"
              className="profile-withdrawal-remove-sheet__action profile-withdrawal-remove-sheet__action--primary"
              onClick={handleWithdrawalAccountRemovalConfirm}
            >
              Remover
            </button>
            <button
              type="button"
              className="profile-withdrawal-remove-sheet__action profile-withdrawal-remove-sheet__action--secondary"
              onClick={handleWithdrawalAccountRemovalCancel}
            >
              Cancelar
            </button>
          </div>
        </div>
      </BottomSheet>
      <BottomSheet
        isOpen={isWithdrawalSuccessOpen}
        onCloseStart={requestClose}
        onClose={handleWithdrawalSuccessClosed}
        containerClassName="profile-withdrawal-success-sheet-container"
        sheetClassName="profile-withdrawal-success-sheet"
        bodyClassName="profile-withdrawal-success-sheet__body"
        footerContent={(
          <button
            type="button"
            className="deposit-panel__confirm profile-withdrawal-success-sheet__confirm"
            onClick={handleWithdrawalSuccessDismiss}
          >
            Entendido
          </button>
        )}
        hideScrollIndicator
      >
        {withdrawalReceipt ? (
          <div className="profile-withdrawal-success-sheet__content">
            <img
              className="profile-withdrawal-success-sheet__illustration"
              src={withdrawalSuccessIllustration}
              alt=""
              aria-hidden="true"
              draggable="false"
            />
            <div className="profile-withdrawal-success-sheet__summary">
              <p className="profile-withdrawal-success-sheet__amount" aria-label={formatBalance(withdrawalReceipt.amountCents)}>
                <span>R$</span>
                <strong>{formatWithdrawalAmountInput(withdrawalReceipt.amountCents)}</strong>
              </p>
              <p className="profile-withdrawal-success-sheet__message">
                Seu saque será processado em breve
              </p>
            </div>
            <div className="profile-withdrawal-success-sheet__details" aria-label="Detalhes do saque">
              <div className="profile-withdrawal-success-sheet__detail-row">
                <img src={withdrawalBankIcon} alt="" aria-hidden="true" />
                <span>Banco</span>
                <strong>{withdrawalReceipt.bankName}</strong>
              </div>
              <div className="profile-withdrawal-success-sheet__detail-row">
                <img src={withdrawalAccountIcon} alt="" aria-hidden="true" />
                <span>Conta</span>
                <strong>***{withdrawalReceipt.lastDigits}</strong>
              </div>
              <div className="profile-withdrawal-success-sheet__detail-row">
                <img src={withdrawalCpfIcon} alt="" aria-hidden="true" />
                <span>CPF</span>
                <strong>{withdrawalMockCpf}</strong>
              </div>
            </div>
            <p className="profile-withdrawal-success-sheet__hint">
              Você pode ver todas as suas movimentações em “Minha conta” &gt; “Minhas movimentações”.
            </p>
          </div>
        ) : null}
      </BottomSheet>
      {withdrawalVerificationStage !== null ? (
        <div
          className={[
            'login-page',
            'login-page--signup',
            'login-page--verification',
            'profile-withdrawal-verification',
            withdrawalVerificationStage === 'loading' ? 'profile-withdrawal-verification--loading' : '',
            withdrawalVerificationStage === 'loading' && isWithdrawalVerificationFadingOut
              ? 'profile-withdrawal-verification--fading'
              : '',
          ].filter(Boolean).join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label={withdrawalVerificationStage === 'face' ? 'Verificação facial' : 'Validando identidade'}
        >
          <div
            className="login-page__surface"
            onAnimationEnd={(event) => handleWithdrawalVerificationEnterAnimationEnd(event.animationName)}
          >
            {withdrawalVerificationStage === 'face' ? (
              <FacialVerificationCapture
                isFadingOut={isWithdrawalVerificationFadingOut}
                onComplete={handleWithdrawalFacialVerificationComplete}
              />
            ) : (
              <IdentityVerificationLoading isFadingOut={isWithdrawalVerificationFadingOut} />
            )}
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  )
}
