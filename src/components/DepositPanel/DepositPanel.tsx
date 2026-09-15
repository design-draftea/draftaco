import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { createPortal, flushSync } from 'react-dom'
import backHeaderIcon from '../../assets/iconsDraftaco/backHeader.svg'
import closePixIcon from '../../assets/iconsDraftaco/closeBS.svg'
import iconBanco from '../../assets/iconsDraftaco/iconBanco.svg'
import iconClock from '../../assets/iconsDraftaco/iconClock.svg'
import iconCadeado from '../../assets/iconsDraftaco/iconCadeado.svg'
import iconConta from '../../assets/iconsDraftaco/iconConta.svg'
import iconExpira from '../../assets/iconsDraftaco/iconExpira.svg'
import iconInfo from '../../assets/iconsDraftaco/iconInfo.svg'
import iconPix from '../../assets/iconsDraftaco/iconPix.svg'
import iconPixCopiado from '../../assets/iconsDraftaco/iconPixCopiado.svg'
import iconRemoverPix from '../../assets/iconsDraftaco/iconRemoverPix.svg'
import iconRemoverPixGde from '../../assets/iconsDraftaco/iconRemoverPixGde.svg'
import iconSetaTrocarBanco from '../../assets/iconsDraftaco/iconSetaTrocarBanco.svg'
import iconVoltarExcluirConta from '../../assets/iconsDraftaco/iconVoltarExcluirConta.svg'
import qrCodeImage from '../../assets/iconsDraftaco/qrCode.png'
import { useTouchScrollFence } from '../../shared/hooks/useTouchScrollFence'
import type { PixKeyType } from '../../shared/utils/pixKeyValidation'
import { BottomSheet } from '../BottomSheet/BottomSheet'
import './DepositPanel.css'

interface DepositPanelProps {
  isOpen: boolean
  onClose: () => void
  presentation?: DepositPanelPresentation
  confirmationMode?: DepositConfirmationMode
  initialAmountCents?: number | null
  initialView?: DepositView
  savedAccounts?: DepositAccount[]
  activeAccountId?: DepositAccountId | null
  newBankAccountId?: DepositAccountId | null
  onEnterComplete?: () => void
  onRemoveAccount?: (accountId: DepositAccountId) => void
  onSelectAccount?: (accountId: DepositAccountId) => void
  onDepositConfirmed?: (amountCents: number, accountId: DepositAccountId) => void
  onDepositPending?: (amountCents: number) => void
  portalTarget?: Element | DocumentFragment | null
  onViewChange?: (view: DepositView) => void
}

export type DepositAccountId = 'nubank' | 'santander' | 'caixa'

export interface DepositAccount {
  id: DepositAccountId
  bankName: string
  lastDigits: string
  pixKeyType: PixKeyType
  pixKeyValue: string
}

type PanelMotionState = 'entering' | 'open' | 'closing'
type DepositHeaderDragPhase = 'idle' | 'dragging' | 'closing'
type DepositView = 'form' | 'pix'
type DepositPanelPresentation = 'fullscreen' | 'bottom-sheet' | 'embedded'
type DepositOptionId = '50' | '100' | '250' | '1000' | 'custom'
type DepositMethodChoice = 'saved-account' | 'other-bank'
type PixCopyFeedback = 'idle' | 'copied' | 'error'
type DepositConfirmationMode = 'on-pix-generated' | 'on-pix-copy'

interface QuickDepositOption {
  id: DepositOptionId
  label: string
  amountCents: number | null
  recommended?: boolean
}

interface DepositHeaderDragState {
  captureTarget: HTMLElement
  pointerId: number
  startX: number
  startY: number
}

const contentTransitionDurationMs = 180
const fullscreenPanelMotionDurationMs = 320
const bottomSheetMotionDurationMs = 300
const depositHeaderDragIntentThresholdPx = 8
const depositHeaderCloseThresholdPx = 48
const pixGenerationDelayMs = 3000
const pixCountdownInitialSeconds = 30 * 60 - 1
const maxDepositCents = 99999999
const defaultDepositAmountCents = 10000
const pixCode = '00020101021226850014br.gov.bcb.pix0123deposito-teste-sem-link'
const pixCopyFeedbackDurationMs = 2000
const defaultDepositAccountId: DepositAccountId = 'nubank'
const quickDepositOptions: QuickDepositOption[] = [
  { id: '50', label: 'R$ 50', amountCents: 5000 },
  { id: '100', label: 'R$ 100', amountCents: 10000, recommended: true },
  { id: '250', label: 'R$ 250', amountCents: 25000 },
  { id: '1000', label: 'R$ 1.000', amountCents: 100000 },
  { id: 'custom', label: 'Outro', amountCents: null },
]

const formatDepositAmount = (amountCents: number) => (
  (amountCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
)

const formatDepositDisplayAmount = (amountCents: number) => (
  Math.floor(amountCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
)

const getDepositInputDigits = (value: string) => value.replace(/\D/g, '')

const parseManualDepositAmountCents = (value: string) => {
  const digits = getDepositInputDigits(value)
  if (!digits) return 0

  const amountCents = Math.min(Number(digits), maxDepositCents)
  return Number.isFinite(amountCents) ? amountCents : 0
}

const formatManualDepositAmountInput = (value: string) => {
  const amountCents = parseManualDepositAmountCents(value)
  return amountCents > 0 ? formatDepositAmount(amountCents) : ''
}

const normalizeInitialDepositAmountCents = (amountCents: number | null | undefined) => {
  if (typeof amountCents !== 'number' || !Number.isFinite(amountCents)) return defaultDepositAmountCents

  return Math.min(Math.max(0, Math.round(amountCents)), maxDepositCents)
}

const copyPixCodeWithLegacyFallback = (code: string) => {
  let textarea: HTMLTextAreaElement | null = null

  try {
    textarea = document.createElement('textarea')
    textarea.value = code
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()

    const didCopy = document.execCommand('copy')
    return didCopy
  } catch {
    return false
  } finally {
    textarea?.remove()
  }
}

const copyPixCodeToClipboard = async (code: string) => {
  if (copyPixCodeWithLegacyFallback(code)) return true

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(code)
      return true
    }
  } catch {
    return false
  }

  return false
}

const getPresetOptionIdForAmount = (amountCents: number): DepositOptionId | null => (
  quickDepositOptions.find((option) => option.amountCents === amountCents)?.id ?? null
)

export function DepositPanel({
  isOpen,
  onClose,
  presentation = 'fullscreen',
  confirmationMode = 'on-pix-generated',
  initialAmountCents,
  initialView = 'form',
  savedAccounts = [],
  activeAccountId = null,
  newBankAccountId = null,
  onEnterComplete,
  onRemoveAccount,
  onSelectAccount,
  onDepositConfirmed,
  onDepositPending,
  portalTarget,
  onViewChange,
}: DepositPanelProps) {
  const panelMotionDurationMs = presentation === 'embedded'
    ? 0
    : presentation === 'bottom-sheet'
      ? bottomSheetMotionDurationMs
      : fullscreenPanelMotionDurationMs
  const [shouldRender, setShouldRender] = useState(false)
  const [motionState, setMotionState] = useState<PanelMotionState>('entering')
  const [headerDragPhase, setHeaderDragPhase] = useState<DepositHeaderDragPhase>('idle')
  const [view, setView] = useState<DepositView>('form')
  const [amountCents, setAmountCents] = useState(defaultDepositAmountCents)
  const [selectedDepositOptionId, setSelectedDepositOptionId] = useState<DepositOptionId>('100')
  const [selectedDepositMethod, setSelectedDepositMethod] = useState<DepositMethodChoice>('saved-account')
  const [hasSavedAccountForSession, setHasSavedAccountForSession] = useState(false)
  const [isBankChangeSheetOpen, setIsBankChangeSheetOpen] = useState(false)
  const [isAccountRemovalMode, setIsAccountRemovalMode] = useState(false)
  const [removingAccountId, setRemovingAccountId] = useState<DepositAccountId | null>(null)
  const [isGeneratingPix, setIsGeneratingPix] = useState(false)
  const [pixCopyFeedback, setPixCopyFeedback] = useState<PixCopyFeedback>('idle')
  const [pixCopyFeedbackKey, setPixCopyFeedbackKey] = useState(0)
  const [isContentTransitioning, setIsContentTransitioning] = useState(false)
  const [pixCountdownSeconds, setPixCountdownSeconds] = useState(pixCountdownInitialSeconds)
  const closeTimerRef = useRef<number | null>(null)
  const generateTimerRef = useRef<number | null>(null)
  const pixCopyFeedbackTimerRef = useRef<number | null>(null)
  const openTimerRef = useRef<number | null>(null)
  const openFrameRef = useRef<number | null>(null)
  const confirmationModeRef = useRef(confirmationMode)
  const initialAmountCentsRef = useRef(initialAmountCents)
  const initialViewRef = useRef(initialView)
  const onEnterCompleteRef = useRef(onEnterComplete)
  const onDepositConfirmedRef = useRef(onDepositConfirmed)
  const onDepositPendingRef = useRef(onDepositPending)
  const shouldRenderRef = useRef(false)
  const swapTimerRef = useRef<number | null>(null)
  const headerDragRef = useRef<DepositHeaderDragState | null>(null)
  const shouldSuppressHeaderClickRef = useRef(false)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLElement | null>(null)
  const panelContainerRef = useRef<HTMLDivElement | null>(null)
  const pixAmountCentsRef = useRef<number | null>(null)
  const pixAccountIdRef = useRef<DepositAccountId | null>(null)
  const isPixDepositConfirmedRef = useRef(false)
  const isDepositPendingNotifiedRef = useRef(false)
  const manualAmountInputRef = useRef<HTMLInputElement | null>(null)
  const [isAmountEditingInline, setIsAmountEditingInline] = useState(false)
  const [manualAmountInput, setManualAmountInput] = useState(formatDepositAmount(defaultDepositAmountCents))
  const activeAccount = savedAccounts.find((account) => account.id === activeAccountId)
    ?? savedAccounts[0]
    ?? null
  const hasMultipleSavedAccounts = savedAccounts.length > 1

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current === null) return

    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const clearOpenFrame = useCallback(() => {
    if (openFrameRef.current === null) return

    window.cancelAnimationFrame(openFrameRef.current)
    openFrameRef.current = null
  }, [])

  const clearOpenTimer = useCallback(() => {
    if (openTimerRef.current === null) return

    window.clearTimeout(openTimerRef.current)
    openTimerRef.current = null
  }, [])

  const clearGenerateTimer = useCallback(() => {
    if (generateTimerRef.current === null) return

    window.clearTimeout(generateTimerRef.current)
    generateTimerRef.current = null
  }, [])

  const clearPixCopyFeedbackTimer = useCallback(() => {
    if (pixCopyFeedbackTimerRef.current === null) return

    window.clearTimeout(pixCopyFeedbackTimerRef.current)
    pixCopyFeedbackTimerRef.current = null
  }, [])

  const clearSwapTimer = useCallback(() => {
    if (swapTimerRef.current === null) return

    window.clearTimeout(swapTimerRef.current)
    swapTimerRef.current = null
  }, [])

  const showPixCopyFeedback = useCallback((feedback: Exclude<PixCopyFeedback, 'idle'>) => {
    clearPixCopyFeedbackTimer()
    setPixCopyFeedback(feedback)
    setPixCopyFeedbackKey((current) => current + 1)
    pixCopyFeedbackTimerRef.current = window.setTimeout(() => {
      pixCopyFeedbackTimerRef.current = null
      setPixCopyFeedback('idle')
    }, pixCopyFeedbackDurationMs)
  }, [clearPixCopyFeedbackTimer])

  const requestClose = useCallback(() => {
    if (motionState === 'closing') return

    if (
      view === 'pix' &&
      confirmationModeRef.current === 'on-pix-copy' &&
      !isPixDepositConfirmedRef.current &&
      !isDepositPendingNotifiedRef.current
    ) {
      const pendingAmountCents = pixAmountCentsRef.current ?? amountCents

      if (pendingAmountCents > 0) {
        isDepositPendingNotifiedRef.current = true
        onDepositPendingRef.current?.(pendingAmountCents)
      }
    }

    onClose()
  }, [amountCents, motionState, onClose, view])

  const handleHeaderPointerDown = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    if (presentation !== 'bottom-sheet' || motionState !== 'open') return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    shouldSuppressHeaderClickRef.current = false
    headerDragRef.current = {
      captureTarget: event.currentTarget,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    setHeaderDragPhase('dragging')
    panelRef.current?.style.setProperty('--deposit-header-drag-y', '0px')
    overlayRef.current?.style.setProperty('opacity', '1')

    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Pointer capture is optional; events can still finish inside the panel.
    }
  }, [motionState, presentation])

  const handleHeaderPointerMove = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = headerDragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    const dragOffsetY = Math.max(0, deltaY)
    const panelHeight = panelRef.current?.getBoundingClientRect().height ?? window.innerHeight
    const dragProgress = Math.min(dragOffsetY / Math.max(1, panelHeight), 1)

    panelRef.current?.style.setProperty('--deposit-header-drag-y', `${dragOffsetY}px`)
    overlayRef.current?.style.setProperty('opacity', String(1 - dragProgress))

    if (Math.hypot(deltaX, deltaY) >= depositHeaderDragIntentThresholdPx) {
      shouldSuppressHeaderClickRef.current = true
    }

    if (deltaY > 0) event.preventDefault()
  }, [])

  const finishHeaderDrag = useCallback((event: ReactPointerEvent<HTMLElement>) => {
    const drag = headerDragRef.current

    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    const shouldClose = deltaY >= depositHeaderCloseThresholdPx
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
    panelRef.current?.style.setProperty('--deposit-header-drag-y', '0px')
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
    panelRef.current?.style.setProperty('--deposit-header-drag-y', '0px')
    overlayRef.current?.style.removeProperty('opacity')
  }, [])

  const handleHeaderClickCapture = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!shouldSuppressHeaderClickRef.current) return

    event.preventDefault()
    event.stopPropagation()
    shouldSuppressHeaderClickRef.current = false
  }, [])

  const focusManualAmountInput = useCallback(() => {
    const input = manualAmountInputRef.current
    if (!input) return

    input.focus({ preventScroll: true })
    input.select()
  }, [])

  const startInlineAmountEditing = useCallback((selectedOptionId?: DepositOptionId) => {
    flushSync(() => {
      setManualAmountInput(amountCents > 0 ? formatDepositAmount(amountCents) : '')
      if (selectedOptionId) setSelectedDepositOptionId(selectedOptionId)
      setIsAmountEditingInline(true)
    })

    focusManualAmountInput()
  }, [amountCents, focusManualAmountInput])

  const handleQuickOption = (option: QuickDepositOption) => {
    if (option.amountCents === null) {
      startInlineAmountEditing('custom')
      return
    }

    setIsAmountEditingInline(false)
    setAmountCents(option.amountCents)
    setManualAmountInput(formatDepositAmount(option.amountCents))
    setSelectedDepositOptionId(option.id)
  }

  const handleManualAmountChange = (value: string) => {
    const nextInput = formatManualDepositAmountInput(value)
    const nextAmountCents = parseManualDepositAmountCents(nextInput)
    const matchingPreset = getPresetOptionIdForAmount(nextAmountCents)

    setManualAmountInput(nextInput)
    setAmountCents(nextAmountCents)
    setSelectedDepositOptionId(matchingPreset ?? 'custom')
  }

  const handleAmountDisplayClick = () => {
    startInlineAmountEditing()
  }

  const handleChangeBank = () => {
    setIsAccountRemovalMode(false)
    setRemovingAccountId(null)
    setIsBankChangeSheetOpen(true)
  }

  const handleBankChangeSheetClose = () => {
    setIsAccountRemovalMode(false)
    setRemovingAccountId(null)
    setIsBankChangeSheetOpen(false)
  }

  const handleSelectSavedAccount = (accountId: DepositAccountId) => {
    onSelectAccount?.(accountId)
    setSelectedDepositMethod('saved-account')
    handleBankChangeSheetClose()
  }

  const handleRemoveSavedAccount = (accountId: DepositAccountId) => {
    if (!hasMultipleSavedAccounts || removingAccountId !== null) return

    setRemovingAccountId(accountId)
  }

  const handleRemoveAccountAnimationEnd = (accountId: DepositAccountId) => {
    if (removingAccountId !== accountId) return

    onRemoveAccount?.(accountId)
    setRemovingAccountId(null)
    if (savedAccounts.length <= 2) {
      setIsAccountRemovalMode(false)
    }
  }

  const handleCopyPixCode = async () => {
    const didCopy = await copyPixCodeToClipboard(pixCode)

    if (!didCopy) {
      showPixCopyFeedback('error')
      return
    }

    showPixCopyFeedback('copied')

    if (confirmationModeRef.current !== 'on-pix-copy') return
    if (isPixDepositConfirmedRef.current) return

    const confirmedDepositAmountCents = pixAmountCentsRef.current ?? amountCents

    if (confirmedDepositAmountCents <= 0) return

    isPixDepositConfirmedRef.current = true
    const confirmedDepositAccountId = pixAccountIdRef.current
      ?? activeAccount?.id
      ?? defaultDepositAccountId

    onDepositConfirmedRef.current?.(confirmedDepositAmountCents, confirmedDepositAccountId)
  }

  const startPixGeneration = (
    depositAccountId: DepositAccountId = activeAccount?.id ?? defaultDepositAccountId,
    onGenerated?: () => void,
  ) => {
    if (!amountCents || isGeneratingPix) return

    const confirmedDepositAmountCents = amountCents

    clearGenerateTimer()
    clearSwapTimer()
    setIsGeneratingPix(true)

    generateTimerRef.current = window.setTimeout(() => {
      generateTimerRef.current = null
      setIsContentTransitioning(true)

      swapTimerRef.current = window.setTimeout(() => {
        swapTimerRef.current = null
        onGenerated?.()
        setView('pix')
        setIsGeneratingPix(false)
        setPixCountdownSeconds(pixCountdownInitialSeconds)
        pixAmountCentsRef.current = confirmedDepositAmountCents
        pixAccountIdRef.current = depositAccountId
        isPixDepositConfirmedRef.current = false
        isDepositPendingNotifiedRef.current = false

        if (confirmationModeRef.current === 'on-pix-generated') {
          isPixDepositConfirmedRef.current = true
          onDepositConfirmedRef.current?.(confirmedDepositAmountCents, depositAccountId)
        }

        window.requestAnimationFrame(() => {
          setIsContentTransitioning(false)
        })
      }, contentTransitionDurationMs)
    }, pixGenerationDelayMs)
  }

  const handleGeneratePix = () => {
    if (selectedDepositMethod === 'other-bank') {
      if (newBankAccountId === null) return

      startPixGeneration(newBankAccountId, () => {
        setHasSavedAccountForSession(false)
      })
      return
    }

    startPixGeneration()
  }

  const handleSelectSavedDepositMethod = () => {
    if (selectedDepositMethod === 'saved-account' && hasMultipleSavedAccounts) {
      handleChangeBank()
      return
    }

    setSelectedDepositMethod('saved-account')
  }

  const handleSelectOtherBank = () => {
    if (newBankAccountId === null) return

    setSelectedDepositMethod('other-bank')
  }

  const handleDepositFromAnotherBank = () => {
    if (!amountCents || isGeneratingPix || newBankAccountId === null) return

    startPixGeneration(newBankAccountId, () => {
      setHasSavedAccountForSession(false)
      handleBankChangeSheetClose()
    })
  }

  useEffect(() => {
    shouldRenderRef.current = shouldRender
  }, [shouldRender])

  useEffect(() => {
    confirmationModeRef.current = confirmationMode
  }, [confirmationMode])

  useEffect(() => {
    initialAmountCentsRef.current = initialAmountCents
  }, [initialAmountCents])

  useEffect(() => {
    initialViewRef.current = initialView
  }, [initialView])

  useEffect(() => {
    onEnterCompleteRef.current = onEnterComplete
  }, [onEnterComplete])

  useEffect(() => {
    onDepositConfirmedRef.current = onDepositConfirmed
  }, [onDepositConfirmed])

  useEffect(() => {
    onDepositPendingRef.current = onDepositPending
  }, [onDepositPending])

  useEffect(() => {
    if (!shouldRender) return

    onViewChange?.(view)
  }, [onViewChange, shouldRender, view])

  useEffect(() => {
    clearCloseTimer()
    clearGenerateTimer()
    clearPixCopyFeedbackTimer()
    clearOpenFrame()
    clearOpenTimer()
    clearSwapTimer()

    if (isOpen) {
      const openAmountCents = normalizeInitialDepositAmountCents(initialAmountCentsRef.current)
      const shouldOpenPixView = initialViewRef.current === 'pix' && openAmountCents > 0
      const openView: DepositView = shouldOpenPixView ? 'pix' : 'form'
      const matchingPreset = getPresetOptionIdForAmount(openAmountCents)

      pixAmountCentsRef.current = shouldOpenPixView ? openAmountCents : null
      pixAccountIdRef.current = shouldOpenPixView
        ? activeAccount?.id ?? defaultDepositAccountId
        : null
      isPixDepositConfirmedRef.current = false
      isDepositPendingNotifiedRef.current = false

      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null
        setHeaderDragPhase('idle')
        setView(openView)
        setAmountCents(openAmountCents)
        setIsAmountEditingInline(false)
        setManualAmountInput(formatDepositAmount(openAmountCents))
        setSelectedDepositOptionId(matchingPreset ?? 'custom')
        setSelectedDepositMethod('saved-account')
        setHasSavedAccountForSession(savedAccounts.length > 0)
        setIsBankChangeSheetOpen(false)
        setIsAccountRemovalMode(false)
        setRemovingAccountId(null)
        setIsGeneratingPix(false)
        setPixCopyFeedback('idle')
        setIsContentTransitioning(false)
        setPixCountdownSeconds(pixCountdownInitialSeconds)
        setShouldRender(true)
        setMotionState('entering')

        openTimerRef.current = window.setTimeout(() => {
          openTimerRef.current = null
          setMotionState('open')
          onEnterCompleteRef.current?.()
        }, panelMotionDurationMs)
      }, 0)
      return () => {
        clearCloseTimer()
        clearGenerateTimer()
        clearPixCopyFeedbackTimer()
        clearOpenFrame()
        clearOpenTimer()
        clearSwapTimer()
      }
    }

    if (!shouldRenderRef.current) return undefined

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null
      setMotionState('closing')
      closeTimerRef.current = window.setTimeout(() => {
        setShouldRender(false)
        setMotionState('entering')
        setView('form')
        setAmountCents(defaultDepositAmountCents)
        setIsAmountEditingInline(false)
        setManualAmountInput(formatDepositAmount(defaultDepositAmountCents))
        setSelectedDepositOptionId('100')
        setSelectedDepositMethod('saved-account')
        setIsBankChangeSheetOpen(false)
        setIsAccountRemovalMode(false)
        setRemovingAccountId(null)
        setIsGeneratingPix(false)
        setPixCopyFeedback('idle')
        setIsContentTransitioning(false)
        setPixCountdownSeconds(pixCountdownInitialSeconds)
        pixAmountCentsRef.current = null
        pixAccountIdRef.current = null
        isPixDepositConfirmedRef.current = false
        isDepositPendingNotifiedRef.current = false
        closeTimerRef.current = null
      }, panelMotionDurationMs)
    }, 0)

    return () => {
      clearCloseTimer()
      clearGenerateTimer()
      clearPixCopyFeedbackTimer()
      clearOpenFrame()
      clearOpenTimer()
      clearSwapTimer()
    }
  }, [clearCloseTimer, clearGenerateTimer, clearOpenFrame, clearOpenTimer, clearPixCopyFeedbackTimer, clearSwapTimer, isOpen, panelMotionDurationMs])

  useEffect(() => () => {
    clearCloseTimer()
    clearGenerateTimer()
    clearPixCopyFeedbackTimer()
    clearOpenFrame()
    clearOpenTimer()
    clearSwapTimer()
  }, [clearCloseTimer, clearGenerateTimer, clearOpenFrame, clearOpenTimer, clearPixCopyFeedbackTimer, clearSwapTimer])

  useEffect(() => {
    if (isBankChangeSheetOpen && hasMultipleSavedAccounts) return

    setIsAccountRemovalMode(false)
  }, [hasMultipleSavedAccounts, isBankChangeSheetOpen])

  useEffect(() => {
    if (!shouldRender || presentation === 'embedded') return undefined

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [presentation, shouldRender])

  useEffect(() => {
    if (!shouldRender || presentation === 'embedded') return undefined

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isBankChangeSheetOpen) return
        requestClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isBankChangeSheetOpen, presentation, requestClose, shouldRender])

  useLayoutEffect(() => {
    if (!shouldRender) return undefined

    const panel = panelRef.current
    if (!panel) return undefined

    let lastKeyboardOffset = -1

    const updateKeyboardOffset = () => {
      const visualViewport = window.visualViewport
      // Usa a posição de layout para não contabilizar o translate da entrada do
      // bottom sheet como se fosse a altura do teclado virtual.
      const panelBottom = panel.offsetTop + panel.offsetHeight
      const viewportBottom = visualViewport
        ? visualViewport.offsetTop + visualViewport.height
        : window.innerHeight
      const keyboardOffset = Math.max(0, Math.round(panelBottom - viewportBottom))

      // Ignora variações mínimas (ex.: barra de autofill do iOS oscilando).
      if (Math.abs(keyboardOffset - lastKeyboardOffset) < 2) return

      lastKeyboardOffset = keyboardOffset
      panel.style.setProperty('--deposit-keyboard-offset', `${keyboardOffset}px`)
    }

    updateKeyboardOffset()

    window.addEventListener('resize', updateKeyboardOffset)
    window.addEventListener('orientationchange', updateKeyboardOffset)
    window.visualViewport?.addEventListener('resize', updateKeyboardOffset)
    window.visualViewport?.addEventListener('scroll', updateKeyboardOffset)

    return () => {
      panel.style.removeProperty('--deposit-keyboard-offset')
      window.removeEventListener('resize', updateKeyboardOffset)
      window.removeEventListener('orientationchange', updateKeyboardOffset)
      window.visualViewport?.removeEventListener('resize', updateKeyboardOffset)
      window.visualViewport?.removeEventListener('scroll', updateKeyboardOffset)
    }
  }, [shouldRender])

  useEffect(() => {
    if (!shouldRender || view !== 'pix') return undefined

    const countdownInterval = window.setInterval(() => {
      setPixCountdownSeconds((currentSeconds) => Math.max(0, currentSeconds - 1))
    }, 1000)

    return () => window.clearInterval(countdownInterval)
  }, [shouldRender, view])

  useTouchScrollFence(panelContainerRef, shouldRender)

  if (!shouldRender) return null

  const amount = formatDepositAmount(amountCents)
  const hasAmount = amountCents > 0
  const isSignupDepositFlow = confirmationMode === 'on-pix-copy'
  const pixCountdownMinutes = Math.ceil(pixCountdownSeconds / 60)
  const isOtherBankSelected = selectedDepositMethod === 'other-bank'
  const canGeneratePix = hasAmount && (!isOtherBankSelected || newBankAccountId !== null)

  return createPortal(
    <>
      <div
        className={`deposit-panel__container deposit-panel__container--${presentation}`}
        ref={panelContainerRef}
      >
      <div
        ref={overlayRef}
        className={[
          'deposit-panel__overlay',
          `deposit-panel__overlay--${motionState}`,
          headerDragPhase === 'dragging' ? 'deposit-panel__overlay--header-dragging' : '',
          headerDragPhase === 'closing' ? 'deposit-panel__overlay--header-drag-closing' : '',
        ].filter(Boolean).join(' ')}
        onClick={requestClose}
      />
      <aside
        ref={panelRef}
        className={[
          'deposit-panel',
          `deposit-panel--${presentation}`,
          `deposit-panel--${motionState}`,
          headerDragPhase === 'dragging' ? 'deposit-panel--header-dragging' : '',
          headerDragPhase === 'closing' ? 'deposit-panel--header-drag-closing' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        role={presentation === 'embedded' ? undefined : 'dialog'}
        aria-modal={presentation === 'embedded' ? undefined : 'true'}
        aria-label={presentation === 'embedded' ? undefined : 'Depositar'}
        onClick={(event) => event.stopPropagation()}
        onPointerCancel={cancelHeaderDrag}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={finishHeaderDrag}
      >
        <header
          className={[
            'deposit-panel__header',
            view === 'pix' ? 'deposit-panel__header--pix' : '',
          ].filter(Boolean).join(' ')}
          onClickCapture={handleHeaderClickCapture}
          onPointerDown={handleHeaderPointerDown}
        >
          {view === 'pix' ? (
            <button
              type="button"
              className="deposit-panel__close"
              aria-label="Fechar depósito"
              onClick={requestClose}
            >
              <img src={closePixIcon} alt="" aria-hidden="true" />
            </button>
          ) : presentation === 'bottom-sheet' || presentation === 'embedded' ? (
            <>
              <span className="deposit-panel__header-spacer" aria-hidden="true" />
              <h2 className="deposit-panel__title">Deposite para jogar</h2>
              <button
                type="button"
                className="deposit-panel__close"
                aria-label="Fechar depósito"
                onClick={requestClose}
              >
                <img src={closePixIcon} alt="" aria-hidden="true" />
              </button>
            </>
          ) : (
            <>
              {isSignupDepositFlow ? (
                <span className="deposit-panel__header-spacer" aria-hidden="true" />
              ) : (
                <button type="button" className="deposit-panel__back" aria-label="Voltar" onClick={requestClose}>
                  <img src={backHeaderIcon} alt="" aria-hidden="true" />
                </button>
              )}
              <h2 className="deposit-panel__title">Deposite para jogar</h2>
              <button
                type="button"
                className={isSignupDepositFlow ? 'deposit-panel__close' : 'deposit-panel__info'}
                aria-label={isSignupDepositFlow ? 'Fechar depósito' : 'Informações sobre depósito'}
                onClick={isSignupDepositFlow ? requestClose : undefined}
              >
                <img src={isSignupDepositFlow ? closePixIcon : iconInfo} alt="" aria-hidden="true" />
              </button>
            </>
          )}
        </header>

        <div className="deposit-panel__content">
          <div
            className={[
              'deposit-panel__view',
              view === 'pix' ? 'deposit-panel__view--pix' : 'deposit-panel__view--form',
              isContentTransitioning ? 'deposit-panel__view--transitioning' : '',
            ].filter(Boolean).join(' ')}
          >
            {view === 'form' ? (
              <>
                <main className="deposit-panel__form-main">
                  <section className="deposit-panel__amount-section" aria-label="Valor do depósito">
                    {isAmountEditingInline ? (
                      <label className="deposit-panel__amount-display deposit-panel__amount-display--editing">
                        <span className="deposit-panel__currency">R$</span>
                        <input
                          ref={manualAmountInputRef}
                          className="deposit-panel__amount-input"
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={manualAmountInput}
                          size={Math.max(1, manualAmountInput.length)}
                          style={{ width: `${Math.max(1, manualAmountInput.length)}ch` }}
                          aria-label="Valor do depósito"
                          onChange={(event) => handleManualAmountChange(event.target.value)}
                          onBlur={() => {
                            setIsAmountEditingInline(false)
                            setManualAmountInput(amountCents > 0 ? formatDepositAmount(amountCents) : '')
                          }}
                        />
                      </label>
                    ) : (
                      <button
                        type="button"
                        className="deposit-panel__amount-display"
                        aria-label={`Editar valor do depósito: R$ ${amount}`}
                        onClick={handleAmountDisplayClick}
                      >
                        <span className="deposit-panel__currency">R$</span>
                        <span className="deposit-panel__amount deposit-panel__amount--filled">
                          {formatDepositDisplayAmount(amountCents)}
                        </span>
                        <span className="deposit-panel__amount-caret" aria-hidden="true" />
                      </button>
                    )}

                    <div className="deposit-panel__quick-options" aria-label="Valores rápidos">
                      {quickDepositOptions.map((option) => {
                        const isSelected = selectedDepositOptionId === option.id

                        return (
                          <div className="deposit-panel__quick-option-wrap" key={option.id}>
                            <button
                              type="button"
                              className={[
                                'deposit-panel__quick-option',
                                isSelected ? 'deposit-panel__quick-option--selected' : '',
                              ].filter(Boolean).join(' ')}
                              aria-pressed={isSelected}
                              onClick={() => handleQuickOption(option)}
                            >
                              {option.label}
                            </button>
                            {option.recommended ? (
                              <span className="deposit-panel__quick-option-badge">
                                RECOMENDADO
                              </span>
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </section>

                  <section className="deposit-panel__method-section" aria-labelledby="deposit-payment-method-title">
                    <div className="deposit-panel__saved-method">
                      <h3 id="deposit-payment-method-title">Método de depósito</h3>
                      <button
                        type="button"
                        className={[
                          'deposit-panel__payment-card',
                          !isOtherBankSelected ? 'deposit-panel__payment-card--selected' : '',
                        ].filter(Boolean).join(' ')}
                        aria-pressed={!isOtherBankSelected}
                        onClick={handleSelectSavedDepositMethod}
                      >
                        <span className="deposit-panel__payment-summary">
                          <span className="deposit-panel__payment-copy">
                            <img className="deposit-panel__pix-badge" src={iconPix} alt="Pix" />
                            <span className="deposit-panel__payment-description">Aprovação imediata</span>
                          </span>
                          <span
                            className={[
                              'deposit-panel__payment-radio',
                              !isOtherBankSelected ? 'deposit-panel__payment-radio--selected' : '',
                            ].filter(Boolean).join(' ')}
                            aria-hidden="true"
                          />
                        </span>
                        {hasSavedAccountForSession && activeAccount ? (
                          <span className="deposit-panel__saved-bank">
                            <span className="deposit-panel__saved-bank-name">{activeAccount.bankName}</span>
                          </span>
                        ) : null}
                      </button>
                    </div>
                    {hasSavedAccountForSession && activeAccount ? (
                      <div className="deposit-panel__other-bank-group">
                        <button
                          type="button"
                          className={[
                            'deposit-panel__other-bank-option',
                            isOtherBankSelected ? 'deposit-panel__other-bank-option--selected' : '',
                            newBankAccountId === null ? 'deposit-panel__other-bank-option--disabled' : '',
                          ].filter(Boolean).join(' ')}
                          aria-pressed={isOtherBankSelected}
                          disabled={newBankAccountId === null}
                          onClick={handleSelectOtherBank}
                        >
                          <span>Depositar de outro banco</span>
                          <span
                            className={[
                              'deposit-panel__payment-radio',
                              isOtherBankSelected ? 'deposit-panel__payment-radio--selected' : '',
                            ].filter(Boolean).join(' ')}
                            aria-hidden="true"
                          />
                        </button>
                        <p className="deposit-panel__other-bank-hint">
                          {newBankAccountId === null
                            ? 'Para depositar de um banco novo, remova uma conta para liberar espaço.'
                            : 'Ao pagar por outro banco, ele substituirá o que está salvo.'}
                        </p>
                      </div>
                    ) : (
                      <div className="deposit-panel__saved-account-note">
                        <img src={iconCadeado} alt="" aria-hidden="true" />
                        <span>A conta usada neste depósito ficará salva para os próximos.</span>
                      </div>
                    )}
                  </section>
                </main>

                <footer className="deposit-panel__footer">
                  <button
                    type="button"
                    className={[
                      'deposit-panel__confirm',
                      isGeneratingPix ? 'deposit-panel__confirm--loading' : '',
                    ].filter(Boolean).join(' ')}
                    disabled={!canGeneratePix || isGeneratingPix}
                    aria-busy={isGeneratingPix}
                    onClick={handleGeneratePix}
                  >
                    <span className="deposit-panel__confirm-label">Continuar</span>
                    <span className="deposit-panel__confirm-spinner-wrap" aria-hidden="true">
                      <span className="deposit-panel__confirm-spinner" />
                    </span>
                  </button>
                </footer>
              </>
            ) : (
              <>
                <main className="deposit-panel__pix-main" aria-label="Pagamento Pix gerado">
                  <div className="deposit-panel__pix-layout">
                    <img className="deposit-panel__pix-logo" src={iconPix} alt="Pix" />
                    <p className="deposit-panel__pix-instruction">
                      Escaneie o QR code ou copie o código para pagar com Pix
                    </p>

                    <div className="deposit-panel__pix-qr-frame">
                      <div className="deposit-panel__pix-qr-card">
                        <img className="deposit-panel__pix-qr" src={qrCodeImage} alt="QR code Pix" />
                      </div>
                    </div>

                    <section className="deposit-panel__pix-payment" aria-label={`Valor do Pix: R$ ${amount}`}>
                      <div className="deposit-panel__pix-amount">
                        <span>R$</span>
                        <strong>{amount}</strong>
                      </div>
                      <div className="deposit-panel__pix-expiry-details">
                        {hasSavedAccountForSession && activeAccount ? (
                          <div className="deposit-panel__pix-account-card" aria-label="Conta usada no depósito">
                            <div className="deposit-panel__pix-account-row">
                              <img src={iconBanco} alt="" aria-hidden="true" />
                              <span className="deposit-panel__pix-account-label">Banco</span>
                              <span className="deposit-panel__pix-account-value">{activeAccount.bankName}</span>
                            </div>
                            <div className="deposit-panel__pix-account-row">
                              <img src={iconConta} alt="" aria-hidden="true" />
                              <span className="deposit-panel__pix-account-label">Conta</span>
                              <span className="deposit-panel__pix-account-value">•••{activeAccount.lastDigits}</span>
                            </div>
                            <div
                              className="deposit-panel__pix-account-row"
                              aria-label={`Código Pix expira em ${pixCountdownMinutes} minutos`}
                            >
                              <img src={iconExpira} alt="" aria-hidden="true" />
                              <span className="deposit-panel__pix-account-label">Expira</span>
                              <span className="deposit-panel__pix-account-value">
                                Em {pixCountdownMinutes} minutos
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div
                            className="deposit-panel__pix-expiry-card"
                            aria-label={`Código Pix expira em ${pixCountdownMinutes} minutos`}
                          >
                            <img src={iconClock} alt="" aria-hidden="true" />
                            <span className="deposit-panel__pix-expiry-label">Expira</span>
                            <span className="deposit-panel__pix-expiry-value">
                              Em {pixCountdownMinutes} minutos
                            </span>
                          </div>
                        )}
                        <p className="deposit-panel__pix-expiry-reminder">
                          Lembre-se de que você deve depositar de uma conta vinculada ao seu CPF.
                        </p>
                      </div>
                    </section>
                  </div>
                </main>

                <footer className="deposit-panel__footer deposit-panel__footer--pix">
                  {pixCopyFeedback === 'copied' ? (
                    <div
                      className="deposit-panel__pix-copy-toast"
                      key={`copied:${pixCopyFeedbackKey}`}
                      role="status"
                      aria-live="polite"
                    >
                      <img src={iconPixCopiado} alt="" aria-hidden="true" />
                      <span>Código copiado</span>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="deposit-panel__confirm deposit-panel__pix-copy-button"
                    onClick={handleCopyPixCode}
                  >
                    Copiar código Pix
                  </button>
                </footer>
              </>
            )}
          </div>
        </div>
        </aside>
      </div>
      <BottomSheet
        isOpen={isBankChangeSheetOpen}
        onClose={handleBankChangeSheetClose}
        title="Pix"
        containerClassName="deposit-bank-sheet-container"
        sheetClassName="deposit-bank-sheet"
        bodyClassName="deposit-bank-sheet__body"
        hideScrollIndicator
        blurBackdrop
      >
        <div className="deposit-bank-sheet__content">
          {hasMultipleSavedAccounts ? (
            <div className="deposit-bank-sheet__management-header">
              <span>{isAccountRemovalMode ? 'Excluir conta' : 'Conta'}</span>
              <button
                type="button"
                className="deposit-bank-sheet__management-action"
                disabled={removingAccountId !== null}
                onClick={() => setIsAccountRemovalMode((current) => !current)}
              >
                <img
                  src={isAccountRemovalMode ? iconVoltarExcluirConta : iconRemoverPix}
                  alt=""
                  aria-hidden="true"
                />
                <span>{isAccountRemovalMode ? 'Voltar' : 'Remover'}</span>
              </button>
            </div>
          ) : null}
          <div className="deposit-bank-sheet__accounts" aria-label="Contas Pix salvas">
            {savedAccounts.map((account) => {
              const isSelected = account.id === activeAccount?.id

              return (
                <button
                  type="button"
                  className={[
                    'deposit-bank-sheet__saved-account',
                    removingAccountId === account.id
                      ? 'deposit-bank-sheet__saved-account--removing'
                      : '',
                  ].filter(Boolean).join(' ')}
                  aria-label={isAccountRemovalMode
                    ? `Excluir ${account.bankName}, conta final ${account.lastDigits}`
                    : `${account.bankName}, conta final ${account.lastDigits}${isSelected ? ', selecionada' : ''}`}
                  aria-pressed={isAccountRemovalMode ? undefined : isSelected}
                  disabled={isGeneratingPix || removingAccountId !== null}
                  onClick={() => (
                    isAccountRemovalMode
                      ? handleRemoveSavedAccount(account.id)
                      : handleSelectSavedAccount(account.id)
                  )}
                  onAnimationEnd={(event) => {
                    if (event.currentTarget !== event.target) return

                    handleRemoveAccountAnimationEnd(account.id)
                  }}
                  key={account.id}
                >
                  <span className="deposit-bank-sheet__account-copy">
                    <strong>{account.bankName}</strong>
                    <span>Conta: ***{account.lastDigits}</span>
                  </span>
                  {isAccountRemovalMode ? (
                    <img
                      className="deposit-bank-sheet__remove-account-icon"
                      src={iconRemoverPixGde}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : (
                    <span
                      className={[
                        'deposit-bank-sheet__radio',
                        isSelected ? 'deposit-bank-sheet__radio--selected' : '',
                      ].filter(Boolean).join(' ')}
                      aria-hidden="true"
                    />
                  )}
                </button>
              )
            })}
          </div>
          <button
            type="button"
            className={[
              'deposit-bank-sheet__other-bank',
              isGeneratingPix ? 'deposit-bank-sheet__other-bank--loading' : '',
              newBankAccountId === null ? 'deposit-bank-sheet__other-bank--disabled' : '',
            ].filter(Boolean).join(' ')}
            disabled={isGeneratingPix || newBankAccountId === null}
            aria-busy={isGeneratingPix}
            onClick={handleDepositFromAnotherBank}
          >
            {isGeneratingPix ? (
              <span className="deposit-panel__confirm-spinner" aria-hidden="true" />
            ) : (
              <>
                <span>Depositar de outro banco</span>
                <img src={iconSetaTrocarBanco} alt="" aria-hidden="true" />
              </>
            )}
          </button>
          <p className="deposit-bank-sheet__hint">
            {newBankAccountId === null
              ? 'Para depositar de um banco novo, remova uma conta para liberar espaço.'
              : 'O banco de onde você pagar ficará salvo aqui.'}
          </p>
        </div>
      </BottomSheet>
    </>,
    portalTarget ?? document.body
  )
}
