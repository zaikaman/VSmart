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
  phong_ban_id: string | null;
  ten_phong_ban: string | null;
  phong_ban_trang_thai: 'active' | 'inactive' | 'merged' | null;
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

const updateMemberSchema = z
  .object({
    user_id: z.string().uuid(),
    vai_tro: z.enum(['owner', 'admin', 'manager', 'member']).optional(),
    phong_ban_id: z.string().uuid().nullable().optional(),
  })
  .refine(
    (value) => value.vai_tro !== undefined || value.phong_ban_id !== undefined,
    'Cần ít nhất một thay đổi để cập nhật.'
  );

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

async function getOrganizationMembers(organizationId: string) {
  const { data: members, error } = await supabaseAdmin
    .from('nguoi_dung')
    .select('id, ten, email, avatar_url, vai_tro, phong_ban_id, ten_phong_ban, ngay_tao')
    .eq('to_chuc_id', organizationId)
    .order('ten', { ascending: true });

  if (error) {
    return { error };
  }

  const departmentIds = (members || [])
    .map((member) => member.phong_ban_id)
    .filter((value): value is string => Boolean(value));

  const departmentStatuses =
    departmentIds.length > 0
      ? await supabaseAdmin
          .from('phong_ban')
          .select('id, trang_thai')
          .in('id', departmentIds)
      : { data: [] as Array<{ id: string; trang_thai: 'active' | 'inactive' | 'merged' }>, error: null };

  if (departmentStatuses.error) {
    return { error: departmentStatuses.error };
  }

  const statusMap = new Map(
    (departmentStatuses.data || []).map((department) => [department.id, department.trang_thai])
  );

  return {
    data: (members || [])
      .map((member) => ({
        ...member,
        vai_tro: member.vai_tro as AppRole,
        phong_ban_trang_thai: member.phong_ban_id
          ? statusMap.get(member.phong_ban_id) || null
          : null,
      }))
      .sort(sortMembers),
  };
}

export async function GET() {
  try {
    const context = await getOrgMemberContext();

    if (!context) {
      return NextResponse.json({ error: 'Bạn chưa thuộc tổ chức nào' }, { status: 404 });
    }

    const membersResult = await getOrganizationMembers(context.organizationId);

    if ('error' in membersResult && membersResult.error) {
      return NextResponse.json(
        { error: 'Không thể lấy danh sách thành viên tổ chức' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: membersResult.data,
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
      return NextResponse.json(
        { error: 'Bạn không có quyền điều chỉnh thành viên tổ chức' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = updateMemberSchema.parse(body);

    const { data: targetUser, error: targetError } = await supabaseAdmin
      .from('nguoi_dung')
      .select('id, ten, email, vai_tro, to_chuc_id, phong_ban_id')
      .eq('id', validated.user_id)
      .single();

    if (targetError || !targetUser || targetUser.to_chuc_id !== context.organizationId) {
      return NextResponse.json(
        { error: 'Không tìm thấy thành viên trong tổ chức này' },
        { status: 404 }
      );
    }

    const currentTargetRole = targetUser.vai_tro as AppRole;
    const isSelf = validated.user_id === context.currentUser.id;
    const canManageTarget =
      isSelf || canManageOrganizationTarget(context.currentUser.vai_tro, currentTargetRole);

    if (!canManageTarget) {
      return NextResponse.json(
        { error: 'Bạn không có quyền chỉnh thành viên này' },
        { status: 403 }
      );
    }

    if (validated.vai_tro !== undefined) {
      if (isSelf) {
        return NextResponse.json(
          { error: 'Không thể tự điều chỉnh role của chính mình ở đây' },
          { status: 400 }
        );
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
          return NextResponse.json(
            { error: 'Không thể xác nhận số lượng owner hiện tại' },
            { status: 500 }
          );
        }

        if ((count || 0) <= 1) {
          return NextResponse.json(
            { error: 'Tổ chức cần giữ lại ít nhất một owner' },
            { status: 400 }
          );
        }
      }
    }

    let nextDepartmentName: string | null | undefined = undefined;

    if (validated.phong_ban_id !== undefined) {
      if (validated.phong_ban_id === null) {
        nextDepartmentName = null;
      } else {
        const { data: department, error: departmentError } = await supabaseAdmin
          .from('phong_ban')
          .select('id, ten, trang_thai')
          .eq('id', validated.phong_ban_id)
          .eq('to_chuc_id', context.organizationId)
          .maybeSingle();

        if (departmentError || !department) {
          return NextResponse.json({ error: 'Không tìm thấy phòng ban.' }, { status: 404 });
        }

        if (department.trang_thai !== 'active') {
          return NextResponse.json(
            { error: 'Chỉ có thể gán thành viên vào phòng ban đang dùng.' },
            { status: 400 }
          );
        }

        nextDepartmentName = department.ten;
      }
    }

    const updateData: Record<string, string | null> = {};

    if (validated.vai_tro !== undefined) {
      updateData.vai_tro = validated.vai_tro;
    }

    if (validated.phong_ban_id !== undefined) {
      updateData.phong_ban_id = validated.phong_ban_id;
      updateData.ten_phong_ban = nextDepartmentName ?? null;
    }

    const { error: updateError } = await supabaseAdmin
      .from('nguoi_dung')
      .update(updateData)
      .eq('id', validated.user_id)
      .eq('to_chuc_id', context.organizationId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Không thể cập nhật thông tin thành viên tổ chức' },
        { status: 500 }
      );
    }

    const membersResult = await getOrganizationMembers(context.organizationId);

    if ('error' in membersResult && membersResult.error) {
      return NextResponse.json(
        { error: 'Cập nhật thành công nhưng không thể tải lại thành viên.' },
        { status: 500 }
      );
    }

    const updatedMember = membersResult.data.find((member) => member.id === validated.user_id);

    return NextResponse.json({
      data: updatedMember,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    console.error('Error in PATCH /api/organization-members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
