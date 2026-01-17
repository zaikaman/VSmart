-- Migration: Thêm Organizations và Project Members
-- Mục đích: Phân quyền theo tổ chức và quản lý thành viên dự án

-- Bảng Tổ Chức (Organizations)
CREATE TABLE to_chuc (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ten VARCHAR(200) NOT NULL,
  mo_ta TEXT,
  logo_url VARCHAR(500),
  nguoi_tao_id UUID NOT NULL,
  ngay_tao TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cap_nhat_cuoi TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Thêm cột organization_id vào bảng nguoi_dung
ALTER TABLE nguoi_dung ADD COLUMN to_chuc_id UUID REFERENCES to_chuc(id) ON DELETE SET NULL;
ALTER TABLE nguoi_dung ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE nguoi_dung ADD COLUMN ten_cong_ty VARCHAR(200);
ALTER TABLE nguoi_dung ADD COLUMN ten_phong_ban VARCHAR(200);

-- Thêm cột organization_id vào bảng phong_ban
ALTER TABLE phong_ban ADD COLUMN to_chuc_id UUID REFERENCES to_chuc(id) ON DELETE CASCADE;

-- Thêm cột organization_id vào bảng du_an
ALTER TABLE du_an ADD COLUMN to_chuc_id UUID REFERENCES to_chuc(id) ON DELETE CASCADE;

-- Bảng Thành Viên Dự Án
CREATE TABLE thanh_vien_du_an (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  du_an_id UUID NOT NULL REFERENCES du_an(id) ON DELETE CASCADE,
  nguoi_dung_id UUID REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL, -- Email để mời người chưa có tài khoản
  vai_tro VARCHAR(20) DEFAULT 'member' CHECK (vai_tro IN ('owner', 'admin', 'member', 'viewer')),
  trang_thai VARCHAR(20) DEFAULT 'pending' CHECK (trang_thai IN ('pending', 'active', 'declined')),
  ngay_moi TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ngay_tham_gia TIMESTAMP WITH TIME ZONE,
  nguoi_moi_id UUID NOT NULL REFERENCES nguoi_dung(id) ON DELETE CASCADE,
  UNIQUE(du_an_id, email)
);

-- Indexes
CREATE INDEX idx_nguoi_dung_to_chuc ON nguoi_dung(to_chuc_id);
CREATE INDEX idx_phong_ban_to_chuc ON phong_ban(to_chuc_id);
CREATE INDEX idx_du_an_to_chuc ON du_an(to_chuc_id);
CREATE INDEX idx_thanh_vien_du_an_du_an ON thanh_vien_du_an(du_an_id);
CREATE INDEX idx_thanh_vien_du_an_nguoi_dung ON thanh_vien_du_an(nguoi_dung_id);
CREATE INDEX idx_thanh_vien_du_an_email ON thanh_vien_du_an(email);
CREATE INDEX idx_nguoi_dung_onboarding ON nguoi_dung(onboarding_completed);

-- Enable RLS
ALTER TABLE to_chuc ENABLE ROW LEVEL SECURITY;
ALTER TABLE thanh_vien_du_an ENABLE ROW LEVEL SECURITY;

-- RLS Policies cho to_chuc
-- Users chỉ có thể xem tổ chức của họ
CREATE POLICY "Users can view their organization" 
  ON to_chuc FOR SELECT 
  USING (
    id IN (
      SELECT to_chuc_id FROM nguoi_dung 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Users có thể tạo tổ chức mới
CREATE POLICY "Users can create organization" 
  ON to_chuc FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Chỉ người tạo có thể cập nhật tổ chức
CREATE POLICY "Organization creator can update" 
  ON to_chuc FOR UPDATE 
  USING (
    nguoi_tao_id IN (
      SELECT id FROM nguoi_dung 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- RLS Policies cho thanh_vien_du_an
-- Users có thể xem thành viên của dự án họ tham gia
CREATE POLICY "Users can view project members" 
  ON thanh_vien_du_an FOR SELECT 
  USING (
    du_an_id IN (
      SELECT du_an_id FROM thanh_vien_du_an 
      WHERE email = auth.jwt() ->> 'email' AND trang_thai = 'active'
    )
    OR
    du_an_id IN (
      SELECT id FROM du_an 
      WHERE nguoi_tao_id IN (
        SELECT id FROM nguoi_dung 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Chỉ owner và admin có thể thêm thành viên
CREATE POLICY "Project owners and admins can add members" 
  ON thanh_vien_du_an FOR INSERT 
  WITH CHECK (
    du_an_id IN (
      SELECT tv.du_an_id 
      FROM thanh_vien_du_an tv
      WHERE tv.email = auth.jwt() ->> 'email' 
        AND tv.vai_tro IN ('owner', 'admin')
        AND tv.trang_thai = 'active'
    )
    OR
    du_an_id IN (
      SELECT id FROM du_an 
      WHERE nguoi_tao_id IN (
        SELECT id FROM nguoi_dung 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Users có thể cập nhật trạng thái của chính họ (accept/decline)
CREATE POLICY "Users can update their own membership status" 
  ON thanh_vien_du_an FOR UPDATE 
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (email = auth.jwt() ->> 'email');

-- Owners và admins có thể xóa thành viên
CREATE POLICY "Project owners and admins can remove members" 
  ON thanh_vien_du_an FOR DELETE 
  USING (
    du_an_id IN (
      SELECT tv.du_an_id 
      FROM thanh_vien_du_an tv
      WHERE tv.email = auth.jwt() ->> 'email' 
        AND tv.vai_tro IN ('owner', 'admin')
        AND tv.trang_thai = 'active'
    )
    OR
    du_an_id IN (
      SELECT id FROM du_an 
      WHERE nguoi_tao_id IN (
        SELECT id FROM nguoi_dung 
        WHERE email = auth.jwt() ->> 'email'
      )
    )
  );

-- Cập nhật RLS Policies cho du_an
-- Xóa policy cũ
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON du_an;
DROP POLICY IF EXISTS "Enable write access for authenticated users" ON du_an;

-- Users chỉ có thể xem dự án trong tổ chức của họ HOẶC dự án họ là thành viên
CREATE POLICY "Users can view projects in their organization or they are members of" 
  ON du_an FOR SELECT 
  USING (
    to_chuc_id IN (
      SELECT to_chuc_id FROM nguoi_dung 
      WHERE email = auth.jwt() ->> 'email'
    )
    OR
    id IN (
      SELECT du_an_id FROM thanh_vien_du_an 
      WHERE email = auth.jwt() ->> 'email' AND trang_thai = 'active'
    )
  );

-- Users có thể tạo dự án trong tổ chức của họ
CREATE POLICY "Users can create projects in their organization" 
  ON du_an FOR INSERT 
  WITH CHECK (
    to_chuc_id IN (
      SELECT to_chuc_id FROM nguoi_dung 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Project members với role owner/admin có thể cập nhật dự án
CREATE POLICY "Project owners and admins can update projects" 
  ON du_an FOR UPDATE 
  USING (
    id IN (
      SELECT du_an_id FROM thanh_vien_du_an 
      WHERE email = auth.jwt() ->> 'email' 
        AND vai_tro IN ('owner', 'admin')
        AND trang_thai = 'active'
    )
    OR
    nguoi_tao_id IN (
      SELECT id FROM nguoi_dung 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Chỉ người tạo có thể xóa dự án
CREATE POLICY "Project creators can delete projects" 
  ON du_an FOR DELETE 
  USING (
    nguoi_tao_id IN (
      SELECT id FROM nguoi_dung 
      WHERE email = auth.jwt() ->> 'email'
    )
  );

-- Trigger để tự động cập nhật cap_nhat_cuoi cho to_chuc
CREATE TRIGGER update_to_chuc_cap_nhat_cuoi
  BEFORE UPDATE ON to_chuc
  FOR EACH ROW
  EXECUTE FUNCTION update_cap_nhat_cuoi();

-- Function để tự động thêm người tạo dự án vào thanh_vien_du_an với role owner
CREATE OR REPLACE FUNCTION add_project_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO thanh_vien_du_an (du_an_id, nguoi_dung_id, email, vai_tro, trang_thai, ngay_tham_gia, nguoi_moi_id)
  SELECT 
    NEW.id,
    NEW.nguoi_tao_id,
    nd.email,
    'owner',
    'active',
    NOW(),
    NEW.nguoi_tao_id
  FROM nguoi_dung nd
  WHERE nd.id = NEW.nguoi_tao_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để tự động thêm owner khi tạo dự án mới
CREATE TRIGGER add_project_creator_trigger
  AFTER INSERT ON du_an
  FOR EACH ROW
  EXECUTE FUNCTION add_project_creator_as_owner();

-- Function để cập nhật ngay_tham_gia khi chấp nhận lời mời
CREATE OR REPLACE FUNCTION update_ngay_tham_gia()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.trang_thai = 'pending' AND NEW.trang_thai = 'active' THEN
    NEW.ngay_tham_gia = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger để cập nhật ngay_tham_gia
CREATE TRIGGER update_ngay_tham_gia_trigger
  BEFORE UPDATE ON thanh_vien_du_an
  FOR EACH ROW
  EXECUTE FUNCTION update_ngay_tham_gia();

COMMENT ON TABLE to_chuc IS 'Bảng quản lý các tổ chức/công ty';
COMMENT ON TABLE thanh_vien_du_an IS 'Bảng quản lý thành viên của từng dự án';
COMMENT ON COLUMN nguoi_dung.onboarding_completed IS 'Đánh dấu user đã hoàn thành onboarding chưa';
COMMENT ON COLUMN nguoi_dung.ten_cong_ty IS 'Tên công ty user nhập trong quá trình onboarding';
COMMENT ON COLUMN nguoi_dung.ten_phong_ban IS 'Tên phòng ban user nhập trong quá trình onboarding';
