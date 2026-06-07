import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet"
import { useEffect } from "react"
import { useMap } from "react-leaflet"
import { formatDistanceToNow } from "date-fns"

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

          return (
            <CircleMarker
              key={site.site_id}
              center={[site.latitude, site.longitude]}
              radius={isActive ? 10 : 6}
              pathOptions={{
                color: isActive ? "#ef4444" : "#3b82f6",
                fillColor: isActive ? "#ef4444" : "#3b82f6",
                fillOpacity: 0.85,
                weight: isActive ? 3 : 1,
              }}
              className=""
            >
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <p className="font-bold">{site.name}</p>
                  <p className="text-gray-500">{site.site_id} · {site.region}</p>
                  {isActive && session && (
                    <div className="mt-1 text-red-600 font-medium">
                      🔧 {session.user.name}<br />
                      {session.activity_type} · {session.severity}<br />
                      {formatDistanceToNow(new Date(session.checked_in_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
