import { useTranslation } from "react-i18next"
import { formatDistanceToNow, differenceInMinutes } from "date-fns"
import { checkout } from "../api/checkins"
import { useAuth } from "../hooks/useAuth"
import ActivityBadge from "./ActivityBadge"

function statusColor(session) {
  const elapsed = differenceInMinutes(new Date(), new Date(session.checked_in_at))
  const expected = session.expected_duration * 60
  if (elapsed > expected) return "text-red-500"
  if (elapsed > expected * 0.8) return "text-orange-400"
  return "text-green-500"
}

function statusLabel(session, t) {
  const elapsed = differenceInMinutes(new Date(), new Date(session.checked_in_at))
  return elapsed > session.expected_duration * 60 ? t("overdue") : t("active")
}

export default function ActiveSessionsTable({ sessions, onRefresh }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const handleCheckout = async (id) => {
    await checkout(id)
    onRefresh()
  }

  if (!sessions.length) {
    return (
      <p className="text-center text-gray-400 py-8 text-sm">{t("active")}: 0</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          <tr>
            {[t("employee"), t("company"), t("site"), t("activity_type"), t("severity"),
              t("checked_in_at"), t("elapsed"), t("status"), ""].map((h, i) => (
              <th key={i} className="px-3 py-2 text-start font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          {sessions.map((s) => (
            <tr key={s.id} className="dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-3 py-2 whitespace-nowrap">{s.user.name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{s.user.company}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {s.site.name} <span className="text-gray-400">({s.site.site_id})</span>
              </td>
              <td className="px-3 py-2 whitespace-nowrap"><ActivityBadge type={s.activity_type} /></td>
              <td className="px-3 py-2 whitespace-nowrap">{s.severity}</td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatDistanceToNow(new Date(s.checked_in_at), { addSuffix: true })}
              </td>
              <td className="px-3 py-2 whitespace-nowrap">
                {formatDistanceToNow(new Date(s.checked_in_at))}
              </td>
              <td className={`px-3 py-2 whitespace-nowrap font-medium ${statusColor(s)}`}>
                {statusLabel(s, t)}
              </td>
              <td className="px-3 py-2">
                {(s.user.id === user?.id || user?.role === "noc_handler") && (
                  <button
                    onClick={() => handleCheckout(s.id)}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg"
                  >
                    {t("check_out")}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
