import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet"
import { useEffect } from "react"
import { useMap } from "react-leaflet"
import { formatDistanceToNow } from "date-fns"
import { getActivityColor } from "../utils/activityColors"

const LEBANON_CENTER = [33.8938, 35.5018]
const LEBANON_BOUNDS = [[33.05, 35.1], [34.7, 36.7]]

function FitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(bounds)
  }, [map, bounds])
  return null
}

export default function SiteMap({ sites = [], activeSessions = [] }) {
  const activeSet = new Set(activeSessions.map((s) => s.site.site_id))

  return (
    <div className="h-72 md:h-96 rounded-xl overflow-hidden border dark:border-gray-700">
      <MapContainer
        center={LEBANON_CENTER}
        zoom={9}
        className="h-full w-full"
        maxBounds={LEBANON_BOUNDS}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds bounds={LEBANON_BOUNDS} />

        {sites.map((site) => {
          const isActive = activeSet.has(site.site_id)
          const session = activeSessions.find((s) => s.site.site_id === site.site_id)
          const actColor = isActive && session
            ? getActivityColor(session.activity_type).bg
            : "#3b82f6"

          return (
            <CircleMarker
              key={site.site_id}
              center={[site.latitude, site.longitude]}
              radius={isActive ? 10 : 6}
              pathOptions={{
                color: actColor,
                fillColor: actColor,
                fillOpacity: 0.85,
                weight: isActive ? 3 : 1,
              }}
              className=""
            >
              <Popup>
                <div style={{ fontSize: "13px", minWidth: "160px" }}>
                  <p style={{ fontWeight: 700, margin: "0 0 2px 0" }}>{site.name}</p>
                  <p style={{ color: "#6b7280", margin: "0 0 4px 0" }}>{site.site_id} · {site.region}</p>
                  {isActive && session && (() => {
                    const c = getActivityColor(session.activity_type)
                    return (
                      <div style={{ marginTop: "4px" }}>
                        <div style={{ marginBottom: "4px" }}>
                          🔧 <strong>{session.user.name}</strong>
                        </div>
                        <span style={{
                          backgroundColor: c.light,
                          color: c.text,
                          fontSize: "11px",
                          padding: "2px 8px",
                          borderRadius: "9999px",
                          fontWeight: 500,
                        }}>
                          {session.activity_type}
                        </span>
                        <span style={{ marginLeft: "6px", fontSize: "12px", color: "#6b7280" }}>
                          · {session.severity}
                        </span>
                        <div style={{ marginTop: "4px", fontSize: "11px", color: "#9ca3af" }}>
                          {formatDistanceToNow(new Date(session.checked_in_at), { addSuffix: true })}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
