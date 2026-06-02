import { useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"

export default function NotificationDropdown({ notifications, unreadCount, onMarkAllRead, onClose }) {
  const { t } = useTranslation()
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <span className="font-semibold text-sm dark:text-white">{t("notifications")}</span>
        <button onClick={onMarkAllRead} className="text-xs text-blue-500 hover:underline">
          {t("mark_all_read")}
        </button>
      </div>
      <ul className="max-h-72 overflow-y-auto divide-y dark:divide-gray-700">
        {notifications.length === 0 ? (
          <li className="px-4 py-4 text-sm text-gray-400 text-center">{t("no_notifications")}</li>
        ) : (
          notifications.map((n) => (
            <li key={n.id} className={`px-4 py-3 text-sm ${n.is_read ? "opacity-60" : "font-medium"} dark:text-gray-200`}>
              <p>{n.message}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
