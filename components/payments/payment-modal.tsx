
"use client"

import { useState, useRef, useMemo } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Upload, Check, ChevronRight, ChevronLeft, Car, Home, Plus, Trash2 } from "lucide-react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { compressPaymentProof } from "@/lib/image-compression"
import type { PaymentQrCode, HoaDuesConfig } from "@/lib/types"

/* ── Types ─────────────────────────────────────────────────────── */

interface PaymentModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    homeownerId: string
    qrCodes: PaymentQrCode[]
    config: HoaDuesConfig | null
    carStickerPrice?: number
    approvedVehicles?: {
        id: string
        vehicle_type: string
        plate_number: string
        sticker_price: number | null
    }[]
}

interface LineItem {
    id: string
    feeType: "annual_dues" | "car_sticker"
    vehicleRequestId: string
}

type Step = "items" | "payment" | "proof" | "success"

/* ── Helpers ───────────────────────────────────────────────────── */

function makeItem(): LineItem {
    return { id: crypto.randomUUID(), feeType: "annual_dues", vehicleRequestId: "" }
}

/* ── Component ─────────────────────────────────────────────────── */

export function PaymentModal({
    isOpen,
    onClose,
    onSuccess,
    homeownerId,
    qrCodes,
    config,
    carStickerPrice,
    approvedVehicles = [],
}: PaymentModalProps) {
    const [step, setStep] = useState<Step>("items")
    const [lineItems, setLineItems] = useState<LineItem[]>([makeItem()])
    const [method, setMethod] = useState(qrCodes[0]?.payment_method || "gcash")
    const [file, setFile] = useState<File | null>(null)
    const [isCompressing, setIsCompressing] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [error, setError] = useState("")
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Price lookups — Supabase returns numeric columns as strings, so force Number()
    const duesAmount = Number(config?.annual_amount) || 0
    const stickerPrice = Number(config?.car_sticker_price) || Number(carStickerPrice) || 200
    const currentYear = Number(config?.dues_year) || new Date().getFullYear()

    const getItemPrice = (li: LineItem) => {
        if (li.feeType === "car_sticker") {
            const v = approvedVehicles.find(v => v.id === li.vehicleRequestId)
            return v?.sticker_price ?? stickerPrice
        }
        return duesAmount
    }

    const totalAmount = useMemo(
        () => lineItems.reduce((sum, li) => sum + Number(getItemPrice(li)), 0),
        [lineItems, duesAmount, stickerPrice]
    )

    // Deduplicate payment methods from configured QR codes
    const availableMethods = Array.from(new Set(qrCodes.map(qr => qr.payment_method)))
    const activeQr = qrCodes.find(qr => qr.payment_method === method)

    // ── Item mutations ────────────────────────────────────────────
    const updateItem = (id: string, patch: Partial<LineItem>) =>
        setLineItems(prev => prev.map(li => (li.id === id ? { ...li, ...patch } : li)))
    const removeItem = (id: string) =>
        setLineItems(prev => (prev.length > 1 ? prev.filter(li => li.id !== id) : prev))

    // ── Navigation ────────────────────────────────────────────────
    const handleNext = () => {
        setError("")
        if (step === "items") {
            // Validate car sticker items have a vehicle selected (if vehicles exist)
            for (const li of lineItems) {
                if (li.feeType === "car_sticker" && approvedVehicles.length > 0 && !li.vehicleRequestId) {
                    setError("Please select a vehicle for each car sticker item")
                    return
                }
            }
            setStep("payment")
        } else if (step === "payment") {
            setStep("proof")
        }
    }

    const handleBack = () => {
        setError("")
        if (step === "payment") setStep("items")
        else if (step === "proof") setStep("payment")
    }

    // ── File handling ─────────────────────────────────────────────
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            try {
                setIsCompressing(true)
                const compressed = await compressPaymentProof(e.target.files[0])
                setFile(compressed)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setIsCompressing(false)
            }
        }
    }

    // ── Submit ────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!file) { setError("Please upload a proof of payment"); return }

        try {
            setIsUploading(true)

            // 1. Upload proof
            const formData = new FormData()
            formData.append("file", file)
            formData.append("homeownerId", homeownerId)
            const uploadRes = await fetch("/api/payments/upload-proof", { method: "POST", body: formData })
            const uploadData = await uploadRes.json()
            if (!uploadRes.ok) throw new Error(uploadData.error || "Upload failed")

            // 2. Create a payment row per item
            for (const li of lineItems) {
                const paymentRes = await fetch("/api/payments", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        homeownerId,
                        feeType: li.feeType,
                        feeYear: currentYear,
                        amount: getItemPrice(li),
                        paymentMethod: method,
                        proofUrl: uploadData.url,
                        proofFileId: uploadData.fileId,
                        ...(li.vehicleRequestId ? { vehicleRequestId: li.vehicleRequestId } : {}),
                    }),
                })
                const paymentData = await paymentRes.json()
                if (!paymentRes.ok) throw new Error(paymentData.error || "Payment submission failed")
            }

            setStep("success")
            setTimeout(() => { onSuccess(); onClose() }, 2000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsUploading(false)
        }
    }

    // ── Reset on close ────────────────────────────────────────────
    const handleClose = () => {
        setStep("items")
        setLineItems([makeItem()])
        setMethod("gcash")
        setFile(null)
        setError("")
        onClose()
    }

    if (!isOpen) return null

    /* ── Render ─────────────────────────────────────────────────── */
    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 40 }}
                className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] mb-[env(safe-area-inset-bottom)] sm:mb-0"
            >
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                    <h2 className="text-lg font-bold text-slate-800">
                        {step === "success" ? "Success" : "Make a Payment"}
                    </h2>
                    <Button variant="ghost" size="icon" onClick={handleClose} className="rounded-full hover:bg-slate-100">
                        <X className="w-5 h-5 text-slate-500" />
                    </Button>
                </div>

                {/* Step indicator */}
                {step !== "success" && (
                    <div className="px-5 pt-3 pb-1 flex gap-1.5">
                        {(["items", "payment", "proof"] as const).map((s, i) => (
                            <div
                                key={s}
                                className={`h-1 flex-1 rounded-full transition-colors ${i <= ["items", "payment", "proof"].indexOf(step)
                                    ? "bg-blue-500"
                                    : "bg-slate-200"
                                    }`}
                            />
                        ))}
                    </div>
                )}

                {/* Content */}
                <div className="p-5 flex-1 overflow-y-auto">
                    <AnimatePresence mode="wait">

                        {/* ═══ Step: Items ═══ */}
                        {step === "items" && (
                            <motion.div
                                key="items"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-3"
                            >
                                <p className="text-sm text-slate-500 font-medium">What are you paying for?</p>

                                {lineItems.map(li => (
                                    <div key={li.id} className="bg-slate-50 rounded-2xl border border-slate-100 p-4 space-y-3">
                                        {/* Fee type selector */}
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => updateItem(li.id, { feeType: "annual_dues", vehicleRequestId: "" })}
                                                className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${li.feeType === "annual_dues"
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-slate-200 hover:border-blue-200"
                                                    }`}
                                            >
                                                <Home className={`w-5 h-5 ${li.feeType === "annual_dues" ? "text-blue-600" : "text-slate-400"}`} />
                                                <span className="text-sm font-bold text-slate-800">Dues</span>
                                            </button>
                                            <button
                                                onClick={() => updateItem(li.id, { feeType: "car_sticker" })}
                                                className={`flex-1 flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${li.feeType === "car_sticker"
                                                    ? "border-blue-500 bg-blue-50"
                                                    : "border-slate-200 hover:border-blue-200"
                                                    }`}
                                            >
                                                <Car className={`w-5 h-5 ${li.feeType === "car_sticker" ? "text-blue-600" : "text-slate-400"}`} />
                                                <span className="text-sm font-bold text-slate-800">Sticker</span>
                                            </button>
                                            {lineItems.length > 1 && (
                                                <button
                                                    onClick={() => removeItem(li.id)}
                                                    className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Vehicle selector for car sticker */}
                                        {li.feeType === "car_sticker" && approvedVehicles.length > 0 && (
                                            <select
                                                value={li.vehicleRequestId}
                                                onChange={e => updateItem(li.id, { vehicleRequestId: e.target.value })}
                                                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">— Select vehicle —</option>
                                                {approvedVehicles.map(v => (
                                                    <option key={v.id} value={v.id}>
                                                        {v.vehicle_type} · {v.plate_number}
                                                    </option>
                                                ))}
                                            </select>
                                        )}

                                        {/* Auto-filled price */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400 font-medium">
                                                {li.feeType === "annual_dues" ? `Annual Dues ${currentYear}` : "Car Sticker Fee"}
                                            </span>
                                            <span className="text-base font-bold text-slate-900 tabular-nums">
                                                ₱{getItemPrice(li).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                    </div>
                                ))}

                                {/* Add item */}
                                <button
                                    onClick={() => setLineItems(prev => [...prev, makeItem()])}
                                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-colors"
                                >
                                    <Plus className="w-4 h-4" /> Add Another Item
                                </button>

                                {/* Total */}
                                <div className="bg-slate-900 rounded-2xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase font-semibold text-slate-400 tracking-wide">Total</p>
                                        <p className="text-sm text-slate-300">
                                            {lineItems.length} item{lineItems.length > 1 ? "s" : ""}
                                        </p>
                                    </div>
                                    <p className="text-2xl font-bold text-white tabular-nums">
                                        ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">{error}</div>
                                )}
                            </motion.div>
                        )}

                        {/* ═══ Step: Payment Method ═══ */}
                        {step === "payment" && (
                            <motion.div
                                key="payment"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                {/* Total recap */}
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <p className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Total Amount</p>
                                    <p className="text-3xl font-black text-slate-900">
                                        ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {lineItems.map(li => li.feeType === "annual_dues" ? "Dues" : "Sticker").join(" + ")}
                                    </p>
                                </div>

                                {/* Method selector — dynamic from configured QR codes */}
                                <div className="space-y-2">
                                    <p className="text-sm font-semibold text-slate-600">Select Payment Method</p>
                                    {availableMethods.length > 0 ? (
                                        <div className={`grid gap-3 ${availableMethods.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                            {availableMethods.map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setMethod(m)}
                                                    className={`p-3.5 rounded-xl border-2 flex flex-col items-center justify-center gap-1 transition-all ${method === m
                                                            ? "border-blue-500 bg-blue-50 text-blue-700"
                                                            : "border-slate-200 hover:border-blue-200"
                                                        }`}
                                                >
                                                    <span className="font-bold text-sm capitalize">{m.replace(/_/g, ' ')}</span>
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-yellow-50 text-yellow-700 text-sm rounded-xl text-center">
                                            No payment methods configured. Please contact admin.
                                        </div>
                                    )}
                                </div>

                                {/* QR Code */}
                                {activeQr ? (
                                    <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 flex flex-col items-center text-center shadow-sm">
                                        <p className="font-bold text-slate-800 mb-2">{activeQr.label}</p>
                                        <div className="relative w-48 h-48 bg-slate-100 rounded-lg mb-3 overflow-hidden">
                                            <Image
                                                src={activeQr.qr_image_url}
                                                alt="QR Code"
                                                fill
                                                className="object-cover"
                                            />
                                        </div>
                                        <p className="text-sm font-medium text-slate-600">{activeQr.account_name}</p>
                                        <p className="text-sm font-bold text-slate-900 tracking-wider">{activeQr.account_number}</p>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-yellow-50 text-yellow-700 text-sm rounded-xl text-center">
                                        No QR code available for this method. Please contact admin.
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ═══ Step: Proof Upload ═══ */}
                        {step === "proof" && (
                            <motion.div
                                key="proof"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-5"
                            >
                                <div className="text-center">
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full h-52 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors"
                                    >
                                        {file ? (
                                            <div className="relative w-full h-full p-2">
                                                {file.type.startsWith("image/") ? (
                                                    <Image
                                                        src={URL.createObjectURL(file)}
                                                        alt="Proof"
                                                        fill
                                                        className="object-contain rounded-xl"
                                                    />
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center h-full">
                                                        <Check className="w-10 h-10 text-green-500 mb-2" />
                                                        <p className="text-sm font-medium text-slate-700">{file.name}</p>
                                                    </div>
                                                )}
                                                {isCompressing && (
                                                    <div className="absolute inset-0 bg-white/50 flex items-center justify-center backdrop-blur-sm">
                                                        <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <>
                                                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                                                <p className="text-sm font-bold text-slate-600">Tap to upload proof</p>
                                                <p className="text-xs text-slate-400 mt-1">Screenshots or photos</p>
                                            </>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                    <p className="text-xs text-slate-400 mt-3">
                                        Please upload a clear screenshot of your transaction receipt.
                                    </p>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl text-center">{error}</div>
                                )}
                            </motion.div>
                        )}

                        {/* ═══ Step: Success ═══ */}
                        {step === "success" && (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex flex-col items-center justify-center py-10 text-center space-y-4"
                            >
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-2">
                                    <Check className="w-10 h-10 text-green-600" />
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">Payment Sent!</h3>
                                <p className="text-slate-500 max-w-[260px]">
                                    Your {lineItems.length > 1 ? `${lineItems.length} payments are` : "payment is"} pending verification. Check your History for updates.
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                {step !== "success" && (
                    <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3">
                        {step !== "items" && (
                            <Button variant="outline" onClick={handleBack} className="flex-1 h-12 rounded-xl font-bold">
                                <ChevronLeft className="w-4 h-4 mr-1" /> Back
                            </Button>
                        )}
                        {step === "proof" ? (
                            <Button
                                onClick={handleSubmit}
                                disabled={isUploading || !file}
                                className="flex-[2] h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20"
                            >
                                {isUploading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : `Submit ${lineItems.length > 1 ? `${lineItems.length} Payments` : "Payment"}`}
                            </Button>
                        ) : (
                            <Button onClick={handleNext} className="flex-[2] h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20">
                                Next <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        )}
                    </div>
                )}
            </motion.div>
        </div>
    )
}
