// Admin HOA dues management page

"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Search, Plus, Download, DollarSign, Users, TrendingUp, AlertCircle, Pencil } from "lucide-react"
import { toast } from "sonner"
import { updateDuesConfig, createDuesConfig, DuesConfigUpdate, DuesConfigCreate } from "./actions"

interface HomeownerDues {
  homeowner_id: string
  first_name: string
  last_name: string
  full_name: string
  property_address: string
  block: string
  lot: string
  phase: string
  contact_number: string
  email: string
  annual_amount: number
  amount_paid: number
  is_paid_in_full: boolean
  payment_date: string
  payment_method: string
  is_good_standing: boolean
  balance_due: number
}

interface DuesSummary {
  total_homeowners: number
  paid_in_full: number
  partial_payments: number
  no_payments: number
  total_collected: number
  total_outstanding: number
  collection_rate: number
}

interface DuesConfig {
  id: string
  dues_year: number
  annual_amount: number
  car_sticker_price: number
  due_date: string
  late_fee_amount: number
  late_fee_grace_days: number
  is_active: boolean
}

function DuesManagementContent() {
  const router = useRouter()
  const basePath = "/admin"
  const [homeowners, setHomeowners] = useState<HomeownerDues[]>([])
  const [summary, setSummary] = useState<DuesSummary | null>(null)
  const [config, setConfig] = useState<DuesConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showPaymentDialog, setShowPaymentDialog] = useState(false)
  const [showConfigDialog, setShowConfigDialog] = useState(false)
  const [selectedHomeowner, setSelectedHomeowner] = useState<HomeownerDues | null>(null)
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: "",
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "cash",
    receipt_number: "",
    notes: ""
  })
  const [configForm, setConfigForm] = useState<DuesConfigUpdate | DuesConfigCreate | null>(null)
  const [isUpdatingConfig, setIsUpdatingConfig] = useState(false)


  useEffect(() => {
    fetchDuesData()
    fetchSummary()
  }, [selectedYear, statusFilter])

  const fetchDuesData = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        ...(statusFilter !== "all" && { status: statusFilter })
      })

      const response = await fetch(`/api/admin/dues?${params}`)
      if (!response.ok) throw new Error("Failed to fetch dues data")

      const data = await response.json()
      setHomeowners(data.homeowners || [])
    } catch (error) {
      console.error("Error fetching dues data:", error)
      toast.error("Failed to load dues data")
    } finally {
      setLoading(false)
    }
  }

  const fetchSummary = async () => {
    try {
      const response = await fetch(`/api/admin/dues/summary?year=${selectedYear}`)
      if (!response.ok) throw new Error("Failed to fetch summary")

      const data = await response.json()
      setSummary(data.summary)
      setConfig(data.config)
    } catch (error) {
      console.error("Error fetching summary:", error)
      toast.error("Failed to load summary data")
    }
  }

  const handleRecordPayment = async () => {
    if (!selectedHomeowner || !paymentForm.amount_paid) {
      toast.error("Please fill in required fields")
      return
    }

    try {
      const response = await fetch("/api/admin/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeowner_id: selectedHomeowner.homeowner_id,
          year: selectedYear,
          amount_paid: parseFloat(paymentForm.amount_paid),
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          receipt_number: paymentForm.receipt_number || null,
          notes: paymentForm.notes || null
        })
      })

      if (!response.ok) throw new Error("Failed to record payment")

      toast.success("Payment recorded successfully")
      setShowPaymentDialog(false)
      setSelectedHomeowner(null)
      setPaymentForm({
        amount_paid: "",
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "cash",
        receipt_number: "",
        notes: ""
      })

      // Refresh data
      fetchDuesData()
      fetchSummary()
    } catch (error) {
      console.error("Error recording payment:", error)
      toast.error("Failed to record payment")
    }
  }

  const handleUpdateConfig = async () => {
    if (!configForm) return

    setIsUpdatingConfig(true)
    try {
      let result;
      if ('id' in configForm && configForm.id) {
        result = await updateDuesConfig(configForm as DuesConfigUpdate)
      } else {
        result = await createDuesConfig(configForm as DuesConfigCreate)
      }

      if (result.success) {
        toast.success("Configuration saved successfully")
        setShowConfigDialog(false)
        fetchSummary() // Refresh data
      } else {
        toast.error(result.error || "Failed to save configuration")
      }
    } catch (error) {
      toast.error("An unexpected error occurred")
    } finally {
      setIsUpdatingConfig(false)
    }
  }

  const openConfigDialog = (existingConfig: DuesConfig | null) => {
    if (existingConfig) {
      setConfigForm({
        id: existingConfig.id,
        annual_amount: existingConfig.annual_amount,
        car_sticker_price: existingConfig.car_sticker_price || 0,
        due_date: existingConfig.due_date,
        late_fee_amount: existingConfig.late_fee_amount,
        late_fee_grace_days: existingConfig.late_fee_grace_days,
        is_active: existingConfig.is_active
      })
    } else {
      // Default values for new config
      setConfigForm({
        dues_year: selectedYear,
        annual_amount: 500, // Default value
        car_sticker_price: 1500, // Default value
        due_date: `${selectedYear}-03-31T00:00:00.000Z`,
        late_fee_amount: 50,
        late_fee_grace_days: 7,
        is_active: true
      })
    }
    setShowConfigDialog(true)
  }


  const filteredHomeowners = useMemo(() => {
    return homeowners.filter(homeowner => {
      const searchLower = searchQuery.toLowerCase()
      return (
        homeowner.first_name?.toLowerCase().includes(searchLower) ||
        homeowner.last_name?.toLowerCase().includes(searchLower) ||
        homeowner.full_name?.toLowerCase().includes(searchLower) ||
        homeowner.property_address?.toLowerCase().includes(searchLower) ||
        homeowner.block?.toLowerCase().includes(searchLower) ||
        homeowner.lot?.toLowerCase().includes(searchLower) ||
        homeowner.phase?.toLowerCase().includes(searchLower)
      )
    })
  }, [homeowners, searchQuery])

  const getStatusBadge = (homeowner: HomeownerDues) => {
    if (homeowner.is_paid_in_full) {
      return <Badge className="bg-green-100 text-green-800">Paid in Full</Badge>
    } else if (homeowner.amount_paid > 0) {
      return <Badge className="bg-yellow-100 text-yellow-800">Partial Payment</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Unpaid</Badge>
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP"
    }).format(amount)
  }

  const handleExportCsv = () => {
    const headers = [
      "Name",
      "Address",
      "Block",
      "Lot",
      "Phase",
      "Contact Number",
      "Email",
      "Annual Amount",
      "Amount Paid",
      "Balance Due",
      "Status",
      "Payment Date",
      "Payment Method",
      "Good Standing"
    ]

    const rows = filteredHomeowners.map((homeowner) => [
      homeowner.full_name || `${homeowner.first_name} ${homeowner.last_name}`,
      homeowner.property_address || "",
      homeowner.block || "",
      homeowner.lot || "",
      homeowner.phase || "",
      homeowner.contact_number || "",
      homeowner.email || "",
      homeowner.annual_amount.toString(),
      homeowner.amount_paid.toString(),
      homeowner.balance_due.toString(),
      homeowner.is_paid_in_full ? "Paid in Full" : (homeowner.amount_paid > 0 ? "Partial Payment" : "Unpaid"),
      homeowner.payment_date ? new Date(homeowner.payment_date).toLocaleDateString() : "",
      homeowner.payment_method || "",
      homeowner.is_good_standing ? "Yes" : "No"
    ])

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n")

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `hoa-dues-${selectedYear}-${statusFilter}-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)

    toast.success("Dues data exported successfully")
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={() => router.push(basePath)} className="flex items-center space-x-2">
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-primary rounded-lg p-2">
                  <DollarSign className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">HOA Dues Management</h1>
                  <p className="text-sm text-muted-foreground">Track and manage annual HOA dues payments</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(year => (
                    <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Homeowners</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.total_homeowners}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary.collection_rate}%</div>
                <p className="text-xs text-muted-foreground">
                  {summary.paid_in_full} of {summary.total_homeowners} paid
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.total_collected)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(summary.total_outstanding)}</div>
                <p className="text-xs text-muted-foreground">
                  {summary.partial_payments + summary.no_payments} homeowners
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Configuration Info */}
        {config && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Dues Configuration for {selectedYear}</CardTitle>
              <Button variant="outline" size="sm" onClick={() => openConfigDialog(config)}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Configuration
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Annual Amount</Label>
                  <p className="text-lg font-semibold">{formatCurrency(config.annual_amount)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Car Sticker Fee</Label>
                  <p className="text-lg font-semibold">{formatCurrency(config.car_sticker_price || 0)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Due Date</Label>
                  <p className="text-lg font-semibold">{new Date(config.due_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Late Fee</Label>
                  <p className="text-lg font-semibold">{formatCurrency(config.late_fee_amount)}</p>
                  <p className="text-xs text-muted-foreground">after {config.late_fee_grace_days} days grace period</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!config && !loading && (
          <Card className="mb-6 border-dashed">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-muted-foreground">No Configuration for {selectedYear}</CardTitle>
              <Button size="sm" onClick={() => openConfigDialog(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Configuration
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Set up dues amount, deadlines, and fees for this year to start collecting payments.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search homeowners..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid in Full</SelectItem>
                  <SelectItem value="partial">Partial Payment</SelectItem>
                  <SelectItem value="unpaid">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Homeowners List */}
        <Card>
          <CardHeader>
            <CardTitle>Homeowners Dues Status</CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing {filteredHomeowners.length} of {homeowners.length} homeowners for {selectedYear}
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : (
              <div className="space-y-4">
                {filteredHomeowners.map((homeowner) => (
                  <div key={homeowner.homeowner_id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <h3 className="font-semibold">
                            {homeowner.full_name || `${homeowner.first_name} ${homeowner.last_name}`}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {homeowner.property_address}
                            {homeowner.block && homeowner.lot && (
                              <span className="ml-2">Block {homeowner.block}, Lot {homeowner.lot}</span>
                            )}
                          </p>
                        </div>
                        {getStatusBadge(homeowner)}
                      </div>
                    </div>

                    <div className="text-right mr-4">
                      <p className="font-semibold">
                        {formatCurrency(homeowner.amount_paid)} / {formatCurrency(homeowner.annual_amount)}
                      </p>
                      {homeowner.balance_due > 0 && (
                        <p className="text-sm text-red-600">
                          Balance: {formatCurrency(homeowner.balance_due)}
                        </p>
                      )}
                      {homeowner.payment_date && (
                        <p className="text-xs text-muted-foreground">
                          Last payment: {new Date(homeowner.payment_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedHomeowner(homeowner)
                        setShowPaymentDialog(true)
                      }}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Record Payment
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record a payment for {selectedHomeowner?.full_name || `${selectedHomeowner?.first_name} ${selectedHomeowner?.last_name}`}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Payment Amount *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount_paid: e.target.value }))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="payment_method">Payment Method</Label>
                <Select value={paymentForm.payment_method} onValueChange={(value) => setPaymentForm(prev => ({ ...prev, payment_method: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="online">Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="receipt_number">Receipt Number</Label>
                <Input
                  id="receipt_number"
                  value={paymentForm.receipt_number}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, receipt_number: e.target.value }))}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Optional notes about this payment"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRecordPayment}>
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Config Dialog */}
        {configForm && (
          <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{'id' in configForm && configForm.id ? 'Update' : 'Create'} Configuration ({selectedYear})</DialogTitle>
                <DialogDescription>
                  Modify dues amount, sticker price, and due dates.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Annual Amount</Label>
                    <Input
                      type="number"
                      value={configForm.annual_amount}
                      onChange={(e) => setConfigForm({ ...configForm, annual_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Car Sticker Fee</Label>
                    <Input
                      type="number"
                      value={configForm.car_sticker_price}
                      onChange={(e) => setConfigForm({ ...configForm, car_sticker_price: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Late Fee</Label>
                    <Input
                      type="number"
                      value={configForm.late_fee_amount}
                      onChange={(e) => setConfigForm({ ...configForm, late_fee_amount: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label>Grace Period (Days)</Label>
                    <Input
                      type="number"
                      value={configForm.late_fee_grace_days}
                      onChange={(e) => setConfigForm({ ...configForm, late_fee_grace_days: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={configForm.due_date.split('T')[0]}
                    onChange={(e) => setConfigForm({ ...configForm, due_date: e.target.value })}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowConfigDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateConfig} disabled={isUpdatingConfig}>
                    {isUpdatingConfig ? 'Saving...' : ('id' in configForm && configForm.id ? 'Save Changes' : 'Create Configuration')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  )
}
export default function DuesManagementPage() {
  return <DuesManagementContent />
}
