import type { Metadata } from 'next';
import { DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';
import { aiAgentTools } from '@/app/docs/_data/content';

export const metadata: Metadata = {
  title: 'AI Agent technical',
  description: 'Tài liệu kỹ thuật về kiến trúc và vận hành AI Agent.',
};

export default function AiAgentTechnicalPage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Technical"
        title="Kiến trúc kỹ thuật của AI Agent"
        description="Agent được xây trên OpenAI function-calling và lớp executor nội bộ để chuyển ý định hội thoại thành hành động dữ liệu có kiểm soát."
      />

      <DocsSection title="Các thành phần chính" description="Những file lõi điều khiển hành vi của AI Agent.">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#dfe7d8] bg-white p-4">
            <p className="text-sm font-semibold text-[#223021]">Tool definitions</p>
            <p className="mt-2 text-sm text-[#62705e]">Khai báo schema tool cho OpenAI function-calling.</p>
            <div className="mt-3">
              <DocsCode>src/lib/openai/agent-tools.ts</DocsCode>
            </div>
          </article>
          <article className="rounded-2xl border border-[#dfe7d8] bg-white p-4">
            <p className="text-sm font-semibold text-[#223021]">Tool executor</p>
            <p className="mt-2 text-sm text-[#62705e]">Thực thi tool theo user context, check quyền và xử lý CRUD.</p>
            <div className="mt-3">
              <DocsCode>src/lib/openai/agent-executor.ts</DocsCode>
            </div>
          </article>
          <article className="rounded-2xl border border-[#dfe7d8] bg-white p-4">
            <p className="text-sm font-semibold text-[#223021]">Chat route</p>
            <p className="mt-2 text-sm text-[#62705e]">Streaming response, phát hiện tool_calls và tổng hợp phản hồi cuối.</p>
            <div className="mt-3">
              <DocsCode>src/app/api/ai/chat/route.ts</DocsCode>
            </div>
          </article>
          <article className="rounded-2xl border border-[#dfe7d8] bg-white p-4">
            <p className="text-sm font-semibold text-[#223021]">Execute tools route</p>
            <p className="mt-2 text-sm text-[#62705e]">Nhận tool_calls từ frontend để thực thi tập trung và trả kết quả chuẩn hóa.</p>
            <div className="mt-3">
              <DocsCode>src/app/api/ai/execute-tools/route.ts</DocsCode>
            </div>
          </article>
        </div>
      </DocsSection>

      <DocsSection title="Function-calling flow" description="Chuỗi xử lý được giữ ngắn để dễ theo dõi và debug.">
        <div className="space-y-2 rounded-2xl border border-[#dce6d3] bg-[linear-gradient(140deg,#f7fbf1_0%,#eef6e6_100%)] p-4 text-sm text-[#556752]">
          <p>1. Frontend gửi message với enableAgent=true.</p>
          <p>2. OpenAI có thể trả type tool_calls thay vì text.</p>
          <p>3. Frontend gọi execute-tools với danh sách call và arguments.</p>
          <p>4. Executor chạy theo quyền hiện tại và trả tool results.</p>
          <p>5. Frontend gửi lại chuỗi message + tool result để AI tổng hợp câu trả lời cuối.</p>
        </div>
      </DocsSection>

      <DocsSection title="Bảo mật và kiểm soát" description="Các lớp bảo vệ chính của AI Agent.">
        <div className="grid gap-2 text-sm text-[#556752]">
          <p>- Authentication: bắt buộc có session Supabase hợp lệ ở API route.</p>
          <p>- Authorization: kiểm vai trò/membership trước khi cho chạy từng tool.</p>
          <p>- Input validation: parse arguments an toàn và validate schema rõ ràng.</p>
          <p>- RLS: Supabase policy là lớp bảo vệ cuối cùng ở tầng dữ liệu.</p>
        </div>
      </DocsSection>

      <DocsSection title="Danh sách tools hiện hành" description="Đây là bộ công cụ đang có trong phiên bản hiện tại.">
        <div className="flex flex-wrap gap-2">
          {aiAgentTools.map((tool) => (
            <DocsCode key={tool}>{tool}</DocsCode>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Checklist khi thêm tool mới" description="Tuân theo đúng thứ tự để tránh lệch schema và runtime errors.">
        <div className="grid gap-2 text-sm text-[#556752]">
          <p>- Bước 1: Khai báo tool trong agent-tools với description và parameters rõ ràng.</p>
          <p>- Bước 2: Implement case tương ứng trong AgentToolExecutor và kiểm quyền.</p>
          <p>- Bước 3: Trả về structure kết quả nhất quán success/error để chat dễ tổng hợp.</p>
          <p>- Bước 4: Cập nhật docs route liên quan để team dùng được ngay.</p>
        </div>
      </DocsSection>
    </div>
  );
}
