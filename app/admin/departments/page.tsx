"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, RefreshCw, Plus, Save } from "lucide-react"

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
    } catch (e: any) {
      setError(e?.message || "Failed to save department")
    }
  }

  async function handleAdd(name: string, email: string) {
    setError("")
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
    } catch (e: any) {
      setError(e?.message || "Failed to create department")
    }
  }

  async function handleSync() {
    setError("")
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
    } catch (e: any) {
      setError(e?.message || "Failed to sync departments")
    } finally {
      setLoading(false)
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
              <Button onClick={handleSync} disabled={loading} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Sync with Categories
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {error && (
          <div className="mb-4 text-sm text-destructive">{error}</div>
        )}

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
                    <div key={row.id} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end border rounded-md p-3">
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
                      <div className="md:col-span-2">
                        <Button onClick={() => handleSave(row)} className="w-full flex items-center gap-2">
                          <Save className="h-4 w-4" />
                          Save
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

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
