import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { useAuth } from "../hooks/useAuth"
import { useGeolocation } from "../hooks/useGeolocation"
import { listSites } from "../api/sites"
import { createCheckin, listCheckins, checkout } from "../api/checkins"

const schema = z.object({
  site_id: z.number({ required_error: "Select a site" }),
  activity_type: z.string().min(1, "Required"),
  severity: z.string().min(1, "Required"),
  affected_sites: z.array(z.string()).default([]),
  expected_duration: z.coerce.number().min(0.5, "Min 0.5h"),
  is_planned_outage: z.boolean().default(false),
  is_routine_maintenance: z.boolean().default(false),
  notes: z.string().optional(),
})

const ACTIVITY_TYPES = ["Maintenance", "Emergency", "Inspection", "Installation", "Other"]
const SEVERITIES = ["Low", "Medium", "High", "Critical"]

export default function CheckIn() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { detect, loading: gpsLoading, nearest } = useGeolocation()
  const [allSites, setAllSites] = useState([])
  const [siteSearch, setSiteSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)
  const [myActiveSession, setMyActiveSession] = useState(null)
  const [success, setSuccess] = useState("")

  const {
    register, handleSubmit, setValue, control, reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { affected_sites: [], is_planned_outage: false, is_routine_maintenance: false },
  })

  const loadData = async () => {
    const [sites, sessions] = await Promise.all([listSites(), listCheckins({ status: "active" })])
    setAllSites(sites)
    const mine = sessions.find((s) => s.user.id === user?.id)
    setMyActiveSession(mine || null)
  }

  useEffect(() => { loadData() }, [user])

  const filteredSites = nearest.length > 0
    ? nearest
    : allSites.filter(
        (s) =>
          s.name.toLowerCase().includes(siteSearch.toLowerCase()) ||
          s.site_id.toLowerCase().includes(siteSearch.toLowerCase())
      )

  const selectSite = (site) => {
    setValue("site_id", site.id, { shouldValidate: true })
    setSiteSearch(site.name)
    setShowDropdown(false)
  }

  const onSubmit = async (data) => {
    await createCheckin(data)
    setSuccess("✅ Checked in successfully")
    reset()
    setSiteSearch("")
    await loadData()
    setTimeout(() => setSuccess(""), 4000)
  }

  const handleCheckout = async () => {
    if (!myActiveSession) return
    await checkout(myActiveSession.id)
    setMyActiveSession(null)
    setSuccess("✅ Checked out successfully")
    setTimeout(() => setSuccess(""), 4000)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold dark:text-white mb-4">{t("check_in")}</h2>

      {myActiveSession && (
        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium dark:text-orange-200">
            🔧 {t("active")}: {myActiveSession.site.name} ({myActiveSession.site.site_id})
          </p>
          <button
            onClick={handleCheckout}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            {t("check_out")}
          </button>
        </div>
      )}

      {success && <p className="text-green-600 dark:text-green-400 text-sm mb-3">{success}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">

        {/* Site search */}
        <div className="relative">
          <label className="block text-sm mb-1 dark:text-gray-300">{t("site")}</label>
          <div className="flex gap-2">
            <input
              value={siteSearch}
              onChange={(e) => { setSiteSearch(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              placeholder={t("search_site")}
              className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => { detect(); setShowDropdown(true) }}
              disabled={gpsLoading}
              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg whitespace-nowrap"
            >
              {gpsLoading ? "…" : "📍 " + t("detect_nearest")}
            </button>
          </div>
          {showDropdown && (siteSearch || nearest.length > 0) && filteredSites.length > 0 && (
            <ul className="absolute z-10 w-full border rounded-lg mt-1 max-h-48 overflow-y-auto bg-white dark:bg-gray-800 dark:border-gray-700 shadow-lg">
              {filteredSites.slice(0, 8).map((s) => (
                <li
                  key={s.id ?? s.site_id}
                  onMouseDown={() => selectSite(s)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 dark:text-gray-200"
                >
                  {s.name} <span className="text-gray-400">({s.site_id})</span>
                  {"distance_km" in s && (
                    <span className="text-xs text-blue-500 ms-2">{s.distance_km.toFixed(1)} km</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {errors.site_id && <p className="text-red-500 text-xs mt-1">{String(errors.site_id.message)}</p>}
        </div>

        {/* Activity type */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("activity_type")}</label>
          <select
            {...register("activity_type")}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">—</option>
            {ACTIVITY_TYPES.map((a) => (
              <option key={a} value={a}>{t(a.toLowerCase())}</option>
            ))}
          </select>
          {errors.activity_type && <p className="text-red-500 text-xs mt-1">{errors.activity_type.message}</p>}
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("severity")}</label>
          <select
            {...register("severity")}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">—</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>{t(s.toLowerCase())}</option>
            ))}
          </select>
          {errors.severity && <p className="text-red-500 text-xs mt-1">{errors.severity.message}</p>}
        </div>

        {/* Affected sites */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("affected_sites")}</label>
          <Controller
            name="affected_sites"
            control={control}
            render={({ field }) => (
              <select
                multiple
                value={field.value}
                onChange={(e) =>
                  field.onChange(Array.from(e.target.selectedOptions, (o) => o.value))
                }
                className="w-full border rounded-lg px-3 py-2 text-sm h-28 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                {allSites.map((s) => (
                  <option key={s.site_id} value={s.site_id}>
                    {s.name} ({s.site_id})
                  </option>
                ))}
              </select>
            )}
          />
        </div>

        {/* Expected duration */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("expected_duration")}</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            {...register("expected_duration")}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.expected_duration && (
            <p className="text-red-500 text-xs mt-1">{errors.expected_duration.message}</p>
          )}
        </div>

        {/* Toggles */}
        {[
          ["is_planned_outage", "planned_outage"],
          ["is_routine_maintenance", "routine_maintenance"],
        ].map(([fieldName, labelKey]) => (
          <label key={fieldName} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register(fieldName)}
              className="w-4 h-4 rounded accent-blue-600"
            />
            <span className="text-sm dark:text-gray-300">{t(labelKey)}</span>
          </label>
        ))}

        {/* Notes */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("notes")}</label>
          <textarea
            {...register("notes")}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !!myActiveSession}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 transition"
        >
          {isSubmitting ? "…" : t("submit")}
        </button>
        {myActiveSession && (
          <p className="text-xs text-center text-orange-500">
            {t("active")} — {t("check_out")} first
          </p>
        )}
      </form>
    </div>
  )
}
