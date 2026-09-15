import { useCallback, useEffect, useState } from 'react'
import locationAndroidImage from '../../assets/imgAndroid.png'
import locationIOSImage from '../../assets/imgiOS.png'
import { LOCATION_PERMISSION_REQUIRED_EVENT } from '../../shared/utils/locationPermissionGate'
import './LocationPermissionGate.css'

interface LocationPermissionGateProps {
  isEnabled: boolean
}

const locationRequestOptions: PositionOptions = {
  enableHighAccuracy: false,
  maximumAge: 5 * 60 * 1000,
  timeout: 5000,
}

let hasRequestedLocationPermission = false

const getGeolocationPermissionStatus = async () => {
  if (!navigator.permissions?.query) return null

  try {
    return await navigator.permissions.query({ name: 'geolocation' as PermissionName })
  } catch {
    return null
  }
}

const getLocationInstructionsImage = () => {
  const isIOSDevice = (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )

  return isIOSDevice ? locationIOSImage : locationAndroidImage
}

export function LocationPermissionGate({ isEnabled }: LocationPermissionGateProps) {
  const [isPermissionDenied, setIsPermissionDenied] = useState(false)
  const [isLocationFallbackEnabled, setIsLocationFallbackEnabled] = useState(false)
  const locationInstructionsImage = getLocationInstructionsImage()

  const requestBrowserLocationPermission = useCallback(() => {
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      () => {
        setIsPermissionDenied(false)
      },
      (error) => {
        if (error.code === 1) {
          setIsPermissionDenied(true)
        }
      },
      locationRequestOptions
    )
  }, [])

  useEffect(() => {
    if (!isEnabled) return
    if (!window.isSecureContext) return
    if (!navigator.geolocation) return

    let isCurrent = true
    let permissionStatus: PermissionStatus | null = null

    const syncPermissionState = () => {
      if (!permissionStatus) return

      const isDenied = permissionStatus.state === 'denied'
      setIsPermissionDenied(isDenied)
    }

    const requestLocation = async () => {
      permissionStatus = await getGeolocationPermissionStatus()

      if (!isCurrent) return

      permissionStatus?.addEventListener('change', syncPermissionState)

      if (permissionStatus?.state === 'denied') {
        syncPermissionState()
        return
      }

      if (hasRequestedLocationPermission) return
      if (permissionStatus && permissionStatus.state !== 'prompt') return

      hasRequestedLocationPermission = true
      requestBrowserLocationPermission()
    }

    void requestLocation()

    return () => {
      isCurrent = false
      permissionStatus?.removeEventListener('change', syncPermissionState)
    }
  }, [isEnabled, requestBrowserLocationPermission])

  useEffect(() => {
    if (!isEnabled || !isPermissionDenied || isLocationFallbackEnabled) return

    const handleLocationPermissionRequired = (event: Event) => {
      event.preventDefault()
    }

    window.addEventListener(LOCATION_PERMISSION_REQUIRED_EVENT, handleLocationPermissionRequired)
    return () => window.removeEventListener(LOCATION_PERMISSION_REQUIRED_EVENT, handleLocationPermissionRequired)
  }, [isEnabled, isLocationFallbackEnabled, isPermissionDenied])

  if (!isEnabled || !isPermissionDenied || isLocationFallbackEnabled) return null

  return (
    <section className="location-permission-gate" aria-labelledby="location-permission-title">
      <div className="location-permission-gate__body">
        <div className="location-permission-gate__content">
          <div className="location-permission-gate__visual" aria-hidden="true">
            <img src={locationInstructionsImage} alt="" />
          </div>

          <div className="location-permission-gate__copy">
            <h1 id="location-permission-title">
              Para jogar, precisamos que você ative suas permissões de localização
            </h1>
            <p>No seu dispositivo, você deve acessar:</p>
          </div>

          <div className="location-permission-gate__steps-wrapper">
            <ol className="location-permission-gate__steps">
              <li>
                <span className="location-permission-gate__step-number">1</span>
                <span>Configurações →Aplicativos</span>
              </li>
              <li>
                <span className="location-permission-gate__step-number">2</span>
                <span>Pitaco → Permissões</span>
              </li>
              <li>
                <span className="location-permission-gate__step-number">3</span>
                <span>Localização → Permitir</span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      <footer className="location-permission-gate__footer">
        <button
          className="location-permission-gate__settings-button"
          type="button"
          onClick={requestBrowserLocationPermission}
        >
          Ir para configurações
        </button>
        <button
          className="location-permission-gate__fallback-button"
          type="button"
          onClick={() => setIsLocationFallbackEnabled(true)}
        >
          Ativar localização
        </button>
      </footer>
    </section>
  )
}
