import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"
import { requireAdminAPI } from "@/lib/supabase/guards"
const CreateUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional().nullable(),
  role: z.enum(["ADMIN", "STAFF", "PUBLIC"]).default("STAFF"),
})

export async function GET(req: Request) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const supabase = createAdminClient()
    const { searchParams } = new URL(req.url)

    const q = (searchParams.get("q") || "").trim()
    const role = searchParams.get("role") || ""
    const isActive = searchParams.get("isActive")
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10))
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") || "25", 10)))
    const sortParam = (searchParams.get("sort") || "created_at").toLowerCase()
    const orderParam = (searchParams.get("order") || "desc").toLowerCase()
    const ascending = orderParam === "asc"

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1

    let query = supabase
      .from("users")
      .select("*", { count: "exact" })

    // Text search across name and email
    if (q) {
      const like = `%${q}%`
      query = query.or([
        `first_name.ilike.${like}`,
        `last_name.ilike.${like}`,
        `email.ilike.${like}`,
      ].join(",")) as typeof query
    }

    // Role filter — supports comma-separated values like "ADMIN,STAFF"
    if (role) {
      const roles = role.split(",").map(r => r.trim()).filter(r => ["ADMIN", "STAFF", "PUBLIC", "HOMEOWNER"].includes(r))
      if (roles.length === 1) {
        query = query.eq("role", roles[0]) as typeof query
      } else if (roles.length > 1) {
        query = query.in("role", roles) as typeof query
      }
    }

    // Active status filter
    if (isActive === "true") {
      query = query.eq("is_active", true) as typeof query
    } else if (isActive === "false") {
      query = query.eq("is_active", false) as typeof query
    }

    // Sorting
    switch (sortParam) {
      case "name":
        query = query.order("first_name", { ascending }) as typeof query
        query = query.order("last_name", { ascending }) as typeof query
        break
      case "email":
        query = query.order("email", { ascending }) as typeof query
        break
      case "role":
        query = query.order("role", { ascending }) as typeof query
        break
      case "created_at":
      default:
        query = query.order("created_at", { ascending }) as typeof query
        break
    }

    // Pagination
    query = query.range(from, to) as typeof query

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    const items = (data || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    }))

    return NextResponse.json({
      items,
      page,
      pageSize,
      total: count ?? 0,
    })
  } catch (e: any) {
    console.error("Users list error:", e)
    return NextResponse.json(
      { error: e?.message || "Failed to fetch users" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const json = await req.json()
    const parsed = CreateUserSchema.safeParse(json)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { email, password, firstName, lastName, phone, role } = parsed.data

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: "Server missing Supabase configuration" },
        { status: 500 }
      )
    }

    // Use service role client for admin operations
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Create auth user
    const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Skip email verification
      user_metadata: {
        firstName,
        lastName,
        phone: phone || undefined,
      },
    })

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 400 }
      )
    }

    if (!authUser.user) {
      return NextResponse.json(
        { error: "Failed to create auth user" },
        { status: 400 }
      )
    }

    // Create app user record
    const { error: insertError } = await adminClient.from("users").insert({
      id: authUser.user.id,
      email,
      password_hash: "", // Not used with Supabase Auth
      first_name: firstName,
      last_name: lastName,
      phone: phone || null,
      role,
      is_active: true,
    })

    if (insertError) {
      // Clean up auth user if app user creation fails
      await adminClient.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { error: insertError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authUser.user.id,
        email,
        firstName,
        lastName,
        phone,
        role,
        isActive: true,
      },
    }, { status: 201 })
  } catch (e: any) {
    console.error("Create user error:", e)
    return NextResponse.json(
      { error: e?.message || "Failed to create user" },
      { status: 500 }
    )
  }
}
