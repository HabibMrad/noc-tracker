import { useEffect } from "react"
import client from "../api/client"

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ""

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushNotifications(user) {
  useEffect(() => {
    if (!user || !VAPID_PUBLIC_KEY) return
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    let cancelled = false

    navigator.serviceWorker.ready.then(async (reg) => {
      if (cancelled) return
      const permission = await Notification.requestPermission()
      if (permission !== "granted") return
      if (cancelled) return

      try {
        const existing = await reg.pushManager.getSubscription()
        const sub = existing || await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
        if (cancelled) return
        const { endpoint, keys } = sub.toJSON()
        await client.post("/push/subscribe", {
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        })
      } catch (err) {
        console.debug("Push subscription failed:", err)
      }
    })

    return () => { cancelled = true }
  }, [user?.id])
}
