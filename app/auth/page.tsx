"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Eye, EyeOff, ArrowRight, User, Mail, Lock, Phone, ArrowLeft, MapPin, Shield, Globe, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/hooks/use-auth"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AuthMode = "login" | "register"

/** Generate month options */
const MONTHS = [
  { value: "01", label: "January" }, { value: "02", label: "February" },
  { value: "03", label: "March" }, { value: "04", label: "April" },
  { value: "05", label: "May" }, { value: "06", label: "June" },
  { value: "07", label: "July" }, { value: "08", label: "August" },
  { value: "09", label: "September" }, { value: "10", label: "October" },
  { value: "11", label: "November" }, { value: "12", label: "December" },
]

/** Generate year options (current year down to 1980) */
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: currentYear - 1979 }, (_, i) => String(currentYear - i))

const WIZARD_STEPS = [
  { title: "Personal Info", subtitle: "Tell us about yourself" },
  { title: "Your Address", subtitle: "Where do you live in the village?" },
  { title: "Contact & Details", subtitle: "How can we reach you?" },
  { title: "Create Password", subtitle: "Secure your account" },
]

export default function AuthPage() {
  const { session, login, register, isLoading, registrationStatus } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Auth State
  const [mode, setMode] = useState<AuthMode>("login")
  const [regStep, setRegStep] = useState(0) // Wizard step (0-indexed)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    middleInitial: "",
    suffix: "",
    phone: "",
    block: "",
    lot: "",
    phase: "",
    street: "",
    moveInMonth: "",
    moveInYear: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    facebookProfile: "",
    confirmPassword: ""
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  // Redirect Logic
  const redirectParam = searchParams.get("redirect")
  const fromLogout = searchParams.get("logout") === "1"
  const isSafeRedirect = !!redirectParam && redirectParam.startsWith("/") && !redirectParam.startsWith("//")
  const isDev = process.env.NODE_ENV !== "production"

  const defaultRedirect = (session.user && ["admin", "staff"].includes(String(session.user.role))) ? "/admin" : "/"
  const redirectTo = isSafeRedirect ? (redirectParam as string) : defaultRedirect
  const fallbackRedirect = isSafeRedirect ? (redirectParam as string) : ((session.user && ["admin", "staff"].includes(String(session.user.role))) ? "/admin" : "/")

  // Initial Mode
  useEffect(() => {
    const modeParam = searchParams.get("mode")
    if (modeParam === "register") setMode("register")
  }, [searchParams])

  // Session Check & Redirect
  useEffect(() => {
    const ready = isDev ? session.isAuthenticated : (session.isAuthenticated && session.user)
    if (ready && !fromLogout) {
      if (registrationStatus === 'pending') {
        console.log("[auth-page] pending registration -> redirect /onboarding")
        router.replace('/onboarding')
        return
      }
      console.log("[auth-page] session ready -> redirect", { redirectTo })
      router.replace(redirectTo)
    }
  }, [isDev, fromLogout, session.isAuthenticated, session.user, router, redirectTo, registrationStatus])

  // Logout Cleanup
  const didLogoutCleanup = useRef(false)
  useEffect(() => {
    if (!fromLogout || didLogoutCleanup.current) return
    didLogoutCleanup.current = true
      ; (async () => {
        try {
          await fetch("/api/auth/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ access_token: null, refresh_token: null }),
          })
        } catch (e) { console.error(e) }
      })()
  }, [fromLogout])

  const handleAuthSuccess = () => {
    if (registrationStatus === 'pending') {
      router.replace('/onboarding')
      return
    }

    router.replace(redirectTo)

    // Fallback for safety
    setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname.startsWith("/auth")) {
        if (registrationStatus === 'pending') {
          window.location.replace('/onboarding')
        } else {
          window.location.replace(fallbackRedirect)
        }
      }
    }, 1000)
  }

  /* ── Validation helpers ────────────────────────────────────────── */
  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const isValidPhone = (phone: string) => phone.replace(/\D/g, "").length >= 10

  /** Per-step validation for the wizard. Returns error string or null. */
  const validateStep = (step: number): string | null => {
    switch (step) {
      case 0: // Personal Info
        if (!formData.firstName.trim() || !formData.lastName.trim()) return "First name and last name are required"
        return null
      case 1: // Address
        if (!formData.block.trim() || !formData.lot.trim() || !formData.phase.trim()) return "Block, Lot, and Phase are required"
        if (!formData.street.trim()) return "Street is required"
        return null
      case 2: // Contact & Details
        if (!formData.email.trim()) return "Email is required"
        if (!isValidEmail(formData.email)) return "Please enter a valid email address"
        if (!formData.phone.trim()) return "Phone number is required"
        if (!isValidPhone(formData.phone)) return "Please enter a valid phone number (at least 10 digits)"
        if (!formData.moveInMonth || !formData.moveInYear) return "Move-in month and year are required"
        if (!formData.emergencyContactName.trim()) return "Emergency contact name is required"
        if (!formData.emergencyContactPhone.trim()) return "Emergency contact phone is required"
        if (!formData.facebookProfile.trim()) return "Facebook profile link is required"
        return null
      case 3: // Security
        if (!formData.password) return "Password is required"
        if (formData.password.length < 6) return "Password must be at least 6 characters"
        if (formData.password !== formData.confirmPassword) return "Passwords do not match"
        return null
      default:
        return null
    }
  }

  const handleNextStep = () => {
    const err = validateStep(regStep)
    if (err) { setError(err); return }
    setError("")
    setRegStep(s => s + 1)
  }

  const handlePrevStep = () => {
    setError("")
    setRegStep(s => Math.max(0, s - 1))
  }

  /** Final submission handler for both login and wizard last step */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (mode === "login") {
      if (!formData.email || !formData.password) { setError("Please fill in all fields"); return }
      if (!isValidEmail(formData.email)) { setError("Please enter a valid email address"); return }
      const res = await login(formData.email, formData.password)
      if (res.success) handleAuthSuccess()
      else setError(res.error || "Login failed")
    } else {
      // Final step validation
      const err = validateStep(regStep)
      if (err) { setError(err); return }

      // Also validate all previous steps (safety net)
      for (let i = 0; i < WIZARD_STEPS.length; i++) {
        const stepErr = validateStep(i)
        if (stepErr) { setRegStep(i); setError(stepErr); return }
      }

      // Compose move-in date as YYYY-MM-01
      const moveInDate = formData.moveInMonth && formData.moveInYear
        ? `${formData.moveInYear}-${formData.moveInMonth}-01`
        : undefined

      const res = await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        middleInitial: formData.middleInitial || undefined,
        suffix: formData.suffix || undefined,
        phone: formData.phone,
        block: formData.block,
        lot: formData.lot,
        phase: formData.phase,
        street: formData.street,
        moveInDate,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        facebookProfile: formData.facebookProfile,
      })
      if (res.success) handleAuthSuccess()
      else setError(res.error || "Registration failed")
    }
  }

  if ((isDev && session.isAuthenticated) || (session.isAuthenticated && session.user)) {
    return null
  }

  /* ── Wizard step renderers ─────────────────────────────────────── */
  const f = formData
  const set = (key: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [key]: e.target.value })

  const renderWizardStep = (step: number) => {
    switch (step) {
      case 0: // Personal Info
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">First Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="John" value={f.firstName} onChange={set("firstName")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Last Name *</label>
                <Input className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="Doe" value={f.lastName} onChange={set("lastName")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">M.I. <span className="text-slate-400 font-normal normal-case">(opt)</span></label>
                <Input className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="A." maxLength={5} value={f.middleInitial} onChange={set("middleInitial")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Suffix <span className="text-slate-400 font-normal normal-case">(opt)</span></label>
                <Input className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="Jr., Sr., III" maxLength={10} value={f.suffix} onChange={set("suffix")} />
              </div>
            </div>
          </div>
        )

      case 1: // Address
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Block *</label>
                <Input className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="Blk" value={f.block} onChange={set("block")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Lot *</label>
                <Input className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="Lot" value={f.lot} onChange={set("lot")} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Phase *</label>
                <Input className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="Ph" value={f.phase} onChange={set("phase")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Street *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="e.g., Orchid St." value={f.street} onChange={set("street")} />
              </div>
            </div>
          </div>
        )

      case 2: // Contact & Details
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input type="email" className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="name@example.com" value={f.email} onChange={set("email")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Phone *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input type="tel" className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="0917 123 4567" value={f.phone} onChange={set("phone")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Facebook Profile *</label>
              <div className="relative">
                <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="https://facebook.com/yourprofile" value={f.facebookProfile} onChange={set("facebookProfile")} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Move-in Date *</label>
              <div className="grid grid-cols-2 gap-3">
                <Select value={f.moveInMonth} onValueChange={v => setFormData({ ...formData, moveInMonth: v })}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={f.moveInYear} onValueChange={v => setFormData({ ...formData, moveInYear: v })}>
                  <SelectTrigger className="h-11 bg-slate-50 border-slate-200 rounded-xl">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Emergency Contact *</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <Input className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="Contact Name" value={f.emergencyContactName} onChange={set("emergencyContactName")} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Emergency Phone *</label>
                <Input className="h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="0917 123 4567" value={f.emergencyContactPhone} onChange={set("emergencyContactPhone")} />
              </div>
            </div>
          </div>
        )

      case 3: // Security
        return (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  className="pl-9 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                  placeholder="••••••••"
                  value={f.password}
                  onChange={set("password")}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Confirm Password *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                  placeholder="••••••••"
                  value={f.confirmPassword}
                  onChange={set("confirmPassword")}
                />
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const isLastWizardStep = regStep === WIZARD_STEPS.length - 1

  return (
    <div className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-4 font-sans selection:bg-blue-100">
      <Link href="/" className="absolute top-8 left-8 p-3 bg-white/50 backdrop-blur-md rounded-full border border-white/50 text-slate-400 hover:text-slate-900 transition-all shadow-sm active:scale-95 z-20">
        <ArrowLeft className="w-5 h-5" />
      </Link>
      {/* Background Decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/80 to-transparent"></div>
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[420px] relative z-10"
      >
        {/* Glassmorphic Card */}
        <div className="bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2rem] p-8 md:p-10">

          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="relative group mb-5">
              <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
              <Image
                src="/NEVHA logo.svg"
                alt="NEVHA Logo"
                width={80}
                height={80}
                className="w-20 h-20 rounded-2xl relative z-10 shadow-sm"
              />
            </div>
            {mode === "login" ? (
              <>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight text-center">Welcome Back</h1>
                <p className="text-[15px] text-slate-500 font-medium mt-2 text-center max-w-[240px]">
                  Sign in to access your secure community portal
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center">
                  {WIZARD_STEPS[regStep].title}
                </h1>
                <p className="text-[14px] text-slate-500 font-medium mt-1.5 text-center max-w-[280px]">
                  {WIZARD_STEPS[regStep].subtitle}
                </p>
                {/* Step indicator */}
                <div className="flex items-center gap-2 mt-4">
                  {WIZARD_STEPS.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${i === regStep ? "w-8 bg-blue-600" : i < regStep ? "w-4 bg-blue-300" : "w-4 bg-slate-200"
                        }`}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 mt-2 font-semibold">
                  Step {regStep + 1} of {WIZARD_STEPS.length}
                </p>
              </>
            )}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {error && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <Alert variant="destructive" className="bg-red-50 text-red-600 border-red-100 rounded-xl">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            {mode === "login" ? (
              /* ── Login Form ──────────────────────────────────────── */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input type="email" className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="name@example.com" value={f.email} onChange={set("email")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <Input type={showPassword ? "text" : "password"} className="pl-9 pr-10 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all" placeholder="••••••••" value={f.password} onChange={set("password")} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end pt-1">
                  <Link href="/auth/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
                    Forgot Password?
                  </Link>
                </div>
                <Button
                  type="button"
                  onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                  className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2"
                  disabled={isLoading}
                >
                  {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Sign In <ArrowRight className="w-4 h-4" /></>}
                </Button>
              </div>
            ) : (
              /* ── Registration Wizard ─────────────────────────────── */
              <div className="space-y-5">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={regStep}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                  >
                    {renderWizardStep(regStep)}
                  </motion.div>
                </AnimatePresence>

                {/* Wizard navigation */}
                <div className="flex items-center gap-3 pt-2">
                  {regStep > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handlePrevStep}
                      className="h-12 rounded-xl flex-1 font-bold gap-1"
                    >
                      <ChevronLeft className="w-4 h-4" /> Back
                    </Button>
                  )}
                  {isLastWizardStep ? (
                    <Button
                      type="button"
                      onClick={(e) => handleSubmit(e as unknown as React.FormEvent)}
                      className="h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 flex-1"
                      disabled={isLoading}
                    >
                      {isLoading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Create Account <ArrowRight className="w-4 h-4" /></>}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={handleNextStep}
                      className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 flex-1"
                    >
                      Continue <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </form>

          {/* Toggle */}
          <div className="mt-8 pt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              {mode === "login" ? "New resident?" : "Already have an account?"}
              <button
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login")
                  setRegStep(0)
                  setError("")
                }}
                className="ml-1.5 text-blue-600 font-bold hover:text-blue-700 transition-colors"
              >
                {mode === "login" ? "Register now" : "Log in"}
              </button>
            </p>
          </div>
        </div>

        {mode === "login" && (
          <p className="mt-8 text-center text-[11px] text-slate-400 font-medium opacity-60">
            Note: Admins will be redirected to the secure dashboard.
          </p>
        )}
      </motion.div>
    </div>
  )
}
