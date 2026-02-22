import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { requireAdminAPI } from "@/lib/supabase/guards"

export async function POST(req: Request) {


  try {
    const url = new URL(req.url)
    const key = url.searchParams.get("key")
    const requiredKey = process.env.ADMIN_ACCESS_KEY
    if (requiredKey && key !== requiredKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) return NextResponse.json({ error: userError.message }, { status: 400 })
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    // Upsert into app users table with auth.uid as id and role ADMIN
    const email = user.email || ""
    const firstName = email.split("@")[0]
    const lastName = ""

    const { error } = await supabase.from("users").upsert(
      {
        id: user.id,
        email,
        password_hash: "", // not used; auth is managed by Supabase Auth
        first_name: firstName,
        last_name: lastName,
        role: "ADMIN",
        is_active: true,
      },
      { onConflict: "id" },
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, userId: user.id, role: "ADMIN" }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function GET(req: Request) {


  // Convenience GET to perform the same bootstrap as POST
  try {
    const url = new URL(req.url)
    const key = url.searchParams.get("key")
    const requiredKey = process.env.ADMIN_ACCESS_KEY
    if (requiredKey && key !== requiredKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await createClient()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) return NextResponse.json({ error: userError.message }, { status: 400 })
    if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 })

    const email = user.email || ""
    const firstName = email.split("@")[0]
    const lastName = ""

    const { error } = await supabase.from("users").upsert(
      {
        id: user.id,
        email,
        password_hash: "",
        first_name: firstName,
        last_name: lastName,
        role: "ADMIN",
        is_active: true,
      },
      { onConflict: "id" },
    )

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true, userId: user.id, role: "ADMIN" }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
