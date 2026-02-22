import Link from "next/link"
import { ArrowLeft, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getAnnouncements } from "@/lib/data/announcements"
import { AnnouncementList } from "./announcement-list"

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements()

  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-10">
      {/* Sticky Glass Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 -ml-2">
              <ArrowLeft className="w-6 h-6" />
            </Button>
          </Link>
          <h1 className="text-[17px] font-semibold text-slate-900">Updates</h1>
        </div>
        <div className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
          <Bell className="w-5 h-5 text-slate-900" />
        </div>
      </header>

      <main className="px-4 py-6 max-w-md mx-auto">
        <AnnouncementList initialAnnouncements={announcements} />
      </main>
    </div>
  )
}
