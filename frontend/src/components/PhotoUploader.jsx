import { useState, useEffect, useRef } from "react"
import { useTranslation } from "react-i18next"
import { useAuth } from "../hooks/useAuth"
import { uploadPhotos, getPhotos, deletePhoto, getPhotoUrl } from "../api/photos"

const MAX_PHOTOS = 5

function DistanceBadge({ km }) {
  if (km === null || km === undefined) return null
  const color =
    km <= 0.5
      ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
      : km <= 2
      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300"
      : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
  const label = km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${color}`}>
      {label}
    </span>
  )
}

export default function PhotoUploader({ checkin }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef(null)
  const cameraInputRef = useRef(null)

  useEffect(() => {
    if (checkin?.id) {
      getPhotos(checkin.id).then(setPhotos).catch(() => {})
    }
  }, [checkin?.id])

  const handleFiles = async (files) => {
    const arr = Array.from(files)
    if (!arr.length) return
    const remaining = MAX_PHOTOS - photos.length
    if (remaining <= 0) {
      setError(t("max_photos_reached"))
      return
    }
    const toUpload = arr.slice(0, remaining)
    setUploading(true)
    setError("")
    try {
      const uploaded = await uploadPhotos(checkin.id, toUpload)
      setPhotos((prev) => [...prev, ...uploaded])
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
      if (cameraInputRef.current) cameraInputRef.current.value = ""
    }
  }

  const handleDelete = async (photoId) => {
    try {
      await deletePhoto(photoId)
      setPhotos((prev) => prev.filter((p) => p.id !== photoId))
    } catch {
      setError("Delete failed")
    }
  }

  const isOwner = checkin?.user?.id === user?.id || user?.role === "noc_handler"

  return (
    <div className="mt-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium dark:text-gray-300">
          {t("photo_evidence")}
          <span className="ms-2 text-xs text-gray-400 dark:text-gray-500">
            {photos.length}/{MAX_PHOTOS}
          </span>
        </span>
        {isOwner && photos.length < MAX_PHOTOS && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2.5 py-1.5 rounded-lg"
            >
              📷 {t("upload_photo")}
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1.5 rounded-lg"
            >
              🖼 {t("add_photos")}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/heic"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-blue-500">
          <span className="animate-pulse">⏳</span> Uploading…
        </div>
      )}

      {error && <p className="text-red-500 text-xs">{error}</p>}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-lg overflow-hidden border dark:border-gray-600 aspect-square bg-gray-100 dark:bg-gray-800"
            >
              <img
                src={getPhotoUrl(photo.filename)}
                alt="evidence"
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/60 px-1 py-0.5 flex flex-col items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <DistanceBadge km={photo.distance_from_site} />
                {!photo.exif_lat && (
                  <span className="text-xs text-yellow-300">⚠ No GPS</span>
                )}
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && !uploading && (
        <p className="text-xs text-gray-400 italic">{t("no_photos")}</p>
      )}
    </div>
  )
}
