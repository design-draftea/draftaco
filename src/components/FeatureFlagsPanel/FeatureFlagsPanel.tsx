import { BottomSheet } from '../BottomSheet'
import { useFeatureFlags } from '../../shared/hooks/useFeatureFlags'
import './FeatureFlagsPanel.css'

interface FeatureFlagsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function FeatureFlagsPanel({ isOpen, onClose }: FeatureFlagsPanelProps) {
  const {
    brandMode,
    brandModeDefinitions,
    definitions,
    flags,
    setBrandMode,
    setFeatureFlag,
  } = useFeatureFlags()
  const nextBrandMode = brandMode === 'draftea' ? 'pitaco' : 'draftea'
  const nextBrandLabel = brandModeDefinitions.find((definition) => definition.id === nextBrandMode)?.label ?? nextBrandMode
  const visibleDefinitions = definitions.filter((definition) => definition.visibleInPanel !== false)

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Feature flags"
      sheetClassName="feature-flags-sheet"
      bodyClassName="feature-flags-sheet__body"
      hideScrollIndicator={true}
    >
      <div className="feature-flags-sheet__product">
        <div className="feature-flags-sheet__content">
          <span className="feature-flags-sheet__item-title">Produto</span>
          <span className="feature-flags-sheet__item-description">
            Escolha a experiência carregada no protótipo.
          </span>
        </div>

        <button
          type="button"
          className={[
            'feature-flags-sheet__brand-toggle',
            `feature-flags-sheet__brand-toggle--${brandMode}`,
          ]
            .filter(Boolean)
            .join(' ')}
          aria-label={`Alternar para ${nextBrandLabel}`}
          aria-pressed={brandMode === 'pitaco'}
          data-brand-localization-skip="true"
          onClick={() => setBrandMode(nextBrandMode)}
        >
          <span className="feature-flags-sheet__brand-toggle-indicator" aria-hidden="true" />
          {brandModeDefinitions.map((definition) => (
            <span
              className={[
                'feature-flags-sheet__brand-toggle-option',
                brandMode === definition.id ? 'feature-flags-sheet__brand-toggle-option--active' : '',
              ]
              .filter(Boolean)
              .join(' ')}
              key={definition.id}
            >
              {definition.label}
            </span>
          ))}
        </button>
      </div>

      {visibleDefinitions.length > 0 ? (
        <div className="feature-flags-sheet__list">
          {visibleDefinitions.map((definition) => {
            const isEnabled = flags[definition.id]

            return (
              <div className="feature-flags-sheet__item" key={definition.id}>
                <div className="feature-flags-sheet__content">
                  <span className="feature-flags-sheet__item-title">{definition.title}</span>
                  <span className="feature-flags-sheet__item-description">{definition.description}</span>
                </div>

                <button
                  type="button"
                  className={[
                    'betslip-page__credit-toggle',
                    isEnabled ? 'betslip-page__credit-toggle--active' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="switch"
                  aria-checked={isEnabled}
                  aria-label={`${isEnabled ? 'Desativar' : 'Ativar'} ${definition.title}`}
                  onClick={() => setFeatureFlag(definition.id, !isEnabled)}
                >
                  <span aria-hidden="true" />
                </button>
              </div>
            )
          })}
        </div>
      ) : null}
    </BottomSheet>
  )
}
