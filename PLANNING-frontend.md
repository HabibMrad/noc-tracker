# NOC Site Access Tracker — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React frontend — mobile-first, dark mode, bilingual EN/AR, Leaflet map of Lebanon, real-time WebSocket notifications, and all pages (Dashboard, Check-In, History, Help, Import).

**Architecture:** Vite + React 18 + Tailwind CSS 3. Axios for REST, native WebSocket for real-time. React Router v6 for routing. React Hook Form + Zod for validation. react-leaflet for the Lebanon map. i18next for EN/AR translations. Auth state in React Context with JWT stored in localStorage.

**Tech Stack:** React 18, Vite 5, Tailwind CSS 3, React Router v6, Axios, React Hook Form, Zod, react-leaflet 4 + leaflet 1.9, i18next + react-i18next, date-fns, Vitest, React Testing Library

**Prerequisites:** Backend running on `http://localhost:8000`. Complete PLANNING-backend.md first.

---

## File Map

| File | Responsibility |
|------|---------------|
| `frontend/index.html` | Vite entry HTML |
| `frontend/vite.config.js` | Vite config with `/api` and `/ws` proxy to backend |
| `frontend/tailwind.config.js` | Tailwind with dark mode class strategy |
| `frontend/src/main.jsx` | React DOM root, providers |
| `frontend/src/App.jsx` | Router, auth guard, layout shell |
| `frontend/src/i18n/en.js` | English translation strings |
| `frontend/src/i18n/ar.js` | Arabic translation strings |
| `frontend/src/i18n/index.js` | i18next init, export `useTranslation` |
| `frontend/src/api/client.js` | Axios instance, JWT interceptor, 401 logout |
| `frontend/src/api/auth.js` | login, register, me |
| `frontend/src/api/sites.js` | listSites, nearestSites |
| `frontend/src/api/checkins.js` | createCheckin, checkout, listCheckins, exportCSV |
| `frontend/src/api/notifications.js` | getNotifications, getUnreadCount, markAllRead |
| `frontend/src/api/contacts.js` | listContacts |
| `frontend/src/api/imports.js` | previewSites, confirmSites, previewEmployees, confirmEmployees |
| `frontend/src/hooks/useAuth.jsx` | AuthContext + useAuth hook |
| `frontend/src/hooks/useWebSocket.js` | WS connect/reconnect, onMessage callback |
| `frontend/src/hooks/useNotifications.js` | notification state, unread count, mark-read |
| `frontend/src/hooks/useGeolocation.js` | GPS + Haversine nearest sites |
| `frontend/src/components/Navbar.jsx` | Top bar: logo, nav links, bell, dark mode, lang toggle |
| `frontend/src/components/NotificationDropdown.jsx` | Bell dropdown with unread list |
| `frontend/src/components/SiteMap.jsx` | Leaflet map: Lebanon bounds, site pins, flashing active markers |
| `frontend/src/components/ActiveSessionsTable.jsx` | Table of open check-ins with elapsed/overdue |
| `frontend/src/components/ContactCard.jsx` | Help tab card: name, phone (click-to-call), shift |
| `frontend/src/components/ImportPreviewTable.jsx` | Preview table before confirming import |
| `frontend/src/pages/Login.jsx` | Login form |
| `frontend/src/pages/Register.jsx` | Self-registration form (name must match allowlist) |
| `frontend/src/pages/Dashboard.jsx` | Live map + active sessions table (home page) |
| `frontend/src/pages/CheckIn.jsx` | Check-in / check-out form |
| `frontend/src/pages/History.jsx` | Filtered history + CSV export |
| `frontend/src/pages/Help.jsx` | Contact cards from imported employees |
| `frontend/src/pages/Import.jsx` | Excel upload (NOC handler only) |

---

## Task 1: Vite + React + Tailwind Scaffold

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/vite.config.js`
- Create: `frontend/tailwind.config.js`
- Create: `frontend/index.html`
- Create: `frontend/src/main.jsx`

- [ ] **Step 1: Initialise project**

```bash
cd noc-tracker/frontend
npm create vite@latest . -- --template react
npm install
```

- [ ] **Step 2: Install all dependencies**

```bash
npm install tailwindcss@3 postcss autoprefixer \
  react-router-dom@6 \
  axios \
  react-hook-form @hookform/resolvers zod \
  react-leaflet@4 leaflet@1.9 \
  i18next react-i18next \
  date-fns

npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

- [ ] **Step 3: Init Tailwind**

```bash
npx tailwindcss init -p
```

- [ ] **Step 4: Write tailwind.config.js**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      animation: {
        ping_slow: "ping 1.5s cubic-bezier(0,0,0.2,1) infinite",
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 5: Write vite.config.js**

```js
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": { target: "http://localhost:8000", changeOrigin: true },
      "/ws": { target: "ws://localhost:8000", ws: true, changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test-setup.js",
  },
})
```

- [ ] **Step 6: Write src/test-setup.js**

```js
import "@testing-library/jest-dom"
```

- [ ] **Step 7: Replace src/index.css with Tailwind directives**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Flashing red site marker */
@keyframes pulse-marker {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.6; transform: scale(1.4); }
}
.leaflet-active-marker {
  animation: pulse-marker 1.2s ease-in-out infinite;
}
```

- [ ] **Step 8: Add Leaflet CSS to index.html**

```html
<!-- inside <head> of frontend/index.html -->
<link
  rel="stylesheet"
  href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
/>
```

- [ ] **Step 9: Write src/main.jsx**

```jsx
import React from "react"
import ReactDOM from "react-dom/client"
import "./index.css"
import App from "./App"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
```

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server on `http://localhost:5173` with no errors.

- [ ] **Step 11: Commit**

```bash
git add frontend/
git commit -m "feat: Vite + React + Tailwind scaffold with proxy config"
```

---

## Task 2: i18n (English / Arabic)

**Files:**
- Create: `frontend/src/i18n/en.js`
- Create: `frontend/src/i18n/ar.js`
- Create: `frontend/src/i18n/index.js`

- [ ] **Step 1: Write en.js**

```js
export default {
  translation: {
    app_name: "NOC Site Tracker",
    login: "Login",
    register: "Register",
    logout: "Logout",
    dashboard: "Dashboard",
    check_in: "Check In",
    history: "History",
    help: "Help",
    import: "Import",
    username: "Username",
    password: "Password",
    email: "Email",
    full_name: "Full Name",
    site: "Site",
    site_id: "Site ID",
    region: "Region",
    activity_type: "Activity Type",
    severity: "Severity",
    affected_sites: "Affected Sites",
    expected_duration: "Expected Duration (hours)",
    planned_outage: "Planned Outage",
    routine_maintenance: "Routine Maintenance",
    notes: "Notes",
    check_out: "Check Out",
    active_sessions: "Active Sessions",
    detect_nearest: "Detect Nearest Sites",
    employee: "Employee",
    company: "Company",
    checked_in_at: "Checked In",
    checked_out_at: "Checked Out",
    elapsed: "Elapsed",
    status: "Status",
    active: "Active",
    completed: "Completed",
    overdue: "Overdue",
    export_csv: "Export CSV",
    upload_excel: "Upload Excel",
    preview: "Preview",
    confirm_import: "Confirm Import",
    skip_existing: "Skip existing",
    update_existing: "Update existing",
    phone: "Phone",
    shift: "Shift",
    on_call: "On Call",
    mark_all_read: "Mark all as read",
    no_notifications: "No notifications",
    dark_mode: "Dark Mode",
    notifications: "Notifications",
    submit: "Submit",
    cancel: "Cancel",
    search_site: "Search site by name or ID",
    maintenance: "Maintenance",
    emergency: "Emergency",
    inspection: "Inspection",
    installation: "Installation",
    other: "Other",
    low: "Low",
    medium: "Medium",
    high: "High",
    critical: "Critical",
    name_not_approved: "Your name is not in the approved employee list.",
    invalid_credentials: "Invalid username or password.",
    registration_success: "Account created. Please log in.",
    filter: "Filter",
    reset_filters: "Reset",
    date_from: "From",
    date_to: "To",
    touch: "Touch",
    subcontractor: "Subcontractor",
  },
}
```

- [ ] **Step 2: Write ar.js**

```js
export default {
  translation: {
    app_name: "متتبع مواقع مركز العمليات",
    login: "تسجيل الدخول",
    register: "إنشاء حساب",
    logout: "تسجيل الخروج",
    dashboard: "لوحة التحكم",
    check_in: "تسجيل الدخول للموقع",
    history: "السجل",
    help: "مساعدة",
    import: "استيراد",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    email: "البريد الإلكتروني",
    full_name: "الاسم الكامل",
    site: "الموقع",
    site_id: "رقم الموقع",
    region: "المنطقة",
    activity_type: "نوع النشاط",
    severity: "الخطورة",
    affected_sites: "المواقع المتضررة",
    expected_duration: "المدة المتوقعة (ساعات)",
    planned_outage: "انقطاع مجدول",
    routine_maintenance: "صيانة روتينية",
    notes: "ملاحظات",
    check_out: "تسجيل المغادرة",
    active_sessions: "الجلسات النشطة",
    detect_nearest: "اكتشاف أقرب المواقع",
    employee: "الموظف",
    company: "الشركة",
    checked_in_at: "وقت الدخول",
    checked_out_at: "وقت المغادرة",
    elapsed: "الوقت المنقضي",
    status: "الحالة",
    active: "نشط",
    completed: "منتهي",
    overdue: "متأخر",
    export_csv: "تصدير CSV",
    upload_excel: "رفع ملف Excel",
    preview: "معاينة",
    confirm_import: "تأكيد الاستيراد",
    skip_existing: "تخطي الموجود",
    update_existing: "تحديث الموجود",
    phone: "الهاتف",
    shift: "الوردية",
    on_call: "في الخدمة",
    mark_all_read: "تحديد الكل كمقروء",
    no_notifications: "لا توجد إشعارات",
    dark_mode: "الوضع الداكن",
    notifications: "الإشعارات",
    submit: "إرسال",
    cancel: "إلغاء",
    search_site: "ابحث عن موقع بالاسم أو الرقم",
    maintenance: "صيانة",
    emergency: "طارئ",
    inspection: "فحص",
    installation: "تركيب",
    other: "أخرى",
    low: "منخفض",
    medium: "متوسط",
    high: "عالٍ",
    critical: "حرج",
    name_not_approved: "اسمك غير موجود في قائمة الموظفين المعتمدة.",
    invalid_credentials: "اسم المستخدم أو كلمة المرور غير صحيحة.",
    registration_success: "تم إنشاء الحساب. يرجى تسجيل الدخول.",
    filter: "فلترة",
    reset_filters: "إعادة تعيين",
    date_from: "من",
    date_to: "إلى",
    touch: "تاتش",
    subcontractor: "مقاول",
  },
}
```

- [ ] **Step 3: Write i18n/index.js**

```js
import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./en"
import ar from "./ar"

i18n.use(initReactI18next).init({
  resources: { en, ar },
  lng: localStorage.getItem("lang") || "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
})

export default i18n
```

- [ ] **Step 4: Import i18n in main.jsx**

Add to top of `frontend/src/main.jsx`:
```js
import "./i18n/index"
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/i18n/ frontend/src/main.jsx
git commit -m "feat: i18n setup for English and Arabic"
```

---

## Task 3: API Client + Auth Hook

**Files:**
- Create: `frontend/src/api/client.js`
- Create: `frontend/src/api/auth.js`
- Create: `frontend/src/api/sites.js`
- Create: `frontend/src/api/checkins.js`
- Create: `frontend/src/api/notifications.js`
- Create: `frontend/src/api/contacts.js`
- Create: `frontend/src/api/imports.js`
- Create: `frontend/src/hooks/useAuth.jsx`

- [ ] **Step 1: Write api/client.js**

```js
import axios from "axios"

const client = axios.create({ baseURL: "/api" })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token")
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      window.location.href = "/login"
    }
    return Promise.reject(err)
  }
)

export default client
```

- [ ] **Step 2: Write api/auth.js**

```js
import client from "./client"

export const login = (username, password) =>
  client.post("/auth/login", { username, password }).then((r) => r.data)

export const register = (data) =>
  client.post("/auth/register", data).then((r) => r.data)

export const me = () => client.get("/auth/me").then((r) => r.data)
```

- [ ] **Step 3: Write api/sites.js**

```js
import client from "./client"

export const listSites = () => client.get("/sites").then((r) => r.data)

export const nearestSites = (lat, lng, limit = 5) =>
  client.get("/sites/nearest", { params: { lat, lng, limit } }).then((r) => r.data)
```

- [ ] **Step 4: Write api/checkins.js**

```js
import client from "./client"

export const createCheckin = (data) =>
  client.post("/checkins", data).then((r) => r.data)

export const checkout = (id) =>
  client.patch(`/checkins/${id}/checkout`).then((r) => r.data)

export const listCheckins = (params) =>
  client.get("/checkins", { params }).then((r) => r.data)

export const exportCSV = (params) =>
  client.get("/checkins/export/csv", { params, responseType: "blob" }).then((r) => r.data)
```

- [ ] **Step 5: Write api/notifications.js**

```js
import client from "./client"

export const getNotifications = () =>
  client.get("/notifications").then((r) => r.data)

export const getUnreadCount = () =>
  client.get("/notifications/unread-count").then((r) => r.data)

export const markAllRead = () =>
  client.patch("/notifications/read-all").then((r) => r.data)
```

- [ ] **Step 6: Write api/contacts.js**

```js
import client from "./client"
export const listContacts = () => client.get("/contacts").then((r) => r.data)
```

- [ ] **Step 7: Write api/imports.js**

```js
import client from "./client"

const formData = (file) => {
  const fd = new FormData()
  fd.append("file", file)
  return fd
}

export const previewSites = (file) =>
  client.post("/import/sites/preview", formData(file)).then((r) => r.data)

export const confirmSites = (file, mode) =>
  client.post("/import/sites/confirm", formData(file), { params: { mode } }).then((r) => r.data)

export const previewEmployees = (file) =>
  client.post("/import/employees/preview", formData(file)).then((r) => r.data)

export const confirmEmployees = (file, mode) =>
  client.post("/import/employees/confirm", formData(file), { params: { mode } }).then((r) => r.data)
```

- [ ] **Step 8: Write hooks/useAuth.jsx**

```jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { login as apiLogin, me } from "../api/auth"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) {
      me()
        .then(setUser)
        .catch(() => localStorage.removeItem("access_token"))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (username, password) => {
    const tokens = await apiLogin(username, password)
    localStorage.setItem("access_token", tokens.access_token)
    localStorage.setItem("refresh_token", tokens.refresh_token)
    const profile = await me()
    setUser(profile)
    return profile
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
```

- [ ] **Step 9: Commit**

```bash
git add frontend/src/api/ frontend/src/hooks/useAuth.jsx
git commit -m "feat: API client with JWT interceptor and auth hook"
```

---

## Task 4: WebSocket + Notification Hooks

**Files:**
- Create: `frontend/src/hooks/useWebSocket.js`
- Create: `frontend/src/hooks/useNotifications.js`
- Create: `frontend/src/hooks/useGeolocation.js`

- [ ] **Step 1: Write hooks/useWebSocket.js**

```js
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
```

- [ ] **Step 2: Write hooks/useNotifications.js**

```js
import { useState, useEffect, useCallback } from "react"
import { getNotifications, getUnreadCount, markAllRead as apiMarkAllRead } from "../api/notifications"
import { useWebSocket } from "./useWebSocket"

export function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    const [notifs, countData] = await Promise.all([getNotifications(), getUnreadCount()])
    setNotifications(notifs)
    setUnreadCount(countData.count)
  }, [])

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (token) refresh()
  }, [refresh])

  useWebSocket((message) => {
    setUnreadCount((c) => c + 1)
    setNotifications((prev) => [
      { id: Date.now(), message, is_read: false, created_at: new Date().toISOString() },
      ...prev.slice(0, 49),
    ])
  })

  const markAllRead = useCallback(async () => {
    await apiMarkAllRead()
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }, [])

  return { notifications, unreadCount, markAllRead, refresh }
}
```

- [ ] **Step 3: Write hooks/useGeolocation.js**

```js
import { useState, useCallback } from "react"
import { nearestSites } from "../api/sites"

export function useGeolocation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [nearest, setNearest] = useState([])

  const detect = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported")
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const sites = await nearestSites(coords.latitude, coords.longitude, 5)
          setNearest(sites)
        } catch {
          setError("Failed to fetch nearest sites")
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError("Location access denied")
        setLoading(false)
      }
    )
  }, [])

  return { detect, loading, error, nearest }
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/
git commit -m "feat: WebSocket, notification, and geolocation hooks"
```

---

## Task 5: App Shell — Router, Auth Guard, Navbar

**Files:**
- Create: `frontend/src/App.jsx`
- Create: `frontend/src/components/Navbar.jsx`
- Create: `frontend/src/components/NotificationDropdown.jsx`

- [ ] **Step 1: Write components/NotificationDropdown.jsx**

```jsx
import { useRef, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"

export default function NotificationDropdown({ notifications, unreadCount, onMarkAllRead, onClose }) {
  const { t } = useTranslation()
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) onClose() }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute right-0 top-12 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
        <span className="font-semibold text-sm dark:text-white">{t("notifications")}</span>
        <button
          onClick={onMarkAllRead}
          className="text-xs text-blue-500 hover:underline"
        >
          {t("mark_all_read")}
        </button>
      </div>
      <ul className="max-h-72 overflow-y-auto divide-y dark:divide-gray-700">
        {notifications.length === 0 ? (
          <li className="px-4 py-4 text-sm text-gray-400 text-center">{t("no_notifications")}</li>
        ) : (
          notifications.map((n) => (
            <li
              key={n.id}
              className={`px-4 py-3 text-sm ${n.is_read ? "opacity-60" : "font-medium"} dark:text-gray-200`}
            >
              <p>{n.message}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
              </p>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
```

- [ ] **Step 2: Write components/Navbar.jsx**

```jsx
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
      <div className="flex items-center gap-1">
        <span className="font-bold text-blue-600 dark:text-blue-400 me-4 text-sm">
          {t("app_name")}
        </span>
        {navLink("/", t("dashboard"))}
        {navLink("/checkin", t("check_in"))}
        {navLink("/history", t("history"))}
        {navLink("/help", t("help"))}
        {user?.role === "noc_handler" && navLink("/import", t("import"))}
      </div>

      <div className="flex items-center gap-3 relative">
        {/* Notification Bell */}
        <button
          onClick={() => setShowNotifs((v) => !v)}
          className="relative p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg className="w-5 h-5 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

        {/* Dark mode */}
        <button onClick={toggleDark} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">
          {dark ? "☀️" : "🌙"}
        </button>

        {/* Language toggle */}
        <button onClick={toggleLang} className="text-xs px-2 py-1 border rounded dark:border-gray-600 dark:text-gray-300">
          {i18n.language === "en" ? "عربي" : "EN"}
        </button>

        {/* User & logout */}
        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
          {user?.name}
        </span>
        <button
          onClick={logout}
          className="text-xs text-red-500 hover:underline"
        >
          {t("logout")}
        </button>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Write App.jsx**

```jsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useEffect } from "react"
import { AuthProvider, useAuth } from "./hooks/useAuth"
import Navbar from "./components/Navbar"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import CheckIn from "./pages/CheckIn"
import History from "./pages/History"
import Help from "./pages/Help"
import Import from "./pages/Import"

function PrivateRoute({ children, requireNoc = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (requireNoc && user.role !== "noc_handler") return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()

  // Apply saved theme and lang on mount
  useEffect(() => {
    const theme = localStorage.getItem("theme")
    if (theme === "dark") document.documentElement.classList.add("dark")
    const lang = localStorage.getItem("lang") || "en"
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"
  }, [])

  return (
    <BrowserRouter>
      {user && <Navbar />}
      <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Routes>
          <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
          <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/checkin" element={<PrivateRoute><CheckIn /></PrivateRoute>} />
          <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
          <Route path="/help" element={<PrivateRoute><Help /></PrivateRoute>} />
          <Route path="/import" element={<PrivateRoute requireNoc><Import /></PrivateRoute>} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
```

- [ ] **Step 4: Create stub pages so routing doesn't crash**

```jsx
// frontend/src/pages/Dashboard.jsx (stub)
export default function Dashboard() { return <div className="p-4 dark:text-white">Dashboard</div> }
```
```jsx
// frontend/src/pages/CheckIn.jsx (stub)
export default function CheckIn() { return <div className="p-4 dark:text-white">Check In</div> }
```
```jsx
// frontend/src/pages/History.jsx (stub)
export default function History() { return <div className="p-4 dark:text-white">History</div> }
```
```jsx
// frontend/src/pages/Help.jsx (stub)
export default function Help() { return <div className="p-4 dark:text-white">Help</div> }
```
```jsx
// frontend/src/pages/Import.jsx (stub)
export default function Import() { return <div className="p-4 dark:text-white">Import</div> }
```

- [ ] **Step 5: Verify app loads**

```bash
npm run dev
```

Visit `http://localhost:5173` — should redirect to `/login`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/ frontend/src/pages/
git commit -m "feat: app shell with routing, auth guard, navbar, notification bell"
```

---

## Task 6: Login & Register Pages

**Files:**
- Modify: `frontend/src/pages/Login.jsx`
- Modify: `frontend/src/pages/Register.jsx`

- [ ] **Step 1: Write pages/Login.jsx**

```jsx
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { useAuth } from "../hooks/useAuth"

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
})

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState("")
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async ({ username, password }) => {
    try {
      setError("")
      await login(username, password)
      navigate("/")
    } catch {
      setError(t("invalid_credentials"))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
        <h1 className="text-2xl font-bold text-center text-blue-600 dark:text-blue-400 mb-6">
          {t("app_name")}
        </h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">{t("username")}</label>
            <input
              {...register("username")}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              autoComplete="username"
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">{t("password")}</label>
            <input
              type="password"
              {...register("password")}
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              autoComplete="current-password"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? "…" : t("login")}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          <Link to="/register" className="text-blue-500 hover:underline">{t("register")}</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Write pages/Register.jsx**

```jsx
import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { register as apiRegister } from "../api/auth"

const schema = z.object({
  name: z.string().min(2, "Required"),
  username: z.string().min(3, "Min 3 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
})

export default function Register() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [error, setError] = useState("")
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })

  const onSubmit = async (data) => {
    try {
      setError("")
      await apiRegister(data)
      navigate("/login", { state: { message: t("registration_success") } })
    } catch (err) {
      const detail = err.response?.data?.detail
      if (detail?.includes("not in approved")) setError(t("name_not_approved"))
      else setError(detail || "Registration failed")
    }
  }

  const field = (key, label, type = "text", autoComplete = "") => (
    <div>
      <label className="block text-sm mb-1 dark:text-gray-300">{label}</label>
      <input
        type={type}
        {...register(key)}
        autoComplete={autoComplete}
        className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      />
      {errors[key] && <p className="text-red-500 text-xs mt-1">{errors[key].message}</p>}
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-center dark:text-white mb-6">{t("register")}</h1>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {field("name", t("full_name"), "text", "name")}
          {field("username", t("username"), "text", "username")}
          {field("email", t("email"), "email", "email")}
          {field("password", t("password"), "password", "new-password")}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
          >
            {isSubmitting ? "…" : t("register")}
          </button>
        </form>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          <Link to="/login" className="text-blue-500 hover:underline">{t("login")}</Link>
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Login.jsx frontend/src/pages/Register.jsx
git commit -m "feat: login and register pages with validation"
```

---

## Task 7: SiteMap Component (Leaflet + Lebanon)

**Files:**
- Create: `frontend/src/components/SiteMap.jsx`

- [ ] **Step 1: Write SiteMap.jsx**

```jsx
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet"
import { useEffect } from "react"
import { useTranslation } from "react-i18next"
import { formatDistanceToNow } from "date-fns"

const LEBANON_CENTER = [33.8938, 35.5018]
const LEBANON_BOUNDS = [[33.05, 35.1], [34.7, 36.7]]

function FitBounds({ bounds }) {
  const map = useMap()
  useEffect(() => { map.fitBounds(bounds) }, [map, bounds])
  return null
}

export default function SiteMap({ sites = [], activeSessions = [] }) {
  const { t } = useTranslation()
  const activeSet = new Set(activeSessions.map((s) => s.site.site_id))

  return (
    <div className="h-72 md:h-96 rounded-xl overflow-hidden border dark:border-gray-700">
      <MapContainer
        center={LEBANON_CENTER}
        zoom={9}
        className="h-full w-full"
        maxBounds={LEBANON_BOUNDS}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <FitBounds bounds={LEBANON_BOUNDS} />

        {sites.map((site) => {
          const isActive = activeSet.has(site.site_id)
          const session = activeSessions.find((s) => s.site.site_id === site.site_id)

          return (
            <CircleMarker
              key={site.site_id}
              center={[site.latitude, site.longitude]}
              radius={isActive ? 10 : 6}
              pathOptions={{
                color: isActive ? "#ef4444" : "#3b82f6",
                fillColor: isActive ? "#ef4444" : "#3b82f6",
                fillOpacity: 0.85,
                weight: isActive ? 3 : 1,
              }}
              className={isActive ? "leaflet-active-marker" : ""}
            >
              <Popup>
                <div className="text-sm min-w-[160px]">
                  <p className="font-bold">{site.name}</p>
                  <p className="text-gray-500">{site.site_id} · {site.region}</p>
                  {isActive && session && (
                    <div className="mt-1 text-red-600 font-medium">
                      🔧 {session.user.name}<br />
                      {session.activity_type} · {session.severity}<br />
                      {formatDistanceToNow(new Date(session.checked_in_at), { addSuffix: true })}
                    </div>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/SiteMap.jsx
git commit -m "feat: Leaflet map of Lebanon with active site flashing markers"
```

---

## Task 8: ActiveSessionsTable Component

**Files:**
- Create: `frontend/src/components/ActiveSessionsTable.jsx`

- [ ] **Step 1: Write ActiveSessionsTable.jsx**

```jsx
import { useTranslation } from "react-i18next"
import { formatDistanceToNow, differenceInMinutes } from "date-fns"
import { checkout } from "../api/checkins"
import { useAuth } from "../hooks/useAuth"

function statusColor(session) {
  const elapsed = differenceInMinutes(new Date(), new Date(session.checked_in_at))
  const expected = session.expected_duration * 60
  if (elapsed > expected) return "text-red-500"
  if (elapsed > expected * 0.8) return "text-orange-400"
  return "text-green-500"
}

export default function ActiveSessionsTable({ sessions, onRefresh }) {
  const { t } = useTranslation()
  const { user } = useAuth()

  const handleCheckout = async (id) => {
    await checkout(id)
    onRefresh()
  }

  if (!sessions.length) {
    return (
      <p className="text-center text-gray-400 py-8 text-sm">{t("active")}: 0</p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
          <tr>
            {[t("employee"), t("company"), t("site"), t("activity_type"), t("severity"), t("checked_in_at"), t("elapsed"), t("status"), ""].map((h) => (
              <th key={h} className="px-3 py-2 text-start font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          {sessions.map((s) => (
            <tr key={s.id} className="dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50">
              <td className="px-3 py-2 whitespace-nowrap">{s.user.name}</td>
              <td className="px-3 py-2 whitespace-nowrap">{s.user.company}</td>
              <td className="px-3 py-2 whitespace-nowrap">{s.site.name} <span className="text-gray-400">({s.site.site_id})</span></td>
              <td className="px-3 py-2 whitespace-nowrap">{s.activity_type}</td>
              <td className="px-3 py-2 whitespace-nowrap">{s.severity}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatDistanceToNow(new Date(s.checked_in_at), { addSuffix: true })}</td>
              <td className="px-3 py-2 whitespace-nowrap">{formatDistanceToNow(new Date(s.checked_in_at))}</td>
              <td className={`px-3 py-2 whitespace-nowrap font-medium ${statusColor(s)}`}>
                {differenceInMinutes(new Date(), new Date(s.checked_in_at)) > s.expected_duration * 60
                  ? t("overdue") : t("active")}
              </td>
              <td className="px-3 py-2">
                {(s.user.id === user?.id || user?.role === "noc_handler") && (
                  <button
                    onClick={() => handleCheckout(s.id)}
                    className="text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-lg"
                  >
                    {t("check_out")}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ActiveSessionsTable.jsx
git commit -m "feat: active sessions table with overdue status and checkout button"
```

---

## Task 9: Dashboard Page

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`

- [ ] **Step 1: Write Dashboard.jsx**

```jsx
import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { listSites } from "../api/sites"
import { listCheckins } from "../api/checkins"
import SiteMap from "../components/SiteMap"
import ActiveSessionsTable from "../components/ActiveSessionsTable"
import { useWebSocket } from "../hooks/useWebSocket"

export default function Dashboard() {
  const { t } = useTranslation()
  const [sites, setSites] = useState([])
  const [activeSessions, setActiveSessions] = useState([])

  const refresh = useCallback(async () => {
    const [s, sessions] = await Promise.all([
      listSites(),
      listCheckins({ status: "active", limit: 100 }),
    ])
    setSites(s)
    setActiveSessions(sessions)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // Refresh on any WebSocket event (new check-in or check-out)
  useWebSocket(() => refresh())

  return (
    <div className="p-4 max-w-6xl mx-auto space-y-6">
      <h2 className="text-lg font-bold dark:text-white">
        {t("dashboard")}
        <span className="ms-2 text-sm font-normal text-gray-400">
          {t("active")}: {activeSessions.length}
        </span>
      </h2>
      <SiteMap sites={sites} activeSessions={activeSessions} />
      <h3 className="font-semibold dark:text-white">{t("active_sessions")}</h3>
      <ActiveSessionsTable sessions={activeSessions} onRefresh={refresh} />
    </div>
  )
}
```

- [ ] **Step 2: Test in browser**

Navigate to `/`. Map should render Lebanon. No active sessions yet — table shows "Active: 0".

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Dashboard.jsx
git commit -m "feat: live dashboard with Lebanon map and active sessions table"
```

---

## Task 10: Check-In Form Page

**Files:**
- Modify: `frontend/src/pages/CheckIn.jsx`

- [ ] **Step 1: Write CheckIn.jsx**

```jsx
import { useState, useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { useAuth } from "../hooks/useAuth"
import { useGeolocation } from "../hooks/useGeolocation"
import { listSites } from "../api/sites"
import { createCheckin, listCheckins, checkout } from "../api/checkins"

const schema = z.object({
  site_id: z.number({ required_error: "Select a site" }),
  activity_type: z.string().min(1),
  severity: z.string().min(1),
  affected_sites: z.array(z.string()).default([]),
  expected_duration: z.coerce.number().min(0.5),
  is_planned_outage: z.boolean().default(false),
  is_routine_maintenance: z.boolean().default(false),
  notes: z.string().optional(),
})

export default function CheckIn() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { detect, loading: gpsLoading, nearest } = useGeolocation()
  const [allSites, setAllSites] = useState([])
  const [siteSearch, setSiteSearch] = useState("")
  const [myActiveSession, setMyActiveSession] = useState(null)
  const [success, setSuccess] = useState("")

  const { register, handleSubmit, setValue, watch, control, reset, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { affected_sites: [], is_planned_outage: false, is_routine_maintenance: false },
  })

  useEffect(() => {
    listSites().then(setAllSites)
    listCheckins({ status: "active" }).then((sessions) => {
      const mine = sessions.find((s) => s.user.id === user?.id)
      setMyActiveSession(mine || null)
    })
  }, [user])

  const filteredSites = allSites.filter(
    (s) =>
      s.name.toLowerCase().includes(siteSearch.toLowerCase()) ||
      s.site_id.toLowerCase().includes(siteSearch.toLowerCase())
  )

  const selectSite = (site) => {
    setValue("site_id", site.id, { shouldValidate: true })
    setSiteSearch(site.name)
  }

  const onSubmit = async (data) => {
    await createCheckin(data)
    setSuccess("✅ Checked in successfully")
    reset()
    setSiteSearch("")
    listCheckins({ status: "active" }).then((sessions) => {
      const mine = sessions.find((s) => s.user.id === user?.id)
      setMyActiveSession(mine || null)
    })
  }

  const handleCheckout = async () => {
    if (!myActiveSession) return
    await checkout(myActiveSession.id)
    setMyActiveSession(null)
    setSuccess("✅ Checked out successfully")
  }

  const ACTIVITY_TYPES = ["Maintenance", "Emergency", "Inspection", "Installation", "Other"]
  const SEVERITIES = ["Low", "Medium", "High", "Critical"]

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-lg font-bold dark:text-white mb-4">{t("check_in")}</h2>

      {/* Active session banner */}
      {myActiveSession && (
        <div className="bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium dark:text-orange-200">
            🔧 {t("active")}: {myActiveSession.site.name} ({myActiveSession.site.site_id})
          </p>
          <button
            onClick={handleCheckout}
            className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm"
          >
            {t("check_out")}
          </button>
        </div>
      )}

      {success && <p className="text-green-600 text-sm mb-3">{success}</p>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-white dark:bg-gray-900 rounded-2xl p-6 shadow">

        {/* Site search */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("site")}</label>
          <div className="flex gap-2">
            <input
              value={siteSearch}
              onChange={(e) => setSiteSearch(e.target.value)}
              placeholder={t("search_site")}
              className="flex-1 border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <button
              type="button"
              onClick={detect}
              disabled={gpsLoading}
              className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-lg whitespace-nowrap"
            >
              {gpsLoading ? "…" : "📍 " + t("detect_nearest")}
            </button>
          </div>
          {/* Dropdown */}
          {siteSearch && filteredSites.length > 0 && (
            <ul className="border rounded-lg mt-1 max-h-40 overflow-y-auto dark:bg-gray-800 dark:border-gray-700">
              {(nearest.length ? nearest : filteredSites).slice(0, 8).map((s) => (
                <li
                  key={s.id}
                  onClick={() => selectSite(s)}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 dark:hover:bg-gray-700 dark:text-gray-200"
                >
                  {s.name} <span className="text-gray-400">({s.site_id})</span>
                  {"distance_km" in s && (
                    <span className="text-xs text-blue-500 ms-1">{s.distance_km.toFixed(1)} km</span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {errors.site_id && <p className="text-red-500 text-xs mt-1">{errors.site_id.message}</p>}
        </div>

        {/* Activity type */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("activity_type")}</label>
          <select {...register("activity_type")}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
            <option value="">—</option>
            {ACTIVITY_TYPES.map((a) => <option key={a} value={a}>{t(a.toLowerCase())}</option>)}
          </select>
          {errors.activity_type && <p className="text-red-500 text-xs mt-1">{errors.activity_type.message}</p>}
        </div>

        {/* Severity */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("severity")}</label>
          <select {...register("severity")}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
            <option value="">—</option>
            {SEVERITIES.map((s) => <option key={s} value={s}>{t(s.toLowerCase())}</option>)}
          </select>
          {errors.severity && <p className="text-red-500 text-xs mt-1">{errors.severity.message}</p>}
        </div>

        {/* Affected sites */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("affected_sites")}</label>
          <Controller
            name="affected_sites"
            control={control}
            render={({ field }) => (
              <select
                multiple
                value={field.value}
                onChange={(e) => field.onChange(Array.from(e.target.selectedOptions, (o) => o.value))}
                className="w-full border rounded-lg px-3 py-2 text-sm h-28 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              >
                {allSites.map((s) => (
                  <option key={s.site_id} value={s.site_id}>{s.name} ({s.site_id})</option>
                ))}
              </select>
            )}
          />
        </div>

        {/* Expected duration */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("expected_duration")}</label>
          <input
            type="number"
            step="0.5"
            min="0.5"
            {...register("expected_duration")}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          {errors.expected_duration && <p className="text-red-500 text-xs mt-1">{errors.expected_duration.message}</p>}
        </div>

        {/* Toggles */}
        {[
          ["is_planned_outage", "planned_outage"],
          ["is_routine_maintenance", "routine_maintenance"],
        ].map(([field, label]) => (
          <label key={field} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" {...register(field)}
              className="w-4 h-4 rounded accent-blue-600" />
            <span className="text-sm dark:text-gray-300">{t(label)}</span>
          </label>
        ))}

        {/* Notes */}
        <div>
          <label className="block text-sm mb-1 dark:text-gray-300">{t("notes")}</label>
          <textarea
            {...register("notes")}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !!myActiveSession}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
        >
          {isSubmitting ? "…" : t("submit")}
        </button>
        {myActiveSession && (
          <p className="text-xs text-center text-orange-500">{t("active")}: {t("check_out")} first</p>
        )}
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/CheckIn.jsx
git commit -m "feat: check-in form with site search, GPS nearest, and check-out banner"
```

---

## Task 11: History Page

**Files:**
- Modify: `frontend/src/pages/History.jsx`

- [ ] **Step 1: Write History.jsx**

```jsx
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { format } from "date-fns"
import { listCheckins, exportCSV } from "../api/checkins"
import { listSites } from "../api/sites"

const ACTIVITY_TYPES = ["", "Maintenance", "Emergency", "Inspection", "Installation", "Other"]
const SEVERITIES = ["", "Low", "Medium", "High", "Critical"]

export default function History() {
  const { t } = useTranslation()
  const [records, setRecords] = useState([])
  const [sites, setSites] = useState([])
  const [filters, setFilters] = useState({
    status: "", employee: "", site_id: "", region: "",
    activity_type: "", severity: "", company: "",
    is_planned_outage: "", is_routine_maintenance: "",
    date_from: "", date_to: "",
  })
  const [page, setPage] = useState(0)

  useEffect(() => { listSites().then(setSites) }, [])

  useEffect(() => {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, v]) => v !== "")
    )
    params.skip = page * 50
    params.limit = 50
    listCheckins(params).then(setRecords)
  }, [filters, page])

  const setFilter = (key, val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(0) }

  const handleExport = async () => {
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ""))
    const blob = await exportCSV(params)
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "checkins.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold dark:text-white">{t("history")}</h2>
        <button onClick={handleExport}
          className="text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg">
          {t("export_csv")}
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <input placeholder={t("employee")} value={filters.employee}
          onChange={(e) => setFilter("employee", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        <select value={filters.site_id} onChange={(e) => setFilter("site_id", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">{t("site")}</option>
          {sites.map((s) => <option key={s.site_id} value={s.site_id}>{s.name}</option>)}
        </select>
        <select value={filters.activity_type} onChange={(e) => setFilter("activity_type", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">{t("activity_type")}</option>
          {ACTIVITY_TYPES.filter(Boolean).map((a) => <option key={a}>{a}</option>)}
        </select>
        <select value={filters.severity} onChange={(e) => setFilter("severity", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">{t("severity")}</option>
          {SEVERITIES.filter(Boolean).map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={filters.status} onChange={(e) => setFilter("status", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">{t("status")}</option>
          <option value="active">{t("active")}</option>
          <option value="completed">{t("completed")}</option>
        </select>
        <select value={filters.company} onChange={(e) => setFilter("company", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white">
          <option value="">{t("company")}</option>
          <option value="Touch">{t("touch")}</option>
          <option value="subcontractor">{t("subcontractor")}</option>
        </select>
        <input type="date" value={filters.date_from} onChange={(e) => setFilter("date_from", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
        <input type="date" value={filters.date_to} onChange={(e) => setFilter("date_to", e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white" />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border dark:border-gray-700">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
            <tr>
              {[t("employee"), t("company"), t("site"), t("activity_type"), t("severity"),
                t("checked_in_at"), t("checked_out_at"), t("status")].map((h) => (
                <th key={h} className="px-3 py-2 text-start font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {records.map((r) => (
              <tr key={r.id} className="dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-2 whitespace-nowrap">{r.user.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.user.company}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.site.name}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.activity_type}</td>
                <td className="px-3 py-2 whitespace-nowrap">{r.severity}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.checked_in_at ? format(new Date(r.checked_in_at), "dd/MM/yy HH:mm") : "—"}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {r.checked_out_at ? format(new Date(r.checked_out_at), "dd/MM/yy HH:mm") : "—"}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${r.checked_out_at ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                    {r.checked_out_at ? t("completed") : t("active")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex gap-3 justify-center mt-4">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
          className="text-sm px-3 py-1 border rounded disabled:opacity-40 dark:border-gray-600 dark:text-white">←</button>
        <span className="text-sm dark:text-gray-400">Page {page + 1}</span>
        <button disabled={records.length < 50} onClick={() => setPage((p) => p + 1)}
          className="text-sm px-3 py-1 border rounded disabled:opacity-40 dark:border-gray-600 dark:text-white">→</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/History.jsx
git commit -m "feat: history page with filters, pagination, and CSV export"
```

---

## Task 12: Help Page + ContactCard

**Files:**
- Modify: `frontend/src/pages/Help.jsx`
- Create: `frontend/src/components/ContactCard.jsx`

- [ ] **Step 1: Write components/ContactCard.jsx**

```jsx
import { useTranslation } from "react-i18next"

export default function ContactCard({ contact }) {
  const { t } = useTranslation()
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-5 flex flex-col gap-2">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold dark:text-white">{contact.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{contact.role}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          contact.company === "Touch"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
            : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
        }`}>
          {contact.company}
        </span>
      </div>
      <a
        href={`tel:${contact.phone}`}
        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        📞 {contact.phone}
      </a>
      {contact.email && (
        <a href={`mailto:${contact.email}`} className="text-xs text-gray-500 hover:underline dark:text-gray-400">
          {contact.email}
        </a>
      )}
      {contact.shift && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("shift")}: {contact.shift}
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write pages/Help.jsx**

```jsx
import { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import { listContacts } from "../api/contacts"
import ContactCard from "../components/ContactCard"

export default function Help() {
  const { t } = useTranslation()
  const [contacts, setContacts] = useState([])
  const [filter, setFilter] = useState("")

  useEffect(() => { listContacts().then(setContacts) }, [])

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.role.toLowerCase().includes(filter.toLowerCase()) ||
      c.company.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-lg font-bold dark:text-white mb-4">{t("help")}</h2>
      <input
        placeholder="Search by name, role, company…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full border rounded-lg px-3 py-2 text-sm mb-4 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filtered.map((c) => <ContactCard key={c.id} contact={c} />)}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ContactCard.jsx frontend/src/pages/Help.jsx
git commit -m "feat: Help page with contact cards and click-to-call"
```

---

## Task 13: Import Page (NOC Handler Only)

**Files:**
- Modify: `frontend/src/pages/Import.jsx`
- Create: `frontend/src/components/ImportPreviewTable.jsx`

- [ ] **Step 1: Write components/ImportPreviewTable.jsx**

```jsx
export default function ImportPreviewTable({ preview }) {
  if (!preview) return null
  return (
    <div className="overflow-x-auto rounded-xl border dark:border-gray-700 mt-3">
      <p className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800">
        Showing first {preview.rows.length} of {preview.total_rows} rows
      </p>
      <table className="w-full text-xs">
        <thead className="bg-gray-100 dark:bg-gray-800">
          <tr>
            {preview.headers.map((h) => (
              <th key={h} className="px-3 py-2 text-start font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          {preview.rows.map((row, i) => (
            <tr key={i} className="dark:text-gray-300">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 whitespace-nowrap">{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 2: Write pages/Import.jsx**

```jsx
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { previewSites, confirmSites, previewEmployees, confirmEmployees } from "../api/imports"
import ImportPreviewTable from "../components/ImportPreviewTable"

function ImportSection({ title, onPreview, onConfirm }) {
  const { t } = useTranslation()
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [mode, setMode] = useState("skip")
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handlePreview = async () => {
    if (!file) return
    setLoading(true)
    try {
      const p = await onPreview(file)
      setPreview(p)
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!file) return
    setLoading(true)
    try {
      const r = await onConfirm(file, mode)
      setResult(r)
      setPreview(null)
      setFile(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow p-6 space-y-4">
      <h3 className="font-semibold dark:text-white">{title}</h3>

      <div className="flex gap-3 items-center flex-wrap">
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => { setFile(e.target.files[0]); setPreview(null); setResult(null) }}
          className="text-sm dark:text-gray-300"
        />
        <button onClick={handlePreview} disabled={!file || loading}
          className="bg-blue-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
          {loading ? "…" : t("preview")}
        </button>
      </div>

      <ImportPreviewTable preview={preview} />

      {preview && (
        <div className="flex gap-3 items-center flex-wrap">
          <label className="text-sm dark:text-gray-300 flex items-center gap-2">
            <input type="radio" value="skip" checked={mode === "skip"} onChange={() => setMode("skip")} />
            {t("skip_existing")}
          </label>
          <label className="text-sm dark:text-gray-300 flex items-center gap-2">
            <input type="radio" value="update" checked={mode === "update"} onChange={() => setMode("update")} />
            {t("update_existing")}
          </label>
          <button onClick={handleConfirm} disabled={loading}
            className="bg-green-600 text-white text-sm px-4 py-2 rounded-lg disabled:opacity-50">
            {loading ? "…" : t("confirm_import")}
          </button>
        </div>
      )}

      {result && (
        <p className="text-sm text-green-600 dark:text-green-400">
          ✅ Inserted: {result.inserted} · Updated: {result.updated} · Skipped: {result.skipped}
        </p>
      )}
    </div>
  )
}

export default function Import() {
  const { t } = useTranslation()
  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <h2 className="text-lg font-bold dark:text-white">{t("import")}</h2>
      <ImportSection
        title="Sites Excel (site_id, name, region, latitude, longitude)"
        onPreview={previewSites}
        onConfirm={confirmSites}
      />
      <ImportSection
        title="Employees Excel (name, role, phone, email, company)"
        onPreview={previewEmployees}
        onConfirm={confirmEmployees}
      />
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/pages/Import.jsx frontend/src/components/ImportPreviewTable.jsx
git commit -m "feat: import page with Excel preview and confirm flow"
```

---

## Task 14: End-to-End Frontend Smoke Test

- [ ] **Step 1: Start backend**

```bash
cd noc-tracker/backend
uvicorn backend.main:app --reload --port 8000
```

- [ ] **Step 2: Start frontend**

```bash
cd noc-tracker/frontend
npm run dev
```

- [ ] **Step 3: Golden path walkthrough**

1. Visit `http://localhost:5173` → redirected to `/login`
2. Click Register → enter a name **not** in DB → expect "name not in approved list" error
3. Go to backend: import employees Excel first via `POST /api/import/employees/confirm`
4. Return to Register, enter matching name → account created
5. Login → redirected to Dashboard → Lebanon map renders, active sessions = 0
6. Navigate to Check In → search for a site → submit form → success message
7. Dashboard → map shows flashing red marker on that site, table shows active session
8. Check Out → marker returns to blue, session moves to History
9. Notification bell → shows check-in and check-out notifications with unread count
10. Help → contact cards from imported employees (click-to-call links)
11. Import (as NOC handler) → upload sites.xlsx → preview table → confirm → success

- [ ] **Step 4: Verify dark mode + Arabic**

Toggle dark mode → UI switches to dark theme (persists on refresh).
Toggle language to Arabic → all labels switch to Arabic, layout becomes RTL.

- [ ] **Step 5: Run Vitest**

```bash
npm run test
```

Expected: no failures (smoke level — deep tests added iteratively).

- [ ] **Step 6: Final commit**

```bash
git add frontend/
git commit -m "feat: frontend complete — all pages, dark mode, bilingual EN/AR"
```

---

## Frontend Complete

All frontend tasks done. Confirm when ready for `PLANNING-deployment.md`.
