"use client"

import { LogOut } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export function LogoutButton({ className }: { className?: string }) {
    const handleLogout = async () => {
        try {
            const response = await fetch("/api/auth/logout", {
                method: "POST",
                cache: "no-store",
            })

            if (!response.ok) {
                throw new Error("Logout request failed")
            }

            window.location.replace("/login")
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
