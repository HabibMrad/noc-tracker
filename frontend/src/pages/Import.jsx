import { useState } from "react"
import { useTranslation } from "react-i18next"
import { previewSites, confirmSites, previewEmployees, confirmEmployees } from "../api/imports"
import ImportPreviewTable from "../components/ImportPreviewTable"

function ImportSection({ title, onPreview, onConfirm }) {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mode, setMode] = useState("skip")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    setError("")
    try {
      const p = await onPreview(file)
      setPreview(p)
      setResult(null)
    } catch (err) {
      setError(err.response?.data?.detail || "Preview failed")
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!file) return
    setLoading(true)
    setError("")
    try {
      const r = await onConfirm(file, mode)
      setResult(r)
      setPreview(null)
      setFile(null)
    } catch (err) {
      setError(err.response?.data?.detail || "Import failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 space-y-4">
      <h3 className="font-semibold dark:text-white text-sm">{title}</h3>

      <div className="flex gap-3 items-center flex-wrap">
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => {
            setFile(e.target.files?.[0] || null)
            setPreview(null)
            setResult(null)
            setError("")
          }}
          className="text-sm dark:text-gray-300"
        />
        <button
          onClick={handlePreview}
          disabled={!file || loading}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? "…" : t("preview")}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <ImportPreviewTable preview={preview} />

      {preview && (
        <div className="flex gap-4 items-center flex-wrap">
          <label className="text-sm dark:text-gray-300 flex items-center gap-2 cursor-pointer">
            <input type="radio" value="skip" checked={mode === "skip"} onChange={() => setMode("skip")} />
            {t("skip_existing")}
          </label>
          <label className="text-sm dark:text-gray-300 flex items-center gap-2 cursor-pointer">
            <input type="radio" value="update" checked={mode === "update"} onChange={() => setMode("update")} />
            {t("update_existing")}
          </label>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {loading ? "…" : t("confirm_import")}
          </button>
        </div>
      )}

      {result && (
        <p className="text-sm text-green-600 dark:text-green-400">
          ✅ Inserted: {result.inserted} · Updated: {result.updated} · Skipped: {result.skipped}
        </p>
      )}
    </div>
  )
}

export default function Import() {
  const { t } = useTranslation()
  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <h2 className="text-lg font-bold dark:text-white">{t("import")}</h2>
      <ImportSection
        title="Sites Excel — columns: site_id, name, region, latitude, longitude"
        onPreview={previewSites}
        onConfirm={confirmSites}
      />
      <ImportSection
        title="Employees Excel — columns: name, role, phone, email, company"
        onPreview={previewEmployees}
        onConfirm={confirmEmployees}
      />
    </div>
  )
}
