'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
}

interface PaymentsTableProps {
    payments: PaymentWithHomeowner[]
}

const FEE_TYPE_LABELS: Record<string, string> = {
    annual_dues: 'Annual Dues',
    car_sticker: 'Car Sticker',
    monthly_dues: 'Monthly Dues',
}

export function PaymentsTable({ payments }: PaymentsTableProps) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [rejectDialog, setRejectDialog] = useState<string | null>(null) // payment id
    const [rejectNotes, setRejectNotes] = useState('')
    const router = useRouter()

    const callVerify = async (paymentId: string, action: 'verified' | 'rejected', adminNotes?: string) => {
        setProcessingId(paymentId)
        try {
            const res = await fetch(`/api/admin/payments/${paymentId}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action, adminNotes }),
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

    const handleVerify = (id: string) => callVerify(id, 'verified')

    const handleRejectConfirm = () => {
        if (!rejectDialog) return
        callVerify(rejectDialog, 'rejected', rejectNotes.trim() || undefined)
        setRejectDialog(null)
        setRejectNotes('')
    }

    return (
        <>
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#F8FAFC] text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Homeowner</th>
                                <th className="px-6 py-4">Payment For</th>
                                <th className="px-6 py-4">Amount</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Proof</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {payments.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        No pending payments found.
                                    </td>
                                </tr>
                            ) : (
                                payments.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(p.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            {p.homeowners ? (
                                                <>
                                                    <div className="font-semibold text-slate-900">
                                                        {p.homeowners.first_name} {p.homeowners.last_name}
                                                    </div>
                                                    <div className="text-xs text-slate-500">
                                                        Block {p.homeowners.block} Lot {p.homeowners.lot}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-slate-400 italic">Unknown</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="font-medium">
                                                {FEE_TYPE_LABELS[p.fee_type] || p.fee_type.replace(/_/g, ' ')}
                                            </span>
                                            <span className="text-slate-400 ml-1 text-xs">({p.fee_year})</span>
                                        </td>
                                        <td className="px-6 py-4 font-mono font-medium text-slate-700">
                                            {formatCurrency(p.amount)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant="outline" className="capitalize text-xs">
                                                {p.payment_method?.replace(/_/g, ' ') || '—'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
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
                                        <td className="px-6 py-4 text-right">
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
                                                    onClick={() => handleVerify(p.id)}
                                                    disabled={!!processingId}
                                                    className="p-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center min-w-[32px]"
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
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Reject Dialog */}
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
