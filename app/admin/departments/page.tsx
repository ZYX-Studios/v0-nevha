"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Plus, Mail, KeyRound, Eye, EyeOff, Building2, Clock,
  AlertTriangle, Users, ChevronRight, Shield, Trash2, CheckCircle2,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import Link from "next/link"

interface DepartmentRow {
  id: string
  name: string
  email: string | null
  is_active: boolean
  last_login_at: string | null
  portal_password_updated_at: string | null
  open_issue_count: number
}

function EmailChips({ email }: { email: string | null }) {
  if (!email) return <span className="text-slate-400 text-xs italic">No email set</span>
  const emails = email.split(/[,;]/).map(e => e.trim()).filter(Boolean)
  return (
    <div className="flex flex-wrap gap-1.5">
      {emails.map((e) => (
        <span key={e} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-full border border-blue-100">
          <Mail className="w-2.5 h-2.5" />
          {e}
        </span>
      ))}
    </div>
  )
}

function PasswordStaleness({ updatedAt }: { updatedAt: string | null }) {
  if (!updatedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> No password set
      </span>
    )
  }
  const days = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24)
  if (days > 90) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> Password stale ({Math.floor(days)}d ago)
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> Updated {formatDistanceToNow(new Date(updatedAt), { addSuffix: true })}
    </span>
  )
}

function DeleteSection({ deptId, deptName, onDeleted, onError }: {
  deptId: string; deptName: string; onDeleted: () => void; onError: (msg: string) => void
}) {
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const canDelete = confirm.trim() === deptName
  const handleDelete = async () => {
    if (!canDelete) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/departments/${deptId}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to delete")
      onDeleted()
    } catch (e: any) { onError(e?.message || "Failed to delete") } finally { setBusy(false) }
  }
  return (
    <div className="rounded-xl border border-red-200 bg-red-50/50 p-4 space-y-3">
      <p className="text-sm text-red-700 font-medium">Danger Zone</p>
      <p className="text-xs text-red-600">Type the department name exactly to confirm deletion:</p>
      <div className="flex gap-2">
        <Input
          placeholder={`Type "${deptName}"`}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="h-9 text-sm border-red-200 focus:ring-red-400"
        />
        <Button
          variant="destructive" size="sm"
          disabled={!canDelete || busy}
          onClick={handleDelete}
          className="gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" /> Delete
        </Button>
      </div>
    </div>
  )
}

export default function DepartmentsAdminPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<DepartmentRow[]>([])
  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")

  // Manage modal
  const [manageOpen, setManageOpen] = useState(false)
  const [manageDept, setManageDept] = useState<DepartmentRow | null>(null)
  const [manageName, setManageName] = useState("")
  const [manageEmail, setManageEmail] = useState("")
  const [managePwd, setManagePwd] = useState("")
  const [manageActive, setManageActive] = useState(true)
  const [managePwdVisible, setManagePwdVisible] = useState(false)

  // Bulk modal
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPwd, setBulkPwd] = useState("")
  const [bulkPwdVisible, setBulkPwdVisible] = useState(false)
  const [bulkActiveOnly, setBulkActiveOnly] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/departments", { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to load")
      setItems(json.items || [])
    } catch (e: any) {
      toast.error(e?.message || "Failed to load departments")
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    const trimmedName = newName.trim()
    if (!trimmedName) return
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: newEmail.trim() || null, is_active: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to create")
      setItems(l => [...l, json.item])
      setNewName(""); setNewEmail("")
      toast.success("Department added")
    } catch (e: any) { toast.error(e?.message || "Failed to create") }
  }

  function openManage(row: DepartmentRow) {
    setManageDept(row); setManageName(row.name)
    setManageEmail(row.email || ""); setManagePwd("")
    setManageActive(row.is_active); setManageOpen(true)
  }

  async function handleManageSave() {
    if (!manageDept) return
    try {
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: manageDept.id, name: manageName.trim(), email: manageEmail.trim() || null, is_active: manageActive }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to update")
      setItems(list => list.map(it => it.id === manageDept.id ? { ...it, ...json.item } : it))
      toast.success("Department updated")
    } catch (e: any) { toast.error(e?.message || "Failed to update") }
  }

  async function handleSetPassword() {
    if (!manageDept) return
    const pwd = managePwd.trim()
    if (!pwd) { toast.error("Enter a password"); return }
    try {
      const res = await fetch(`/api/admin/departments/${manageDept.id}/portal-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: pwd }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to set password")
      setManagePwd("")
      toast.success("Portal password updated")
    } catch (e: any) { toast.error(e?.message || "Failed to set password") }
  }

  async function handleBulkApply() {
    const pwd = bulkPwd.trim()
    if (!pwd) { toast.error("Enter a password"); return }
    setBulkBusy(true)
    try {
      const res = await fetch("/api/admin/departments/portal-password/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: pwd, scope: bulkActiveOnly ? "active" : "all" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Bulk set failed")
      toast.success(`Password set for ${json.updated ?? 0} departments`)
      setBulkOpen(false); setBulkPwd("")
    } catch (e: any) { toast.error(e?.message || "Bulk set failed") } finally { setBulkBusy(false) }
  }

  const active = items.filter(i => i.is_active)
  const inactive = items.filter(i => !i.is_active)

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-blue-600" />
          <div>
            <h1 className="text-[17px] font-bold text-slate-900">Departments</h1>
            <p className="text-[11px] text-slate-500 hidden sm:block">Manage dept names, emails, and portal access</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setBulkOpen(true)}
            className="gap-1.5 text-xs rounded-full border-slate-200 hidden sm:flex"
          >
            <Shield className="w-3.5 h-3.5" />
            Bulk Password
          </Button>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 max-w-5xl mx-auto space-y-6">

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total", value: items.length, icon: Building2, color: "blue" },
            { label: "Active", value: active.length, icon: CheckCircle2, color: "emerald" },
            { label: "Inactive", value: inactive.length, icon: AlertTriangle, color: "amber" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-lg p-4 border border-slate-100 shadow-sm flex items-center gap-3">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center bg-${color}-50`}>
                <Icon className={`w-4 h-4 text-${color}-600`} />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">{value}</div>
                <div className="text-[11px] text-slate-500">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Department */}
        <section>
          <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">Add Department</h2>
          <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Name</Label>
                <Input
                  placeholder="e.g. Maintenance"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-600">Email(s)</Label>
                <Input
                  placeholder="Comma-separated emails"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="h-10 rounded-xl border-slate-200"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAdd} className="w-full h-10 gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4" /> Add Department
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Department Cards */}
        <section>
          <h2 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-3 px-1">
            Departments ({items.length})
          </h2>
          {loading ? (
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-12 text-center">
              <div className="w-8 h-8 border-2 border-blue-300 border-t-blue-600 rounded-full animate-spin mx-auto" />
              <p className="text-sm text-slate-400 mt-3">Loading departments…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-100 shadow-sm p-12 text-center">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">No departments yet</p>
            </div>
          ) : (
            <AnimatePresence>
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((row, i) => (
                  <motion.div
                    key={row.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className={`bg-white rounded-lg border shadow-sm overflow-hidden ${row.is_active ? 'border-slate-100' : 'border-slate-200 opacity-60'}`}
                  >
                    <div className="p-4 space-y-3">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${row.is_active ? 'bg-blue-50' : 'bg-slate-100'}`}>
                            <Building2 className={`w-4 h-4 ${row.is_active ? 'text-blue-600' : 'text-slate-400'}`} />
                          </div>
                          <div>
                            <h3 className="font-bold text-[15px] text-slate-900">{row.name}</h3>
                            <span className={`text-[10px] font-bold uppercase ${row.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>
                              {row.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {row.open_issue_count > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-orange-50 text-orange-600 rounded-full border border-orange-100">
                              <Users className="w-2.5 h-2.5" />
                              {row.open_issue_count} issues
                            </span>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openManage(row)}
                            className="h-7 text-xs gap-1 text-blue-600 hover:bg-blue-50 rounded-lg"
                          >
                            Manage <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>

                      {/* Emails */}
                      <EmailChips email={row.email} />

                      {/* Meta */}
                      <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-50">
                        <PasswordStaleness updatedAt={row.portal_password_updated_at} />
                        {row.last_login_at && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="w-2.5 h-2.5" />
                            Last login {formatDistanceToNow(new Date(row.last_login_at), { addSuffix: true })}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatePresence>
          )}
        </section>
      </main>

      {/* Manage Modal */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-lg">Manage — {manageDept?.name}</DialogTitle>
            <DialogDescription className="text-sm text-slate-500">
              Update details, set the portal password, or delete this department.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input value={manageName} onChange={(e) => setManageName(e.target.value)} className="rounded-xl" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs flex items-center gap-1"><Mail className="w-3 h-3" /> Email(s)</Label>
                <Input
                  value={manageEmail}
                  onChange={(e) => setManageEmail(e.target.value)}
                  placeholder="Comma-separated emails"
                  className="rounded-xl"
                />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox id="manage-active" checked={manageActive} onCheckedChange={(v) => setManageActive(Boolean(v))} />
                <Label htmlFor="manage-active" className="text-sm">Active</Label>
              </div>
            </div>

            <Button onClick={handleManageSave} className="w-full rounded-xl">Save Changes</Button>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <Label className="text-xs flex items-center gap-1"><KeyRound className="w-3 h-3" /> Set Portal Password</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={managePwdVisible ? "text" : "password"}
                    value={managePwd}
                    onChange={(e) => setManagePwd(e.target.value)}
                    placeholder="New password"
                    className="pr-10 rounded-xl"
                  />
                  <Button type="button" variant="ghost" size="icon"
                    className="absolute inset-y-0 right-0 h-full"
                    onClick={() => setManagePwdVisible(s => !s)}>
                    {managePwdVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button variant="secondary" onClick={handleSetPassword} className="rounded-xl">Set</Button>
              </div>
            </div>

            <DeleteSection
              deptId={manageDept?.id || ""}
              deptName={manageDept?.name || ""}
              onDeleted={() => { if (manageDept) setItems(l => l.filter(d => d.id !== manageDept.id)); setManageOpen(false) }}
              onError={(msg) => toast.error(msg)}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Password Modal */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-sm rounded-lg">
          <DialogHeader>
            <DialogTitle>Bulk Set Portal Password</DialogTitle>
            <DialogDescription>Apply a password to all (or just active) departments.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="relative">
              <Input
                type={bulkPwdVisible ? "text" : "password"}
                value={bulkPwd}
                onChange={(e) => setBulkPwd(e.target.value)}
                placeholder="Enter password"
                className="pr-10 rounded-xl"
              />
              <Button type="button" variant="ghost" size="icon"
                className="absolute inset-y-0 right-0 h-full"
                onClick={() => setBulkPwdVisible(s => !s)}>
                {bulkPwdVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="bulk-active" checked={bulkActiveOnly} onCheckedChange={v => setBulkActiveOnly(Boolean(v))} />
              <Label htmlFor="bulk-active" className="text-sm">Active departments only</Label>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkBusy} className="flex-1 rounded-xl">Cancel</Button>
              <Button onClick={handleBulkApply} disabled={bulkBusy} className="flex-1 rounded-xl">
                {bulkBusy ? "Applying…" : "Apply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
