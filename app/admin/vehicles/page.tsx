import { redirect } from 'next/navigation'

/** Legacy vehicles page — redirects to the unified Verifications hub. */
export default function AdminVehiclesPage() {
    redirect('/admin/verifications?tab=vehicles')
}
