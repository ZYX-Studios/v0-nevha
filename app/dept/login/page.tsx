"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff, Building2, LogIn, AlertCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { motion } from "framer-motion"

interface DeptItem { id: string; name: string }

export default function DeptLoginPage() {
  const router = useRouter()
  const [departments, setDepartments] = useState<DeptItem[]>([])
  const [departmentId, setDepartmentId] = useState("")
  const [password, setPassword] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const savedName = localStorage.getItem("dept_display_name") || ""
    if (savedName) setDisplayName(savedName)

    fetch("/api/dept/departments", { cache: "no-store" })
      .then(r => r.json())
      .then(j => setDepartments(Array.isArray(j.items) ? j.items : []))
      .catch(() => toast.error("Failed to load departments"))
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (!departmentId) { setError("Please select a department"); return }
    if (!password) { setError("Please enter the portal password"); return }
    if (!displayName.trim()) { setError("Please enter your name for the audit trail"); return }

    setLoading(true)
    try {
      const res = await fetch("/api/dept/session/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ department_id: departmentId, password }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Login failed")
      localStorage.setItem("dept_display_name", displayName.trim())
      router.replace("/dept/issues")
    } catch (e: any) {
      setError(e?.message || "Login failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-sm"
      >
        {/* Glass card */}
        <div className="bg-white/[0.06] backdrop-blur-2xl border border-white/10 rounded-3xl p-7 shadow-2xl">
          {/* Icon + branding */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-14 h-14 bg-blue-500/20 border border-blue-400/30 rounded-2xl flex items-center justify-center">
              <Building2 className="w-7 h-7 text-blue-300" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white tracking-tight">Department Portal</h1>
              <p className="text-sm text-white/50 mt-0.5">NEVHA Issue Management</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Department picker */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/60">Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger className="h-11 bg-white/10 border-white/10 text-white rounded-xl focus:ring-white/20 focus:border-white/30">
                  <SelectValue placeholder="Select your department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/60">Portal Password</Label>
              <div className="relative">
                <Input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-11 pr-10 bg-white/10 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-white/30"
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="absolute inset-y-0 right-0 h-full text-white/50 hover:text-white"
                  onClick={() => setShowPwd(s => !s)}
                  aria-label={showPwd ? "Hide password" : "Show password"}
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Display name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-white/60">Your name (for audit trail)</Label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g., Jane D."
                required
                className="h-11 bg-white/10 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:border-white/30"
              />
            </div>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-400/20 rounded-xl"
              >
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">{error}</p>
              </motion.div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full h-11 gap-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white font-semibold shadow-lg shadow-blue-500/25 mt-2"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-5">
          Northfields Executive Village Homeowners Association
        </p>
      </motion.div>
    </div>
  )
}
