import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/client';
import { deleteFromCloudinary } from '@/lib/cloudinary/config';
import { getTaskAccessContext } from '@/lib/tasks/auth';

async function getAttachment(taskId: string, attachmentId: string) {
  const { data, error } = await supabaseAdmin
    .from('task_attachment')
    .select('*')
    .eq('id', attachmentId)
    .eq('task_id', taskId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    await getTaskAccessContext(id);
    const attachment = await getAttachment(id, attachmentId);

    if (!attachment) {
      return NextResponse.json({ error: 'Không tìm thấy file đính kèm' }, { status: 404 });
    }

    return NextResponse.json({ data: attachment });
  } catch (error) {
    console.error('GET attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params;
    await getTaskAccessContext(id);
    const attachment = await getAttachment(id, attachmentId);

    if (!attachment) {
      return NextResponse.json({ error: 'Không tìm thấy file đính kèm' }, { status: 404 });
    }

    if (attachment.cloudinary_public_id) {
      await deleteFromCloudinary(attachment.cloudinary_public_id);
    }

    const { error } = await supabaseAdmin
      .from('task_attachment')
      .delete()
      .eq('id', attachmentId)
      .eq('task_id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE attachment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
