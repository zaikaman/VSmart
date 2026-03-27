import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canManageOrganizationRoles, type AppRole } from '@/lib/auth/permissions';
import { sendOrganizationInvitationEmail } from '@/lib/email/organization-invitation';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';

export interface OrganizationInvitation {
  id: string;
  email: string;
  vai_tro: 'admin' | 'manager' | 'member';
  trang_thai: 'pending' | 'accepted' | 'declined' | 'cancelled';
  ngay_moi: string;
  ngay_phan_hoi: string | null;
  nguoi_dung_id: string | null;
  nguoi_moi: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
}

const createInvitationSchema = z.object({
  email: z.string().email(),
  vai_tro: z.enum(['admin', 'manager', 'member']),
});

function extractSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

async function getManageContext() {
  const { authUser, dbUser } = await getAuthenticatedUserContext();

  const { data: currentUser } = await supabaseAdmin
    .from('nguoi_dung')
    .select('to_chuc_id')
    .eq('id', dbUser.id)
    .single();

  if (!currentUser?.to_chuc_id) {
    return null;
  }

  return {
    authUser,
    dbUser: {
      ...dbUser,
      vai_tro: dbUser.vai_tro as AppRole,
    },
    organizationId: currentUser.to_chuc_id,
  };
}

export async function GET() {
  try {
    const context = await getManageContext();

    if (!context) {
      return NextResponse.json({ error: 'Bạn chưa thuộc tổ chức nào' }, { status: 404 });
    }

    const { data, error } = await supabaseAdmin
      .from('loi_moi_to_chuc')
      .select(
        `
          id,
          email,
          vai_tro,
          trang_thai,
          ngay_moi,
          ngay_phan_hoi,
          nguoi_dung_id,
          nguoi_moi:nguoi_moi_id (
            id,
            ten,
            email,
            avatar_url
          )
        `
      )
      .eq('to_chuc_id', context.organizationId)
      .order('ngay_moi', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Không thể tải danh sách lời mời tổ chức' }, { status: 500 });
    }

    const normalizedData: OrganizationInvitation[] = (data || []).map((item) => ({
      ...item,
      nguoi_moi: extractSingleRelation(item.nguoi_moi)!,
    }));

    return NextResponse.json(normalizedData);
  } catch (error) {
    console.error('Error in GET /api/organization-members/invitations/manage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getManageContext();

    if (!context) {
      return NextResponse.json({ error: 'Bạn chưa thuộc tổ chức nào' }, { status: 404 });
    }

    if (!canManageOrganizationRoles(context.dbUser.vai_tro)) {
      return NextResponse.json({ error: 'Bạn không có quyền mời thành viên vào tổ chức' }, { status: 403 });
    }

    const body = await request.json();
    const validated = createInvitationSchema.parse(body);
    const normalizedEmail = validated.email.trim().toLowerCase();

    if (normalizedEmail === context.authUser.email?.toLowerCase()) {
      return NextResponse.json({ error: 'Bạn đang dùng chính email của mình' }, { status: 400 });
    }

    if (context.dbUser.vai_tro === 'admin' && validated.vai_tro === 'admin') {
      return NextResponse.json({ error: 'Admin không thể mời thêm admin mới' }, { status: 403 });
    }

    const [{ data: organization }, { data: invitedUser }, { data: existingInvitation }] = await Promise.all([
      supabaseAdmin.from('to_chuc').select('id, ten').eq('id', context.organizationId).single(),
      supabaseAdmin.from('nguoi_dung').select('id, to_chuc_id').eq('email', normalizedEmail).maybeSingle(),
      supabaseAdmin
        .from('loi_moi_to_chuc')
        .select('id')
        .eq('to_chuc_id', context.organizationId)
        .eq('email', normalizedEmail)
        .eq('trang_thai', 'pending')
        .maybeSingle(),
    ]);

    if (!organization) {
      return NextResponse.json({ error: 'Không tìm thấy tổ chức' }, { status: 404 });
    }

    if (existingInvitation) {
      return NextResponse.json({ error: 'Email này đã có lời mời đang chờ phản hồi' }, { status: 400 });
    }

    if (invitedUser?.to_chuc_id === context.organizationId) {
      return NextResponse.json({ error: 'Người này đã thuộc tổ chức' }, { status: 400 });
    }

    if (invitedUser?.to_chuc_id && invitedUser.to_chuc_id !== context.organizationId) {
      return NextResponse.json({ error: 'Email này đang thuộc một tổ chức khác' }, { status: 400 });
    }

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('loi_moi_to_chuc')
      .insert({
        to_chuc_id: context.organizationId,
        nguoi_dung_id: invitedUser?.id || null,
        email: normalizedEmail,
        vai_tro: validated.vai_tro,
        nguoi_moi_id: context.dbUser.id,
      })
      .select(
        `
          id,
          email,
          vai_tro,
          trang_thai,
          ngay_moi,
          ngay_phan_hoi,
          nguoi_dung_id,
          nguoi_moi:nguoi_moi_id (
            id,
            ten,
            email,
            avatar_url
          )
        `
      )
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Không thể tạo lời mời tổ chức' }, { status: 500 });
    }

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      await sendOrganizationInvitationEmail({
        to: normalizedEmail,
        organizationName: organization.ten,
        inviterName: context.dbUser.ten,
        inviterEmail: context.authUser.email || '',
        role: validated.vai_tro,
        acceptUrl: `${baseUrl}/onboarding`,
      });
    } catch (emailError) {
      console.error('Error sending organization invitation email:', emailError);
    }

    return NextResponse.json(
      {
        data: {
          ...invitation,
          nguoi_moi: extractSingleRelation(invitation.nguoi_moi)!,
        } satisfies OrganizationInvitation,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    console.error('Error in POST /api/organization-members/invitations/manage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
