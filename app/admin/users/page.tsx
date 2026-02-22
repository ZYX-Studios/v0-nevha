"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Plus,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  User,
  Mail,
  Phone,
  Key
} from "lucide-react"

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: "ADMIN" | "STAFF" | "PUBLIC"
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export default function AdminUsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters and pagination
  const [q, setQ] = useState("")
  const [role, setRole] = useState<string>("all")
  const [isActive, setIsActive] = useState<string>("all")
  const [sort, setSort] = useState<"name" | "email" | "role" | "created_at">("created_at")
  const [order, setOrder] = useState<"asc" | "desc">("desc")
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [total, setTotal] = useState(0)
  const [activeTab, setActiveTab] = useState<"confirmed" | "pending">("confirmed")

  // Create user dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: "STAFF" as "ADMIN" | "STAFF" | "PUBLIC",
  })
  const [creating, setCreating] = useState(false)

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const url = new URL("/api/admin/users", window.location.origin)
      if (q) url.searchParams.set("q", q)
      if (role !== "all") url.searchParams.set("role", role)
      if (isActive !== "all") url.searchParams.set("isActive", isActive)
      url.searchParams.set("sort", sort)
      url.searchParams.set("order", order)
      url.searchParams.set("page", String(page))
      url.searchParams.set("pageSize", String(pageSize))

      // Tab-driven filters
      if (activeTab === "confirmed") {
        if (role === "all") {
          // Show ADMIN and STAFF by default for confirmed tab
          url.searchParams.set("role", "ADMIN,STAFF")
        } else {
          url.searchParams.set("role", role)
        }
        url.searchParams.set("isActive", isActive === "all" ? "true" : isActive)
      } else {
        // Pending: HOMEOWNER/PUBLIC or inactive accounts
        url.searchParams.set("role", "HOMEOWNER,PUBLIC")
        url.searchParams.set("isActive", "all")
      }

      const res = await fetch(url.toString(), { cache: "no-store" })
      const text = await res.text()
      let json: any = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        throw new Error("Access denied. Please sign in as an admin and try again.")
      }
      if (!res.ok) throw new Error(json?.error || "Failed to load users")

      setUsers(json.items || [])
      setTotal(json.total || 0)
      if (typeof json.page === "number") setPage(json.page)
      if (typeof json.pageSize === "number") setPageSize(json.pageSize)
    } catch (e: any) {
      setError(e?.message || "Failed to load users")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort, order, page, pageSize, activeTab])

  // Debounced search
  useEffect(() => {
    const handle = setTimeout(() => {
      if (page !== 1) {
        setPage(1)
      } else {
        fetchUsers()
      }
    }, 400)
    return () => clearTimeout(handle)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, role, isActive])

  const handleSort = (col: "name" | "email" | "role" | "created_at") => {
    setPage(1)
    if (sort === col) {
      setOrder(prev => prev === "asc" ? "desc" : "asc")
    } else {
      setSort(col)
      setOrder("asc")
    }
  }

  const handleCreateUser = async () => {
    const isValidEmail = (email: string) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const isValidPhone = (phone: string) => {
      const filtered = phone.replace(/\D/g, "")
      return filtered.length >= 10
    }

    if (!isValidEmail(createForm.email)) {
      setError("Please enter a valid email address.")
      return
    }

    if (createForm.phone && !isValidPhone(createForm.phone)) {
      setError("Please enter a valid phone number (at least 10 digits).")
      return
    }

    if (createForm.password.length < 6) {
      setError("Password must be at least 6 characters.")
      return
    }

    setCreating(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      })
      const text = await res.text()
      let json: any = null
      try {
        json = text ? JSON.parse(text) : null
      } catch {
        throw new Error("Access denied. Please sign in as an admin.")
      }
      if (!res.ok) throw new Error(json?.error || "Failed to create user")

      setCreateOpen(false)
      setCreateForm({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        phone: "",
        role: "STAFF",
      })
      fetchUsers()
    } catch (e: any) {
      setError(e?.message || "Failed to create user")
    } finally {
      setCreating(false)
    }
  }

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !currentActive }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || "Failed to update user")
      }
      fetchUsers()
    } catch (e: any) {
      setError(e?.message || "Failed to update user")
    }
  }

  const handleResetPassword = async (userId: string) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: "POST",
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json?.error || "Failed to reset password")
      }
      const json = await res.json()
      toast.success(json.message || "Password reset email sent")
    } catch (e: any) {
      setError(e?.message || "Failed to reset password")
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "ADMIN":
        return <ShieldCheck className="h-4 w-4" />
      case "STAFF":
        return <Shield className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const getRoleVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case "ADMIN":
        return "destructive"
      case "STAFF":
        return "secondary"
      default:
        return "outline"
    }
  }

  const displayName = (user: User) => {
    return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-primary rounded-lg p-2">
                  <Users className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Manage Users</h1>
                  <p className="text-sm text-muted-foreground">Admin and staff user management</p>
                </div>
              </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                  <DialogDescription>
                    Create a new admin or staff user account
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        value={createForm.firstName}
                        onChange={(e) => setCreateForm(f => ({ ...f, firstName: e.target.value }))}
                        placeholder="First name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        value={createForm.lastName}
                        onChange={(e) => setCreateForm(f => ({ ...f, lastName: e.target.value }))}
                        placeholder="Last name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Password</Label>
                    <Input
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm(f => ({ ...f, password: e.target.value }))}
                      placeholder="Minimum 6 characters"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone (Optional)</Label>
                    <Input
                      value={createForm.phone}
                      onChange={(e) => setCreateForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+63 9xx xxx xxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select
                      value={createForm.role}
                      onValueChange={(v) => setCreateForm(f => ({ ...f, role: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Admin</SelectItem>
                        <SelectItem value="STAFF">Staff</SelectItem>
                        <SelectItem value="PUBLIC">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-4">
                  <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={creating || !createForm.email || !createForm.password || !createForm.firstName || !createForm.lastName}
                  >
                    {creating ? "Creating..." : "Create User"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Tab Bar */}
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => { setActiveTab("confirmed"); setPage(1) }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === "confirmed"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            Confirmed
          </button>
          <button
            onClick={() => { setActiveTab("pending"); setPage(1) }}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === "pending"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
              }`}
          >
            Pending
          </button>
        </div>
        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="p-4">
              <p className="text-destructive text-sm">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="STAFF">Staff</SelectItem>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={isActive} onValueChange={setIsActive}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="true">Active</SelectItem>
                      <SelectItem value="false">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(1) }}>
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <div className="bg-card rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">
                    <button className="inline-flex items-center gap-1" onClick={() => handleSort("name")}>
                      Name {sort === "name" ? (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button className="inline-flex items-center gap-1" onClick={() => handleSort("email")}>
                      Email {sort === "email" ? (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button className="inline-flex items-center gap-1" onClick={() => handleSort("role")}>
                      Role {sort === "role" ? (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">
                    <button className="inline-flex items-center gap-1" onClick={() => handleSort("created_at")}>
                      Created {sort === "created_at" ? (order === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />) : <ArrowUpDown className="h-3 w-3" />}
                    </button>
                  </th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      Loading users...
                    </td>
                  </tr>
                )}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center">
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">No users found</div>
                        <div className="text-xs text-muted-foreground">
                          {q ? "Try adjusting your search." : "Create your first user to get started."}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && users.map((user) => (
                  <tr key={user.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{displayName(user)}</div>
                        {user.phone && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={getRoleVariant(user.role)} className="text-xs flex items-center gap-1 w-fit">
                        {getRoleIcon(user.role)}
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={user.isActive ? "default" : "outline"} className="text-xs">
                        {user.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleActive(user.id, user.isActive)}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResetPassword(user.id)}
                        >
                          Reset Password
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between py-4 text-sm text-muted-foreground">
          <div>
            Showing {total === 0 ? 0 : (page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span>Page {page}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page * pageSize >= total}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
