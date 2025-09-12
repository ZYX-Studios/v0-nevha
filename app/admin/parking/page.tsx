"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useAuth } from "@/hooks/use-auth"
import { mockCarStickers, mockHomeowners } from "@/lib/mock-data"
import type { CarSticker, Homeowner, CreateCarStickerData } from "@/lib/types"
import { 
  Car, 
  Plus, 
  ArrowLeft, 
  Search, 
  Edit, 
  Trash2, 
  Calendar,
  QrCode,
  Printer,
  AlertTriangle,
  CheckCircle,
  Clock,
  MoreHorizontal
} from "lucide-react"

function ParkingManagementContent() {
  const { session } = useAuth()
  const router = useRouter()
  const [stickers, setStickers] = useState<CarSticker[]>([])
  const [filteredStickers, setFilteredStickers] = useState<CarSticker[]>([])
  const [homeowners, setHomeowners] = useState<Homeowner[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isAddingSticker, setIsAddingSticker] = useState(false)
  const [selectedSticker, setSelectedSticker] = useState<CarSticker | null>(null)

  // Form state
  const [stickerForm, setStickerForm] = useState({
    homeownerId: "",
    stickerNumber: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    licensePlate: "",
    expiryDate: "",
    notes: ""
  })

  useEffect(() => {
    // Load data
    setStickers(mockCarStickers)
    setHomeowners(mockHomeowners)
    setFilteredStickers(mockCarStickers)
  }, [])

  useEffect(() => {
    // Filter stickers based on search term and status
    let filtered = stickers.filter(sticker => {
      const matchesSearch = 
        sticker.stickerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.licensePlate?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.vehicleMake?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.vehicleModel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.homeowner?.user?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sticker.homeowner?.user?.lastName.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = statusFilter === "all" || 
        (statusFilter === "active" && sticker.isActive) ||
        (statusFilter === "expired" && !sticker.isActive) ||
        (statusFilter === "expiring" && sticker.isActive && isExpiringSoon(sticker.expiryDate))

      return matchesSearch && matchesStatus
    })
    setFilteredStickers(filtered)
  }, [searchTerm, statusFilter, stickers])

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    return expiry <= thirtyDaysFromNow && expiry >= new Date()
  }

  const generateStickerNumber = () => {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `${year}-${random}`
  }

  const handleAddSticker = () => {
    // TODO: Implement actual API call
    console.log("Adding sticker:", stickerForm)
    setIsAddingSticker(false)
    resetStickerForm()
  }

  const resetStickerForm = () => {
    setStickerForm({
      homeownerId: "",
      stickerNumber: generateStickerNumber(),
      vehicleMake: "",
      vehicleModel: "",
      vehicleYear: "",
      vehicleColor: "",
      licensePlate: "",
      expiryDate: "",
      notes: ""
    })
  }

  const getStatusBadge = (sticker: CarSticker) => {
    if (!sticker.isActive) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>
    }
    if (isExpiringSoon(sticker.expiryDate)) {
      return <Badge variant="secondary" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Expiring Soon</Badge>
    }
    return <Badge variant="default" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
  }

  const getStatusIcon = (sticker: CarSticker) => {
    if (!sticker.isActive) {
      return <AlertTriangle className="h-4 w-4 text-red-400" />
    }
    if (isExpiringSoon(sticker.expiryDate)) {
      return <Clock className="h-4 w-4 text-yellow-400" />
    }
    return <CheckCircle className="h-4 w-4 text-green-400" />
  }

  const handlePrintStickers = () => {
    // TODO: Implement print functionality
    console.log("Printing selected stickers")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-black">
      {/* Header */}
      <header className="bg-gray-900/95 backdrop-blur-xl border-b border-gray-700/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/admin")}
                className="flex items-center space-x-2 text-gray-300 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Admin</span>
              </Button>
              <div className="flex items-center space-x-2">
                <div className="bg-orange-500 rounded-lg p-2">
                  <Car className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Parking Management</h1>
                  <p className="text-sm text-gray-400">Manage car stickers and vehicle registrations</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={handlePrintStickers}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Stickers
              </Button>
              <Dialog open={isAddingSticker} onOpenChange={setIsAddingSticker}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                    onClick={() => setStickerForm({...stickerForm, stickerNumber: generateStickerNumber()})}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Issue Sticker
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle className="text-white">Issue New Car Sticker</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="homeowner" className="text-gray-300">Homeowner</Label>
                      <Select value={stickerForm.homeownerId} onValueChange={(value) => setStickerForm({...stickerForm, homeownerId: value})}>
                        <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                          <SelectValue placeholder="Select homeowner" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {homeowners.map((homeowner) => (
                            <SelectItem key={homeowner.id} value={homeowner.id}>
                              {homeowner.user?.firstName} {homeowner.user?.lastName} - {homeowner.propertyAddress}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stickerNumber" className="text-gray-300">Sticker Number</Label>
                      <Input
                        id="stickerNumber"
                        value={stickerForm.stickerNumber}
                        onChange={(e) => setStickerForm({...stickerForm, stickerNumber: e.target.value})}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="Auto-generated"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="licensePlate" className="text-gray-300">License Plate</Label>
                      <Input
                        id="licensePlate"
                        value={stickerForm.licensePlate}
                        onChange={(e) => setStickerForm({...stickerForm, licensePlate: e.target.value.toUpperCase()})}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="Enter license plate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleMake" className="text-gray-300">Vehicle Make</Label>
                      <Input
                        id="vehicleMake"
                        value={stickerForm.vehicleMake}
                        onChange={(e) => setStickerForm({...stickerForm, vehicleMake: e.target.value})}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="e.g., Toyota, Honda"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleModel" className="text-gray-300">Vehicle Model</Label>
                      <Input
                        id="vehicleModel"
                        value={stickerForm.vehicleModel}
                        onChange={(e) => setStickerForm({...stickerForm, vehicleModel: e.target.value})}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="e.g., Camry, Civic"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleYear" className="text-gray-300">Vehicle Year</Label>
                      <Input
                        id="vehicleYear"
                        type="number"
                        value={stickerForm.vehicleYear}
                        onChange={(e) => setStickerForm({...stickerForm, vehicleYear: e.target.value})}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="e.g., 2020"
                        min="1900"
                        max={new Date().getFullYear() + 1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicleColor" className="text-gray-300">Vehicle Color</Label>
                      <Input
                        id="vehicleColor"
                        value={stickerForm.vehicleColor}
                        onChange={(e) => setStickerForm({...stickerForm, vehicleColor: e.target.value})}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="e.g., White, Black"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiryDate" className="text-gray-300">Expiry Date</Label>
                      <Input
                        id="expiryDate"
                        type="date"
                        value={stickerForm.expiryDate}
                        onChange={(e) => setStickerForm({...stickerForm, expiryDate: e.target.value})}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label htmlFor="notes" className="text-gray-300">Notes</Label>
                      <Textarea
                        id="notes"
                        value={stickerForm.notes}
                        onChange={(e) => setStickerForm({...stickerForm, notes: e.target.value})}
                        className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                        placeholder="Enter any additional notes"
                        rows={3}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddingSticker(false)} className="border-gray-600 text-gray-300 hover:bg-gray-800">
                      Cancel
                    </Button>
                    <Button onClick={handleAddSticker} className="bg-orange-500 hover:bg-orange-600 text-white">
                      Issue Sticker
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Total Stickers</p>
                  <p className="text-2xl font-bold text-white">{stickers.length}</p>
                </div>
                <Car className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-400">{stickers.filter(s => s.isActive).length}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Expiring Soon</p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {stickers.filter(s => s.isActive && isExpiringSoon(s.expiryDate)).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-400">Expired</p>
                  <p className="text-2xl font-bold text-red-400">{stickers.filter(s => !s.isActive).length}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by sticker number, license plate, vehicle, or homeowner..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-gray-800/50 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="expiring">Expiring Soon</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="text-gray-300 border-gray-600">
                {filteredStickers.length} stickers
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Stickers Table */}
        <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
          <CardHeader>
            <CardTitle className="text-white">Car Stickers Registry</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Sticker #</TableHead>
                    <TableHead className="text-gray-300">Vehicle</TableHead>
                    <TableHead className="text-gray-300">License Plate</TableHead>
                    <TableHead className="text-gray-300">Homeowner</TableHead>
                    <TableHead className="text-gray-300">Issue Date</TableHead>
                    <TableHead className="text-gray-300">Expiry</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStickers.map((sticker) => (
                    <TableRow key={sticker.id} className="border-gray-700 hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(sticker)}
                          <span className="font-mono text-white">{sticker.stickerNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">
                          {sticker.vehicleYear} {sticker.vehicleMake} {sticker.vehicleModel}
                        </div>
                        {sticker.vehicleColor && (
                          <div className="text-sm text-gray-400">{sticker.vehicleColor}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-white bg-gray-800/50 px-2 py-1 rounded">
                          {sticker.licensePlate}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">
                          {sticker.homeowner?.user?.firstName} {sticker.homeowner?.user?.lastName}
                        </div>
                        <div className="text-sm text-gray-400">{sticker.homeowner?.propertyAddress}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-gray-300">
                          {new Date(sticker.issueDate).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-gray-300">
                          {sticker.expiryDate ? new Date(sticker.expiryDate).toLocaleDateString() : "No expiry"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(sticker)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function ParkingManagementPage() {
  return (
    <ProtectedRoute requiredRole="staff">
      <ParkingManagementContent />
    </ProtectedRoute>
  )
}
