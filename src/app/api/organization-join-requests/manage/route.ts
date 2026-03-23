import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canManageOrganizationRoles, type AppRole } from '@/lib/auth/permissions';
import { getAuthenticatedUserContext } from '@/lib/tasks/auth';
import { supabaseAdmin } from '@/lib/supabase/client';

export interface OrganizationJoinRequest {
  id: string;
  email: string;
  trang_thai: 'pending' | 'approved' | 'rejected' | 'cancelled';
  ngay_gui: string;
  ngay_phan_hoi: string | null;
  nguoi_dung: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
    ten_phong_ban: string | null;
  };
}

const updateJoinRequestSchema = z.object({
  request_id: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
});

function extractSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

async function getManageContext() {
  const { dbUser } = await getAuthenticatedUserContext();

  const { data: currentUser } = await supabaseAdmin
    .from('nguoi_dung')
    .select('id, vai_tro, to_chuc_id')
    .eq('id', dbUser.id)
    .single();

  if (!currentUser?.to_chuc_id) {
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
    const context = await getManageContext();

    if (!context) {
      return NextResponse.json({ error: 'Bạn chưa thuộc tổ chức nào' }, { status: 404 });
    }

    if (!canManageOrganizationRoles(context.currentUser.vai_tro)) {
      return NextResponse.json({ error: 'Bạn không có quyền duyệt yêu cầu gia nhập' }, { status: 403 });
    }

    const { data, error } = await supabaseAdmin
      .from('yeu_cau_gia_nhap_to_chuc')
      .select(
        `
          id,
          email,
          trang_thai,
          ngay_gui,
          ngay_phan_hoi,
          nguoi_dung:nguoi_dung_id (
            id,
            ten,
            email,
            avatar_url,
            ten_phong_ban
          )
        `
      )
      .eq('to_chuc_id', context.organizationId)
      .order('ngay_gui', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Không thể tải yêu cầu gia nhập' }, { status: 500 });
    }

    const normalizedData: OrganizationJoinRequest[] = (data || []).map((item) => ({
      ...item,
      nguoi_dung: extractSingleRelation(item.nguoi_dung)!,
    }));

    return NextResponse.json(normalizedData);
  } catch (error) {
    console.error('Error in GET /api/organization-join-requests/manage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getManageContext();

    if (!context) {
      return NextResponse.json({ error: 'Bạn chưa thuộc tổ chức nào' }, { status: 404 });
    }

    if (!canManageOrganizationRoles(context.currentUser.vai_tro)) {
      return NextResponse.json({ error: 'Bạn không có quyền duyệt yêu cầu gia nhập' }, { status: 403 });
    }

    const body = await request.json();
    const validated = updateJoinRequestSchema.parse(body);

    const { data: joinRequest, error: requestError } = await supabaseAdmin
      .from('yeu_cau_gia_nhap_to_chuc')
      .select('id, to_chuc_id, nguoi_dung_id, trang_thai')
      .eq('id', validated.request_id)
      .eq('to_chuc_id', context.organizationId)
      .eq('trang_thai', 'pending')
      .single();

    if (requestError || !joinRequest) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu hợp lệ' }, { status: 404 });
    }

    if (validated.action === 'reject') {
      const { error } = await supabaseAdmin
        .from('yeu_cau_gia_nhap_to_chuc')
        .update({
          trang_thai: 'rejected',
          nguoi_duyet_id: context.currentUser.id,
          ngay_phan_hoi: new Date().toISOString(),
        })
        .eq('id', joinRequest.id);

      if (error) {
        return NextResponse.json({ error: 'Không thể từ chối yêu cầu' }, { status: 500 });
      }

      return NextResponse.json({ message: 'Đã từ chối yêu cầu gia nhập' });
    }

    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('id', joinRequest.nguoi_dung_id)
      .single();

    if (requesterError || !requester) {
      return NextResponse.json({ error: 'Không tìm thấy người gửi yêu cầu' }, { status: 404 });
    }

    if (requester.to_chuc_id && requester.to_chuc_id !== context.organizationId) {
      return NextResponse.json({ error: 'Người này đã thuộc một tổ chức khác' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { error: updateUserError } = await supabaseAdmin
      .from('nguoi_dung')
      .update({
        to_chuc_id: context.organizationId,
        vai_tro: 'member',
      })
      .eq('id', requester.id);

    if (updateUserError) {
      return NextResponse.json({ error: 'Không thể thêm người dùng vào tổ chức' }, { status: 500 });
    }

    const { error: updateRequestError } = await supabaseAdmin
      .from('yeu_cau_gia_nhap_to_chuc')
      .update({
        trang_thai: 'approved',
        nguoi_duyet_id: context.currentUser.id,
        ngay_phan_hoi: now,
      })
      .eq('id', joinRequest.id);

    if (updateRequestError) {
      return NextResponse.json({ error: 'Không thể cập nhật trạng thái yêu cầu' }, { status: 500 });
    }

    await supabaseAdmin
      .from('yeu_cau_gia_nhap_to_chuc')
      .update({
        trang_thai: 'cancelled',
        nguoi_duyet_id: context.currentUser.id,
        ngay_phan_hoi: now,
      })
      .eq('nguoi_dung_id', requester.id)
      .neq('id', joinRequest.id)
      .eq('trang_thai', 'pending');

    return NextResponse.json({ message: 'Đã duyệt yêu cầu và thêm thành viên vào tổ chức' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    console.error('Error in PATCH /api/organization-join-requests/manage:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
