'use server'

import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function approveRegistration(requestId: string) {
    try {
        const supabaseAdmin = createAdminClient()
        const supabaseAuth = await createClient()
        const { data: { user } } = await supabaseAuth.auth.getUser()

        // 1. Fetch the request
        const { data: request, error: fetchError } = await supabaseAdmin
            .from('registration_requests')
            .select('*')
            .eq('id', requestId)
            .single()

        if (fetchError || !request) {
            throw new Error('Request not found')
        }

        if (request.status !== 'pending') {
            throw new Error('Request is not pending')
        }

        // 2. Link or Create Homeowner
        if (request.matched_homeowner_id) {
            // Link to existing
            const { error: linkError } = await supabaseAdmin
                .from('homeowners')
                .update({
                    user_id: request.user_id,
                    email: request.email, // Ensure email is synced
                    contact_number: request.phone // Ensure phone is synced
                })
                .eq('id', request.matched_homeowner_id)

            if (linkError) throw new Error('Failed to link homeowner: ' + linkError.message)
        } else {
            // Create new homeowner record
            // We need to map request fields to homeowner fields
            const { error: createError } = await supabaseAdmin
                .from('homeowners')
                .insert({
                    user_id: request.user_id,
                    first_name: request.first_name,
                    last_name: request.last_name,
                    email: request.email,
                    contact_number: request.phone,
                    block: request.claimed_block,
                    lot: request.claimed_lot,
                    phase: request.claimed_phase,
                    is_owner: true, // Defaulting to true for now as they are "Homeowners"
                    property_address: `Block ${request.claimed_block} Lot ${request.claimed_lot} Phase ${request.claimed_phase}`
                })

            if (createError) throw new Error('Failed to create homeowner record: ' + createError.message)
        }

        // 3. Update Request Status
        const { error: updateError } = await supabaseAdmin
            .from('registration_requests')
            .update({
                status: 'approved',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user?.id || null
            })
            .eq('id', requestId)

        if (updateError) throw new Error('Failed to update request status: ' + updateError.message)

        revalidatePath('/admin/registrations')
        return { success: true }

    } catch (error: any) {
        console.error('Approve registration error:', error)
        return { success: false, error: error.message }
    }
}

export async function rejectRegistration(requestId: string) {
    try {
        const supabaseAdmin = createAdminClient()
        const supabaseAuth = await createClient()
        const { data: { user } } = await supabaseAuth.auth.getUser()

        const { error } = await supabaseAdmin
            .from('registration_requests')
            .update({
                status: 'rejected',
                reviewed_at: new Date().toISOString(),
                reviewed_by: user?.id || null
            })
            .eq('id', requestId)

        if (error) throw error

        revalidatePath('/admin/registrations')
        return { success: true }
    } catch (error: any) {
        console.error('Reject registration error:', error)
        return { success: false, error: error.message }
    }
}
