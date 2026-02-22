import { redirect } from 'next/navigation'

export default function AdminProfileChangesRedirectPage() {
    redirect('/admin/verifications?tab=name-changes')
}
