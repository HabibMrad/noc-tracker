import axios from "axios"
import { refreshToken } from "./auth"

const client = axios.create({ baseURL: "/api" })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let isRefreshing = false
let failedQueue = []

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => (error ? prom.reject(error) : prom.resolve(token)))
  failedQueue = []
}

client.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return client(original)
        })
      }
      original._retry = true
      isRefreshing = true
      const stored = localStorage.getItem("refresh_token")
      if (stored) {
        try {
          const data = await refreshToken(stored)
          localStorage.setItem("access_token", data.access_token)
          localStorage.setItem("refresh_token", data.refresh_token)
          client.defaults.headers.Authorization = `Bearer ${data.access_token}`
          processQueue(null, data.access_token)
          original.headers.Authorization = `Bearer ${data.access_token}`
          isRefreshing = false
          return client(original)
        } catch (e) {
          processQueue(e, null)
          isRefreshing = false
        }
      }
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default client
