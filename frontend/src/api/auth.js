import client from "./client"

export const login = (username, password) =>
  client.post("/auth/login", { username, password }).then((r) => r.data)

export const register = (data) =>
  client.post("/auth/register", data).then((r) => r.data)

export const me = () => client.get("/auth/me").then((r) => r.data)
