import type { Metadata } from "next"
import { RefreshPageClient } from "@/components/pwa/refresh-page-client"

export const metadata: Metadata = {
  title: "NEVHA App — Refresh",
  description: "Force refresh to clear outdated cache and load the latest NEVHA App.",
  robots: {
    index: false,
    follow: false,
  },
}

export default function RefreshPage() {
  return <RefreshPageClient />
}
