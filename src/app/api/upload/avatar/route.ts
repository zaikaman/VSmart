import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { uploadToCloudinary, deleteFromCloudinary } from '@/lib/cloudinary/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/upload/avatar - Upload avatar mới
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Lấy thông tin user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Lấy file từ form data
    const formData = await request.formData();
    const file = formData.get('avatar') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'Vui lòng chọn file ảnh' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File phải là định dạng ảnh' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Kích thước file không được vượt quá 5MB' },
        { status: 400 }
      );
    }

    // Lấy thông tin user từ database
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, avatar_url')
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Upload ảnh mới lên Cloudinary
    const { url: newAvatarUrl, publicId } = await uploadToCloudinary(
      file,
      `vsmart/avatars/${userData.id}`
    );

    // Xóa ảnh cũ nếu có (chỉ xóa nếu là ảnh từ Cloudinary)
    if (userData.avatar_url && userData.avatar_url.includes('cloudinary.com')) {
      try {
        // Extract public_id từ URL cũ
        const urlParts = userData.avatar_url.split('/');
        const oldPublicId = urlParts.slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(`vsmart/avatars/${userData.id}/${oldPublicId}`);
      } catch (error) {
        console.error('Error deleting old avatar:', error);
        // Continue anyway
      }
    }

    // Cập nhật avatar_url trong database
    const { error: updateError } = await supabase
      .from('nguoi_dung')
      .update({ avatar_url: newAvatarUrl })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error updating avatar URL:', updateError);
      return NextResponse.json(
        { error: 'Không thể cập nhật avatar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: newAvatarUrl,
      public_id: publicId
    });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/upload/avatar - Xóa avatar (reset về default)
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    
    // Lấy thông tin user hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Lấy thông tin user từ database
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, avatar_url')
      .eq('email', user.email)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Xóa ảnh từ Cloudinary nếu có
    if (userData.avatar_url && userData.avatar_url.includes('cloudinary.com')) {
      try {
        const urlParts = userData.avatar_url.split('/');
        const oldPublicId = urlParts.slice(-2).join('/').split('.')[0];
        await deleteFromCloudinary(`vsmart/avatars/${userData.id}/${oldPublicId}`);
      } catch (error) {
        console.error('Error deleting avatar:', error);
      }
    }

    // Lấy avatar từ Google (nếu có)
    const googleAvatarUrl = user.user_metadata?.avatar_url || null;

    // Cập nhật database
    const { error: updateError } = await supabase
      .from('nguoi_dung')
      .update({ avatar_url: googleAvatarUrl })
      .eq('id', userData.id);

    if (updateError) {
      console.error('Error resetting avatar:', updateError);
      return NextResponse.json(
        { error: 'Không thể reset avatar' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      avatar_url: googleAvatarUrl
    });
  } catch (error) {
    console.error('Error deleting avatar:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
