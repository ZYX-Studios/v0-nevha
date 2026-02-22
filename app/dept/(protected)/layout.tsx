import { redirect } from "next/navigation"
import { cookies } from "next/headers"

export default async function DeptLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const cookieStore = await cookies()
    const deptSession = cookieStore.get("dept_session")

    if (!deptSession) {
        redirect("/dept/login")
    }

    return <>{children}</>
}
