import { useState, useEffect, useCallback, useRef } from "react"
import { useTranslation } from "react-i18next"
import { listSites } from "../api/sites"
import { listCheckins } from "../api/checkins"
import SiteMap from "../components/SiteMap"
import ActiveSessionsTable from "../components/ActiveSessionsTable"
import ActivityLegend from "../components/ActivityLegend"
import { useWebSocket } from "../hooks/useWebSocket"

const AUTO_REFRESH_INTERVAL = 30 // seconds

export default function Dashboard() {
  const { t } = useTranslation()
  const [sites, setSites] = useState([])
  const [activeSessions, setActiveSessions] = useState([])
  const [secondsSince, setSecondsSince] = useState(0)
  const lastRefreshRef = useRef(Date.now())

  const refresh = useCallback(async () => {
    const [s, sessions] = await Promise.all([
      listSites(),
      listCheckins({ status: "active", limit: 100 }),
    ])
    setSites(s)
    setActiveSessions(sessions)
    lastRefreshRef.current = Date.now()
    setSecondsSince(0)
  }, [])

  // Initial load
  useEffect(() => {
    refresh()
  }, [refresh])

  // Auto-refresh every 30 s
  useEffect(() => {
    const id = setInterval(refresh, AUTO_REFRESH_INTERVAL * 1000)
    return () => clearInterval(id)
  }, [refresh])

  // "Last updated X s ago" ticker — updates every second
  useEffect(() => {
    const id = setInterval(() => {
      setSecondsSince(Math.floor((Date.now() - lastRefreshRef.current) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [])

  // WebSocket push also triggers refresh
  useWebSocket(() => refresh())

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <h2 className="text-lg font-bold dark:text-white">
        {t("dashboard")}
        <span className="ms-2 text-sm font-normal text-gray-400">
          {t("active")}: {activeSessions.length}
        </span>
      </h2>

      <SiteMap sites={sites} activeSessions={activeSessions} />
      <ActivityLegend />

      <div className="flex items-center justify-between">
        <h3 className="font-semibold dark:text-white">{t("active_sessions")}</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">
            Updated {secondsSince}s ago
          </span>
          <button
            onClick={refresh}
            title="Refresh"
            className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors text-base leading-none"
          >
            🔄
          </button>
        </div>
      </div>

      <ActiveSessionsTable sessions={activeSessions} onRefresh={refresh} />
    </div>
  )
}
