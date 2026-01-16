// Database types - sẽ được generate từ Supabase
// Run: npx supabase gen types typescript --project-id <project-id> > src/lib/supabase/database.types.ts

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      phong_ban: {
        Row: {
          id: string;
          ten: string;
          mo_ta: string | null;
          so_luong_thanh_vien: number;
          ngay_tao: string;
        };
        Insert: {
          id?: string;
          ten: string;
          mo_ta?: string | null;
          so_luong_thanh_vien?: number;
          ngay_tao?: string;
        };
        Update: {
          id?: string;
          ten?: string;
          mo_ta?: string | null;
          so_luong_thanh_vien?: number;
          ngay_tao?: string;
        };
      };
      nguoi_dung: {
        Row: {
          id: string;
          ten: string;
          email: string;
          mat_khau_hash: string;
          vai_tro: 'admin' | 'manager' | 'member';
          phong_ban_id: string | null;
          avatar_url: string | null;
          ty_le_hoan_thanh: number;
          ngay_tao: string;
          cap_nhat_cuoi: string;
        };
        Insert: {
          id?: string;
          ten: string;
          email: string;
          mat_khau_hash: string;
          vai_tro?: 'admin' | 'manager' | 'member';
          phong_ban_id?: string | null;
          avatar_url?: string | null;
          ty_le_hoan_thanh?: number;
          ngay_tao?: string;
          cap_nhat_cuoi?: string;
        };
        Update: {
          id?: string;
          ten?: string;
          email?: string;
          mat_khau_hash?: string;
          vai_tro?: 'admin' | 'manager' | 'member';
          phong_ban_id?: string | null;
          avatar_url?: string | null;
          ty_le_hoan_thanh?: number;
          ngay_tao?: string;
          cap_nhat_cuoi?: string;
        };
      };
      ky_nang_nguoi_dung: {
        Row: {
          id: string;
          nguoi_dung_id: string;
          ten_ky_nang: string;
          trinh_do: 'beginner' | 'intermediate' | 'advanced' | 'expert';
          nam_kinh_nghiem: number;
          ngay_tao: string;
        };
        Insert: {
          id?: string;
          nguoi_dung_id: string;
          ten_ky_nang: string;
          trinh_do: 'beginner' | 'intermediate' | 'advanced' | 'expert';
          nam_kinh_nghiem?: number;
          ngay_tao?: string;
        };
        Update: {
          id?: string;
          nguoi_dung_id?: string;
          ten_ky_nang?: string;
          trinh_do?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
          nam_kinh_nghiem?: number;
          ngay_tao?: string;
        };
      };
      du_an: {
        Row: {
          id: string;
          ten: string;
          mo_ta: string | null;
          deadline: string;
          trang_thai: 'todo' | 'in-progress' | 'done';
          nguoi_tao_id: string;
          phan_tram_hoan_thanh: number;
          ngay_tao: string;
          cap_nhat_cuoi: string;
        };
        Insert: {
          id?: string;
          ten: string;
          mo_ta?: string | null;
          deadline: string;
          trang_thai?: 'todo' | 'in-progress' | 'done';
          nguoi_tao_id: string;
          phan_tram_hoan_thanh?: number;
          ngay_tao?: string;
          cap_nhat_cuoi?: string;
        };
        Update: {
          id?: string;
          ten?: string;
          mo_ta?: string | null;
          deadline?: string;
          trang_thai?: 'todo' | 'in-progress' | 'done';
          nguoi_tao_id?: string;
          phan_tram_hoan_thanh?: number;
          ngay_tao?: string;
          cap_nhat_cuoi?: string;
        };
      };
      phan_du_an: {
        Row: {
          id: string;
          ten: string;
          mo_ta: string | null;
          deadline: string;
          du_an_id: string;
          phong_ban_id: string;
          trang_thai: 'todo' | 'in-progress' | 'done';
          phan_tram_hoan_thanh: number;
          ngay_tao: string;
          cap_nhat_cuoi: string;
        };
        Insert: {
          id?: string;
          ten: string;
          mo_ta?: string | null;
          deadline: string;
          du_an_id: string;
          phong_ban_id: string;
          trang_thai?: 'todo' | 'in-progress' | 'done';
          phan_tram_hoan_thanh?: number;
          ngay_tao?: string;
          cap_nhat_cuoi?: string;
        };
        Update: {
          id?: string;
          ten?: string;
          mo_ta?: string | null;
          deadline?: string;
          du_an_id?: string;
          phong_ban_id?: string;
          trang_thai?: 'todo' | 'in-progress' | 'done';
          phan_tram_hoan_thanh?: number;
          ngay_tao?: string;
          cap_nhat_cuoi?: string;
        };
      };
      task: {
        Row: {
          id: string;
          ten: string;
          mo_ta: string | null;
          deadline: string;
          phan_du_an_id: string;
          assignee_id: string | null;
          trang_thai: 'todo' | 'in-progress' | 'done';
          priority: 'low' | 'medium' | 'high' | 'urgent';
          progress: number;
          risk_score: number;
          risk_level: 'low' | 'medium' | 'high';
          risk_updated_at: string | null;
          is_stale: boolean;
          ngay_tao: string;
          cap_nhat_cuoi: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          ten: string;
          mo_ta?: string | null;
          deadline: string;
          phan_du_an_id: string;
          assignee_id?: string | null;
          trang_thai?: 'todo' | 'in-progress' | 'done';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          progress?: number;
          risk_score?: number;
          risk_level?: 'low' | 'medium' | 'high';
          risk_updated_at?: string | null;
          is_stale?: boolean;
          ngay_tao?: string;
          cap_nhat_cuoi?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          ten?: string;
          mo_ta?: string | null;
          deadline?: string;
          phan_du_an_id?: string;
          assignee_id?: string | null;
          trang_thai?: 'todo' | 'in-progress' | 'done';
          priority?: 'low' | 'medium' | 'high' | 'urgent';
          progress?: number;
          risk_score?: number;
          risk_level?: 'low' | 'medium' | 'high';
          risk_updated_at?: string | null;
          is_stale?: boolean;
          ngay_tao?: string;
          cap_nhat_cuoi?: string;
          deleted_at?: string | null;
        };
      };
      goi_y_phan_cong: {
        Row: {
          id: string;
          task_id: string;
          nguoi_dung_goi_y_id: string;
          diem_phu_hop: number;
          ly_do: Json;
          da_chap_nhan: boolean;
          thoi_gian: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          nguoi_dung_goi_y_id: string;
          diem_phu_hop: number;
          ly_do: Json;
          da_chap_nhan?: boolean;
          thoi_gian?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          nguoi_dung_goi_y_id?: string;
          diem_phu_hop?: number;
          ly_do?: Json;
          da_chap_nhan?: boolean;
          thoi_gian?: string;
        };
      };
      lich_su_task: {
        Row: {
          id: string;
          task_id: string;
          hanh_dong:
            | 'created'
            | 'assigned'
            | 'status_changed'
            | 'progress_updated'
            | 'completed'
            | 'deleted';
          nguoi_thuc_hien_id: string;
          gia_tri_cu: Json | null;
          gia_tri_moi: Json | null;
          thoi_gian: string;
        };
        Insert: {
          id?: string;
          task_id: string;
          hanh_dong:
            | 'created'
            | 'assigned'
            | 'status_changed'
            | 'progress_updated'
            | 'completed'
            | 'deleted';
          nguoi_thuc_hien_id: string;
          gia_tri_cu?: Json | null;
          gia_tri_moi?: Json | null;
          thoi_gian?: string;
        };
        Update: {
          id?: string;
          task_id?: string;
          hanh_dong?:
            | 'created'
            | 'assigned'
            | 'status_changed'
            | 'progress_updated'
            | 'completed'
            | 'deleted';
          nguoi_thuc_hien_id?: string;
          gia_tri_cu?: Json | null;
          gia_tri_moi?: Json | null;
          thoi_gian?: string;
        };
      };
      thong_bao: {
        Row: {
          id: string;
          nguoi_dung_id: string;
          loai: 'risk_alert' | 'stale_task' | 'assignment' | 'overload';
          noi_dung: string;
          task_lien_quan_id: string | null;
          da_doc: boolean;
          thoi_gian: string;
        };
        Insert: {
          id?: string;
          nguoi_dung_id: string;
          loai: 'risk_alert' | 'stale_task' | 'assignment' | 'overload';
          noi_dung: string;
          task_lien_quan_id?: string | null;
          da_doc?: boolean;
          thoi_gian?: string;
        };
        Update: {
          id?: string;
          nguoi_dung_id?: string;
          loai?: 'risk_alert' | 'stale_task' | 'assignment' | 'overload';
          noi_dung?: string;
          task_lien_quan_id?: string | null;
          da_doc?: boolean;
          thoi_gian?: string;
        };
      };
    };
  };
}
