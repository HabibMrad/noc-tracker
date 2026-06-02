import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { listContacts } from "../api/contacts"
import ContactCard from "../components/ContactCard"

export default function Help() {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState([])
  const [filter, setFilter] = useState("")

  useEffect(() => { listContacts().then(setContacts) }, [])

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.role.toLowerCase().includes(filter.toLowerCase()) ||
      c.company.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-lg font-bold dark:text-white mb-4">{t("help")}</h2>
      <input
        placeholder="Search by name, role, company…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-4 dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((c) => <ContactCard key={c.id} contact={c} />)}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-sm col-span-full text-center py-8">No contacts found</p>
        )}
      </div>
    </div>
  )
}
