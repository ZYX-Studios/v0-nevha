import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from("departments")
      .select("id,name,is_active")
      .eq("is_active", true)
      .order("name", { ascending: true })

    if (error)
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } },
      )

    const items = (data || []).map((d: any) => ({ id: d.id as string, name: String(d.name || "") }))
    return NextResponse.json(
      { items },
      { status: 200, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } },
    )
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Server error" },
      { status: 500, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } },
    )
  }
}
