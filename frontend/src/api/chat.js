import client from "./client"

export const getMessages = (limit = 50) =>
  client.get(`/chat/messages?limit=${limit}`).then((r) => r.data)

export const sendMessage = (content) =>
  client.post("/chat/messages", { content }).then((r) => r.data)
