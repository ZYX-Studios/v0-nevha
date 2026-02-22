'use client'

import { useState, useEffect, useRef } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2, Plus, Car, FileText, CheckCircle, XCircle, Clock, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { getVehicleRequests, submitVehicleRequest, VehicleDocumentRef } from "./actions"
import { VehicleRequest } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

const formSchema = z.object({
    vehicle_type: z.enum(["car", "motorcycle", "other"], {
        required_error: "Please select a vehicle type.",
    }),
    plate_number: z.string().min(2, {
        message: "Plate number must be at least 2 characters.",
    }),
})

export default function VehicleRegistrationPage() {
    const [requests, setRequests] = useState<VehicleRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [stickerPrice, setStickerPrice] = useState(0)

    // OR/CR document upload state
    const [orFile, setOrFile] = useState<File | null>(null)
    const [crFile, setCrFile] = useState<File | null>(null)
    const [uploadingDocs, setUploadingDocs] = useState(false)
    const orInputRef = useRef<HTMLInputElement>(null)
    const crInputRef = useRef<HTMLInputElement>(null)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            vehicle_type: "car",
            plate_number: "",
        },
    })

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)

        // Fetch requests (blocking UI)
        try {
            const fetchedRequests = await getVehicleRequests()
            setRequests(fetchedRequests || [])
        } catch (error) {
            console.error("Error fetching requests:", error)
            toast.error("Failed to load vehicle requests")
        } finally {
            setLoading(false)
        }

        // Fetch config (non-blocking)
        try {
            const configData = await fetchDuesConfig()
            if (configData) {
                setStickerPrice(configData.car_sticker_price)
            }
        } catch (error) {
            console.error("Error fetching config:", error)
        }
    }

    const fetchDuesConfig = async () => {
        const supabase = createClient()
        const currentYear = new Date().getFullYear()
        try {
            const { data, error } = await supabase
                .from('hoa_dues_config')
                .select('car_sticker_price')
                .eq('dues_year', currentYear)
                .maybeSingle()

            if (error) {
                console.error("Error fetching dues config:", error)
                return null
            }
            return data
        } catch (error) {
            console.error("Unexpected error in fetchDuesConfig:", error)
            return null
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!orFile || !crFile) {
            toast.error("Please attach both the OR and CR documents before submitting.")
            return
        }
        setIsSubmitting(true)
        setUploadingDocs(true)
        const uploadedDocs: VehicleDocumentRef[] = []
        try {
            // Upload OR and CR in parallel
            const uploadDoc = async (file: File, docType: 'or' | 'cr') => {
                const fd = new FormData()
                fd.append('file', file)
                fd.append('plateNumber', values.plate_number)
                fd.append('docType', docType)
                const res = await fetch('/api/vehicles/upload-doc', { method: 'POST', body: fd })
                const data = await res.json()
                if (!res.ok) throw new Error(data.error || `Failed to upload ${docType.toUpperCase()}`)
                return data as VehicleDocumentRef
            }

            const [orRef, crRef] = await Promise.all([uploadDoc(orFile, 'or'), uploadDoc(crFile, 'cr')])
            uploadedDocs.push(orRef, crRef)
        } catch (err: any) {
            toast.error(err.message || 'Document upload failed')
            setIsSubmitting(false)
            setUploadingDocs(false)
            return
        } finally {
            setUploadingDocs(false)
        }

        try {
            const result = await submitVehicleRequest({
                ...values,
                sticker_price: stickerPrice,
                documents: uploadedDocs,
            })

            if (result.success) {
                toast.success("Vehicle registration request submitted!")
                setIsDialogOpen(false)
                form.reset()
                setOrFile(null)
                setCrFile(null)
                fetchData()
            } else {
                toast.error(result.error || "Failed to submit request")
            }
        } catch {
            toast.error("An unexpected error occurred")
        } finally {
            setIsSubmitting(false)
        }
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'approved':
                return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Approved</Badge>
            case 'rejected':
                return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>
            default:
                return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>
        }
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Vehicle Registration</h1>
                    <p className="text-muted-foreground mt-1">
                        Register your vehicles and track sticker requests.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Register New Vehicle
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Register New Vehicle</DialogTitle>
                            <DialogDescription>
                                Submit details for your vehicle. Sticker fee is {formatCurrency(stickerPrice)}.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                                <FormField
                                    control={form.control}
                                    name="vehicle_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Vehicle Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select vehicle type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="car">Car</SelectItem>
                                                    <SelectItem value="motorcycle">Motorcycle</SelectItem>
                                                    <SelectItem value="other">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="plate_number"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Plate Number / Conduction Sticker</FormLabel>
                                            <FormControl>
                                                <Input placeholder="ABC 1234" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* OR/CR Document Upload */}
                                <div className="space-y-3">
                                    <p className="text-sm font-medium text-slate-800">Supporting Documents <span className="text-red-500">*</span></p>
                                    <p className="text-xs text-muted-foreground -mt-2">Attach your OR (Official Receipt) and CR (Certificate of Registration).</p>

                                    {/* OR Upload */}
                                    <input ref={orInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setOrFile(e.target.files?.[0] || null)} />
                                    <div
                                        onClick={() => orInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${orFile ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-200 hover:border-blue-400 text-slate-500'
                                            }`}
                                    >
                                        {orFile ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Upload className="w-4 h-4 shrink-0" />}
                                        <span className="text-xs flex-1 truncate">{orFile ? orFile.name : 'Click to upload Official Receipt (OR)'}</span>
                                        {orFile && <button type="button" onClick={e => { e.stopPropagation(); setOrFile(null) }}><X className="w-4 h-4" /></button>}
                                    </div>

                                    {/* CR Upload */}
                                    <input ref={crInputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={e => setCrFile(e.target.files?.[0] || null)} />
                                    <div
                                        onClick={() => crInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-lg p-3 flex items-center gap-3 cursor-pointer transition-colors ${crFile ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-200 hover:border-blue-400 text-slate-500'
                                            }`}
                                    >
                                        {crFile ? <CheckCircle className="w-4 h-4 shrink-0" /> : <Upload className="w-4 h-4 shrink-0" />}
                                        <span className="text-xs flex-1 truncate">{crFile ? crFile.name : 'Click to upload Certificate of Registration (CR)'}</span>
                                        {crFile && <button type="button" onClick={e => { e.stopPropagation(); setCrFile(null) }}><X className="w-4 h-4" /></button>}
                                    </div>
                                </div>

                                <div className="bg-muted/50 p-4 rounded-lg">
                                    <div className="flex justify-between items-center text-sm mb-2">
                                        <span className="text-muted-foreground">Sticker Fee ({new Date().getFullYear()})</span>
                                        <span className="font-semibold">{formatCurrency(stickerPrice)}</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-2">
                                        * Payment instructions will be provided upon approval.
                                    </div>
                                </div>

                                <DialogFooter>
                                    <Button type="submit" disabled={isSubmitting || uploadingDocs}>
                                        {(isSubmitting || uploadingDocs) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {uploadingDocs ? 'Uploading documents...' : isSubmitting ? 'Submitting...' : 'Submit Request'}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : requests.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <Car className="h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold">No vehicles registered</h3>
                        <p className="text-muted-foreground mb-4 max-w-sm">
                            You haven't registered any vehicles yet. Click the button above to get started.
                        </p>
                        <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                            Register Vehicle
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {requests.map((request) => (
                        <Card key={request.id}>
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <CardTitle className="text-lg font-bold">
                                        {request.plate_number.toUpperCase()}
                                    </CardTitle>
                                    {getStatusBadge(request.status)}
                                </div>
                                <CardDescription className="capitalize">
                                    {request.vehicle_type}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Sticker Fee:</span>
                                        <span>{formatCurrency(request.sticker_price)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Date Submitted:</span>
                                        <span>{new Date(request.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2">
                                {request.status === 'pending' && (
                                    <p className="text-xs text-muted-foreground w-full text-center">
                                        Waiting for admin approval
                                    </p>
                                )}
                                {request.status === 'approved' && (
                                    <Button variant="outline" className="w-full" size="sm">
                                        View Payment Instructions
                                    </Button>
                                )}
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
