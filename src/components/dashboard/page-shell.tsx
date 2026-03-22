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
  description: string;
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
        <section className="relative overflow-hidden rounded-[38px] border border-[#e3e7d8] bg-[linear-gradient(135deg,#fffdf7_0%,#f5f8ef_55%,#f0f5ee_100%)] px-6 py-7 shadow-[0_28px_80px_-48px_rgba(94,114,88,0.28)] md:px-8 md:py-8">
          <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,_rgba(210,227,189,0.6),_transparent_60%)]" />
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[radial-gradient(circle,_rgba(250,229,213,0.72),_transparent_68%)]" />

          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.25fr_0.95fr] lg:items-start">
            <div>
              {badge ? (
                <div className="inline-flex items-center gap-2 rounded-full border border-[#dde6cf] bg-white/85 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-[#61705f]">
                  {badge}
                </div>
              ) : null}

              <h1 className="mt-5 max-w-3xl text-[clamp(2.4rem,4vw,3.8rem)] font-extrabold leading-[1.02] text-[#1f2b1f]">
                {title}
              </h1>

              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#61705f]">{description}</p>

              {actions ? <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div> : null}
            </div>

            {metrics?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.map((metric) => (
                  <article
                    key={metric.label}
                    className={cn(
                      'rounded-[24px] border p-4 shadow-[0_18px_40px_-32px_rgba(100,116,93,0.35)]',
                      metric.surfaceClassName || 'border-[#dce5d2] bg-white'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6a7762]">{metric.label}</span>
                      {metric.icon}
                    </div>
                    <div className={cn(`mt-4 text-3xl font-semibold text-[#243223] ${jetbrains.className}`, metric.valueClassName)}>
                      {metric.value}
                    </div>
                    {metric.note ? <p className="mt-2 text-sm text-[#697564]">{metric.note}</p> : null}
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-6 space-y-6">{children}</div>
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
