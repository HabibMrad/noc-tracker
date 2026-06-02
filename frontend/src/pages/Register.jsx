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
      const detail = err.response?.data?.detail || ""
      if (detail.toLowerCase().includes("not in approved")) setError(t("name_not_approved"))
      else setError(detail || "Registration failed")
    }
  }

  const field = (key, label, type = "text", autoComplete = "") => (
    <div key={key}>
      <label className="block text-sm mb-1 dark:text-gray-300">{label}</label>
      <input
        type={type}
        {...register(key)}
        autoComplete={autoComplete}
        className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 transition"
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
