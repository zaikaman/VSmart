import type { Metadata } from 'next';
import { DocsChip, DocsPageIntro, DocsSection } from '@/app/docs/_components/docs-primitives';
import { productModules } from '@/app/docs/_data/content';

export const metadata: Metadata = {
  title: 'Bề mặt sản phẩm',
  description: 'Bản đồ module và route của VSmart.',
};

export default function ModulesPage() {
  return (
    <div className="space-y-6">
      <DocsPageIntro
        badge="Product surface"
        title="Bản đồ module theo hành trình người dùng"
        description="Trang này giúp bạn tra nhanh mỗi chức năng nằm ở route nào và phạm vi vận hành ra sao trong dashboard."
      />

      <DocsSection title="Các module chính" description="Mỗi block đại diện một cụm năng lực của sản phẩm.">
        <div className="grid gap-4 md:grid-cols-2">
          {productModules.map((module) => (
            <article key={module.title} className="rounded-[24px] border border-[#dde6d6] bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-[#203020]">{module.title}</h3>
                <div className="rounded-xl border border-[#d8e3cb] bg-[#eef6df] p-2 text-[#5e7752]">
                  <module.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#64715f]">{module.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {module.routes.map((route) => (
                  <DocsChip key={route}>{route}</DocsChip>
                ))}
              </div>
            </article>
          ))}
        </div>
      </DocsSection>

      <DocsSection
        title="Gợi ý onboarding theo vai trò"
        description="Thứ tự đọc và khám phá sản phẩm nên khác nhau tùy vai trò để tiết kiệm thời gian."
      >
        <div className="grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-[#dfe7d8] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Thành viên</p>
            <p className="mt-2 text-sm leading-6 text-[#64715f]">Dashboard -&gt; Kanban -&gt; Planning -&gt; Profile</p>
          </article>
          <article className="rounded-2xl border border-[#dfe7d8] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Quản lý</p>
            <p className="mt-2 text-sm leading-6 text-[#64715f]">Projects -&gt; Reviews -&gt; Analytics -&gt; Planning</p>
          </article>
          <article className="rounded-2xl border border-[#dfe7d8] bg-[#fbfcf8] p-4">
            <p className="text-sm font-semibold text-[#223021]">Admin tổ chức</p>
            <p className="mt-2 text-sm leading-6 text-[#64715f]">Settings -&gt; Members -&gt; Departments -&gt; Skills Matrix</p>
          </article>
        </div>
      </DocsSection>
    </div>
  );
}
