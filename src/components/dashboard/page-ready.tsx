'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { useIsFetching } from '@tanstack/react-query';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

const PAGE_READY_DELAY_MS = 120;

export function DashboardPageReady({
  children,
  fallback,
  className,
}: {
  children: ReactNode;
  fallback: ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const [isReady, setIsReady] = useState(false);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeFetches = useIsFetching({
    predicate: (query) =>
      query.getObserversCount() > 0 &&
      query.state.fetchStatus === 'fetching' &&
      query.meta?.pageGate !== 'ignore',
  });

  useEffect(() => {
    setIsReady(false);

    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, [routeKey]);

  useEffect(() => {
    if (isReady) {
      return;
    }

    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    if (activeFetches === 0) {
      settleTimerRef.current = setTimeout(() => {
        setIsReady(true);
      }, PAGE_READY_DELAY_MS);
    }

    return () => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [activeFetches, isReady, routeKey]);

  return (
    <div className={cn('relative', className)}>
      <div
        aria-hidden={!isReady}
        className={cn(!isReady && 'pointer-events-none fixed inset-0 z-[-1] overflow-hidden opacity-0')}
      >
        {children}
      </div>
      {!isReady ? fallback : null}
    </div>
  );
}
