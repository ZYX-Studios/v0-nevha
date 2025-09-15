import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const email = (url.searchParams.get("email") || "").trim()

    if (!email) {
      return NextResponse.json(
        { error: "Missing email query parameter" },
        { status: 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } },
      )
    }

    const supabase = await createClient()

    const { data, error } = await supabase.rpc("get_issues_by_email", { email })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400, headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate" } },
      )
    }

    const items = Array.isArray(data) ? data : []

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
