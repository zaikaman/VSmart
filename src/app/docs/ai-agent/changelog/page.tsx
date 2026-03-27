import type { Metadata } from 'next';
import { DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';

export const metadata: Metadata = {
  title: 'AI Agent changelog',
  description: 'Lịch sử thay đổi của AI Agent trong VSmart.',
};

export default function AiAgentChangelogPage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Changelog"
        title="Lịch sử thay đổi AI Agent"
        description="Bản ghi phát hành được nội địa hóa vào docs route để theo dõi tiến hóa của AI Agent mà không cần mở nguồn ngoài."
      />

      <DocsSection title="Version 1.0.0 - 20/01/2026" description="Bản phát hành đầu tiên đưa Agent mode vào luồng chat.">
        <div className="space-y-3 text-sm leading-7 text-[#556752]">
          <p>
            <strong>Added:</strong> Agent mode, function calling integration, 13 tools cho project/task/member workflows.
          </p>
          <p>
            <strong>Changed:</strong> mở rộng chat route để hỗ trợ tool messages và execute-tools flow.
          </p>
          <p>
            <strong>Security:</strong> thêm guard quyền theo user context + Supabase RLS + validation đầu vào.
          </p>
          <p>
            <strong>Known issues:</strong> chưa có rate limiting, chưa có audit logs, một số lỗi chưa thân thiện.
          </p>
        </div>
      </DocsSection>

      <DocsSection title="Danh sách tools v1.0.0" description="Các tool được ship cùng bản phát hành đầu tiên.">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {[
            'tao_du_an',
            'moi_thanh_vien_du_an',
            'tao_phan_du_an',
            'tao_task',
            'cap_nhat_task',
            'xoa_task',
            'lay_danh_sach_thanh_vien',
            'lay_danh_sach_du_an',
            'lay_danh_sach_phan_du_an',
            'lay_chi_tiet_task',
            'cap_nhat_du_an',
            'xoa_thanh_vien_du_an',
            'tim_kiem_tasks',
          ].map((tool) => (
            <DocsCode key={tool}>{tool}</DocsCode>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Roadmap sau 1.0.0" description="Các hạng mục được ghi trong changelog gốc.">
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Ngắn hạn</p>
            <p className="mt-2 text-sm text-[#64715f]">Rate limiting, message lỗi dễ hiểu, confirmation flow, undo.</p>
          </article>
          <article className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Trung hạn</p>
            <p className="mt-2 text-sm text-[#64715f]">Audit logs, bulk operations, custom workflow, tăng test coverage.</p>
          </article>
          <article className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Dài hạn</p>
            <p className="mt-2 text-sm text-[#64715f]">Proactive suggestions, học hành vi user, no-code tool creation.</p>
          </article>
        </div>
      </DocsSection>
    </div>
  );
}
