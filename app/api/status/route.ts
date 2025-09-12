import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const ref = url.searchParams.get("ref")

    if (!ref) {
      return NextResponse.json({ error: "Missing ref query parameter" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_issue_status", { ref })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const item = Array.isArray(data) ? data[0] : data

    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return NextResponse.json({ item }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
