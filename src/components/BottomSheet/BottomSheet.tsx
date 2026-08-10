import { useCallback, useEffect, useLayoutEffect, useState, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { CaretUpIcon } from '@phosphor-icons/react'
import closeBS from '../../assets/iconsDraftaco/closeBS.svg'
import { useStableKeyboardViewport } from '../../hooks/useStableKeyboardViewport'
import { useTouchScrollFence } from '../../hooks/useTouchScrollFence'
import './BottomSheet.css'

type BottomSheetKeyboardBehavior = 'follow-viewport' | 'stable-scroll'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  onCloseStart?: () => void
  title?: string
  titleIcon?: string
  leadingContent?: ReactNode
  children: ReactNode
  footerContent?: ReactNode
  blurBackdrop?: boolean
  containerClassName?: string
  sheetClassName?: string
  bodyClassName?: string
  hideScrollIndicator?: boolean
  closeOnEscape?: boolean
  keyboardBehavior?: BottomSheetKeyboardBehavior
}

export function BottomSheet({
  isOpen,
  onClose,
  onCloseStart,
  title,
  titleIcon,
  leadingContent,
  children,
  footerContent,
  blurBackdrop = false,
  containerClassName = '',
  sheetClassName = '',
  bodyClassName = '',
  hideScrollIndicator = false,
  closeOnEscape = true,
  keyboardBehavior = 'follow-viewport',
}: BottomSheetProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [showScrollIndicator, setShowScrollIndicator] = useState(true)
  const containerRef = useRef<HTMLDivElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const closeTimerRef = useRef<number | null>(null)
  const isMounted = isOpen || shouldRender

  // O portal fica fora da página que já tem o fence: bloqueia aqui o pan nativo
  // do iOS (teclado aberto) para toques que começam na própria sheet/overlay.
  useTouchScrollFence(containerRef, isMounted)
  useStableKeyboardViewport({
    rootRef: containerRef,
    scrollContainerSelector: '.bottom-sheet__body',
    stableHeightCssVariable: '--bottom-sheet-viewport-height',
    keyboardInsetCssVariable: '--bottom-sheet-keyboard-inset',
    enabled: isMounted && keyboardBehavior === 'stable-scroll',
  })

  // Check scroll position
  const handleScroll = () => {
    if (!bodyRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = bodyRef.current
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10
    setShowScrollIndicator(!isAtBottom)
  }

  // Check if content is scrollable on mount/update
  useEffect(() => {
    if (shouldRender && bodyRef.current) {
      const { scrollHeight, clientHeight } = bodyRef.current
      const hasScroll = scrollHeight > clientHeight
      setShowScrollIndicator(hasScroll)
    }
  }, [shouldRender, children])

  // Handle open/close with animation
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (isOpen && !isClosing) {
        if (closeTimerRef.current !== null) {
          window.clearTimeout(closeTimerRef.current)
          closeTimerRef.current = null
        }
        setShouldRender(true)
        setIsClosing(false)
      } else if (shouldRender && !isClosing) {
        setIsClosing(true)
        closeTimerRef.current = window.setTimeout(() => {
          setShouldRender(false)
          setIsClosing(false)
          closeTimerRef.current = null
        }, 300)
      }
    }, 0)

    return () => window.clearTimeout(timer)
  }, [isOpen, shouldRender, isClosing])

  const handleClose = useCallback(() => {
    if (isClosing) return

    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current)
    }
    onCloseStart?.()
    setIsClosing(true)
    closeTimerRef.current = window.setTimeout(() => {
      setShouldRender(false)
      setIsClosing(false)
      closeTimerRef.current = null
      onClose()
    }, 300) // Match animation duration
  }, [isClosing, onClose, onCloseStart])

  // Prevent body scroll when bottom sheet is open
  useEffect(() => {
    if (!isMounted) return undefined

    const previousBodyOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousBodyOverflow
    }
  }, [isMounted])

  useLayoutEffect(() => {
    if (!isMounted || keyboardBehavior === 'stable-scroll') return undefined

    let lastViewportHeight = 0
    let lastViewportTop = -1

    const updateViewportStyle = () => {
      if (!containerRef.current) return

      const visualViewport = window.visualViewport
      const viewportHeight = Math.max(1, visualViewport?.height ?? window.innerHeight)
      const viewportTop = Math.max(0, visualViewport?.offsetTop ?? 0)

      // Ignora variações mínimas (ex.: barra de autofill do iOS oscilando)
      // para a sheet não ficar tremendo enquanto o usuário digita.
      if (Math.abs(viewportHeight - lastViewportHeight) < 2 && Math.abs(viewportTop - lastViewportTop) < 2) return

      lastViewportHeight = viewportHeight
      lastViewportTop = viewportTop
      containerRef.current.style.setProperty('--bottom-sheet-viewport-height', `${viewportHeight}px`)
      containerRef.current.style.setProperty('--bottom-sheet-viewport-top', `${viewportTop}px`)
    }

    updateViewportStyle()

    window.addEventListener('resize', updateViewportStyle)
    window.addEventListener('orientationchange', updateViewportStyle)
    window.visualViewport?.addEventListener('resize', updateViewportStyle)
    window.visualViewport?.addEventListener('scroll', updateViewportStyle)

    return () => {
      window.removeEventListener('resize', updateViewportStyle)
      window.removeEventListener('orientationchange', updateViewportStyle)
      window.visualViewport?.removeEventListener('resize', updateViewportStyle)
      window.visualViewport?.removeEventListener('scroll', updateViewportStyle)
      containerRef.current?.style.removeProperty('--bottom-sheet-viewport-height')
      containerRef.current?.style.removeProperty('--bottom-sheet-viewport-top')
    }
  }, [isMounted, keyboardBehavior])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
      }
    }
    if (isMounted && closeOnEscape) {
      window.addEventListener('keydown', handleEscape)
    }
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [closeOnEscape, isMounted, handleClose])

  if (!isMounted) return null

  return createPortal(
    <div
      className={[
        'bottom-sheet__container',
        keyboardBehavior === 'stable-scroll' ? 'bottom-sheet__container--stable-scroll' : '',
        containerClassName,
      ].filter(Boolean).join(' ')}
      ref={containerRef}
    >
      {/* Overlay - separate from bottom sheet for independent animation */}
      <div
        className={`bottom-sheet__overlay ${blurBackdrop ? 'bottom-sheet__overlay--blur' : ''} ${isClosing ? 'bottom-sheet__overlay--closing' : ''}`}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        className={[
          'bottom-sheet',
          keyboardBehavior === 'stable-scroll' ? 'bottom-sheet--stable-scroll' : '',
          sheetClassName,
          isClosing ? 'bottom-sheet--closing' : '',
        ].filter(Boolean).join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Fixed */}
        <div className={`bottom-sheet__header ${!title ? 'bottom-sheet__header--no-title' : ''}`}>
          {leadingContent && (
            <div className="bottom-sheet__leading">
              {leadingContent}
            </div>
          )}
          {title ? (
            <div className="bottom-sheet__title">
              {titleIcon && (
                <img src={titleIcon} alt="" className="bottom-sheet__title-icon" />
              )}
              <span>{title}</span>
            </div>
          ) : (
            <span className="bottom-sheet__title-spacer" />
          )}
          <button type="button" className="bottom-sheet__close" onClick={handleClose} aria-label="Fechar">
            <img src={closeBS} alt="" className="bottom-sheet__close-icon" />
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="bottom-sheet__body-wrapper">
          <div
            className={['bottom-sheet__body', bodyClassName].filter(Boolean).join(' ')}
            ref={bodyRef}
            onScroll={handleScroll}
          >
            {children}
          </div>
          {!hideScrollIndicator && (
            <div
              className={`bottom-sheet__scroll-indicator ${showScrollIndicator ? '' : 'bottom-sheet__scroll-indicator--hidden'}`}
            />
          )}
        </div>

        {/* Footer - Fixed */}
        {footerContent && (
          <div className="bottom-sheet__footer">
            {footerContent}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

// Reusable sub-components for mission content
interface MissionObjectiveProps {
  text: string
  completed?: boolean
}

export function MissionObjective({ text, completed = false }: MissionObjectiveProps) {
  return (
    <div className="mission-objective">
      <div className={`mission-objective__radio ${completed ? 'mission-objective__radio--completed' : ''}`}>
        {completed && <span className="mission-objective__check">✓</span>}
      </div>
      <span className="mission-objective__text">{text}</span>
    </div>
  )
}

interface MissionInfoRowProps {
  label: string
  value: string
}

export function MissionInfoRow({ label, value }: MissionInfoRowProps) {
  return (
    <div className="mission-info-row">
      <span className="mission-info-row__label">{label}</span>
      <span className="mission-info-row__value">{value}</span>
    </div>
  )
}

interface MissionFaqItemProps {
  question: string
  answer?: string
  defaultOpen?: boolean
}

export function MissionFaqItem({ question, answer, defaultOpen = false }: MissionFaqItemProps) {
  const [isExpanded, setIsExpanded] = useState(defaultOpen)
  
  return (
    <div className={`mission-faq-item ${isExpanded ? 'mission-faq-item--expanded' : ''}`}>
      <button 
        className="mission-faq-item__header" 
        onClick={() => answer && setIsExpanded(!isExpanded)}
      >
        <span className="mission-faq-item__question">{question}</span>
        <CaretUpIcon
          aria-hidden="true"
          className={`mission-faq-item__icon ${isExpanded ? 'mission-faq-item__icon--rotated' : ''}`}
          weight="bold"
        />
      </button>
      {answer && (
        <div className="mission-faq-item__answer-wrapper">
          <p className="mission-faq-item__answer">{answer}</p>
        </div>
      )}
    </div>
  )
}

interface MissionTimerProps {
  text: string
}

export function MissionTimer({ text }: MissionTimerProps) {
  return (
    <div className="mission-timer">
      <div className="mission-timer__dot" />
      <span className="mission-timer__text">{text}</span>
    </div>
  )
}
