/**
 * API endpoint để lưu AI suggestions và track acceptance
 * POST /api/ai/track-suggestion
 */

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { z } from 'zod';

// Schema cho việc lưu suggestions
const saveSuggestionsSchema = z.object({
  task_id: z.string().uuid('Task ID không hợp lệ'),
  suggestions: z.array(
    z.object({
      nguoi_dung_id: z.string().uuid('User ID không hợp lệ'),
      diem_phu_hop: z.number().min(0).max(100),
      ly_do: z.object({
        chinh: z.string(),
        ky_nang_phu_hop: z.array(z.string()).optional(),
        ty_le_hoan_thanh: z.string().optional(),
        khoi_luong_hien_tai: z.string().optional(),
      }),
      da_chap_nhan: z.boolean().default(false),
    })
  ),
});

// Schema cho việc mark suggestion là accepted
const markAcceptedSchema = z.object({
  task_id: z.string().uuid('Task ID không hợp lệ'),
  accepted_user_id: z.string().uuid('User ID không hợp lệ'),
});

/**
 * POST /api/ai/track-suggestion
 * Lưu AI suggestions vào database để tracking
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Xác thực user
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

    const body = await request.json();
    const validated = saveSuggestionsSchema.parse(body);

    // Verify task tồn tại
    const { data: taskData, error: taskError } = await supabase
      .from('task')
      .select('id, phan_du_an_id')
      .eq('id', validated.task_id)
      .single();

    if (taskError || !taskData) {
      return NextResponse.json(
        { error: 'Task không tồn tại' },
        { status: 404 }
      );
    }

    // Chuẩn bị records để insert
    const records = validated.suggestions.map((s) => ({
      task_id: validated.task_id,
      nguoi_dung_goi_y_id: s.nguoi_dung_id,
      diem_phu_hop: s.diem_phu_hop,
      ly_do: s.ly_do,
      da_chap_nhan: s.da_chap_nhan,
    }));

    // Insert vào database
    const { error: insertError } = await supabaseAdmin
      .from('goi_y_phan_cong')
      .insert(records);

    if (insertError) {
      console.error('Lỗi lưu suggestions:', insertError);
      return NextResponse.json(
        { error: 'Không thể lưu suggestions' },
        { status: 500 }
      );
    }

    // Log metrics
    console.log('[AI Track Suggestion]', {
      task_id: validated.task_id,
      suggestions_count: validated.suggestions.length,
      has_accepted: validated.suggestions.some((s) => s.da_chap_nhan),
    });

    return NextResponse.json({
      success: true,
      saved_count: records.length,
    });
  } catch (error) {
    console.error('Lỗi trong /api/ai/track-suggestion:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ai/track-suggestion
 * Đánh dấu suggestion là đã được chấp nhận
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Xác thực user
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

    const body = await request.json();
    const validated = markAcceptedSchema.parse(body);

    // Update suggestion
    const { error: updateError, count } = await supabaseAdmin
      .from('goi_y_phan_cong')
      .update({ da_chap_nhan: true })
      .eq('task_id', validated.task_id)
      .eq('nguoi_dung_goi_y_id', validated.accepted_user_id);

    if (updateError) {
      console.error('Lỗi update suggestion:', updateError);
      return NextResponse.json(
        { error: 'Không thể cập nhật suggestion' },
        { status: 500 }
      );
    }

    // Log metrics
    console.log('[AI Suggestion Accepted]', {
      task_id: validated.task_id,
      accepted_user_id: validated.accepted_user_id,
    });

    return NextResponse.json({
      success: true,
      updated: count,
    });
  } catch (error) {
    console.error('Lỗi trong PATCH /api/ai/track-suggestion:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Dữ liệu không hợp lệ', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Lỗi server' },
      { status: 500 }
    );
  }
}
