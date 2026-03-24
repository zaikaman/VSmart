'use client';

import { useMemo, useState } from 'react';
import { BarChart3, Download, Gauge, Keyboard, ShieldAlert, TimerReset, TriangleAlert } from 'lucide-react';
import { SavedViewBar } from '@/components/governance/saved-view-bar';
import { ShortcutDialog } from '@/components/governance/shortcut-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/lib/hooks/use-current-user';
import { useHotkeys } from '@/lib/hooks/use-hotkeys';
import { useAnalyticsOverview } from '@/lib/hooks/use-governance';
import { useSavedViews } from '@/lib/hooks/use-saved-views';
import { isLeadershipRole } from '@/lib/auth/permissions';

type HealthFilter = 'all' | 'watch' | 'slipping';

function ChartBars({ items, colorClass }: { items: Array<{ label: string; value: number }>; colorClass: string }) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{item.label}</span>
            <span>{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${Math.max((item.value / max) * 100, 6)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [healthFilter, setHealthFilter] = useState<HealthFilter>('all');
  const [shortcutOpen, setShortcutOpen] = useState(false);
  const savedViews = useSavedViews<{ healthFilter: HealthFilter }>('analytics');
  const { data, isLoading } = useAnalyticsOverview();
  const { data: currentUser } = useCurrentUser();

  useHotkeys([
    {
      key: 'e',
      action: (event) => {
        event.preventDefault();
        window.open('/api/analytics/export', '_blank');
      },
    },
    {
      key: '?',
      action: (event) => {
        event.preventDefault();
        setShortcutOpen(true);
      },
    },
  ]);

  const isManagerView = isLeadershipRole(currentUser?.vai_tro);
  const filteredProjectHealth = useMemo(() => {
    if (!data) return [];
    if (healthFilter === 'all') return data.projectHealth;
    return data.projectHealth.filter((project) => project.status === healthFilter);
  }, [data, healthFilter]);

  if (!isManagerView) {
    return (
      <div className="container mx-auto max-w-5xl px-6 py-8">
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-4 p-6">
            <ShieldAlert className="mt-1 h-6 w-6 text-amber-600" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">Analytics dÃ nh cho quáº£n lÃ½</h1>
              <p className="mt-2 text-sm text-slate-600">Dashboard nÃ y gom sá»‘ liá»‡u Ä‘iá»u phá»‘i toÃ n Ä‘á»™i nÃªn chá»‰ má»Ÿ cho tÃ i khoáº£n quáº£n lÃ½ hoáº·c quáº£n trá»‹.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-[#dfe6d3] bg-[#f5f8ef] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#61705f]">
            <BarChart3 className="h-3.5 w-3.5" />
            Analytics overview
          </div>
          <h1 className="mt-4 text-3xl font-bold text-slate-900">Bá»©c tranh váº­n hÃ nh cá»§a Ä‘á»™i</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">Theo dÃµi nhá»‹p hoÃ n thÃ nh, xu hÆ°á»›ng quÃ¡ háº¡n, cÃ¢n báº±ng táº£i vÃ  cÃ¡c dá»± Ã¡n cÃ³ tÃ­n hiá»‡u trÆ°á»£t má»‘c Ä‘á»ƒ quyáº¿t Ä‘á»‹nh nhanh hÆ¡n.</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShortcutOpen(true)}>
            <Keyboard className="mr-2 h-4 w-4" />
            PhÃ­m táº¯t
          </Button>
          <a href="/api/analytics/export" download>
            <Button className="bg-[#191a23] text-white hover:bg-[#2a2b35]">
              <Download className="mr-2 h-4 w-4" />
              Xuáº¥t CSV
            </Button>
          </a>
        </div>
      </div>

      <div className="mb-6">
        <SavedViewBar
          title="GÃ³c nhÃ¬n Ä‘Ã£ lÆ°u"
          description="LÆ°u nhanh gÃ³c nhÃ¬n analytics theo nhÃ³m dá»± Ã¡n cáº§n giá»¯ sÃ¡t Ä‘á»ƒ má»Ÿ láº¡i Ä‘Ãºng bÃ¡o cÃ¡o Ä‘ang dÃ¹ng."
          views={savedViews.views}
          onApply={(view) => setHealthFilter(view.healthFilter)}
          onSave={(name) => savedViews.saveView(name, { healthFilter })}
          onDelete={savedViews.removeView}
          disabled={!savedViews.isReady}
          saving={savedViews.isSaving}
        />
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-[140px] rounded-[28px]" />)}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-[360px] rounded-[28px]" />
            <Skeleton className="h-[360px] rounded-[28px]" />
          </div>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="rounded-[28px] border-[#e7ebdf]"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">HoÃ n thÃ nh</p><div className="mt-3 flex items-center justify-between"><p className="text-3xl font-semibold text-slate-900">{data.summary.completionRate}%</p><Gauge className="h-5 w-5 text-emerald-600" /></div><p className="mt-2 text-sm text-slate-500">{data.summary.totalTasks} task trong pháº¡m vi theo dÃµi</p></CardContent></Card>
            <Card className="rounded-[28px] border-[#ffe1e4] bg-[#fff7f8]"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">QuÃ¡ háº¡n má»Ÿ</p><div className="mt-3 flex items-center justify-between"><p className="text-3xl font-semibold text-rose-600">{data.summary.overdueRate}%</p><TriangleAlert className="h-5 w-5 text-rose-500" /></div><p className="mt-2 text-sm text-slate-500">TÃ­nh trÃªn nhÃ³m task chÆ°a hoÃ n thÃ nh</p></CardContent></Card>
            <Card className="rounded-[28px] border-[#e7ebdf]"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Lead time TB</p><div className="mt-3 flex items-center justify-between"><p className="text-3xl font-semibold text-slate-900">{data.summary.averageLeadTimeDays} ngÃ y</p><TimerReset className="h-5 w-5 text-sky-600" /></div><p className="mt-2 text-sm text-slate-500">TÃ­nh tá»« ngÃ y táº¡o Ä‘áº¿n láº§n cáº­p nháº­t hoÃ n thÃ nh</p></CardContent></Card>
            <Card className="rounded-[28px] border-[#fff0c9] bg-[#fffaf0]"><CardContent className="p-5"><p className="text-xs uppercase tracking-[0.18em] text-slate-500">Táº£i trung bÃ¬nh</p><div className="mt-3 flex items-center justify-between"><p className="text-3xl font-semibold text-amber-600">{data.summary.avgLoadRatio}%</p><BarChart3 className="h-5 w-5 text-amber-500" /></div><p className="mt-2 text-sm text-slate-500">Má»©c táº£i quy Ä‘á»•i trÃªn toÃ n Ä‘á»™i</p></CardContent></Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="rounded-[28px] border-[#e7ebdf]"><CardHeader><CardTitle>Nhá»‹p hoÃ n thÃ nh 8 tuáº§n</CardTitle></CardHeader><CardContent><ChartBars items={data.completionTrend.map((item) => ({ label: item.label, value: item.completed }))} colorClass="bg-emerald-500" /></CardContent></Card>
            <Card className="rounded-[28px] border-[#e7ebdf]"><CardHeader><CardTitle>Xu hÆ°á»›ng task quÃ¡ háº¡n</CardTitle></CardHeader><CardContent><ChartBars items={data.overdueTrend.map((item) => ({ label: item.label, value: item.overdue }))} colorClass="bg-rose-500" /></CardContent></Card>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="rounded-[28px] border-[#e7ebdf]">
              <CardHeader><CardTitle>PhÃ¢n bá»‘ rá»§i ro</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {data.riskDistribution.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-900">{item.label}</p>
                      <p className="text-xl font-semibold text-slate-900">{item.value}</p>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${Math.max((item.value / Math.max(...data.riskDistribution.map((entry) => entry.value), 1)) * 100, 8)}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-[28px] border-[#e7ebdf]">
              <CardHeader><CardTitle>ThÃ nh viÃªn Ä‘ang sÃ¡t táº£i</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {data.topOverloadedMembers.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">Hiá»‡n chÆ°a cÃ³ thÃ nh viÃªn nÃ o vÆ°á»£t ngÆ°á»¡ng táº£i theo cáº¥u hÃ¬nh planning.</div>
                ) : (
                  data.topOverloadedMembers.map((member) => (
                    <div key={member.userId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">{member.ten}</p>
                          <p className="mt-1 text-sm text-slate-500">{member.activeTasks} task Ä‘ang má»Ÿ</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-semibold text-slate-900">{Math.round(member.loadRatio * 100)}%</p>
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{member.loadStatus}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <div className="mt-4">
            <div className="mb-3 flex flex-wrap gap-2">
              {[
                { label: 'Táº¥t cáº£ dá»± Ã¡n nÃ³ng', value: 'all' },
                { label: 'Chá»‰ nhÃ³m watch', value: 'watch' },
                { label: 'Chá»‰ nhÃ³m slipping', value: 'slipping' },
              ].map((item) => (
                <Button key={item.value} variant={healthFilter === item.value ? 'default' : 'outline'} className={healthFilter === item.value ? 'bg-[#191a23] text-white hover:bg-[#2a2b35]' : ''} onClick={() => setHealthFilter(item.value as HealthFilter)}>
                  {item.label}
                </Button>
              ))}
            </div>
            <Card className="rounded-[28px] border-[#e7ebdf]">
              <CardHeader><CardTitle>Dá»± Ã¡n cáº§n giá»¯ sÃ¡t</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {filteredProjectHealth.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-sm text-slate-500">Bá»™ lá»c hiá»‡n táº¡i chÆ°a cÃ³ dá»± Ã¡n nÃ o khá»›p.</div>
                ) : (
                  filteredProjectHealth.map((project) => (
                    <div key={project.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1.2fr_0.8fr]">
                      <div>
                        <p className="font-medium text-slate-900">{project.ten}</p>
                        <p className="mt-1 text-sm text-slate-500">HoÃ n thÃ nh {project.completionRate}% â€¢ {project.overdueTasks} task quÃ¡ háº¡n</p>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-white bg-white px-4 py-3">
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-400">{project.status}</span>
                        <span className="text-lg font-semibold text-slate-900">{project.slipProbability}%</span>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <ShortcutDialog
        open={shortcutOpen}
        onOpenChange={setShortcutOpen}
        title="PhÃ­m táº¯t Analytics"
        items={[
          { keyLabel: 'E', description: 'Xuáº¥t nhanh bÃ¡o cÃ¡o CSV' },
          { keyLabel: '?', description: 'Má»Ÿ báº£ng phÃ­m táº¯t' },
        ]}
      />
    </div>
  );
}



