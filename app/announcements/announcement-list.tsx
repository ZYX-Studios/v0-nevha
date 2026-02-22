"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, AlertCircle, AlertTriangle, Info, ChevronRight } from "lucide-react"
import { Input } from "@/components/ui/input"
import type { Announcement } from "@/lib/types"

interface AnnouncementListProps {
    initialAnnouncements: Announcement[]
}

export function AnnouncementList({ initialAnnouncements }: AnnouncementListProps) {
    const [searchTerm, setSearchTerm] = useState("")

    const filtered = initialAnnouncements.filter(a =>
        a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.content.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative group">
                <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                    placeholder="Search updates..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 bg-white border-0 shadow-[0_2px_10px_rgba(0,0,0,0.03)] rounded-2xl text-[15px] placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-blue-500/20"
                />
            </div>

            {/* Feed */}
            <div className="space-y-5">
                {filtered.length > 0 ? (
                    <AnimatePresence>
                        {filtered.map((item, i) => (
                            <motion.div
                                key={item.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white rounded-[1.75rem] p-6 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.05)] border border-slate-100 relative overflow-hidden group active:scale-[0.99] transition-transform"
                            >
                                {/* Priority Indicator */}
                                <div className={`absolute top-0 left-0 w-1.5 h-full ${item.priority === 'urgent' ? 'bg-red-500' :
                                    item.priority === 'high' ? 'bg-orange-500' : 'bg-blue-500'
                                    }`} />

                                <div className="flex items-start justify-between mb-3 pl-2">
                                    <div className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide inline-flex items-center gap-1.5 ${item.priority === 'urgent' ? 'bg-red-50 text-red-600' :
                                        item.priority === 'high' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'
                                        }`}>
                                        {item.priority === 'urgent' && <AlertCircle className="w-3 h-3" />}
                                        {item.priority === 'high' && <AlertTriangle className="w-3 h-3" />}
                                        {item.priority === 'normal' && <Info className="w-3 h-3" />}
                                        {item.priority}
                                    </div>
                                    <span className="text-[12px] font-semibold text-slate-400">
                                        {new Date(item.publishDate || item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </span>
                                </div>

                                <div className="pl-2">
                                    <h2 className="text-[19px] font-bold text-slate-900 leading-snug mb-3">
                                        {item.title}
                                    </h2>
                                    <p className="text-[15px] text-slate-500 leading-relaxed">
                                        {item.content}
                                    </p>
                                </div>

                                {/* Footer / Interaction */}
                                <div className="mt-5 pt-4 border-t border-slate-50 pl-2 flex items-center justify-between">
                                    <span className="text-[11px] font-medium text-slate-400">
                                        Posted by Admin
                                    </span>
                                    <button className="text-blue-600 font-semibold text-[13px] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Read More <ChevronRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                ) : (
                    <div className="text-center py-20 text-slate-400">
                        <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">No updates found</p>
                    </div>
                )}
            </div>
        </div>
    )
}
