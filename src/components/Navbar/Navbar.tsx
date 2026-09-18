import { getBrandConfig } from '../../shared/brand/config'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import './Navbar.css'

import { productNavbarConfigs } from '../../data/homeProducts'
import { useFeatureFlags } from '../../shared/hooks/useFeatureFlags'
import type { ProductMode } from '../../shared/types/home'
import navClubDrafteaIniciante from '../../brands/draftea/assets/navClubDrafteaIniciante.png'

interface NavbarProps {
  activeProduct?: ProductMode
  activeItemId?: string
  disabledItemIds?: string[]
  onItemSelect?: (itemId: string) => void
}

const navbarActiveMotionMs = 520
// Colored raster logos render as <img>; monochrome (svg) icons fall through to the
// CSS-mask path. Match data URIs too: small assets get inlined as `data:image/png;...`
// at build time (no `.png` suffix), which would otherwise be mis-detected as a mask.
const shouldRenderNavbarIconAsImage = (icon: string) =>
  /^data:image\/(png|jpe?g|webp|gif)/i.test(icon) ||
  /\.(png|jpe?g|webp|gif)$/i.test(icon.split('?')[0] ?? icon)

const getNavbarIconStyle = (icon: string) => ({
  '--navbar-icon-mask': `url("${icon}")`,
}) as CSSProperties

const renderNavbarIcon = (icon: string) => (
  <span className="navbar__icon-slot">
    {shouldRenderNavbarIconAsImage(icon) ? (
      <img
        aria-hidden="true"
        className="navbar__icon navbar__icon--image"
        src={icon}
        alt=""
      />
    ) : (
      <span
        aria-hidden="true"
        className="navbar__icon"
        style={getNavbarIconStyle(icon)}
      />
    )}
  </span>
)

export function Navbar({
  activeProduct = 'apostas',
  activeItemId: controlledActiveItemId,
  disabledItemIds = [],
  onItemSelect,
}: NavbarProps = {}) {
  const { brandMode } = useFeatureFlags()
  const baseNavbarConfig = productNavbarConfigs[activeProduct]
  const isCasinoEnabled = getBrandConfig(brandMode).features.casino
  // Os rótulos vêm da marca, e não do catálogo legado: na Draftea eles são nomes próprios
  // (Bets, Mis entradas, Gaming, Rewards), não a tradução do texto da Pitaco.
  const navbarItemLabels = getBrandConfig(brandMode).messages.navbarItems
  const withBrandLabel = <TItem extends { id: string; label: string }>(item: TItem): TItem => (
    navbarItemLabels[item.id] ? { ...item, label: navbarItemLabels[item.id] } : item
  )
  const navbarConfig = {
    ...baseNavbarConfig,
    mainItems: baseNavbarConfig.mainItems.map((item) => withBrandLabel(
      brandMode === 'draftea' && item.id === 'promocoes'
        ? { ...item, icon: navClubDrafteaIniciante }
        : item
    )),
    searchItem: withBrandLabel(baseNavbarConfig.searchItem),
  }
  const isControlledActiveItem = controlledActiveItemId !== undefined
  const configuredActiveItemId = controlledActiveItemId ?? navbarConfig.activeItemId
  const [selectedItemId, setSelectedItemId] = useState(configuredActiveItemId)
  const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const activeBackgroundRef = useRef<HTMLSpanElement | null>(null)
  const previousActiveRectRef = useRef<DOMRect | null>(null)
  const activeBackgroundAnimationRef = useRef<Animation | null>(null)
  const pointerItemSelectionRef = useRef<string | null>(null)
  const pointerItemSelectionResetTimerRef = useRef<number | null>(null)
  const availableItemIds = [
    ...navbarConfig.mainItems.map((item) => item.id),
    navbarConfig.searchItem.id,
  ]
  const activeItemId = availableItemIds.includes(selectedItemId)
    ? selectedItemId
    : navbarConfig.activeItemId
  const navClassName = [
    'navbar',
    'navbar--liquid-v2',
    'navbar--liquid-v2-casino',
  ]
    .filter(Boolean)
    .join(' ')
  const panelClassName = ['navbar__panel', 'navbar__panel--liquid-v2']
    .filter(Boolean)
    .join(' ')
  const isItemDisabled = (itemId: string) => disabledItemIds.includes(itemId) || (itemId === 'ao-vivo' && !isCasinoEnabled)

  const clearPointerItemSelectionResetTimer = useCallback(() => {
    if (pointerItemSelectionResetTimerRef.current === null) return

    window.clearTimeout(pointerItemSelectionResetTimerRef.current)
    pointerItemSelectionResetTimerRef.current = null
  }, [])

  const selectNavbarItem = useCallback((itemId: string) => {
    if (disabledItemIds.includes(itemId) || (itemId === 'ao-vivo' && !isCasinoEnabled)) return

    if (itemId !== activeItemId) {
      previousActiveRectRef.current = itemRefs.current[activeItemId]?.getBoundingClientRect() ?? null
    }

    if (!isControlledActiveItem) {
      setSelectedItemId(itemId)
    }
    onItemSelect?.(itemId)
  }, [activeItemId, disabledItemIds, isCasinoEnabled, isControlledActiveItem, onItemSelect])

  useEffect(() => {
    setSelectedItemId(configuredActiveItemId)
  }, [configuredActiveItemId])

  const handleItemPointerDown = (itemId: string) => (event: PointerEvent<HTMLButtonElement>) => {
    if (isItemDisabled(itemId)) return
    if (event.pointerType === 'mouse' && event.button !== 0) return

    pointerItemSelectionRef.current = itemId
    clearPointerItemSelectionResetTimer()
    pointerItemSelectionResetTimerRef.current = window.setTimeout(() => {
      pointerItemSelectionRef.current = null
      pointerItemSelectionResetTimerRef.current = null
    }, 800)

    selectNavbarItem(itemId)
  }

  const handleItemClick = (itemId: string) => () => {
    if (isItemDisabled(itemId)) return

    if (pointerItemSelectionRef.current === itemId) {
      pointerItemSelectionRef.current = null
      clearPointerItemSelectionResetTimer()
      return
    }

    selectNavbarItem(itemId)
  }

  useLayoutEffect(() => {
    const activeBackgroundEl = activeBackgroundRef.current
    const previousActiveRect = previousActiveRectRef.current
    previousActiveRectRef.current = null

    if (!activeBackgroundEl || !previousActiveRect) return

    const activeRect = activeBackgroundEl.getBoundingClientRect()
    if (!activeRect.width || !activeRect.height) return

    activeBackgroundAnimationRef.current?.cancel()
    activeBackgroundAnimationRef.current = activeBackgroundEl.animate(
      [
        {
          transform: `translate3d(${previousActiveRect.left - activeRect.left}px, ${previousActiveRect.top - activeRect.top}px, 0) scale(${previousActiveRect.width / activeRect.width}, ${previousActiveRect.height / activeRect.height})`,
        },
        { transform: 'translate3d(0, 0, 0) scale(1, 1)' },
      ],
      {
        duration: navbarActiveMotionMs,
        easing: 'cubic-bezier(0.2, 1, 0.28, 1)',
        fill: 'both',
      }
    )

    activeBackgroundAnimationRef.current.addEventListener('finish', () => {
      activeBackgroundAnimationRef.current = null
    }, { once: true })
  }, [activeItemId])

  useEffect(() => () => {
    clearPointerItemSelectionResetTimer()
    activeBackgroundAnimationRef.current?.cancel()
  }, [clearPointerItemSelectionResetTimer])

  const navbarShell = (
      <div className="navbar__shell">
        <div className={`${panelClassName} navbar__panel--main`}>
          <div className="navbar__items">
            {navbarConfig.mainItems.map((item) => {
              const isActive = activeItemId === item.id
              const isDisabled = isItemDisabled(item.id)

              return (
                <button
                  key={item.id}
                  type="button"
                  ref={(node) => {
                    itemRefs.current[item.id] = node
                  }}
                  className={[
                    'navbar__item',
                    isActive ? 'navbar__item--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onPointerDown={isDisabled ? undefined : handleItemPointerDown(item.id)}
                  onClick={isDisabled ? undefined : handleItemClick(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  aria-disabled={isDisabled}
                  aria-label={item.label}
                  data-navbar-item-id={item.id}
                >
                  {isActive ? (
                    <span
                      className="navbar__item-active-bg"
                      ref={activeBackgroundRef}
                      aria-hidden="true"
                    />
                  ) : null}
                  {/* Selecionado, o item troca para a versão preenchida do ícone, quando existe. */}
                  {renderNavbarIcon(isActive && item.activeIcon ? item.activeIcon : item.icon)}
                  <span className="navbar__label">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className={`${panelClassName} navbar__panel--search`}>
          <button
            type="button"
            ref={(node) => {
              itemRefs.current[navbarConfig.searchItem.id] = node
            }}
            className={[
              'navbar__item',
              'navbar__item--search',
              activeItemId === navbarConfig.searchItem.id ? 'navbar__item--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onPointerDown={isItemDisabled(navbarConfig.searchItem.id) ? undefined : handleItemPointerDown(navbarConfig.searchItem.id)}
            onClick={isItemDisabled(navbarConfig.searchItem.id) ? undefined : handleItemClick(navbarConfig.searchItem.id)}
            aria-current={activeItemId === navbarConfig.searchItem.id ? 'page' : undefined}
            aria-disabled={isItemDisabled(navbarConfig.searchItem.id)}
            aria-label={navbarConfig.searchItem.label}
            data-navbar-item-id={navbarConfig.searchItem.id}
          >
            {activeItemId === navbarConfig.searchItem.id ? (
              <span
                className="navbar__item-active-bg"
                ref={activeBackgroundRef}
                aria-hidden="true"
              />
            ) : null}
            {renderNavbarIcon(navbarConfig.searchItem.icon)}
          </button>
        </div>
      </div>
  )

  return (
    <nav className={navClassName}>
      {navbarShell}
    </nav>
  )
}
