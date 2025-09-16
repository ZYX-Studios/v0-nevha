"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Plus, Mail, KeyRound, Eye, EyeOff } from "lucide-react"
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

// Categories reference removed; departments are the single source of truth for "Issue Related To".

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

  // Departments are the only source of truth; no static categories or "missing" list needed.

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

  // Removed inline editing helpers; editing is done in the Manage modal

  async function handleAdd(name: string, email: string) {
    setError("")
    setMessage("")
    const trimmedName = name.trim()
    if (!trimmedName) return
    try {
      const normalizedEmail = ((email || "")
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ")) || null
      const res = await fetch("/api/admin/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, email: normalizedEmail, is_active: true }),
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

  // (Sync removed) Departments list is authoritative; keep UI simple

  // Manage modal state
  const [manageOpen, setManageOpen] = useState(false)
  const [manageDept, setManageDept] = useState<DepartmentRow | null>(null)
  const [manageName, setManageName] = useState("")
  const [manageEmail, setManageEmail] = useState("")
  const [managePwd, setManagePwd] = useState("")
  const [manageActive, setManageActive] = useState<boolean>(true)
  const [managePwdVisible, setManagePwdVisible] = useState(false)
  // Linked issues UI removed for simplicity

  function openManage(row: DepartmentRow) {
    setManageDept(row)
    setManageName(row.name || "")
    setManageEmail(row.email || "")
    setManagePwd("")
    setManageActive(!!row.is_active)
    setManageOpen(true)
  }

  async function handleManageSave() {
    if (!manageDept) return
    setError("")
    setMessage("")
    try {
      const normalizedEmail = ((manageEmail || "")
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean)
        .join(", ")) || null
      const res = await fetch("/api/admin/departments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: manageDept.id,
          name: manageName.trim(),
          email: normalizedEmail,
          is_active: manageActive,
        }),
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


  // Bulk portal password modal + handler
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkPwd, setBulkPwd] = useState("")
  const [bulkPwdVisible, setBulkPwdVisible] = useState(false)
  const [bulkScopeActiveOnly, setBulkScopeActiveOnly] = useState(false)
  const [bulkBusy, setBulkBusy] = useState(false)
  async function handleBulkApply() {
    const pwd = bulkPwd.trim()
    if (!pwd) {
      setError("Enter a portal password")
      return
    }
    setError("")
    setMessage("")
    setBulkBusy(true)
    try {
      const res = await fetch("/api/admin/departments/portal-password/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ new_password: pwd, scope: bulkScopeActiveOnly ? "active" : "all" }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Bulk set failed")
      setMessage(`Portal password set for ${json.updated ?? 0} ${bulkScopeActiveOnly ? "active " : ""}departments`)
      setBulkOpen(false)
      setBulkPwd("")
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
              <Button onClick={() => setBulkOpen(true)} disabled={loading} variant="secondary">
                Set Portal Password (Bulk)
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {error && <div className="mb-2 text-sm text-destructive">{error}</div>}
        {message && <div className="mb-4 text-sm text-green-600">{message}</div>}

        {/* Missing categories notice removed: departments drive public form options */}

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
                <Label htmlFor="new-email">Email(s)</Label>
                <Input id="new-email" type="text" placeholder="email1@example.com, email2@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <p className="text-xs text-muted-foreground mt-1">Multiple emails allowed, separate with commas.</p>
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

        {/* Departments list (display-only) */}
        <Card>
          <CardHeader>
            <CardTitle>Departments</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-10 text-center text-muted-foreground text-sm">Loading…</div>
            ) : items.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground text-sm">No departments yet. Use Add to create.</div>
            ) : (
              <div className="space-y-4">
                {items.map((row) => (
                  <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border rounded-md p-4">
                    <div className="md:col-span-4">
                      <Label>Name</Label>
                      <div className="mt-1 text-sm">{row.name}</div>
                    </div>
                    <div className="md:col-span-5">
                      <Label>Email(s)</Label>
                      <div className="mt-1 text-sm">{row.email || "—"}</div>
                    </div>
                    <div className="md:col-span-1 flex items-center">
                      <span className={row.is_active ? "text-xs px-2 py-1 rounded bg-green-100 text-green-700" : "text-xs px-2 py-1 rounded bg-muted text-muted-foreground"}>
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-1 gap-2">
                      <Button variant="outline" onClick={() => openManage(row)} className="w-full flex items-center gap-2">
                        Manage
                      </Button>
                    </div>
                  </div>
                ))}
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
                  <Label>Name</Label>
                  <Input value={manageName} onChange={(e) => setManageName(e.target.value)} placeholder="Department name" />
                </div>
                <div>
                  <Label className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email(s)</Label>
                  <Input type="text" value={manageEmail} onChange={(e) => setManageEmail(e.target.value)} placeholder="email1@example.com, email2@example.com" />
                  <p className="text-xs text-muted-foreground mt-1">Multiple emails allowed, separate with commas.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="manage-active" checked={manageActive} onCheckedChange={(v) => setManageActive(Boolean(v))} />
                  <Label htmlFor="manage-active">Active</Label>
                </div>
                <div>
                  <Label className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Department Password</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type={managePwdVisible ? "text" : "password"}
                        className="pr-10"
                        value={managePwd}
                        onChange={(e) => setManagePwd(e.target.value)}
                        placeholder="Set new password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-full"
                        onClick={() => setManagePwdVisible((s) => !s)}
                        aria-label={managePwdVisible ? "Hide password" : "Show password"}
                      >
                        {managePwdVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button variant="secondary" onClick={handleManageSetPassword}>Set</Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setManageOpen(false)}>Close</Button>
                <Button onClick={handleManageSave}>Save Changes</Button>
              </div>
              <div className="space-y-3">
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

        {/* Bulk Set Password Modal */}
        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Portal Password (Bulk)</DialogTitle>
              <DialogDescription>Apply a new portal password to all departments or only active ones.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>New Password</Label>
                <div className="relative">
                  <Input
                    type={bulkPwdVisible ? "text" : "password"}
                    className="pr-10"
                    value={bulkPwd}
                    onChange={(e) => setBulkPwd(e.target.value)}
                    placeholder="Enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0 h-full"
                    onClick={() => setBulkPwdVisible((s) => !s)}
                    aria-label={bulkPwdVisible ? "Hide password" : "Show password"}
                  >
                    {bulkPwdVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="bulk-active-only" checked={bulkScopeActiveOnly} onCheckedChange={(v) => setBulkScopeActiveOnly(Boolean(v))} />
                <Label htmlFor="bulk-active-only">Apply to active departments only</Label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setBulkOpen(false)} disabled={bulkBusy}>Cancel</Button>
                <Button onClick={handleBulkApply} disabled={bulkBusy}>{bulkBusy ? "Applying..." : "Apply"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
