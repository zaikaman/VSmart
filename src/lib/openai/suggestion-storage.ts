/**
 * Helper để lưu và quản lý AI suggestions trong database
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import type { SuggestionReason } from './assignment-suggestion';

/**
 * Interface cho suggestion record trong database
 */
export interface SuggestionRecord {
  id: string;
  task_id: string;
  nguoi_dung_goi_y_id: string;
  diem_phu_hop: number;
  ly_do: SuggestionReason;
  da_chap_nhan: boolean;
  thoi_gian: string;
}

/**
 * Lưu AI suggestions vào database
 * Được gọi sau khi tạo task và có suggestion được chấp nhận
 */
export async function saveSuggestions(params: {
  taskId: string;
  suggestions: Array<{
    nguoi_dung_id: string;
    diem_phu_hop: number;
    ly_do: SuggestionReason;
    da_chap_nhan?: boolean;
  }>;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const records = params.suggestions.map((s) => ({
      task_id: params.taskId,
      nguoi_dung_goi_y_id: s.nguoi_dung_id,
      diem_phu_hop: s.diem_phu_hop,
      ly_do: s.ly_do,
      da_chap_nhan: s.da_chap_nhan || false,
    }));

    const { error } = await supabaseAdmin
      .from('goi_y_phan_cong')
      .insert(records);

    if (error) {
      console.error('Lỗi lưu suggestions:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Lỗi trong saveSuggestions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Lỗi không xác định' 
    };
  }
}

/**
 * Đánh dấu suggestion là đã được chấp nhận
 */
export async function markSuggestionAccepted(params: {
  taskId: string;
  acceptedUserId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Đánh dấu suggestion được chọn là accepted
    const { error } = await supabaseAdmin
      .from('goi_y_phan_cong')
      .update({ da_chap_nhan: true })
      .eq('task_id', params.taskId)
      .eq('nguoi_dung_goi_y_id', params.acceptedUserId);

    if (error) {
      console.error('Lỗi đánh dấu suggestion accepted:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Lỗi trong markSuggestionAccepted:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Lỗi không xác định' 
    };
  }
}

/**
 * Lấy danh sách suggestions cho một task
 */
export async function getSuggestionsForTask(
  taskId: string
): Promise<SuggestionRecord[]> {
  try {
    const supabase = await createSupabaseServerClient();
    
    const { data, error } = await supabase
      .from('goi_y_phan_cong')
      .select(`
        *,
        nguoi_dung:nguoi_dung_goi_y_id (id, ten, email, avatar_url)
      `)
      .eq('task_id', taskId)
      .order('diem_phu_hop', { ascending: false });

    if (error) {
      console.error('Lỗi lấy suggestions:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Lỗi trong getSuggestionsForTask:', error);
    return [];
  }
}

/**
 * Thống kê tỷ lệ chấp nhận AI suggestions
 */
export async function getSuggestionAcceptanceStats(): Promise<{
  total: number;
  accepted: number;
  rate: number;
}> {
  try {
    const supabase = await createSupabaseServerClient();

    // Tổng số suggestions
    const { count: total } = await supabase
      .from('goi_y_phan_cong')
      .select('*', { count: 'exact', head: true });

    // Số suggestions được chấp nhận
    const { count: accepted } = await supabase
      .from('goi_y_phan_cong')
      .select('*', { count: 'exact', head: true })
      .eq('da_chap_nhan', true);

    const totalCount = total || 0;
    const acceptedCount = accepted || 0;
    const rate = totalCount > 0 ? (acceptedCount / totalCount) * 100 : 0;

    return {
      total: totalCount,
      accepted: acceptedCount,
      rate: Math.round(rate * 100) / 100,
    };
  } catch (error) {
    console.error('Lỗi trong getSuggestionAcceptanceStats:', error);
    return { total: 0, accepted: 0, rate: 0 };
  }
}
