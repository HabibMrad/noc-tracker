import { useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { format, formatDistanceToNow } from "date-fns"

export default function NotificationDropdown({ notifications, onMarkAllRead, onClose }) {
  const { t } = useTranslation()
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("touchstart", handler)
    }
  }, [onClose])

  return (
    <div
      ref={ref}
      style={{ position: "fixed", top: "60px", right: "16px", left: "16px", zIndex: 9999, maxHeight: "60vh", overflowY: "auto" }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
        <span className="font-semibold text-sm dark:text-white">{t("notifications")}</span>
        <button onClick={onMarkAllRead} className="text-xs text-blue-500 hover:underline">
          {t("mark_all_read")}
        </button>
      </div>
      <ul className="divide-y dark:divide-gray-700">
        {notifications.length === 0 ? (
          <li className="px-4 py-4 text-sm text-gray-400 text-center">{t("no_notifications")}</li>
        ) : (
          notifications.map((n) => (
            <li key={n.id} className={`px-4 py-3 text-sm ${n.is_read ? "opacity-60" : "font-medium"} dark:text-gray-200`}>
              <p>{n.message}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {(() => {
                  const d = new Date(n.created_at.endsWith("Z") ? n.created_at : n.created_at + "Z")
                  return `${format(d, "dd MMM yyyy, hh:mm aa")} · ${formatDistanceToNow(d, { addSuffix: true })}`
                })()}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
