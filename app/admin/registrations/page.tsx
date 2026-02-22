import { redirect } from 'next/navigation'

export default function AdminRegistrationsRedirectPage() {
    redirect('/admin/verifications?tab=registrations')
}
