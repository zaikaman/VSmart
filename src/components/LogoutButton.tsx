
"use client"

import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export function LogoutButton({ className }: { className?: string }) {
    const router = useRouter()

    const handleLogout = async () => {
        try {
            await fetch("/api/auth/logout", { method: "POST" })
            toast.success("Đăng xuất thành công")
            router.push("/login")
        } catch {
            toast.error("Đăng xuất thất bại")
        }
    }

    return (
        <LogOut
            className={cn(
                "h-4 w-4 text-muted-foreground hover:text-destructive transition-colors cursor-pointer",
                className
            )}
            onClick={handleLogout}
        />
    )
}
