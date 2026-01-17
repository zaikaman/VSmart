
"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    List,
    ClipboardList,
    User,
    Settings,
    Command,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { LogoutButton } from "@/components/LogoutButton"
import { NotificationBell } from "@/components/notifications/notification-bell"

const navItems = [
    { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
    { name: "Dự án", href: "/dashboard/projects", icon: List },
    { name: "Bảng Kanban", href: "/dashboard/kanban", icon: ClipboardList },
    { name: "Hồ sơ", href: "/dashboard/profile", icon: User },
    { name: "Cài đặt", href: "/dashboard/settings", icon: Settings },
]

interface UserInfo {
    id: string
    username: string
    email: string
    displayName?: string
    extendedData?: {
        avatarUrl?: string
    }
}

export function Sidebar({ className }: { className?: string }) {
    const pathname = usePathname()
    const [user, setUser] = useState<UserInfo | null>(null)

    useEffect(() => {
        async function fetchUser() {
            try {
                const res = await fetch("/api/auth/me")
                if (res.ok) {
                    const data = await res.json()
                    setUser(data.user)
                }
            } catch {
                // Silently fail
            }
        }
        fetchUser()
    }, [])

    return (
        <div
            className={cn(
                "flex h-screen flex-col justify-between border-r border-[#2a2b35] bg-[#191a23] text-white w-[260px] sticky top-0",
                className
            )}
        >
            {/* Top Section */}
            <div className="flex flex-col p-4 space-y-6">
                {/* Logo và Notification */}
                <div className="flex items-center justify-between px-2">
                    <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
                        <Command className="h-8 w-8 mr-3 text-[#b9ff66]" />
                        <span className="text-xl font-bold text-white tracking-tight">VSmart</span>
                    </Link>
                    <NotificationBell />
                </div>

                {/* Nav Items */}
                <nav className="flex flex-col space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center space-x-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-[#2a2b35] text-[#b9ff66]"
                                        : "text-white/70 hover:bg-[#2a2b35]/50 hover:text-white"
                                )}
                            >
                                <item.icon className={cn("h-4 w-4", isActive ? "text-[#b9ff66]" : "text-white/70")} />
                                <span>{item.name}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>

            {/* Bottom Section: User Profile */}
            <div className="border-t border-[#2a2b35] p-4">
                <div className="group flex items-center w-full justify-between hover:bg-[#2a2b35]/50 p-2 rounded-md cursor-pointer transition-colors relative">
                    <div className="flex items-center space-x-3">
                        <Avatar className="bg-[#2a2b35] text-white">
                            <AvatarImage src={user?.extendedData?.avatarUrl} />
                            <AvatarFallback>
                                {user?.displayName?.[0] || user?.username?.[0] || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col max-w-[120px]">
                            <span className="text-sm font-medium text-white truncate">
                                {user?.displayName || user?.username || "Đang tải..."}
                            </span>
                            <span className="text-xs text-white/70 truncate">
                                {user?.email || "..."}
                            </span>
                        </div>
                    </div>
                    <LogoutButton className="text-white hover:text-[#b9ff66]" />
                </div>
            </div>
        </div>
    )
}
