import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAuthAPI } from "@/lib/supabase/guards"
import { uploadVehicleDoc, validateUploadFile } from "@/lib/google-drive"

/**
 * POST /api/vehicles/upload-doc
 *
 * Uploads an OR or CR document for a vehicle registration request.
 * Returns fileId for storage in vehicle_requests.documents.
 */
export async function POST(req: Request) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    try {
        const formData = await req.formData()
        const file = formData.get("file") as File | null
        const plateNumber = formData.get("plateNumber") as string | null
        const docType = (formData.get("docType") as string) || "vehicle_doc" // 'or' | 'cr'

        if (!file || !plateNumber) {
            return NextResponse.json({ error: "Missing file or plateNumber" }, { status: 400 })
        }

        const validation = validateUploadFile(file)
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 422 })
        }

        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

        // Get homeowner info for folder naming
        const adminClient = createAdminClient()
        const { data: homeowner } = await adminClient
            .from("homeowners")
            .select("id, first_name, last_name")
            .eq("user_id", user.id)
            .maybeSingle()

        const personName = homeowner
            ? `${homeowner.first_name}_${homeowner.last_name}`
            : `user_${user.id.slice(0, 8)}`

        const buffer = Buffer.from(await file.arrayBuffer())

        const { fileId, webViewLink } = await uploadVehicleDoc(
            buffer,
            file.name,
            file.type,
            personName,
            user.id,
            plateNumber
        )

        return NextResponse.json({
            fileId,
            proxyUrl: `/api/gdrive-proxy?fileId=${fileId}`,
            docType,
            fileName: file.name,
        })
    } catch (err: any) {
        console.error("[vehicle-upload-doc]", err?.message)
        return NextResponse.json({ error: err?.message || "Upload failed" }, { status: 500 })
    }
}
