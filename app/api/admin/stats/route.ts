import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server-admin"

export async function GET() {
  try {
    const supabase = createAdminClient()

    // Get total homeowners count
    const homeownersCount = await supabase
      .from("homeowners")
      .select("*", { count: "exact", head: true })
    const totalHomeowners = homeownersCount.count || 0

    // Get active issues count (not resolved or closed)
    const activeIssuesCount = await supabase
      .from("issues")
      .select("*", { count: "exact", head: true })
      .not("status", "in", "(RESOLVED,CLOSED)")
    const activeIssues = activeIssuesCount.count || 0

    // Get published announcements count
    const publishedAnnouncementsCount = await supabase
      .from("announcements")
      .select("*", { count: "exact", head: true })
      .eq("is_published", true)
    const publishedAnnouncements = publishedAnnouncementsCount.count || 0

    // Get active car stickers count
    const activeStickersCount = await supabase
      .from("stickers")
      .select("*", { count: "exact", head: true })
      .eq("status", "ACTIVE")
    const activeCarStickers = activeStickersCount.count || 0

    // Get recent issues (last 5)
    const recentIssuesRes = await supabase
      .from("issues")
      .select(`
        id,
        title,
        description,
        category,
        status,
        priority,
        created_at,
        reporter_full_name,
        reporter_email
      `)
      .order("created_at", { ascending: false })
      .limit(5)

    const recentIssues = (recentIssuesRes.data || []).map((issue: any) => ({
      id: issue.id,
      title: issue.title,
      description: issue.description,
      category: issue.category,
      status: mapDbStatusToUi(issue.status),
      priority: mapDbPriorityToUi(issue.priority),
      createdAt: issue.created_at,
      reporterName: issue.reporter_full_name,
      reporterEmail: issue.reporter_email,
    }))

    // Get recent announcements (last 3 published)
    const recentAnnouncementsRes = await supabase
      .from("announcements")
      .select(`
        id,
        title,
        content,
        priority,
        is_published,
        created_at,
        published_at
      `)
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(3)

    const recentAnnouncements = (recentAnnouncementsRes.data || []).map((announcement: any) => ({
      id: announcement.id,
      title: announcement.title,
      content: announcement.content,
      priority: announcement.priority || "normal",
      isPublished: announcement.is_published,
      createdAt: announcement.created_at,
      publishedAt: announcement.published_at,
    }))

    return NextResponse.json({
      stats: {
        totalHomeowners,
        activeIssues,
        publishedAnnouncements,
        activeCarStickers,
      },
      recentItems: {
        issues: recentIssues,
        announcements: recentAnnouncements,
      },
    })
  } catch (e: any) {
    console.error("Dashboard stats error:", e)
    return NextResponse.json(
      { error: e?.message || "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}

// Helper functions to map database values to UI values
function mapDbStatusToUi(dbStatus: string): string {
  switch (dbStatus) {
    case "NEW":
    case "TRIAGED":
    case "NEEDS_INFO":
      return "open"
    case "IN_PROGRESS":
      return "in_progress"
    case "RESOLVED":
      return "resolved"
    case "CLOSED":
      return "closed"
    default:
      return "open"
  }
}

function mapDbPriorityToUi(dbPriority: string): string {
  switch (dbPriority) {
    case "P1":
      return "urgent"
    case "P2":
      return "high"
    case "P3":
      return "normal"
    case "P4":
      return "low"
    default:
      return "normal"
  }
}
