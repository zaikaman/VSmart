import type { ReactNode } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DocsPageIntro({
  badge,
  title,
  description,
  actions,
}: {
  badge: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rounded-[30px] border border-[#dce6d2] bg-[linear-gradient(135deg,#f9fcf4_0%,#f1f7e8_46%,#ebf3e2_100%)] p-6 shadow-[0_24px_55px_-42px_rgba(89,111,81,0.42)]">
      <p className="inline-flex items-center gap-2 rounded-full border border-[#d6e3c9] bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#5f7453]">
        <Sparkles className="h-3.5 w-3.5" />
        {badge}
      </p>
      <h1 className="mt-4 text-[clamp(2rem,4vw,3rem)] font-bold leading-tight text-[#1f2b1f]">{title}</h1>
      <p className="mt-3 max-w-4xl text-sm leading-7 text-[#5f6e5a]">{description}</p>
      {actions ? <div className="mt-5 flex flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function DocsSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[26px] border border-[#dfe7d8] bg-white/92 p-5 shadow-[0_20px_45px_-40px_rgba(92,112,84,0.35)]', className)}>
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-[#1f2b1f]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-6 text-[#62705e]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function DocsChip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-[#d8e3cb] bg-[#f4f9ea] px-3 py-1 text-xs font-medium text-[#4f624d]">{children}</span>;
}

export function DocsCode({ children }: { children: ReactNode }) {
  return <code className="rounded-xl border border-[#dbe5cf] bg-[#f8fbf2] px-3 py-1.5 font-mono text-xs text-[#355033]">{children}</code>;
}
