"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"

export function LogoutButton({ className }: { className?: string }) {
    const router = useRouter()

    const handleLogout = async () => {
        try {
            const { error } = await supabase.auth.signOut()

            if (error) {
                throw error
            }

            toast.success("Đăng xuất thành công")
            router.replace("/login")
            router.refresh()
        } catch (error) {
            console.error("Logout failed:", error)
            toast.error("Đăng xuất thất bại")
        }
    }

    return (
        <LogOut
            className={cn(
                "h-4 w-4 cursor-pointer text-muted-foreground transition-colors hover:text-destructive",
                className
            )}
            onClick={handleLogout}
        />
    )
}
