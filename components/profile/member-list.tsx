
"use client"

import { useState } from "react"
import { Users, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Member } from "@/lib/types"
import { toast } from "sonner"

interface MemberListProps {
    homeownerId: string
    initialMembers: Member[]
}

export function MemberList({ homeownerId, initialMembers }: MemberListProps) {
    const [members, setMembers] = useState<Member[]>(initialMembers)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [newMember, setNewMember] = useState({
        fullName: "",
        relation: "",
        phone: ""
    })

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/profile/members', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: newMember.fullName,
                    relation: newMember.relation,
                    phone: newMember.phone,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Failed to add member')

            const added: Member = {
                id: data.member.id,
                homeownerId: data.member.homeowner_id,
                fullName: data.member.full_name,
                relation: data.member.relation,
                phone: data.member.phone,
                isActive: data.member.is_active,
                createdAt: data.member.created_at,
                email: data.member.email,
            }

            setMembers([...members, added])
            setIsAddOpen(false)
            setNewMember({ fullName: "", relation: "", phone: "" })
            toast.success("Member added successfully")
        } catch (error: any) {
            toast.error(error.message || "Failed to add member")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        toast("Remove this household member?", {
            action: {
                label: "Remove",
                onClick: async () => {
                    setMembers(prev => prev.filter(m => m.id !== id))
                    try {
                        const res = await fetch(`/api/profile/members?id=${id}`, { method: 'DELETE' })
                        if (!res.ok) {
                            const data = await res.json()
                            throw new Error(data.error || 'Delete failed')
                        }
                        toast.success("Member removed")
                    } catch (err: any) {
                        toast.error(err.message || "Failed to remove member")
                        // Re-fetch to restore state on error
                        const refetch = await fetch('/api/profile/members')
                        if (refetch.ok) {
                            const rd = await refetch.json()
                            setMembers(rd.members.map((m: any) => ({
                                id: m.id, homeownerId: m.homeowner_id,
                                fullName: m.full_name, relation: m.relation,
                                phone: m.phone, isActive: m.is_active,
                                createdAt: m.created_at, email: m.email,
                            })))
                        }
                    }
                }
            },
            cancel: { label: "Cancel", onClick: () => { } }
        })
    }



    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Household Members</h3>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-blue-600 text-[13px] font-semibold" onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
            </div>

            <div className="bg-white rounded-xl overflow-hidden border border-slate-200/60 shadow-sm divide-y divide-slate-100">
                {members.map((m) => (
                    <div key={m.id} className="p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                                <Users className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-[15px] font-semibold text-slate-900">{m.fullName}</h4>
                                <p className="text-[13px] text-slate-500 capitalize">{m.relation} {m.phone && `• ${m.phone}`}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                {members.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-sm">
                        No household members listed.
                    </div>
                )}
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Add Member</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddMember} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input
                                value={newMember.fullName}
                                onChange={(e) => setNewMember({ ...newMember, fullName: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Relationship</Label>
                            <Input
                                value={newMember.relation}
                                onChange={(e) => setNewMember({ ...newMember, relation: e.target.value })}
                                placeholder="Spouse, Child, etc."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone (Optional)</Label>
                            <Input
                                value={newMember.phone}
                                onChange={(e) => setNewMember({ ...newMember, phone: e.target.value })}
                                type="tel"
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading} className="bg-blue-600 text-white">
                                {loading ? "Adding..." : "Add Member"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
