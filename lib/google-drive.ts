/**
 * Google Drive integration for NEVHA document uploads.
 *
 * Folder structure per person:
 *   NEVHA Root/
 *     {PersonName}_{PersonId}/
 *       Registrations/   ← onboarding docs (gov ID, proof of residence)
 *       Payments/        ← payment proofs (annual dues, car sticker)
 *       Vehicles/        ← OR/CR uploads
 *       Profile/         ← profile photo
 *
 * Files are RESTRICTED — only the Drive owner (HOA account) can access them.
 * An authenticated proxy endpoint (/api/gdrive-proxy) serves file content
 * to authorized users in-browser.
 */

import { google, drive_v3 } from "googleapis"
import { Readable } from "stream"

const SCOPES = ["https://www.googleapis.com/auth/drive"]

function getAuth() {
    const clientId = process.env.GOOGLE_CLIENT_ID
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error(
            "Missing Google Drive credentials: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REFRESH_TOKEN"
        )
    }

    const auth = new google.auth.OAuth2(clientId, clientSecret)
    auth.setCredentials({ refresh_token: refreshToken })
    return auth
}

function getDrive() {
    return google.drive({ version: "v3", auth: getAuth() })
}

/** Returns the root folder ID from env; throws if not set. */
function getRootFolderId(): string {
    const id = process.env.GOOGLE_DRIVE_FOLDER_ID
    if (!id) throw new Error("GOOGLE_DRIVE_FOLDER_ID env var is not set")
    return id
}

/**
 * Finds an existing folder by name within a parent, or creates it.
 * Uses exact name match on Drive API to prevent duplicates.
 */
async function getOrCreateFolder(
    drive: drive_v3.Drive,
    name: string,
    parentId: string
): Promise<string> {
    // Sanitize folder name — no slashes or special Drive-unsafe chars
    const safeName = name.replace(/[/\\?%*:|"<>]/g, "_").trim().slice(0, 100)

    const res = await drive.files.list({
        q: `name = '${safeName.replace(/'/g, "\\'")}' and '${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: "files(id,name)",
        spaces: "drive",
    })

    if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0].id!
    }

    const folder = await drive.files.create({
        requestBody: {
            name: safeName,
            mimeType: "application/vnd.google-apps.folder",
            parents: [parentId],
        },
        fields: "id",
    })

    return folder.data.id!
}

/**
 * Gets or creates the person-level folder: {FirstName}{LastName}_{personId}/
 * under the NEVHA root folder.
 */
async function getPersonFolder(
    drive: drive_v3.Drive,
    personName: string,
    personId: string
): Promise<string> {
    const rootId = getRootFolderId()
    // Use first 30 chars of name + truncated ID to keep folder names manageable
    const folderName = `${personName.slice(0, 30)}_${personId.slice(0, 8)}`
    return getOrCreateFolder(drive, folderName, rootId)
}

type SubFolderType = "Registrations" | "Payments" | "Vehicles" | "Profile"

/**
 * Gets or creates the sub-category folder under the person's folder.
 */
async function getSubFolder(
    drive: drive_v3.Drive,
    personFolderId: string,
    type: SubFolderType
): Promise<string> {
    return getOrCreateFolder(drive, type, personFolderId)
}

export interface DriveUploadResult {
    /** Google Drive file ID — store this to fetch via the proxy */
    fileId: string
    /** webViewLink — used only for admin GDrive OAuth account access, NOT exposed to users */
    webViewLink: string
}

/**
 * Core upload function. Uploads a file buffer to a specific Drive folder.
 * Files are NOT made public — only the Drive owner can access them.
 */
async function uploadToFolder(
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    folderId: string
): Promise<DriveUploadResult> {
    const drive = getDrive()

    const response = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [folderId],
        },
        media: {
            mimeType,
            body: Readable.from(fileBuffer),
        },
        fields: "id,webViewLink",
    })

    if (!response.data.id) {
        throw new Error("Google Drive upload failed: no file ID returned")
    }

    // Explicitly do NOT set any permissions — file stays owner-only (restricted)
    // Users access content via /api/gdrive-proxy which authenticates the request

    return {
        fileId: response.data.id,
        webViewLink: response.data.webViewLink || "",
    }
}

/**
 * Generates a sanitized, unique filename.
 * Format: {prefix}_{timestamp}.{ext}
 */
function buildFileName(prefix: string, originalName: string): string {
    const ext = originalName.split(".").pop()?.toLowerCase() || "bin"
    const timestamp = Date.now()
    const safeParts = prefix.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60)
    return `${safeParts}_${timestamp}.${ext}`
}

// ── Public upload helpers ────────────────────────────────────────────────────

/**
 * Uploads a registration document (gov ID, proof of residence) for a homeowner.
 * Stored under: NEVHA/{PersonFolder}/Registrations/
 */
export async function uploadRegistrationDoc(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    personName: string,
    personId: string,
    docType: "id" | "proof_of_residence" | string
): Promise<DriveUploadResult> {
    const drive = getDrive()
    const personFolder = await getPersonFolder(drive, personName, personId)
    const subFolder = await getSubFolder(drive, personFolder, "Registrations")
    const fileName = buildFileName(`${docType}_${personId.slice(0, 8)}`, originalName)
    return uploadToFolder(fileBuffer, fileName, mimeType, subFolder)
}

/**
 * Uploads a payment proof (deposit slip, GCash screenshot, etc.).
 * Stored under: NEVHA/{PersonFolder}/Payments/
 */
export async function uploadPaymentProof(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    personName: string,
    personId: string
): Promise<DriveUploadResult> {
    const drive = getDrive()
    const personFolder = await getPersonFolder(drive, personName, personId)
    const subFolder = await getSubFolder(drive, personFolder, "Payments")
    const fileName = buildFileName(`payment_${personId.slice(0, 8)}`, originalName)
    return uploadToFolder(fileBuffer, fileName, mimeType, subFolder)
}

/**
 * Uploads a vehicle document (OR/CR, etc.).
 * Stored under: NEVHA/{PersonFolder}/Vehicles/
 */
export async function uploadVehicleDoc(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    personName: string,
    personId: string,
    plateNumber: string
): Promise<DriveUploadResult> {
    const drive = getDrive()
    const personFolder = await getPersonFolder(drive, personName, personId)
    const subFolder = await getSubFolder(drive, personFolder, "Vehicles")
    const safePlate = plateNumber.replace(/[^a-zA-Z0-9]/g, "")
    const fileName = buildFileName(`vehicle_${safePlate}`, originalName)
    return uploadToFolder(fileBuffer, fileName, mimeType, subFolder)
}

/**
 * Uploads a profile photo.
 * Stored under: NEVHA/{PersonFolder}/Profile/
 */
export async function uploadProfilePhoto(
    fileBuffer: Buffer,
    originalName: string,
    mimeType: string,
    personName: string,
    personId: string
): Promise<DriveUploadResult> {
    const drive = getDrive()
    const personFolder = await getPersonFolder(drive, personName, personId)
    const subFolder = await getSubFolder(drive, personFolder, "Profile")
    const fileName = buildFileName(`photo_${personId.slice(0, 8)}`, originalName)
    return uploadToFolder(fileBuffer, fileName, mimeType, subFolder)
}

/**
 * Streams a file from Google Drive for use in the authenticated proxy endpoint.
 * Returns a readable stream and the file's MIME type.
 */
export async function streamFileFromDrive(
    fileId: string
): Promise<{ stream: NodeJS.ReadableStream; mimeType: string; fileName: string }> {
    const drive = getDrive()

    // Get file metadata first
    const meta = await drive.files.get({
        fileId,
        fields: "name,mimeType",
    })

    const mimeType = meta.data.mimeType || "application/octet-stream"
    const fileName = meta.data.name || "file"

    // Get file content as stream
    const res = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "stream" }
    )

    return { stream: res.data as unknown as NodeJS.ReadableStream, mimeType, fileName }
}

/** File validation helper — call before uploading */
export function validateUploadFile(file: File): { valid: boolean; error?: string } {
    const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10MB
    const ALLOWED_TYPES = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "application/pdf",
    ]

    if (file.size > MAX_SIZE_BYTES) {
        return { valid: false, error: `File too large. Maximum size is 10MB. Your file is ${(file.size / 1024 / 1024).toFixed(1)}MB.` }
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
        return { valid: false, error: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF." }
    }

    return { valid: true }
}
