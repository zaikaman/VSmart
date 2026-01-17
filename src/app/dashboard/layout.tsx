
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { DashboardWrapper } from '@/components/layouts/dashboard-wrapper'

export const metadata: Metadata = {
  title: 'Bảng điều khiển VSmart',
  description: 'Quản lý nhiệm vụ thông minh',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Kiểm tra authentication và onboarding
  const supabase = await createSupabaseServerClient();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    redirect('/login');
  }

  // Kiểm tra xem user đã hoàn thành onboarding chưa
  const { data: userData, error: userError } = await supabase
    .from('nguoi_dung')
    .select('onboarding_completed')
    .eq('email', user.email)
    .single();

  if (!userError && userData && !userData.onboarding_completed) {
    redirect('/onboarding');
  }

  return (
    <DashboardWrapper>
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar className="hidden md:flex" />
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
    </DashboardWrapper>
  )
}
