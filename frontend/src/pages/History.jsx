import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { utcDate } from "../utils/date"
import { listCheckins, exportCSV } from "../api/checkins"
import { listSites } from "../api/sites"
import PhotoGallery from "../components/PhotoGallery"
import ActivityBadge from "../components/ActivityBadge"

const ACTIVITY_TYPES = ["Maintenance", "Emergency", "Inspection", "Installation", "Other"]
const SEVERITIES = ["Low", "Medium", "High", "Critical"]

export default function History() {
  const { t } = useTranslation()
  const [records, setRecords] = useState([])
  const [sites, setSites] = useState([])
  const [filters, setFilters] = useState({
    status: "", employee: "", site_id: "", region: "",
    activity_type: "", severity: "", company: "",
    is_planned_outage: "", is_routine_maintenance: "",
    date_from: "", date_to: "",
  })
  const [page, setPage] = useState(0)
  const [expandedRows, setExpandedRows] = useState(new Set())

  useEffect(() => { listSites().then(setSites) }, [])

  useEffect(() => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""))
    params.skip = page * 50
    params.limit = 50
    listCheckins(params).then(setRecords)
  }, [filters, page])

  const setFilter = (key, val) => {
    setFilters((f) => ({ ...f, [key]: val }))
    setPage(0)
  }

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleExport = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""))
    const blob = await exportCSV(params)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "checkins.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const selectClass = "border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
  const inputClass = selectClass

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold dark:text-white">{t("history")}</h2>
        <button
          onClick={handleExport}
          className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg"
        >
          {t("export_csv")}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <input
          placeholder={t("employee")} value={filters.employee}
          onChange={(e) => setFilter("employee", e.target.value)}
          className={inputClass}
        />
        <select value={filters.site_id} onChange={(e) => setFilter("site_id", e.target.value)} className={selectClass}>
          <option value="">{t("site")}</option>
          {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.name}</option>)}
        </select>
        <select value={filters.activity_type} onChange={(e) => setFilter("activity_type", e.target.value)} className={selectClass}>
          <option value="">{t("activity_type")}</option>
          {ACTIVITY_TYPES.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filters.severity} onChange={(e) => setFilter("severity", e.target.value)} className={selectClass}>
          <option value="">{t("severity")}</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)} className={selectClass}>
          <option value="">{t("status")}</option>
          <option value="active">{t("active")}</option>
          <option value="completed">{t("completed")}</option>
        </select>
        <select value={filters.company} onChange={(e) => setFilter("company", e.target.value)} className={selectClass}>
          <option value="">{t("company")}</option>
          <option value="Touch">{t("touch")}</option>
          <option value="subcontractor">{t("subcontractor")}</option>
        </select>
        <input
          type="date" value={filters.date_from}
          onChange={(e) => setFilter("date_from", e.target.value)}
          className={inputClass}
        />
        <input
          type="date" value={filters.date_to}
          onChange={(e) => setFilter("date_to", e.target.value)}
          className={inputClass}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>
              {[t("employee"), t("company"), t("site"), t("activity_type"), t("severity"),
                t("checked_in_at"), t("checked_out_at"), t("status")].map((h) => (
                <th key={h} className="px-3 py-2 text-start font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {records.flatMap((r) => [
              <tr
                key={r.id}
                onClick={() => toggleRow(r.id)}
                className="dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer select-none"
              >
                <td className="px-3 py-2 whitespace-nowrap">{r.user.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.user.company}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.site.name}</td>
                <td className="px-3 py-2 whitespace-nowrap"><ActivityBadge type={r.activity_type} /></td>
                <td className="px-3 py-2 whitespace-nowrap">{r.severity}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.checked_in_at ? format(utcDate(r.checked_in_at), "dd/MM/yy HH:mm") : "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.checked_out_at ? format(utcDate(r.checked_out_at), "dd/MM/yy HH:mm") : "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.checked_out_at
                        ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                        : "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
                    }`}>
                      {r.checked_out_at ? t("completed") : t("active")}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {expandedRows.has(r.id) ? "▲" : "📷"}
                    </span>
                  </div>
                </td>
              </tr>,
              expandedRows.has(r.id) && (
                <tr key={`${r.id}-photos`} className="bg-gray-50 dark:bg-gray-800/30">
                  <td colSpan={8} className="px-4 py-3">
                    <PhotoGallery checkinId={r.id} />
                  </td>
                </tr>
              ),
            ].filter(Boolean))}
          </tbody>
        </table>
        {records.length === 0 && (
          <p className="text-center py-8 text-gray-400 text-sm">No records found</p>
        )}
      </div>

      <div className="flex gap-3 justify-center mt-4 items-center">
        <button
          disabled={page === 0}
          onClick={() => setPage((p) => p - 1)}
          className="text-sm px-3 py-1 border rounded disabled:opacity-40 dark:border-gray-600 dark:text-white"
        >←</button>
        <span className="text-sm dark:text-gray-400">Page {page + 1}</span>
        <button
          disabled={records.length < 50}
          onClick={() => setPage((p) => p + 1)}
          className="text-sm px-3 py-1 border rounded disabled:opacity-40 dark:border-gray-600 dark:text-white"
        >→</button>
      </div>
    </div>
  )
}
