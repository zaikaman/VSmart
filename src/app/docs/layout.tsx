import type { Metadata } from 'next';
import Link from 'next/link';
import { Bricolage_Grotesque } from 'next/font/google';
import { ArrowLeft, LogIn, NotebookText } from 'lucide-react';
import { DocsSidebar } from '@/app/docs/_components/docs-sidebar';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });

export const metadata: Metadata = {
  title: {
    default: 'Docs | VSmart',
    template: '%s | Docs VSmart',
  },
  description: 'Bộ tài liệu nội bộ của VSmart: setup, kiến trúc, API, database, AI Agent và đặc tả.',
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-screen bg-[radial-gradient(circle_at_20%_0%,#f7fced_0%,#fcfcf8_32%,#eef3ea_100%)] text-[#223021] ${bricolage.className}`}>
      <header className="sticky top-0 z-20 border-b border-[#e0e8d8] bg-white/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-4 py-3 md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#71806b]">VSmart Docs</p>
            <p className="text-sm text-[#546450]">Tài liệu nội bộ theo module</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-[#dce5d2] bg-white px-3 py-1.5 text-sm font-medium text-[#445441] transition hover:bg-[#f5f9ef]"
            >
              <ArrowLeft className="h-4 w-4" />
              Trang chủ
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full border border-[#d5e1c7] bg-[#edf6df] px-3 py-1.5 text-sm font-semibold text-[#3d5137] transition hover:bg-[#e3efcf]"
            >
              <LogIn className="h-4 w-4" />
              Vào ứng dụng
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[1440px] px-4 pb-16 pt-6 md:px-8">
        <div className="grid items-start gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="lg:sticky lg:top-24">
            <DocsSidebar />
          </aside>

          <main className="space-y-6">
            {children}
            <div className="rounded-[22px] border border-[#dce6d3] bg-white/88 px-4 py-3 text-xs text-[#687766]">
              <p className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.18em] text-[#6f7f69]">
                <NotebookText className="h-3.5 w-3.5" />
                Gợi ý đọc
              </p>
              <p className="mt-2 leading-6">Bắt đầu từ Tổng quan rồi đi theo thứ tự: Khởi động nhanh -&gt; Kiến trúc -&gt; API -&gt; Database -&gt; AI Agent.</p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
