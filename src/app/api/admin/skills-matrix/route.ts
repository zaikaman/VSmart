import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

interface SkillData {
  ten_ky_nang: string;
  trinh_do: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  nam_kinh_nghiem: number;
  nguoi_dung: {
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
  };
}

interface SkillMatrixEntry {
  ten_ky_nang: string;
  so_nguoi: number;
  beginner: number;
  intermediate: number;
  advanced: number;
  expert: number;
  tong_nam_kinh_nghiem: number;
  nguoi_dung: Array<{
    id: string;
    ten: string;
    email: string;
    avatar_url: string | null;
    trinh_do: string;
    nam_kinh_nghiem: number;
  }>;
}

// GET /api/admin/skills-matrix - Lấy ma trận kỹ năng toàn bộ tổ chức
export async function GET() {
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

    // Lấy thông tin user và organization
    const { data: userData, error: userError } = await supabase
      .from('nguoi_dung')
      .select('id, vai_tro, to_chuc_id')
      .eq('email', user.email)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Không tìm thấy thông tin người dùng' },
        { status: 404 }
      );
    }

    // Kiểm tra quyền (chỉ admin hoặc manager mới xem được)
    if (userData.vai_tro !== 'admin' && userData.vai_tro !== 'manager') {
      return NextResponse.json(
        { error: 'Bạn không có quyền truy cập' },
        { status: 403 }
      );
    }

    // Lấy tất cả người dùng trong tổ chức
    const { data: orgUsers, error: orgUsersError } = await supabase
      .from('nguoi_dung')
      .select('id')
      .eq('to_chuc_id', userData.to_chuc_id);

    if (orgUsersError) {
      console.error('Error fetching organization users:', orgUsersError);
      return NextResponse.json(
        { error: 'Không thể lấy danh sách người dùng' },
        { status: 500 }
      );
    }

    if (!orgUsers || orgUsers.length === 0) {
      return NextResponse.json({
        data: {
          skills: [],
          tong_nguoi_dung: 0,
          tong_ky_nang: 0,
        }
      });
    }

    const userIds = orgUsers.map(u => u.id);

    // Lấy tất cả kỹ năng của người dùng trong tổ chức
    const { data: skillsData, error: skillsError } = await supabase
      .from('ky_nang_nguoi_dung')
      .select(`
        ten_ky_nang,
        trinh_do,
        nam_kinh_nghiem,
        nguoi_dung:nguoi_dung_id (
          id,
          ten,
          email,
          avatar_url
        )
      `)
      .in('nguoi_dung_id', userIds)
      .order('ten_ky_nang', { ascending: true });

    if (skillsError) {
      console.error('Error fetching skills:', skillsError);
      return NextResponse.json(
        { error: 'Không thể lấy danh sách kỹ năng' },
        { status: 500 }
      );
    }

    // Tổng hợp dữ liệu theo kỹ năng
    const skillsMatrix = new Map<string, SkillMatrixEntry>();
    
    (skillsData as unknown as SkillData[] || []).forEach((skill) => {
      const skillName = skill.ten_ky_nang.toLowerCase();
      
      if (!skillsMatrix.has(skillName)) {
        skillsMatrix.set(skillName, {
          ten_ky_nang: skill.ten_ky_nang,
          so_nguoi: 0,
          beginner: 0,
          intermediate: 0,
          advanced: 0,
          expert: 0,
          tong_nam_kinh_nghiem: 0,
          nguoi_dung: [],
        });
      }
      
      const entry = skillsMatrix.get(skillName)!;
      entry.so_nguoi += 1;
      entry[skill.trinh_do] += 1;
      entry.tong_nam_kinh_nghiem += skill.nam_kinh_nghiem || 0;
      
      if (skill.nguoi_dung) {
        entry.nguoi_dung.push({
          id: skill.nguoi_dung.id,
          ten: skill.nguoi_dung.ten,
          email: skill.nguoi_dung.email,
          avatar_url: skill.nguoi_dung.avatar_url,
          trinh_do: skill.trinh_do,
          nam_kinh_nghiem: skill.nam_kinh_nghiem || 0,
        });
      }
    });

    // Chuyển Map thành array và sắp xếp theo số người
    const skillsArray = Array.from(skillsMatrix.values())
      .sort((a, b) => b.so_nguoi - a.so_nguoi);

    return NextResponse.json({
      data: {
        skills: skillsArray,
        tong_nguoi_dung: userIds.length,
        tong_ky_nang: skillsArray.length,
      }
    });
  } catch (error) {
    console.error('Error in GET /api/admin/skills-matrix:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
