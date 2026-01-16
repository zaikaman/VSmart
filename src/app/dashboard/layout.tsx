import { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        {/* Sidebar placeholder */}
        <aside className="w-64 bg-white border-r min-h-screen p-4">
          <div className="font-bold text-xl mb-6">VSmart</div>
          <nav className="space-y-2">
            <a href="/dashboard" className="block p-2 rounded hover:bg-gray-100">
              Dashboard
            </a>
            <a
              href="/dashboard/projects"
              className="block p-2 rounded hover:bg-gray-100"
            >
              Dự Án
            </a>
            <a
              href="/dashboard/kanban"
              className="block p-2 rounded hover:bg-gray-100"
            >
              Kanban Board
            </a>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
