import { getBrandConfig } from '../../shared/brand/config'
import { useLayoutEffect, useRef, type MouseEvent, type PointerEvent, type ReactNode } from 'react'
import './HeaderV2.css'
import type { ProductMode } from '../../shared/types/home'
import { useFeatureFlags } from '../../shared/hooks/useFeatureFlags'

interface HeaderV2Props {
  activeProduct?: ProductMode
  activeSport?: string | null
  rail?: ReactNode
  authVariant?: 'logged-in' | 'logged-out'
  balanceCents?: number
  depositStatus?: 'deposit-pending' | 'identity-pending' | 'limits-pending'
  showMenuButton?: boolean
  changeProductOnPointerDown?: boolean
  disableProductToggle?: boolean
  disableMenuButton?: boolean
  isProfileOpen?: boolean
  onProductChange?: (product: ProductMode) => void
  onLogoClick?: () => void
  onLogoDoubleClick?: () => void
  onLoginClick?: () => void
  onCreateAccountClick?: () => void
  onDepositOpen?: () => void
  onIdentityOpen?: () => void
  onLimitsOpen?: () => void
  onProfileOpen?: () => void
  children?: ReactNode
}

const defaultBalanceCents = 25000
const headerLogoDoubleTapDelay = 650
const headerLogoActivationCooldown = 300
const headerLogoLongPressDelay = 550
const formatBalanceDisplayValue = (amountCents: number) => {
  const safeAmountCents = Number.isFinite(amountCents) ? Math.max(0, amountCents) : 0

  return `R$${(safeAmountCents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function HeaderV2({
  activeSport,
  rail,
  authVariant = 'logged-out',
  balanceCents = defaultBalanceCents,
  depositStatus,
  showMenuButton = true,
  disableMenuButton = false,
  isProfileOpen = false,
  onLogoClick,
  onLogoDoubleClick,
  onLoginClick,
  onCreateAccountClick,
  onDepositOpen,
  onIdentityOpen,
  onLimitsOpen,
  onProfileOpen,
  children,
}: HeaderV2Props = {}) {
  const { brandMode } = useFeatureFlags()
  const isSportPage = !!activeSport && activeSport !== 'destaques'
  const isLoggedOut = authVariant === 'logged-out'
  const brand = getBrandConfig(brandMode)
  const isDrafteaBrand = brand.id === 'draftea'
  const isDepositPending = depositStatus === 'deposit-pending'
  const isIdentityPending = depositStatus === 'identity-pending'
  const isLimitsPending = depositStatus === 'limits-pending'
  const hasPendingAccountAction = isDepositPending || isIdentityPending || isLimitsPending
  const balanceDisplayValue = formatBalanceDisplayValue(balanceCents)
  const balanceLabel = isIdentityPending
    ? 'VERIFICAR IDENTIDADE'
    : isLimitsPending
    ? 'DEFINIR LIMITES'
    : isDepositPending
      ? 'DEPÓSITO PENDENTE'
      : 'SALDO'
  const balanceAriaLabel = isIdentityPending
    ? 'Verificar identidade'
    : isLimitsPending
    ? 'Definir limites de jogo'
    : isDepositPending
    ? `Saldo disponível: ${balanceDisplayValue}; depósito pendente`
    : `Saldo disponível: ${balanceDisplayValue}`
  const logoAlt = brand.name
  const logoDark = brand.assets.logo
  const logoLight = brand.assets.logoLight
  const lastLogoTapTimeRef = useRef(0)
  const lastLogoActivationTimeRef = useRef(0)
  const logoLongPressTimerRef = useRef<number | null>(null)

  const clearLogoLongPressTimer = () => {
    if (logoLongPressTimerRef.current === null) return

    window.clearTimeout(logoLongPressTimerRef.current)
    logoLongPressTimerRef.current = null
  }

  const openFeatureFlagsFromLogo = () => {
    if (!onLogoDoubleClick) return

    const currentTime = Date.now()
    if (currentTime - lastLogoActivationTimeRef.current <= headerLogoActivationCooldown) return

    clearLogoLongPressTimer()
    lastLogoActivationTimeRef.current = currentTime
    lastLogoTapTimeRef.current = 0
    onLogoDoubleClick()
  }

  const handleLogoPointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (!onLogoDoubleClick) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    clearLogoLongPressTimer()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    logoLongPressTimerRef.current = window.setTimeout(() => {
      openFeatureFlagsFromLogo()
    }, headerLogoLongPressDelay)
  }

  const handleLogoPointerEnd = () => {
    clearLogoLongPressTimer()
  }

  const handleLogoClick = (event: MouseEvent<HTMLButtonElement>) => {
    const currentTime = Date.now()

    if (currentTime - lastLogoActivationTimeRef.current <= headerLogoActivationCooldown) return

    if (event.detail >= 2 && onLogoDoubleClick) {
      openFeatureFlagsFromLogo()
      return
    }

    if (onLogoClick) {
      lastLogoTapTimeRef.current = currentTime
      onLogoClick()
      return
    }

    if (!onLogoDoubleClick) return

    const elapsedTime = currentTime - lastLogoTapTimeRef.current

    if (elapsedTime > 0 && elapsedTime <= headerLogoDoubleTapDelay) {
      openFeatureFlagsFromLogo()
      return
    }

    lastLogoTapTimeRef.current = currentTime
  }

  useLayoutEffect(() => () => {
    clearLogoLongPressTimer()
  }, [])

  return (
    <header
      className={[
        'header',
        'header--v2',
        'header--gradient-v3',
        isSportPage ? 'header--sport-active' : 'header--competition-rail',
        'header--liquid-glass',
        'header--liquid-glass-new',
        !showMenuButton ? 'header--balance-only' : '',
        isLoggedOut ? 'header--logged-out' : 'header--logged-in',
        hasPendingAccountAction ? 'header--deposit-pending' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="header__top">
        {onLogoDoubleClick || onLogoClick ? (
          <button
            type="button"
            className="header__logo header__logo-button"
            aria-label={onLogoClick ? 'Voltar para destaques' : 'Abrir feature flags'}
            aria-haspopup={onLogoDoubleClick ? 'dialog' : undefined}
            onPointerDown={handleLogoPointerDown}
            onPointerUp={handleLogoPointerEnd}
            onPointerCancel={handleLogoPointerEnd}
            onPointerLeave={handleLogoPointerEnd}
            onClick={handleLogoClick}
            onDoubleClick={openFeatureFlagsFromLogo}
            onContextMenu={(event) => event.preventDefault()}
          >
            <img
              src={logoDark}
              alt={logoAlt}
              className={[
                'header__logo-img',
                'header__logo-img--dark',
                isDrafteaBrand ? 'header__logo-img--draftea' : '',
              ].filter(Boolean).join(' ')}
            />
            <img
              src={logoLight}
              alt={logoAlt}
              className={[
                'header__logo-img',
                'header__logo-img--light',
                isDrafteaBrand ? 'header__logo-img--draftea' : '',
              ].filter(Boolean).join(' ')}
            />
          </button>
        ) : (
          <div className="header__logo">
            <img
              src={logoDark}
              alt={logoAlt}
              className={[
                'header__logo-img',
                'header__logo-img--dark',
                isDrafteaBrand ? 'header__logo-img--draftea' : '',
              ].filter(Boolean).join(' ')}
            />
            <img
              src={logoLight}
              alt={logoAlt}
              className={[
                'header__logo-img',
                'header__logo-img--light',
                isDrafteaBrand ? 'header__logo-img--draftea' : '',
              ].filter(Boolean).join(' ')}
            />
          </div>
        )}

        <div className="header__account-actions">
          {isLoggedOut ? (
            <>
              <button
                type="button"
                className="header__auth-btn header__auth-btn--primary"
                onClick={onCreateAccountClick}
              >
                {brand.messages.createAccount}
              </button>
              <button
                type="button"
                className="header__auth-btn header__auth-btn--secondary"
                onClick={onLoginClick}
              >
                {brand.messages.login}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="header__balance"
                aria-label={balanceAriaLabel}
                onClick={isIdentityPending ? onIdentityOpen : isLimitsPending ? onLimitsOpen : onDepositOpen}
              >
                <span className="header__balance-content">
                  <span className="header__balance-value">{balanceDisplayValue}</span>
                  <span className="header__balance-label">{balanceLabel}</span>
                </span>
                <span
                  className="header__deposit-icon-shell"
                  aria-hidden="true"
                >
                  <span className="header__deposit-icon" />
                </span>
              </button>
              {showMenuButton && (
                <button
                  type="button"
                  className="header__menu-btn"
                  aria-label="Abrir meu perfil"
                  aria-haspopup="dialog"
                  aria-expanded={isProfileOpen}
                  aria-disabled={disableMenuButton}
                  disabled={disableMenuButton}
                  onClick={disableMenuButton ? undefined : onProfileOpen}
                >
                  <span aria-hidden="true" className="header__menu-icon" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {rail}
      {children}
    </header>
  )
}
