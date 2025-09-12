// Type definitions for the HOA PWA application

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: "homeowner" | "admin" | "staff"
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Homeowner {
  id: string
  userId: string
  propertyAddress: string
  unitNumber?: string
  moveInDate?: string
  isOwner: boolean
  emergencyContactName?: string
  emergencyContactPhone?: string
  notes?: string
  createdAt: string
  updatedAt: string
  user?: User
  householdMembers?: HouseholdMember[]
  carStickers?: CarSticker[]
}

export interface CarSticker {
  id: string
  homeownerId: string
  stickerNumber: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleYear?: number
  vehicleColor?: string
  licensePlate?: string
  issueDate: string
  expiryDate?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  homeowner?: Homeowner
}

export interface Announcement {
  id: string
  title: string
  content: string
  authorId?: string
  priority: "low" | "normal" | "high" | "urgent"
  isPublished: boolean
  publishDate?: string
  expiryDate?: string
  createdAt: string
  updatedAt: string
  author?: User
}

export interface Issue {
  id: string
  reporterId?: string
  title: string
  description: string
  category: string
  priority: "low" | "normal" | "high" | "urgent"
  status: "open" | "in_progress" | "resolved" | "closed"
  location?: string
  assignedTo?: string
  resolutionNotes?: string
  resolvedAt?: string
  referenceCode?: string
  estimatedCompletion?: string
  actualCompletion?: string
  createdAt: string
  updatedAt: string
  reporter?: User
  assignee?: User
  attachments?: IssueAttachment[]
  comments?: IssueComment[]
  departments?: IssueDepartment[]
}

export interface IssueAttachment {
  id: string
  issueId: string
  fileName: string
  fileUrl: string
  fileType?: string
  fileSize?: number
  uploadedBy?: string
  createdAt: string
  uploader?: User
}

export interface CreateIssueData {
  title: string
  description: string
  category: string
  priority: "low" | "normal" | "high" | "urgent"
  location?: string
}

export interface CreateAnnouncementData {
  title: string
  content: string
  priority: "low" | "normal" | "high" | "urgent"
  publishDate?: string
  expiryDate?: string
}

export interface CreateCarStickerData {
  homeownerId: string
  stickerNumber: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleYear?: number
  vehicleColor?: string
  licensePlate?: string
  expiryDate?: string
}

export interface HouseholdMember {
  id: string
  homeownerId: string
  fullName: string
  relationship?: string
  phone?: string
  email?: string
  dateOfBirth?: string
  isActive: boolean
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Department {
  id: string
  name: string
  description?: string
  email: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface IssueComment {
  id: string
  issueId: string
  authorId?: string
  departmentId?: string
  comment: string
  isInternal: boolean
  createdAt: string
  author?: User
  department?: Department
}

export interface IssueDepartment {
  id: string
  issueId: string
  departmentId: string
  assignedAt: string
  assignedBy?: string
  isPrimary: boolean
  department?: Department
  assignedByUser?: User
}

export interface CreateHouseholdMemberData {
  homeownerId: string
  fullName: string
  relationship?: string
  phone?: string
  email?: string
  dateOfBirth?: string
  notes?: string
}

export interface CreateDepartmentData {
  name: string
  description?: string
  email: string
}
