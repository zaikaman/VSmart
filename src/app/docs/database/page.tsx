import type { Metadata } from 'next';
import { DocsChip, DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';
import { databaseGroups } from '@/app/docs/_data/content';

export const metadata: Metadata = {
  title: 'Database schema',
  description: 'Nhóm bảng dữ liệu hiện tại từ schema Supabase.',
};

export default function DatabasePage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Database"
        title="Schema dữ liệu đang chạy trên Supabase"
        description="Danh sách bảng được nhóm theo domain để bạn hình dung nhanh ranh giới dữ liệu thay vì đọc toàn bộ SQL migration một lần."
      />

      <DocsSection
        title="Nguyên tắc dữ liệu"
        description="Những quy ước này đang chi phối phần lớn thao tác của app và AI Agent."
      >
        <div className="grid gap-2 text-sm text-[#556752]">
          <p>- Dữ liệu lõi đi qua Supabase với RLS để chặn truy cập chéo tổ chức/dự án.</p>
          <p>- Nhiều thực thể dùng soft delete để giữ lịch sử phục vụ phân tích.</p>
          <p>- Task workflow dùng thêm bảng checklist, attachments và lịch sử thay đổi.</p>
          <p>- Insight AI được lưu riêng để theo dõi hiệu quả gợi ý và phản hồi.</p>
        </div>
      </DocsSection>

      <div className="grid gap-4 lg:grid-cols-2">
        {databaseGroups.map((group) => (
          <article key={group.title} className="rounded-[24px] border border-[#dfe7d8] bg-white p-5">
            <h3 className="text-lg font-semibold text-[#203020]">{group.title}</h3>
            <p className="mt-2 text-sm leading-6 text-[#64715f]">{group.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {group.tables.map((table) => (
                <DocsChip key={table}>{table}</DocsChip>
              ))}
            </div>
          </article>
        ))}
      </div>

      <DocsSection title="Nguồn schema chuẩn" description="Khi cần đối chiếu chính xác cột, index hoặc constraint, ưu tiên đọc từ schema SQL hiện tại.">
        <div className="flex flex-wrap gap-2">
          <DocsCode>supabase/current_schema.sql</DocsCode>
          <DocsCode>supabase/migrations/*.sql</DocsCode>
        </div>
      </DocsSection>
    </div>
  );
}
