import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"
import { requireAdminAPI } from "@/lib/supabase/guards"

export async function GET() {
  const authError = await requireAdminAPI()
  if (authError) return authError

  try {
    const supabase = createAdminClient()

    const statuses = ["NEW", "TRIAGED", "IN_PROGRESS", "NEEDS_INFO", "RESOLVED", "CLOSED"] as const
    const priorities = ["P1", "P2", "P3", "P4"] as const

    const now = new Date()
    const cutoff7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // ── Parallel batch 1: all count queries + resolved updates + department links ──
    const [
      ...statusResults
    ] = await Promise.all([
      // 6 status counts
      ...statuses.map(s =>
        supabase.from("issues").select("*", { count: "exact", head: true }).eq("status", s)
      ),
      // 4 priority counts
      ...priorities.map(p =>
        supabase.from("issues").select("*", { count: "exact", head: true }).eq("priority", p)
      ),
      // Created in last 7 days
      supabase.from("issues").select("*", { count: "exact", head: true }).gte("created_at", cutoff7),
      // Resolved updates in last 7 days
      supabase.from("issue_status_updates").select("issue_id").eq("status", "RESOLVED").gte("created_at", cutoff7),
      // All resolved updates (for avg resolution)
      supabase.from("issue_status_updates").select("issue_id, created_at").eq("status", "RESOLVED"),
      // Department links
      supabase.from("issue_departments").select("issue_id, department_id"),
      // All departments
      supabase.from("departments").select("id, name, is_active"),
      // All issues with category (for department fallback mapping)
      supabase.from("issues").select("id, category"),
    ])

    // Unpack status counts (indices 0-5)
    const statusCounts: Record<string, number> = {}
    statuses.forEach((s, i) => { statusCounts[s] = statusResults[i].count || 0 })

    // Unpack priority counts (indices 6-9)
    const priorityCounts: Record<string, number> = {}
    priorities.forEach((p, i) => { priorityCounts[p] = statusResults[6 + i].count || 0 })

    // Created last 7 days (index 10)
    const createdLast7Days = statusResults[10].count || 0

    // Resolved last 7 days (index 11)
    const resolvedLast7DaysData = statusResults[11].data || []
    const resolvedLast7Days = new Set(resolvedLast7DaysData.map((r: any) => r.issue_id as string)).size

    // Avg resolution time (index 12)
    const resolvedUpdatesData = statusResults[12].data || []
    let avgResolutionDays: number | null = null
    if (resolvedUpdatesData.length > 0) {
      const earliestResolvedMap = new Map<string, string>()
      for (const row of resolvedUpdatesData) {
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

    // Department counts (indices 13, 14, 15)
    const deptLinksData = statusResults[13].data || []
    const allDepts = statusResults[14].data || []
    const allIssuesForDept = statusResults[15].data || []

    const counts = new Map<string, number>()
    const linkedIssueIds = new Set<string>()
    for (const row of deptLinksData) {
      const depId = row.department_id as string | null
      const issueId = row.issue_id as string | null
      if (issueId) linkedIssueIds.add(issueId)
      if (!depId) continue
      counts.set(depId, (counts.get(depId) || 0) + 1)
    }

    // Fallback: map category -> department
    const nameToId = new Map<string, string>()
    for (const d of allDepts) {
      const nm = String(d.name || "").trim().toLowerCase()
      if (nm) nameToId.set(nm, d.id as string)
    }
    for (const i of allIssuesForDept) {
      const iid = i.id as string
      if (linkedIssueIds.has(iid)) continue
      const cat = String(i.category || "").trim()
      if (!cat || cat.toLowerCase() === "others") continue
      const depId = nameToId.get(cat.toLowerCase())
      if (!depId) continue
      counts.set(depId, (counts.get(depId) || 0) + 1)
    }

    const perDepartment: Array<{ departmentId: string; departmentName: string; count: number }> = []
    if (counts.size > 0) {
      const nameMap = new Map<string, string>()
      for (const d of allDepts) nameMap.set(d.id as string, (d.name as string) || "")
      for (const [id, count] of counts.entries()) {
        perDepartment.push({ departmentId: id, departmentName: nameMap.get(id) || "(Unknown)", count })
      }
      perDepartment.sort((a, b) => b.count - a.count)
    }

    // UI-oriented counts
    const uiStatusCounts = {
      not_started: (statusCounts["NEW"] || 0) + (statusCounts["TRIAGED"] || 0),
      in_progress: statusCounts["IN_PROGRESS"] || 0,
      on_hold: statusCounts["NEEDS_INFO"] || 0,
      resolved: statusCounts["RESOLVED"] || 0,
      closed: statusCounts["CLOSED"] || 0,
    }
    const uiOpenCount = uiStatusCounts.not_started + uiStatusCounts.in_progress + uiStatusCounts.on_hold

    const total =
      (statusCounts["NEW"] || 0) + (statusCounts["TRIAGED"] || 0) +
      (statusCounts["IN_PROGRESS"] || 0) + (statusCounts["NEEDS_INFO"] || 0) +
      (statusCounts["RESOLVED"] || 0) + (statusCounts["CLOSED"] || 0)

    const openCount =
      (statusCounts["NEW"] || 0) + (statusCounts["TRIAGED"] || 0) +
      (statusCounts["IN_PROGRESS"] || 0) + (statusCounts["NEEDS_INFO"] || 0)

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
