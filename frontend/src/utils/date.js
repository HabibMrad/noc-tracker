// Parse an ISO string from the API (which is UTC) into a JS Date
export function utcDate(isoString) {
  if (!isoString) return null
  const s = isoString.endsWith("Z") ? isoString : isoString + "Z"
  return new Date(s)
}
