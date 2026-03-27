import type { Metadata } from 'next';
import { DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';

export const metadata: Metadata = {
  title: 'Tối ưu hiệu năng',
  description: 'Tổng hợp các tối ưu hiệu năng đã triển khai cho VSmart.',
};

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Performance"
        title="Những tối ưu hiệu năng đã áp dụng"
        description="Nội dung này tổng hợp lại các mốc tối ưu database, pagination, query cache và code-splitting đã được triển khai trong dự án."
      />

      <DocsSection title="T124 - Tối ưu database queries" description="Bổ sung index cho task, project member và notifications để giảm bottleneck query.">
        <div className="grid gap-2 text-sm text-[#556752]">
          <p>- Task indexes: assignee + status, deadline, risk_score, composite filter.</p>
          <p>- Project/member indexes: du_an_id, email + trang_thai, project status.</p>
          <p>- Notification indexes: unread lookup và timeline retrieval.</p>
          <p>- Hiệu quả ghi nhận: query tăng tốc 5-10x ở các filter phổ biến.</p>
        </div>
        <div className="mt-3">
          <DocsCode>supabase/migrations/008_add_performance_indexes.sql</DocsCode>
        </div>
      </DocsSection>

      <DocsSection title="T125 - Pagination" description="Giảm payload và memory footprint khi render danh sách lớn.">
        <div className="grid gap-2 text-sm text-[#556752]">
          <p>- UI component pagination có previous/next, numbered pages và ellipsis.</p>
          <p>- API projects/tasks/notifications đã hỗ trợ page + limit.</p>
          <p>- Response format chuẩn gồm data + metadata pagination.</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <DocsCode>src/components/ui/pagination.tsx</DocsCode>
          <DocsCode>/api/projects</DocsCode>
          <DocsCode>/api/tasks</DocsCode>
        </div>
      </DocsSection>

      <DocsSection title="T126 - React Query caching" description="Giảm API calls không cần thiết bằng staleTime và cache policy theo từng domain.">
        <div className="grid gap-2 text-sm text-[#556752]">
          <p>- Cấu hình global: staleTime 5 phút, gcTime 10 phút, retry hạn chế.</p>
          <p>- Tùy biến theo hook: tasks ngắn hơn, notifications gần realtime hơn, projects ổn định hơn.</p>
          <p>- Kết quả: giảm 60-80% API calls dư thừa và tăng tốc perceived performance.</p>
        </div>
        <div className="mt-3">
          <DocsCode>src/lib/providers/query-provider.tsx</DocsCode>
        </div>
      </DocsSection>

      <DocsSection title="T127/T128 - Code splitting" description="Lazy load AI chat và các trang nặng để giảm kích thước bundle ban đầu.">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#5c6b57]">
            Chat sidebar được load on-demand qua dynamic import, giúp giảm khoảng 80-100KB ở initial bundle.
          </article>
          <article className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4 text-sm leading-6 text-[#5c6b57]">
            Profile và Skills Matrix được tách chunk riêng, chỉ tải khi user mở đúng trang.
          </article>
        </div>
      </DocsSection>

      <DocsSection title="Kết quả tổng hợp" description="Ước tính cải thiện theo báo cáo tối ưu hiện có.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Bundle initial', 'Giảm ~180-280KB'],
            ['API calls dư thừa', 'Giảm 60-80%'],
            ['Query tốc độ', 'Nhanh hơn 5-10x'],
            ['Page load', 'Giảm khoảng 30-50%'],
          ].map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-[#dde6d6] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#72816c]">{label}</p>
              <p className="mt-2 text-lg font-semibold text-[#213021]">{value}</p>
            </article>
          ))}
        </div>
      </DocsSection>
    </div>
  );
}
