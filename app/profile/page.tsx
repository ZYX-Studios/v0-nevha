
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ProfileContent } from "./profile-content"
import { Homeowner, Vehicle, Member } from "@/lib/types"
import { LogoutButton } from "@/components/profile/logout-button"

export default async function ProfilePage() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        redirect('/auth')
    }

    const { data: homeowner } = await supabase
        .from('homeowners')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

    if (!homeowner) {
        // Check for pending registration request
        const { data: request } = await supabase
            .from('registration_requests')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()

        if (request) {
            return (
                <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-sm text-center max-w-md">
                        <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-600">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Verification Pending</h2>
                        <p className="text-slate-500 text-sm">
                            Your registration for Block {request.claimed_block}, Lot {request.claimed_lot} is currently under review.
                            You will be notified once an admin approves your account.
                        </p>
                        <LogoutButton />
                    </div>
                </div>
            )
        }

        // If no request and no homeowner record, redirect to home
        redirect('/')
    }

    // Fetch Vehicles & Members in parallel
    const [vehiclesRes, membersRes] = await Promise.all([
        supabase.from('vehicles').select('*').eq('homeowner_id', homeowner.id).order('created_at', { ascending: false }),
        supabase.from('members').select('*').eq('homeowner_id', homeowner.id).order('created_at', { ascending: false })
    ])

    // Map DB column names to camelCase types
    const mappedHomeowner: Homeowner = {
        id: homeowner.id,
        userId: homeowner.user_id,
        // Required fields
        propertyAddress: homeowner.property_address || `Blk ${homeowner.block} Lot ${homeowner.lot}`,
        isOwner: Boolean(homeowner.is_owner),
        createdAt: homeowner.created_at,
        updatedAt: homeowner.updated_at,
        // Optional enriched fields
        firstName: homeowner.first_name,
        lastName: homeowner.last_name,
        middleInitial: homeowner.middle_initial,
        suffix: homeowner.suffix,
        fullName: homeowner.full_name,
        block: homeowner.block,
        lot: homeowner.lot,
        phase: homeowner.phase,
        street: homeowner.street,
        unitNumber: homeowner.unit_number,
        moveInDate: homeowner.move_in_date,
        contactNumber: homeowner.contact_number,
        email: homeowner.email,
        facebookProfile: homeowner.facebook_profile,
        residencyStartDate: homeowner.residency_start_date,
        lengthOfResidency: homeowner.length_of_residency,
        emergencyContactName: homeowner.emergency_contact_name,
        emergencyContactPhone: homeowner.emergency_contact_phone,
        datePaid: homeowner.date_paid,
        amountPaid: homeowner.amount_paid,
        notes: homeowner.notes,
    }

    const mappedVehicles: Vehicle[] = (vehiclesRes.data || []).map((v: any) => ({
        id: v.id,
        homeownerId: v.homeowner_id,
        plateNo: v.plate_no,
        make: v.make,
        model: v.model,
        color: v.color,
        category: v.category,
        createdAt: v.created_at
    }))

    const mappedMembers: Member[] = (membersRes.data || []).map((m: any) => ({
        id: m.id,
        homeownerId: m.homeowner_id,
        fullName: m.full_name,
        relation: m.relation,
        phone: m.phone,
        email: m.email,
        isActive: m.is_active,
        createdAt: m.created_at
    }))

    return (
        <ProfileContent
            initialHomeowner={mappedHomeowner}
            initialVehicles={mappedVehicles}
            initialMembers={mappedMembers}
        />
    )
}

