import client from "./client"

export const getUsers = () => client.get("/admin/users").then((r) => r.data)

export const updateUser = (id, data) =>
  client.patch(`/admin/users/${id}`, data).then((r) => r.data)

export const deleteUser = (id) => client.delete(`/admin/users/${id}`)

export const getStats = () => client.get("/admin/stats").then((r) => r.data)
