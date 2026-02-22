'use server'

import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"

export async function uploadQRCode(formData: FormData) {
    try {
        const supabase = createAdminClient()
        const authClient = await createClient()
        const { data: { user } } = await authClient.auth.getUser()

        if (!user) throw new Error("Unauthorized")

        const file = formData.get("file") as File
        const paymentMethod = formData.get("payment_method") as string
        const label = formData.get("label") as string
        const accountName = formData.get("account_name") as string
        const accountNumber = formData.get("account_number") as string

        if (!file || !paymentMethod || !label) {
            throw new Error("Missing required fields")
        }

        // 1. Upload to Storage
        const fileExt = file.name.split('.').pop()
        const fileName = `${paymentMethod.toLowerCase()}-${randomUUID()}.${fileExt}`
        const filePath = `${fileName}`

        const { error: uploadError } = await supabase.storage
            .from('qr-codes')
            .upload(filePath, file, {
                contentType: file.type,
                upsert: false
            })

        if (uploadError) throw new Error("Upload failed: " + uploadError.message)

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('qr-codes')
            .getPublicUrl(filePath)

        // 3. Insert into DB
        const { error: dbError } = await supabase
            .from('payment_qr_codes')
            .insert({
                payment_method: paymentMethod,
                label: label,
                account_name: accountName,
                account_number: accountNumber,
                qr_image_url: publicUrl,
                is_active: true
            })

        if (dbError) {
            // Cleanup storage if DB insert fails
            await supabase.storage.from('qr-codes').remove([filePath])
            throw new Error("Database insert failed: " + dbError.message)
        }

        revalidatePath('/admin/qr-codes')
        revalidatePath('/bills') // Update resident view too
        return { success: true }
    } catch (error: any) {
        console.error("Upload QR Code Error:", error)
        return { success: false, error: error.message }
    }
}

export async function deleteQRCode(id: string, qrUrl: string) {
    try {
        const supabase = createAdminClient()

        // Try to clean up storage if the URL is a Supabase storage URL
        const pathParts = qrUrl.split('/qr-codes/')
        if (pathParts.length >= 2) {
            const filePath = pathParts[1]
            const { error: storageError } = await supabase.storage
                .from('qr-codes')
                .remove([filePath])
            if (storageError) console.error("Storage delete warning:", storageError)
        }
        // Non-storage URLs (e.g. placeholder images) are simply skipped

        // Delete from DB
        const { error: dbError } = await supabase
            .from('payment_qr_codes')
            .delete()
            .eq('id', id)

        if (dbError) throw new Error("Database delete failed: " + dbError.message)

        revalidatePath('/admin/qr-codes')
        revalidatePath('/bills')
        return { success: true }
    } catch (error: any) {
        console.error("Delete QR Code Error:", error)
        return { success: false, error: error.message }
    }
}

export async function toggleQRCodeStatus(id: string, isActive: boolean) {
    try {
        const supabase = createAdminClient()

        const { error } = await supabase
            .from('payment_qr_codes')
            .update({ is_active: isActive })
            .eq('id', id)

        if (error) throw new Error(error.message)

        revalidatePath('/admin/qr-codes')
        revalidatePath('/bills')
        return { success: true }
    } catch (error: any) {
        console.error('Toggle Status Error:', error)
        return { success: false, error: error.message }
    }
}

/**
 * Fetch the most recent active HOA dues configuration row.
 * Returns null if none exists yet.
 */
export async function getActiveDuesConfig() {
    const supabase = createAdminClient()
    const { data } = await supabase
        .from('hoa_dues_config')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    return data ?? null
}

/**
 * Upsert HOA dues configuration:
 * Deactivates all existing active rows and inserts a new active record.
 */
export async function upsertDuesConfig(formData: FormData) {
    try {
        const authClient = await createClient()
        const { data: { user } } = await authClient.auth.getUser()
        if (!user) throw new Error('Unauthorized')

        const supabase = createAdminClient()

        const annual_amount = parseFloat(formData.get('annual_amount') as string)
        const car_sticker_price = parseFloat(formData.get('car_sticker_price') as string)
        const dues_year = parseInt(formData.get('dues_year') as string, 10)
        const due_date = formData.get('due_date') as string | null

        if (isNaN(annual_amount) || isNaN(car_sticker_price) || isNaN(dues_year)) {
            throw new Error('Invalid numeric values')
        }

        // Try to update existing config for this year first
        const { data: existing } = await supabase
            .from('hoa_dues_config')
            .select('id')
            .eq('dues_year', dues_year)
            .maybeSingle()

        if (existing) {
            // Update the existing row for this year
            const { error } = await supabase
                .from('hoa_dues_config')
                .update({
                    annual_amount,
                    car_sticker_price,
                    due_date: due_date || null,
                    is_active: true,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)

            if (error) throw new Error(error.message)
        } else {
            // Deactivate all other years, then insert new row
            await supabase
                .from('hoa_dues_config')
                .update({ is_active: false })
                .eq('is_active', true)

            const { error } = await supabase.from('hoa_dues_config').insert({
                annual_amount,
                car_sticker_price,
                dues_year,
                due_date: due_date || null,
                is_active: true,
            })

            if (error) throw new Error(error.message)
        }

        revalidatePath('/admin/qr-codes')
        revalidatePath('/bills')
        return { success: true }
    } catch (error: any) {
        console.error('Upsert Dues Config Error:', error)
        return { success: false, error: error.message }
    }
}
