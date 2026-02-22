'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { VehicleRequest } from '@/lib/types'

export interface AdminVehicleRequest extends VehicleRequest {
    profiles?: {
        first_name: string
        last_name: string
        email: string
    }
}

export async function getAdminVehicleRequests(): Promise<AdminVehicleRequest[]> {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('vehicle_requests')
        .select(`
      *,
      profiles:user_id (
        first_name,
        last_name,
        email
      )
    `)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching admin vehicle requests:', error)
        return []
    }

    return data as any as AdminVehicleRequest[]
}

export async function updateVehicleStatus(id: string, status: 'approved' | 'rejected') {
    const supabase = await createClient()

    try {
        const { error } = await supabase
            .from('vehicle_requests')
            .update({ status, updated_at: new Date().toISOString() })
            .eq('id', id)

        if (error) {
            throw new Error(error.message)
        }

        revalidatePath('/admin/vehicles')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}
