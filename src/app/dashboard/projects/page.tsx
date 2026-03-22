'use client';

import { useState } from 'react';
import { FolderKanban, ListFilter, Plus, Sparkles } from 'lucide-react';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { ProjectList } from '@/components/projects/project-list';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { Button } from '@/components/ui/button';

export default function ProjectsPage() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  return (
    <DashboardPageShell
      badge={
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
          Project workspace
        </>
      }
      title="Danh mục dự án được sắp lại để nhìn nhanh hơn và chọn đúng việc hơn."
      description="Một nơi sáng, gọn và nhất quán để giữ nhịp giữa dự án mới, dự án đang chạy và những nhóm việc cần quay lại ngay."
      actions={
        <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateProjectOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Tạo dự án
        </Button>
      }
      metrics={[
        {
          label: 'Không gian dự án',
          value: 'Sáng hơn',
          note: 'Tập trung vào những gì đang chạy',
          icon: <FolderKanban className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'bg-[#eef6f0] border-[#d9eadf]',
          valueClassName: 'text-xl text-[#2f6052]',
        },
        {
          label: 'Nhịp quản lý',
          value: 'Liền mạch',
          note: 'Đi từ danh sách sang planning dễ hơn',
          icon: <ListFilter className="h-4 w-4 text-[#985c21]" />,
          surfaceClassName: 'bg-[#fff6df] border-[#eee1bb]',
          valueClassName: 'text-xl text-[#985c21]',
        },
      ]}
    >
      <DashboardSection title="Tất cả dự án" description="Danh sách dự án bên dưới vẫn giữ logic cũ, nhưng được đặt trong cùng ngôn ngữ giao diện với phần Planning.">
        <ProjectList />
      </DashboardSection>

      <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
    </DashboardPageShell>
  );
}
