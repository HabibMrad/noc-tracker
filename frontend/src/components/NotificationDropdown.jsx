import { useRef, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { format, formatDistanceToNow } from "date-fns"

function fmtTime(iso) {
  const d = new Date(iso.endsWith("Z") ? iso : iso + "Z")
  return `${format(d, "dd MMM yyyy, hh:mm aa")} · ${formatDistanceToNow(d, { addSuffix: true })}`
}

export default function NotificationDropdown({ notifications, onMarkAllRead, onClose }) {
  const { t } = useTranslation()
  const ref = useRef()
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    if (isMobile) return  // mobile uses X button only — no outside-tap dismiss
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("touchstart", handler)
    }
  }, [isMobile, onClose])

  const mobileStyle = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, overflowY: "auto",
    display: "flex", flexDirection: "column",
  }

  const desktopStyle = {
    position: "fixed", top: "60px", right: "16px",
    width: "380px", maxHeight: "70vh", overflowY: "auto",
    zIndex: 9999,
  }

  const content = (
    <>
      {/* Header */}
      <div
        className={`flex items-center justify-between px-4 py-3 border-b dark:border-gray-700 bg-white dark:bg-gray-800 ${isMobile ? "sticky top-0 z-10" : ""}`}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <span className="font-semibold text-sm dark:text-white">{t("notifications")}</span>
        <div className="flex items-center gap-3">
          <button onClick={onMarkAllRead} className="text-xs text-blue-500 hover:underline">
            {t("mark_all_read")}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none font-bold"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* List */}
      <ul
        className="divide-y dark:divide-gray-700 flex-1"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {notifications.length === 0 ? (
          <li className="px-4 py-6 text-sm text-gray-400 text-center">{t("no_notifications")}</li>
        ) : (
          notifications.map((n) => (
            <li key={n.id} className={`px-4 py-3 text-sm ${n.is_read ? "opacity-60" : "font-medium"} dark:text-gray-200`}>
              <p>{n.message}</p>
              <p className="text-xs text-gray-400 mt-0.5">{fmtTime(n.created_at)}</p>
            </li>
          ))
        )}
      </ul>
    </>
  )

  if (isMobile) {
    return (
      <div
        style={mobileStyle}
        className="bg-white dark:bg-gray-800"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onScroll={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    )
  }

  return (
    <div
      ref={ref}
      style={desktopStyle}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700"
    >
      {content}
    </div>
  )
}
