import client from "./client"

const toFormData = (file) => {
  const fd = new FormData()
  fd.append("file", file)
  return fd
}

export const previewSites = (file) =>
  client.post("/import/sites/preview", toFormData(file)).then((r) => r.data)

export const confirmSites = (file, mode) =>
  client.post("/import/sites/confirm", toFormData(file), { params: { mode } }).then((r) => r.data)

export const previewEmployees = (file) =>
  client.post("/import/employees/preview", toFormData(file)).then((r) => r.data)

export const confirmEmployees = (file, mode) =>
  client.post("/import/employees/confirm", toFormData(file), { params: { mode } }).then((r) => r.data)
