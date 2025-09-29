import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

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

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const { id } = params
    const { data, error } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle()
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ item: mapRow(data) }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const { id } = params
    const body = (await req.json()) as Partial<{
      title: string
      content: string
      priority: "low" | "normal" | "high" | "urgent"
      isPublished: boolean
      publishDate: string | null
      expiryDate: string | null
    }>

    const update: any = {
      updated_at: new Date().toISOString(),
    }

    if (typeof body.title === "string") update.title = body.title.trim()
    if (typeof body.content === "string") update.content = body.content.trim()

    if (body.priority !== undefined) {
      if (!["low", "normal", "high", "urgent"].includes(body.priority)) {
        return NextResponse.json({ error: "Invalid priority" }, { status: 400 })
      }
      update.priority = body.priority
    }

    if (body.publishDate !== undefined) {
      const iso = body.publishDate ? new Date(body.publishDate).toISOString() : null
      update.publish_date = iso
      // If scheduling for the future, clear published_at to avoid early visibility
      if (iso) {
        const now = new Date()
        if (new Date(iso) > now) {
          update.published_at = null
        }
      }
    }

    if (body.expiryDate !== undefined) {
      update.expiry_date = body.expiryDate ? new Date(body.expiryDate).toISOString() : null
    }

    if (typeof body.isPublished === "boolean") {
      update.is_published = body.isPublished
      // Maintain PRD-friendly published_at: set when publishing now, clear when unpublishing
      if (body.isPublished) {
        // Only set published_at if there is no future-dated publish_date
        if (!body.publishDate) {
          update.published_at = new Date().toISOString()
        }
      } else {
        update.published_at = null
      }
    }

    const { data, error } = await supabase
      .from("announcements")
      .update(update)
      .eq("id", id)
      .select("*")
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ item: mapRow(data) }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const { id } = params

    const { error } = await supabase.from("announcements").delete().eq("id", id)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 })
  }
}
