import { NextRequest, NextResponse } from 'next/server';
import { sendProjectInvitationEmail } from '@/lib/email/project-invitation';
import { logActivity } from '@/lib/activity/log';
import { hasPermission } from '@/lib/auth/permissions';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface ProjectMember {
  id: string;
  du_an_id: string;
  nguoi_dung_id: string | null;
  email: string;
  vai_tro: 'owner' | 'admin' | 'member' | 'viewer';
  trang_thai: 'pending' | 'active' | 'declined';
  ngay_moi: string;
  ngay_tham_gia: string | null;
  nguoi_moi_id: string;
  nguoi_dung?: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
}

async function getProjectMembershipContext(projectId: string, email: string) {
  const supabase = await createSupabaseServerClient();
  const { data: membership } = await supabase
    .from('thanh_vien_du_an')
    .select('id, vai_tro, trang_thai')
    .eq('du_an_id', projectId)
    .eq('email', email)
    .eq('trang_thai', 'active')
    .single();

  return membership;
}

function getProjectName(value: unknown) {
  const relation = Array.isArray(value) ? value[0] : value;
  return relation && typeof relation === 'object' && 'ten' in relation
    ? ((relation as { ten?: string }).ten || null)
    : null;
}

async function hasPendingOrganizationInvitation(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  organizationId: string,
  email: string
) {
  const { data, error } = await supabase
    .from('loi_moi_to_chuc')
    .select('id')
    .eq('to_chuc_id', organizationId)
    .eq('email', email)
    .eq('trang_thai', 'pending')
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data?.id);
}

export async function GET(request: NextRequest) {
  try {
    const { authUser } = await getAuthenticatedUserContext();
    const projectId = request.nextUrl.searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId là bắt buộc' }, { status: 400 });
    }

    const membership = await getProjectMembershipContext(projectId, authUser.email);
    if (!membership) {
      return NextResponse.json({ error: 'Bạn không có quyền xem thành viên dự án này' }, { status: 403 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: members, error } = await supabase
      .from('thanh_vien_du_an')
      .select(
        `
          *,
          nguoi_dung:nguoi_dung_id (
            id,
            ten,
            email,
            avatar_url
          )
        `
      )
      .eq('du_an_id', projectId)
      .order('ngay_moi', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Không thể lấy danh sách thành viên' }, { status: 500 });
    }

    return NextResponse.json(members || []);
  } catch (error) {
    console.error('Error fetching project members:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { authUser, dbUser } = await getAuthenticatedUserContext();
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { du_an_id, email, vai_tro = 'member' } = body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!du_an_id || !normalizedEmail) {
      return NextResponse.json({ error: 'du_an_id và email là bắt buộc' }, { status: 400 });
    }

    const membership = await getProjectMembershipContext(du_an_id, authUser.email);
    if (!membership) {
      return NextResponse.json({ error: 'Bạn không có quyền mời thành viên vào dự án này' }, { status: 403 });
    }

    const canManage = hasPermission(
      {
        appRole: dbUser.vai_tro as 'admin' | 'manager' | 'member',
        projectRole: membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
      },
      'manageMembers'
    );

    if (!canManage) {
      return NextResponse.json({ error: 'Bạn không có quyền mời thành viên vào dự án này' }, { status: 403 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Email không hợp lệ' }, { status: 400 });
    }

    const { data: existingMember } = await supabase
      .from('thanh_vien_du_an')
      .select('id')
      .eq('du_an_id', du_an_id)
      .eq('email', normalizedEmail)
      .single();

    if (existingMember) {
      return NextResponse.json({ error: 'Email này đã được mời vào dự án' }, { status: 400 });
    }

    const { data: projectInfoWithOrg, error: projectError } = await supabase
      .from('du_an')
      .select('ten, to_chuc_id')
      .eq('id', du_an_id)
      .single();

    if (projectError || !projectInfoWithOrg) {
      return NextResponse.json({ error: 'Không tìm thấy dự án' }, { status: 404 });
    }

    const { data: organizationData } = await supabase
      .from('to_chuc')
      .select('settings')
      .eq('id', projectInfoWithOrg.to_chuc_id)
      .single();

    const allowExternalProjectInvites =
      !!organizationData?.settings &&
      typeof organizationData.settings === 'object' &&
      'allow_external_project_invites' in organizationData.settings
        ? Boolean((organizationData.settings as { allow_external_project_invites?: boolean }).allow_external_project_invites)
        : false;

    const { data: invitedUser } = await supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    const invitedViaOrganization = !allowExternalProjectInvites
      ? await hasPendingOrganizationInvitation(supabase, projectInfoWithOrg.to_chuc_id, normalizedEmail)
      : false;

    if (!allowExternalProjectInvites) {
      if (!invitedUser?.id && !invitedViaOrganization) {
        return NextResponse.json(
          { error: 'Tổ chức hiện chưa cho phép mời email ngoài tổ chức vào dự án' },
          { status: 400 }
        );
      }

      if (
        invitedUser?.id &&
        invitedUser.to_chuc_id !== projectInfoWithOrg.to_chuc_id &&
        !invitedViaOrganization
      ) {
        return NextResponse.json(
          { error: 'Người được mời cần thuộc cùng tổ chức với dự án này' },
          { status: 400 }
        );
      }
    }

    const { data: member, error: createError } = await supabase
      .from('thanh_vien_du_an')
      .insert({
        du_an_id,
        nguoi_dung_id: invitedUser?.id || null,
        email: normalizedEmail,
        vai_tro,
        trang_thai: 'pending',
        nguoi_moi_id: dbUser.id,
      })
      .select(
        `
          *,
          nguoi_dung:nguoi_dung_id (
            id,
            ten,
            email,
            avatar_url
          )
        `
      )
      .single();

    if (createError || !member) {
      return NextResponse.json({ error: 'Không thể tạo lời mời' }, { status: 500 });
    }

    const projectInfo = projectInfoWithOrg;

    if (invitedUser?.id) {
      await supabase.from('thong_bao').insert({
        nguoi_dung_id: invitedUser.id,
        loai: 'project_invitation',
        noi_dung: `${dbUser.ten} đã mời bạn tham gia dự án "${projectInfo?.ten || 'một dự án'}"`,
        du_an_lien_quan_id: du_an_id,
        thanh_vien_du_an_id: member.id,
      });
    }

    await logActivity({
      entityType: 'project',
      entityId: du_an_id,
      action: 'member_invited',
      actorId: dbUser.id,
      metadata: {
        projectId: du_an_id,
        projectName: projectInfo?.ten || null,
        invitedEmail: normalizedEmail,
        invitedRole: vai_tro,
      },
    });

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await sendProjectInvitationEmail({
        to: normalizedEmail,
        projectName: projectInfo?.ten || 'Dự án',
        inviterName: dbUser.ten,
        inviterEmail: authUser.email,
        role: vai_tro,
        acceptUrl: `${baseUrl}/dashboard?tab=invitations`,
      });
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError);
    }

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Error inviting project member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { authUser, dbUser } = await getAuthenticatedUserContext();
    const supabase = await createSupabaseServerClient();
    const body = await request.json();
    const { member_id, trang_thai, vai_tro } = body;

    if (!member_id) {
      return NextResponse.json({ error: 'member_id là bắt buộc' }, { status: 400 });
    }

    const { data: memberData } = await supabase
      .from('thanh_vien_du_an')
      .select('id, email, du_an_id, vai_tro, du_an:du_an_id(ten)')
      .eq('id', member_id)
      .single();

    if (!memberData) {
      return NextResponse.json({ error: 'Không tìm thấy thành viên' }, { status: 404 });
    }

    if (trang_thai && memberData.email !== authUser.email) {
      return NextResponse.json({ error: 'Bạn chỉ có thể cập nhật trạng thái của chính mình' }, { status: 403 });
    }

    if (vai_tro) {
      const membership = await getProjectMembershipContext(memberData.du_an_id, authUser.email);
      if (!membership) {
        return NextResponse.json({ error: 'Bạn không có quyền thay đổi vai trò thành viên' }, { status: 403 });
      }

      const canManage = hasPermission(
        {
          appRole: dbUser.vai_tro as 'admin' | 'manager' | 'member',
          projectRole: membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
        },
        'manageMembers'
      );

      if (!canManage) {
        return NextResponse.json({ error: 'Bạn không có quyền thay đổi vai trò thành viên' }, { status: 403 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (trang_thai) updateData.trang_thai = trang_thai;
    if (vai_tro) updateData.vai_tro = vai_tro;
    if (trang_thai === 'active') updateData.ngay_tham_gia = new Date().toISOString();

    const { data: updatedMember, error: updateError } = await supabase
      .from('thanh_vien_du_an')
      .update(updateData)
      .eq('id', member_id)
      .select(
        `
          *,
          nguoi_dung:nguoi_dung_id (
            id,
            ten,
            email,
            avatar_url
          )
        `
      )
      .single();

    if (updateError || !updatedMember) {
      return NextResponse.json({ error: 'Không thể cập nhật thành viên' }, { status: 500 });
    }

    await logActivity({
      entityType: 'project',
      entityId: memberData.du_an_id,
      action: 'member_updated',
      actorId: dbUser.id,
      metadata: {
        projectId: memberData.du_an_id,
        projectName: getProjectName(memberData.du_an),
        memberEmail: memberData.email,
        changes: { trang_thai, vai_tro },
      },
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error('Error updating project member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { authUser, dbUser } = await getAuthenticatedUserContext();
    const supabase = await createSupabaseServerClient();
    const memberId = request.nextUrl.searchParams.get('memberId');

    if (!memberId) {
      return NextResponse.json({ error: 'memberId là bắt buộc' }, { status: 400 });
    }

    const { data: memberData } = await supabase
      .from('thanh_vien_du_an')
      .select('id, email, vai_tro, du_an_id, du_an:du_an_id(ten)')
      .eq('id', memberId)
      .single();

    if (!memberData) {
      return NextResponse.json({ error: 'Không tìm thấy thành viên' }, { status: 404 });
    }

    const membership = await getProjectMembershipContext(memberData.du_an_id, authUser.email);
    const canManage = membership
      ? hasPermission(
          {
            appRole: dbUser.vai_tro as 'admin' | 'manager' | 'member',
            projectRole: membership.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
          },
          'manageMembers'
        )
      : false;

    const isSelf = memberData.email === authUser.email;

    if (!canManage && !isSelf) {
      return NextResponse.json({ error: 'Bạn không có quyền xóa thành viên này' }, { status: 403 });
    }

    if (memberData.vai_tro === 'owner' && !isSelf) {
      return NextResponse.json({ error: 'Không thể xóa owner của dự án' }, { status: 400 });
    }

    const { error: deleteError } = await supabase.from('thanh_vien_du_an').delete().eq('id', memberId);
    if (deleteError) {
      return NextResponse.json({ error: 'Không thể xóa thành viên' }, { status: 500 });
    }

    await logActivity({
      entityType: 'project',
      entityId: memberData.du_an_id,
      action: 'member_removed',
      actorId: dbUser.id,
      metadata: {
        projectId: memberData.du_an_id,
        projectName: getProjectName(memberData.du_an),
        memberEmail: memberData.email,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project member:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
