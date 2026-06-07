import { useState, useEffect, useRef, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { getMessages, sendMessage } from "../api/chat"
import { useAuth } from "../hooks/useAuth"
import { useWebSocket } from "../hooks/useWebSocket"

export default function Chat() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    getMessages().then(setMessages)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useWebSocket(
    useCallback((raw) => {
      try {
        const data = JSON.parse(raw)
        if (data.type !== "chat") return
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.id)) return prev
          return [
            ...prev,
            {
              id: data.id,
              content: data.content,
              created_at: data.created_at,
              user: { id: data.user_id, name: data.user, username: data.user },
            },
          ]
        })
      } catch (_) {}
    }, [])
  )

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    setInput("")
    try {
      await sendMessage(text)
      // WS broadcast will deliver the message to all tabs including this one
    } catch (_) {
      setInput(text)
    } finally {
      setSending(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const isOwn = (msg) =>
    msg.user?.id === user?.id || Number(msg.user?.id) === Number(user?.id)

  const fmt = (iso) => {
    const d = new Date(iso.endsWith("Z") ? iso : iso + "Z")
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-center text-gray-400 dark:text-gray-500 mt-16 text-sm">
            {t("no_messages_yet")}
          </p>
        )}
        {messages.map((msg) => {
          const own = isOwn(msg)
          return (
            <div key={msg.id} className={`flex ${own ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] ${own ? "items-end" : "items-start"} flex flex-col`}>
                {!own && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 mb-0.5 px-1">
                    {msg.user?.name || msg.user?.username}
                  </span>
                )}
                <div
                  className={`px-4 py-2 rounded-2xl text-sm break-words ${
                    own
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm"
                  }`}
                >
                  {msg.content}
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 px-1">
                  {own ? t("you", { defaultValue: "You" }) + " · " : ""}{fmt(msg.created_at)}
                </span>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 flex gap-2">
        <input
          className="flex-1 rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={t("type_a_message")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={sending}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-full px-5 py-2 text-sm font-medium transition-colors"
        >
          ➤
        </button>
      </div>
    </div>
  )
}
