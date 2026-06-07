import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { useEffect } from "react"
import { AuthProvider, useAuth } from "./hooks/useAuth"
import { usePushNotifications } from "./hooks/usePushNotifications"
import Navbar from "./components/Navbar"
import Login from "./pages/Login"
import Register from "./pages/Register"
import Dashboard from "./pages/Dashboard"
import CheckIn from "./pages/CheckIn"
import History from "./pages/History"
import Help from "./pages/Help"
import Import from "./pages/Import"
import Admin from "./pages/Admin"
import Chat from "./pages/Chat"

function PrivateRoute({ children, requireNoc = false, requireAdmin = false }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>
  if (!user) return <Navigate to="/login" replace />
  if (requireNoc && user.role !== "noc_handler") return <Navigate to="/" replace />
  if (requireAdmin && user.role !== "admin") return <Navigate to="/" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  usePushNotifications(user)

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
          <Route path="/import" element={<PrivateRoute requireAdmin><Import /></PrivateRoute>} />
          <Route path="/admin" element={<PrivateRoute requireAdmin><Admin /></PrivateRoute>} />
          <Route path="/chat" element={<PrivateRoute><Chat /></PrivateRoute>} />
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
