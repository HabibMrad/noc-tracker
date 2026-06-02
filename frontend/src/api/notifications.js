import client from "./client"

export const getNotifications = () =>
  client.get("/notifications").then((r) => r.data)

export const getUnreadCount = () =>
  client.get("/notifications/unread-count").then((r) => r.data)

export const markAllRead = () =>
  client.patch("/notifications/read-all").then((r) => r.data)
