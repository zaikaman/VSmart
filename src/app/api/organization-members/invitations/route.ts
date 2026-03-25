import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendInvitationResponseEmail } from '@/lib/email/workflow';
import { supabaseAdmin } from '@/lib/supabase/client';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface MyOrganizationInvitation {
  id: string;
  email: string;
  vai_tro: 'admin' | 'manager' | 'member';
  trang_thai: 'pending' | 'accepted' | 'declined' | 'cancelled';
  ngay_moi: string;
  to_chuc: {
    id: string;
    ten: string;
    mo_ta: string | null;
  };
  nguoi_moi: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
}

const respondInvitationSchema = z.object({
  invitation_id: z.string().uuid(),
  action: z.enum(['accept', 'decline']),
});

function extractSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) {
    return null;
  }

  const { data: dbUser } = await supabaseAdmin
    .from('nguoi_dung')
    .select('id, email, ten, to_chuc_id')
    .eq('email', user.email)
    .single();

  if (!dbUser) {
    return null;
  }

  return dbUser;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
          to_chuc:to_chuc_id (
            id,
            ten,
            mo_ta
          ),
          nguoi_moi:nguoi_moi_id (
            id,
            ten,
            email,
            avatar_url
          )
        `
      )
      .eq('email', currentUser.email.toLowerCase())
      .eq('trang_thai', 'pending')
      .order('ngay_moi', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Không thể tải lời mời tổ chức' }, { status: 500 });
    }

    const normalizedData: MyOrganizationInvitation[] = (data || []).map((item) => ({
      ...item,
      to_chuc: extractSingleRelation(item.to_chuc)!,
      nguoi_moi: extractSingleRelation(item.nguoi_moi)!,
    }));

    return NextResponse.json(normalizedData);
  } catch (error) {
    console.error('Error in GET /api/organization-members/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = respondInvitationSchema.parse(body);

    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('loi_moi_to_chuc')
      .select(
        `
          id,
          to_chuc_id,
          email,
          vai_tro,
          trang_thai,
          to_chuc:to_chuc_id (
            id,
            ten
          ),
          nguoi_moi:nguoi_moi_id (
            id,
            ten,
            email
          )
        `
      )
      .eq('id', validated.invitation_id)
      .eq('email', currentUser.email.toLowerCase())
      .eq('trang_thai', 'pending')
      .single();

    if (invitationError || !invitation) {
      return NextResponse.json({ error: 'Không tìm thấy lời mời hợp lệ' }, { status: 404 });
    }

    const organization = extractSingleRelation(invitation.to_chuc);
    const inviter = extractSingleRelation(invitation.nguoi_moi);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (validated.action === 'decline') {
      const { error } = await supabaseAdmin
        .from('loi_moi_to_chuc')
        .update({
          trang_thai: 'declined',
          ngay_phan_hoi: new Date().toISOString(),
          nguoi_dung_id: currentUser.id,
        })
        .eq('id', invitation.id);

      if (error) {
        return NextResponse.json({ error: 'Không thể từ chối lời mời' }, { status: 500 });
      }

      if (organization?.ten && inviter?.email) {
        sendInvitationResponseEmail({
          to: inviter.email,
          inviterName: inviter.ten || 'Bạn',
          responderName: currentUser.ten || currentUser.email,
          responderEmail: currentUser.email,
          entityName: organization.ten,
          entityType: 'organization',
          response: 'declined',
          reviewUrl: `${baseUrl}/dashboard/settings`,
        }).catch((emailError) =>
          console.error('Error sending organization invitation decline email:', emailError)
        );
      }

      return NextResponse.json({ message: 'Đã từ chối lời mời tổ chức' });
    }

    if (currentUser.to_chuc_id && currentUser.to_chuc_id !== invitation.to_chuc_id) {
      return NextResponse.json({ error: 'Bạn đang thuộc một tổ chức khác' }, { status: 400 });
    }

    const { error: updateUserError } = await supabaseAdmin
      .from('nguoi_dung')
      .update({
        to_chuc_id: invitation.to_chuc_id,
        vai_tro: invitation.vai_tro,
      })
      .eq('id', currentUser.id);

    if (updateUserError) {
      return NextResponse.json({ error: 'Không thể cập nhật tổ chức cho tài khoản này' }, { status: 500 });
    }

    const { error: updateInvitationError } = await supabaseAdmin
      .from('loi_moi_to_chuc')
      .update({
        trang_thai: 'accepted',
        ngay_phan_hoi: new Date().toISOString(),
        nguoi_dung_id: currentUser.id,
      })
      .eq('id', invitation.id);

    if (updateInvitationError) {
      return NextResponse.json({ error: 'Không thể cập nhật trạng thái lời mời' }, { status: 500 });
    }

    if (organization?.ten && inviter?.email) {
      sendInvitationResponseEmail({
        to: inviter.email,
        inviterName: inviter.ten || 'Bạn',
        responderName: currentUser.ten || currentUser.email,
        responderEmail: currentUser.email,
        entityName: organization.ten,
        entityType: 'organization',
        response: 'accepted',
        reviewUrl: `${baseUrl}/dashboard/settings`,
      }).catch((emailError) =>
        console.error('Error sending organization invitation accept email:', emailError)
      );
    }

    return NextResponse.json({ message: 'Đã tham gia tổ chức thành công' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error('Error in PATCH /api/organization-members/invitations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
