import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

export async function GET() {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from("departments")
      .select("id,name,is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ items: (data || []).map((d) => ({ id: d.id, name: d.name })) }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
