'use client'

import { useState, useTransition } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
    CheckCircle, XCircle, Clock, FileText, User, ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface ChangeRequest {
    id: string
    homeownerId: string
    fieldName: string
    oldValue: string
    newValue: string
    status: 'pending' | 'approved' | 'rejected'
    docFileId: string | null
    createdAt: string
    reviewedAt: string | null
    homeowner: {
        first_name: string
        last_name: string
        block: string
        lot: string
        phase: string
    } | null
}

const FIELD_LABELS: Record<string, string> = {
    first_name: 'First Name',
    last_name: 'Last Name',
    middle_initial: 'Middle Initial',
    suffix: 'Suffix',
}

export function VerificationsNameChanges({ initialItems }: { initialItems: ChangeRequest[] }) {
    const [items, setItems] = useState<ChangeRequest[]>(initialItems)
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [, startTransition] = useTransition()

    const handleApprove = async (id: string) => {
        setProcessingId(id)
        try {
            const res = await fetch(`/api/admin/profile-changes/${id}/approve`, { method: 'POST' })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success('Name change approved and applied')
            startTransition(() => setItems(prev => prev.filter(i => i.id !== id)))
            window.dispatchEvent(new Event('admin-counts-refresh'))
        } catch (err: any) {
            toast.error(err.message || 'Failed to approve')
        } finally {
            setProcessingId(null)
        }
    }

    const handleReject = async (id: string) => {
        setProcessingId(id)
        try {
            const res = await fetch(`/api/admin/profile-changes/${id}/reject`, { method: 'POST' })
            if (!res.ok) throw new Error((await res.json()).error)
            toast.success('Name change rejected')
            startTransition(() => setItems(prev => prev.filter(i => i.id !== id)))
            window.dispatchEvent(new Event('admin-counts-refresh'))
        } catch (err: any) {
            toast.error(err.message || 'Failed to reject')
        } finally {
            setProcessingId(null)
        }
    }

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                    <User className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">No pending name change requests</p>
                <p className="text-xs text-slate-400">All clear!</p>
            </div>
        )
    }

    return (
        <AnimatePresence mode="popLayout">
            <div className="space-y-3">
                {items.map(item => {
                    const ho = item.homeowner
                    const hoName = ho ? `${ho.first_name} ${ho.last_name}` : 'Unknown'
                    const hoAddress = ho ? `Blk ${ho.block} Lot ${ho.lot}${ho.phase ? ` Ph ${ho.phase}` : ''}` : ''
                    const isProcessing = processingId === item.id

                    return (
                        <motion.div
                            key={item.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            className="bg-white rounded-lg border border-slate-100 shadow-sm overflow-hidden"
                        >
                            <div className="flex items-start gap-4 p-5">
                                {/* Avatar */}
                                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                                    <User className="w-5 h-5 text-blue-600" />
                                </div>

                                {/* Main */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 flex-wrap">
                                        <div>
                                            <p className="text-sm font-semibold text-slate-900">{hoName}</p>
                                            <p className="text-xs text-slate-500">{hoAddress}</p>
                                        </div>
                                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-0 shrink-0">
                                            <Clock className="w-3 h-3 mr-1" /> Pending
                                        </Badge>
                                    </div>

                                    {/* Change details */}
                                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        <div className="bg-slate-50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] text-slate-400 uppercase font-medium mb-0.5">Field</p>
                                            <p className="text-sm font-semibold text-slate-700">
                                                {FIELD_LABELS[item.fieldName] || item.fieldName}
                                            </p>
                                        </div>
                                        <div className="bg-red-50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] text-red-400 uppercase font-medium mb-0.5">Current</p>
                                            <p className="text-sm font-semibold text-red-700 truncate">{item.oldValue || '—'}</p>
                                        </div>
                                        <div className="bg-emerald-50 rounded-xl px-3 py-2">
                                            <p className="text-[10px] text-emerald-400 uppercase font-medium mb-0.5">Requested</p>
                                            <p className="text-sm font-semibold text-emerald-700 truncate">{item.newValue}</p>
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-400">
                                                Submitted {new Date(item.createdAt).toLocaleDateString()}
                                            </span>
                                            {item.docFileId && (
                                                <a
                                                    href={`/api/gdrive-proxy?fileId=${item.docFileId}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                                                >
                                                    <FileText className="w-3 h-3" />
                                                    View ID
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                disabled={isProcessing}
                                                onClick={() => handleReject(item.id)}
                                                className="h-8 px-3 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                            >
                                                <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                                            </Button>
                                            <Button
                                                size="sm"
                                                disabled={isProcessing}
                                                onClick={() => handleApprove(item.id)}
                                                className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                            >
                                                {isProcessing ? (
                                                    <span className="flex items-center gap-1">
                                                        <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                                                        Processing…
                                                    </span>
                                                ) : (
                                                    <><CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve</>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )
                })}
            </div>
        </AnimatePresence>
    )
}
