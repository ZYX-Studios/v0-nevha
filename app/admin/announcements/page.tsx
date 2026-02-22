"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import type { Announcement } from "@/lib/types"
import {
  Plus, Search, Edit, Trash2, Eye, EyeOff,
  Megaphone, Clock, Flame, AlertCircle, CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { formatDistanceToNow } from "date-fns"

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "High", color: "bg-orange-100 text-orange-700 border-orange-200" },
  normal: { label: "Normal", color: "bg-blue-50 text-blue-600 border-blue-100" },
  low: { label: "Low", color: "bg-slate-100 text-slate-500 border-slate-200" },
}

export default function AnnouncementsManagementPage() {
  const router = useRouter()
  const [items, setItems] = useState<Announcement[]>([])
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all")
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set("search", search.trim())
      if (statusFilter !== "all") params.set("status", statusFilter)
      const res = await fetch(`/api/admin/announcements${params.toString() ? `?${params}` : ""}`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to load")
      setItems(json.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load announcements")
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => { load() }, [load])

  const handleTogglePublish = async (id: string) => {
    const current = items.find(a => a.id === id)?.isPublished ?? false
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !current }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error)
      setItems(prev => prev.map(a => a.id === id ? json.item : a))
      toast.success(current ? "Moved to draft" : "Published")
    } catch (e: any) { toast.error(e?.message || "Failed to update") }
  }

  const handleDelete = (id: string, title: string) => {
    toast(`Delete "${title}"?`, {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" })
            if (!res.ok) throw new Error((await res.json()).error)
            setItems(prev => prev.filter(a => a.id !== id))
            toast.success("Deleted")
          } catch (e: any) { toast.error(e?.message || "Failed to delete") }
        },
      },
      cancel: { label: "Cancel", onClick: () => { } },
    })
  }

  const STATUS_TABS: { value: "all" | "published" | "draft"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "published", label: "Published" },
    { value: "draft", label: "Drafts" },
  ]

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-orange-50 rounded-full flex items-center justify-center">
            <Megaphone className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h1 className="text-[17px] font-bold text-slate-900">Announcements</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">Manage community announcements</p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => router.push("/admin/announcements/new")}
          className="gap-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs"
        >
          <Plus className="w-3.5 h-3.5" /> New
        </Button>
      </header>

      <main className="px-4 sm:px-6 py-5 max-w-4xl mx-auto space-y-4">
        {/* Search + status tabs */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search announcements…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl border-slate-200 text-sm"
            />
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 self-start sm:self-auto">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === tab.value
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-7 h-7 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-12 text-center">
            <Megaphone className="w-9 h-9 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-500 mb-4">No announcements found</p>
            <Button
              size="sm"
              onClick={() => router.push("/admin/announcements/new")}
              className="gap-1.5 rounded-md"
            >
              <Plus className="w-3.5 h-3.5" /> Create First
            </Button>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-2.5">
              {items.map((a, i) => {
                const pCfg = PRIORITY_CONFIG[a.priority] || PRIORITY_CONFIG.normal
                return (
                  <motion.div
                    key={a.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`bg-white rounded-lg border shadow-sm overflow-hidden ${a.isPublished ? "border-slate-100" : "border-slate-200 opacity-70"
                      }`}
                  >
                    <div className="p-4 flex items-start gap-3">
                      {/* Priority dot */}
                      <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${a.priority === "urgent" ? "bg-red-500" :
                          a.priority === "high" ? "bg-orange-500" :
                            a.priority === "normal" ? "bg-blue-500" : "bg-slate-300"
                        }`} />

                      <div className="flex-1 min-w-0">
                        {/* Badges + date row */}
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${pCfg.color}`}>
                            {pCfg.label}
                          </span>
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${a.isPublished
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>
                            {a.isPublished ? "Published" : "Draft"}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-semibold text-[14px] text-slate-900 leading-snug mb-1">{a.title}</h3>

                        {/* Content preview */}
                        <p className="text-[12px] text-slate-500 line-clamp-2">{a.content}</p>

                        {/* Expiry */}
                        {a.expiryDate && (
                          <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-2.5 h-2.5" />
                            Expires {new Date(a.expiryDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="icon"
                          className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700"
                          title={a.isPublished ? "Unpublish" : "Publish"}
                          onClick={() => handleTogglePublish(a.id)}
                        >
                          {a.isPublished ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-700"
                          title="Edit"
                          onClick={() => router.push(`/admin/announcements/${a.id}/edit`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="w-8 h-8 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50"
                          title="Delete"
                          onClick={() => handleDelete(a.id, a.title)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
