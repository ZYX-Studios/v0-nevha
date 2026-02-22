'use server'

import { createAdminClient } from "@/lib/supabase/server-admin"
import { revalidatePath } from "next/cache"

export interface DuesConfigUpdate {
    id: string
    annual_amount: number
    car_sticker_price: number
    due_date: string
    late_fee_amount: number
    late_fee_grace_days: number
    is_active: boolean
}

export async function updateDuesConfig(data: DuesConfigUpdate) {
    try {
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('hoa_dues_config')
            .update({
                annual_amount: data.annual_amount,
                car_sticker_price: data.car_sticker_price,
                due_date: data.due_date,
                late_fee_amount: data.late_fee_amount,
                late_fee_grace_days: data.late_fee_grace_days,
                is_active: data.is_active,
                updated_at: new Date().toISOString()
            })
            .eq('id', data.id)

        if (error) throw new Error("Update failed: " + error.message)

        revalidatePath('/admin/dues')
        revalidatePath('/bills') // Updates resident view
        return { success: true }
    } catch (error: any) {
        console.error("Update Dues Config Error:", error)
        return { success: false, error: error.message }
    }
}

export interface DuesConfigCreate {
    dues_year: number
    annual_amount: number
    car_sticker_price: number
    due_date: string
    late_fee_amount: number
    late_fee_grace_days: number
    is_active: boolean
}

export async function createDuesConfig(data: DuesConfigCreate) {
    try {
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('hoa_dues_config')
            .insert({
                dues_year: data.dues_year,
                annual_amount: data.annual_amount,
                car_sticker_price: data.car_sticker_price,
                due_date: data.due_date,
                late_fee_amount: data.late_fee_amount,
                late_fee_grace_days: data.late_fee_grace_days,
                is_active: data.is_active
            })

        if (error) throw new Error("Creation failed: " + error.message)

        revalidatePath('/admin/dues')
        revalidatePath('/bills') // Updates resident view
        return { success: true }
    } catch (error: any) {
        console.error("Create Dues Config Error:", error)
        return { success: false, error: error.message }
    }
}
