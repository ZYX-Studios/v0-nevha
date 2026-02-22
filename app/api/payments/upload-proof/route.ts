import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAuthAPI } from "@/lib/supabase/guards"
import { uploadPaymentProof, validateUploadFile } from "@/lib/google-drive"

/**
 * POST /api/payments/upload-proof
 *
 * Uploads a payment proof document to Google Drive under the homeowner's
 * person-specific folder (restricted access). Returns fileId and a proxy URL.
 */
export async function POST(req: Request) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    try {
        const formData = await req.formData()
        const file = formData.get("file") as File | null
        const homeownerId = formData.get("homeownerId") as string | null

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
        }
        if (!homeownerId) {
            return NextResponse.json({ error: "Missing homeownerId" }, { status: 400 })
        }

        // Server-side file validation
        const validation = validateUploadFile(file)
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 422 })
        }

        const supabase = await createClient()
        const {
            data: { user },
            error: authErr,
        } = await supabase.auth.getUser()
        if (authErr || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        // Get homeowner name for folder organization
        const adminClient = createAdminClient()
        const { data: homeowner } = await adminClient
            .from("homeowners")
            .select("first_name, last_name")
            .eq("id", homeownerId)
            .maybeSingle()

        const personName = homeowner
            ? `${homeowner.first_name || "Unknown"}_${homeowner.last_name || "User"}`
            : `homeowner_${homeownerId.slice(0, 8)}`

        const buffer = Buffer.from(await file.arrayBuffer())

        const { fileId, webViewLink } = await uploadPaymentProof(
            buffer,
            file.name,
            file.type,
            personName,
            homeownerId
        )

        // Return fileId — the proxy URL is derived client-side from this
        const proxyUrl = `/api/gdrive-proxy?fileId=${fileId}`

        return NextResponse.json({ fileId, proxyUrl, webViewLink })
    } catch (error: any) {
        console.error("[upload-proof] Error:", error?.message)
        return NextResponse.json(
            { error: error?.message || "Upload failed" },
            { status: 500 }
        )
    }
}
