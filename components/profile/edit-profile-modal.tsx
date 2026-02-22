"use client"

import { useState, useRef } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Homeowner } from "@/lib/types"
import { toast } from "sonner"
import { Lock, Upload, Loader2, CheckCircle } from "lucide-react"

interface EditProfileModalProps {
    isOpen: boolean
    onClose: () => void
    homeowner: Homeowner
    onSuccess: (updatedHomeowner: Homeowner) => void
}

export function EditProfileModal({
    isOpen,
    onClose,
    homeowner,
    onSuccess,
}: EditProfileModalProps) {
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState<"contact" | "name">("contact")

    // Freely-editable fields
    const [contact, setContact] = useState({
        contact_number: homeowner.contactNumber || "",
    })

    // Name change request
    const [nameChange, setNameChange] = useState({
        field: "first_name" as "first_name" | "last_name",
        value: homeowner.firstName || "",
    })
    const [nameDoc, setNameDoc] = useState<File | null>(null)
    const [nameChangeSubmitted, setNameChangeSubmitted] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleContactSave = async () => {
        setLoading(true)
        try {
            const res = await fetch("/api/profile", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ contact_number: contact.contact_number }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Update failed")

            onSuccess({
                ...homeowner,
                contactNumber: contact.contact_number,
            })
            toast.success("Profile updated")
            onClose()
        } catch (err: any) {
            toast.error(err.message || "Failed to update profile")
        } finally {
            setLoading(false)
        }
    }

    const handleNameChangeSubmit = async () => {
        if (!nameDoc) {
            toast.error("Please attach a government ID to support the name change")
            return
        }
        setLoading(true)
        try {
            const fd = new FormData()
            fd.append("fieldName", nameChange.field)
            fd.append("newValue", nameChange.value)
            fd.append("file", nameDoc)

            const res = await fetch("/api/profile/name-change", {
                method: "POST",
                body: fd,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || "Request failed")

            setNameChangeSubmitted(true)
            toast.success("Name change request submitted. An admin will review it shortly.")
        } catch (err: any) {
            toast.error(err.message || "Failed to submit name change request")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[460px] bg-white rounded-3xl">
                <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                </DialogHeader>

                {/* Tab switcher */}
                <div className="flex border-b border-slate-100 -mx-6 px-6 mb-4">
                    {(["contact", "name"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-2 px-3 text-sm font-medium transition-colors capitalize ${activeTab === tab
                                ? "border-b-2 border-blue-600 text-blue-600"
                                : "text-slate-500 hover:text-slate-700"
                                }`}
                        >
                            {tab === "contact" ? "Contact Info" : (
                                <span className="flex items-center gap-1.5">
                                    <Lock className="w-3 h-3" /> Name
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {activeTab === "contact" && (
                    <div className="space-y-4 pb-2">
                        <div className="space-y-2">
                            <Label htmlFor="contact_number">Phone Number</Label>
                            <Input
                                id="contact_number"
                                type="tel"
                                value={contact.contact_number}
                                onChange={(e) => setContact({ ...contact, contact_number: e.target.value })}
                                placeholder="+63 9XX XXX XXXX"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-1.5">
                                Email Address <Lock className="w-3 h-3 text-slate-400" />
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={homeowner.email || ""}
                                readOnly
                                disabled
                                className="bg-slate-50 text-slate-400 cursor-not-allowed"
                            />
                            <p className="text-[11px] text-slate-400">
                                Email is linked to your login. Contact admin to change it.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === "name" && (
                    <div className="space-y-4 pb-2">
                        {nameChangeSubmitted ? (
                            <div className="flex flex-col items-center py-6 text-center gap-3">
                                <CheckCircle className="w-10 h-10 text-green-500" />
                                <p className="font-semibold text-slate-900">Request submitted</p>
                                <p className="text-sm text-slate-500">
                                    An admin will review your name change request and update your profile if approved.
                                </p>
                                <Button variant="outline" onClick={onClose}>Close</Button>
                            </div>
                        ) : (
                            <>
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                                    <span className="font-semibold">Name changes require admin approval.</span>{" "}
                                    Upload a government ID to support your request.
                                </div>

                                <div className="space-y-2">
                                    <Label>Change which field?</Label>
                                    <div className="flex gap-3">
                                        {(["first_name", "last_name"] as const).map((f) => (
                                            <button
                                                key={f}
                                                onClick={() =>
                                                    setNameChange({
                                                        field: f,
                                                        value: f === "first_name" ? homeowner.firstName || "" : homeowner.lastName || "",
                                                    })
                                                }
                                                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${nameChange.field === f
                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                    : "border-slate-200 text-slate-600"
                                                    }`}
                                            >
                                                {f === "first_name" ? "First Name" : "Last Name"}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>New {nameChange.field === "first_name" ? "First" : "Last"} Name</Label>
                                    <Input
                                        value={nameChange.value}
                                        onChange={(e) => setNameChange({ ...nameChange, value: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Supporting Document (Government ID)</Label>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp,application/pdf"
                                        className="hidden"
                                        onChange={(e) => setNameDoc(e.target.files?.[0] || null)}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full border-2 border-dashed border-slate-200 rounded-lg p-4 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Upload className="w-4 h-4" />
                                        {nameDoc ? nameDoc.name : "Click to upload ID (max 10MB)"}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {!nameChangeSubmitted && (
                    <DialogFooter className="pt-2">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={activeTab === "contact" ? handleContactSave : handleNameChangeSubmit}
                            className="bg-blue-600 text-white hover:bg-blue-700"
                            disabled={loading}
                        >
                            {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                            {activeTab === "contact" ? "Save Changes" : "Submit Request"}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    )
}
