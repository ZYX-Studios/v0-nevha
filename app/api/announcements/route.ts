import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await createClient()
    const nowIso = new Date().toISOString()

    // Filter: published, publish_date <= now (or null), expiry_date > now (or null)
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .eq("is_published", true)
      .or(`publish_date.is.null,publish_date.lte.${nowIso}`)
      .or(`expiry_date.is.null,expiry_date.gt.${nowIso}`)
      .order("publish_date", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const items = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      content: row.content,
      priority: row.priority || "normal",
      isPublished: row.is_published,
      publishDate: row.publish_date,
      expiryDate: row.expiry_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
