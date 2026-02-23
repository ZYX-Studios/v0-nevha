'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, FileText, DollarSign, Car } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

interface PaymentWithHomeowner {
    id: string
    created_at: string
    amount: number
    fee_type: string
    fee_year: number
    payment_method: string
    status: string
    proof_url: string | null
    proof_drive_file_id: string | null
    homeowners: {
        first_name: string
        last_name: string
        block: string
        lot: string
    } | null
    vehiclePlate: string | null
    vehicleDesc: string | null
}

interface Props {
    payments: PaymentWithHomeowner[]
}

const FEE_TYPE_LABELS: Record<string, string> = {
    annual_dues: 'Annual Dues',
    car_sticker: 'Car Sticker',
    monthly_dues: 'Monthly Dues',
}

/** Payment verification tab for the unified Verifications page. */
export function VerificationsPayments({ payments }: Props) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [rejectDialog, setRejectDialog] = useState<string | null>(null)
    const [rejectNotes, setRejectNotes] = useState('')
    // Sticker code approval dialog state
    const [approveDialog, setApproveDialog] = useState<PaymentWithHomeowner | null>(null)
    const [stickerCode, setStickerCode] = useState('')
    const [approveNotes, setApproveNotes] = useState('')
    const router = useRouter()

    const callVerify = async (
        paymentId: string,
        action: 'verified' | 'rejected',
        extra?: { adminNotes?: string; stickerCode?: string }
    ) => {
        setProcessingId(paymentId)
        try {
            const res = await fetch(`/api/admin/payments/${paymentId}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    adminNotes: extra?.adminNotes,
                    stickerCode: extra?.stickerCode,
                }),
            })
            const data = await res.json()
            if (!res.ok) {
                toast.error(`Error: ${data.error || 'Unknown error'}`)
            } else {
                toast.success(action === 'verified' ? 'Payment verified' : 'Payment rejected')
                window.dispatchEvent(new CustomEvent('admin-counts-refresh'))
                router.refresh()
            }
        } catch {
            toast.error('Unexpected error. Please try again.')
        } finally {
            setProcessingId(null)
        }
    }

    const handleApproveClick = (p: PaymentWithHomeowner) => {
        if (p.fee_type === 'car_sticker') {
            // Open the sticker code dialog
            setApproveDialog(p)
            setStickerCode('')
            setApproveNotes('')
        } else {
            // Direct approval for non-sticker payments
            callVerify(p.id, 'verified')
        }
    }

    const handleApproveConfirm = () => {
        if (!approveDialog) return
        if (!stickerCode.trim()) {
            toast.error('Please enter a sticker code')
            return
        }
        callVerify(approveDialog.id, 'verified', {
            stickerCode: stickerCode.trim(),
            adminNotes: approveNotes.trim() || undefined,
        })
        setApproveDialog(null)
        setStickerCode('')
        setApproveNotes('')
    }

    const handleRejectConfirm = () => {
        if (!rejectDialog) return
        callVerify(rejectDialog, 'rejected', { adminNotes: rejectNotes.trim() || undefined })
        setRejectDialog(null)
        setRejectNotes('')
    }

    if (payments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <DollarSign className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No pending payments</p>
                <p className="text-xs text-slate-400 mt-1">All payment proofs have been reviewed.</p>
            </div>
        )
    }

    return (
        <>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-5 py-3.5">Date</th>
                                <th className="px-5 py-3.5">Homeowner</th>
                                <th className="px-5 py-3.5">Payment For</th>
                                <th className="px-5 py-3.5">Amount</th>
                                <th className="px-5 py-3.5">Method</th>
                                <th className="px-5 py-3.5">Proof</th>
                                <th className="px-5 py-3.5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {payments.map((p) => (
                                <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-4 text-slate-500 text-xs">
                                        {new Date(p.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-5 py-4">
                                        {p.homeowners ? (
                                            <>
                                                <div className="font-semibold text-slate-900">
                                                    {p.homeowners.first_name} {p.homeowners.last_name}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    Blk {p.homeowners.block} Lot {p.homeowners.lot}
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-slate-400 italic text-xs">Unknown</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div>
                                            <span className="font-medium text-slate-800">
                                                {FEE_TYPE_LABELS[p.fee_type] || p.fee_type.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-slate-400 ml-1.5 text-xs">({p.fee_year})</span>
                                        </div>
                                        {/* Show vehicle info for car sticker payments */}
                                        {p.fee_type === 'car_sticker' && p.vehiclePlate && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <Car className="w-3 h-3 text-slate-400" />
                                                <span className="text-xs text-slate-500 font-medium">
                                                    {p.vehiclePlate}
                                                </span>
                                                {p.vehicleDesc && (
                                                    <span className="text-xs text-slate-400">
                                                        ({p.vehicleDesc})
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 font-mono font-semibold text-slate-700">
                                        {formatCurrency(p.amount)}
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge variant="outline" className="capitalize text-xs">
                                            {p.payment_method?.replace(/_/g, ' ') || '—'}
                                        </Badge>
                                    </td>
                                    <td className="px-5 py-4">
                                        {p.proof_drive_file_id ? (
                                            <a
                                                href={`/api/gdrive-proxy?fileId=${p.proof_drive_file_id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                View Proof
                                            </a>
                                        ) : p.proof_url ? (
                                            <a
                                                href={p.proof_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline text-xs"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                View Proof
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 text-xs italic">No proof</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => { setRejectDialog(p.id); setRejectNotes('') }}
                                                disabled={!!processingId}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                title="Reject"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleApproveClick(p)}
                                                disabled={!!processingId}
                                                className="p-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center min-w-[32px]"
                                                title="Verify"
                                            >
                                                {processingId === p.id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Check className="w-4 h-4" />
                                                )}
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Sticker Code Approval Dialog ──────────────────────── */}
            <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-emerald-700">Verify Car Sticker Payment</DialogTitle>
                        <DialogDescription>
                            Assign a sticker code to approve this payment. A sticker record will be created automatically.
                        </DialogDescription>
                    </DialogHeader>
                    {approveDialog && (
                        <div className="space-y-4">
                            {/* Payment summary */}
                            <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Homeowner</span>
                                    <span className="font-semibold text-slate-800">
                                        {approveDialog.homeowners?.first_name} {approveDialog.homeowners?.last_name}
                                    </span>
                                </div>
                                {approveDialog.vehiclePlate && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Vehicle</span>
                                        <span className="font-semibold text-slate-800">
                                            {approveDialog.vehiclePlate}
                                            {approveDialog.vehicleDesc ? ` (${approveDialog.vehicleDesc})` : ''}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Amount</span>
                                    <span className="font-bold text-slate-900">{formatCurrency(approveDialog.amount)}</span>
                                </div>
                            </div>

                            {/* Sticker code input */}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-semibold">
                                    Sticker Code <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    value={stickerCode}
                                    onChange={(e) => setStickerCode(e.target.value)}
                                    placeholder="e.g. STK-2026-001"
                                    className="font-mono text-sm"
                                    autoFocus
                                />
                            </div>

                            {/* Optional notes */}
                            <div className="space-y-1.5">
                                <Label className="text-sm text-slate-500">Notes (optional)</Label>
                                <Textarea
                                    placeholder="Any notes about this sticker..."
                                    value={approveNotes}
                                    onChange={(e) => setApproveNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={handleApproveConfirm}
                            disabled={!!processingId || !stickerCode.trim()}
                        >
                            {processingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Verify & Create Sticker
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Reject Dialog ─────────────────────────────────────── */}
            <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Reject Payment</DialogTitle>
                        <DialogDescription>
                            Optionally provide a reason. The homeowner will be able to resubmit.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="e.g. Screenshot is blurry, or reference number doesn't match."
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        rows={3}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleRejectConfirm} disabled={!!processingId}>
                            {processingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Reject Payment
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
