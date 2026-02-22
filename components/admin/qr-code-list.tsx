'use client'

import { useState, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Plus, Trash2, Loader2, Upload, AlertTriangle, ZoomIn, ZoomOut, Move } from 'lucide-react'
import { uploadQRCode, deleteQRCode, toggleQRCodeStatus } from '@/app/admin/qr-codes/actions'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner'

/* ── Types ─────────────────────────────────────────────────────── */
interface QRCode {
    id: string
    payment_method: string
    label: string
    account_name?: string
    account_number?: string
    qr_image_url: string
    is_active: boolean
}

const PAYMENT_METHODS = [
    { value: 'gcash', label: 'GCash' },
    { value: 'maya', label: 'Maya' },
    { value: 'bdo', label: 'BDO' },
    { value: 'bpi', label: 'BPI' },
    { value: 'unionbank', label: 'UnionBank' },
    { value: 'chinabank', label: 'Chinabank' },
    { value: 'gotyme', label: 'GoTyme' },
    { value: 'seabank', label: 'SeaBank' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'other', label: 'Other' },
]

/* ── Image Crop Preview ──────────────────────────────────────── */
interface CropHandle {
    crop: () => Promise<File | null>
}

const ImageCropPreview = forwardRef<CropHandle, { file: File }>(function ImageCropPreview({ file }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const imgRef = useRef<HTMLImageElement | null>(null)
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
    const [imgLoaded, setImgLoaded] = useState(false)
    const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
    const [objectUrl] = useState(() => URL.createObjectURL(file))

    const SIZE = 280

    // Compute display dimensions based on natural image size
    const baseScale = naturalSize.w > 0
        ? Math.min(SIZE / naturalSize.w, SIZE / naturalSize.h)
        : 1
    const displayW = naturalSize.w * baseScale * scale
    const displayH = naturalSize.h * baseScale * scale

    const handleLoad = useCallback(() => {
        const img = imgRef.current
        if (img) setNaturalSize({ w: img.naturalWidth, h: img.naturalHeight })
        setImgLoaded(true)
    }, [])

    const handlePointerDown = (e: React.PointerEvent) => {
        setIsDragging(true)
        setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
            ; (e.target as Element).setPointerCapture(e.pointerId)
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) return
        setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
    }

    const handlePointerUp = () => setIsDragging(false)

    // Expose crop() to parent via ref
    useImperativeHandle(ref, () => ({
        crop: () => new Promise<File | null>((resolve) => {
            const canvas = canvasRef.current
            if (!canvas || !imgRef.current) { resolve(null); return }

            const ctx = canvas.getContext('2d')
            if (!ctx) { resolve(null); return }

            const img = imgRef.current
            const outputSize = 600
            canvas.width = outputSize
            canvas.height = outputSize

            ctx.fillStyle = '#fff'
            ctx.fillRect(0, 0, outputSize, outputSize)

            const drawX = (SIZE / 2 - displayW / 2) + offset.x
            const drawY = (SIZE / 2 - displayH / 2) + offset.y
            const ratio = outputSize / SIZE

            ctx.drawImage(imgRef.current, drawX * ratio, drawY * ratio, displayW * ratio, displayH * ratio)

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        resolve(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }))
                    } else {
                        resolve(null)
                    }
                },
                'image/jpeg',
                0.92
            )
        })
    }), [scale, offset, file, displayW, displayH])

    return (
        <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Position your QR code in the frame
            </p>

            {/* Crop area */}
            <div
                className="relative mx-auto overflow-hidden rounded-2xl border-2 border-blue-200 bg-slate-100 select-none touch-none"
                style={{ width: SIZE, height: SIZE }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
            >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    ref={imgRef}
                    src={objectUrl}
                    alt="QR preview"
                    onLoad={handleLoad}
                    className="absolute select-none pointer-events-none"
                    style={{
                        width: displayW || '100%',
                        height: 'auto',
                        maxWidth: 'none',
                        left: `calc(50% + ${offset.x}px)`,
                        top: `calc(50% + ${offset.y}px)`,
                        transform: 'translate(-50%, -50%)',
                        opacity: imgLoaded ? 1 : 0,
                    }}
                    draggable={false}
                />

                {/* Crosshair guides */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-0 right-0 h-px bg-blue-300/40" />
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-blue-300/40" />
                </div>

                {/* Drag hint */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/40 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur">
                    <Move className="w-3 h-3" /> Drag to position
                </div>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center justify-center gap-4">
                <button
                    type="button"
                    onClick={() => setScale(s => Math.max(0.3, s - 0.1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                    <ZoomOut className="w-4 h-4 text-slate-600" />
                </button>
                <span className="text-xs font-mono text-slate-400 w-12 text-center">{Math.round(scale * 100)}%</span>
                <button
                    type="button"
                    onClick={() => setScale(s => Math.min(5, s + 0.1))}
                    className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors"
                >
                    <ZoomIn className="w-4 h-4 text-slate-600" />
                </button>
                <button
                    type="button"
                    onClick={() => { setScale(1); setOffset({ x: 0, y: 0 }) }}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                >
                    Reset
                </button>
            </div>

            {/* Hidden canvas for cropping */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    )
})

/* ── Main Component ──────────────────────────────────────────── */
export function QRCodeList({ initialData }: { initialData: QRCode[] }) {
    const [isUploading, setIsUploading] = useState(false)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<QRCode | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Upload form state
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const cropRef = useRef<CropHandle>(null)

    const router = useRouter()

    const resetUploadForm = () => {
        setSelectedFile(null)
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!selectedFile || !cropRef.current) {
            toast.error('Please upload a QR image first')
            return
        }

        setIsUploading(true)
        try {
            // Capture form data BEFORE any async work (e.currentTarget becomes null after await)
            const formData = new FormData(e.currentTarget)

            // Auto-crop from current position before uploading
            const croppedFile = await cropRef.current.crop()
            if (!croppedFile) {
                toast.error('Failed to crop image. Please try again.')
                return
            }

            formData.delete('file')
            formData.set('file', croppedFile, croppedFile.name)

            const result = await uploadQRCode(formData)
            if (result.success) {
                setIsAddOpen(false)
                resetUploadForm()
                toast.success('Payment method added')
                router.refresh()
            } else {
                toast.error('Upload failed: ' + result.error)
            }
        } catch (err: any) {
            console.error('Upload error:', err)
            toast.error(err?.message || 'An unexpected error occurred')
        } finally {
            setIsUploading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setIsDeleting(true)
        try {
            const result = await deleteQRCode(deleteTarget.id, deleteTarget.qr_image_url)
            if (!result.success) toast.error('Delete failed: ' + result.error)
            else toast.success('Payment method deleted')
        } finally {
            setIsDeleting(false)
            setDeleteTarget(null)
            router.refresh()
        }
    }

    const handleToggle = async (id: string, currentStatus: boolean) => {
        setProcessingId(id)
        try {
            await toggleQRCodeStatus(id, !currentStatus)
            router.refresh()
        } finally {
            setProcessingId(null)
        }
    }

    return (
        <div>
            {/* Action Bar */}
            <div className="mb-5 flex justify-end">
                <Dialog open={isAddOpen} onOpenChange={(v) => { setIsAddOpen(v); if (!v) resetUploadForm() }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-slate-900 hover:bg-slate-800 rounded-lg">
                            <Plus className="w-4 h-4" /> Add Payment Method
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add Payment Method</DialogTitle>
                            <DialogDescription>
                                Upload a QR code image. You can crop it to show only the QR area.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleUpload} className="space-y-4 mt-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Provider</Label>
                                    <select
                                        name="payment_method"
                                        required
                                        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {PAYMENT_METHODS.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Label</Label>
                                    <Input name="label" placeholder="e.g. My GCash" required className="rounded-lg" />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Account Name</Label>
                                    <Input name="account_name" placeholder="John Doe" className="rounded-lg" />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Account Number</Label>
                                    <Input name="account_number" placeholder="0917..." className="rounded-lg" />
                                </div>
                            </div>

                            {/* QR Image section */}
                            <div className="space-y-2">
                                <Label>QR Code Image</Label>

                                {/* File picker (hidden input + nice button) */}
                                {!selectedFile && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 hover:border-blue-300 transition-all cursor-pointer"
                                    >
                                        <Upload className="w-8 h-8 mb-2 text-slate-400" />
                                        <p className="text-sm font-semibold text-slate-600">Tap to upload QR image</p>
                                        <p className="text-xs text-slate-400 mt-1">Screenshot from your e-wallet app</p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    name="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleFileSelect}
                                />

                                {/* Crop/position UI — shown as soon as file is selected */}
                                {selectedFile && (
                                    <div className="space-y-2">
                                        <ImageCropPreview ref={cropRef} file={selectedFile} />
                                        <button
                                            type="button"
                                            onClick={() => { resetUploadForm(); fileInputRef.current?.click() }}
                                            className="block mx-auto text-xs text-blue-600 font-semibold hover:underline"
                                        >
                                            Choose different image
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); resetUploadForm() }} className="flex-1 rounded-lg">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isUploading || !selectedFile} className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 rounded-lg">
                                    {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isUploading ? 'Uploading…' : 'Save Method'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null) }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="w-5 h-5" /> Delete Payment Method
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-slate-700">{deleteTarget?.label}</span>? This will remove the QR code permanently.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2 pt-2">
                        <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isDeleting} className="flex-1 rounded-lg">
                            Cancel
                        </Button>
                        <Button onClick={handleDelete} disabled={isDeleting} className="flex-1 gap-2 bg-red-600 hover:bg-red-700 text-white rounded-lg">
                            {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isDeleting ? 'Deleting…' : 'Delete'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* QR Code Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {initialData.map((qr) => (
                    <div
                        key={qr.id}
                        className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all ${!qr.is_active ? 'opacity-60 grayscale' : ''}`}
                    >
                        {/* Image */}
                        <div className="relative aspect-square bg-slate-50 flex items-center justify-center overflow-hidden">
                            {qr.qr_image_url ? (
                                <Image
                                    src={qr.qr_image_url}
                                    alt={qr.label}
                                    fill
                                    className="object-contain p-4"
                                />
                            ) : (
                                <span className="text-slate-300 text-sm">No Image</span>
                            )}
                            {/* Status badge */}
                            <div className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold border ${qr.is_active
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                                }`}>
                                {qr.is_active ? 'Active' : 'Inactive'}
                            </div>
                        </div>

                        {/* Details */}
                        <div className="p-4 flex-1 flex flex-col">
                            <h3 className="text-base font-bold text-slate-900">{qr.label}</h3>
                            <p className="text-sm text-slate-500 capitalize mb-3">{qr.payment_method.replace('_', ' ')}</p>

                            <div className="space-y-1.5 text-sm text-slate-600 mb-4 flex-1">
                                {qr.account_name && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Name</span>
                                        <span className="font-medium">{qr.account_name}</span>
                                    </div>
                                )}
                                {qr.account_number && (
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Number</span>
                                        <span className="font-medium font-mono">{qr.account_number}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 pt-3 border-t border-slate-100">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleToggle(qr.id, qr.is_active)}
                                    disabled={!!processingId}
                                    className={`flex-1 rounded-lg text-sm font-semibold ${qr.is_active
                                        ? 'border-amber-200 text-amber-700 hover:bg-amber-50'
                                        : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                >
                                    {processingId === qr.id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : qr.is_active ? 'Disable' : 'Enable'}
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setDeleteTarget(qr)}
                                    disabled={!!processingId}
                                    className="rounded-lg border-red-200 text-red-600 hover:bg-red-50"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {initialData.length === 0 && (
                    <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-200">
                        <Upload className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                        <p className="font-semibold text-slate-600">No payment methods added yet.</p>
                        <p className="text-sm text-slate-400 mt-1">Click "Add Payment Method" to get started.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
