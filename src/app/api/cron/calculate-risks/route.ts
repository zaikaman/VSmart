import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateBasicRiskScore, TaskForRiskAnalysis } from '@/lib/openai/risk-prediction';
import { isTaskStale, createStaleTaskMessage, createRiskAlertMessage } from '@/lib/utils/risk-utils';

// GET /api/cron/calculate-risks
// Cron job endpoint cho cron-job.org
// Chạy mỗi 6 giờ để:
// 1. Tính lại risk score cho tất cả tasks in-progress
// 2. Phát hiện stale tasks
// 3. Tạo notifications cho high-risk và stale tasks
//
// Cấu hình trên cron-job.org:
// URL: https://yourdomain.com/api/cron/calculate-risks
// Schedule: 0 0,6,12,18 * * * (mỗi 6 giờ: 0h, 6h, 12h, 18h)
// Header: x-cron-secret: your-secret-value

export async function GET(request: NextRequest) {
  try {
    // Xác thực cron secret
    const cronSecret = request.headers.get('x-cron-secret');
    
    if (cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid cron secret' },
        { status: 401 }
      );
    }
    
    // Sử dụng service role client để bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Lấy tất cả tasks in-progress và todo (chưa done)
    const { data: tasks, error: tasksError } = await supabase
      .from('task')
      .select(`
        id,
        ten,
        mo_ta,
        trang_thai,
        progress,
        deadline,
        ngay_tao,
        cap_nhat_cuoi,
        risk_score,
        risk_level,
        is_stale,
        assignee_id,
        phan_du_an_id,
        nguoi_dung:assignee_id (
          id,
          ten,
          ty_le_hoan_thanh
        ),
        phan_du_an (
          du_an_id,
          du_an (
            nguoi_tao_id
          )
        )
      `)
      .is('deleted_at', null)
      .in('trang_thai', ['in-progress', 'todo']);
    
    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return NextResponse.json(
        { error: 'Lỗi khi lấy danh sách tasks' },
        { status: 500 }
      );
    }
    
    const stats = {
      total: tasks?.length || 0,
      updated: 0,
      highRisk: 0,
      staleDetected: 0,
      notificationsCreated: 0,
      errors: 0,
    };
    
    // Process từng task
    for (const task of tasks || []) {
      try {
        // Đếm số task đang làm của assignee
        let soTaskDangLam = 0;
        if (task.assignee_id) {
          const { count } = await supabase
            .from('task')
            .select('id', { count: 'exact', head: true })
            .eq('assignee_id', task.assignee_id)
            .eq('trang_thai', 'in-progress')
            .is('deleted_at', null);
          
          soTaskDangLam = count || 0;
        }
        
        // Chuẩn bị dữ liệu cho tính toán risk
        const nguoiDung = task.nguoi_dung as unknown as { ten: string; ty_le_hoan_thanh: number } | null;
        const taskForAnalysis: TaskForRiskAnalysis = {
          id: task.id,
          ten: task.ten,
          mo_ta: task.mo_ta || undefined,
          trang_thai: task.trang_thai,
          progress: task.progress || 0,
          deadline: task.deadline,
          ngay_tao: task.ngay_tao,
          assignee: nguoiDung ? {
            ten: nguoiDung.ten,
            ty_le_hoan_thanh: nguoiDung.ty_le_hoan_thanh || 0,
            so_task_dang_lam: soTaskDangLam,
          } : undefined,
        };
        
        // Tính risk score (sử dụng basic calculation để tiết kiệm API calls)
        const riskResult = calculateBasicRiskScore(taskForAnalysis);
        
        // Kiểm tra stale
        const stale = isTaskStale({
          trang_thai: task.trang_thai,
          progress: task.progress,
          cap_nhat_cuoi: task.cap_nhat_cuoi,
          ngay_tao: task.ngay_tao,
        });
        
        // Cập nhật task
        const { error: updateError } = await supabase
          .from('task')
          .update({
            risk_score: riskResult.risk_score,
            risk_level: riskResult.risk_level,
            risk_updated_at: new Date().toISOString(),
            is_stale: stale,
          })
          .eq('id', task.id);
        
        if (updateError) {
          console.error(`Error updating task ${task.id}:`, updateError);
          stats.errors++;
          continue;
        }
        
        stats.updated++;
        
        // Lấy project owner ID
        const phanDuAn = task.phan_du_an as unknown as { du_an: { nguoi_tao_id: string } } | null;
        const projectOwnerId = phanDuAn?.du_an?.nguoi_tao_id;
        
        // Tạo notification cho high-risk (chỉ khi risk level thay đổi từ không phải high thành high)
        if (riskResult.risk_level === 'high' && task.risk_level !== 'high') {
          stats.highRisk++;
          
          const riskMessage = createRiskAlertMessage(task.ten, riskResult.risk_score, 'high');
          
          // Notification cho project owner
          if (projectOwnerId) {
            await supabase.from('thong_bao').insert({
              nguoi_dung_id: projectOwnerId,
              loai: 'risk_alert',
              noi_dung: riskMessage,
              task_lien_quan_id: task.id,
            });
            stats.notificationsCreated++;
          }
          
          // Notification cho assignee (nếu khác owner)
          if (task.assignee_id && task.assignee_id !== projectOwnerId) {
            await supabase.from('thong_bao').insert({
              nguoi_dung_id: task.assignee_id,
              loai: 'risk_alert',
              noi_dung: riskMessage,
              task_lien_quan_id: task.id,
            });
            stats.notificationsCreated++;
          }
        }
        
        // Tạo notification cho stale tasks (chỉ khi mới phát hiện stale)
        if (stale && !task.is_stale) {
          stats.staleDetected++;
          
          const daysSinceUpdate = Math.ceil(
            (new Date().getTime() - new Date(task.cap_nhat_cuoi).getTime()) / (1000 * 60 * 60 * 24)
          );
          const staleMessage = createStaleTaskMessage(task.ten, daysSinceUpdate);
          
          // Notification cho assignee
          if (task.assignee_id) {
            await supabase.from('thong_bao').insert({
              nguoi_dung_id: task.assignee_id,
              loai: 'stale_task',
              noi_dung: staleMessage,
              task_lien_quan_id: task.id,
            });
            stats.notificationsCreated++;
          }
          
          // Notification cho project owner nếu khác assignee
          if (projectOwnerId && projectOwnerId !== task.assignee_id) {
            await supabase.from('thong_bao').insert({
              nguoi_dung_id: projectOwnerId,
              loai: 'stale_task',
              noi_dung: staleMessage,
              task_lien_quan_id: task.id,
            });
            stats.notificationsCreated++;
          }
        }
        
      } catch (taskError) {
        console.error(`Error processing task ${task.id}:`, taskError);
        stats.errors++;
      }
    }
    
    console.log('Cron job completed:', stats);
    
    return NextResponse.json({
      success: true,
      message: 'Risk calculation completed',
      stats,
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Cho phép POST method cho flexibility
export async function POST(request: NextRequest) {
  return GET(request);
}
