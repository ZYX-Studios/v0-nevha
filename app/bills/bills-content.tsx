
"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, Wallet, CreditCard, History, ChevronRight, Download, FileText, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { format } from "date-fns"

import { PaymentModal } from "@/components/payments/payment-modal"
import { Payment, PaymentQrCode, HoaDuesConfig } from "@/lib/types"

interface BillsContentProps {
    initialPayments: Payment[]
    qrCodes: PaymentQrCode[]
    config: HoaDuesConfig | null
    homeownerId: string
    approvedVehicles: {
        id: string
        vehicle_type: string
        plate_number: string
        sticker_price: number | null
    }[]
}

export function BillsContent({ initialPayments, qrCodes, config, homeownerId, approvedVehicles }: BillsContentProps) {
    const [payments, setPayments] = useState<Payment[]>(initialPayments)
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false)

    // Calculate total paid? Or maybe fetch total due from somewhere else?
    // For now, hardcode or use data if available.
    const totalDue = config?.annual_amount || 0; // Placeholder logic

    const handlePaymentSuccess = (newPayment?: Payment) => {
        if (newPayment) {
            setPayments([newPayment, ...payments])
        }
        // Could also revalidation or fetch fresh data
    }

    return (
        <div className="min-h-screen bg-[#F2F2F7] font-sans pb-20">

            <PaymentModal
                isOpen={isPaymentModalOpen}
                onClose={() => setIsPaymentModalOpen(false)}
                qrCodes={qrCodes}
                config={config}
                homeownerId={homeownerId}
                onSuccess={handlePaymentSuccess}
                approvedVehicles={approvedVehicles}
            />

            {/* Header */}
            <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 -ml-2">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <h1 className="text-[17px] font-semibold text-slate-900">My Bills</h1>
                </div>
                <Button variant="ghost" size="icon" className="text-blue-600">
                    <History className="w-5 h-5" />
                </Button>
            </header>

            <main className="px-4 py-6 max-w-md mx-auto space-y-6">

                {/* 1. Outstanding Balance Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#007AFF] to-[#5856D6] p-6 text-white shadow-[0_20px_40px_-12px_rgba(0,122,255,0.5)]"
                >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col justify-between h-[160px]">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-3 py-1.5 rounded-full">
                                <Wallet className="w-4 h-4 text-white" />
                                <span className="text-xs font-semibold tracking-wide uppercase">Annual Dues</span>
                            </div>
                            <img src="/NEVHA logo.svg" alt="Logo" className="w-8 h-8 opacity-50 grayscale brightness-200" />
                        </div>

                        <div>
                            <h2 className="text-[36px] font-bold tracking-tight leading-none">₱{totalDue.toLocaleString()}</h2>
                            <p className="text-white/80 text-sm font-medium mt-1">For Year {config?.dues_year || new Date().getFullYear()}</p>
                        </div>

                        <Button
                            onClick={() => setIsPaymentModalOpen(true)}
                            className="w-full bg-white text-blue-600 hover:bg-white/90 font-bold rounded-xl shadow-lg border-0"
                        >
                            Pay Now
                        </Button>
                    </div>
                </motion.div>

                {/* 2. Available Payment Methods */}
                <section>
                    <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Payment Methods</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {qrCodes.map((qr) => (
                            <div key={qr.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3 opacity-80">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${qr.payment_method === 'gcash' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-500'}`}>
                                    {qr.payment_method === 'gcash' ? <CreditCard className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                                </div>
                                <span className="text-sm font-bold text-slate-800 capitalize">{qr.label || qr.payment_method.replace('_', ' ')}</span>
                            </div>
                        ))}
                        {qrCodes.length === 0 && (
                            <div className="col-span-2 text-sm text-slate-400 italic text-center py-2">
                                No online payment methods available.
                            </div>
                        )}
                    </div>
                </section>

                {/* 3. Recent Transactions (History) */}
                <section>
                    <div className="flex items-center justify-between mb-3 px-1">
                        <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Payment History</h3>
                        <Button variant="ghost" size="sm" className="h-auto p-0 text-blue-600 text-[13px] font-semibold" onClick={() => setIsPaymentModalOpen(true)}>
                            <Plus className="w-3 h-3 mr-1" /> New Payment
                        </Button>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm divide-y divide-slate-100 min-h-[100px]">
                        {payments.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">
                                No payment history found.
                            </div>
                        ) : (
                            payments.map((t, i) => (
                                <motion.div
                                    key={t.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="p-4 flex items-center justify-between group cursor-pointer hover:bg-slate-50 transition-colors first:rounded-t-2xl last:rounded-b-2xl"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${t.status === 'pending' ? 'bg-orange-50 text-orange-500' : t.status === 'verified' ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="text-[15px] font-semibold text-slate-900 capitalize">
                                                {t.fee_type.replace('_', ' ')} {t.fee_year}
                                            </h4>
                                            <p className="text-[12px] text-slate-500">
                                                {format(new Date(t.created_at), 'MMM dd, yyyy')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`block text-[15px] font-bold ${t.status === 'pending' ? 'text-orange-600' : 'text-slate-900'}`}>
                                            ₱{Number(t.amount).toLocaleString()}
                                        </span>
                                        <div className="flex items-center justify-end gap-1 mt-0.5">
                                            <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${t.status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
                                                t.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                    'bg-orange-100 text-orange-700'
                                                }`}>
                                                {t.status}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}

                        {payments.length > 5 && (
                            <div className="p-3 text-center">
                                <button className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-center w-full gap-1">
                                    View Full History <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </section>

            </main>
        </div>
    )
}
