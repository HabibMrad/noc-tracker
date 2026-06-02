import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { listSites } from "../api/sites"
import { listCheckins } from "../api/checkins"
import SiteMap from "../components/SiteMap"
import ActiveSessionsTable from "../components/ActiveSessionsTable"
import { useWebSocket } from "../hooks/useWebSocket"

export default function Dashboard() {
  const { t } = useTranslation()
  const [sites, setSites] = useState([])
  const [activeSessions, setActiveSessions] = useState([])

  const refresh = useCallback(async () => {
    const [s, sessions] = await Promise.all([
      listSites(),
      listCheckins({ status: "active", limit: 100 }),
    ])
    setSites(s)
    setActiveSessions(sessions)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

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
      <h3 className="font-semibold dark:text-white">{t("active_sessions")}</h3>
      <ActiveSessionsTable sessions={activeSessions} onRefresh={refresh} />
    </div>
  )
}
