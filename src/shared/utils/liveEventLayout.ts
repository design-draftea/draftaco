const slugifyLayoutPart = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function getLiveEventLayoutId(leagueName: string, eventId: string | number) {
  return `live-event-${slugifyLayoutPart(leagueName)}-${slugifyLayoutPart(String(eventId))}`
}
