'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, Car, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AdminVehicleRequest } from '@/app/admin/vehicles/actions'

interface Props {
    requests: AdminVehicleRequest[]
}

const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    rejected: 'bg-red-100 text-red-700 border-red-200',
}

/** Vehicle request verification tab for the unified Verifications page. */
export function VerificationsVehicles({ requests }: Props) {
    const router = useRouter()
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Approve flow
    const [approveDialog, setApproveDialog] = useState<AdminVehicleRequest | null>(null)
    const [stickerCode, setStickerCode] = useState('')

    // Reject flow
    const [rejectDialog, setRejectDialog] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    const handleApprove = async () => {
        if (!approveDialog) return
        const code = stickerCode.trim()
        if (!code) { toast.error('Enter a sticker code'); return }

        setProcessingId(approveDialog.id)
        try {
            const res = await fetch(`/api/admin/vehicles/${approveDialog.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stickerCode: code }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Approval failed')
            toast.success('Vehicle request approved')
            window.dispatchEvent(new CustomEvent('admin-counts-refresh'))
            setApproveDialog(null)
            router.refresh()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async () => {
        if (!rejectDialog) return
        setProcessingId(rejectDialog)
        try {
            const res = await fetch(`/api/admin/vehicles/${rejectDialog}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason.trim() }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Rejection failed')
            toast.success('Vehicle request rejected')
            window.dispatchEvent(new CustomEvent('admin-counts-refresh'))
            setRejectDialog(null)
            router.refresh()
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setProcessingId(null)
        }
    }

    const pendingOnly = requests.filter(r => r.status === 'pending')

    if (pendingOnly.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Car className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-600">No pending vehicle requests</p>
                <p className="text-xs text-slate-400 mt-1">All submissions have been reviewed.</p>
            </div>
        )
    }

    return (
        <>
            <div className="space-y-3">
                {pendingOnly.map((req) => {
                    const name = req.profiles
                        ? `${req.profiles.first_name} ${req.profiles.last_name}`
                        : 'Unknown'
                    const isProcessing = processingId === req.id

                    return (
                        <div
                            key={req.id}
                            className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                        >
                            <div className="flex-1 min-w-0 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-900">{name}</span>
                                    <Badge
                                        variant="outline"
                                        className={`text-xs capitalize ${STATUS_STYLES[req.status] ?? ''}`}
                                    >
                                        {req.status}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                                    <span className="capitalize">{req.vehicle_type}</span>
                                    <span className="font-mono uppercase">{req.plate_number}</span>
                                    {req.sticker_price && (
                                        <span>₱{Number(req.sticker_price).toLocaleString()}</span>
                                    )}
                                    {req.profiles?.email && (
                                        <span className="truncate max-w-[200px]">{req.profiles.email}</span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400">
                                    Submitted {new Date(req.created_at).toLocaleDateString()}
                                </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => { setRejectDialog(req.id); setRejectReason('') }}
                                    disabled={isProcessing}
                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Reject"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => { setApproveDialog(req); setStickerCode('') }}
                                    disabled={isProcessing}
                                    className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg text-xs font-semibold transition-colors disabled:opacity-70 flex items-center gap-1.5"
                                >
                                    {isProcessing ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Check className="w-3.5 h-3.5" />
                                    )}
                                    Approve
                                </button>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Approve Dialog */}
            <Dialog open={!!approveDialog} onOpenChange={() => setApproveDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Approve Vehicle Request</DialogTitle>
                        <DialogDescription>
                            Assign a sticker code to complete approval.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <Label htmlFor="sticker-code">Sticker Code</Label>
                        <Input
                            id="sticker-code"
                            placeholder="e.g. NV-2025-001"
                            value={stickerCode}
                            onChange={(e) => setStickerCode(e.target.value.toUpperCase())}
                            className="font-mono uppercase"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialog(null)}>Cancel</Button>
                        <Button onClick={handleApprove} disabled={!!processingId || !stickerCode.trim()}>
                            {processingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Approve
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Reject Vehicle Request</DialogTitle>
                        <DialogDescription>
                            Optionally provide a reason for rejection.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="e.g. Plate number doesn't match OR/CR document."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={3}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleReject} disabled={!!processingId}>
                            {processingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Reject
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
