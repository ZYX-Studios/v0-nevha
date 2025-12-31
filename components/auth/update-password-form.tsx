"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Lock } from "lucide-react"
import { useRouter } from "next/navigation"

export function UpdatePasswordForm() {
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")

        if (password !== confirmPassword) {
            setError("Passwords do not match")
            return
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }

        setLoading(true)

        try {
            const supabase = createClient()
            const { error } = await supabase.auth.updateUser({
                password: password,
            })

            if (error) {
                throw error
            }

            // If successful, redirect to admin dashboard or home
            // Depending on where they should go. Usually admin dashboard.
            router.push("/admin?password_updated=true")
        } catch (err: any) {
            setError(err.message || "Failed to update password")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Card className="w-full max-w-md mx-auto bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 shadow-2xl">
            <CardHeader className="text-center space-y-4">
                <div className="flex justify-center">
                    <div className="bg-orange-500 rounded-full p-3">
                        <Lock className="h-6 w-6 text-white" />
                    </div>
                </div>
                <div>
                    <CardTitle className="text-2xl font-bold text-white">Reset Password</CardTitle>
                    <CardDescription className="text-gray-400">
                        Enter your new password below
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
                        <Label htmlFor="password" className="text-gray-300">
                            New Password
                        </Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter new password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={loading}
                                className="h-12 pr-10 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                                required
                                minLength={6}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={loading}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                    <Eye className="h-4 w-4 text-gray-400" />
                                )}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-gray-300">
                            Confirm Password
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm new password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            disabled={loading}
                            className="h-12 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                            required
                            minLength={6}
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-base font-medium bg-orange-500 hover:bg-orange-600 text-white"
                        disabled={loading}
                    >
                        {loading ? "Updating..." : "Update Password"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
