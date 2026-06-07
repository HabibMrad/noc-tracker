import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuth } from "../hooks/useAuth"
import { useNotifications } from "../hooks/useNotifications"
import NotificationDropdown from "./NotificationDropdown"
import i18n from "../i18n/index"

export default function Navbar() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { notifications, unreadCount, markAllRead } = useNotifications()
  const [showNotifs, setShowNotifs] = useState(false)
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"))
  const location = useLocation()

  const toggleDark = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("theme", next ? "dark" : "light")
  }

  const toggleLang = () => {
    const next = i18n.language === "en" ? "ar" : "en"
    i18n.changeLanguage(next)
    localStorage.setItem("lang", next)
    document.documentElement.dir = next === "ar" ? "rtl" : "ltr"
  }

  const navLink = (to, label) => (
    <Link
      to={to}
      className={`text-sm px-3 py-1 rounded-lg transition ${
        location.pathname === to
          ? "bg-blue-600 text-white"
          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
      }`}
    >
      {label}
    </Link>
  )

  return (
    <nav className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="font-bold text-blue-600 dark:text-blue-400 me-3 text-sm whitespace-nowrap">
          {t("app_name")}
        </span>
        {navLink("/", t("dashboard"))}
        {navLink("/checkin", t("check_in"))}
        {navLink("/history", t("history"))}
        {navLink("/help", t("help"))}
        {navLink("/chat", t("chat"))}
        {user?.role === "admin" && navLink("/import", t("import"))}
        {user?.role === "admin" && navLink("/admin", t("admin"))}
      </div>

      <div className="flex items-center gap-2 relative">
        <button
          onClick={() => setShowNotifs((v) => !v)}
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {showNotifs && (
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkAllRead={markAllRead}
            onClose={() => setShowNotifs(false)}
          />
        )}
        <button onClick={toggleDark} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">
          {dark ? "☀️" : "🌙"}
        </button>
        <button onClick={toggleLang} className="text-xs px-2 py-1 border rounded dark:border-gray-600 dark:text-gray-300">
          {i18n.language === "en" ? "عربي" : "EN"}
        </button>
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{user?.name}</span>
        <button onClick={logout} className="text-xs text-red-500 hover:underline">{t("logout")}</button>
      </div>
    </nav>
  )
}
