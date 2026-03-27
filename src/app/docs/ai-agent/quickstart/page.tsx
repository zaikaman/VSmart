import type { Metadata } from 'next';
import { DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';

export const metadata: Metadata = {
  title: 'AI Agent quickstart',
  description: 'Kịch bản test nhanh AI Agent theo checklist.',
};

const testCases = [
  {
    title: 'Test 1: Xem dự án hiện tại',
    command: 'Cho tôi xem tất cả dự án hiện tại',
    expected: 'AI trả danh sách dự án bạn có quyền xem.',
  },
  {
    title: 'Test 2: Tạo dự án mới',
    command: "Tạo dự án thử nghiệm tên AI Agent Test với deadline 15/2/2026",
    expected: 'AI gọi tool tạo dự án và phản hồi kết quả thành công.',
  },
  {
    title: 'Test 3: Tạo phần dự án',
    command: 'Trong dự án AI Agent Test, tạo phần dự án Sprint 1',
    expected: 'Phần dự án xuất hiện trong dữ liệu dự án vừa tạo.',
  },
  {
    title: 'Test 4: Tạo 3 task',
    command: 'Tạo 3 task trong Sprint 1: Setup project, Write code, Testing',
    expected: 'AI tạo đủ 3 task và phản hồi ID/chi tiết phù hợp.',
  },
  {
    title: 'Test 5: Cập nhật trạng thái task',
    command: 'Đổi trạng thái task Setup project thành in-progress',
    expected: 'Task được cập nhật trạng thái mới ngay trên board.',
  },
  {
    title: 'Test 6: Tổng hợp dự án',
    command: 'Cho tôi xem tổng quan dự án AI Agent Test',
    expected: 'AI tổng hợp tình trạng dự án, task và tiến độ.',
  },
];

export default function AiAgentQuickstartPage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Quickstart"
        title="Checklist kiểm thử AI Agent trong 10 phút"
        description="Dùng danh sách này để xác thực luồng end-to-end từ chat -> tool call -> database update -> summary response."
      />

      <DocsSection title="Chuẩn bị trước khi test" description="Đảm bảo môi trường và quyền truy cập sẵn sàng.">
        <div className="space-y-2 text-sm leading-7 text-[#556752]">
          <p>1. Chạy app local bằng npm run dev.</p>
          <p>2. Đăng nhập tài khoản có quyền trên tổ chức/dự án.</p>
          <p>3. Mở chat sidebar và bật Agent mode.</p>
        </div>
      </DocsSection>

      <DocsSection title="Kịch bản test cơ bản" description="Chạy đúng thứ tự để test đầy đủ create -> update -> report.">
        <div className="space-y-3">
          {testCases.map((test) => (
            <article key={test.title} className="rounded-2xl border border-[#dfe7d8] bg-[#fbfcf8] p-4">
              <p className="text-sm font-semibold text-[#223021]">{test.title}</p>
              <div className="mt-2">
                <DocsCode>{test.command}</DocsCode>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#62705e]">Kỳ vọng: {test.expected}</p>
            </article>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Kịch bản nâng cao" description="Dùng để kiểm tra khả năng chain nhiều hành động và xử lý lỗi.">
        <div className="space-y-2 text-sm leading-7 text-[#556752]">
          <p>- Multi-step: tạo dự án rồi tạo nhiều phần trong một lệnh.</p>
          <p>- Bulk update: cập nhật hàng loạt task theo điều kiện.</p>
          <p>- Error path: thử thao tác với project không tồn tại để kiểm tra message lỗi.</p>
          <p>- Permission path: thử thao tác ngoài quyền để xác minh guardrails.</p>
        </div>
      </DocsSection>

      <DocsSection title="Log cần theo dõi" description="Khi debug, ưu tiên kiểm tra các cụm log sau.">
        <div className="flex flex-wrap gap-2">
          <DocsCode>[Chat]</DocsCode>
          <DocsCode>[Execute Tools API]</DocsCode>
          <DocsCode>[AgentToolExecutor]</DocsCode>
        </div>
      </DocsSection>
    </div>
  );
}
