import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';

const leaveOrganizationSchema = z.object({
  confirm: z.literal(true, {
    error: 'Cần xác nhận trước khi rời tổ chức.',
  }),
});

async function removeUserFromOrganizationProjects(params: {
  organizationId: string;
  userId: string;
  email: string;
}) {
  const { data: organizationProjects, error: projectError } = await supabaseAdmin
    .from('du_an')
    .select('id')
    .eq('to_chuc_id', params.organizationId)
    .is('deleted_at', null);

  if (projectError) {
    return { error: projectError };
  }

  const projectIds = (organizationProjects || []).map(project => project.id);

  if (projectIds.length === 0) {
    return { error: null };
  }

  const { error: membershipError } = await supabaseAdmin
    .from('thanh_vien_du_an')
    .update({
      trang_thai: 'declined',
      nguoi_dung_id: null,
    })
    .in('du_an_id', projectIds)
    .eq('email', params.email)
    .eq('trang_thai', 'active');

  if (membershipError) {
    return { error: membershipError };
  }

  const { data: projectParts, error: partError } = await supabaseAdmin
    .from('phan_du_an')
    .select('id')
    .in('du_an_id', projectIds)
    .is('deleted_at', null);

  if (partError) {
    return { error: partError };
  }

  const projectPartIds = (projectParts || []).map(part => part.id);

  if (projectPartIds.length > 0) {
    const { error: taskError } = await supabaseAdmin
      .from('task')
      .update({ assignee_id: null })
      .in('phan_du_an_id', projectPartIds)
      .eq('assignee_id', params.userId)
      .is('deleted_at', null);

    if (taskError) {
      return { error: taskError };
    }

    const { error: recurringRuleError } = await supabaseAdmin
      .from('recurring_task_rule')
      .update({ assignee_id: null })
      .in('phan_du_an_id', projectPartIds)
      .eq('assignee_id', params.userId);

    if (recurringRuleError) {
      return { error: recurringRuleError };
    }
  }

  return { error: null };
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    leaveOrganizationSchema.parse(body);

    const { data: currentUser, error: userError } = await supabaseAdmin
      .from('nguoi_dung')
      .select('id, email, to_chuc_id, vai_tro')
      .eq('email', user.email)
      .single();

    if (userError || !currentUser?.to_chuc_id) {
      return NextResponse.json({ error: 'Bạn chưa thuộc tổ chức nào' }, { status: 404 });
    }

    if (currentUser.vai_tro === 'owner') {
      const { count: ownerCount, error: ownerCountError } = await supabaseAdmin
        .from('nguoi_dung')
        .select('id', { count: 'exact', head: true })
        .eq('to_chuc_id', currentUser.to_chuc_id)
        .eq('vai_tro', 'owner');

      if (ownerCountError) {
        return NextResponse.json(
          { error: 'Không thể kiểm tra số lượng owner hiện tại' },
          { status: 500 }
        );
      }

      if ((ownerCount || 0) <= 1) {
        return NextResponse.json(
          { error: 'Bạn đang là owner cuối cùng. Hãy chuyển quyền owner trước khi rời tổ chức.' },
          { status: 400 }
        );
      }
    }

    const cleanupProjectsResult = await removeUserFromOrganizationProjects({
      organizationId: currentUser.to_chuc_id,
      userId: currentUser.id,
      email: currentUser.email,
    });

    if (cleanupProjectsResult.error) {
      return NextResponse.json(
        { error: 'Không thể cập nhật các dự án liên quan trước khi rời tổ chức' },
        { status: 500 }
      );
    }

    const { error: leaveError } = await supabaseAdmin
      .from('nguoi_dung')
      .update({
        to_chuc_id: null,
        vai_tro: 'member',
        phong_ban_id: null,
        ten_cong_ty: null,
        ten_phong_ban: null,
      })
      .eq('id', currentUser.id);

    if (leaveError) {
      return NextResponse.json({ error: 'Không thể rời tổ chức lúc này' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Bạn đã rời tổ chức' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' },
        { status: 400 }
      );
    }

    console.error('Error leaving organization:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
