"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, RefreshCw, Plus, Save, Link2, Trash2, Mail, KeyRound } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

function DeleteDepartmentSection({
  deptId,
  deptName,
  onDeleted,
  onError,
}: {
  deptId: string
  deptName: string
  onDeleted: () => void
  onError: (msg: string) => void
}) {
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const canDelete = !!deptId && confirm.trim() === deptName

  const handleDelete = async () => {
    if (!canDelete) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/departments/${deptId}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to delete department")
      onDeleted()
    } catch (e: any) {
      onError(e?.message || "Failed to delete department")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
      <p className="text-sm text-muted-foreground">
        To delete this department, type its exact name below and click Delete. This will also unlink any related issues.
      </p>
      <div className="flex items-center gap-2">
        <Input
          placeholder={`Type "${deptName}" to confirm`}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        <Button variant="destructive" disabled={!canDelete || busy} onClick={handleDelete}>
          Delete
        </Button>
      </div>
    </div>
  )
}

const CANONICAL_CATEGORIES = [
  "Maintenance",
  "Peace and Order",
  "Sports",
  "Social Media",
  "Grievance",
  "Finance",
  "Membership",
  "Livelihood",
]

interface DepartmentRow {
  id: string
  name: string
  email: string | null
  is_active: boolean
}

export default function DepartmentsAdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<DepartmentRow[]>([])
  const [error, setError] = useState<string>("")
  const [message, setMessage] = useState<string>("")

  // Local editor state keyed by id
  const [edits, setEdits] = useState<Record<string, Partial<DepartmentRow>>>({})

  const lowerNames = useMemo(() => new Set(items.map((i) => i.name.toLowerCase())), [items])
  const missing = useMemo(
    () => CANONICAL_CATEGORIES.filter((c) => !lowerNames.has(c.toLowerCase())),
    [lowerNames],
  )

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError("")
      try {
        const res = await fetch("/api/admin/departments", { cache: "no-store" })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "Failed to load departments")
        setItems(json.items || [])
      } catch (e: any) {
        setError(e?.message || "Failed to load departments")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const updateEdit = (id: string, patch: Partial<DepartmentRow>) =>
    setEdits((p) => ({ ...p, [id]: { ...p[id], ...patch } }))

  const applyPatch = (row: DepartmentRow): DepartmentRow => ({ ...row, ...edits[row.id] })

  async function handleSave(row: DepartmentRow) {
    setError("")
    setMessage("")
    const merged = applyPatch(row)
    try {
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: merged.id,
          name: merged.name,
          email: merged.email || null,
          is_active: merged.is_active,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to save department")
      setItems((list) => list.map((it) => (it.id === row.id ? json.item : it)))
      setEdits((p) => ({ ...p, [row.id]: {} }))
      setMessage("Department saved")
    } catch (e: any) {
      setError(e?.message || "Failed to save department")
    }
  }

  async function handleAdd(name: string, email: string) {
    setError("")
    setMessage("")
    const trimmedName = name.trim()
    if (!trimmedName) return
    try {
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: email?.trim() || null, is_active: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to create department")
      setItems((l) => [...l, json.item])
      setNewName("")
      setNewEmail("")
      setMessage("Department added")
    } catch (e: any) {
      setError(e?.message || "Failed to create department")
    }
  }

  async function handleSync() {
    setError("")
    setMessage("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/departments/sync", { method: "POST" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Sync failed")
      // Reload list after sync
      const res2 = await fetch("/api/admin/departments", { cache: "no-store" })
      const json2 = await res2.json()
      if (!res2.ok) throw new Error(json2?.error || "Reload failed")
      setItems(json2.items || [])
      setMessage("Synced departments with categories")
    } catch (e: any) {
      setError(e?.message || "Failed to sync departments")
    } finally {
      setLoading(false)
    }
  }

  // Manage modal state
  const [manageOpen, setManageOpen] = useState(false)
  const [manageDept, setManageDept] = useState<DepartmentRow | null>(null)
  const [manageEmail, setManageEmail] = useState("")
  const [managePwd, setManagePwd] = useState("")
  const [linkRefCode, setLinkRefCode] = useState("")
  type IssueLinkItem = { id: string; ref_code: string; title: string; status: string | null; priority: string | null; createdAt: string }
  const [linkedIssues, setLinkedIssues] = useState<IssueLinkItem[]>([])

  function openManage(row: DepartmentRow) {
    setManageDept(row)
    setManageEmail(row.email || "")
    setManagePwd("")
    setLinkRefCode("")
    setManageOpen(true)
    void loadLinkedIssues(row.id)
  }

  async function loadLinkedIssues(deptId: string) {
    try {
      const res = await fetch(`/api/admin/departments/${deptId}/issues`, { cache: "no-store" })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to load linked issues")
      setLinkedIssues(Array.isArray(json.items) ? json.items : [])
    } catch (e: any) {
      setError(e?.message || "Failed to load linked issues")
    }
  }

  async function handleManageSave() {
    if (!manageDept) return
    setError("")
    setMessage("")
    try {
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: manageDept.id, email: manageEmail.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "Failed to update department")
      setItems((list) => list.map((it) => (it.id === manageDept.id ? json.item : it)))
      setMessage("Department updated")
    } catch (e: any) {
      setError(e?.message || "Failed to update department")
    }
  }

  async function handleManageSetPassword() {
    if (!manageDept) return
    const pwd = managePwd.trim()
    if (!pwd) {
      setError("Enter a portal password")
      return
    }
    setError("")
    setMessage("")
    try {
      const res = await fetch(`/api/admin/departments/${manageDept.id}/portal-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: pwd }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to set portal password")
      setManagePwd("")
      setMessage("Portal password updated")
    } catch (e: any) {
      setError(e?.message || "Failed to set portal password")
    }
  }

  async function handleLinkIssue() {
    if (!manageDept) return
    const ref = linkRefCode.trim()
    if (!ref) return
    setError("")
    setMessage("")
    try {
      const res = await fetch(`/api/admin/departments/${manageDept.id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref_code: ref }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to link issue")
      setLinkRefCode("")
      await loadLinkedIssues(manageDept.id)
    } catch (e: any) {
      setError(e?.message || "Failed to link issue")
    }
  }

  async function handleUnlinkIssue(ref: string) {
    if (!manageDept) return
    setError("")
    setMessage("")
    try {
      const res = await fetch(`/api/admin/departments/${manageDept.id}/issues?ref_code=${encodeURIComponent(ref)}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to unlink issue")
      await loadLinkedIssues(manageDept.id)
    } catch (e: any) {
      setError(e?.message || "Failed to unlink issue")
    }
  }

  // Bulk default portal password
  const [bulkBusy, setBulkBusy] = useState(false)
  async function handleBulkDefault() {
    setError("")
    setMessage("")
    setBulkBusy(true)
    try {
      const res = await fetch("/api/admin/departments/portal-password/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: "nevha2025", scope: "all" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Bulk set failed")
      setMessage(`Default portal password set for ${json.updated ?? 0} departments`)
    } catch (e: any) {
      setError(e?.message || "Bulk set failed")
    } finally {
      setBulkBusy(false)
    }
  }

  const [newName, setNewName] = useState("")
  const [newEmail, setNewEmail] = useState("")

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push("/admin")} className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div>
                <h1 className="text-lg font-bold">Departments</h1>
                <p className="text-sm text-muted-foreground">Manage department names and emails. These map to "Issue Related To".</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleBulkDefault} disabled={loading || bulkBusy} variant="secondary">
                Set Default Portal Password
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {error && <div className="mb-2 text-sm text-destructive">{error}</div>}
        {message && <div className="mb-4 text-sm text-green-600">{message}</div>}

        {/* Missing categories notice */}
        {missing.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Missing Departments</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">These categories exist in the public form but not in departments:</p>
              <ul className="list-disc list-inside text-sm">
                {missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Add new department */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Add Department</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label htmlFor="new-name">Name</Label>
                <Input id="new-name" placeholder="e.g. Maintenance" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="new-email">Email</Label>
                <Input id="new-email" type="email" placeholder="dept@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              </div>
              <div>
                <Button onClick={() => handleAdd(newName, newEmail)} className="w-full flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Departments list */}
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No departments yet. Use Sync or Add to create.</div>
            ) : (
              <div className="space-y-4">
                {items.map((row) => {
                  const m = applyPatch(row)
                  return (
                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border rounded-md p-4">
                      <div className="md:col-span-4">
                        <Label>Name</Label>
                        <Input value={m.name} onChange={(e) => updateEdit(row.id, { name: e.target.value })} />
                      </div>
                      <div className="md:col-span-5">
                        <Label>Email</Label>
                        <Input type="email" value={m.email || ""} onChange={(e) => updateEdit(row.id, { email: e.target.value })} />
                      </div>
                      <div className="md:col-span-1 flex items-center gap-2">
                        <Checkbox id={`active-${row.id}`} checked={!!m.is_active} onCheckedChange={(v) => updateEdit(row.id, { is_active: Boolean(v) })} />
                        <Label htmlFor={`active-${row.id}`}>Active</Label>
                      </div>
                      <div className="md:col-span-2 grid grid-cols-1 gap-2">
                        <Button onClick={() => handleSave(row)} className="w-full flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save
                        </Button>
                        <Button variant="outline" onClick={() => openManage(row)} className="w-full flex items-center gap-2">
                          Manage
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Manage Department Modal */}
        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Department</DialogTitle>
              <DialogDescription>
                Configure email, set portal password, and manage linked issues for <strong>{manageDept?.name}</strong>.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</Label>
                  <Input type="email" value={manageEmail} onChange={(e) => setManageEmail(e.target.value)} placeholder="dept@example.com" />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Department Password</Label>
                  <div className="flex gap-2">
                    <Input type="password" value={managePwd} onChange={(e) => setManagePwd(e.target.value)} placeholder="Set new password" />
                    <Button variant="secondary" onClick={handleManageSetPassword}>Set</Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setManageOpen(false)}>Close</Button>
                <Button onClick={handleManageSave}>Save Changes</Button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Linked Issues</h3>
                  <div className="flex items-center gap-2">
                    <Input placeholder="Ref code (e.g., NVH-25-ABC123)" value={linkRefCode} onChange={(e) => setLinkRefCode(e.target.value)} />
                    <Button variant="secondary" onClick={handleLinkIssue} className="flex items-center gap-2">
                      <Link2 className="h-4 w-4" /> Link
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border divide-y">
                  {linkedIssues.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No linked issues.</div>
                  ) : (
                    linkedIssues.map((it) => (
                      <div key={it.id} className="p-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{it.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{it.ref_code} • {it.status || ""} • {new Date(it.createdAt).toLocaleString()}</div>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleUnlinkIssue(it.ref_code)} className="flex items-center gap-2">
                          <Trash2 className="h-4 w-4" /> Unlink
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                {/* Danger zone */}
                <div className="pt-2 border-t">
                  <h3 className="font-medium text-red-600 mb-2">Danger Zone</h3>
                  <DeleteDepartmentSection
                    deptId={manageDept?.id || ""}
                    deptName={manageDept?.name || ""}
                    onDeleted={() => {
                      if (manageDept) {
                        setItems((l) => l.filter((d) => d.id !== manageDept.id))
                      }
                      setManageOpen(false)
                    }}
                    onError={(msg) => setError(msg)}
                  />
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reference */}
        <div className="text-xs text-muted-foreground mt-6">
          <p><strong>Note:</strong> The public report form uses the categories below as "Issue Related To". Department names should match exactly (case-insensitive):</p>
          <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2">
            {CANONICAL_CATEGORIES.map((c) => (
              <div key={c} className="px-2 py-1 rounded-md bg-muted text-foreground/80 text-center">{c}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
