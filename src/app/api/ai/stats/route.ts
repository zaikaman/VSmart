/**
 * API endpoint để lấy thống kê AI suggestions
 * GET /api/ai/stats
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * GET /api/ai/stats
 * Lấy thống kê về AI suggestions (acceptance rate, latency, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Xác thực user (chỉ admin/manager mới xem được)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Chưa đăng nhập' },
        { status: 401 }
      );
    }

    // Lấy thông tin user để kiểm tra quyền
    const { data: userData } = await supabase
      .from('nguoi_dung')
      .select('vai_tro')
      .eq('email', user.email)
      .single();

    // Cho phép tất cả user xem stats cơ bản (có thể restrict nếu cần)
    // if (userData?.vai_tro !== 'admin' && userData?.vai_tro !== 'manager') {
    //   return NextResponse.json(
    //     { error: 'Không có quyền truy cập' },
    //     { status: 403 }
    //   );
    // }

    // Tổng số suggestions
    const { count: totalSuggestions } = await supabase
      .from('goi_y_phan_cong')
      .select('*', { count: 'exact', head: true });

    // Số suggestions được chấp nhận
    const { count: acceptedSuggestions } = await supabase
      .from('goi_y_phan_cong')
      .select('*', { count: 'exact', head: true })
      .eq('da_chap_nhan', true);

    // Số tasks có AI suggestions
    const { data: uniqueTasks } = await supabase
      .from('goi_y_phan_cong')
      .select('task_id')
      .limit(1000);

    const uniqueTaskIds = new Set(uniqueTasks?.map((t) => t.task_id) || []);

    // Tính tỷ lệ chấp nhận
    const total = totalSuggestions || 0;
    const accepted = acceptedSuggestions || 0;
    const acceptanceRate = total > 0 ? Math.round((accepted / total) * 100 * 100) / 100 : 0;

    // Lấy 10 suggestions gần nhất
    const { data: recentSuggestions } = await supabase
      .from('goi_y_phan_cong')
      .select(`
        id,
        task_id,
        diem_phu_hop,
        da_chap_nhan,
        thoi_gian,
        task:task_id (ten),
        nguoi_dung:nguoi_dung_goi_y_id (ten, email)
      `)
      .order('thoi_gian', { ascending: false })
      .limit(10);

    // Phân bố điểm phù hợp
    const { data: scoreDistribution } = await supabase
      .from('goi_y_phan_cong')
      .select('diem_phu_hop, da_chap_nhan');

    const scores = {
      high: 0, // >= 80
      medium: 0, // 60-79
      low: 0, // < 60
    };

    const acceptedByScore = {
      high: 0,
      medium: 0,
      low: 0,
    };

    scoreDistribution?.forEach((s) => {
      if (s.diem_phu_hop >= 80) {
        scores.high++;
        if (s.da_chap_nhan) acceptedByScore.high++;
      } else if (s.diem_phu_hop >= 60) {
        scores.medium++;
        if (s.da_chap_nhan) acceptedByScore.medium++;
      } else {
        scores.low++;
        if (s.da_chap_nhan) acceptedByScore.low++;
      }
    });

    return NextResponse.json({
      overview: {
        total_suggestions: total,
        accepted_suggestions: accepted,
        acceptance_rate: acceptanceRate,
        unique_tasks: uniqueTaskIds.size,
      },
      score_distribution: {
        high: {
          count: scores.high,
          accepted: acceptedByScore.high,
          rate: scores.high > 0 
            ? Math.round((acceptedByScore.high / scores.high) * 100 * 100) / 100 
            : 0,
        },
        medium: {
          count: scores.medium,
          accepted: acceptedByScore.medium,
          rate: scores.medium > 0 
            ? Math.round((acceptedByScore.medium / scores.medium) * 100 * 100) / 100 
            : 0,
        },
        low: {
          count: scores.low,
          accepted: acceptedByScore.low,
          rate: scores.low > 0 
            ? Math.round((acceptedByScore.low / scores.low) * 100 * 100) / 100 
            : 0,
        },
      },
      recent_suggestions: recentSuggestions || [],
    });
  } catch (error) {
    console.error('Lỗi trong /api/ai/stats:', error);
    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}
