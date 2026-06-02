import { useState } from "react"
import { useNavigate, Link, useLocation } from "react-router-dom"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { useTranslation } from "react-i18next"
import { useAuth } from "../hooks/useAuth"

const schema = z.object({
  username: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
})

export default function Login() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [error, setError] = useState("")
  const successMsg = location.state?.message || ""
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
        {successMsg && <p className="text-green-600 text-sm mb-3 text-center">{successMsg}</p>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">{t("username")}</label>
            <input
              {...register("username")}
              autoComplete="username"
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
          </div>
          <div>
            <label className="block text-sm mb-1 dark:text-gray-300">{t("password")}</label>
            <input
              type="password"
              {...register("password")}
              autoComplete="current-password"
              className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition"
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
