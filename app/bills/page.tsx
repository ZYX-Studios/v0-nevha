
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { BillsContent } from "./bills-content"
import { PaymentQrCode, HoaDuesConfig, Payment } from "@/lib/types"

export default async function BillsPage() {
    const supabase = await createClient()

    // 1. Check Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/auth')
    }

    // 2. Fetch Homeowner Profile
    const { data: homeowner } = await supabase
        .from('homeowners')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!homeowner) {
        // Check if this is an admin/staff — they may not have a homeowner record
        const { data: dbUser } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .single()

        if (dbUser?.role === 'ADMIN' || dbUser?.role === 'STAFF') {
            return (
                <div className="min-h-screen flex items-center justify-center p-6 bg-[#F2F2F7]">
                    <div className="text-center max-w-sm space-y-3">
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                        </div>
                        <h2 className="text-lg font-semibold text-slate-900">No Billing Account</h2>
                        <p className="text-sm text-slate-500">Admin and staff accounts don't have homeowner billing records. Switch to a homeowner account to view bills.</p>
                    </div>
                </div>
            )
        }

        // Regular user with no homeowner record → send to registration
        redirect('/auth?tab=register')
    }

    // 3. Fetch Config, QR Codes, Payments, and approved vehicles in parallel
    const [configRes, qrRes, paymentsRes, vehiclesRes] = await Promise.all([
        supabase.from('hoa_dues_config').select('*').eq('is_active', true).order('dues_year', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('payment_qr_codes').select('*').eq('is_active', true),
        supabase.from('payments').select('*').eq('homeowner_id', homeowner.id).order('created_at', { ascending: false }),
        supabase.from('vehicle_requests').select('id, vehicle_type, plate_number, sticker_price').eq('user_id', user.id).eq('status', 'approved'),
    ])

    const config = configRes.data as HoaDuesConfig | null
    const qrCodes = (qrRes.data || []) as PaymentQrCode[]
    const payments = (paymentsRes.data || []) as Payment[]
    const approvedVehicles = (vehiclesRes.data || []) as {
        id: string
        vehicle_type: string
        plate_number: string
        sticker_price: number | null
    }[]

    // 4. Render Client Content
    return (
        <BillsContent
            initialPayments={payments}
            qrCodes={qrCodes}
            config={config}
            homeownerId={homeowner.id}
            approvedVehicles={approvedVehicles}
        />
    )
}
