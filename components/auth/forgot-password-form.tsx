"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Mail, ArrowRight } from "lucide-react"
import Link from "next/link"
import Image from "next/image"

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        const isValidEmail = (email: string) => {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
        }

        if (!isValidEmail(email)) {
            setError("Please enter a valid email address")
            return
        }

        setLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
            })

            if (error) {
                throw error
            }

            setSuccess(true)
        } catch (err: any) {
            setError(err.message || "Failed to send reset email")
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <Card className="w-full max-w-[420px] mx-auto bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2rem] p-8 md:p-10">
                <CardHeader className="text-center space-y-4 p-0 mb-8">
                    <div className="flex justify-center">
                        <div className="inline-flex items-center justify-center bg-green-50 text-green-600 w-16 h-16 rounded-2xl shadow-sm border border-green-100">
                            <Mail className="h-8 w-8" />
                        </div>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tight">Check Your Email</CardTitle>
                        <CardDescription className="text-slate-500 font-medium mt-2">
                            We've sent a password reset link to <br /><span className="text-blue-600 font-bold">{email}</span>
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Button asChild className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                        <Link href="/auth">Back to Login <ArrowRight className="w-4 h-4 ml-1" /></Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-[420px] mx-auto bg-white/80 backdrop-blur-2xl border border-white/60 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] rounded-[2rem] p-8 md:p-10">
            <CardHeader className="text-center p-0 mb-10">
                <div className="flex flex-col items-center">
                    <div className="relative group mb-6">
                        <div className="absolute inset-0 bg-blue-500 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
                        <Image
                            src="/NEVHA logo.svg"
                            alt="NEVHA Logo"
                            width={80}
                            height={80}
                            className="w-20 h-20 rounded-2xl relative z-10 shadow-sm"
                        />
                    </div>
                    <div>
                        <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">Forgot Password</CardTitle>
                        <CardDescription className="text-[15px] text-slate-500 font-medium mt-2 max-w-[240px] mx-auto">
                            Enter your email and we'll send you a link to reset your account.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                        <Alert variant="destructive" className="bg-red-50 text-red-600 border-red-100 rounded-xl">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-1.5">
                        <Label htmlFor="email" className="text-xs font-bold text-slate-700 ml-1 uppercase tracking-wide">
                            Email Address
                        </Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400 font-bold" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={loading}
                                className="pl-9 h-11 bg-slate-50 border-slate-200 focus:bg-white focus:border-blue-500 rounded-xl transition-all"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <Button
                            type="submit"
                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            disabled={loading}
                        >
                            {loading ? (
                                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    Send Reset Link
                                    <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </Button>

                        <div className="text-center pt-2">
                            <Link
                                href="/auth"
                                className="inline-flex items-center text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors"
                            >
                                <ArrowLeft className="mr-2 h-4 w-4" />
                                Back to Login
                            </Link>
                        </div>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
