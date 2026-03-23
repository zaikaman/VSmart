-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  entity_type character varying NOT NULL CHECK (entity_type::text = ANY (ARRAY['task'::character varying, 'project'::character varying, 'project_part'::character varying, 'comment'::character varying, 'review'::character varying]::text[])),
  entity_id uuid NOT NULL,
  action character varying NOT NULL,
  actor_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_log_pkey PRIMARY KEY (id),
  CONSTRAINT activity_log_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.ai_insight_event (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  insight_type character varying NOT NULL CHECK (insight_type::text = ANY (ARRAY['daily_summary'::character varying, 'weekly_summary'::character varying, 'rebalance'::character varying, 'deadline_review'::character varying, 'meeting_summary'::character varying, 'team_digest'::character varying]::text[])),
  event_type character varying NOT NULL CHECK (event_type::text = ANY (ARRAY['sent'::character varying, 'viewed'::character varying, 'generated'::character varying, 'accepted'::character varying, 'dismissed'::character varying, 'helpful'::character varying, 'not_helpful'::character varying]::text[])),
  reference_id character varying,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_insight_event_pkey PRIMARY KEY (id),
  CONSTRAINT ai_insight_event_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.binh_luan (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL,
  nguoi_dung_id uuid NOT NULL,
  noi_dung text NOT NULL,
  ngay_tao timestamp with time zone DEFAULT now(),
  cap_nhat_cuoi timestamp with time zone DEFAULT now(),
  CONSTRAINT binh_luan_pkey PRIMARY KEY (id),
  CONSTRAINT binh_luan_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id),
  CONSTRAINT binh_luan_nguoi_dung_id_fkey FOREIGN KEY (nguoi_dung_id) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.du_an (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ten character varying NOT NULL,
  mo_ta text,
  deadline timestamp with time zone NOT NULL,
  trang_thai character varying DEFAULT 'todo'::character varying CHECK (trang_thai::text = ANY (ARRAY['todo'::character varying, 'in-progress'::character varying, 'done'::character varying]::text[])),
  nguoi_tao_id uuid NOT NULL,
  phan_tram_hoan_thanh real DEFAULT 0.0,
  ngay_tao timestamp with time zone DEFAULT now(),
  cap_nhat_cuoi timestamp with time zone DEFAULT now(),
  to_chuc_id uuid,
  deleted_at timestamp with time zone,
  CONSTRAINT du_an_pkey PRIMARY KEY (id),
  CONSTRAINT du_an_nguoi_tao_id_fkey FOREIGN KEY (nguoi_tao_id) REFERENCES public.nguoi_dung(id),
  CONSTRAINT du_an_to_chuc_id_fkey FOREIGN KEY (to_chuc_id) REFERENCES public.to_chuc(id)
);
CREATE TABLE public.goi_y_phan_cong (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL,
  nguoi_dung_goi_y_id uuid NOT NULL,
  diem_phu_hop real NOT NULL CHECK (diem_phu_hop >= 0::double precision AND diem_phu_hop <= 100::double precision),
  ly_do jsonb NOT NULL,
  da_chap_nhan boolean DEFAULT false,
  thoi_gian timestamp with time zone DEFAULT now(),
  CONSTRAINT goi_y_phan_cong_pkey PRIMARY KEY (id),
  CONSTRAINT goi_y_phan_cong_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id),
  CONSTRAINT goi_y_phan_cong_nguoi_dung_goi_y_id_fkey FOREIGN KEY (nguoi_dung_goi_y_id) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.ky_nang_nguoi_dung (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nguoi_dung_id uuid NOT NULL,
  ten_ky_nang character varying NOT NULL,
  trinh_do character varying NOT NULL CHECK (trinh_do::text = ANY (ARRAY['beginner'::character varying, 'intermediate'::character varying, 'advanced'::character varying, 'expert'::character varying]::text[])),
  nam_kinh_nghiem integer DEFAULT 0,
  ngay_tao timestamp with time zone DEFAULT now(),
  CONSTRAINT ky_nang_nguoi_dung_pkey PRIMARY KEY (id),
  CONSTRAINT ky_nang_nguoi_dung_nguoi_dung_id_fkey FOREIGN KEY (nguoi_dung_id) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.lich_su_task (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL,
  hanh_dong character varying NOT NULL CHECK (hanh_dong::text = ANY (ARRAY['created'::character varying, 'assigned'::character varying, 'status_changed'::character varying, 'progress_updated'::character varying, 'completed'::character varying, 'deleted'::character varying]::text[])),
  nguoi_thuc_hien_id uuid NOT NULL,
  gia_tri_cu jsonb,
  gia_tri_moi jsonb,
  thoi_gian timestamp with time zone DEFAULT now(),
  CONSTRAINT lich_su_task_pkey PRIMARY KEY (id),
  CONSTRAINT lich_su_task_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id),
  CONSTRAINT lich_su_task_nguoi_thuc_hien_id_fkey FOREIGN KEY (nguoi_thuc_hien_id) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.loi_moi_to_chuc (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  to_chuc_id uuid NOT NULL,
  nguoi_dung_id uuid,
  email character varying NOT NULL,
  vai_tro character varying NOT NULL DEFAULT 'member'::character varying CHECK (vai_tro::text = ANY (ARRAY['admin'::character varying::text, 'manager'::character varying::text, 'member'::character varying::text])),
  trang_thai character varying NOT NULL DEFAULT 'pending'::character varying CHECK (trang_thai::text = ANY (ARRAY['pending'::character varying::text, 'accepted'::character varying::text, 'declined'::character varying::text, 'cancelled'::character varying::text])),
  nguoi_moi_id uuid NOT NULL,
  ngay_moi timestamp with time zone NOT NULL DEFAULT now(),
  ngay_phan_hoi timestamp with time zone,
  CONSTRAINT loi_moi_to_chuc_pkey PRIMARY KEY (id),
  CONSTRAINT loi_moi_to_chuc_to_chuc_id_fkey FOREIGN KEY (to_chuc_id) REFERENCES public.to_chuc(id),
  CONSTRAINT loi_moi_to_chuc_nguoi_dung_id_fkey FOREIGN KEY (nguoi_dung_id) REFERENCES public.nguoi_dung(id),
  CONSTRAINT loi_moi_to_chuc_nguoi_moi_id_fkey FOREIGN KEY (nguoi_moi_id) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.nguoi_dung (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ten character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  mat_khau_hash character varying NOT NULL,
  vai_tro character varying DEFAULT 'member'::character varying CHECK (vai_tro::text = ANY (ARRAY['owner'::character varying::text, 'admin'::character varying::text, 'manager'::character varying::text, 'member'::character varying::text])),
  phong_ban_id uuid,
  avatar_url character varying,
  ty_le_hoan_thanh real DEFAULT 0.0,
  ngay_tao timestamp with time zone DEFAULT now(),
  cap_nhat_cuoi timestamp with time zone DEFAULT now(),
  to_chuc_id uuid,
  onboarding_completed boolean DEFAULT false,
  ten_cong_ty character varying,
  ten_phong_ban character varying,
  settings jsonb DEFAULT '{"dashboard": {"defaultPage": "/dashboard", "itemsPerPage": 10}, "appearance": {"theme": "system", "language": "vi"}, "savedViews": {"kanban": [], "planning": [], "analytics": []}, "notifications": {"pushEnabled": false, "emailComments": true, "emailTeamDigest": true, "emailTaskAssigned": true, "emailReviewRequests": true, "emailApprovalResults": true, "emailDeadlineReminder": true}}'::jsonb,
  CONSTRAINT nguoi_dung_pkey PRIMARY KEY (id),
  CONSTRAINT nguoi_dung_phong_ban_id_fkey FOREIGN KEY (phong_ban_id) REFERENCES public.phong_ban(id),
  CONSTRAINT nguoi_dung_to_chuc_id_fkey FOREIGN KEY (to_chuc_id) REFERENCES public.to_chuc(id)
);
CREATE TABLE public.phan_du_an (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ten character varying NOT NULL,
  mo_ta text,
  deadline timestamp with time zone NOT NULL,
  du_an_id uuid NOT NULL,
  phong_ban_id uuid NOT NULL,
  trang_thai character varying DEFAULT 'todo'::character varying CHECK (trang_thai::text = ANY (ARRAY['todo'::character varying, 'in-progress'::character varying, 'done'::character varying]::text[])),
  phan_tram_hoan_thanh real DEFAULT 0.0,
  ngay_tao timestamp with time zone DEFAULT now(),
  cap_nhat_cuoi timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  CONSTRAINT phan_du_an_pkey PRIMARY KEY (id),
  CONSTRAINT phan_du_an_du_an_id_fkey FOREIGN KEY (du_an_id) REFERENCES public.du_an(id),
  CONSTRAINT phan_du_an_phong_ban_id_fkey FOREIGN KEY (phong_ban_id) REFERENCES public.phong_ban(id)
);
CREATE TABLE public.phong_ban (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ten character varying NOT NULL,
  mo_ta text,
  so_luong_thanh_vien integer DEFAULT 0,
  ngay_tao timestamp with time zone DEFAULT now(),
  to_chuc_id uuid,
  CONSTRAINT phong_ban_pkey PRIMARY KEY (id),
  CONSTRAINT phong_ban_to_chuc_id_fkey FOREIGN KEY (to_chuc_id) REFERENCES public.to_chuc(id)
);
CREATE TABLE public.recurring_task_rule (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  source_task_id uuid,
  title character varying NOT NULL,
  description text,
  priority character varying DEFAULT 'medium'::character varying CHECK (priority::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying]::text[])),
  cron_expression character varying NOT NULL,
  phan_du_an_id uuid NOT NULL,
  assignee_id uuid,
  template_id uuid,
  checklist_template jsonb DEFAULT '[]'::jsonb,
  next_run_at timestamp with time zone NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid NOT NULL,
  ngay_tao timestamp with time zone DEFAULT now(),
  cap_nhat_cuoi timestamp with time zone DEFAULT now(),
  CONSTRAINT recurring_task_rule_pkey PRIMARY KEY (id),
  CONSTRAINT recurring_task_rule_source_task_id_fkey FOREIGN KEY (source_task_id) REFERENCES public.task(id),
  CONSTRAINT recurring_task_rule_phan_du_an_id_fkey FOREIGN KEY (phan_du_an_id) REFERENCES public.phan_du_an(id),
  CONSTRAINT recurring_task_rule_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.nguoi_dung(id),
  CONSTRAINT recurring_task_rule_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.task_template(id),
  CONSTRAINT recurring_task_rule_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.task (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ten character varying NOT NULL,
  mo_ta text,
  deadline timestamp with time zone NOT NULL,
  phan_du_an_id uuid NOT NULL,
  assignee_id uuid,
  trang_thai character varying DEFAULT 'todo'::character varying CHECK (trang_thai::text = ANY (ARRAY['todo'::character varying, 'in-progress'::character varying, 'done'::character varying]::text[])),
  priority character varying DEFAULT 'medium'::character varying CHECK (priority::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying]::text[])),
  progress integer DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  risk_score integer DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level character varying DEFAULT 'low'::character varying CHECK (risk_level::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying]::text[])),
  risk_updated_at timestamp with time zone,
  is_stale boolean DEFAULT false,
  ngay_tao timestamp with time zone DEFAULT now(),
  cap_nhat_cuoi timestamp with time zone DEFAULT now(),
  deleted_at timestamp with time zone,
  progress_mode character varying DEFAULT 'manual'::character varying CHECK (progress_mode::text = ANY (ARRAY['manual'::character varying, 'checklist'::character varying]::text[])),
  template_id uuid,
  recurring_rule_id uuid,
  review_status character varying NOT NULL DEFAULT 'draft'::character varying CHECK (review_status::text = ANY (ARRAY['draft'::character varying, 'pending_review'::character varying, 'approved'::character varying, 'changes_requested'::character varying]::text[])),
  submitted_for_review_at timestamp with time zone,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  review_comment text,
  CONSTRAINT task_pkey PRIMARY KEY (id),
  CONSTRAINT task_phan_du_an_id_fkey FOREIGN KEY (phan_du_an_id) REFERENCES public.phan_du_an(id),
  CONSTRAINT task_assignee_id_fkey FOREIGN KEY (assignee_id) REFERENCES public.nguoi_dung(id),
  CONSTRAINT task_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.task_template(id),
  CONSTRAINT task_recurring_rule_id_fkey FOREIGN KEY (recurring_rule_id) REFERENCES public.recurring_task_rule(id),
  CONSTRAINT task_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.task_attachment (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL,
  file_name character varying NOT NULL,
  file_url text NOT NULL,
  mime_type character varying,
  size integer NOT NULL DEFAULT 0,
  cloudinary_public_id character varying,
  uploaded_by uuid,
  ngay_tao timestamp with time zone DEFAULT now(),
  CONSTRAINT task_attachment_pkey PRIMARY KEY (id),
  CONSTRAINT task_attachment_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id),
  CONSTRAINT task_attachment_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.task_checklist_item (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  task_id uuid NOT NULL,
  title character varying NOT NULL,
  is_done boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  ngay_tao timestamp with time zone DEFAULT now(),
  cap_nhat_cuoi timestamp with time zone DEFAULT now(),
  CONSTRAINT task_checklist_item_pkey PRIMARY KEY (id),
  CONSTRAINT task_checklist_item_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.task(id)
);
CREATE TABLE public.task_template (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ten character varying NOT NULL,
  mo_ta text,
  default_priority character varying DEFAULT 'medium'::character varying CHECK (default_priority::text = ANY (ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'urgent'::character varying]::text[])),
  checklist_template jsonb DEFAULT '[]'::jsonb,
  created_by uuid NOT NULL,
  is_shared boolean DEFAULT false,
  ngay_tao timestamp with time zone DEFAULT now(),
  cap_nhat_cuoi timestamp with time zone DEFAULT now(),
  CONSTRAINT task_template_pkey PRIMARY KEY (id),
  CONSTRAINT task_template_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.thanh_vien_du_an (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  du_an_id uuid NOT NULL,
  nguoi_dung_id uuid,
  email character varying NOT NULL,
  vai_tro character varying DEFAULT 'member'::character varying CHECK (vai_tro::text = ANY (ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying]::text[])),
  trang_thai character varying DEFAULT 'pending'::character varying CHECK (trang_thai::text = ANY (ARRAY['pending'::character varying, 'active'::character varying, 'declined'::character varying]::text[])),
  ngay_moi timestamp with time zone DEFAULT now(),
  ngay_tham_gia timestamp with time zone,
  nguoi_moi_id uuid NOT NULL,
  CONSTRAINT thanh_vien_du_an_pkey PRIMARY KEY (id),
  CONSTRAINT thanh_vien_du_an_du_an_id_fkey FOREIGN KEY (du_an_id) REFERENCES public.du_an(id),
  CONSTRAINT thanh_vien_du_an_nguoi_dung_id_fkey FOREIGN KEY (nguoi_dung_id) REFERENCES public.nguoi_dung(id),
  CONSTRAINT thanh_vien_du_an_nguoi_moi_id_fkey FOREIGN KEY (nguoi_moi_id) REFERENCES public.nguoi_dung(id)
);
CREATE TABLE public.thong_bao (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  nguoi_dung_id uuid NOT NULL,
  loai character varying NOT NULL CHECK (loai::text = ANY (ARRAY['risk_alert'::character varying::text, 'stale_task'::character varying::text, 'assignment'::character varying::text, 'overload'::character varying::text, 'project_invitation'::character varying::text, 'organization_join_request'::character varying::text])),
  noi_dung text NOT NULL,
  task_lien_quan_id uuid,
  da_doc boolean DEFAULT false,
  thoi_gian timestamp with time zone DEFAULT now(),
  du_an_lien_quan_id uuid,
  thanh_vien_du_an_id uuid,
  CONSTRAINT thong_bao_pkey PRIMARY KEY (id),
  CONSTRAINT thong_bao_nguoi_dung_id_fkey FOREIGN KEY (nguoi_dung_id) REFERENCES public.nguoi_dung(id),
  CONSTRAINT thong_bao_task_lien_quan_id_fkey FOREIGN KEY (task_lien_quan_id) REFERENCES public.task(id),
  CONSTRAINT thong_bao_du_an_lien_quan_id_fkey FOREIGN KEY (du_an_lien_quan_id) REFERENCES public.du_an(id),
  CONSTRAINT thong_bao_thanh_vien_du_an_id_fkey FOREIGN KEY (thanh_vien_du_an_id) REFERENCES public.thanh_vien_du_an(id)
);
CREATE TABLE public.to_chuc (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  ten character varying NOT NULL,
  mo_ta text,
  logo_url character varying,
  nguoi_tao_id uuid NOT NULL,
  ngay_tao timestamp with time zone DEFAULT now(),
  cap_nhat_cuoi timestamp with time zone DEFAULT now(),
  CONSTRAINT to_chuc_pkey PRIMARY KEY (id)
);
CREATE TABLE public.yeu_cau_gia_nhap_to_chuc (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  to_chuc_id uuid NOT NULL,
  nguoi_dung_id uuid NOT NULL,
  email character varying NOT NULL,
  trang_thai character varying NOT NULL DEFAULT 'pending'::character varying CHECK (trang_thai::text = ANY (ARRAY['pending'::character varying::text, 'approved'::character varying::text, 'rejected'::character varying::text, 'cancelled'::character varying::text])),
  nguoi_duyet_id uuid,
  ngay_gui timestamp with time zone NOT NULL DEFAULT now(),
  ngay_phan_hoi timestamp with time zone,
  CONSTRAINT yeu_cau_gia_nhap_to_chuc_pkey PRIMARY KEY (id),
  CONSTRAINT yeu_cau_gia_nhap_to_chuc_to_chuc_id_fkey FOREIGN KEY (to_chuc_id) REFERENCES public.to_chuc(id),
  CONSTRAINT yeu_cau_gia_nhap_to_chuc_nguoi_dung_id_fkey FOREIGN KEY (nguoi_dung_id) REFERENCES public.nguoi_dung(id),
  CONSTRAINT yeu_cau_gia_nhap_to_chuc_nguoi_duyet_id_fkey FOREIGN KEY (nguoi_duyet_id) REFERENCES public.nguoi_dung(id)
);