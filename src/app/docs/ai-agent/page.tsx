import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Wrench } from 'lucide-react';
import { DocsChip, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';
import { aiAgentTools } from '@/app/docs/_data/content';

export const metadata: Metadata = {
  title: 'AI Agent',
  description: 'Tổng quan đầy đủ về khả năng hành động của AI Agent trong VSmart.',
};

export default function AiAgentPage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="AI Agent"
        title="Trợ lý AI có thể hành động thật trong hệ thống"
        description="AI Agent không chỉ tư vấn mà còn có thể tạo/cập nhật dữ liệu qua tool-calling với lớp phân quyền đầy đủ theo user hiện tại."
      />

      <DocsSection
        title="Năng lực chính"
        description="Khi bật Agent mode, chat sidebar có thể gọi tool để thao tác trực tiếp trên dự án, thành viên và task."
      >
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Quản lý dự án và phần dự án</p>
            <p className="mt-2 text-sm leading-6 text-[#63715f]">Tạo dự án, cập nhật trạng thái, tạo phần dự án, truy vấn danh sách theo ngữ cảnh.</p>
          </article>
          <article className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Task workflow tự động</p>
            <p className="mt-2 text-sm leading-6 text-[#63715f]">Tạo task, cập nhật tiến độ/trạng thái, tìm kiếm, soft delete và xử lý nhiều bước liên tiếp.</p>
          </article>
          <article className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Thành viên và cộng tác</p>
            <p className="mt-2 text-sm leading-6 text-[#63715f]">Mời thành viên, xem danh sách, xóa thành viên khỏi dự án theo quyền cho phép.</p>
          </article>
          <article className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Context-aware automation</p>
            <p className="mt-2 text-sm leading-6 text-[#63715f]">Ghi nhớ ngữ cảnh hội thoại để điền thông tin thiếu và chạy chuỗi tác vụ nhanh hơn.</p>
          </article>
        </div>
      </DocsSection>

      <DocsSection title="Danh sách tools hiện có" description="Bộ tool đang khai báo trong lớp agent-tools và được thực thi qua AgentToolExecutor.">
        <div className="flex flex-wrap gap-2">
          {aiAgentTools.map((tool) => (
            <DocsChip key={tool}>{tool}</DocsChip>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="An toàn và kiểm soát" description="Mọi hành động đều bị ràng buộc bởi session và quyền thực của người dùng.">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#dce7d3] bg-white p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#243223]">
              <ShieldCheck className="h-4 w-4 text-[#4f7c55]" />
              Security guardrails
            </p>
            <p className="mt-2 text-sm leading-6 text-[#62705e]">
              Kiểm tra auth + authorization trước khi chạy tool; tận dụng thêm lớp Supabase RLS để ngăn truy cập sai phạm vi.
            </p>
          </article>
          <article className="rounded-2xl border border-[#dce7d3] bg-white p-4">
            <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#243223]">
              <Wrench className="h-4 w-4 text-[#4f7c55]" />
              Observability
            </p>
            <p className="mt-2 text-sm leading-6 text-[#62705e]">
              Có log cho tool execution và API flow; roadmap bổ sung metrics đầy đủ và audit logs cho production.
            </p>
          </article>
        </div>
      </DocsSection>

      <DocsSection title="Đi sâu theo nhu cầu" description="Chọn đúng trang con để xem chi tiết theo vai trò người dùng hoặc developer.">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {[
            ['Hướng dẫn sử dụng', '/docs/ai-agent/guide'],
            ['Quickstart kiểm thử', '/docs/ai-agent/quickstart'],
            ['Tài liệu kỹ thuật', '/docs/ai-agent/technical'],
            ['Changelog', '/docs/ai-agent/changelog'],
          ].map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="group rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] px-4 py-3 text-sm font-semibold text-[#2a3a28] transition hover:border-[#cbd9be] hover:bg-[#f2f8e8]"
            >
              <span className="inline-flex items-center gap-2">
                {label}
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </DocsSection>
    </div>
  );
}
