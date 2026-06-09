import { useState, useEffect } from "react"
import { getActivityColor } from "../utils/activityColors"

export default function ActivityBadge({ type }) {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    )
    obs.observe(document.documentElement, { attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  const c = getActivityColor(type)
  const style = dark
    ? { backgroundColor: c.bg + "33", color: c.bg, border: `1px solid ${c.bg}66` }
    : { backgroundColor: c.light, color: c.text }

  return (
    <span style={{
      ...style,
      fontSize: "11px",
      padding: "2px 8px",
      borderRadius: "9999px",
      fontWeight: 500,
      whiteSpace: "nowrap",
      display: "inline-block",
    }}>
      {type || "Other"}
    </span>
  )
}
