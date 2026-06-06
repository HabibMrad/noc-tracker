import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "../hooks/useAuth"
import { getStats, getUsers, updateUser, deleteUser } from "../api/admin"

const ROLES = ["technician", "noc_handler", "admin"]

function StatCard({ label, value, color = "blue" }) {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300",
    green: "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300",
    purple: "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700 text-purple-700 dark:text-purple-300",
    orange: "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700 text-orange-700 dark:text-orange-300",
  }
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <p className="text-sm font-medium opacity-75">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? "—"}</p>
    </div>
  )
}

function StatsTab({ stats }) {
  const { t } = useTranslation()
  if (!stats) return <div className="py-8 text-center text-gray-400">{t("loading")}…</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label={t("total_users")} value={stats.total_users} color="blue" />
        <StatCard label={t("total_sites")} value={stats.total_sites} color="green" />
        <StatCard label={t("active_checkins")} value={stats.active_checkins} color="orange" />
        <StatCard label={t("checkins_today")} value={stats.checkins_today} color="purple" />
        <StatCard label="Technicians" value={stats.users_by_role?.technician ?? 0} color="blue" />
        <StatCard label="NOC Handlers" value={stats.users_by_role?.noc_handler ?? 0} color="green" />
        <StatCard label="Admins" value={stats.users_by_role?.admin ?? 0} color="purple" />
      </div>

      <div>
        <h3 className="font-semibold text-gray-700 dark:text-gray-200 mb-2">{t("top_sites")}</h3>
        {stats.top_active_sites.length === 0 ? (
          <p className="text-sm text-gray-400">No data yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-600 dark:text-gray-300">Site ID</th>
                  <th className="text-left px-4 py-2 text-gray-600 dark:text-gray-300">Name</th>
                  <th className="text-right px-4 py-2 text-gray-600 dark:text-gray-300">Check-ins</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {stats.top_active_sites.map((s) => (
                  <tr key={s.site_id} className="dark:bg-gray-900">
                    <td className="px-4 py-2 font-mono text-gray-700 dark:text-gray-300">{s.site_id}</td>
                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{s.name}</td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-700 dark:text-gray-300">{s.total_checkins}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function UsersTab({ currentUser }) {
  const { t } = useTranslation()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingRole, setPendingRole] = useState({})

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getUsers()
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const handleRoleChange = async (userId, newRole) => {
    setPendingRole((p) => ({ ...p, [userId]: newRole }))
    try {
      await updateUser(userId, { role: newRole })
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u))
    } catch {
      setPendingRole((p) => { const n = { ...p }; delete n[userId]; return n })
    } finally {
      setPendingRole((p) => { const n = { ...p }; delete n[userId]; return n })
    }
  }

  const handleToggleActive = async (user) => {
    const newVal = !user.is_active
    try {
      await updateUser(user.id, { is_active: newVal })
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, is_active: newVal } : u))
    } catch (e) {
      alert(e?.response?.data?.detail ?? "Error")
    }
  }

  const handleDelete = async (user) => {
    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
    try {
      await deleteUser(user.id)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (e) {
      alert(e?.response?.data?.detail ?? "Error")
    }
  }

  if (loading) return <div className="py-8 text-center text-gray-400">{t("loading")}…</div>

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {["Name", "Username", "Email", "Role", "Company", "Status", "Actions"].map((h) => (
              <th key={h} className="text-left px-3 py-2 text-gray-600 dark:text-gray-300 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {users.map((u) => {
            const isSelf = u.id === currentUser?.id
            return (
              <tr key={u.id} className={`dark:bg-gray-900 ${isSelf ? "opacity-50" : ""}`}>
                <td className="px-3 py-2 font-medium text-gray-800 dark:text-gray-200">{u.name}</td>
                <td className="px-3 py-2 font-mono text-gray-600 dark:text-gray-400">{u.username}</td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{u.email}</td>
                <td className="px-3 py-2">
                  <select
                    value={pendingRole[u.id] ?? u.role}
                    disabled={isSelf}
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 bg-white dark:bg-gray-800 dark:text-gray-200 disabled:opacity-50"
                  >
                    {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{u.company}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    u.is_active
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {u.is_active ? "Active" : t("deactivated")}
                  </span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-2">
                    <button
                      disabled={isSelf}
                      onClick={() => handleToggleActive(u)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {u.is_active ? t("deactivate") : t("activate")}
                    </button>
                    <button
                      disabled={isSelf}
                      onClick={() => handleDelete(u)}
                      className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 dark:border-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {t("delete_user")}
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function Admin() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [tab, setTab] = useState("stats")
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (tab === "stats") {
      getStats().then(setStats).catch(() => {})
    }
  }, [tab])

  const tabs = [
    { id: "stats", label: t("stats") },
    { id: "users", label: t("user_management") },
  ]

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-4">
      <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t("admin_dashboard")}</h2>

      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === tb.id
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      <div className="pt-2">
        {tab === "stats" && <StatsTab stats={stats} />}
        {tab === "users" && <UsersTab currentUser={user} />}
      </div>
    </div>
  )
}
