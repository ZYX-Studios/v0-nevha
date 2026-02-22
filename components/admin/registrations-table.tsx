'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2, FileText, Search, UserCheck, AlertCircle, Eye, AlertTriangle } from 'lucide-react'
import { RegistrationRequest } from '@/lib/types'
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

interface RegistrationsTableProps {
    requests: RegistrationRequest[]
    addressConflicts?: Record<string, string>
}

interface HomeownerSuggestion {
    id: string
    first_name: string
    last_name: string
    block: string | null
    lot: string | null
    phase: string | null
    email: string | null
    contact_number: string | null
    matchScore: number
    matchReasons: string[]
}

export function RegistrationsTable({ requests, addressConflicts = {} }: RegistrationsTableProps) {
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [approveDialogReq, setApproveDialogReq] = useState<RegistrationRequest | null>(null)
    const [rejectDialogReq, setRejectDialogReq] = useState<RegistrationRequest | null>(null)
    const [previewDoc, setPreviewDoc] = useState<{ url: string; label: string; isPdf: boolean } | null>(null)
    const [previewError, setPreviewError] = useState(false)
    const [rejectReason, setRejectReason] = useState('')
    const [suggestions, setSuggestions] = useState<HomeownerSuggestion[]>([])
    const [loadingSuggestions, setLoadingSuggestions] = useState(false)
    const [selectedMatch, setSelectedMatch] = useState<string | null>(null) // homeownerID or 'new'
    const router = useRouter()

    /** Opens approve dialog + loads homeowner match suggestions */
    const openApproveDialog = async (req: RegistrationRequest) => {
        setApproveDialogReq(req)
        setSelectedMatch(null)
        setSuggestions([])
        setLoadingSuggestions(true)

        try {
            const params = new URLSearchParams()
            if (req.claimed_block) params.set('block', req.claimed_block)
            if (req.claimed_lot) params.set('lot', req.claimed_lot)
            if (req.claimed_phase) params.set('phase', req.claimed_phase)
            if (req.first_name) params.set('firstName', req.first_name)
            if (req.last_name) params.set('lastName', req.last_name)

            const res = await fetch(`/api/admin/registrations/match-homeowner?${params}`)
            if (res.ok) {
                const data = await res.json()
                setSuggestions(data.suggestions || [])
                // Auto-select top match if score is very high (exact address)
                if (data.suggestions?.[0]?.matchScore >= 80) {
                    setSelectedMatch(data.suggestions[0].id)
                } else {
                    setSelectedMatch('new')
                }
            }
        } catch (e) {
            console.error('Failed to fetch suggestions:', e)
            setSelectedMatch('new')
        } finally {
            setLoadingSuggestions(false)
        }
    }

    const handleApprove = async () => {
        if (!approveDialogReq || !selectedMatch) return
        setProcessingId(approveDialogReq.id)

        try {
            const body: Record<string, string> = {}
            if (selectedMatch !== 'new') {
                body.matchedHomeownerId = selectedMatch
            }

            const res = await fetch(`/api/admin/registrations/${approveDialogReq.id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            })
            const data = await res.json()

            if (!res.ok) {
                if (res.status === 409 && data.error === 'duplicate_address') {
                    // Address already linked — warn admin, keep dialog open
                    toast.warning(`Address conflict: ${data.message}. Please select a different match or confirm with the homeowner.`)
                } else {
                    toast.error('Error approving: ' + (data.error || 'Unknown error'))
                }
            } else {
                setApproveDialogReq(null)
                toast.success('Registration approved successfully')
                window.dispatchEvent(new CustomEvent('admin-counts-refresh'))
                router.refresh()
            }
        } catch {
            toast.error('Unexpected error. Please try again.')
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async () => {
        if (!rejectDialogReq || !rejectReason.trim()) return
        setProcessingId(rejectDialogReq.id)

        try {
            const res = await fetch(`/api/admin/registrations/${rejectDialogReq.id}/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason.trim() }),
            })
            const data = await res.json()

            if (!res.ok) {
                toast.error('Error rejecting: ' + (data.error || 'Unknown error'))
            } else {
                setRejectDialogReq(null)
                setRejectReason('')
                toast.success('Registration rejected')
                window.dispatchEvent(new CustomEvent('admin-counts-refresh'))
                router.refresh()
            }
        } catch {
            toast.error('Unexpected error. Please try again.')
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <>
            <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#F8FAFC] text-slate-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-4">Name / Contact</th>
                                <th className="px-6 py-4">Claimed Address</th>
                                <th className="px-6 py-4">Documents</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {requests.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        No pending registrations found.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((req) => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-slate-900">
                                                {req.first_name} {req.last_name}
                                            </div>
                                            <div className="text-xs text-slate-500">{req.email}</div>
                                            <div className="text-xs text-slate-500">{req.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1 flex-wrap">
                                                {req.claimed_block && (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">B{req.claimed_block}</span>
                                                )}
                                                {req.claimed_lot && (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">L{req.claimed_lot}</span>
                                                )}
                                                {req.claimed_phase && (
                                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">P{req.claimed_phase}</span>
                                                )}
                                            </div>
                                            {addressConflicts[req.id] && (
                                                <div className="flex items-center gap-1 mt-1.5 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                                                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                                    <span>Claimed by {addressConflicts[req.id]}</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            {req.documents && req.documents.length > 0 ? (
                                                <div className="flex gap-2">
                                                    {req.documents.map((doc: any, idx: number) => {
                                                        const proxyUrl = `/api/gdrive-proxy?fileId=${doc.fileId}`
                                                        const label = doc.type === 'id' ? 'Valid ID' : 'Proof of Residence'
                                                        return (
                                                            <button
                                                                key={idx}
                                                                onClick={() => {
                                                                    const fileName = doc.fileName?.toLowerCase() || ''
                                                                    const isPdf = fileName.endsWith('.pdf')
                                                                    setPreviewDoc({ url: proxyUrl, label, isPdf })
                                                                    setPreviewError(false)
                                                                }}
                                                                className="group relative w-12 h-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex-shrink-0"
                                                                title={`Preview: ${label}`}
                                                            >
                                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                                <img
                                                                    src={proxyUrl}
                                                                    alt={label}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                                                                />
                                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                                                    <Eye className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                                                </div>
                                                                <span className="absolute bottom-0 inset-x-0 text-[8px] text-center bg-black/50 text-white py-0.5 truncate">
                                                                    {label}
                                                                </span>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">No documents</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-slate-500">
                                            {new Date(req.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setRejectDialogReq(req)
                                                        setRejectReason('')
                                                    }}
                                                    disabled={!!processingId}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                                    title="Reject"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openApproveDialog(req)}
                                                    disabled={!!processingId}
                                                    className="p-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-70 flex items-center justify-center min-w-[32px]"
                                                    title="Approve"
                                                >
                                                    {processingId === req.id ? (
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

            {/* ── Approve Dialog ───────────────────────────────────────── */}
            <Dialog open={!!approveDialogReq} onOpenChange={() => setApproveDialogReq(null)}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserCheck className="w-5 h-5 text-green-600" />
                            Approve Registration
                        </DialogTitle>
                        <DialogDescription>
                            <strong>{approveDialogReq?.first_name} {approveDialogReq?.last_name}</strong> is claiming Block {approveDialogReq?.claimed_block}, Lot {approveDialogReq?.claimed_lot}, Phase {approveDialogReq?.claimed_phase}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {loadingSuggestions ? (
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Searching for matching homeowner records...
                            </div>
                        ) : (
                            <>
                                {suggestions.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                                            <Search className="w-4 h-4" />
                                            {suggestions.length} existing record{suggestions.length !== 1 ? 's' : ''} found
                                        </p>
                                        {suggestions.map((s) => (
                                            <button
                                                key={s.id}
                                                onClick={() => setSelectedMatch(s.id)}
                                                className={`w-full text-left p-3 rounded-lg border-2 transition-colors text-sm ${selectedMatch === s.id
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-slate-200 hover:border-slate-300 bg-white'
                                                    }`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-semibold">{s.first_name} {s.last_name}</span>
                                                        <span className="ml-2 text-slate-500">
                                                            B{s.block} L{s.lot} P{s.phase}
                                                        </span>
                                                    </div>
                                                    <div className="flex gap-1 flex-wrap justify-end">
                                                        {s.matchReasons.map((r, i) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                {s.email && <div className="text-xs text-slate-400 mt-0.5">{s.email}</div>}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => setSelectedMatch('new')}
                                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors text-sm ${selectedMatch === 'new'
                                        ? 'border-green-500 bg-green-50'
                                        : 'border-slate-200 hover:border-slate-300 bg-white'
                                        }`}
                                >
                                    <div className="font-semibold text-green-700">+ Create new homeowner record</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        A new record will be created for Block {approveDialogReq?.claimed_block}, Lot {approveDialogReq?.claimed_lot}
                                    </div>
                                </button>

                                {suggestions.length === 0 && (
                                    <div className="flex items-start gap-2 text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
                                        <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                                        No existing records found at this address. A new record will be created.
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialogReq(null)}>Cancel</Button>
                        <Button
                            onClick={handleApprove}
                            disabled={!selectedMatch || !!processingId}
                            className="bg-green-600 hover:bg-green-700 text-white"
                        >
                            {processingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            {selectedMatch === 'new' ? 'Approve & Create Record' : 'Approve & Link Record'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Reject Dialog ────────────────────────────────────────── */}
            <Dialog open={!!rejectDialogReq} onOpenChange={() => setRejectDialogReq(null)}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-red-600">Reject Registration</DialogTitle>
                        <DialogDescription>
                            Provide a reason for rejecting <strong>{rejectDialogReq?.first_name} {rejectDialogReq?.last_name}</strong>'s request.
                            This will be emailed to them.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="e.g. Could not verify claimed address. Please contact the HOA office."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={4}
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogReq(null)}>Cancel</Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={!rejectReason.trim() || !!processingId}
                        >
                            {processingId ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Reject Request
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Document Preview Dialog ──────────────────────────────── */}
            <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                <DialogContent className="max-w-3xl max-h-[90vh] p-0 overflow-hidden">
                    <DialogHeader className="p-4 pb-2">
                        <DialogTitle className="flex items-center gap-2 text-base">
                            <FileText className="w-4 h-4" />
                            {previewDoc?.label ?? 'Document Preview'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="relative flex items-center justify-center bg-slate-50 min-h-[300px] max-h-[70vh] overflow-auto p-4">
                        {previewDoc && (
                            previewDoc.isPdf || previewError ? (
                                <iframe
                                    src={previewDoc.url}
                                    title={previewDoc.label}
                                    className="w-full h-[65vh] rounded-lg border"
                                />
                            ) : (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                    src={previewDoc.url}
                                    alt={previewDoc.label}
                                    className="max-w-full max-h-[65vh] object-contain rounded-lg shadow-sm"
                                    onError={() => setPreviewError(true)}
                                />
                            )
                        )}
                    </div>
                    <div className="flex justify-end gap-2 p-4 pt-2 border-t">
                        {previewDoc && (
                            <a
                                href={previewDoc.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 hover:underline"
                            >
                                Open in new tab ↗
                            </a>
                        )}
                        <Button variant="outline" size="sm" onClick={() => setPreviewDoc(null)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
