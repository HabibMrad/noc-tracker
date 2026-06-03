import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { getPhotos, getPhotoUrl } from "../api/photos"
import { utcDate } from "../utils/date"

function DistanceBadge({ km }) {
  if (km === null || km === undefined)
    return <span className="text-xs text-gray-400">No GPS</span>
  if (km <= 0.5)
    return (
      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full">
        ✓ On-site ({km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`})
      </span>
    )
  if (km <= 2)
    return (
      <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full">
        ⚠ Nearby ({km.toFixed(1)}km)
      </span>
    )
  return (
    <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 px-2 py-0.5 rounded-full font-semibold">
      ⛔ Far from site ({km.toFixed(1)}km)
    </span>
  )
}

export default function PhotoGallery({ checkinId }) {
  const { t } = useTranslation()
  const [photos, setPhotos] = useState([])
  const [lightbox, setLightbox] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getPhotos(checkinId)
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [checkinId])

  if (loading)
    return <p className="text-xs text-gray-400 py-2">Loading photos…</p>
  if (photos.length === 0)
    return <p className="text-xs text-gray-400 italic py-2">{t("no_photos")}</p>

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mt-2">
        {photos.map((photo) => (
          <button
            key={photo.id}
            type="button"
            onClick={() => setLightbox(photo)}
            className="relative rounded-lg overflow-hidden border dark:border-gray-700 aspect-square hover:ring-2 ring-blue-500 transition bg-gray-100 dark:bg-gray-800"
          >
            <img
              src={getPhotoUrl(photo.filename)}
              alt="evidence"
              className="w-full h-full object-cover"
            />
            {photo.distance_from_site !== null && photo.distance_from_site > 2 && (
              <span className="absolute top-1 left-1 bg-red-500 text-white text-xs rounded px-1 leading-tight">
                Far
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/80 z-[2000] flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden max-w-lg w-full shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={getPhotoUrl(lightbox.filename)}
              alt="evidence"
              className="w-full max-h-80 object-contain bg-black"
            />
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <DistanceBadge km={lightbox.distance_from_site} />
                <button
                  onClick={() => setLightbox(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                <p>
                  📅 {t("taken_at")}:{" "}
                  {format(utcDate(lightbox.taken_at), "dd/MM/yyyy HH:mm")}
                </p>
                {lightbox.exif_lat != null && (
                  <p>
                    📍 GPS: {lightbox.exif_lat.toFixed(5)},{" "}
                    {lightbox.exif_lng.toFixed(5)}
                  </p>
                )}
                {lightbox.exif_device && <p>📱 {lightbox.exif_device}</p>}
                {lightbox.exif_lat == null && (
                  <p className="text-yellow-500">⚠ No GPS data in this photo</p>
                )}
                {lightbox.distance_from_site !== null &&
                  lightbox.distance_from_site > 2 && (
                    <p className="text-red-500 font-semibold">
                      ⛔ {t("far_from_site")}
                    </p>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
