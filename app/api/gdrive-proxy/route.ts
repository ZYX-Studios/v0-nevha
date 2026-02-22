import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { streamFileFromDrive } from "@/lib/google-drive"

/**
 * GET /api/gdrive-proxy?fileId=<driveFileId>
 *
 * Authenticated proxy that streams a Google Drive file to the browser inline
 * (for image/pdf preview). Only accessible to:
 *   - ADMIN or STAFF users (can view any file)
 *   - HOMEOWNER users viewing their own documents
 *
 * Security: Files on Drive are owner-only. This proxy authenticates the caller
 * against Supabase, then fetches the file using HOA service credentials.
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const fileId = searchParams.get("fileId")

    if (!fileId) {
        return NextResponse.json({ error: "Missing fileId parameter" }, { status: 400 })
    }

    // ── Auth check ───────────────────────────────────────────────────────────────
    const supabase = await createClient()
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check role (ADMIN/STAFF can view all; HOMEOWNER can view their own)
    const adminClient = createAdminClient()
    const { data: dbUser } = await adminClient
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single()

    const isAdmin = dbUser?.role === "ADMIN" || dbUser?.role === "STAFF"

    if (!isAdmin) {
        // For non-admins: verify the fileId is referenced in their own records
        // Check registration_requests, payments, vehicle_requests
        const homeowner = await adminClient
            .from("homeowners")
            .select("id")
            .eq("user_id", user.id)
            .maybeSingle()

        if (!homeowner.data) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        const homeownerId = homeowner.data.id
        const hasAccess = await checkFileAccess(adminClient, fileId, user.id, homeownerId)

        if (!hasAccess) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }
    }

    // ── Stream file from Google Drive ────────────────────────────────────────────
    try {
        const { stream, mimeType, fileName } = await streamFileFromDrive(fileId)

        const response = new NextResponse(stream as any, {
            status: 200,
            headers: {
                "Content-Type": mimeType,
                // Inline display (not force-download) — allows browser preview
                "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}"`,
                // Cache for 5 minutes — files don't change often
                "Cache-Control": "private, max-age=300",
            },
        })

        return response
    } catch (err: any) {
        console.error("[gdrive-proxy] Stream error:", err?.message)
        return NextResponse.json(
            { error: "Failed to retrieve file from Google Drive" },
            { status: 500 }
        )
    }
}

/**
 * Checks if a given fileId appears in any records owned by this user.
 * Looks in registration_requests.documents, payments.proof_drive_file_id,
 * vehicle_requests.documents, and homeowners.profile_photo_url.
 */
async function checkFileAccess(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    supabase: any,
    fileId: string,
    userId: string,
    homeownerId: string
): Promise<boolean> {
    // Check registration documents
    const { data: regReq } = await supabase
        .from("registration_requests")
        .select("documents")
        .eq("user_id", userId)
        .maybeSingle()

    if (regReq?.documents) {
        const docs = regReq.documents as Array<{ fileId?: string }>
        if (docs.some((d) => d.fileId === fileId)) return true
    }

    // Check payment proofs
    const { data: payment } = await supabase
        .from("payments")
        .select("proof_drive_file_id")
        .eq("homeowner_id", homeownerId)
        .eq("proof_drive_file_id", fileId)
        .maybeSingle()

    if (payment) return true

    // Check vehicle request documents
    const { data: vehicleReq } = await supabase
        .from("vehicle_requests")
        .select("documents")
        .eq("user_id", userId)
        .filter("documents", "cs", JSON.stringify([{ fileId }]))
        .maybeSingle()

    if (vehicleReq) return true

    // Check profile photo
    const { data: homeowner } = await supabase
        .from("homeowners")
        .select("profile_photo_url")
        .eq("id", homeownerId)
        .maybeSingle()

    if (homeowner?.profile_photo_url?.includes(fileId)) return true

    return false
}
