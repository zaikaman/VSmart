import type { Metadata } from 'next';
import { DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';
import { apiDomains } from '@/app/docs/_data/content';

export const metadata: Metadata = {
  title: 'API map',
  description: 'Danh sách endpoint backend theo domain nghiệp vụ.',
};

export default function ApiPage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="API"
        title="Danh sách endpoint theo domain nghiệp vụ"
        description="Thay vì đọc rời từng file route.ts, trang này nhóm endpoint theo vùng trách nhiệm để bạn tìm nhanh hơn khi debug hoặc mở rộng feature."
      />

      <DocsSection
        title="Lưu ý khi làm việc với API"
        description="Các endpoint trong App Router đều cần tuân thủ auth, role và chuẩn lỗi nhất quán."
      >
        <div className="grid gap-2 text-sm text-[#556752]">
          <p>- Xác thực user bằng Supabase session trước khi truy cập dữ liệu riêng tư.</p>
          <p>- Ưu tiên validate payload bằng schema trước khi thao tác database.</p>
          <p>- Trả message lỗi rõ ngữ cảnh để frontend hiển thị thân thiện.</p>
          <p>- Với endpoint thay đổi dữ liệu quan trọng, cần ghi activity log nếu phù hợp.</p>
        </div>
      </DocsSection>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {apiDomains.map((domain) => (
          <article key={domain.title} className="rounded-[24px] border border-[#dfe7d8] bg-white p-4">
            <div className="mb-3 flex items-center gap-2">
              <domain.icon className={`h-4 w-4 ${domain.tone}`} />
              <h3 className="text-sm font-semibold text-[#203020]">{domain.title}</h3>
            </div>
            <div className="max-h-[260px] space-y-1.5 overflow-y-auto pr-1">
              {domain.endpoints.map((endpoint) => (
                <div key={endpoint} className="rounded-xl border border-[#e4eadf] bg-[#fbfcf8] px-3 py-1.5">
                  <DocsCode>{endpoint}</DocsCode>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
