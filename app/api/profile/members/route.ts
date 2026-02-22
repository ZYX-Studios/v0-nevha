import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAuthAPI } from "@/lib/supabase/guards"

/**
 * GET /api/profile/members
 * Returns all household members belonging to the authenticated user's homeowner record.
 *
 * POST /api/profile/members
 * Body: { full_name, relation, phone? }
 * Adds a new household member. Uses admin client to bypass RLS — auth is enforced by
 * verifying the homeowner_id belongs to the current user before inserting.
 */

async function getHomeownerId(userId: string): Promise<string | null> {
    const admin = createAdminClient()
    const { data } = await admin
        .from("homeowners")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle()
    return data?.id ?? null
}

export async function GET(req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const homeownerId = await getHomeownerId(user.id)
    if (!homeownerId) return NextResponse.json({ error: "Homeowner record not found" }, { status: 404 })

    const admin = createAdminClient()
    const { data, error } = await admin
        .from("members")
        .select("*")
        .eq("homeowner_id", homeownerId)
        .order("created_at", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ members: data ?? [] })
}

export async function POST(req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const homeownerId = await getHomeownerId(user.id)
    if (!homeownerId) return NextResponse.json({ error: "Homeowner record not found" }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const { full_name, relation, phone } = body as { full_name?: string; relation?: string; phone?: string }
    if (!full_name?.trim()) return NextResponse.json({ error: "full_name is required" }, { status: 400 })

    const admin = createAdminClient()
    const { data, error } = await admin
        .from("members")
        .insert({
            homeowner_id: homeownerId,
            full_name: full_name.trim(),
            relation: relation?.trim() || null,
            phone: phone?.trim() || null,
        })
        .select()
        .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ member: data }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
    const authError = await requireAuthAPI()
    if (authError) return authError

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const homeownerId = await getHomeownerId(user.id)
    if (!homeownerId) return NextResponse.json({ error: "Homeowner record not found" }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const memberId = searchParams.get("id")
    if (!memberId) return NextResponse.json({ error: "id is required" }, { status: 400 })

    const admin = createAdminClient()

    // Ownership check: ensure this member belongs to this homeowner
    const { data: existing } = await admin
        .from("members")
        .select("id, homeowner_id")
        .eq("id", memberId)
        .maybeSingle()

    if (!existing || existing.homeowner_id !== homeownerId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error } = await admin.from("members").delete().eq("id", memberId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
}
