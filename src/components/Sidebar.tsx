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
  Sparkles,
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
    loading: () => <div className="h-10 rounded-2xl border border-[#dce5d2] bg-white/70" />,
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
        // Giữ sidebar ổn định ngay cả khi request nhẹ này lỗi
      }
    }
    fetchUser();
  }, []);

  const isManagerView = user?.vai_tro === "admin" || user?.vai_tro === "manager";

  return (
    <div
      className={cn(
        "sticky top-0 flex h-screen w-[280px] flex-col justify-between border-r border-[#e1e7d8] bg-[linear-gradient(180deg,#fdfcf7_0%,#f4f7ef_48%,#eef3ea_100%)] text-[#233022]",
        className
      )}
    >
      <div className="flex flex-col space-y-6 p-4">
        <div className="rounded-[28px] border border-[#dfe6d3] bg-white/80 p-4 shadow-[0_20px_45px_-40px_rgba(92,110,84,0.35)]">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dce6cf] bg-[#eef6df]">
                <Command className="h-5 w-5 text-[#6f9650]" />
              </div>
              <div className="ml-3">
                <div className="text-lg font-semibold tracking-tight text-[#233022]">VSmart</div>
                <div className="text-xs uppercase tracking-[0.18em] text-[#7b8775]">Workspace</div>
              </div>
            </Link>
            <NotificationBell />
          </div>

          <div className="mt-4 rounded-2xl border border-[#e6ebde] bg-[linear-gradient(135deg,#fffdf8_0%,#f6f8ef_100%)] p-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#dde6cf] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#61705f]">
              <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
              Light workspace
            </div>
            <p className="mt-3 text-sm leading-6 text-[#5e6b58]">
              Theo dõi dự án, planning và review trong cùng một nhịp vận hành sáng, gọn và dễ bám sát.
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-between rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                  isActive
                    ? "border border-[#d7e3c8] bg-[#edf6df] text-[#42533d] shadow-[0_16px_35px_-30px_rgba(97,120,85,0.45)]"
                    : "border border-transparent text-[#62705d] hover:border-[#e2e8d9] hover:bg-white/80 hover:text-[#223021]"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn("h-4 w-4", isActive ? "text-[#719254]" : "text-[#7b8775]")} />
                  <span>{item.name}</span>
                </div>
              </Link>
            );
          })}

          {isManagerView ? (
            <>
              <div className="pb-1 pt-4">
                <span className="px-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#8b9685]">Điều hành</span>
              </div>
              {adminNavItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-2xl px-3 py-3 text-sm font-medium transition-all",
                      isActive
                        ? "border border-[#d7e3c8] bg-[#edf6df] text-[#42533d] shadow-[0_16px_35px_-30px_rgba(97,120,85,0.45)]"
                        : "border border-transparent text-[#62705d] hover:border-[#e2e8d9] hover:bg-white/80 hover:text-[#223021]"
                    )}
                  >
                    <item.icon className={cn("mr-3 h-4 w-4", isActive ? "text-[#719254]" : "text-[#7b8775]")} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </>
          ) : null}

          {!user?.onboarding_completed ? (
            <Link
              href="/dashboard"
              className="mt-4 rounded-[24px] border border-[#e3e8da] bg-white/85 p-4 shadow-[0_18px_38px_-34px_rgba(96,112,88,0.32)] transition-colors hover:border-[#d4dfc6]"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#eef6df]">
                  <Activity className="h-4 w-4 text-[#719254]" />
                </div>
                <div>
                  <p className="font-medium text-[#223021]">Lộ trình bắt đầu</p>
                  <p className="mt-1 text-xs leading-5 text-[#67745f]">
                    Hoàn thiện dự án đầu tiên, tạo task mẫu và bật digest để đội vào guồng nhanh hơn.
                  </p>
                </div>
              </div>
            </Link>
          ) : null}

          <div className="pt-2">
            <ChatButton />
          </div>
        </nav>
      </div>

      <div className="border-t border-[#e1e7d8] p-4">
        <div className="flex items-center justify-between rounded-[24px] border border-[#e1e7d8] bg-white/85 p-3 shadow-[0_16px_32px_-28px_rgba(95,112,88,0.28)]">
          <div className="flex items-center space-x-3">
            <Avatar className="border border-[#dce5d2] bg-[#f7f9f2] text-[#223021]">
              <AvatarImage src={user?.extendedData?.avatarUrl} />
              <AvatarFallback>{user?.displayName?.[0] || user?.username?.[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex max-w-[150px] flex-col">
              <span className="truncate text-sm font-medium text-[#223021]">{user?.displayName || user?.username || "Đang tải..."}</span>
              <span className="truncate text-xs text-[#7b8775]">{user?.email || "..."}</span>
            </div>
          </div>
          <LogoutButton className="text-[#6f7c69] hover:text-[#42533d]" />
        </div>
      </div>
    </div>
  );
}
