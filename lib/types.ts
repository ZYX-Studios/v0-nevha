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
  userId: string | null
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
  // Enriched optional fields
  firstName?: string | null
  lastName?: string | null
  middleInitial?: string | null
  suffix?: string | null
  fullName?: string | null
  block?: string | null
  lot?: string | null
  phase?: string | null
  street?: string | null
  contactNumber?: string | null
  residencyStartDate?: string | null
  lengthOfResidency?: number | null
  email?: string | null
  facebookProfile?: string | null
  datePaid?: string | null
  amountPaid?: number | null
  profilePhotoUrl?: string | null
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
  ref_code?: string
  priority: "P1" | "P2" | "P3" | "P4"
  status: "not_started" | "in_progress" | "on_hold" | "resolved" | "closed"
  location?: string
  // Reporter address fields (optional, may be present in admin APIs)
  reporterBlock?: string | null
  reporterLot?: string | null
  reporterPhase?: string | null
  reporterStreet?: string | null
  // Reporter identity fields (optional, may be present in admin APIs)
  reporterFullName?: string | null
  reporterEmail?: string | null
  assignedTo?: string
  resolutionNotes?: string
  resolvedAt?: string
  createdAt: string
  updatedAt: string
  reporter?: User
  assignee?: User
  attachments?: IssueAttachment[]
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
  priority: "P1" | "P2" | "P3" | "P4"
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

// PRD-aligned entities
export interface Member {
  id: string
  homeownerId: string
  fullName: string
  relation?: string
  phone?: string
  email?: string
  isActive: boolean
  createdAt: string
}

export interface Vehicle {
  id: string
  homeownerId: string
  plateNo: string
  make?: string
  model?: string
  color?: string
  category?: string
  createdAt: string
}

export interface Sticker {
  id: string
  homeownerId: string
  vehicleId?: string | null
  code: string
  status: "ACTIVE" | "EXPIRED" | "REVOKED"
  issuedAt: string
  expiresAt?: string | null
  notes?: string | null
  amountPaid?: number | null
  createdAt: string
  updatedAt: string
  // Optional joined vehicle fields for display
  vehiclePlateNo?: string
  vehicleMake?: string
  vehicleModel?: string
  vehicleColor?: string
  vehicleCategory?: string
}
export interface RegistrationRequest {
  id: string
  user_id: string
  email: string
  first_name: string
  last_name: string
  phone?: string
  claimed_block?: string
  claimed_lot?: string
  claimed_phase?: string
  matched_homeowner_id?: string
  match_confidence: 'high' | 'low' | 'none'
  status: 'pending' | 'approved' | 'rejected'
  admin_notes?: string
  reviewed_by?: string
  reviewed_at?: string
  created_at: string
  documents?: {
    type: string
    fileId: string
    viewLink: string
    uploadedAt: string
    fileName: string
  }[]
}

export interface Payment {
  id: string
  homeowner_id: string
  fee_type: 'annual_dues' | 'car_sticker'
  fee_year: number
  amount: number
  payment_method: 'gcash' | 'bank_transfer' | 'cash' | 'check'
  proof_url?: string
  proof_drive_file_id?: string
  status: 'pending' | 'verified' | 'rejected'
  admin_notes?: string
  verified_by?: string
  verified_at?: string
  created_at: string
}

export interface PaymentQrCode {
  id: string
  payment_method: string
  label: string
  account_name?: string
  account_number?: string
  qr_image_url: string
  is_active: boolean
}

export interface HoaDuesConfig {
  id: string
  dues_year: number
  annual_amount: number
  car_sticker_price: number
  due_date?: string
  late_fee_amount?: number
  late_fee_grace_days?: number
  is_active: boolean
}

/** A single uploaded vehicle document ref stored in vehicle_requests.documents JSONB */
export interface VehicleDocumentRef {
  fileId: string
  fileName: string
  proxyUrl: string
  docType: 'or' | 'cr'
}

export interface VehicleRequest {
  id: string
  user_id: string
  vehicle_type: 'car' | 'motorcycle' | 'other'
  plate_number: string
  sticker_price: number
  status: 'pending' | 'approved' | 'rejected'
  /** Array of GDrive document refs uploaded at submission time */
  documents?: VehicleDocumentRef[]
  created_at: string
  updated_at: string
}
