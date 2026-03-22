'use client';

import { ReactNode } from 'react';
import { Bricolage_Grotesque, JetBrains_Mono } from 'next/font/google';
import { cn } from '@/lib/utils';

const bricolage = Bricolage_Grotesque({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'] });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '600'] });

export function DashboardPageShell({
  badge,
  title,
  description,
  actions,
  metrics,
  children,
  className,
}: {
  badge?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
  metrics?: Array<{
    label: string;
    value: ReactNode;
    note?: string;
    icon?: ReactNode;
    surfaceClassName?: string;
    valueClassName?: string;
  }>;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(`min-h-[calc(100vh-4rem)] bg-[linear-gradient(180deg,#fbfaf4_0%,#f4f6ef_44%,#edf2ea_100%)] ${bricolage.className}`, className)}>
      <div className="mx-auto max-w-7xl px-6 py-8">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {badge ? <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#7a8774]">{badge}</div> : null}
            <h1 className="text-[clamp(2rem,3.5vw,3rem)] font-bold leading-tight text-[#1f2b1f]">{title}</h1>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[#61705f]">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </header>

        {metrics?.length ? (
          <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <article
                key={metric.label}
                className={cn(
                  'rounded-[24px] border p-4 shadow-[0_16px_35px_-32px_rgba(100,116,93,0.3)]',
                  metric.surfaceClassName || 'border-[#dce5d2] bg-white'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6a7762]">{metric.label}</span>
                  {metric.icon}
                </div>
                <div className={cn(`mt-3 text-3xl font-semibold text-[#243223] ${jetbrains.className}`, metric.valueClassName)}>{metric.value}</div>
                {metric.note ? <p className="mt-1.5 text-sm text-[#697564]">{metric.note}</p> : null}
              </article>
            ))}
          </div>
        ) : null}

        <div className="space-y-6">{children}</div>
      </div>
    </div>
  );
}

export function DashboardSection({
  title,
  description,
  actions,
  children,
  className,
}: {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[30px] border border-[#dfe5d6] bg-white/90 px-5 py-5 shadow-[0_22px_65px_-48px_rgba(89,109,84,0.35)] backdrop-blur-sm', className)}>
      {title || description || actions ? (
        <div className="mb-5 flex flex-col gap-3 border-b border-[#edf1e8] pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {title ? <h2 className="text-xl font-semibold text-[#1f2b1f]">{title}</h2> : null}
            {description ? <p className="mt-1 text-sm leading-6 text-[#61705f]">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
