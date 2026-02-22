import { createAdminClient } from '@/lib/supabase/server-admin'
import { RegistrationsTable } from '@/components/admin/registrations-table'
import { VerificationsPayments } from '@/components/admin/verifications-payments'
import { VerificationsVehicles } from '@/components/admin/verifications-vehicles'
import { VerificationsNameChanges } from '@/components/admin/verifications-name-changes'
import { getAdminVehicleRequests } from '@/app/admin/vehicles/actions'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ShieldCheck, DollarSign, Car, ClipboardList, UserCheck } from 'lucide-react'

export const dynamic = 'force-dynamic'

async function fetchPayments() {
    const supabase = createAdminClient()
    const { data: rawPayments, error } = await supabase
        .from('payments')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (error || !rawPayments?.length) return { payments: [], error }

    const homeownerIds = Array.from(new Set(rawPayments.map(p => p.homeowner_id).filter(Boolean)))
    const { data: homeowners } = await supabase
        .from('homeowners')
        .select('id, first_name, last_name, block, lot')
        .in('id', homeownerIds)

    const homeownerMap = new Map(homeowners?.map(h => [h.id, h]))
    const payments = rawPayments.map(p => ({
        ...p,
        homeowners: homeownerMap.get(p.homeowner_id) || null,
    }))
    return { payments, error: null }
}

async function fetchRegistrations() {
    const supabase = createAdminClient()
    const fetchFn = () =>
        supabase
            .from('registration_requests')
            .select('*')
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

    let { data: requests, error } = await fetchFn()
    if (error) ({ data: requests, error } = await fetchFn())
    if (error || !requests) return { requests: [], conflicts: {} as Record<string, string> }

    // Pre-compute address conflicts
    const conflicts: Record<string, string> = {}
    for (const req of requests) {
        const p = req.claimed_phase?.trim()
        const b = req.claimed_block?.trim()
        const l = req.claimed_lot?.trim()
        if (!p && !b && !l) continue
        let query = supabase.from('homeowners').select('id, first_name, last_name').not('user_id', 'is', null)
        if (p) query = query.eq('phase', p)
        if (b) query = query.eq('block', b)
        if (l) query = query.eq('lot', l)
        const { data: existing } = await query.maybeSingle()
        if (existing) conflicts[req.id] = `${existing.first_name} ${existing.last_name}`
    }
    return { requests, conflicts }
}

async function fetchNameChanges() {
    const supabase = createAdminClient()
    const { data, error } = await supabase
        .from('homeowner_profile_changes')
        .select(`
            id, homeowner_id, field_name, old_value, new_value,
            status, doc_file_id, created_at, reviewed_at,
            homeowners(first_name, last_name, block, lot, phase)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

    if (error) return []

    return (data ?? []).map((r: any) => ({
        id: r.id,
        homeownerId: r.homeowner_id,
        fieldName: r.field_name,
        oldValue: r.old_value,
        newValue: r.new_value,
        status: r.status,
        docFileId: r.doc_file_id,
        createdAt: r.created_at,
        reviewedAt: r.reviewed_at,
        homeowner: r.homeowners ?? null,
    }))
}

export default async function AdminVerificationsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>
}) {
    const params = await searchParams
    const defaultTab = params.tab ?? 'payments'

    // Fetch all 4 queues in parallel
    const [
        { payments },
        vehicleRequests,
        { requests: registrations, conflicts: addressConflicts },
        nameChanges,
    ] = await Promise.all([
        fetchPayments(),
        getAdminVehicleRequests(),
        fetchRegistrations(),
        fetchNameChanges(),
    ])

    const pendingVehicles = vehicleRequests.filter(r => r.status === 'pending').length

    const tabs = [
        { value: 'payments', label: 'Payments', icon: DollarSign, count: payments.length },
        { value: 'vehicles', label: 'Vehicles', icon: Car, count: pendingVehicles },
        { value: 'registrations', label: 'Registrations', icon: ClipboardList, count: registrations.length },
        { value: 'name-changes', label: 'Name Changes', icon: UserCheck, count: nameChanges.length },
    ]

    const totalPending = payments.length + pendingVehicles + registrations.length + nameChanges.length

    return (
        <div className="p-6 md:p-8 max-w-7xl">
            {/* Header */}
            <div className="flex items-start justify-between mb-7">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow shadow-blue-600/30 shrink-0">
                        <ShieldCheck className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Verifications</h1>
                        <p className="text-sm text-slate-500">Review and process all pending submissions.</p>
                    </div>
                </div>
                {totalPending > 0 && (
                    <div className="text-sm font-semibold text-white bg-red-500 px-3 py-1 rounded-full shadow-sm shadow-red-500/30">
                        {totalPending} Pending
                    </div>
                )}
            </div>

            <Tabs defaultValue={defaultTab}>
                <TabsList className="mb-6 bg-slate-100 p-1 rounded-xl h-auto gap-1 flex-wrap">
                    {tabs.map(tab => (
                        <TabsTrigger
                            key={tab.value}
                            value={tab.value}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-blue-600 transition-all"
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.count > 0 && (
                                <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-bold bg-red-500 text-white">
                                    {tab.count > 99 ? '99+' : tab.count}
                                </span>
                            )}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <TabsContent value="payments">
                    <VerificationsPayments payments={payments as any} />
                </TabsContent>

                <TabsContent value="vehicles">
                    <VerificationsVehicles requests={vehicleRequests} />
                </TabsContent>

                <TabsContent value="registrations">
                    <RegistrationsTable
                        requests={registrations || []}
                        addressConflicts={addressConflicts}
                    />
                </TabsContent>

                <TabsContent value="name-changes">
                    <VerificationsNameChanges initialItems={nameChanges} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
