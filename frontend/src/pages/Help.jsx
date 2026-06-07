import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "../hooks/useAuth"
import { listContacts, createContact, deleteContact } from "../api/contacts"
import ContactCard from "../components/ContactCard"

const EMPTY_FORM = { name: "", phone: "", email: "", role: "", company: "", shift: "" }

function AddContactModal({ onSave, onClose }) {
  const { t } = useTranslation()
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.role || !form.company) {
      setError("Name, phone, role, and company are required.")
      return
    }
    setSaving(true)
    setError("")
    try {
      const contact = await createContact({
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        role: form.role,
        company: form.company,
        shift: form.shift || null,
      })
      onSave(contact)
    } catch (err) {
      setError(err?.response?.data?.detail ?? "Error saving contact")
    } finally {
      setSaving(false)
    }
  }

  const field = (label, key, type = "text", required = false) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
        {label}{required && <span className="text-red-500 ms-0.5">*</span>}
      </label>
      <input
        type={type}
        value={form[key]}
        onChange={set(key)}
        className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold dark:text-white mb-4">{t("add_contact")}</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          {field("Name", "name", "text", true)}
          {field("Phone", "phone", "tel", true)}
          {field("Email", "email", "email")}
          {field("Role", "role", "text", true)}
          {field("Company", "company", "text", true)}
          {field("Shift", "shift")}
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-blue-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : t("add_contact")}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-sm py-2 rounded-lg dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              {t("cancel")}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Help() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [contacts, setContacts] = useState([])
  const [filter, setFilter] = useState("")
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState("")

  useEffect(() => { listContacts().then(setContacts) }, [])

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(""), 3000)
  }

  const handleSave = (newContact) => {
    setContacts((prev) => [...prev, newContact].sort((a, b) => a.name.localeCompare(b.name)))
    setShowAdd(false)
    showToast(t("contact_added"))
  }

  const handleDelete = async (contact) => {
    if (!window.confirm(`Delete "${contact.name}"?`)) return
    try {
      await deleteContact(contact.id)
      setContacts((prev) => prev.filter((c) => c.id !== contact.id))
      showToast(t("contact_deleted"))
    } catch (err) {
      alert(err?.response?.data?.detail ?? "Error deleting contact")
    }
  }

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.role.toLowerCase().includes(filter.toLowerCase()) ||
      c.company.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold dark:text-white">{t("help")}</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="text-sm px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            + {t("add_contact")}
          </button>
        )}
      </div>

      <input
        placeholder="Search by name, role, company…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-4 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div key={c.id} className="relative">
            <ContactCard contact={c} />
            {isAdmin && (
              <button
                onClick={() => handleDelete(c)}
                className="absolute top-2 end-2 text-xs px-2 py-0.5 rounded border border-red-300 text-red-500 dark:border-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 bg-white dark:bg-gray-900"
              >
                {t("delete_contact")}
              </button>
            )}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm col-span-full text-center py-8">No contacts found</p>
        )}
      </div>

      {showAdd && <AddContactModal onSave={handleSave} onClose={() => setShowAdd(false)} />}

      {toast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  )
}
