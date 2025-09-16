import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    const statuses = ["NEW", "TRIAGED", "IN_PROGRESS", "NEEDS_INFO", "RESOLVED", "CLOSED"] as const
    const priorities = ["P1", "P2", "P3", "P4"] as const

    const now = new Date()
    const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Total issues
    const totalHead = await supabase.from("issues").select("*", { count: "exact", head: true })
    const total = totalHead.count || 0

    // Open issues (NEW/TRIAGED/IN_PROGRESS/NEEDS_INFO)
    const openHead = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .in("status", ["NEW", "TRIAGED", "IN_PROGRESS", "NEEDS_INFO"])
    const openCount = openHead.count || 0

    // Counts by status
    const statusCounts: Record<string, number> = {}
    for (const s of statuses) {
      const h = await supabase.from("issues").select("*", { count: "exact", head: true }).eq("status", s)
      statusCounts[s] = h.count || 0
    }

    // Counts by priority
    const priorityCounts: Record<string, number> = {}
    for (const p of priorities) {
      const h = await supabase.from("issues").select("*", { count: "exact", head: true }).eq("priority", p)
      priorityCounts[p] = h.count || 0
    }

    // Created in last 7 days
    const created7Head = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .gte("created_at", cutoff7)
    const createdLast7Days = created7Head.count || 0

    // Resolved in last 7 days (from issue_status_updates)
    const resolved7Head = await supabase
      .from("issue_status_updates")
      .select("*", { count: "exact", head: true })
      .eq("status", "RESOLVED")
      .gte("created_at", cutoff7)
    const resolvedLast7Days = resolved7Head.count || 0

    // Average resolution time (days) for issues that have at least one RESOLVED update
    const resolvedUpdates = await supabase
      .from("issue_status_updates")
      .select("issue_id, created_at")
      .eq("status", "RESOLVED")
    let avgResolutionDays: number | null = null
    if (resolvedUpdates.data && resolvedUpdates.data.length > 0) {
      // Find earliest RESOLVED per issue
      const earliestResolvedMap = new Map<string, string>()
      for (const row of resolvedUpdates.data) {
        const issueId = row.issue_id as string
        const ts = row.created_at as string
        const prev = earliestResolvedMap.get(issueId)
        if (!prev || new Date(ts).getTime() < new Date(prev).getTime()) {
          earliestResolvedMap.set(issueId, ts)
        }
      }
      const issueIds = Array.from(earliestResolvedMap.keys())
      if (issueIds.length > 0) {
        const issuesRes = await supabase
          .from("issues")
          .select("id, created_at")
          .in("id", issueIds)
        if (issuesRes.data) {
          let totalDays = 0
          let n = 0
          const createdMap = new Map<string, string>()
          for (const it of issuesRes.data) createdMap.set(it.id as string, it.created_at as string)
          for (const [id, resolvedAt] of earliestResolvedMap.entries()) {
            const createdAt = createdMap.get(id)
            if (!createdAt) continue
            const d = (new Date(resolvedAt).getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
            if (isFinite(d) && d >= 0) {
              totalDays += d
              n += 1
            }
          }
          if (n > 0) avgResolutionDays = Number((totalDays / n).toFixed(1))
        }
      }
    }

    // Counts per department (linked via issue_departments)
    const deptLinks = await supabase
      .from("issue_departments")
      .select("department_id")
    const perDepartment: Array<{ departmentId: string; departmentName: string; count: number }> = []
    if (deptLinks.data) {
      const counts = new Map<string, number>()
      for (const row of deptLinks.data) {
        const id = row.department_id as string | null
        if (!id) continue
        counts.set(id, (counts.get(id) || 0) + 1)
      }
      const deptIds = Array.from(counts.keys())
      if (deptIds.length > 0) {
        const depts = await supabase.from("departments").select("id, name").in("id", deptIds)
        const nameMap = new Map<string, string>()
        for (const d of depts.data || []) nameMap.set(d.id as string, (d.name as string) || "")
        for (const id of deptIds) {
          perDepartment.push({ departmentId: id, departmentName: nameMap.get(id) || "(Unknown)", count: counts.get(id) || 0 })
        }
        perDepartment.sort((a, b) => b.count - a.count)
      }
    }

    // UI-oriented counts derived from DB enums
    const uiStatusCounts = {
      not_started: (statusCounts["NEW"] || 0) + (statusCounts["TRIAGED"] || 0),
      in_progress: statusCounts["IN_PROGRESS"] || 0,
      on_hold: statusCounts["NEEDS_INFO"] || 0,
      resolved: statusCounts["RESOLVED"] || 0,
      closed: statusCounts["CLOSED"] || 0,
    }
    const uiOpenCount = uiStatusCounts.not_started + uiStatusCounts.in_progress + uiStatusCounts.on_hold

    return NextResponse.json({
      total,
      openCount,
      statusCounts,
      priorityCounts,
      createdLast7Days,
      resolvedLast7Days,
      avgResolutionDays,
      perDepartment,
      uiStatusCounts,
      uiOpenCount,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Failed to compute issue stats" }, { status: 500 })
  }
}
