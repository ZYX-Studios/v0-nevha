import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuthAPI } from '@/lib/supabase/guards'

export async function POST(req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    try {
        const supabase = await createClient()
        // We already checked auth, but we need the user object for logic if needed (e.g. for RLS or linking)
        // requireAuthAPI ensures there is a user.

        const body = await req.json()
        const {
            homeownerId,
            feeType,
            feeYear,
            amount,
            paymentMethod,
            proofUrl,
            proofFileId,
            vehicleRequestId,
        } = body

        // Validate inputs
        if (!homeownerId || !feeType || !amount || !paymentMethod) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Insert into payments table
        const { data, error } = await supabase
            .from('payments')
            .insert({
                homeowner_id: homeownerId,
                fee_type: feeType,
                fee_year: feeYear,
                amount,
                payment_method: paymentMethod,
                proof_url: proofUrl,
                proof_drive_file_id: proofFileId,
                status: 'pending',
                ...(vehicleRequestId ? { vehicle_request_id: vehicleRequestId } : {}),
            })
            .select()
            .single()

        if (error) {
            console.error('Payment insert error:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true, payment: data })

    } catch (error: any) {
        console.error('Payment API error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // This shouldn't happen due to guard, but for type safety
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        // Fetch payments linked to this user's homeowner profile
        // 1. Get homeowner ID
        const { data: homeowner } = await supabase
            .from('homeowners')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle()

        if (!homeowner) {
            return NextResponse.json({ payments: [] })
        }

        // 2. Fetch payments
        const { data: payments, error } = await supabase
            .from('payments')
            .select('*')
            .eq('homeowner_id', homeowner.id)
            .order('created_at', { ascending: false })

        if (error) {
            throw error
        }

        return NextResponse.json({ payments })

    } catch (error: any) {
        console.error('Fetch payments error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
