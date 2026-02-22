import { createHmac } from "crypto"

export const COOKIE_NAME = "dept_session"

export type DeptSession = {
  dept_id: string
  dept_name: string
  iat: number // issued at (unix seconds)
  ver: string | null // password version marker, e.g., portal_password_updated_at ISO string
}

function base64urlEncode(input: string | Buffer): string {
  const buf = typeof input === "string" ? Buffer.from(input, "utf8") : input
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function base64urlDecode(input: string): string {
  input = input.replace(/-/g, "+").replace(/_/g, "/")
  const pad = input.length % 4
  if (pad) input += "=".repeat(4 - pad)
  return Buffer.from(input, "base64").toString("utf8")
}

function getSecret(): string {
  const s = process.env.DEPT_PORTAL_SECRET
  if (!s) throw new Error("Missing DEPT_PORTAL_SECRET")
  return s
}

export function signSession(payload: DeptSession): string {
  const secret = getSecret()
  const json = JSON.stringify(payload)
  const body = base64urlEncode(json)
  const hmac = createHmac("sha256", secret)
  hmac.update(body)
  const sig = base64urlEncode(hmac.digest())
  return `${body}.${sig}`
}

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

export function verifySession(token: string): DeptSession | null {
  try {
    const secret = getSecret()
    const [body, sig] = token.split(".")
    if (!body || !sig) return null
    const hmac = createHmac("sha256", secret)
    hmac.update(body)
    const expected = base64urlEncode(hmac.digest())
    if (expected !== sig) return null
    const json = base64urlDecode(body)
    const payload = JSON.parse(json) as DeptSession
    if (!payload?.dept_id || !payload?.iat) return null
    // TTL check: reject sessions older than 7 days
    const ageSeconds = Math.floor(Date.now() / 1000) - payload.iat
    if (ageSeconds > SESSION_TTL_SECONDS) return null
    return payload
  } catch {
    return null
  }
}
