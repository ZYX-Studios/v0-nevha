import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAuthAPI } from "@/lib/supabase/guards"
import { uploadProfilePhoto, validateUploadFile } from "@/lib/google-drive"

/**
 * POST /api/profile/photo
 * Uploads a profile photo and stores the GDrive fileId on the homeowners record.
 */
export async function POST(req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get("file") as File | null

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

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

    const personName = `${homeowner.first_name}_${homeowner.last_name}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { fileId } = await uploadProfilePhoto(buffer, file.name, file.type, personName, user.id)

    const proxyUrl = `/api/gdrive-proxy?fileId=${fileId}`
    // Persist canonical URL (without cache-buster) to DB
    await adminClient
        .from("homeowners")
        .update({ profile_photo_url: proxyUrl })
        .eq("id", homeowner.id)

    // Return with cache-busting timestamp so browser shows new photo immediately
    const cacheBustedUrl = `${proxyUrl}&t=${Date.now()}`
    return NextResponse.json({ success: true, profilePhotoUrl: cacheBustedUrl })
}
