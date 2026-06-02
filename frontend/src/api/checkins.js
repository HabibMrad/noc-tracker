import client from "./client"

export const createCheckin = (data) =>
  client.post("/checkins", data).then((r) => r.data)

export const checkout = (id) =>
  client.patch(`/checkins/${id}/checkout`).then((r) => r.data)

export const listCheckins = (params) =>
  client.get("/checkins", { params }).then((r) => r.data)

export const exportCSV = (params) =>
  client.get("/checkins/export/csv", { params, responseType: "blob" }).then((r) => r.data)
