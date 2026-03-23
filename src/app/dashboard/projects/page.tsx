'use client';

import { useState } from 'react';
import { Building2, FolderKanban, ListFilter, Plus, Sparkles } from 'lucide-react';
import { CreateOrganizationModal } from '@/components/organizations/create-organization-modal';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { ProjectList } from '@/components/projects/project-list';
import { DashboardPageShell, DashboardSection } from '@/components/dashboard/page-shell';
import { Button } from '@/components/ui/button';
import { useOrganization } from '@/lib/hooks/use-organizations';

export default function ProjectsPage() {
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [createOrganizationOpen, setCreateOrganizationOpen] = useState(false);
  const { data: organization } = useOrganization();

  return (
    <DashboardPageShell
      badge={
        <>
          <Sparkles className="h-3.5 w-3.5 text-[#87ac63]" />
          Dự án
        </>
      }
      title="Dự án"
      description={
        organization
          ? 'Xem toàn bộ dự án và mở nhanh phần đang cần làm.'
          : 'Tạo tổ chức trước để bắt đầu dự án và mời team vào làm việc.'
      }
      actions={
        <Button
          className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]"
          onClick={() => (organization ? setCreateProjectOpen(true) : setCreateOrganizationOpen(true))}
        >
          {organization ? (
            <>
              <Plus className="mr-2 h-4 w-4" />
              Tạo dự án
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              Tạo tổ chức
            </>
          )}
        </Button>
      }
      metrics={[
        {
          label: 'Không gian dự án',
          value: organization ? 'Sáng hơn' : 'Đang chờ',
          note: organization ? 'Tập trung vào những gì đang chạy' : 'Cần một workspace trước khi mở dự án',
          icon: <FolderKanban className="h-4 w-4 text-[#2f6052]" />,
          surfaceClassName: 'bg-[#eef6f0] border-[#d9eadf]',
          valueClassName: 'text-xl text-[#2f6052]',
        },
        {
          label: 'Nhịp quản lý',
          value: organization ? 'Liền mạch' : 'Tách tầng quyền',
          note: organization ? 'Đi từ danh sách sang planning dễ hơn' : 'Role tổ chức và role dự án được tách riêng',
          icon: <ListFilter className="h-4 w-4 text-[#985c21]" />,
          surfaceClassName: 'bg-[#fff6df] border-[#eee1bb]',
          valueClassName: 'text-xl text-[#985c21]',
        },
      ]}
    >
      {organization ? (
        <DashboardSection title="Tất cả dự án" description="Danh sách dự án hiện có của bạn.">
          <ProjectList />
        </DashboardSection>
      ) : (
        <DashboardSection title="Tạo tổ chức trước khi bắt đầu dự án" description="Khi có tổ chức, bạn có thể mở dự án cho team ở đúng một nơi chung.">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-[#dfe8d8] bg-[linear-gradient(135deg,#f8fbf4_0%,#f2f8ef_100%)] p-5">
              <h3 className="text-xl font-semibold text-[#223021]">Chỉ cần tạo một tổ chức là bạn có thể bắt đầu dự án cho cả team.</h3>
              <p className="mt-3 text-sm leading-7 text-[#5d6b58]">
                Sau đó bạn có thể tạo dự án, mời thành viên và sắp xếp công việc ngay trong cùng một không gian làm việc.
              </p>
              <div className="mt-5">
                <Button className="border border-[#d5e1c7] bg-[#edf6df] text-[#42533d] hover:bg-[#e4efd3]" onClick={() => setCreateOrganizationOpen(true)}>
                  <Building2 className="mr-2 h-4 w-4" />
                  Tạo tổ chức
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {[
                ['Tạo tổ chức', 'Thiết lập nơi làm việc chung cho cả team.'],
                ['Tạo dự án', 'Mở dự án đầu tiên và bắt đầu chia việc.'],
                ['Mời thành viên', 'Thêm đúng người vào đúng dự án khi cần.'],
              ].map(([title, description]) => (
                <div key={title} className="rounded-[24px] border border-[#e6ebde] bg-[#fbfcf8] p-4">
                  <p className="font-medium text-[#223021]">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-[#65725f]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </DashboardSection>
      )}

      <CreateProjectModal open={createProjectOpen} onOpenChange={setCreateProjectOpen} />
      <CreateOrganizationModal open={createOrganizationOpen} onOpenChange={setCreateOrganizationOpen} />
    </DashboardPageShell>
  );
}
