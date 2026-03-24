/**
 * AI Agent Tool Executor
 * Service Ä‘á»ƒ thá»±c thi cÃ¡c tool calls tá»« AI Agent
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { sendProjectInvitationEmail } from '@/lib/email/project-invitation';
import { hasPermission } from '@/lib/auth/permissions';
import type {
  TaoDuAnParams,
  MoiThanhVienDuAnParams,
  TaoPhanDuAnParams,
  TaoTaskParams,
  CapNhatTaskParams,
  XoaTaskParams,
  LayDanhSachThanhVienParams,
  LayDanhSachDuAnParams,
  LayDanhSachPhanDuAnParams,
  LayChiTietTaskParams,
  CapNhatDuAnParams,
  XoaThanhVienDuAnParams,
  TimKiemTasksParams,
} from './agent-tools';

/**
 * Result cá»§a tool execution
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Executor cho cÃ¡c tool calls
 */
export class AgentToolExecutor {
  private supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  private userId: string;
  private userEmail: string;

  constructor(
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
    userId: string,
    userEmail: string
  ) {
    this.supabase = supabase;
    this.userId = userId;
    this.userEmail = userEmail;
  }

  /**
   * Execute má»™t tool call
   */
  async executeTool(toolName: string, args: any): Promise<ToolExecutionResult> {
    try {
      switch (toolName) {
        case 'tao_du_an':
          return await this.taoDuAn(args as TaoDuAnParams);
        
        case 'moi_thanh_vien_du_an':
          return await this.moiThanhVienDuAn(args as MoiThanhVienDuAnParams);
        
        case 'tao_phan_du_an':
          return await this.taoPhanDuAn(args as TaoPhanDuAnParams);
        
        case 'tao_task':
          return await this.taoTask(args as TaoTaskParams);
        
        case 'cap_nhat_task':
          return await this.capNhatTask(args as CapNhatTaskParams);
        
        case 'xoa_task':
          return await this.xoaTask(args as XoaTaskParams);
        
        case 'lay_danh_sach_thanh_vien':
          return await this.layDanhSachThanhVien(args as LayDanhSachThanhVienParams);
        
        case 'lay_danh_sach_du_an':
          return await this.layDanhSachDuAn(args as LayDanhSachDuAnParams);
        
        case 'lay_danh_sach_phan_du_an':
          return await this.layDanhSachPhanDuAn(args as LayDanhSachPhanDuAnParams);
        
        case 'lay_chi_tiet_task':
          return await this.layChiTietTask(args as LayChiTietTaskParams);
        
        case 'cap_nhat_du_an':
          return await this.capNhatDuAn(args as CapNhatDuAnParams);
        
        case 'xoa_thanh_vien_du_an':
          return await this.xoaThanhVienDuAn(args as XoaThanhVienDuAnParams);
        
        case 'tim_kiem_tasks':
          return await this.timKiemTasks(args as TimKiemTasksParams);
        
        default:
          return {
            success: false,
            error: `Tool không được hỗ trợ: ${toolName}`,
          };
      }
    } catch (error) {
      console.error(`[AgentToolExecutor] Error executing ${toolName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Lỗi không xác định',
      };
    }
  }

  /**
   * Táº¡o dá»± Ã¡n má»›i
   */
  private async taoDuAn(params: TaoDuAnParams): Promise<ToolExecutionResult> {
    // Láº¥y thÃ´ng tin user Ä‘á»ƒ cÃ³ to_chuc_id
    const { data: userData, error: userError } = await this.supabase
      .from('nguoi_dung')
      .select('id, to_chuc_id')
      .eq('email', this.userEmail)
      .single();

    if (userError || !userData) {
      return { success: false, error: 'Không tìm thấy thông tin người dùng' };
    }

    if (!userData.to_chuc_id) {
      return { success: false, error: 'Bạn cần thuộc về một tổ chức để tạo dự án' };
    }

    let allowExternalProjectInvites = true;
    let invitedUser: any = {};
    let projectData: any = { to_chuc_id: userData.to_chuc_id };

    if (!allowExternalProjectInvites) {
      if (!invitedUser?.id) {
        return {
          success: false,
          error: 'Tổ chức hiện chưa cho phép mời email ngoài tổ chức vào dự án',
        };
      }

      if (invitedUser.to_chuc_id !== projectData.to_chuc_id) {
        return {
          success: false,
          error: 'Người được mời cần thuộc cùng tổ chức với dự án này',
        };
      }
    }

    if (!allowExternalProjectInvites) {
      if (!invitedUser?.id) {
        return {
          success: false,
          error: 'T? ch?c hi?n ch?a cho ph?p m?i email ngo?i t? ch?c v?o d? ?n',
        };
      }

      if (invitedUser.to_chuc_id !== projectData.to_chuc_id) {
        return {
          success: false,
          error: 'Ng??i ???c m?i c?n thu?c c?ng t? ch?c v?i d? ?n n?y',
        };
      }
    }

    const { data, error } = await this.supabase
      .from('du_an')
      .insert([
        {
          ten: params.ten,
          mo_ta: params.mo_ta,
          deadline: params.deadline,
          nguoi_tao_id: userData.id,
          to_chuc_id: userData.to_chuc_id,
          trang_thai: 'todo',
          phan_tram_hoan_thanh: 0,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Tá»± Ä‘á»™ng thÃªm ngÆ°á»i táº¡o vÃ o dá»± Ã¡n vá»›i vai trÃ² owner
    await this.supabase.from('thanh_vien_du_an').insert([
      {
        du_an_id: data.id,
        nguoi_dung_id: userData.id,
        email: this.userEmail,
        vai_tro: 'owner',
        trang_thai: 'active',
        nguoi_moi_id: userData.id,
        ngay_tham_gia: new Date().toISOString(),
      },
    ]);

    return {
      success: true,
      data: {
        message: `Đã tạo dự án "${params.ten}" thành công`,
        project: data,
      },
    };
  }

  /**
   * Má»i thÃ nh viÃªn vÃ o dá»± Ã¡n
   */
  private async moiThanhVienDuAn(params: MoiThanhVienDuAnParams): Promise<ToolExecutionResult> {
    // Kiá»ƒm tra quyá»n cá»§a user trong dá»± Ã¡n
    const { data: memberCheck } = await this.supabase
      .from('thanh_vien_du_an')
      .select('vai_tro')
      .eq('du_an_id', params.du_an_id)
      .eq('email', this.userEmail)
      .eq('trang_thai', 'active')
      .single();

    if (!memberCheck || !['owner', 'admin'].includes(memberCheck.vai_tro)) {
      return {
        success: false,
        error: 'Bạn không có quyền mời thành viên vào dự án này',
      };
    }

    // Láº¥y ID cá»§a ngÆ°á»i má»i
    const { data: userData } = await this.supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', this.userEmail)
      .single();

    const { data: projectData, error: projectError } = await this.supabase
      .from('du_an')
      .select('id, ten, to_chuc_id')
      .eq('id', params.du_an_id)
      .single();

    if (projectError || !projectData) {
      return { success: false, error: 'Kh?ng t?m th?y d? ?n' };
    }

    const { data: organizationData } = await this.supabase
      .from('to_chuc')
      .select('settings')
      .eq('id', projectData.to_chuc_id)
      .single();

    const allowExternalProjectInvites =
      !!organizationData?.settings &&
      typeof organizationData.settings === 'object' &&
      'allow_external_project_invites' in organizationData.settings
        ? Boolean((organizationData.settings as { allow_external_project_invites?: boolean }).allow_external_project_invites)
        : false;

    // Kiá»ƒm tra email ngÆ°á»i Ä‘Æ°á»£c má»i cÃ³ tá»“n táº¡i khÃ´ng
    const { data: invitedUser, error: userCheckError } = await this.supabase
      .from('nguoi_dung')
      .select('id, ten, to_chuc_id')
      .eq('email', params.email)
      .maybeSingle(); // DÃ¹ng maybeSingle() thay vÃ¬ single() Ä‘á»ƒ khÃ´ng throw error khi khÃ´ng tÃ¬m tháº¥y

    // Náº¿u cÃ³ lá»—i tá»« DB (khÃ´ng pháº£i lá»—i "khÃ´ng tÃ¬m tháº¥y")
    if (userCheckError) {
      return { success: false, error: `Lỗi khi kiểm tra user: ${userCheckError.message}` };
    }

    const { data, error } = await this.supabase
      .from('thanh_vien_du_an')
      .insert([
        {
          du_an_id: params.du_an_id,
          nguoi_dung_id: invitedUser?.id || null,
          email: params.email,
          vai_tro: params.vai_tro || 'member',
          trang_thai: 'pending', // LuÃ´n Ä‘á»ƒ pending, Ä‘á»£i user accept
          nguoi_moi_id: userData?.id,
          ngay_tham_gia: null, // Chá»‰ set khi user accept
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return {
          success: false,
          error: 'Thành viên này đã được mời vào dự án rồi',
        };
      }
      return { success: false, error: error.message };
    }

    // Láº¥y thÃ´ng tin dá»± Ã¡n vÃ  ngÆ°á»i má»i Ä‘á»ƒ táº¡o notification & gá»­i email
    const projectInfo = projectData;

    const { data: inviterInfo } = await this.supabase
      .from('nguoi_dung')
      .select('ten, email')
      .eq('id', userData?.id)
      .single();

    // Táº¡o thÃ´ng bÃ¡o trong app náº¿u user Ä‘Ã£ tá»“n táº¡i
    if (invitedUser?.id) {
      await this.supabase
        .from('thong_bao')
        .insert({
          nguoi_dung_id: invitedUser.id,
          loai: 'project_invitation',
          noi_dung: `${inviterInfo?.ten || 'Ai đó'} đã mời bạn tham gia dự án "${projectInfo?.ten || 'một dự án'}"`,
          du_an_lien_quan_id: params.du_an_id,
          thanh_vien_du_an_id: data.id,
        });
    }

    // Gá»­i email thÃ´ng bÃ¡o (async, khÃ´ng chá» káº¿t quáº£)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const acceptUrl = `${baseUrl}/dashboard?tab=invitations`;
      
      await sendProjectInvitationEmail({
        to: params.email,
        projectName: projectInfo?.ten || 'Dự án',
        inviterName: inviterInfo?.ten || 'Người dùng',
        inviterEmail: inviterInfo?.email || '',
        role: params.vai_tro || 'member',
        acceptUrl,
      });
      
      console.log(`[AI Agent] Invitation email sent to ${params.email}`);
    } catch (emailError) {
      console.error('[AI Agent] Error sending invitation email:', emailError);
      // KhÃ´ng throw error vÃ¬ lá»i má»i Ä‘Ã£ Ä‘Æ°á»£c táº¡o thÃ nh cÃ´ng
    }

    return {
      success: true,
      data: {
        message: `Đã gửi lời mời đến ${params.email} với vai trò ${params.vai_tro || 'member'}. Đang chờ người dùng chấp nhận.`,
        member: data,
      },
    };
  }

  /**
   * Táº¡o pháº§n dá»± Ã¡n
   */
  private async taoPhanDuAn(params: TaoPhanDuAnParams): Promise<ToolExecutionResult> {
    // Kiá»ƒm tra quyá»n trong dá»± Ã¡n
    const { data: memberCheck } = await this.supabase
      .from('thanh_vien_du_an')
      .select('vai_tro')
      .eq('du_an_id', params.du_an_id)
      .eq('email', this.userEmail)
      .eq('trang_thai', 'active')
      .single();

    if (!memberCheck) {
      return {
        success: false,
        error: 'Bạn không phải thành viên của dự án này',
      };
    }

    const { data, error } = await this.supabase
      .from('phan_du_an')
      .insert([
        {
          ten: params.ten,
          mo_ta: params.mo_ta,
          du_an_id: params.du_an_id,
          phong_ban_id: params.phong_ban_id,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        message: `Đã tạo phần dự án "${params.ten}" thành công`,
        part: data,
      },
    };
  }

  /**
   * Táº¡o task
   */
  private async taoTask(params: TaoTaskParams): Promise<ToolExecutionResult> {
    // Kiá»ƒm tra pháº§n dá»± Ã¡n cÃ³ tá»“n táº¡i vÃ  user cÃ³ quyá»n khÃ´ng
    const { data: partData } = await this.supabase
      .from('phan_du_an')
      .select('du_an_id')
      .eq('id', params.phan_du_an_id)
      .single();

    if (!partData) {
      return { success: false, error: 'Không tìm thấy phần dự án' };
    }

    const { data: memberCheck } = await this.supabase
      .from('thanh_vien_du_an')
      .select('vai_tro')
      .eq('du_an_id', partData.du_an_id)
      .eq('email', this.userEmail)
      .eq('trang_thai', 'active')
      .single();

    if (!memberCheck) {
      return {
        success: false,
        error: 'Bạn không có quyền tạo task trong dự án này',
      };
    }

    const { data: userData } = await this.supabase
      .from('nguoi_dung')
      .select('id, vai_tro')
      .eq('email', this.userEmail)
      .single();

    if (
      !userData ||
      !hasPermission(
        {
          appRole: userData.vai_tro as 'admin' | 'manager' | 'member',
          projectRole: memberCheck.vai_tro as 'owner' | 'admin' | 'member' | 'viewer',
        },
        'createTask'
      )
    ) {
      return {
        success: false,
        error: 'Bạn không có quyền tạo task trong dự án này',
      };
    }

    const { data, error } = await this.supabase
      .from('task')
      .insert([
        {
          ten: params.ten,
          mo_ta: params.mo_ta,
          deadline: params.deadline,
          phan_du_an_id: params.phan_du_an_id,
          assignee_id: params.assignee_id || null,
          priority: params.priority || 'medium',
          trang_thai: 'todo',
          progress: 0,
          nguoi_tao_id: userData?.id,
        },
      ])
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        message: `Đã tạo task "${params.ten}" thành công`,
        task: data,
      },
    };
  }

  /**
   * Cáº­p nháº­t task
   */
  private async capNhatTask(params: CapNhatTaskParams): Promise<ToolExecutionResult> {
    // Kiá»ƒm tra task cÃ³ tá»“n táº¡i vÃ  quyá»n
    const { data: taskData } = await this.supabase
      .from('task')
      .select('phan_du_an_id, phan_du_an(du_an_id)')
      .eq('id', params.task_id)
      .is('deleted_at', null)
      .single();

    if (!taskData) {
      return { success: false, error: 'Không tìm thấy task' };
    }

    const duAnId = (taskData.phan_du_an as any)?.du_an_id;

    const { data: memberCheck } = await this.supabase
      .from('thanh_vien_du_an')
      .select('vai_tro')
      .eq('du_an_id', duAnId)
      .eq('email', this.userEmail)
      .eq('trang_thai', 'active')
      .single();

    if (!memberCheck) {
      return {
        success: false,
        error: 'Bạn không có quyền cập nhật task này',
      };
    }

    // Táº¡o object cáº­p nháº­t
    const updateData: any = {};
    if (params.trang_thai) updateData.trang_thai = params.trang_thai;
    if (params.progress !== undefined) updateData.progress = params.progress;
    if (params.assignee_id) updateData.assignee_id = params.assignee_id;
    if (params.priority) updateData.priority = params.priority;
    if (params.deadline) updateData.deadline = params.deadline;

    const { data, error } = await this.supabase
      .from('task')
      .update(updateData)
      .eq('id', params.task_id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        message: 'Đã cập nhật task thành công',
        task: data,
      },
    };
  }

  /**
   * XÃ³a task
   */
  private async xoaTask(params: XoaTaskParams): Promise<ToolExecutionResult> {
    // Kiá»ƒm tra quyá»n
    const { data: taskData } = await this.supabase
      .from('task')
      .select('phan_du_an_id, phan_du_an(du_an_id)')
      .eq('id', params.task_id)
      .is('deleted_at', null)
      .single();

    if (!taskData) {
      return { success: false, error: 'Không tìm thấy task' };
    }

    const duAnId = (taskData.phan_du_an as any)?.du_an_id;

    const { data: memberCheck } = await this.supabase
      .from('thanh_vien_du_an')
      .select('vai_tro')
      .eq('du_an_id', duAnId)
      .eq('email', this.userEmail)
      .eq('trang_thai', 'active')
      .single();

    if (!memberCheck) {
      return {
        success: false,
        error: 'Bạn không có quyền xóa task này',
      };
    }

    // Soft delete
    const { error } = await this.supabase
      .from('task')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', params.task_id);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { message: 'Đã xóa task thành công' },
    };
  }

  /**
   * Láº¥y danh sÃ¡ch thÃ nh viÃªn
   */
  private async layDanhSachThanhVien(params: LayDanhSachThanhVienParams): Promise<ToolExecutionResult> {
    if (params.du_an_id) {
      // Láº¥y thÃ nh viÃªn cá»§a dá»± Ã¡n cá»¥ thá»ƒ
      const { data, error } = await this.supabase
        .from('thanh_vien_du_an')
        .select('*, nguoi_dung:nguoi_dung_id(id, ten, email, avatar_url)')
        .eq('du_an_id', params.du_an_id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } else {
      // Láº¥y táº¥t cáº£ ngÆ°á»i dÃ¹ng trong há»‡ thá»‘ng (khÃ´ng giá»›i háº¡n tá»• chá»©c)
      const { data, error } = await this.supabase
        .from('nguoi_dung')
        .select('id, ten, email, avatar_url, vai_tro, to_chuc_id')
        .order('ten', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    }
  }

  /**
   * Láº¥y danh sÃ¡ch dá»± Ã¡n
   */
  private async layDanhSachDuAn(params: LayDanhSachDuAnParams): Promise<ToolExecutionResult> {
    let query = this.supabase
      .from('du_an')
      .select(`
        *,
        thanh_vien_du_an!inner(email, trang_thai)
      `)
      .eq('thanh_vien_du_an.email', this.userEmail)
      .eq('thanh_vien_du_an.trang_thai', 'active');

    if (params.trang_thai) {
      query = query.eq('trang_thai', params.trang_thai);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Loáº¡i bá» thÃ´ng tin thanh_vien_du_an trong response
    const cleanData = data?.map(({ thanh_vien_du_an, ...project }: any) => project);

    return { success: true, data: cleanData };
  }

  /**
   * Láº¥y danh sÃ¡ch pháº§n dá»± Ã¡n
   */
  private async layDanhSachPhanDuAn(params: LayDanhSachPhanDuAnParams): Promise<ToolExecutionResult> {
    const { data, error } = await this.supabase
      .from('phan_du_an')
      .select('*, phong_ban:phong_ban_id(id, ten)')
      .eq('du_an_id', params.du_an_id)
      .order('ngay_tao', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  /**
   * Láº¥y chi tiáº¿t task
   */
  private async layChiTietTask(params: LayChiTietTaskParams): Promise<ToolExecutionResult> {
    const { data, error } = await this.supabase
      .from('task')
      .select(`
        *,
        nguoi_dung:assignee_id(id, ten, email, avatar_url),
        phan_du_an(id, ten, du_an(id, ten))
      `)
      .eq('id', params.task_id)
      .is('deleted_at', null)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }

  /**
   * Cáº­p nháº­t dá»± Ã¡n
   */
  private async capNhatDuAn(params: CapNhatDuAnParams): Promise<ToolExecutionResult> {
    // Kiá»ƒm tra quyá»n
    const { data: memberCheck } = await this.supabase
      .from('thanh_vien_du_an')
      .select('vai_tro')
      .eq('du_an_id', params.du_an_id)
      .eq('email', this.userEmail)
      .eq('trang_thai', 'active')
      .single();

    if (!memberCheck || !['owner', 'admin'].includes(memberCheck.vai_tro)) {
      return {
        success: false,
        error: 'Bạn không có quyền cập nhật dự án này',
      };
    }

    const updateData: any = {};
    if (params.ten) updateData.ten = params.ten;
    if (params.mo_ta) updateData.mo_ta = params.mo_ta;
    if (params.trang_thai) updateData.trang_thai = params.trang_thai;
    if (params.deadline) updateData.deadline = params.deadline;

    const { data, error } = await this.supabase
      .from('du_an')
      .update(updateData)
      .eq('id', params.du_an_id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        message: 'Đã cập nhật dự án thành công',
        project: data,
      },
    };
  }

  /**
   * XÃ³a thÃ nh viÃªn khá»i dá»± Ã¡n
   */
  private async xoaThanhVienDuAn(params: XoaThanhVienDuAnParams): Promise<ToolExecutionResult> {
    // Kiá»ƒm tra quyá»n
    const { data: memberCheck } = await this.supabase
      .from('thanh_vien_du_an')
      .select('vai_tro')
      .eq('du_an_id', params.du_an_id)
      .eq('email', this.userEmail)
      .eq('trang_thai', 'active')
      .single();

    if (!memberCheck || !['owner', 'admin'].includes(memberCheck.vai_tro)) {
      return {
        success: false,
        error: 'Bạn không có quyền xóa thành viên khỏi dự án này',
      };
    }

    const { error } = await this.supabase
      .from('thanh_vien_du_an')
      .delete()
      .eq('id', params.thanh_vien_id)
      .eq('du_an_id', params.du_an_id);

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: { message: 'Đã xóa thành viên khỏi dự án' },
    };
  }

  /**
   * TÃ¬m kiáº¿m tasks
   */
  private async timKiemTasks(params: TimKiemTasksParams): Promise<ToolExecutionResult> {
    // Láº¥y danh sÃ¡ch project IDs mÃ  user tham gia
    const { data: userProjects } = await this.supabase
      .from('thanh_vien_du_an')
      .select('du_an_id')
      .eq('email', this.userEmail)
      .eq('trang_thai', 'active');

    const projectIds = userProjects?.map(p => p.du_an_id) || [];

    if (projectIds.length === 0) {
      return { success: true, data: [] };
    }

    // Láº¥y part IDs
    let partQuery = this.supabase.from('phan_du_an').select('id').in('du_an_id', projectIds);

    if (params.du_an_id) {
      partQuery = partQuery.eq('du_an_id', params.du_an_id);
    }

    const { data: projectParts } = await partQuery;
    const partIds = projectParts?.map(p => p.id) || [];

    if (partIds.length === 0) {
      return { success: true, data: [] };
    }

    let query = this.supabase
      .from('task')
      .select(`
        *,
        nguoi_dung:assignee_id(id, ten, email, avatar_url),
        phan_du_an(id, ten, du_an(id, ten))
      `)
      .in('phan_du_an_id', partIds)
      .is('deleted_at', null);

    if (params.trang_thai) {
      query = query.eq('trang_thai', params.trang_thai);
    }

    if (params.assignee_id) {
      query = query.eq('assignee_id', params.assignee_id);
    }

    if (params.priority) {
      query = query.eq('priority', params.priority);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data };
  }
}
