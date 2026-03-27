import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendOrganizationJoinRequestEmail } from '@/lib/email/organization-join-request';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import type { Organization } from '@/app/api/organizations/route';

export interface MyOrganizationJoinRequest {
  id: string;
  trang_thai: 'pending' | 'approved' | 'rejected' | 'cancelled';
  ngay_gui: string;
  ngay_phan_hoi: string | null;
  to_chuc: {
    id: string;
    ten: string;
    mo_ta: string | null;
  };
}

const createJoinRequestSchema = z.object({
  to_chuc_id: z.string().uuid(),
});

const cancelJoinRequestSchema = z.object({
  request_id: z.string().uuid(),
  action: z.literal('cancel'),
});

function extractSingleRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] || null;
  }

  return value || null;
}

function allowsJoinRequests(settings: Organization['settings'] | Record<string, unknown> | null | undefined) {
  return Boolean(settings && 'allow_join_requests' in settings && settings.allow_join_requests);
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
    .select('id, ten, email, ten_phong_ban, to_chuc_id')
    .eq('email', user.email)
    .single();

  return dbUser || null;
}

async function notifyOrganizationReviewers(params: {
  organizationId: string;
  organizationName: string;
  requester: {
    id: string;
    ten: string;
    email: string;
    ten_phong_ban: string | null;
  };
}) {
  const { data: reviewers, error } = await supabaseAdmin
    .from('nguoi_dung')
    .select('id, email')
    .eq('to_chuc_id', params.organizationId)
    .in('vai_tro', ['owner', 'admin']);

  if (error || !reviewers?.length) {
    if (error) {
      console.error('Error loading organization reviewers:', error);
    }
    return;
  }

  const notificationRows = reviewers.map((reviewer) => ({
    nguoi_dung_id: reviewer.id,
    loai: 'organization_join_request' as const,
    noi_dung: `${params.requester.ten} vừa gửi yêu cầu tham gia tổ chức. Mở cài đặt để xem và xử lý.`,
  }));

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const reviewUrl = `${baseUrl}/dashboard/settings`;

  const tasks = [
    supabaseAdmin.from('thong_bao').insert(notificationRows),
    ...reviewers
      .filter((reviewer) => Boolean(reviewer.email))
      .map((reviewer) =>
        sendOrganizationJoinRequestEmail({
          to: reviewer.email,
          organizationName: params.organizationName,
          requesterName: params.requester.ten,
          requesterEmail: params.requester.email,
          requesterDepartment: params.requester.ten_phong_ban,
          reviewUrl,
        })
      ),
  ];

  const results = await Promise.allSettled(tasks);

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      console.error(`Error notifying organization reviewer at index ${index}:`, result.reason);
    }
  });
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabaseAdmin
      .from('yeu_cau_gia_nhap_to_chuc')
      .select(
        `
          id,
          trang_thai,
          ngay_gui,
          ngay_phan_hoi,
          to_chuc:to_chuc_id (
            id,
            ten,
            mo_ta
          )
        `
      )
      .eq('nguoi_dung_id', currentUser.id)
      .order('ngay_gui', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Không thể tải yêu cầu gia nhập' }, { status: 500 });
    }

    const normalizedData: MyOrganizationJoinRequest[] = (data || []).map((item) => ({
      ...item,
      to_chuc: extractSingleRelation(item.to_chuc)!,
    }));

    return NextResponse.json(normalizedData);
  } catch (error) {
    console.error('Error in GET /api/organization-join-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();

    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (currentUser.to_chuc_id) {
      return NextResponse.json({ error: 'Bạn đã thuộc một tổ chức' }, { status: 400 });
    }

    const body = await request.json();
    const validated = createJoinRequestSchema.parse(body);

    const [{ data: organization, error: organizationError }, { data: existingRequest }] = await Promise.all([
      supabaseAdmin.from('to_chuc').select('id, ten, settings').eq('id', validated.to_chuc_id).single(),
      supabaseAdmin
        .from('yeu_cau_gia_nhap_to_chuc')
        .select('id')
        .eq('to_chuc_id', validated.to_chuc_id)
        .eq('nguoi_dung_id', currentUser.id)
        .eq('trang_thai', 'pending')
        .maybeSingle(),
    ]);

    if (organizationError || !organization) {
      return NextResponse.json({ error: 'Không tìm thấy tổ chức' }, { status: 404 });
    }

    if (!allowsJoinRequests(organization.settings as Organization['settings'])) {
      return NextResponse.json({ error: 'Tổ chức này hiện không nhận yêu cầu gia nhập' }, { status: 400 });
    }

    if (existingRequest) {
      return NextResponse.json({ error: 'Bạn đã gửi yêu cầu đến tổ chức này rồi' }, { status: 400 });
    }

    const { data: requestData, error: createError } = await supabaseAdmin
      .from('yeu_cau_gia_nhap_to_chuc')
      .insert({
        to_chuc_id: validated.to_chuc_id,
        nguoi_dung_id: currentUser.id,
        email: currentUser.email.toLowerCase(),
      })
      .select(
        `
          id,
          trang_thai,
          ngay_gui,
          ngay_phan_hoi,
          to_chuc:to_chuc_id (
            id,
            ten,
            mo_ta
          )
        `
      )
      .single();

    if (createError || !requestData) {
      return NextResponse.json({ error: 'Không thể gửi yêu cầu gia nhập' }, { status: 500 });
    }

    await notifyOrganizationReviewers({
      organizationId: organization.id,
      organizationName: organization.ten,
      requester: {
        id: currentUser.id,
        ten: currentUser.ten,
        email: currentUser.email,
        ten_phong_ban: currentUser.ten_phong_ban,
      },
    });

    return NextResponse.json(
      {
        data: {
          ...requestData,
          to_chuc: extractSingleRelation(requestData.to_chuc)!,
        } satisfies MyOrganizationJoinRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    console.error('Error in POST /api/organization-join-requests:', error);
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
    const validated = cancelJoinRequestSchema.parse(body);

    const { data: joinRequest, error: joinRequestError } = await supabaseAdmin
      .from('yeu_cau_gia_nhap_to_chuc')
      .select('id')
      .eq('id', validated.request_id)
      .eq('nguoi_dung_id', currentUser.id)
      .eq('trang_thai', 'pending')
      .single();

    if (joinRequestError || !joinRequest) {
      return NextResponse.json({ error: 'Không tìm thấy yêu cầu đang chờ để hủy' }, { status: 404 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('yeu_cau_gia_nhap_to_chuc')
      .update({
        trang_thai: 'cancelled',
        ngay_phan_hoi: new Date().toISOString(),
      })
      .eq('id', joinRequest.id);

    if (updateError) {
      return NextResponse.json({ error: 'Không thể hủy yêu cầu gia nhập' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Đã rút yêu cầu gia nhập' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu không hợp lệ.' }, { status: 400 });
    }

    console.error('Error in PATCH /api/organization-join-requests:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
