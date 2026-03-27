import type { Metadata } from 'next';
import { DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';

export const metadata: Metadata = {
  title: 'Feature specification',
  description: 'Đặc tả user stories, requirements và success criteria của VSmart.',
};

const userStories = [
  {
    title: 'P1 - Tạo dự án và phân công cơ bản',
    summary: 'Tạo project -> phần dự án -> task, hiển thị board/list và cập nhật trạng thái realtime.',
  },
  {
    title: 'P2 - Gợi ý phân công bằng AI',
    summary: 'AI gợi ý top 3 assignee dựa trên skills, completion rate và availability.',
  },
  {
    title: 'P3 - Dự báo rủi ro trễ hạn',
    summary: 'Tính risk score, đánh dấu cảnh báo màu và gửi notification proactive.',
  },
  {
    title: 'P4 - Chat với AI assistant',
    summary: 'Hỏi đáp theo ngữ cảnh dự án/task và hỗ trợ hành động đề xuất.',
  },
  {
    title: 'P5 - Quản lý kỹ năng người dùng',
    summary: 'Cập nhật skill profile và xem skills matrix của toàn đội.',
  },
];

export default function SpecificationPage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Specification"
        title="Đặc tả sản phẩm và tiêu chí thành công"
        description="Trang này tóm lược file spec gốc thành các phần trọng tâm để team product, dev và QA dùng chung khi triển khai."
      />

      <DocsSection title="5 user stories theo mức ưu tiên" description="Ưu tiên từ nền tảng vận hành tới lớp AI nâng cao.">
        <div className="space-y-3">
          {userStories.map((story) => (
            <article key={story.title} className="rounded-2xl border border-[#dde6d6] bg-[#fbfcf8] p-4">
              <p className="text-sm font-semibold text-[#223021]">{story.title}</p>
              <p className="mt-2 text-sm leading-6 text-[#64715f]">{story.summary}</p>
            </article>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Functional requirements nổi bật" description="Bộ FR đầy đủ nằm trong spec gốc, dưới đây là nhóm thường được dùng khi review implementation.">
        <div className="grid gap-2 text-sm text-[#556752]">
          <p>- FR-001 đến FR-007: CRUD dự án/phần/task + board/list + drag-drop + realtime sync + filters.</p>
          <p>- FR-008 đến FR-014: AI suggest assignee, risk score, alerts, chat assistant data-aware.</p>
          <p>- FR-015 đến FR-020: skills profile, skills matrix, progress aggregation, stale detection, overload warning, soft delete.</p>
        </div>
      </DocsSection>

      <DocsSection title="Yêu cầu UX và hiệu năng" description="Các ngưỡng quan trọng để QA và release bám theo.">
        <div className="grid gap-3 md:grid-cols-2">
          <article className="rounded-2xl border border-[#dde6d6] bg-white p-4 text-sm leading-6 text-[#5c6b57]">
            UX: thiết kế nhất quán risk color, feedback thao tác nhanh, keyboard accessibility, responsive đa thiết bị.
          </article>
          <article className="rounded-2xl border border-[#dde6d6] bg-white p-4 text-sm leading-6 text-[#5c6b57]">
            PERF: API p95 dưới 200ms, AI suggest dưới 1s, LCP dưới 2.5s, bundle initial dưới 200KB gzipped (mục tiêu).
          </article>
        </div>
      </DocsSection>

      <DocsSection title="Success criteria" description="Các chỉ số outcome để đánh giá feature có tạo giá trị thực hay không.">
        <div className="space-y-2 text-sm leading-7 text-[#556752]">
          <p>- Hoàn thành luồng tạo project + phân công 5 task dưới 5 phút.</p>
          <p>- Tỷ lệ chấp nhận gợi ý AI lớn hơn 80%.</p>
          <p>- Dự báo high-risk đúng trên 75% trường hợp trễ thật.</p>
          <p>- Realtime update phản ánh dưới 2 giây trên client khác.</p>
          <p>- Tỷ lệ onboarding thành công lần đầu đạt 90%.</p>
        </div>
      </DocsSection>

      <DocsSection title="Nguồn đặc tả đầy đủ" description="Khi cần toàn văn scenario/assumption/scope boundary, mở file spec chuẩn.">
        <DocsCode>specs/1-smart-task-management/spec.md</DocsCode>
      </DocsSection>
    </div>
  );
}
