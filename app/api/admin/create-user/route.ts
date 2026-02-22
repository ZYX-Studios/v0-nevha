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

    // Create auth user (email confirmed to avoid email verification for dev convenience)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {},
    })
    if (createErr) return NextResponse.json({ error: createErr.message }, { status: 400 })
    const authUser = created.user
    if (!authUser) return NextResponse.json({ error: "Failed to create auth user" }, { status: 400 })

    // Upsert app-level users row (bypass RLS via service role)
    const { error: upsertErr } = await admin.from("users").upsert(
      {
        id: authUser.id,
        email,
        password_hash: "",
        first_name: "",
        last_name: "",
        role, // 'ADMIN' | 'STAFF' | 'PUBLIC'
        is_active: true,
      },
      { onConflict: "id" },
    )
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 400 })

    return NextResponse.json({ success: true, userId: authUser.id, email, role }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
