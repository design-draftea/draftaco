import { useEffect, useRef, useState, type ComponentType } from 'react'

import { ContentFilterChips } from '../../../components/ContentFilterChips'
import { HeaderV2 } from '../../../components/HeaderV2'
import { entriesByTab } from '../../../data/entries'
import type { ProductMode } from '../../../shared/types/home'
import { EntryCard } from './EntryCards'
import './EntriesPage.css'

// Mesmos props de header que a PromotionsPage recebe, para a tela nascer com a
// moldura padrão do Draftaco em vez de um header próprio.
interface HeaderComponentProps {
  activeProduct?: ProductMode
  authVariant?: 'logged-in' | 'logged-out'
  balanceCents?: number
  depositStatus?: 'deposit-pending' | 'identity-pending' | 'limits-pending'
  changeProductOnPointerDown?: boolean
  disableProductToggle?: boolean
  isProfileOpen?: boolean
  onDepositOpen?: () => void
  onIdentityOpen?: () => void
  onLimitsOpen?: () => void
  onProfileOpen?: () => void
  onLogoDoubleClick?: () => void
  onLoginClick?: () => void
  onCreateAccountClick?: () => void
  onProductChange?: (product: ProductMode) => void
  children?: React.ReactNode
}

interface EntriesPageProps {
  activeProduct?: ProductMode
  authVariant?: 'logged-in' | 'logged-out'
  balanceCents?: number
  depositStatus?: 'deposit-pending' | 'identity-pending' | 'limits-pending'
  HeaderComponent?: ComponentType<HeaderComponentProps>
  isProfileOpen?: boolean
  onLoginClick?: () => void
  onCreateAccountClick?: () => void
  onDepositOpen?: () => void
  onIdentityOpen?: () => void
  onLimitsOpen?: () => void
  onProfileOpen?: () => void
  onProductChange?: (product: ProductMode) => void
  onLogoDoubleClick?: () => void
}

type EntriesTab = 'open' | 'won' | 'past'
type TabTransitionPhase = 'idle' | 'out' | 'in'

const entriesTabs: readonly { id: EntriesTab; label: string }[] = [
  { id: 'open', label: 'PRÓXIMAS' },
  { id: 'won', label: 'VENCEDORAS' },
  { id: 'past', label: 'ANTERIORES' },
]
const emptyLabelByTab: Record<EntriesTab, string> = {
  open: 'Você ainda não tem entradas próximas',
  won: 'Você ainda não tem entradas vencedoras',
  past: 'Você ainda não tem entradas anteriores',
}

const TAB_FADE_OUT_MS = 110
const TAB_FADE_IN_MS = 180

export function EntriesPage({
  activeProduct = 'apostas',
  authVariant,
  balanceCents,
  depositStatus,
  HeaderComponent = HeaderV2,
  isProfileOpen,
  onLoginClick,
  onCreateAccountClick,
  onDepositOpen,
  onIdentityOpen,
  onLimitsOpen,
  onProfileOpen,
  onProductChange,
  onLogoDoubleClick,
}: EntriesPageProps) {
  const [activeTab, setActiveTab] = useState<EntriesTab>('open')
  const [tabTransitionPhase, setTabTransitionPhase] = useState<TabTransitionPhase>('idle')
  const tabSwapTimerRef = useRef<number | null>(null)
  const tabSettleTimerRef = useRef<number | null>(null)

  const entradasDaAba = entriesByTab[activeTab]
  const visibleEntriesCount = entradasDaAba.length

  useEffect(() => () => {
    if (tabSwapTimerRef.current !== null) {
      window.clearTimeout(tabSwapTimerRef.current)
    }
    if (tabSettleTimerRef.current !== null) {
      window.clearTimeout(tabSettleTimerRef.current)
    }
  }, [])

  const selectTab = (nextTab: EntriesTab) => {
    if (nextTab === activeTab || tabTransitionPhase !== 'idle') return

    setTabTransitionPhase('out')
    tabSwapTimerRef.current = window.setTimeout(() => {
      tabSwapTimerRef.current = null
      setActiveTab(nextTab)
      setTabTransitionPhase('in')
      tabSettleTimerRef.current = window.setTimeout(() => {
        tabSettleTimerRef.current = null
        setTabTransitionPhase('idle')
      }, TAB_FADE_IN_MS)
    }, TAB_FADE_OUT_MS)
  }

  return (
    <div className="entries-page">
      <HeaderComponent
        activeProduct={activeProduct}
        authVariant={authVariant}
        balanceCents={balanceCents}
        depositStatus={depositStatus}
        changeProductOnPointerDown={false}
        disableProductToggle={true}
        isProfileOpen={isProfileOpen}
        onDepositOpen={onDepositOpen}
        onIdentityOpen={onIdentityOpen}
        onLimitsOpen={onLimitsOpen}
        onProfileOpen={onProfileOpen}
        onLogoDoubleClick={onLogoDoubleClick}
        onLoginClick={onLoginClick}
        onCreateAccountClick={onCreateAccountClick}
        onProductChange={onProductChange}
      >
        <ContentFilterChips
          filters={entriesTabs}
          activeFilter={activeTab}
          ariaLabel="Estados de entradas"
          className="entries-page__chips"
          onFilterChange={selectTab}
        />
      </HeaderComponent>

      <main className="open-entries" data-node-id="383:6851">
        <div className={`open-entries__list open-entries__list--transition-${tabTransitionPhase}${visibleEntriesCount === 0 ? ' open-entries__list--empty' : ''}`}>
          {visibleEntriesCount === 0 && (
            <p className="open-entries__empty">{emptyLabelByTab[activeTab]}</p>
          )}
          {entradasDaAba.map((entry) => (
            <EntryCard entry={entry} key={entry.id} />
          ))}
        </div>
      </main>
    </div>
  )
}
