'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { docsNav } from '@/app/docs/_data/content';

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="rounded-[24px] border border-[#dce5d2] bg-white/92 p-3 shadow-[0_16px_38px_-32px_rgba(86,109,78,0.45)]">
      <div className="space-y-4">
        {docsNav.map((group) => (
          <section key={group.title} className="space-y-2">
            <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a8774]">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'block rounded-2xl border px-3 py-2.5 transition',
                      isActive
                        ? 'border-[#d0ddc1] bg-[#edf6df] text-[#253421] shadow-[0_18px_32px_-28px_rgba(103,129,85,0.5)]'
                        : 'border-transparent bg-transparent text-[#52614d] hover:border-[#dfe7d7] hover:bg-[#f9fbf5]'
                    )}
                  >
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[#70806a]">{item.description}</p>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </nav>
  );
}
