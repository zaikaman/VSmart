"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Activity,
  Award,
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  Command,
  LayoutDashboard,
  List,
  Settings,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/notifications/notification-bell";

const ChatButton = dynamic(
  () => import("@/components/chat/chat-button").then((mod) => ({ default: mod.ChatButton })),
  {
    ssr: false,
    loading: () => <div className="h-10 rounded-md bg-[#2a2b35]/40" />,
  }
);

const navItems = [
  { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { name: "Dự án", href: "/dashboard/projects", icon: List },
  { name: "Bảng Kanban", href: "/dashboard/kanban", icon: ClipboardList },
  { name: "Planning", href: "/dashboard/planning", icon: CalendarRange },
  { name: "Hồ sơ", href: "/dashboard/profile", icon: User },
  { name: "Cài đặt", href: "/dashboard/settings", icon: Settings },
];

const adminNavItems = [
  { name: "Hàng chờ duyệt", href: "/dashboard/reviews", icon: ClipboardCheck },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Ma trận kỹ năng", href: "/dashboard/admin/skills-matrix", icon: Award },
];

interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName?: string;
  vai_tro?: string;
  onboarding_completed?: boolean;
  extendedData?: {
    avatarUrl?: string;
  };
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          setUser({
            id: data.id,
            username: data.email?.split("@")[0] || "User",
            email: data.email,
            displayName: data.ten,
            vai_tro: data.vai_tro,
            onboarding_completed: data.onboarding_completed,
            extendedData: {
              avatarUrl: data.avatar_url,
            },
          });
        }
      } catch {
        // Bỏ qua lỗi hiển thị nhẹ trong sidebar
      }
    }
    fetchUser();
  }, []);

  const isManagerView = user?.vai_tro === "admin" || user?.vai_tro === "manager";

  return (
    <div
      className={cn(
        "sticky top-0 flex h-screen w-[260px] flex-col justify-between border-r border-[#2a2b35] bg-[#191a23] text-white",
        className
      )}
    >
      <div className="flex flex-col space-y-6 p-4">
        <div className="flex items-center justify-between px-2">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <Command className="mr-3 h-8 w-8 text-[#b9ff66]" />
            <span className="text-xl font-bold tracking-tight text-white">VSmart</span>
          </Link>
          <NotificationBell />
        </div>

        <nav className="flex flex-col space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
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
            );
          })}

          {isManagerView ? (
            <>
              <div className="pb-1 pt-3">
                <span className="px-3 text-xs font-medium uppercase tracking-wider text-white/40">
                  Quản trị
                </span>
              </div>
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href;
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
                );
              })}
            </>
          ) : null}

          {!user?.onboarding_completed ? (
            <Link
              href="/dashboard"
              className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-white/80 transition-colors hover:border-[#b9ff66]/40 hover:text-white"
            >
              <div className="flex items-start gap-3">
                <Activity className="mt-0.5 h-4 w-4 text-[#b9ff66]" />
                <div>
                  <p className="font-medium text-white">Lộ trình bắt đầu</p>
                  <p className="mt-1 text-xs text-white/60">
                    Hoàn thiện dự án đầu tiên, tạo task mẫu và bật digest để đội chạy mượt hơn.
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          <ChatButton />
        </nav>
      </div>

      <div className="border-t border-[#2a2b35] p-4">
        <div className="group relative flex w-full cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-[#2a2b35]/50">
          <div className="flex items-center space-x-3">
            <Avatar className="bg-[#2a2b35] text-white">
              <AvatarImage src={user?.extendedData?.avatarUrl} />
              <AvatarFallback>
                {user?.displayName?.[0] || user?.username?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex max-w-[120px] flex-col">
              <span className="truncate text-sm font-medium text-white">
                {user?.displayName || user?.username || "Đang tải..."}
              </span>
              <span className="truncate text-xs text-white/70">{user?.email || "..."}</span>
            </div>
          </div>
          <LogoutButton className="text-white hover:text-[#b9ff66]" />
        </div>
      </div>
    </div>
  );
}
