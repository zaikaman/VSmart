"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import { LogoutButton } from "@/components/LogoutButton";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { isLeadershipRole } from "@/lib/auth/permissions";
import { useCurrentUser } from "@/lib/hooks/use-current-user";
import { cn } from "@/lib/utils";

const ChatButton = dynamic(
  () => import("@/components/chat/chat-button").then((mod) => ({ default: mod.ChatButton })),
  {
    ssr: false,
    loading: () => <div className="h-10 rounded-2xl border border-[#dce5d2] bg-white/70" />,
  }
);

type IconType = typeof LayoutDashboard;

interface NavItem {
  name: string;
  href: string;
  icon: IconType;
  isChatTrigger?: boolean;
}

const mainNavGroups: Array<{ title: string; items: NavItem[] }> = [
  {
    title: "Không gian làm việc",
    items: [
      { name: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
      { name: "Dự án", href: "/dashboard/projects", icon: List },
      { name: "Bảng Kanban", href: "/dashboard/kanban", icon: ClipboardList },
      { name: "Planning", href: "/dashboard/planning", icon: CalendarRange },
    ],
  },
  {
    title: "Tài khoản",
    items: [
      { name: "Hồ sơ", href: "/dashboard/profile", icon: User },
      { name: "Cài đặt", href: "/dashboard/settings", icon: Settings },
    ],
  },
  {
    title: "Trợ lý",
    items: [{ name: "Chat AI", href: "/dashboard/chat-ai", icon: Command, isChatTrigger: true }],
  },
];

const adminNavItems: NavItem[] = [
  { name: "Hàng chờ duyệt", href: "/dashboard/reviews", icon: ClipboardCheck },
  { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { name: "Ma trận kỹ năng", href: "/dashboard/admin/skills-matrix", icon: Award },
];

function SidebarSectionLabel({ children }: { children: string }) {
  return (
    <div className="px-3 pb-2 pt-1">
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8f9a88]">{children}</span>
    </div>
  );
}

function SidebarNavLink({ item, isActive }: { item: NavItem; isActive: boolean }) {
  if (item.isChatTrigger) {
    return <ChatButton />;
  }

  return (
    <Link
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
}

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();
  const username = user?.email?.split("@")[0] || "User";
  const displayName = user?.ten || username;
  const isManagerView = isLeadershipRole(user?.vai_tro);

  return (
    <div
      className={cn(
        "sticky top-0 flex h-screen w-[280px] flex-col justify-between border-r border-[#e1e7d8] bg-[linear-gradient(180deg,#fdfcf7_0%,#f4f7ef_48%,#eef3ea_100%)] text-[#233022]",
        className
      )}
    >
      <div className="flex flex-col gap-6 p-4">
        <div className="flex items-center justify-between px-1">
          <Link href="/" className="flex items-center transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#dce6cf] bg-[#eef6df]">
              <Command className="h-5 w-5 text-[#6f9650]" />
            </div>
            <div className="ml-3 text-lg font-semibold tracking-tight text-[#233022]">VSmart</div>
          </Link>
          <NotificationBell />
        </div>

        <nav className="flex flex-col gap-5">
          {mainNavGroups.map((group) => (
            <section key={group.title} className="space-y-1">
              <SidebarSectionLabel>{group.title}</SidebarSectionLabel>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.href;
                  return <SidebarNavLink key={item.href} item={item} isActive={isActive} />;
                })}
              </div>
            </section>
          ))}

          {isManagerView ? (
            <section className="space-y-1 border-t border-[#e2e8d9] pt-4">
              <SidebarSectionLabel>Điều hành</SidebarSectionLabel>
              <div className="space-y-1">
                {adminNavItems.map((item) => {
                  const isActive = pathname === item.href;
                  return <SidebarNavLink key={item.href} item={item} isActive={isActive} />;
                })}
              </div>
            </section>
          ) : null}
        </nav>
      </div>

      <div className="border-t border-[#e1e7d8] p-4">
        <div className="flex items-center justify-between rounded-[24px] border border-[#e1e7d8] bg-white/85 p-3 shadow-[0_16px_32px_-28px_rgba(95,112,88,0.28)]">
          <div className="flex items-center space-x-3">
            <Avatar className="border border-[#dce5d2] bg-[#f7f9f2] text-[#223021]">
              <AvatarImage src={user?.avatar_url || undefined} />
              <AvatarFallback>{displayName[0] || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex max-w-[150px] flex-col">
              <span className="truncate text-sm font-medium text-[#223021]">{displayName || "Đang tải..."}</span>
              <span className="truncate text-xs text-[#7b8775]">{user?.email || "..."}</span>
            </div>
          </div>
          <LogoutButton className="text-[#6f7c69] hover:text-[#42533d]" />
        </div>
      </div>
    </div>
  );
}
