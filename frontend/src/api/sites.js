import client from "./client"

export const listSites = () => client.get("/sites").then((r) => r.data)

export const nearestSites = (lat, lng, limit = 5) =>
  client.get("/sites/nearest", { params: { lat, lng, limit } }).then((r) => r.data)
