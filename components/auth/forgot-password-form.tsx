"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Mail } from "lucide-react"
import Link from "next/link"

export function ForgotPasswordForm() {
    const [email, setEmail] = useState("")
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState("")

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
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
            <Card className="w-full max-w-md mx-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 shadow-2xl">
                <CardHeader className="text-center space-y-4">
                    <div className="flex justify-center">
                        <div className="bg-green-500/10 rounded-full p-3">
                            <Mail className="h-6 w-6 text-green-500" />
                        </div>
                    </div>
                    <div>
                        <CardTitle className="text-2xl font-bold text-white">Check Your Email</CardTitle>
                        <CardDescription className="text-gray-400">
                            We've sent a password reset link to <span className="text-white font-medium">{email}</span>
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Button asChild className="w-full h-12 text-base font-medium bg-gray-800 hover:bg-gray-700 text-white">
                        <Link href="/auth">Back to Login</Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-md mx-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 shadow-2xl">
            <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="bg-orange-500 rounded-full p-3">
                        <Mail className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div>
                    <CardTitle className="text-2xl font-bold text-white">Forgot Password</CardTitle>
                    <CardDescription className="text-gray-400">
                        Enter your email address and we'll send you a link to reset your password
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-300">
                            Email
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="h-12 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-base font-medium bg-orange-500 hover:bg-orange-600 text-white"
                        disabled={loading}
                    >
                        {loading ? "Sending link..." : "Send Reset Link"}
                    </Button>

                    <div className="text-center">
                        <Link
                            href="/auth"
                            className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                        </Link>
                    </div>
                </form>
            </CardContent>
        </Card>
    )
}
