export const LOCATION_PERMISSION_REQUIRED_EVENT = 'location-permission:required'

export const requestLocationPermissionGate = () => {
  if (typeof window === 'undefined') return false

  const event = new CustomEvent(LOCATION_PERMISSION_REQUIRED_EVENT, {
    cancelable: true,
  })

  window.dispatchEvent(event)
  return event.defaultPrevented
}
