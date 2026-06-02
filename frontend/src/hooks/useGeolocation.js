import { useState, useCallback } from "react"
import { nearestSites } from "../api/sites"

export function useGeolocation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [nearest, setNearest] = useState([])

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported")
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const sites = await nearestSites(coords.latitude, coords.longitude, 5)
          setNearest(sites)
        } catch {
          setError("Failed to fetch nearest sites")
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError("Location access denied")
        setLoading(false)
      }
    )
  }, [])

  return { detect, loading, error, nearest }
}
