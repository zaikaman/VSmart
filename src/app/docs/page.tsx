import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';
import { DocsPageIntro, DocsSection, DocsChip } from '@/app/docs/_components/docs-primitives';
import { apiDomains, databaseGroups, docsHighlights, docsNav, productModules } from '@/app/docs/_data/content';

export const metadata: Metadata = {
  title: 'Tổng quan',
  description: 'Điểm vào trung tâm cho toàn bộ tài liệu kỹ thuật và sản phẩm của VSmart.',
};

const totalEndpoints = apiDomains.reduce((acc, domain) => acc + domain.endpoints.length, 0);
const totalTables = databaseGroups.reduce((acc, group) => acc + group.tables.length, 0);

export default function DocsPage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Trung tâm tài liệu"
        title="Toàn bộ tài liệu hệ thống của VSmart trong một nơi"
        description="Mỗi mảng tài liệu đã được tách thành route con để bạn tra cứu nhanh theo nhu cầu: setup, kiến trúc, API, schema dữ liệu, AI Agent, tối ưu hiệu năng và đặc tả nghiệp vụ."
        actions={
          <>
            <Link
              href="/docs/getting-started"
              className="inline-flex items-center gap-2 rounded-full border border-[#d5e1c7] bg-[#edf6df] px-4 py-2 text-sm font-semibold text-[#42533d] transition hover:bg-[#e4efd3]"
            >
              Bắt đầu ngay
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/docs/ai-agent"
              className="inline-flex items-center gap-2 rounded-full border border-[#dce5d2] bg-white px-4 py-2 text-sm font-medium text-[#4d5c48] transition hover:bg-[#f8fbf3]"
            >
              Đi thẳng vào AI Agent
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ['Nhóm tài liệu', docsNav.length.toString(), 'Điều hướng theo mảng công việc'],
          ['API endpoint', `${totalEndpoints}+`, 'Đã gom theo domain nghiệp vụ'],
          ['Bảng dữ liệu', `${totalTables}+`, 'Bám schema Supabase hiện tại'],
        ].map(([label, value, note]) => (
          <article key={label} className="rounded-[24px] border border-[#dce6d2] bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#74836e]">{label}</p>
            <p className="mt-2 text-3xl font-bold text-[#223021]">{value}</p>
            <p className="mt-1 text-sm text-[#61705f]">{note}</p>
          </article>
        ))}
      </div>

      <DocsSection
        title="Lộ trình đọc đề xuất"
        description="Nếu là thành viên mới, bạn có thể đi theo thứ tự này để nắm hệ thống nhanh mà không bị rối."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ['Bước 1', 'Khởi động nhanh', '/docs/getting-started'],
            ['Bước 2', 'Kiến trúc hệ thống', '/docs/architecture'],
            ['Bước 3', 'API map và Database schema', '/docs/api'],
            ['Bước 4', 'AI Agent + Tối ưu hiệu năng', '/docs/ai-agent'],
            ['Bước 5', 'Đặc tả và acceptance criteria', '/docs/specification'],
          ].map(([step, title, href]) => (
            <Link
              key={step}
              href={href}
              className="rounded-2xl border border-[#e1e8d9] bg-[#fbfcf8] px-4 py-3 transition hover:border-[#cfddc2] hover:bg-[#f2f8e8]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#72826b]">{step}</p>
              <p className="mt-1 text-sm font-semibold text-[#243222]">{title}</p>
            </Link>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Mục lục nhanh" description="Mỗi thẻ dẫn tới một trang con chuyên sâu, không cần rời khỏi khu /docs.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {docsHighlights.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group rounded-[22px] border border-[#dde6d6] bg-white p-4 transition hover:border-[#cad8bc] hover:bg-[#f6faef]"
            >
              <div className="inline-flex rounded-xl border border-[#d6e2ca] bg-[#eef6df] p-2 text-[#5d7652]">
                <item.icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-base font-semibold text-[#223021]">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-[#64725f]">{item.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.15em] text-[#6b7d62]">
                Mở trang
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </DocsSection>

      <DocsSection title="Snapshot hệ thống" description="Tổng hợp nhanh phạm vi hiện tại của sản phẩm để dùng trong onboarding nội bộ.">
        <div className="space-y-3 rounded-2xl border border-[#dbe5cf] bg-[linear-gradient(135deg,#f8fbf3_0%,#f0f6e8_100%)] p-4">
          <p className="text-sm text-[#556753]">Framework: Next.js 16 + React 19 + TypeScript strict mode</p>
          <p className="text-sm text-[#556753]">Data layer: Supabase PostgreSQL + Row Level Security</p>
          <p className="text-sm text-[#556753]">State & fetching: TanStack Query + custom hooks</p>
          <p className="text-sm text-[#556753]">AI layer: OpenAI tools + agent executor + insight events</p>
          <div className="pt-1">
            <DocsChip>Cập nhật lần gần nhất: 27/03/2026</DocsChip>
          </div>
        </div>
      </DocsSection>

      <div className="rounded-[24px] border border-[#dbe5cf] bg-white/92 p-4">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#40523d]">
          <CheckCircle2 className="h-4 w-4" />
          Từ trang này trở đi, mọi nội dung docs đều nằm trong hệ thống route /docs/...
        </p>
      </div>
    </div>
  );
}