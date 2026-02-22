import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient as createSSRClient } from "@/lib/supabase/server"
import { requireAdminAPI } from "@/lib/supabase/guards"
function mapRow(row: any) {
  return {
    id: row.id as string,
    title: row.title as string,
    content: row.content as string,
    priority: (row.priority || "normal") as "low" | "normal" | "high" | "urgent",
    isPublished: (row.is_published as boolean) || !!row.published_at,
    publishDate: (row.publish_date as string) || (row.published_at as string) || undefined,
    expiryDate: (row.expiry_date as string) || undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }
}

export async function GET(request: Request) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const denied = await requireAdminAPI()
    if (denied) return denied
    const supabase = createAdminClient()
    const url = (request as any).nextUrl as URL
    const search = url.searchParams.get("search")?.trim()
    const status = url.searchParams.get("status")?.trim() // "published" | "draft" | undefined
    const priority = url.searchParams.get("priority")?.trim() as
      | "low"
      | "normal"
      | "high"
      | "urgent"
      | undefined

    let query = supabase
      .from("announcements")
      .select("*")

    if (search) {
      // Search in title OR content
      const like = `%${search}%`
      query = query.or(`title.ilike.${like},content.ilike.${like}`)
    }

    if (priority && ["low", "normal", "high", "urgent"].includes(priority)) {
      query = query.eq("priority", priority)
    }

    if (status === "published") {
      // Consider published if is_published OR published_at is set
      query = query.or("is_published.eq.true,published_at.not.is.null")
    } else if (status === "draft") {
      // Draft if not published and no published_at
      query = query.eq("is_published", false).is("published_at", null)
    }

    const { data, error } = await query
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("publish_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false, nullsFirst: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    const items = (data || []).map(mapRow)
    return NextResponse.json({ items }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const denied = await requireAdminAPI()
    if (denied) return denied
    const admin = createAdminClient()
    const supa = await createSSRClient()
    const {
      title,
      content,
      priority = "normal",
      isPublished = false,
      publishDate,
      expiryDate,
    } = (await request.json()) as {
      title: string
      content: string
      priority?: "low" | "normal" | "high" | "urgent"
      isPublished?: boolean
      publishDate?: string
      expiryDate?: string
    }

    if (!title || !title.trim() || !content || !content.trim()) {
      return NextResponse.json({ error: "Title and content are required" }, { status: 400 })
    }

    if (!["low", "normal", "high", "urgent"].includes(priority)) {
      return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
    }

    const {
      data: { user },
    } = await supa.auth.getUser()

    const insertData: any = {
      title: title.trim(),
      content: content.trim(),
      priority,
      author_id: user?.id ?? null,
      is_published: !!isPublished,
      updated_at: new Date().toISOString(),
    }

    if (publishDate) insertData.publish_date = new Date(publishDate).toISOString()
    if (expiryDate) insertData.expiry_date = new Date(expiryDate).toISOString()

    // If publishing immediately without a provided publishDate, leave publish_date NULL.
    // Public API treats (is_published && publish_date is NULL) as published immediately.

    const { data, error } = await admin
      .from("announcements")
      .insert(insertData)
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ item: mapRow(data) }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
