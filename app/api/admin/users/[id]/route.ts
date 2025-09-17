import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

const UpdateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "STAFF", "PUBLIC"]).optional(),
  isActive: z.boolean().optional(),
})

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const { id } = params

    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const user = {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return NextResponse.json({ user })
  } catch (e: any) {
    console.error("Get user error:", e)
    return NextResponse.json(
      { error: e?.message || "Failed to fetch user" },
      { status: 500 }
    )
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const { id } = params
    const json = await req.json()
    const parsed = UpdateUserSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const updates = parsed.data

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (updates.firstName !== undefined) {
      updateData.first_name = updates.firstName
    }
    if (updates.lastName !== undefined) {
      updateData.last_name = updates.lastName
    }
    if (updates.phone !== undefined) {
      updateData.phone = updates.phone
    }
    if (updates.role !== undefined) {
      updateData.role = updates.role
    }
    if (updates.isActive !== undefined) {
      updateData.is_active = updates.isActive
    }

    const { data, error } = await supabase
      .from("users")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const user = {
      id: data.id,
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name,
      phone: data.phone,
      role: data.role,
      isActive: data.is_active,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return NextResponse.json({ user })
  } catch (e: any) {
    console.error("Update user error:", e)
    return NextResponse.json(
      { error: e?.message || "Failed to update user" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createAdminClient()
    const { id } = params

    // Soft delete by setting is_active to false
    const { data, error } = await supabase
      .from("users")
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      message: "User deactivated successfully"
    })
  } catch (e: any) {
    console.error("Delete user error:", e)
    return NextResponse.json(
      { error: e?.message || "Failed to deactivate user" },
      { status: 500 }
    )
  }
}
