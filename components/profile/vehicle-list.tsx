
"use client"

import { useState } from "react"
import { Car, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Vehicle } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface VehicleListProps {
    homeownerId: string
    initialVehicles: Vehicle[]
}

export function VehicleList({ homeownerId, initialVehicles }: VehicleListProps) {
    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles)
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    // New Vehicle Form State
    const [newVehicle, setNewVehicle] = useState({
        plateNo: "",
        make: "",
        model: "",
        color: ""
    })

    const handleAddVehicle = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const supabase = createClient()
            const { data, error } = await supabase
                .from('vehicles')
                .insert({
                    homeowner_id: homeownerId,
                    plate_no: newVehicle.plateNo,
                    make: newVehicle.make,
                    model: newVehicle.model,
                    color: newVehicle.color,
                })
                .select()
                .single()

            if (error) throw error

            const added: Vehicle = {
                id: data.id,
                homeownerId: data.homeowner_id,
                plateNo: data.plate_no,
                make: data.make,
                model: data.model,
                color: data.color,
                category: data.category,
                createdAt: data.created_at
            }

            setVehicles([...vehicles, added])
            setIsAddOpen(false)
            setNewVehicle({ plateNo: "", make: "", model: "", color: "" })
            toast.success("Vehicle added successfully")
        } catch (error: any) {
            console.error('Add vehicle error:', error)
            toast.error(error.message || "Failed to add vehicle")
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this vehicle?")) return

        try {
            // Optimistic update
            setVehicles(vehicles.filter(v => v.id !== id))

            const supabase = createClient()
            const { error } = await supabase.from('vehicles').delete().eq('id', id)
            if (error) {
                // Revert if error? For now just assume success or toast error
                throw error
            }
            toast.success("Vehicle deleted")
        } catch (error: any) {
            console.error('Delete vehicle error:', error)
            toast.error("Failed to delete vehicle")
            // Here we should revert state ideally, but simpler is to re-fetch
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
                <h3 className="text-[13px] font-semibold text-slate-500 uppercase tracking-wider">Vehicles</h3>
                <Button variant="ghost" size="sm" className="h-auto p-0 text-blue-600 text-[13px] font-semibold" onClick={() => setIsAddOpen(true)}>
                    <Plus className="w-3 h-3 mr-1" /> Add
                </Button>
            </div>

            <div className="bg-white rounded-xl overflow-hidden border border-slate-200/60 shadow-sm divide-y divide-slate-100">
                {vehicles.map((v) => (
                    <div key={v.id} className="p-4 flex items-center justify-between group">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                                <Car className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-[15px] font-semibold text-slate-900">{v.plateNo}</h4>
                                <p className="text-[13px] text-slate-500">{v.color} {v.make} {v.model}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(v.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                ))}

                {vehicles.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-sm">
                        No vehicles registered.
                    </div>
                )}
            </div>

            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl">
                    <DialogHeader>
                        <DialogTitle>Register Vehicle</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddVehicle} className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>License Plate</Label>
                            <Input
                                value={newVehicle.plateNo}
                                onChange={(e) => setNewVehicle({ ...newVehicle, plateNo: e.target.value })}
                                placeholder="ABC 1234"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Make</Label>
                                <Input
                                    value={newVehicle.make}
                                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                                    placeholder="Toyota"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Model</Label>
                                <Input
                                    value={newVehicle.model}
                                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                                    placeholder="Vios"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Color</Label>
                            <Input
                                value={newVehicle.color}
                                onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                                placeholder="Silver"
                            />
                        </div>

                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading} className="bg-blue-600 text-white">
                                {loading ? "Adding..." : "Add Vehicle"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
