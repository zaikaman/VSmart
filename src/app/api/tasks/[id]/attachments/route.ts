import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { uploadFileToCloudinary } from '@/lib/cloudinary/config';
import { getTaskAccessContext } from '@/lib/tasks/auth';
import { MAX_TASK_ATTACHMENT_SIZE } from '@/lib/tasks/attachments';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await getTaskAccessContext(id);

    const { data, error } = await supabaseAdmin
      .from('task_attachment')
      .select(
        `
        *,
        nguoi_dung:uploaded_by (
          id,
          ten,
          email,
          avatar_url
        )
      `
      )
      .eq('task_id', id)
      .order('ngay_tao', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('GET attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAccessContext(id);
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Vui lòng chọn file' }, { status: 400 });
    }

    if (file.size > MAX_TASK_ATTACHMENT_SIZE) {
      return NextResponse.json({ error: 'Kích thước file không được vượt quá 10MB' }, { status: 400 });
    }

    const uploadResult = await uploadFileToCloudinary(file, `vsmart/tasks/${id}/attachments`);

    const { data, error } = await supabaseAdmin
      .from('task_attachment')
      .insert({
        task_id: id,
        file_name: file.name,
        file_url: uploadResult.url,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
        cloudinary_public_id: uploadResult.publicId,
        uploaded_by: auth.dbUser.id,
      })
      .select(
        `
        *,
        nguoi_dung:uploaded_by (
          id,
          ten,
          email,
          avatar_url
        )
      `
      )
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Không thể lưu file đính kèm' }, { status: 400 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST attachments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
