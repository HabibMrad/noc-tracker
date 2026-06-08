import client from "./client"

export const uploadPhotos = (checkinId, files) => {
  const form = new FormData()
  files.forEach((f) => form.append("files", f))
  return client.post(`/checkins/${checkinId}/photos`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data)
}

export const getPhotos = (checkinId) =>
  client.get(`/checkins/${checkinId}/photos`).then((r) => r.data)

export const deletePhoto = (photoId) =>
  client.delete(`/photos/${photoId}`)

export const getPhotoUrl = (filename) => `${window.location.origin}/api/photos/${filename}`
