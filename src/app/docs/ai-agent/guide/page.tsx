import type { Metadata } from 'next';
import { DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';

export const metadata: Metadata = {
  title: 'AI Agent guide',
  description: 'Hướng dẫn sử dụng AI Agent cho end-user.',
};

export default function AiAgentGuidePage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="AI Agent user guide"
        title="Cách dùng AI Agent hiệu quả trong công việc hằng ngày"
        description="Trang này chuyển nội dung hướng dẫn sử dụng thành checklist thực hành: bật chế độ Agent, nhập lệnh đúng ngữ cảnh và kiểm chứng kết quả."
      />

      <DocsSection title="Bật chế độ Agent" description="Nếu không bật mode Agent, chat chỉ trả lời tư vấn và không thao tác dữ liệu thật.">
        <div className="space-y-2 text-sm leading-7 text-[#556752]">
          <p>1. Mở chat sidebar ở dashboard.</p>
          <p>2. Nhấn biểu tượng tia sét ở header chat.</p>
          <p>3. Thấy badge Agent là đã sẵn sàng thực thi tool-calling.</p>
        </div>
      </DocsSection>

      <DocsSection title="Mẫu lệnh thường dùng" description="Nên viết câu rõ ràng theo mẫu để AI gọi tool chính xác hơn.">
        <div className="space-y-3">
          <div className="rounded-2xl border border-[#dce5d2] bg-[#f8fbf2] p-4">
            <p className="text-sm font-semibold text-[#223021]">Quản lý dự án</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <DocsCode>Tạo dự án [tên] với deadline [ngày]</DocsCode>
              <DocsCode>Cập nhật deadline dự án [tên]</DocsCode>
              <DocsCode>Cho tôi xem các dự án active</DocsCode>
            </div>
          </div>
          <div className="rounded-2xl border border-[#dce5d2] bg-[#f8fbf2] p-4">
            <p className="text-sm font-semibold text-[#223021]">Quản lý task</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <DocsCode>Tạo task [tên] trong phần [tên phần]</DocsCode>
              <DocsCode>Đổi trạng thái task [tên] thành in-progress</DocsCode>
              <DocsCode>Tìm task priority urgent của tôi</DocsCode>
            </div>
          </div>
          <div className="rounded-2xl border border-[#dce5d2] bg-[#f8fbf2] p-4">
            <p className="text-sm font-semibold text-[#223021]">Thành viên</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <DocsCode>Mời [email] vào dự án [tên] làm admin</DocsCode>
              <DocsCode>Xem danh sách thành viên dự án [tên]</DocsCode>
              <DocsCode>Xóa [email] khỏi dự án [tên]</DocsCode>
            </div>
          </div>
        </div>
      </DocsSection>

      <DocsSection title="Lưu ý quan trọng" description="Các điểm này giúp tránh lỗi sai quyền hoặc sai ngữ cảnh.">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#e0e8d8] bg-white p-4 text-sm leading-6 text-[#5c6b57]">
            AI Agent luôn chạy theo quyền của tài khoản hiện tại. Bạn chỉ thao tác được trên dự án mà bạn có membership hợp lệ.
          </article>
          <article className="rounded-2xl border border-[#e0e8d8] bg-white p-4 text-sm leading-6 text-[#5c6b57]">
            Khi thiếu dữ liệu đầu vào như deadline hoặc project, AI sẽ hỏi lại để tránh tạo sai dữ liệu.
          </article>
          <article className="rounded-2xl border border-[#e0e8d8] bg-white p-4 text-sm leading-6 text-[#5c6b57]">
            Với lệnh xóa hoặc thay đổi lớn, nên xác minh lại kết quả trên dashboard ngay sau khi AI phản hồi.
          </article>
          <article className="rounded-2xl border border-[#e0e8d8] bg-white p-4 text-sm leading-6 text-[#5c6b57]">
            Nếu cần chỉ tư vấn mà không muốn thay đổi dữ liệu, hãy tắt Agent mode trước khi hỏi.
          </article>
        </div>
      </DocsSection>

      <DocsSection title="Troubleshooting nhanh" description="Một số lỗi thường gặp và hướng xử lý tức thời.">
        <div className="space-y-2 text-sm leading-7 text-[#556752]">
          <p>- Không chạy action: kiểm tra badge Agent đã bật chưa.</p>
          <p>- Báo không có quyền: xác minh vai trò trong tổ chức/dự án.</p>
          <p>- Không tìm thấy task/dự án: yêu cầu AI liệt kê danh sách trước để lấy tên chuẩn.</p>
        </div>
      </DocsSection>
    </div>
  );
}
