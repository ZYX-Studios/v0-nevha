"use client"

import { useState, useRef } from "react"
import Link from "next/link"
import { ArrowLeft, Camera, Settings, Shield, Bell, HelpCircle, FileText, ChevronRight, User } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Homeowner, Vehicle, Member } from "@/lib/types"
import { useRouter } from "next/navigation"
import { EditProfileModal } from "@/components/profile/edit-profile-modal"
import { VehicleList } from "@/components/profile/vehicle-list"
import { MemberList } from "@/components/profile/member-list"
import { useAuth } from "@/hooks/use-auth"
import { toast } from "sonner"

interface ProfileContentProps {
    initialHomeowner: Homeowner
    initialVehicles: Vehicle[]
    initialMembers: Member[]
}

export function ProfileContent({ initialHomeowner, initialVehicles, initialMembers }: ProfileContentProps) {
    const { logout } = useAuth()
    const router = useRouter()
    const [homeowner, setHomeowner] = useState<Homeowner>(initialHomeowner)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [photoUploading, setPhotoUploading] = useState(false)
    const photoInputRef = useRef<HTMLInputElement>(null)

    const handleLogout = async () => {
        await logout()
    }

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setPhotoUploading(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            const res = await fetch('/api/profile/photo', { method: 'POST', body: fd })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Upload failed')
            setHomeowner(h => ({ ...h, profilePhotoUrl: data.proxyUrl as string }))
            toast.success('Profile photo updated')
        } catch (err: any) {
            toast.error(err.message || 'Failed to upload photo')
        } finally {
            setPhotoUploading(false)
            if (photoInputRef.current) photoInputRef.current.value = ''
        }
    }

    // Derive initials for avatar fallback
    const initials = `${homeowner.firstName?.[0] ?? ''}${homeowner.lastName?.[0] ?? ''}`.toUpperCase() || 'HO'
    const photoUrl = homeowner.profilePhotoUrl as string | undefined

    return (
        <div className="min-h-screen bg-[#F2F2F7] font-sans pb-20">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-black/5 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Link href="/">
                        <Button variant="ghost" size="icon" className="rounded-full text-slate-500 hover:text-slate-900 -ml-2">
                            <ArrowLeft className="w-6 h-6" />
                        </Button>
                    </Link>
                    <h1 className="text-[17px] font-semibold text-slate-900">Profile</h1>
                </div>
                <Button variant="ghost" className="text-blue-600 font-semibold text-[15px]" onClick={() => setIsEditOpen(true)}>
                    Edit
                </Button>
            </header>

            <main className="px-4 py-8 max-w-md mx-auto space-y-8">

                {/* 1. Profile Avatar & Info */}
                <div className="flex flex-col items-center text-center">
                    <div className="relative mb-4">
                        {/* Hidden file input */}
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={handlePhotoChange}
                            id="profile-photo-input"
                        />
                        {/* Avatar */}
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-sm bg-gradient-to-br from-blue-100 to-blue-50">
                            {photoUrl ? (
                                <img src={photoUrl} alt="Profile photo" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-blue-600 text-2xl font-bold">
                                    {initials}
                                </div>
                            )}
                            {/* Loading overlay */}
                            {photoUploading && (
                                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                        {/* Camera button */}
                        <label
                            htmlFor="profile-photo-input"
                            className="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-1.5 shadow-md border-2 border-white cursor-pointer hover:bg-blue-700 transition-colors"
                        >
                            <Camera className="w-3 h-3" />
                        </label>
                    </div>
                    <h2 className="text-[22px] font-bold text-slate-900">
                        {homeowner.firstName} {homeowner.lastName}
                    </h2>
                    <p className="text-[15px] text-slate-500">
                        Block {homeowner.block}, Lot {homeowner.lot}, Phase {homeowner.phase}
                    </p>
                    {homeowner.isOwner && (
                        <p className="text-[13px] text-blue-600 font-medium mt-1 bg-blue-50 px-3 py-0.5 rounded-full inline-block">
                            Homeowner
                        </p>
                    )}
                </div>


                {/* 2. Management Sections */}

                <VehicleList homeownerId={homeowner.id} initialVehicles={initialVehicles} />

                <MemberList homeownerId={homeowner.id} initialMembers={initialMembers} />

                {/* 3. Settings Groups (iOS Style) */}
                <div className="space-y-6">
                    {/* Group 1 */}
                    <section>
                        <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Account</h3>
                        <div className="bg-white rounded-xl overflow-hidden border border-slate-200/60 shadow-sm divide-y divide-slate-100">
                            <SettingsRow icon={User} label="Personal Information" onClick={() => setIsEditOpen(true)} />
                            <SettingsRow icon={Shield} label="Security & Login" href="/auth/update-password" />
                            <SettingsRow icon={Bell} label="Notifications" badge="2" />
                        </div>
                    </section>

                    {/* Group 2 */}
                    <section>
                        <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider mb-2 px-4">Support</h3>
                        <div className="bg-white rounded-xl overflow-hidden border border-slate-200/60 shadow-sm divide-y divide-slate-100">
                            <SettingsRow icon={HelpCircle} label="Help Center" />
                            <SettingsRow icon={FileText} label="Terms & Privacy" />
                        </div>
                    </section>

                    {/* Logout */}
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-200/60 shadow-sm">
                        <button
                            onClick={handleLogout}
                            className="w-full p-4 flex items-center justify-center text-red-600 font-semibold hover:bg-slate-50 active:bg-slate-100 transition-colors"
                        >
                            Log Out
                        </button>
                    </div>

                    <p className="text-center text-[11px] text-slate-400">
                        Version 2.4.0 (Build 2024.11)
                    </p>
                </div>

            </main>

            <EditProfileModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                homeowner={homeowner}
                onSuccess={(updated) => setHomeowner(updated)}
            />
        </div>
    )
}

function SettingsRow({ icon: Icon, label, href, onClick, badge }: any) {
    const Content = (
        <div
            className="p-4 flex items-center justify-between group hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer"
            onClick={onClick}
        >
            <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                <span className="text-[15px] font-medium text-slate-900">{label}</span>
            </div>
            <div className="flex items-center gap-2">
                {badge && (
                    <span className="bg-red-500 text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                        {badge}
                    </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-300" />
            </div>
        </div>
    )

    if (href) {
        return (
            <Link href={href} className="block">
                {Content}
            </Link>
        )
    }

    return Content
}
