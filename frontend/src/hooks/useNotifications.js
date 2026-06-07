import { useState, useEffect, useCallback } from "react"
import { getNotifications, getUnreadCount, markAllRead as apiMarkAllRead } from "../api/notifications"
import { useWebSocket } from "./useWebSocket"

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    const [notifs, countData] = await Promise.all([getNotifications(), getUnreadCount()])
    setNotifications(notifs)
    setUnreadCount(countData.count)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) refresh()
  }, [refresh])

  useWebSocket((raw) => {
    try {
      const data = JSON.parse(raw)
      if (data.type !== "notification") return
      setUnreadCount((c) => c + 1)
      setNotifications((prev) => [
        { id: Date.now(), message: data.message, is_read: false, created_at: new Date().toISOString() },
        ...prev.slice(0, 49),
      ])
    } catch (_) {
      // non-JSON frame — ignore
    }
  })

  const markAllRead = useCallback(async () => {
    await apiMarkAllRead()
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }, [])

  return { notifications, unreadCount, markAllRead, refresh }
}
