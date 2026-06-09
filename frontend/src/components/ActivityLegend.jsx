import { useState, useEffect } from "react"
import { ACTIVITY_COLORS } from "../utils/activityColors"

const LEGEND = [
  { type: "Maintenance",  label: "Routine upkeep and preventive work" },
  { type: "Emergency",    label: "Urgent unplanned intervention" },
  { type: "Inspection",   label: "Site visit for assessment" },
  { type: "Installation", label: "New equipment setup" },
  { type: "Other",        label: "General activities" },
]

export default function ActivityLegend() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    )
    obs.observe(document.documentElement, { attributeFilter: ["class"] })
    return () => obs.disconnect()
  }, [])

  const cardBg = dark ? "#1f2937" : "#ffffff"
  const cardBorder = dark ? "#374151" : "#e5e7eb"
  const textPrimary = dark ? "#f9fafb" : "#111827"
  const textMuted = dark ? "#9ca3af" : "#6b7280"

  return (
    <div style={{
      backgroundColor: cardBg,
      border: `1px solid ${cardBorder}`,
      borderRadius: "12px",
      padding: "16px",
    }}>
      <p style={{ fontSize: "13px", fontWeight: 600, color: textPrimary, marginBottom: "12px" }}>
        Activity Types
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {LEGEND.map(({ type, label }) => {
          const c = ACTIVITY_COLORS[type]
          const dotStyle = { backgroundColor: c.bg, width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0, marginTop: "2px" }
          return (
            <div key={type} style={{ display: "flex", alignItems: "flex-start", gap: "8px", minWidth: "160px", flex: "1 1 160px" }}>
              <span style={dotStyle} />
              <div>
                <span style={{ fontSize: "13px", fontWeight: 500, color: textPrimary }}>{type}</span>
                <p style={{ fontSize: "11px", color: textMuted, margin: 0 }}>{label}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
