
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server-admin'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { email, password, firstName, lastName, phone, block, lot, phase } = body

        // 1. Validate input
        if (!email || !password || !firstName || !lastName || !block || !lot || !phase) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const supabaseAdmin = createAdminClient()

        // 2. Create Auth User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm for now, or false if you want email verification
            user_metadata: {
                firstName,
                lastName,
                phone,
                block,
                lot,
                phase
            }
        })

        if (authError) {
            console.error('Auth create error:', authError)
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        const userId = authData.user.id

        // 3. Create entry in public.users table (if triggers don't do it, but usually they do. 
        // Assuming the existing app has a trigger. If not, I should insert it. 
        // Checking `users` table existence in previous steps implies it exists. 
        // Let's assume we might need to update it or ensure it exists.
        // The previous `use-auth` code fetches from `users`. 
        // I'll try to upsert to be safe/ensure data is fresh.
        const { error: userError } = await supabaseAdmin.from('users').upsert({
            id: userId,
            email,
            first_name: firstName,
            last_name: lastName,
            phone,
            password_hash: "", // Required by table constraint but unused with Supabase Auth
            role: 'HOMEOWNER',
            is_active: true
        })

        if (userError) {
            console.error('Users table insert error:', userError)
            return NextResponse.json({ error: 'Failed to create user profile' }, { status: 500 })
        }

        // 4. Matching Logic
        let matchConfidence: 'high' | 'low' | 'none' = 'none'
        let matchedHomeownerId: string | null = null

        // 4a. Try Email Match
        const { data: emailMatch } = await supabaseAdmin
            .from('homeowners')
            .select('id, user_id')
            .eq('email', email)
            .maybeSingle()

        if (emailMatch) {
            matchConfidence = 'high'
            matchedHomeownerId = emailMatch.id
            // If already linked, that's an issue? "Claiming" an account.
            if (emailMatch.user_id) {
                // Already taken? For now fallback to manual review
                matchConfidence = 'low'
                // Or fail? "Email already linked to a homeowner record"
            }
        } else {
            // 4b. Try Address + Name Match
            // Normalized checks (case insensitive)
            const { data: addrMatch } = await supabaseAdmin
                .from('homeowners')
                .select('id, user_id, first_name, last_name')
                .ilike('block', block)
                .ilike('lot', lot)
                .ilike('phase', phase)
                .ilike('last_name', lastName)
                .maybeSingle()

            if (addrMatch) {
                // High confidence if first name also loosely matches or is empty in DB
                if (addrMatch.first_name && addrMatch.first_name.toLowerCase() === firstName.toLowerCase()) {
                    matchConfidence = 'high'
                    matchedHomeownerId = addrMatch.id
                } else {
                    // Address match + Last name match = Moderate/High
                    matchConfidence = 'high'
                    matchedHomeownerId = addrMatch.id
                }

                if (addrMatch.user_id) {
                    matchConfidence = 'low' // Already claimed
                }
            }
        }

        // 5. Action based on confidence
        if (matchConfidence === 'high' && matchedHomeownerId) {
            // Auto-link
            const { error: linkError } = await supabaseAdmin
                .from('homeowners')
                .update({
                    user_id: userId,
                    // Update contact info if missing? 
                    // Let's keep it simple: just link.
                })
                .eq('id', matchedHomeownerId)

            if (linkError) {
                console.error('Homeowner link error:', linkError)
                // Fallback to request
                matchConfidence = 'low'
            } else {
                return NextResponse.json({
                    success: true,
                    status: 'approved',
                    message: 'Account created and linked to homeowner record.'
                })
            }
        }

        // 6. Create Registration Request (Low/None confidence or failed link)
        const { error: reqError } = await supabaseAdmin
            .from('registration_requests')
            .insert({
                user_id: userId,
                email,
                first_name: firstName,
                last_name: lastName,
                phone,
                claimed_block: block,
                claimed_lot: lot,
                claimed_phase: phase,
                matched_homeowner_id: matchedHomeownerId,
                match_confidence: matchConfidence,
                status: 'pending'
            })

        if (reqError) {
            console.error('Registration request error:', reqError)
            return NextResponse.json({ error: 'Failed to create registration request' }, { status: 500 })
        }

        return NextResponse.json({
            success: true,
            status: 'pending',
            message: 'Account created. Verification pending.'
        })

    } catch (error: any) {
        console.error('Register homeowner error:', error)
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 })
    }
}
