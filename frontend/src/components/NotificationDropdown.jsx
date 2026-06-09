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
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))

  // Track dark mode changes via MutationObserver
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setDark(document.documentElement.classList.contains("dark"))
    })
    observer.observe(document.documentElement, { attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [])

  // Track screen size / orientation changes
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  // Desktop: close on outside click/tap
  useEffect(() => {
    if (isMobile) return
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener("mousedown", handler)
    document.addEventListener("touchstart", handler)
    return () => {
      document.removeEventListener("mousedown", handler)
      document.removeEventListener("touchstart", handler)
    }
  }, [isMobile, onClose])

  const bg = dark ? "#1f2937" : "#ffffff"
  const border = dark ? "#374151" : "#e5e7eb"
  const textPrimary = dark ? "#f9fafb" : "#111827"
  const textMuted = dark ? "#9ca3af" : "#6b7280"
  const divider = dark ? "#374151" : "#f3f4f6"

  const mobileStyle = {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 9999, overflowY: "auto",
    display: "flex", flexDirection: "column",
    backgroundColor: bg,
    backdropFilter: "none",
  }

  const desktopStyle = {
    position: "fixed", top: "60px", right: "16px",
    width: "380px", maxHeight: "70vh", overflowY: "auto",
    zIndex: 9999,
    backgroundColor: bg,
    backdropFilter: "none",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    border: `1px solid ${border}`,
  }

  const headerStyle = {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px",
    borderBottom: `1px solid ${border}`,
    backgroundColor: bg,
    position: isMobile ? "sticky" : "static",
    top: 0, zIndex: 10,
  }

  const content = (
    <>
      <div
        style={headerStyle}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        <span style={{ fontWeight: 600, fontSize: "14px", color: textPrimary }}>
          {t("notifications")}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            onClick={onMarkAllRead}
            style={{ fontSize: "12px", color: "#3b82f6", background: "none", border: "none", cursor: "pointer" }}
          >
            {t("mark_all_read")}
          </button>
          <button
            onClick={onClose}
            style={{ fontSize: "20px", lineHeight: 1, color: textMuted, background: "none", border: "none", cursor: "pointer", fontWeight: "bold" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      <ul
        style={{ listStyle: "none", margin: 0, padding: 0 }}
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
      >
        {notifications.length === 0 ? (
          <li style={{ padding: "24px 16px", textAlign: "center", fontSize: "14px", color: textMuted }}>
            {t("no_notifications")}
          </li>
        ) : (
          notifications.map((n, i) => (
            <li
              key={n.id}
              style={{
                padding: "12px 16px",
                fontSize: "14px",
                color: textPrimary,
                borderBottom: i < notifications.length - 1 ? `1px solid ${divider}` : "none",
                opacity: n.is_read ? 0.6 : 1,
                fontWeight: n.is_read ? 400 : 500,
                backgroundColor: bg,
              }}
            >
              <p style={{ margin: "0 0 2px 0" }}>{n.message}</p>
              <p style={{ margin: 0, fontSize: "11px", color: textMuted }}>{fmtTime(n.created_at)}</p>
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
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => e.stopPropagation()}
        onScroll={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    )
  }

  return (
    <div ref={ref} style={desktopStyle}>
      {content}
    </div>
  )
}
