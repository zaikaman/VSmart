import type { Metadata } from 'next';
import { DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';

export const metadata: Metadata = {
  title: 'Kiến trúc hệ thống',
  description: 'Luồng kiến trúc tổng thể của VSmart từ giao diện tới database và AI tools.',
};

export default function ArchitecturePage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Architecture"
        title="Cách VSmart vận hành end-to-end"
        description="Kiến trúc hiện tại dùng Next.js App Router, Supabase RLS và lớp OpenAI tools để kết nối giữa UI, API, service và dữ liệu."
      />

      <DocsSection title="Luồng request chuẩn" description="Mọi tính năng dashboard đều đi theo xương sống này.">
        <div className="space-y-3">
          {[
            ['UI layer', 'Pages trong app/dashboard gọi hooks TanStack Query.'],
            ['API layer', 'Route handlers trong app/api validate input, phân quyền và xử lý lỗi.'],
            ['Service layer', 'Các module lib/* xử lý planning, analytics, AI, task workflow.'],
            ['Data layer', 'Supabase PostgreSQL là nguồn dữ liệu chính với RLS policy.'],
          ].map(([title, text], index) => (
            <div key={title} className="grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-[#e2e8dc] bg-[#fbfcf8] p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d6e2c9] bg-[#eef6df] text-xs font-semibold text-[#5f7652]">
                {index + 1}
              </div>
              <div>
                <p className="text-sm font-semibold text-[#263424]">{title}</p>
                <p className="mt-1 text-sm text-[#62705e]">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Realtime và state" description="VSmart kết hợp query cache và realtime updates để dữ liệu luôn tươi.">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#dfe7d8] bg-white p-4">
            <p className="text-sm font-semibold text-[#233122]">TanStack Query</p>
            <p className="mt-2 text-sm leading-6 text-[#63725f]">
              Quản lý cache theo key, giảm API call lặp và đồng bộ dữ liệu giữa các trang dashboard.
            </p>
          </article>
          <article className="rounded-2xl border border-[#dfe7d8] bg-white p-4">
            <p className="text-sm font-semibold text-[#233122]">Socket + notifications</p>
            <p className="mt-2 text-sm leading-6 text-[#63725f]">
              Broadcast thay đổi quan trọng như task status, review events, alert rủi ro và trạng thái online.
            </p>
          </article>
        </div>
      </DocsSection>

      <DocsSection title="AI Agent execution flow" description="Luồng thực thi hành động thực khi bật Agent mode trong chat.">
        <div className="space-y-2 rounded-2xl border border-[#dbe5cf] bg-[linear-gradient(140deg,#f7fbf1_0%,#eef6e6_100%)] p-4 text-sm text-[#546652]">
          <p>1. User gửi message qua chat sidebar.</p>
          <p>2. API /api/ai/chat stream kết quả từ OpenAI.</p>
          <p>3. Nếu có tool_calls, frontend gọi /api/ai/execute-tools.</p>
          <p>4. AgentToolExecutor kiểm quyền theo user context rồi thao tác database.</p>
          <p>5. Tool result trả về OpenAI để tổng hợp câu trả lời cuối.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <DocsCode>/api/ai/chat</DocsCode>
          <DocsCode>/api/ai/execute-tools</DocsCode>
          <DocsCode>src/lib/openai/agent-executor.ts</DocsCode>
        </div>
      </DocsSection>
    </div>
  );
}
