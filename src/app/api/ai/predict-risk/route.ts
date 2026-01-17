import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { duBaoRuiRo, TaskForRiskAnalysis } from '@/lib/openai/risk-prediction';
import { z } from 'zod';

const predictRiskSchema = z.object({
  task_id: z.string().uuid(),
});

/**
 * POST /api/ai/predict-risk
 * Dự báo rủi ro trễ hạn cho một task
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Kiểm tra authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse và validate body
    const body = await request.json();
    const parsed = predictRiskSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const { task_id } = parsed.data;
    
    // Lấy thông tin task
    const { data: task, error: taskError } = await supabase
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
        assignee_id,
        nguoi_dung:assignee_id (
          id,
          ten,
          ty_le_hoan_thanh
        )
      `)
      .eq('id', task_id)
      .is('deleted_at', null)
      .single();
    
    if (taskError || !task) {
      return NextResponse.json(
        { error: 'Không tìm thấy task' },
        { status: 404 }
      );
    }
    
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
    
    // Chuẩn bị dữ liệu cho AI
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
    
    // Gọi AI để dự báo rủi ro
    const prediction = await duBaoRuiRo(taskForAnalysis);
    
    // Cập nhật risk score vào database nếu có kết quả
    if (prediction.result) {
      await supabase
        .from('task')
        .update({
          risk_score: prediction.result.risk_score,
          risk_level: prediction.result.risk_level,
          risk_updated_at: new Date().toISOString(),
          cap_nhat_cuoi: new Date().toISOString(),
        })
        .eq('id', task_id);
      
      // Tạo notification nếu risk cao
      if (prediction.result.risk_level === 'high') {
        // Lấy manager của project để gửi thông báo
        const { data: phanDuAn } = await supabase
          .from('phan_du_an')
          .select('du_an_id')
          .eq('id', (await supabase.from('task').select('phan_du_an_id').eq('id', task_id).single()).data?.phan_du_an_id)
          .single();
        
        if (phanDuAn) {
          const { data: projectOwner } = await supabase
            .from('du_an')
            .select('nguoi_tao_id')
            .eq('id', phanDuAn.du_an_id)
            .single();
          
          if (projectOwner) {
            // Tạo notification cho owner
            await supabase
              .from('thong_bao')
              .insert({
                nguoi_dung_id: projectOwner.nguoi_tao_id,
                loai: 'risk_alert',
                noi_dung: `⚠️ Task "${task.ten}" có ${prediction.result.risk_score}% nguy cơ trễ hạn - ${prediction.result.ly_do}`,
                task_lien_quan_id: task_id,
              });
          }
        }
        
        // Tạo notification cho assignee nếu có
        if (task.assignee_id) {
          await supabase
            .from('thong_bao')
            .insert({
              nguoi_dung_id: task.assignee_id,
              loai: 'risk_alert',
              noi_dung: `⚠️ Task "${task.ten}" có ${prediction.result.risk_score}% nguy cơ trễ hạn - ${prediction.result.ly_do}`,
              task_lien_quan_id: task_id,
            });
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      data: prediction,
    });
    
  } catch (error) {
    console.error('Error predicting risk:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
