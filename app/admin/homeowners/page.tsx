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
import { mockHomeowners } from "@/lib/mock-data"
import type { Homeowner, HouseholdMember, CreateHouseholdMemberData } from "@/lib/types"
import { 
  Home, 
  Users, 
  Plus, 
  ArrowLeft, 
  Search, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  Calendar,
  UserPlus,
  Eye,
  MoreHorizontal
} from "lucide-react"

function HomeownersManagementContent() {
  const { session } = useAuth()
  const router = useRouter()
  const [homeowners, setHomeowners] = useState<Homeowner[]>([])
  const [filteredHomeowners, setFilteredHomeowners] = useState<Homeowner[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedHomeowner, setSelectedHomeowner] = useState<Homeowner | null>(null)
  const [isAddingHomeowner, setIsAddingHomeowner] = useState(false)
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [viewingMembers, setViewingMembers] = useState<string | null>(null)

  // Form states
  const [homeownerForm, setHomeownerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    propertyAddress: "",
    unitNumber: "",
    moveInDate: "",
    isOwner: true,
    emergencyContactName: "",
    emergencyContactPhone: "",
    notes: ""
  })

  const [memberForm, setMemberForm] = useState({
    fullName: "",
    relationship: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    notes: ""
  })

  useEffect(() => {
    // Load homeowners data
    setHomeowners(mockHomeowners)
    setFilteredHomeowners(mockHomeowners)
  }, [])

  useEffect(() => {
    // Filter homeowners based on search term
    const filtered = homeowners.filter(homeowner =>
      homeowner.user?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      homeowner.user?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      homeowner.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      homeowner.user?.email.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredHomeowners(filtered)
  }, [searchTerm, homeowners])

  const handleAddHomeowner = () => {
    // TODO: Implement actual API call
    console.log("Adding homeowner:", homeownerForm)
    setIsAddingHomeowner(false)
    resetHomeownerForm()
  }

  const handleAddMember = () => {
    if (!selectedHomeowner) return
    // TODO: Implement actual API call
    console.log("Adding member to homeowner:", selectedHomeowner.id, memberForm)
    setIsAddingMember(false)
    resetMemberForm()
  }

  const resetHomeownerForm = () => {
    setHomeownerForm({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      propertyAddress: "",
      unitNumber: "",
      moveInDate: "",
      isOwner: true,
      emergencyContactName: "",
      emergencyContactPhone: "",
      notes: ""
    })
  }

  const resetMemberForm = () => {
    setMemberForm({
      fullName: "",
      relationship: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      notes: ""
    })
  }

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge variant={isActive ? "default" : "secondary"} className="text-xs">
        {isActive ? "Active" : "Inactive"}
      </Badge>
    )
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
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">Homeowners Management</h1>
                  <p className="text-sm text-gray-400">Manage homeowners and household members</p>
                </div>
              </div>
            </div>
            <Dialog open={isAddingHomeowner} onOpenChange={setIsAddingHomeowner}>
              <DialogTrigger asChild>
                <Button className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Homeowner
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Add New Homeowner</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-gray-300">First Name</Label>
                    <Input
                      id="firstName"
                      value={homeownerForm.firstName}
                      onChange={(e) => setHomeownerForm({...homeownerForm, firstName: e.target.value})}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                      placeholder="Enter first name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-gray-300">Last Name</Label>
                    <Input
                      id="lastName"
                      value={homeownerForm.lastName}
                      onChange={(e) => setHomeownerForm({...homeownerForm, lastName: e.target.value})}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                      placeholder="Enter last name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-300">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={homeownerForm.email}
                      onChange={(e) => setHomeownerForm({...homeownerForm, email: e.target.value})}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                      placeholder="Enter email address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                    <Input
                      id="phone"
                      value={homeownerForm.phone}
                      onChange={(e) => setHomeownerForm({...homeownerForm, phone: e.target.value})}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                      placeholder="Enter phone number"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="propertyAddress" className="text-gray-300">Property Address</Label>
                    <Input
                      id="propertyAddress"
                      value={homeownerForm.propertyAddress}
                      onChange={(e) => setHomeownerForm({...homeownerForm, propertyAddress: e.target.value})}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                      placeholder="Enter property address"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unitNumber" className="text-gray-300">Unit Number</Label>
                    <Input
                      id="unitNumber"
                      value={homeownerForm.unitNumber}
                      onChange={(e) => setHomeownerForm({...homeownerForm, unitNumber: e.target.value})}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                      placeholder="Enter unit number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="moveInDate" className="text-gray-300">Move-in Date</Label>
                    <Input
                      id="moveInDate"
                      type="date"
                      value={homeownerForm.moveInDate}
                      onChange={(e) => setHomeownerForm({...homeownerForm, moveInDate: e.target.value})}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="notes" className="text-gray-300">Notes</Label>
                    <Textarea
                      id="notes"
                      value={homeownerForm.notes}
                      onChange={(e) => setHomeownerForm({...homeownerForm, notes: e.target.value})}
                      className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                      placeholder="Enter any additional notes"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddingHomeowner(false)} className="border-gray-600 text-gray-300 hover:bg-gray-800">
                    Cancel
                  </Button>
                  <Button onClick={handleAddHomeowner} className="bg-orange-500 hover:bg-orange-600 text-white">
                    Add Homeowner
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Search and Filters */}
        <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 mb-6">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search homeowners by name, address, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <Badge variant="outline" className="text-gray-300 border-gray-600">
                {filteredHomeowners.length} homeowners
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Homeowners Table */}
        <Card className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30">
          <CardHeader>
            <CardTitle className="text-white">Homeowners Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead className="text-gray-300">Name</TableHead>
                    <TableHead className="text-gray-300">Property</TableHead>
                    <TableHead className="text-gray-300">Contact</TableHead>
                    <TableHead className="text-gray-300">Members</TableHead>
                    <TableHead className="text-gray-300">Stickers</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHomeowners.map((homeowner) => (
                    <TableRow key={homeowner.id} className="border-gray-700 hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="bg-orange-500/20 rounded-full p-2">
                            <Home className="h-4 w-4 text-orange-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {homeowner.user?.firstName} {homeowner.user?.lastName}
                            </div>
                            <div className="text-sm text-gray-400">{homeowner.user?.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-white">{homeowner.propertyAddress}</div>
                        {homeowner.unitNumber && (
                          <div className="text-sm text-gray-400">Unit {homeowner.unitNumber}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {homeowner.user?.phone && (
                            <div className="flex items-center space-x-1 text-sm text-gray-300">
                              <Phone className="h-3 w-3" />
                              <span>{homeowner.user.phone}</span>
                            </div>
                          )}
                          <div className="flex items-center space-x-1 text-sm text-gray-300">
                            <Mail className="h-3 w-3" />
                            <span>{homeowner.user?.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingMembers(viewingMembers === homeowner.id ? null : homeowner.id)}
                          className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                        >
                          <Users className="h-4 w-4 mr-1" />
                          {homeowner.householdMembers?.length || 0}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-gray-300 border-gray-600">
                          {homeowner.carStickers?.filter(s => s.isActive).length || 0} active
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(homeowner.user?.isActive || false)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedHomeowner(homeowner)}
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400 hover:text-white hover:bg-gray-800"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Dialog open={isAddingMember && selectedHomeowner?.id === homeowner.id} onOpenChange={setIsAddingMember}>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedHomeowner(homeowner)}
                                className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="bg-gray-900/95 backdrop-blur-xl border border-gray-700/30 text-white max-w-2xl">
                              <DialogHeader>
                                <DialogTitle className="text-white">Add Household Member</DialogTitle>
                                <p className="text-gray-400">
                                  Adding member to {selectedHomeowner?.user?.firstName} {selectedHomeowner?.user?.lastName}
                                </p>
                              </DialogHeader>
                              <div className="grid grid-cols-2 gap-4 py-4">
                                <div className="space-y-2 col-span-2">
                                  <Label htmlFor="fullName" className="text-gray-300">Full Name</Label>
                                  <Input
                                    id="fullName"
                                    value={memberForm.fullName}
                                    onChange={(e) => setMemberForm({...memberForm, fullName: e.target.value})}
                                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                                    placeholder="Enter full name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="relationship" className="text-gray-300">Relationship</Label>
                                  <Select value={memberForm.relationship} onValueChange={(value) => setMemberForm({...memberForm, relationship: value})}>
                                    <SelectTrigger className="bg-gray-800/50 border-gray-600 text-white">
                                      <SelectValue placeholder="Select relationship" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-gray-800 border-gray-600">
                                      <SelectItem value="spouse">Spouse</SelectItem>
                                      <SelectItem value="child">Child</SelectItem>
                                      <SelectItem value="parent">Parent</SelectItem>
                                      <SelectItem value="sibling">Sibling</SelectItem>
                                      <SelectItem value="tenant">Tenant</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="dateOfBirth" className="text-gray-300">Date of Birth</Label>
                                  <Input
                                    id="dateOfBirth"
                                    type="date"
                                    value={memberForm.dateOfBirth}
                                    onChange={(e) => setMemberForm({...memberForm, dateOfBirth: e.target.value})}
                                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="memberPhone" className="text-gray-300">Phone</Label>
                                  <Input
                                    id="memberPhone"
                                    value={memberForm.phone}
                                    onChange={(e) => setMemberForm({...memberForm, phone: e.target.value})}
                                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                                    placeholder="Enter phone number"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="memberEmail" className="text-gray-300">Email</Label>
                                  <Input
                                    id="memberEmail"
                                    type="email"
                                    value={memberForm.email}
                                    onChange={(e) => setMemberForm({...memberForm, email: e.target.value})}
                                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                                    placeholder="Enter email address"
                                  />
                                </div>
                                <div className="space-y-2 col-span-2">
                                  <Label htmlFor="memberNotes" className="text-gray-300">Notes</Label>
                                  <Textarea
                                    id="memberNotes"
                                    value={memberForm.notes}
                                    onChange={(e) => setMemberForm({...memberForm, notes: e.target.value})}
                                    className="bg-gray-800/50 border-gray-600 text-white placeholder:text-gray-400"
                                    placeholder="Enter any additional notes"
                                    rows={3}
                                  />
                                </div>
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsAddingMember(false)} className="border-gray-600 text-gray-300 hover:bg-gray-800">
                                  Cancel
                                </Button>
                                <Button onClick={handleAddMember} className="bg-orange-500 hover:bg-orange-600 text-white">
                                  Add Member
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
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

export default function HomeownersManagementPage() {
  return (
    <ProtectedRoute requiredRole="staff">
      <HomeownersManagementContent />
    </ProtectedRoute>
  )
}
