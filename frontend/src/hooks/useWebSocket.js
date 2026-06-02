import { useEffect, useRef, useCallback } from "react"

export function useWebSocket(onMessage) {
  const ws = useRef(null)
  const reconnectTimer = useRef(null)
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const connect = useCallback(() => {
    const token = localStorage.getItem("access_token")
    if (!token) return
    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    ws.current = new WebSocket(`${protocol}://${window.location.host}/ws`)
    ws.current.onmessage = (e) => onMessageRef.current(e.data)
    ws.current.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000)
    }
    ws.current.onerror = () => ws.current.close()
  }, [])

  useEffect(() => {
    connect()
    return () => {
      clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])
}
