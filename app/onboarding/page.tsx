"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Upload, Check, FileText, BadgeCheck, Loader2, Clock, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from "@/hooks/use-auth"
import { uploadOnboardingDoc } from "./actions"
import { createClient } from "@/lib/supabase/client"

export default function OnboardingPage() {
    const { session, registrationStatus, isInitializing, hasDocuments } = useAuth()
    const router = useRouter()
    const [step, setStep] = useState(1)

    // Upload States
    const [uploading, setUploading] = useState(false)
    const [uploadStatus, setUploadStatus] = useState({ id: false, proof: false })

    // Redirect if already approved
    useEffect(() => {
        if (registrationStatus === 'approved') {
            router.replace('/')
        }
    }, [registrationStatus, router])

    const handleUpload = async (file: File, type: "id" | "proof_of_residence") => {
        setUploading(true)
        const formData = new FormData()
        formData.append("file", file)
        formData.append("type", type)

        const res = await uploadOnboardingDoc(formData)
        setUploading(false)

        if (res.success) {
            setUploadStatus(prev => ({ ...prev, [type === "id" ? "id" : "proof"]: true }))
        } else {
            alert(res.error || "Upload failed")
        }
    }

    if (isInitializing || hasDocuments === null) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-slate-500">Loading your profile...</p>
            </div>
        )
    }

    if (!session.user) {
        router.replace('/auth')
        return null
    }

    // ── Documents already submitted → show "Review in Progress" ──────
    if (hasDocuments || step === 2) {
        return (
            <div className="w-full max-w-md space-y-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center p-8 bg-white/50 rounded-3xl border border-white/60"
                >
                    <div className="w-20 h-20 bg-yellow-50 rounded-full flex items-center justify-center mb-6">
                        <Clock className="w-10 h-10 text-yellow-500" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900 mb-2">Review in Progress</h2>
                    <p className="text-center text-slate-500 mb-4">
                        Your documents have been submitted and are being reviewed by our admin team.
                    </p>
                    <p className="text-center text-sm text-slate-400 mb-8">
                        This usually takes 24-72 hours. You&apos;ll receive an email once your account is approved.
                    </p>
                    <Button variant="outline" onClick={() => router.push('/')} className="gap-2">
                        <ArrowLeft className="w-4 h-4" />
                        Back to Home
                    </Button>
                </motion.div>
            </div>
        )
    }

    // ── No documents yet → show upload form ──────────────────────────
    return (
        <div className="w-full max-w-md space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold text-slate-900">Welcome to NEVHA</h1>
                <p className="text-slate-500">
                    Please verify your residency to access the full community portal.
                </p>
            </div>

            <div className="space-y-4">
                {/* ID Upload Card */}
                <Card className="p-6 border-slate-200 bg-white/80 backdrop-blur shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${uploadStatus.id ? "bg-green-100 text-green-600" : "bg-blue-50 text-blue-600"}`}>
                            {uploadStatus.id ? <Check className="w-6 h-6" /> : <BadgeCheck className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 space-y-1">
                            <h3 className="font-semibold text-slate-900">Government ID</h3>
                            <p className="text-sm text-slate-500">Upload a valid ID matching your registration name.</p>

                            {!uploadStatus.id && (
                                <div className="mt-3">
                                    <input
                                        type="file"
                                        id="id-upload"
                                        className="hidden"
                                        accept="image/*,.pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleUpload(file, "id")
                                        }}
                                        disabled={uploading}
                                    />
                                    <label
                                        htmlFor="id-upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                                    >
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        Upload ID
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                {/* Proof of Residence Card */}
                <Card className="p-6 border-slate-200 bg-white/80 backdrop-blur shadow-sm">
                    <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${uploadStatus.proof ? "bg-green-100 text-green-600" : "bg-blue-50 text-blue-600"}`}>
                            {uploadStatus.proof ? <Check className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 space-y-1">
                            <h3 className="font-semibold text-slate-900">Proof of Residence</h3>
                            <p className="text-sm text-slate-500">Utility bill, Title, or Deed of Sale (max 5MB).</p>

                            {!uploadStatus.proof && (
                                <div className="mt-3">
                                    <input
                                        type="file"
                                        id="proof-upload"
                                        className="hidden"
                                        accept="image/*,.pdf"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) handleUpload(file, "proof_of_residence")
                                        }}
                                        disabled={uploading}
                                    />
                                    <label
                                        htmlFor="proof-upload"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg cursor-pointer hover:bg-slate-800 transition-colors"
                                    >
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        Upload Document
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </Card>

                <Button
                    className="w-full h-12 text-lg font-bold"
                    disabled={!uploadStatus.id || !uploadStatus.proof}
                    onClick={() => setStep(2)}
                >
                    Submit for Review
                </Button>
            </div>
        </div>
    )
}
