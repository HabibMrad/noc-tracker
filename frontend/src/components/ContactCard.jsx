import { useTranslation } from "react-i18next"

export default function ContactCard({ contact }) {
  const { t } = useTranslation()
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold dark:text-white">{contact.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{contact.role}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          contact.company === "Touch"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        }`}>
          {contact.company}
        </span>
      </div>
      <a
        href={`tel:${contact.phone}`}
        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        📞 {contact.phone}
      </a>
      {contact.email && (
        <a
          href={`mailto:${contact.email}`}
          className="text-xs text-gray-500 hover:underline dark:text-gray-400"
        >
          {contact.email}
        </a>
      )}
      {contact.shift && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("shift")}: {contact.shift}
        </p>
      )}
    </div>
  )
}
