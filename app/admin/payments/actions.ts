'use server'

import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function approvePayment(paymentId: string) {
    try {
        const supabaseAdmin = createAdminClient()
        const supabaseAuth = await createClient()
        const { data: { user } } = await supabaseAuth.auth.getUser()

        if (!user) throw new Error('Unauthorized')

        // Update payment status
        const { error } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'verified',
                verified_at: new Date().toISOString(),
                verified_by: user.id
            })
            .eq('id', paymentId)

        if (error) throw new Error('Failed to approve payment: ' + error.message)

        revalidatePath('/admin/payments')
        return { success: true }
    } catch (error: any) {
        console.error('Approve payment error:', error)
        return { success: false, error: error.message }
    }
}

export async function rejectPayment(paymentId: string) {
    try {
        const supabaseAdmin = createAdminClient()
        const supabaseAuth = await createClient()
        const { data: { user } } = await supabaseAuth.auth.getUser()

        if (!user) throw new Error('Unauthorized')

        // Update payment status
        const { error } = await supabaseAdmin
            .from('payments')
            .update({
                status: 'rejected',
                verified_at: new Date().toISOString(),
                verified_by: user.id
            })
            .eq('id', paymentId)

        if (error) throw new Error('Failed to reject payment: ' + error.message)

        revalidatePath('/admin/payments')
        return { success: true }
    } catch (error: any) {
        console.error('Reject payment error:', error)
        return { success: false, error: error.message }
    }
}
