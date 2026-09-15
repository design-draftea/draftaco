import { useCallback, useEffect, useRef, useState } from 'react'
import '../../features/auth/LoginPage/LoginPage.css'

type VerificationCameraStatus = 'idle' | 'loading' | 'ready' | 'unavailable'

interface FacialVerificationCaptureProps {
  isFadingOut?: boolean
  onComplete: () => void
}

interface IdentityVerificationLoadingProps {
  isFadingOut?: boolean
  message?: string
}

const mobileCameraMediaQuery = '(hover: none) and (pointer: coarse)'
const cameraErrorMessageByName: Record<string, string> = {
  NotAllowedError: 'Libere a câmera nas configurações do navegador.',
  NotFoundError: 'Use um dispositivo com câmera compatível.',
  OverconstrainedError: 'Use um dispositivo com câmera compatível.',
  SecurityError: 'Abra o app em HTTPS para ativar a câmera no celular.',
}

export function FacialVerificationCapture({
  isFadingOut = false,
  onComplete,
}: FacialVerificationCaptureProps) {
  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const [cameraStatus, setCameraStatus] = useState<VerificationCameraStatus>('idle')
  const [cameraError, setCameraError] = useState<string | null>(null)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  useEffect(() => {
    const mediaQueryList = window.matchMedia(mobileCameraMediaQuery)
    const updateMobileStatus = () => {
      setIsMobile(mediaQueryList.matches || navigator.maxTouchPoints > 1)
    }

    updateMobileStatus()
    mediaQueryList.addEventListener('change', updateMobileStatus)

    return () => mediaQueryList.removeEventListener('change', updateMobileStatus)
  }, [])

  useEffect(() => {
    let isActive = true

    stopCamera()

    if (!isMobile) {
      setCameraStatus('idle')
      setCameraError(null)
      return () => {
        isActive = false
      }
    }

    setCameraStatus('loading')
    setCameraError(null)

    if (!window.isSecureContext) {
      setCameraStatus('unavailable')
      setCameraError('Abra o app em HTTPS para ativar a câmera no celular.')
      return () => {
        isActive = false
      }
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable')
      setCameraError('Use um navegador ou dispositivo com câmera.')
      return () => {
        isActive = false
      }
    }

    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: 'user' },
      },
    })
      .then((stream) => {
        if (!isActive) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }

        setCameraStatus('ready')
        setCameraError(null)
      })
      .catch((error: unknown) => {
        if (!isActive) return

        const errorName = error instanceof DOMException ? error.name : ''
        setCameraStatus('unavailable')
        setCameraError(
          cameraErrorMessageByName[errorName]
          ?? 'Confira a permissão da câmera no celular.',
        )
      })

    return () => {
      isActive = false
      stopCamera()
    }
  }, [isMobile, stopCamera])

  const isCaptureButtonDisabled = !isMobile || isFadingOut || cameraStatus !== 'ready'
  const shouldShowCaptureAction = isMobile && cameraStatus === 'ready'
  const shouldShowSkipVerification = !isMobile
    || (cameraStatus === 'unavailable' && cameraError !== null)
  const cameraStatusLabel = cameraStatus === 'loading'
    ? 'Carregando câmera...'
    : cameraError ?? 'A câmera será exibida no celular.'

  const handleComplete = () => {
    if (isFadingOut) return
    if (isMobile && cameraStatus !== 'ready' && !shouldShowSkipVerification) return

    onComplete()
  }

  return (
    <section
      className="login-page__verification login-page__verification--capture login-page__verification--capture-face"
      aria-labelledby="facial-verification-title"
    >
      <div
        className={[
          'login-page__verification-step',
          isFadingOut ? 'login-page__verification-step--fading' : '',
        ].filter(Boolean).join(' ')}
      >
        <div className="login-page__verification-body login-page__verification-body--capture">
          <p className="login-page__capture-eyebrow">Centralize seu rosto na moldura</p>

          <button
            type="button"
            className="login-page__capture-card login-page__capture-card--face"
            disabled={isCaptureButtonDisabled}
            aria-label="Validar rosto"
            onClick={handleComplete}
          >
            {isMobile ? (
              <video
                ref={videoRef}
                className="login-page__capture-video login-page__capture-video--mirrored"
                autoPlay
                muted
                playsInline
              />
            ) : null}

            {isMobile && cameraStatus === 'ready' ? null : (
              <span className="login-page__capture-status">
                {cameraStatus === 'loading' ? (
                  <span className="login-page__capture-status-spinner" aria-hidden="true" />
                ) : null}
                <span>{cameraStatusLabel}</span>
              </span>
            )}

            <span
              className="login-page__capture-target login-page__capture-target--face"
              aria-hidden="true"
            />
          </button>

          <div className="login-page__verification-copy">
            <h1 className="login-page__verification-title" id="facial-verification-title">
              Verificação facial
            </h1>
          </div>
        </div>

        {shouldShowCaptureAction || shouldShowSkipVerification ? (
          <div className="login-page__verification-footer login-page__verification-footer--capture">
            {shouldShowCaptureAction ? (
              <button
                type="button"
                className="login-page__submit login-page__submit--active"
                disabled={isFadingOut}
                onClick={handleComplete}
              >
                Capturar foto
              </button>
            ) : (
              <button
                type="button"
                className="login-page__skip-verification"
                disabled={isFadingOut}
                onClick={handleComplete}
              >
                Pular verificação
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  )
}

export function IdentityVerificationLoading({
  isFadingOut = false,
  message = 'Validando identidade',
}: IdentityVerificationLoadingProps) {
  return (
    <section
      className={[
        'login-page__verification',
        'login-page__verification--loading',
        isFadingOut ? 'login-page__verification-step--fading' : '',
      ].filter(Boolean).join(' ')}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="login-page__verification-loading">
        <span className="login-page__verification-loading-spinner" aria-hidden="true" />
        <span className="login-page__sr-only">{message}</span>
      </div>
    </section>
  )
}
