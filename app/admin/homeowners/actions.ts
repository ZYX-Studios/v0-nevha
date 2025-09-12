'use server'

import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'

// Validation schemas
const homeownerSchema = z.object({
  user_id: z.string().uuid().optional(),
  property_address: z.string().min(1, 'Property address is required'),
  unit_number: z.string().optional(),
  move_in_date: z.string().optional(),
  is_owner: z.boolean().default(true),
  emergency_contact_name: z.string().optional(),
  emergency_contact_phone: z.string().optional(),
  notes: z.string().optional(),
})

const householdMemberSchema = z.object({
  homeowner_id: z.string().uuid(),
  full_name: z.string().min(1, 'Full name is required'),
  relationship: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  date_of_birth: z.string().optional(),
  is_active: z.boolean().default(true),
  notes: z.string().optional(),
})

// Homeowner CRUD operations
export async function getHomeowners() {
  const supabase = await createServerClient()
  
  const { data: homeowners, error } = await supabase
    .from('homeowners')
    .select(`
      *,
      users:user_id (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      household_members (
        id,
        full_name,
        relationship,
        phone,
        email,
        date_of_birth,
        is_active,
        notes,
        created_at
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching homeowners:', error)
    throw new Error('Failed to fetch homeowners')
  }

  return homeowners || []
}

export async function getHomeowner(id: string) {
  const supabase = await createServerClient()
  
  const { data: homeowner, error } = await supabase
    .from('homeowners')
    .select(`
      *,
      users:user_id (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      household_members (
        id,
        full_name,
        relationship,
        phone,
        email,
        date_of_birth,
        is_active,
        notes,
        created_at
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching homeowner:', error)
    throw new Error('Failed to fetch homeowner')
  }

  return homeowner
}

export async function createHomeowner(formData: FormData) {
  const supabase = await createServerClient()
  
  const rawData = {
    user_id: formData.get('user_id') as string || null,
    property_address: formData.get('property_address') as string,
    unit_number: formData.get('unit_number') as string || null,
    move_in_date: formData.get('move_in_date') as string || null,
    is_owner: formData.get('is_owner') === 'true',
    emergency_contact_name: formData.get('emergency_contact_name') as string || null,
    emergency_contact_phone: formData.get('emergency_contact_phone') as string || null,
    notes: formData.get('notes') as string || null,
  }

  const validatedData = homeownerSchema.parse(rawData)

  const { data, error } = await supabase
    .from('homeowners')
    .insert([validatedData])
    .select()
    .single()

  if (error) {
    console.error('Error creating homeowner:', error)
    throw new Error('Failed to create homeowner')
  }

  revalidatePath('/admin/homeowners')
  return data
}

export async function updateHomeowner(id: string, formData: FormData) {
  const supabase = await createServerClient()
  
  const rawData = {
    user_id: formData.get('user_id') as string || null,
    property_address: formData.get('property_address') as string,
    unit_number: formData.get('unit_number') as string || null,
    move_in_date: formData.get('move_in_date') as string || null,
    is_owner: formData.get('is_owner') === 'true',
    emergency_contact_name: formData.get('emergency_contact_name') as string || null,
    emergency_contact_phone: formData.get('emergency_contact_phone') as string || null,
    notes: formData.get('notes') as string || null,
    updated_at: new Date().toISOString(),
  }

  const validatedData = homeownerSchema.parse(rawData)

  const { data, error } = await supabase
    .from('homeowners')
    .update(validatedData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating homeowner:', error)
    throw new Error('Failed to update homeowner')
  }

  revalidatePath('/admin/homeowners')
  return data
}

export async function deleteHomeowner(id: string) {
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('homeowners')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting homeowner:', error)
    throw new Error('Failed to delete homeowner')
  }

  revalidatePath('/admin/homeowners')
}

// Household Member CRUD operations
export async function getHouseholdMembers(homeownerId: string) {
  const supabase = await createServerClient()
  
  const { data: members, error } = await supabase
    .from('household_members')
    .select('*')
    .eq('homeowner_id', homeownerId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching household members:', error)
    throw new Error('Failed to fetch household members')
  }

  return members || []
}

export async function createHouseholdMember(formData: FormData) {
  const supabase = await createServerClient()
  
  const rawData = {
    homeowner_id: formData.get('homeowner_id') as string,
    full_name: formData.get('full_name') as string,
    relationship: formData.get('relationship') as string || null,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    date_of_birth: formData.get('date_of_birth') as string || null,
    is_active: formData.get('is_active') !== 'false',
    notes: formData.get('notes') as string || null,
  }

  const validatedData = householdMemberSchema.parse(rawData)

  const { data, error } = await supabase
    .from('household_members')
    .insert([validatedData])
    .select()
    .single()

  if (error) {
    console.error('Error creating household member:', error)
    throw new Error('Failed to create household member')
  }

  revalidatePath('/admin/homeowners')
  return data
}

export async function updateHouseholdMember(id: string, formData: FormData) {
  const supabase = await createServerClient()
  
  const rawData = {
    full_name: formData.get('full_name') as string,
    relationship: formData.get('relationship') as string || null,
    phone: formData.get('phone') as string || null,
    email: formData.get('email') as string || null,
    date_of_birth: formData.get('date_of_birth') as string || null,
    is_active: formData.get('is_active') !== 'false',
    notes: formData.get('notes') as string || null,
    updated_at: new Date().toISOString(),
  }

  const validatedData = householdMemberSchema.omit({ homeowner_id: true }).parse(rawData)

  const { data, error } = await supabase
    .from('household_members')
    .update(validatedData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating household member:', error)
    throw new Error('Failed to update household member')
  }

  revalidatePath('/admin/homeowners')
  return data
}

export async function deleteHouseholdMember(id: string) {
  const supabase = await createServerClient()
  
  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting household member:', error)
    throw new Error('Failed to delete household member')
  }

  revalidatePath('/admin/homeowners')
}

// User lookup for homeowner assignment
export async function getUsers() {
  const supabase = await createServerClient()
  
  const { data: users, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, phone')
    .eq('is_active', true)
    .order('first_name', { ascending: true })

  if (error) {
    console.error('Error fetching users:', error)
    throw new Error('Failed to fetch users')
  }

  return users || []
}
