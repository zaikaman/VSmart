-- Migration: Thêm loại thông báo project_invitation
-- Mục đích: Hỗ trợ thông báo lời mời vào dự án

-- Thêm loại 'project_invitation' vào enum của bảng thong_bao
ALTER TABLE thong_bao DROP CONSTRAINT IF EXISTS thong_bao_loai_check;

ALTER TABLE thong_bao ADD CONSTRAINT thong_bao_loai_check 
CHECK (loai::text = ANY (ARRAY[
  'risk_alert'::character varying, 
  'stale_task'::character varying, 
  'assignment'::character varying, 
  'overload'::character varying,
  'project_invitation'::character varying
]::text[]));

-- Thêm cột du_an_lien_quan_id để lưu project liên quan đến thông báo
ALTER TABLE thong_bao ADD COLUMN IF NOT EXISTS du_an_lien_quan_id UUID REFERENCES du_an(id) ON DELETE CASCADE;

-- Thêm cột thanh_vien_du_an_id để lưu reference đến lời mời
ALTER TABLE thong_bao ADD COLUMN IF NOT EXISTS thanh_vien_du_an_id UUID REFERENCES thanh_vien_du_an(id) ON DELETE CASCADE;

-- Tạo index cho các cột mới
CREATE INDEX IF NOT EXISTS idx_thong_bao_du_an_lien_quan ON thong_bao(du_an_lien_quan_id);
CREATE INDEX IF NOT EXISTS idx_thong_bao_thanh_vien_du_an ON thong_bao(thanh_vien_du_an_id);

-- Comment
COMMENT ON COLUMN thong_bao.du_an_lien_quan_id IS 'ID của dự án liên quan đến thông báo (dùng cho project_invitation)';
COMMENT ON COLUMN thong_bao.thanh_vien_du_an_id IS 'ID của lời mời thành viên dự án (dùng cho project_invitation)';
