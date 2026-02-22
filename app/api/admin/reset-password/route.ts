import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { requireAdminAPI } from "@/lib/supabase/guards"

export async function POST(req: Request) {


  try {
    const url = new URL(req.url)
    const key = url.searchParams.get("key")
    const requiredKey = process.env.ADMIN_ACCESS_KEY
    if (requiredKey && key !== requiredKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const email = (body?.email || "").trim()
    const password = (body?.password || "").trim()
    const role = (body?.role || "ADMIN").trim().toUpperCase() as "ADMIN" | "STAFF" | "PUBLIC"

    if (!email || !password) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 })
    }

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server missing Supabase configuration" }, { status: 500 })
    }

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

    // Get auth user id from app users table by email
    const { data: appUser, error: appErr } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .maybeSingle()

    if (appErr) return NextResponse.json({ error: appErr.message }, { status: 400 })
    if (!appUser?.id) return NextResponse.json({ error: "No app user found for this email" }, { status: 404 })

    // Update password via Admin API
    const { data: updated, error: updErr } = await admin.auth.admin.updateUserById(appUser.id, { password, email_confirm: true })
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 })

    // Ensure role stays aligned (optional safety) without touching password_hash
    const { data: updatedRows, error: updateErr } = await admin
      .from("users")
      .update({ role, is_active: true })
      .eq("id", appUser.id)
      .select("id")

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 400 })

    // If somehow no row existed, create one and satisfy NOT NULL password_hash
    if (!updatedRows || updatedRows.length === 0) {
      const { error: insertErr } = await admin.from("users").upsert(
        {
          id: appUser.id,
          email,
          password_hash: "",
          role,
          is_active: true,
        },
        { onConflict: "id" },
      )
      if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: appUser.id, email, role }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
