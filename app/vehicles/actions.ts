'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { VehicleRequest } from '@/lib/types'

export interface VehicleDocumentRef {
    fileId: string
    fileName: string
    proxyUrl: string
    docType: 'or' | 'cr'
}

export interface SubmitVehicleRequestData {
    vehicle_type: 'car' | 'motorcycle' | 'other'
    plate_number: string
    sticker_price: number
    /** Array of uploaded document refs (fileId + docType) returned by /api/vehicles/upload-doc */
    documents?: VehicleDocumentRef[]
}

export async function submitVehicleRequest(data: SubmitVehicleRequestData) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    try {
        const { error } = await supabase.from('vehicle_requests').insert({
            user_id: user.id,
            vehicle_type: data.vehicle_type,
            plate_number: data.plate_number,
            sticker_price: data.sticker_price,
            status: 'pending',
            documents: data.documents ?? null,
        })

        if (error) throw new Error(error.message)

        revalidatePath('/vehicles')
        return { success: true }
    } catch (error: any) {
        return { success: false, error: error.message }
    }
}

export async function getVehicleRequests(): Promise<VehicleRequest[]> {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
        .from('vehicle_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error('Error fetching vehicle requests:', error)
        return []
    }

    return data as VehicleRequest[]
}
