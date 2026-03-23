import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  APP_ROLE_LABELS,
  APP_ROLE_PRIORITY,
  canAssignOrganizationRole,
  canManageOrganizationRoles,
  canManageOrganizationTarget,
  getAssignableOrganizationRoles,
  type AppRole,
} from '@/lib/auth/permissions';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';

export interface OrganizationMember {
  id: string;
  ten: string;
  email: string;
  avatar_url: string | null;
  vai_tro: AppRole;
  ten_phong_ban: string | null;
  ngay_tao: string;
}

export interface OrganizationMembersResponse {
  data: OrganizationMember[];
  permissions: {
    currentUserId: string;
    currentUserRole: AppRole;
    canManageRoles: boolean;
    assignableRoles: AppRole[];
    roleLabels: Record<AppRole, string>;
  };
}

const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  vai_tro: z.enum(['owner', 'admin', 'manager', 'member']),
});

function sortMembers(a: OrganizationMember, b: OrganizationMember) {
  const priorityDiff = APP_ROLE_PRIORITY[b.vai_tro] - APP_ROLE_PRIORITY[a.vai_tro];

  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  return a.ten.localeCompare(b.ten, 'vi');
}

async function getOrgMemberContext() {
  const { dbUser } = await getAuthenticatedUserContext();

  const { data: currentUser, error } = await supabaseAdmin
    .from('nguoi_dung')
    .select('id, ten, email, vai_tro, to_chuc_id')
    .eq('id', dbUser.id)
    .single();

  if (error || !currentUser?.to_chuc_id) {
    return null;
  }

  return {
    currentUser: {
      ...currentUser,
      vai_tro: currentUser.vai_tro as AppRole,
    },
    organizationId: currentUser.to_chuc_id,
  };
}

export async function GET() {
  try {
    const context = await getOrgMemberContext();

    if (!context) {
      return NextResponse.json({ error: 'Bạn chưa thuộc tổ chức nào' }, { status: 404 });
    }

    const { data: members, error } = await supabaseAdmin
      .from('nguoi_dung')
      .select('id, ten, email, avatar_url, vai_tro, ten_phong_ban, ngay_tao')
      .eq('to_chuc_id', context.organizationId)
      .order('ten', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Không thể lấy danh sách thành viên tổ chức' }, { status: 500 });
    }

    const normalizedMembers = (members || [])
      .map((member) => ({
        ...member,
        vai_tro: member.vai_tro as AppRole,
      }))
      .sort(sortMembers);

    return NextResponse.json({
      data: normalizedMembers,
      permissions: {
        currentUserId: context.currentUser.id,
        currentUserRole: context.currentUser.vai_tro,
        canManageRoles: canManageOrganizationRoles(context.currentUser.vai_tro),
        assignableRoles: getAssignableOrganizationRoles(context.currentUser.vai_tro),
        roleLabels: APP_ROLE_LABELS,
      },
    } satisfies OrganizationMembersResponse);
  } catch (error) {
    console.error('Error in GET /api/organization-members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getOrgMemberContext();

    if (!context) {
      return NextResponse.json({ error: 'Bạn chưa thuộc tổ chức nào' }, { status: 404 });
    }

    if (!canManageOrganizationRoles(context.currentUser.vai_tro)) {
      return NextResponse.json({ error: 'Bạn không có quyền điều chỉnh role tổ chức' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateRoleSchema.parse(body);

    if (validated.user_id === context.currentUser.id) {
      return NextResponse.json({ error: 'Không thể tự điều chỉnh role của chính mình ở đây' }, { status: 400 });
    }

    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('nguoi_dung')
      .select('id, ten, email, vai_tro, to_chuc_id')
      .eq('id', validated.user_id)
      .single();

    if (targetError || !targetUser || targetUser.to_chuc_id !== context.organizationId) {
      return NextResponse.json({ error: 'Không tìm thấy thành viên trong tổ chức này' }, { status: 404 });
    }

    const currentTargetRole = targetUser.vai_tro as AppRole;

    if (!canManageOrganizationTarget(context.currentUser.vai_tro, currentTargetRole)) {
      return NextResponse.json({ error: 'Bạn không có quyền sửa role của thành viên này' }, { status: 403 });
    }

    if (!canAssignOrganizationRole(context.currentUser.vai_tro, validated.vai_tro)) {
      return NextResponse.json({ error: 'Bạn không có quyền gán role này' }, { status: 403 });
    }

    if (currentTargetRole === 'owner' && validated.vai_tro !== 'owner') {
      const { count, error: ownerCountError } = await supabaseAdmin
        .from('nguoi_dung')
        .select('id', { count: 'exact', head: true })
        .eq('to_chuc_id', context.organizationId)
        .eq('vai_tro', 'owner');

      if (ownerCountError) {
        return NextResponse.json({ error: 'Không thể xác nhận số lượng owner hiện tại' }, { status: 500 });
      }

      if ((count || 0) <= 1) {
        return NextResponse.json({ error: 'Tổ chức cần giữ lại ít nhất một owner' }, { status: 400 });
      }
    }

    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('nguoi_dung')
      .update({ vai_tro: validated.vai_tro })
      .eq('id', validated.user_id)
      .eq('to_chuc_id', context.organizationId)
      .select('id, ten, email, avatar_url, vai_tro, ten_phong_ban, ngay_tao')
      .single();

    if (updateError || !updatedUser) {
      return NextResponse.json({ error: 'Không thể cập nhật role tổ chức' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        ...updatedUser,
        vai_tro: updatedUser.vai_tro as AppRole,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error('Error in PATCH /api/organization-members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
