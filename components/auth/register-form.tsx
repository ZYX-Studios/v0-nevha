// Registration form component — with phone-validation dialog for existing-email flow

"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { Eye, EyeOff, UserPlus, Phone, ShieldCheck } from "lucide-react"

interface RegisterFormProps {
  onSuccess?: () => void
  onSwitchToLogin?: () => void
}

export function RegisterForm({ onSuccess, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const { register, isLoading } = useAuth()

  // Phone validation dialog state (shown when email already exists in homeowners DB)
  const [phoneDialogOpen, setPhoneDialogOpen] = useState(false)
  const [phoneLast4, setPhoneLast4] = useState("")
  const [phoneVerifying, setPhoneVerifying] = useState(false)
  const [phoneError, setPhoneError] = useState("")
  const [phoneVerified, setPhoneVerified] = useState<{ maskedPhone: string; firstName: string } | null>(null)
  const [pendingRegistration, setPendingRegistration] = useState<typeof formData | null>(null)

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    const isValidPhone = (phone: string) => phone.replace(/\D/g, "").length >= 10

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError("Please fill in all required fields")
      return
    }
    if (!isValidEmail(formData.email)) {
      setError("Please enter a valid email address")
      return
    }
    if (formData.phone && !isValidPhone(formData.phone)) {
      setError("Please enter a valid phone number (at least 10 digits)")
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      return
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone || undefined,
      password: formData.password,
    })

    if (result.success) {
      onSuccess?.()
    } else if (
      result.error?.toLowerCase().includes("already registered") ||
      result.error?.toLowerCase().includes("already in use") ||
      result.error?.toLowerCase().includes("user already exists")
    ) {
      // Email exists in system — start phone-validation flow
      setPendingRegistration(formData)
      setPhoneLast4("")
      setPhoneError("")
      setPhoneVerified(null)
      setPhoneDialogOpen(true)
    } else {
      setError(result.error || "Registration failed")
    }
  }

  /** Step 2: user enters last 4 digits of their registered phone */
  const handlePhoneVerify = async () => {
    if (!/^\d{4}$/.test(phoneLast4)) {
      setPhoneError("Enter exactly 4 digits")
      return
    }
    setPhoneVerifying(true)
    setPhoneError("")
    try {
      const res = await fetch("/api/auth/verify-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pendingRegistration?.email, phone_last4: phoneLast4 }),
      })
      const data = await res.json()
      if (!res.ok || !data.valid) {
        setPhoneError(data.message || "Phone number does not match our records")
      } else {
        setPhoneVerified({ maskedPhone: data.maskedPhone, firstName: data.firstName })
      }
    } catch {
      setPhoneError("Verification failed. Please try again.")
    } finally {
      setPhoneVerifying(false)
    }
  }

  /** Step 3: proceed with registration after phone validated */
  const handleProceedAfterValidation = async () => {
    if (!pendingRegistration) return
    setPhoneDialogOpen(false)
    // The Supabase signup will fail because the email exists —
    // we instead show a message directing the user to log in.
    // (The homeowner record is already linked; they just need to reset password or login.)
    onSwitchToLogin?.()
  }

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="bg-secondary rounded-full p-3">
              <UserPlus className="h-6 w-6 text-secondary-foreground" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
            <CardDescription>Join your HOA community</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="john.doe@email.com"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={formData.password}
                  onChange={(e) => handleChange("password", e.target.value)}
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChange={(e) => handleChange("confirmPassword", e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full h-12 text-base font-medium" disabled={isLoading}>
              {isLoading ? "Creating Account..." : "Create Account"}
            </Button>

            {onSwitchToLogin && (
              <div className="text-center">
                <Button type="button" variant="link" onClick={onSwitchToLogin} className="text-sm">
                  Already have an account? Sign in
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* ── Phone Validation Dialog ──────────────────────────────────────────── */}
      <Dialog open={phoneDialogOpen} onOpenChange={setPhoneDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <div className="flex justify-center mb-2">
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center">
                {phoneVerified ? (
                  <ShieldCheck className="w-6 h-6 text-green-500" />
                ) : (
                  <Phone className="w-6 h-6 text-blue-600" />
                )}
              </div>
            </div>
            <DialogTitle className="text-center">
              {phoneVerified ? "Identity Verified" : "Membership Record Found"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {phoneVerified
                ? `Welcome back, ${phoneVerified.firstName}! Your record has been located.`
                : "This email is associated with an existing membership record. To protect your account, please verify your identity."}
            </DialogDescription>
          </DialogHeader>

          {!phoneVerified ? (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="phone_last4">
                  Last 4 digits of your registered phone number
                </Label>
                <Input
                  id="phone_last4"
                  type="tel"
                  inputMode="numeric"
                  maxLength={4}
                  placeholder="e.g. 8901"
                  value={phoneLast4}
                  onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  className="text-center text-xl tracking-widest font-mono"
                />
                {phoneError && (
                  <p className="text-sm text-red-500">{phoneError}</p>
                )}
              </div>
              <Button
                className="w-full"
                onClick={handlePhoneVerify}
                disabled={phoneVerifying || phoneLast4.length !== 4}
              >
                {phoneVerifying ? "Verifying…" : "Verify Identity"}
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Don&apos;t remember your phone number? Contact the NEVHA admin office for assistance.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="bg-blue-50 rounded-xl p-4 text-sm space-y-1">
                <p className="font-semibold text-slate-900">Your account is on file.</p>
                <p className="text-slate-600">
                  Registered phone: <span className="font-mono">{phoneVerified.maskedPhone}</span>
                </p>
                <p className="text-slate-500 text-xs mt-2">
                  Since this email is already in our system, please sign in using the same email and your chosen password. If you don&apos;t have a password yet, use &ldquo;Forgot Password&rdquo; to set one.
                </p>
              </div>
              <Button className="w-full" onClick={handleProceedAfterValidation}>
                Go to Sign In
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
