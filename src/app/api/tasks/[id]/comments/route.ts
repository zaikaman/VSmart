import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendNewCommentEmail, shouldSendNotification } from '@/lib/email/notifications';

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

// GET: Lấy danh sách comments của task
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: taskId } = await params;
        const supabase = await createSupabaseServerClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
        }

        const { data: comments, error } = await supabase
            .from('binh_luan')
            .select(`
                id,
                noi_dung,
                ngay_tao,
                nguoi_dung:nguoi_dung_id (
                    id,
                    ten,
                    email,
                    avatar_url
                )
            `)
            .eq('task_id', taskId)
            .order('ngay_tao', { ascending: true });

        if (error) {
            console.error('Error fetching comments:', error);
            return NextResponse.json({ error: 'Không thể lấy bình luận' }, { status: 500 });
        }

        return NextResponse.json({ data: comments || [] });
    } catch (error) {
        console.error('Comments GET error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}

// POST: Thêm comment mới
export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: taskId } = await params;
        const supabase = await createSupabaseServerClient();

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
        }

        const body = await request.json();
        const { noi_dung } = body;

        if (!noi_dung || noi_dung.trim() === '') {
            return NextResponse.json({ error: 'Nội dung bình luận không được để trống' }, { status: 400 });
        }

        // Lấy nguoi_dung_id từ email
        const { data: nguoiDung, error: userError } = await supabase
            .from('nguoi_dung')
            .select('id, ten')
            .eq('email', user.email)
            .single();

        if (userError || !nguoiDung) {
            console.error('Error finding user:', userError);
            return NextResponse.json({ error: 'Không tìm thấy người dùng' }, { status: 404 });
        }

        // Thêm comment
        const { data: newComment, error: insertError } = await supabase
            .from('binh_luan')
            .insert({
                task_id: taskId,
                nguoi_dung_id: nguoiDung.id,
                noi_dung: noi_dung.trim(),
            })
            .select(`
                id,
                noi_dung,
                ngay_tao,
                nguoi_dung:nguoi_dung_id (
                    id,
                    ten,
                    email,
                    avatar_url
                )
            `)
            .single();

        if (insertError) {
            console.error('Error inserting comment:', insertError);
            return NextResponse.json({ error: 'Không thể thêm bình luận' }, { status: 500 });
        }

        // Gửi email thông báo cho assignee của task (nếu có và khác người comment)
        try {
            const { data: taskData } = await supabase
                .from('task')
                .select(`
                    ten,
                    assignee_id,
                    nguoi_dung:assignee_id (email, ten)
                `)
                .eq('id', taskId)
                .single();

            // nguoi_dung can be array or object depending on Supabase version
            const assignee = Array.isArray(taskData?.nguoi_dung)
                ? taskData.nguoi_dung[0]
                : taskData?.nguoi_dung;

            if (assignee?.email && assignee.email !== user.email) {
                const shouldSend = await shouldSendNotification(assignee.email, 'emailComments');
                if (shouldSend) {
                    sendNewCommentEmail(
                        assignee.email,
                        assignee.ten,
                        {
                            taskId,
                            taskName: taskData?.ten || '',
                            commenterName: nguoiDung.ten,
                            commentContent: noi_dung.trim(),
                        }
                    ).catch(err => console.error('Error sending comment email:', err));
                }
            }
        } catch (emailError) {
            console.error('Error sending comment notification:', emailError);
            // Don't fail the request if email fails
        }

        return NextResponse.json({ data: newComment, message: 'Đã thêm bình luận' }, { status: 201 });
    } catch (error) {
        console.error('Comments POST error:', error);
        return NextResponse.json({ error: 'Lỗi server' }, { status: 500 });
    }
}
