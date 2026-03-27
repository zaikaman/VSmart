import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendNewCommentEmail, shouldSendNotification } from '@/lib/email/notifications';
import { logActivity } from '@/lib/activity/log';

const createCommentSchema = z.object({
  noi_dung: z
    .string({ error: 'Nội dung bình luận không được để trống.' })
    .trim()
    .min(1, 'Nội dung bình luận không được để trống.')
    .max(2000, 'Nội dung bình luận không được vượt quá 2000 ký tự.'),
});

interface Comment {
  id: string;
  noi_dung: string;
  ngay_tao: string;
  nguoi_dung: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
}

function normalizeComment(comment: {
  id: string;
  noi_dung: string;
  ngay_tao: string;
  nguoi_dung: Comment['nguoi_dung'] | Comment['nguoi_dung'][];
}): Comment {
  return {
    ...comment,
    nguoi_dung: Array.isArray(comment.nguoi_dung) ? comment.nguoi_dung[0] : comment.nguoi_dung,
  };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const { data: comments, error } = await supabase
      .from('binh_luan')
      .select(
        `
          id,
          noi_dung,
          ngay_tao,
          nguoi_dung:nguoi_dung_id (
            id,
            ten,
            email,
            avatar_url
          )
        `
      )
      .eq('task_id', taskId)
      .order('ngay_tao', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      return NextResponse.json({ error: 'Không thể lấy bình luận' }, { status: 500 });
    }

    return NextResponse.json({ data: (comments || []).map((item) => normalizeComment(item as never)) });
  } catch (error) {
    console.error('Comments GET error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }

    const body = await request.json();
    const validated = createCommentSchema.parse(body);
    const noiDung = validated.noi_dung;

    const { data: nguoiDung, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, ten')
      .eq('email', user.email)
      .single();

    if (userError || !nguoiDung) {
      console.error('Error finding user:', userError);
      return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
    }

    const { data: taskContext, error: taskContextError } = await supabase
      .from('task')
      .select(
        `
          id,
          ten,
          assignee_id,
          phan_du_an (
            id,
            du_an_id
          ),
          nguoi_dung:assignee_id (email, ten)
        `
      )
      .eq('id', taskId)
      .is('deleted_at', null)
      .single();

    if (taskContextError || !taskContext) {
      return NextResponse.json({ error: 'Không tìm thấy task' }, { status: 404 });
    }

    const partRelation = Array.isArray(taskContext.phan_du_an)
      ? taskContext.phan_du_an[0]
      : taskContext.phan_du_an;
    const projectId = partRelation?.du_an_id;

    if (projectId) {
      const { data: membership } = await supabase
        .from('thanh_vien_du_an')
        .select('id')
        .eq('du_an_id', projectId)
        .eq('email', user.email)
        .eq('trang_thai', 'active')
        .single();

      if (!membership) {
        return NextResponse.json({ error: 'Bạn không có quyền bình luận trong task này' }, { status: 403 });
      }
    }

    const { data: newComment, error: insertError } = await supabase
      .from('binh_luan')
      .insert({
        task_id: taskId,
        nguoi_dung_id: nguoiDung.id,
        noi_dung: noiDung,
      })
      .select(
        `
          id,
          noi_dung,
          ngay_tao,
          nguoi_dung:nguoi_dung_id (
            id,
            ten,
            email,
            avatar_url
          )
        `
      )
      .single();

    if (insertError || !newComment) {
      console.error('Error inserting comment:', insertError);
      return NextResponse.json({ error: 'Không thể thêm bình luận' }, { status: 500 });
    }

    await logActivity({
      entityType: 'comment',
      entityId: newComment.id,
      action: 'comment_created',
      actorId: nguoiDung.id,
      metadata: {
        projectId,
        partId: partRelation?.id || null,
        taskId,
        taskName: taskContext.ten,
      },
    });

    try {
      const assignee = Array.isArray(taskContext.nguoi_dung)
        ? taskContext.nguoi_dung[0]
        : taskContext.nguoi_dung;

      if (assignee?.email && assignee.email !== user.email) {
        const shouldSend = await shouldSendNotification(assignee.email, 'emailComments');
        if (shouldSend) {
          sendNewCommentEmail(assignee.email, assignee.ten, {
            taskId,
            taskName: taskContext.ten || '',
            commenterName: nguoiDung.ten,
            commentContent: noiDung,
          }).catch((err) => console.error('Error sending comment email:', err));
        }
      }
    } catch (emailError) {
      console.error('Error sending comment notification:', emailError);
    }

    return NextResponse.json(
      { data: newComment, message: 'Đã thêm bình luận' },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Dữ liệu bình luận không hợp lệ.' }, { status: 400 });
    }

    console.error('Comments POST error:', error);
    return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
  }
}
