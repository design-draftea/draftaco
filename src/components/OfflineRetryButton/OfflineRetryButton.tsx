import { brandPath } from '../../shared/brand/routing'
import { useState } from 'react'
import './OfflineRetryButton.css'

type ConnectionRetryState = 'idle' | 'checking' | 'failed'

const CONNECTION_RETRY_MINIMUM_MS = 3000

const wait = (durationMs: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, durationMs)
})

/** Shared recovery action for the offline game experiences. */
export function OfflineRetryButton() {
  const [connectionRetryState, setConnectionRetryState] = useState<ConnectionRetryState>('idle')

  const handleConnectionRetry = async () => {
    if (connectionRetryState === 'checking') return

    setConnectionRetryState('checking')

    const baseUrl = import.meta.env.BASE_URL || '/'
    const [response] = await Promise.all([
      fetch(baseUrl, { cache: 'no-store' }).catch(() => null),
      wait(CONNECTION_RETRY_MINIMUM_MS),
    ])

    if (!response?.ok) {
      setConnectionRetryState('failed')
      return
    }

    window.location.assign(brandPath('apostas'))
  }

  return (
    <div className="offline-retry">
      <button
        className={`offline-retry__button${connectionRetryState === 'checking' ? ' offline-retry__button--loading' : ''}`}
        type="button"
        disabled={connectionRetryState === 'checking'}
        aria-busy={connectionRetryState === 'checking'}
        aria-label={connectionRetryState === 'checking' ? 'Verificando conexão' : 'Tentar novamente'}
        onClick={handleConnectionRetry}
      >
        {connectionRetryState === 'checking' ? (
          <span className="offline-retry__spinner" aria-hidden="true" />
        ) : (
          <span>Tentar novamente</span>
        )}
      </button>

      {connectionRetryState === 'failed' && (
        <span className="offline-retry__status" role="status" aria-live="polite">
          Ainda estamos sem conexão.
        </span>
      )}
    </div>
  )
}
