/**
 * AI Agent Tool Executor
 * Service để thực thi các tool calls từ AI Agent
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';
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
 * Result của tool execution
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Executor cho các tool calls
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
   * Execute một tool call
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
   * Tạo dự án mới
   */
  private async taoDuAn(params: TaoDuAnParams): Promise<ToolExecutionResult> {
    // Lấy thông tin user để có to_chuc_id
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

    // Tự động thêm người tạo vào dự án với vai trò owner
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
   * Mời thành viên vào dự án
   */
  private async moiThanhVienDuAn(params: MoiThanhVienDuAnParams): Promise<ToolExecutionResult> {
    // Kiểm tra quyền của user trong dự án
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

    // Lấy ID của người mời
    const { data: userData } = await this.supabase
      .from('nguoi_dung')
      .select('id')
      .eq('email', this.userEmail)
      .single();

    // Kiểm tra email người được mời có tồn tại không
    const { data: invitedUser, error: userCheckError } = await this.supabase
      .from('nguoi_dung')
      .select('id, ten')
      .eq('email', params.email)
      .maybeSingle(); // Dùng maybeSingle() thay vì single() để không throw error khi không tìm thấy

    // Nếu có lỗi từ DB (không phải lỗi "không tìm thấy")
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
          trang_thai: 'pending', // Luôn để pending, đợi user accept
          nguoi_moi_id: userData?.id,
          ngay_tham_gia: null, // Chỉ set khi user accept
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

    return {
      success: true,
      data: {
        message: `Đã gửi lời mời đến ${params.email} với vai trò ${params.vai_tro || 'member'}. Đang chờ người dùng chấp nhận.`,
        member: data,
      },
    };
  }

  /**
   * Tạo phần dự án
   */
  private async taoPhanDuAn(params: TaoPhanDuAnParams): Promise<ToolExecutionResult> {
    // Kiểm tra quyền trong dự án
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
   * Tạo task
   */
  private async taoTask(params: TaoTaskParams): Promise<ToolExecutionResult> {
    // Kiểm tra phần dự án có tồn tại và user có quyền không
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
      .select('id')
      .eq('email', this.userEmail)
      .single();

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
   * Cập nhật task
   */
  private async capNhatTask(params: CapNhatTaskParams): Promise<ToolExecutionResult> {
    // Kiểm tra task có tồn tại và quyền
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

    // Tạo object cập nhật
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
   * Xóa task
   */
  private async xoaTask(params: XoaTaskParams): Promise<ToolExecutionResult> {
    // Kiểm tra quyền
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
   * Lấy danh sách thành viên
   */
  private async layDanhSachThanhVien(params: LayDanhSachThanhVienParams): Promise<ToolExecutionResult> {
    if (params.du_an_id) {
      // Lấy thành viên của dự án cụ thể
      const { data, error } = await this.supabase
        .from('thanh_vien_du_an')
        .select('*, nguoi_dung:nguoi_dung_id(id, ten, email, avatar_url)')
        .eq('du_an_id', params.du_an_id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } else {
      // Lấy tất cả người dùng trong tổ chức
      const { data: userData } = await this.supabase
        .from('nguoi_dung')
        .select('to_chuc_id')
        .eq('email', this.userEmail)
        .single();

      if (!userData?.to_chuc_id) {
        return { success: false, error: 'Không tìm thấy tổ chức' };
      }

      const { data, error } = await this.supabase
        .from('nguoi_dung')
        .select('id, ten, email, avatar_url, vai_tro')
        .eq('to_chuc_id', userData.to_chuc_id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    }
  }

  /**
   * Lấy danh sách dự án
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

    // Loại bỏ thông tin thanh_vien_du_an trong response
    const cleanData = data?.map(({ thanh_vien_du_an, ...project }: any) => project);

    return { success: true, data: cleanData };
  }

  /**
   * Lấy danh sách phần dự án
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
   * Lấy chi tiết task
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
   * Cập nhật dự án
   */
  private async capNhatDuAn(params: CapNhatDuAnParams): Promise<ToolExecutionResult> {
    // Kiểm tra quyền
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
   * Xóa thành viên khỏi dự án
   */
  private async xoaThanhVienDuAn(params: XoaThanhVienDuAnParams): Promise<ToolExecutionResult> {
    // Kiểm tra quyền
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
   * Tìm kiếm tasks
   */
  private async timKiemTasks(params: TimKiemTasksParams): Promise<ToolExecutionResult> {
    // Lấy danh sách project IDs mà user tham gia
    const { data: userProjects } = await this.supabase
      .from('thanh_vien_du_an')
      .select('du_an_id')
      .eq('email', this.userEmail)
      .eq('trang_thai', 'active');

    const projectIds = userProjects?.map(p => p.du_an_id) || [];

    if (projectIds.length === 0) {
      return { success: true, data: [] };
    }

    // Lấy part IDs
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
