"use server"

import { createClient } from "@/lib/supabase/server"
import { uploadRegistrationDoc, validateUploadFile } from "@/lib/google-drive"
import { revalidatePath } from "next/cache"

/**
 * Uploads an onboarding document to Google Drive (restricted, person-organized)
 * and stores the file reference in registration_requests.documents.
 */
export async function uploadOnboardingDoc(formData: FormData) {
    const supabase = await createClient()

    // 1. Auth check
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
        return { success: false, error: "Unauthorized" }
    }

    const file = formData.get("file") as File | null
    const type = formData.get("type") as string // "id" or "proof_of_residence"

    if (!file || !type) {
        return { success: false, error: "Missing file or document type" }
    }

    // 2. Server-side validation
    const validation = validateUploadFile(file)
    if (!validation.valid) {
        return { success: false, error: validation.error }
    }

    // 3. Get user's name for folder organization
    const { data: registrationReq } = await supabase
        .from("registration_requests")
        .select("first_name, last_name, documents")
        .eq("user_id", user.id)
        .single()

    if (!registrationReq) {
        return { success: false, error: "No registration request found. Please complete registration first." }
    }

    const personName = `${registrationReq.first_name}_${registrationReq.last_name}`

    try {
        // 4. Upload to Drive with person-organized folder structure
        const buffer = Buffer.from(await file.arrayBuffer())
        const { fileId, webViewLink } = await uploadRegistrationDoc(
            buffer,
            file.name,
            file.type,
            personName,
            user.id,
            type
        )

        // 5. Update database — replace doc of same type, keep others
        const currentDocs = (registrationReq.documents as Array<{
            type: string
            fileId: string
            viewLink: string
            uploadedAt: string
            fileName: string
        }>) || []

        const updatedDocs = [
            ...currentDocs.filter((d) => d.type !== type),
            {
                type,
                fileId,
                viewLink: webViewLink,
                uploadedAt: new Date().toISOString(),
                fileName: file.name,
            },
        ]

        const { error: updateError } = await supabase
            .from("registration_requests")
            .update({ documents: updatedDocs })
            .eq("user_id", user.id)

        if (updateError) throw updateError

        revalidatePath("/onboarding")
        return { success: true, fileId }
    } catch (e: any) {
        console.error("[uploadOnboardingDoc] Upload failed:", e)
        return { success: false, error: e?.message || "Upload failed. Please try again." }
    }
}
