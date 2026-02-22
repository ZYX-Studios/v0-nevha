"use client"

import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  ArrowLeft, Megaphone, Flame, AlertTriangle, Info, ArrowUp, CheckCircle2,
  Eye, EyeOff, Clock, CalendarClock, Trash2
} from "lucide-react"
import type { CreateAnnouncementData } from "@/lib/types"

const PRIORITIES = [
  { value: "low", label: "Low", icon: Info, color: "text-slate-500", bg: "bg-slate-100 border-slate-200 data-[selected=true]:bg-slate-200 data-[selected=true]:border-slate-400" },
  { value: "normal", label: "Normal", icon: ArrowUp, color: "text-blue-600", bg: "bg-blue-50 border-blue-100 data-[selected=true]:bg-blue-100 data-[selected=true]:border-blue-400" },
  { value: "high", label: "High", icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50 border-orange-100 data-[selected=true]:bg-orange-100 data-[selected=true]:border-orange-400" },
  { value: "urgent", label: "Urgent", icon: Flame, color: "text-red-600", bg: "bg-red-50 border-red-100 data-[selected=true]:bg-red-100 data-[selected=true]:border-red-400" },
]

type PublishMode = "draft" | "now" | "schedule"

export default function CreateAnnouncementPage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal")
  const [publishMode, setPublishMode] = useState<PublishMode>("now")
  const [scheduleDate, setScheduleDate] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Min datetime string in local time for the datetime-local input
  const nowLocal = () => {
    const now = new Date()
    now.setSeconds(0, 0)
    return now.toISOString().slice(0, 16)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) { toast.error("Title and content are required"); return }
    if (publishMode === "schedule" && !scheduleDate) { toast.error("Please pick a publish date/time"); return }

    setSubmitting(true)
    try {
      const payload: CreateAnnouncementData & { isPublished: boolean } = {
        title: title.trim(),
        content: content.trim(),
        priority,
        isPublished: publishMode === "now",
        publishDate: publishMode === "schedule" ? scheduleDate : undefined,
        expiryDate: expiryDate || undefined,
      }
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to create announcement")
      setDone(true)
    } catch (e: any) {
      toast.error(e?.message || "Failed to create announcement")
    } finally {
      setSubmitting(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-xl shadow-sm border border-slate-100 p-10 text-center max-w-sm w-full"
        >
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Announcement Created</h2>
          <p className="text-sm text-slate-500 mb-6">
            {publishMode === "now" ? "Published immediately." :
              publishMode === "schedule" ? `Scheduled for ${new Date(scheduleDate).toLocaleString()}.` :
                "Saved as draft."}
          </p>
          <div className="flex flex-col gap-2">
            <Button onClick={() => router.push("/admin/announcements")} className="w-full rounded-xl">
              Back to Announcements
            </Button>
            <Button variant="outline" onClick={() => { setDone(false); setTitle(""); setContent(""); }} className="w-full rounded-xl">
              Create Another
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F2F2F7] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/announcements")}
          className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <Megaphone className="w-4 h-4 text-orange-500" />
          <h1 className="text-[17px] font-bold text-slate-900">New Announcement</h1>
        </div>
        <Button
          form="announcement-form"
          type="submit"
          disabled={submitting || !title.trim() || !content.trim()}
          size="sm"
          className="rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
        >
          {submitting ? "Publishing…" : publishMode === "draft" ? "Save Draft" : publishMode === "schedule" ? "Schedule" : "Publish"}
        </Button>
      </header>

      <form id="announcement-form" onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 max-w-2xl mx-auto space-y-4">

        {/* Title */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Title</label>
          <Input
            placeholder="Announcement title…"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={120}
            className="border-0 p-0 h-auto text-[17px] font-semibold text-slate-900 placeholder:text-slate-300 focus-visible:ring-0 shadow-none"
          />
          <div className="text-right text-[10px] text-slate-300">{title.length}/120</div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-1">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Content</label>
          <Textarea
            placeholder="Write your announcement here…"
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={2000}
            rows={6}
            className="border-0 p-0 resize-none text-sm text-slate-700 placeholder:text-slate-300 focus-visible:ring-0 shadow-none"
          />
          <div className="text-right text-[10px] text-slate-300">{content.length}/2000</div>
        </div>

        {/* Priority */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-3">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Priority</label>
          <div className="grid grid-cols-4 gap-2">
            {PRIORITIES.map(p => {
              const Icon = p.icon
              const selected = priority === p.value
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value as "low" | "normal" | "high" | "urgent")}
                  data-selected={selected}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[11px] font-semibold transition-all ${p.bg} ${selected ? "ring-2 ring-offset-1 ring-current" : ""}`}
                >
                  <Icon className={`w-4 h-4 ${p.color}`} />
                  <span className={p.color}>{p.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Publish mode */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-3">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Publish</label>
          <div className="grid grid-cols-3 gap-2">
            {([
              { value: "now", icon: Eye, label: "Now" },
              { value: "schedule", icon: CalendarClock, label: "Schedule" },
              { value: "draft", icon: EyeOff, label: "Draft" },
            ] as { value: PublishMode; icon: React.ElementType; label: string }[]).map(m => {
              const Icon = m.icon
              const selected = publishMode === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setPublishMode(m.value)}
                  className={`flex flex-col items-center gap-1 py-3 rounded-xl border text-[11px] font-semibold transition-all ${selected
                    ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                    : "bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100"
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {m.label}
                </button>
              )
            })}
          </div>

          {/* Schedule date picker */}
          <AnimatePresence>
            {publishMode === "schedule" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-1 space-y-1">
                  <label className="text-[11px] text-slate-400 font-medium">Publish at</label>
                  <Input
                    type="datetime-local"
                    value={scheduleDate}
                    min={nowLocal()}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="h-9 rounded-xl text-sm border-slate-200"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Optional expiry */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Expiry <span className="normal-case font-normal">(optional)</span></label>
            {expiryDate && (
              <button type="button" onClick={() => setExpiryDate("")} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-0.5 transition-colors">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          <Input
            type="datetime-local"
            value={expiryDate}
            min={scheduleDate || nowLocal()}
            onChange={e => setExpiryDate(e.target.value)}
            className="h-9 rounded-xl text-sm border-slate-200"
          />
          <div className="flex gap-2">
            {[7, 14, 30].map(d => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  const base = publishMode === "schedule" && scheduleDate ? new Date(scheduleDate) : new Date()
                  base.setDate(base.getDate() + d)
                  base.setSeconds(0, 0)
                  setExpiryDate(base.toISOString().slice(0, 16))
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-medium"
              >
                +{d}d
              </button>
            ))}
          </div>
        </div>

        {/* Live preview */}
        <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4 space-y-2">
          <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide block">Preview</label>
          <div className="rounded-xl bg-[#F2F2F7] p-3 space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priority === "urgent" ? "bg-red-100 text-red-700 border-red-200" :
                priority === "high" ? "bg-orange-100 text-orange-700 border-orange-200" :
                  priority === "normal" ? "bg-blue-50 text-blue-600 border-blue-100" :
                    "bg-slate-100 text-slate-500 border-slate-200"
                }`}>
                {PRIORITIES.find(p => p.value === priority)?.label}
              </span>
              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" /> Just now
              </span>
            </div>
            <p className="font-semibold text-[14px] text-slate-900">{title || "Untitled announcement"}</p>
            <p className="text-[12px] text-slate-500 line-clamp-3">{content || "Content preview will appear here…"}</p>
          </div>
        </div>
      </form>
    </div>
  )
}
