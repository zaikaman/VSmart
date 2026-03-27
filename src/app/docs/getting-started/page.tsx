import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { DocsCode, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';
import { environmentKeys, quickStartSteps } from '@/app/docs/_data/content';

export const metadata: Metadata = {
  title: 'Khởi động nhanh',
  description: 'Hướng dẫn setup VSmart local với Supabase và OpenAI.',
};

export default function GettingStartedPage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Getting started"
        title="Setup local VSmart từ đầu"
        description="Trang này gom các bước cài đặt cốt lõi từ tài liệu setup hiện tại, theo thứ tự chạy thực tế để tránh lỗi môi trường."
      />

      <DocsSection title="4 bước chạy local" description="Chạy lần lượt theo đúng thứ tự để giảm lỗi thiếu cấu hình.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickStartSteps.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-[#dfe7d8] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#70806a]">Bước {index + 1}</p>
              <h3 className="mt-2 text-lg font-semibold text-[#213021]">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#62705e]">{step.description}</p>
              <div className="mt-4">
                <DocsCode>{step.command}</DocsCode>
              </div>
            </article>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Biến môi trường bắt buộc" description="Thiếu một trong các key này thường làm login hoặc AI bị lỗi.">
        <div className="flex flex-wrap gap-2">
          {environmentKeys.map((key) => (
            <DocsCode key={key}>{key}</DocsCode>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-[#dbe5cf] bg-[#f7fbf1] p-4 text-sm leading-7 text-[#556752]">
          <p>Gợi ý: sau khi điền env, hãy chạy build một lần để bắt lỗi cấu hình sớm.</p>
          <div className="mt-2">
            <DocsCode>npm run build</DocsCode>
          </div>
        </div>
      </DocsSection>

      <DocsSection title="Checklist xác minh" description="Đạt đủ các điểm dưới đây trước khi bắt đầu phát triển tính năng mới.">
        <div className="grid gap-2 text-sm text-[#4f624d]">
          <p>- Login bằng Google chạy được và vào onboarding/dashboard bình thường.</p>
          <p>- API /api/users/me trả dữ liệu người dùng hợp lệ.</p>
          <p>- Dashboard hiển thị dữ liệu bootstrap không lỗi.</p>
          <p>- Chat AI mở được (kể cả khi chưa bật Agent mode).</p>
          <p>- Build production thành công.</p>
        </div>
        <div className="mt-4">
          <Link
            href="/docs/architecture"
            className="inline-flex items-center gap-2 rounded-full border border-[#d5e1c7] bg-[#edf6df] px-4 py-2 text-sm font-semibold text-[#42533d] transition hover:bg-[#e4efd3]"
          >
            Sang phần kiến trúc
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </DocsSection>
    </div>
  );
}
