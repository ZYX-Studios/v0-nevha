import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen bg-[#F2F2F7] flex items-center justify-center p-4 font-sans selection:bg-blue-100">
            {/* Background Decoration */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-50/80 to-transparent"></div>
                <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] bg-indigo-400/10 rounded-full blur-3xl"></div>
            </div>
            <ForgotPasswordForm />
        </div>
    )
}
