import { createClient } from "@/lib/supabase/server"

export async function getAnnouncements() {
    const supabase = await createClient()
    const nowIso = new Date().toISOString()
    const now = new Date(nowIso)

    // Fetch published announcements
    const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("publish_date", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false, nullsFirst: false })

    if (error) {
        console.error("Error fetching announcements:", error)
        return []
    }

    return (data || [])
        .filter((row: any) => {
            const pd = row.publish_date ? new Date(row.publish_date) : null
            const pad = row.published_at ? new Date(row.published_at) : null
            const ed = row.expiry_date ? new Date(row.expiry_date) : null
            const publishedReached = (row.is_published && (!pd || pd <= now)) || (!!pad && pad <= now)
            const notExpired = !ed || ed > now
            return publishedReached && notExpired
        })
        .map((row: any) => ({
            id: row.id,
            title: row.title,
            content: row.content,
            priority: row.priority || "normal",
            isPublished: row.is_published || !!row.published_at,
            publishDate: row.publish_date || row.published_at,
            expiryDate: row.expiry_date,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }))
}
