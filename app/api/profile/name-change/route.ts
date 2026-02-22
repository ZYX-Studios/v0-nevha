import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAuthAPI } from "@/lib/supabase/guards"
import { uploadRegistrationDoc, validateUploadFile } from "@/lib/google-drive"
import { z } from "zod"

const NameChangeSchema = z.object({
    fieldName: z.enum(["first_name", "last_name"]),
    newValue: z.string().min(1).max(100),
})

/**
 * POST /api/profile/name-change
 * Submits a name-change request with required document upload.
 * Admin must approve before the name is updated.
 */
export async function POST(req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await req.formData()
    const fieldName = formData.get("fieldName") as string
    const newValue = formData.get("newValue") as string
    const file = formData.get("file") as File | null

    const parsed = NameChangeSchema.safeParse({ fieldName, newValue })
    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    if (!file) {
        return NextResponse.json({ error: "Supporting document (government ID) is required for name changes" }, { status: 400 })
    }

    const validation = validateUploadFile(file)
    if (!validation.valid) return NextResponse.json({ error: validation.error }, { status: 422 })

    const adminClient = createAdminClient()
    const { data: homeowner } = await adminClient
        .from("homeowners")
        .select("id, first_name, last_name")
        .eq("user_id", user.id)
        .maybeSingle()

    if (!homeowner) {
        return NextResponse.json({ error: "Homeowner record not found" }, { status: 404 })
    }

    // Get current value for the old_value field
    const oldValue = homeowner[parsed.data.fieldName as "first_name" | "last_name"] || ""

    // Upload document
    const personName = `${homeowner.first_name}_${homeowner.last_name}`
    const buffer = Buffer.from(await file.arrayBuffer())
    const { fileId } = await uploadRegistrationDoc(buffer, file.name, file.type, personName, user.id, "name_change")

    // Create name change request
    const { error: insertErr } = await adminClient
        .from("profile_change_requests")
        .insert({
            homeowner_id: homeowner.id,
            user_id: user.id,
            field_name: parsed.data.fieldName,
            old_value: oldValue,
            new_value: parsed.data.newValue,
            document_url: `/api/gdrive-proxy?fileId=${fileId}`,
            document_file_id: fileId,
            status: "pending",
        })

    if (insertErr) {
        return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
}

/**
 * GET /api/profile/name-change
 * Returns the authenticated user's pending/recent name change requests.
 */
export async function GET(req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
        .from("profile_change_requests")
        .select("id, field_name, old_value, new_value, status, admin_notes, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ requests: data })
}
