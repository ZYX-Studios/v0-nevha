"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Building2, LogOut, RefreshCw, ChevronRight, Clock, Flame, AlertTriangle, CheckCircle2, CircleDot } from "lucide-react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"

interface IssueItem {
  id: string
  ref_code: string
  title: string
  description: string
  category: string
  priority: "P1" | "P2" | "P3" | "P4"
  status: string
  location: string | null
  reporterFullName: string | null
  reporterBlock: string | null
  reporterLot: string | null
  reporterPhase: string | null
  createdAt: string
  updatedAt: string
}

const STATUS_TABS = [
  { value: "not_started", label: "Open", icon: CircleDot },
  { value: "in_progress", label: "In Progress", icon: Clock },
  { value: "on_hold", label: "On Hold", icon: AlertTriangle },
  { value: "resolved", label: "Resolved", icon: CheckCircle2 },
  { value: "closed", label: "Closed", icon: CheckCircle2 },
]

const PRIORITY_CONFIG: Record<string, { label: string; color: string; icon: React.FC<{ className?: string }> }> = {
  P1: { label: "Critical", color: "text-red-600 bg-red-50 border-red-100", icon: Flame },
  P2: { label: "High", color: "text-orange-600 bg-orange-50 border-orange-100", icon: AlertTriangle },
  P3: { label: "Medium", color: "text-amber-600 bg-amber-50 border-amber-100", icon: AlertTriangle },
  P4: { label: "Low", color: "text-slate-500 bg-slate-50 border-slate-100", icon: CircleDot },
}

const STATUS_COLOR: Record<string, string> = {
  not_started: "text-slate-600 bg-slate-50 border-slate-100",
  in_progress: "text-blue-600 bg-blue-50 border-blue-100",
  on_hold: "text-amber-600 bg-amber-50 border-amber-100",
  resolved: "text-emerald-600 bg-emerald-50 border-emerald-100",
  closed: "text-slate-400 bg-slate-50 border-slate-100",
}

export default function DeptIssuesPage() {
  const router = useRouter()
  const [dept, setDept] = useState<{ id: string; name: string } | null>(null)
  const [issues, setIssues] = useState<IssueItem[]>([])
  const [activeTab, setActiveTab] = useState("not_started")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchIssues = async (status: string, silent = false) => {
    if (!silent) setRefreshing(true)
    try {
      const q = status && status !== "all" ? `?status=${encodeURIComponent(status)}` : ""
      const r = await fetch(`/api/dept/issues${q}`, { cache: "no-store" })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error || "Failed to load issues")
      setIssues(Array.isArray(j.items) ? j.items : [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load issues")
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    ; (async () => {
      try {
        const r = await fetch("/api/dept/me", { cache: "no-store" })
        const j = await r.json()
        if (!r.ok) throw new Error(j?.error || "Unauthorized")
        setDept(j.department)
        await fetchIssues(activeTab, true)
      } catch (e: any) {
        toast.error(e?.message || "Session expired")
        router.replace("/dept/login")
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!dept) return
    fetchIssues(activeTab)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const onLogout = async () => {
    await fetch("/api/dept/session/logout", { method: "POST" }).catch(() => { })
    router.replace("/dept/login")
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h1 className="text-[15px] font-bold text-slate-900 leading-tight">
              {dept ? dept.name : "Loading…"}
            </h1>
            <p className="text-[11px] text-slate-400">Department Portal</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost" size="icon"
            onClick={() => fetchIssues(activeTab)}
            className="w-8 h-8 rounded-full text-slate-400"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Button
            variant="ghost" size="sm"
            onClick={onLogout}
            className="gap-1.5 text-slate-500 text-xs rounded-full h-8"
          >
            <LogOut className="w-3.5 h-3.5" /> Logout
          </Button>
        </div>
      </header>

      {/* Status Tabs */}
      <div className="sticky top-[57px] z-30 bg-[#F2F2F7]/90 backdrop-blur-sm border-b border-black/5 px-4 py-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {STATUS_TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.value
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${isActive
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                    : "bg-white/80 text-slate-500 border border-slate-100 hover:border-blue-200"
                  }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <main className="px-4 py-4 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading issues…</p>
          </div>
        ) : issues.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle2 className="w-10 h-10 text-slate-300" />
            <p className="text-sm text-slate-500 font-medium">No {activeTab.replace("_", " ")} issues</p>
            <p className="text-xs text-slate-400">All clear for this status</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-2.5"
            >
              {issues.map((issue) => {
                const pConfig = PRIORITY_CONFIG[issue.priority] || PRIORITY_CONFIG.P4
                const PIcon = pConfig.icon
                return (
                  <motion.button
                    key={issue.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => router.push(`/dept/issues/${issue.id}`)}
                    className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Badges row */}
                        <div className="flex items-center gap-1.5 flex-wrap mb-2">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${pConfig.color}`}>
                            <PIcon className="w-2.5 h-2.5" />
                            {issue.priority}
                          </span>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_COLOR[issue.status] || "text-slate-500 bg-slate-50"}`}>
                            {issue.status.replace("_", " ")}
                          </span>
                          <span className="inline-flex text-[10px] text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-full">
                            {issue.category}
                          </span>
                        </div>
                        {/* Title */}
                        <p className="font-semibold text-[14px] text-slate-900 leading-snug line-clamp-2">{issue.title}</p>
                        {/* Description */}
                        <p className="text-[12px] text-slate-500 mt-1 line-clamp-1">{issue.description}</p>
                        {/* Meta */}
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {issue.reporterFullName && (
                            <span className="text-[11px] text-slate-400">{issue.reporterFullName}</span>
                          )}
                          {(issue.reporterBlock || issue.reporterLot) && (
                            <span className="text-[11px] text-slate-400">
                              Blk {issue.reporterBlock} Lot {issue.reporterLot}
                              {issue.reporterPhase ? ` Ph ${issue.reporterPhase}` : ""}
                            </span>
                          )}
                          <span className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
                    </div>
                  </motion.button>
                )
              })}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
    </div>
  )
}
