import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F2F2F7] font-sans pb-10">
      {/* Sticky Glass Header Skeleton */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center justify-between shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
        <Skeleton className="h-8 w-24 rounded-full bg-slate-200" />
        <Skeleton className="h-9 w-9 rounded-full bg-slate-200" />
      </header>

      <main className="px-4 py-6 max-w-md mx-auto space-y-6">
        <Skeleton className="h-12 w-full rounded-2xl bg-slate-200" />
        <div className="space-y-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-[1.75rem] p-6 h-48 shadow-sm border border-slate-100">
              <div className="flex justify-between mb-4">
                <Skeleton className="h-6 w-20 rounded-full bg-slate-100" />
                <Skeleton className="h-4 w-12 rounded bg-slate-100" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded bg-slate-100 mb-2" />
              <Skeleton className="h-4 w-full rounded bg-slate-100" />
              <Skeleton className="h-4 w-2/3 rounded bg-slate-100 mt-2" />
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
