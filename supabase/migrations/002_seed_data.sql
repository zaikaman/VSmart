-- Seed Data cho VSmart
-- Chạy sau khi đã chạy 001_initial_schema.sql

-- Insert Phòng Ban
INSERT INTO phong_ban (id, ten, mo_ta, so_luong_thanh_vien) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Engineering', 'Phòng phát triển phần mềm', 5),
  ('22222222-2222-2222-2222-222222222222', 'Design', 'Phòng thiết kế UX/UI', 3),
  ('33333333-3333-3333-3333-333333333333', 'Marketing', 'Phòng marketing và truyền thông', 2);

-- Insert Người Dùng (password: "password123" - bcrypt hash)
INSERT INTO nguoi_dung (id, ten, email, mat_khau_hash, vai_tro, phong_ban_id, ty_le_hoan_thanh) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Admin User', 'admin@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'admin', NULL, 1.0),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Manager Nguyễn Văn A', 'manager@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'manager', '11111111-1111-1111-1111-111111111111', 0.92),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Dev Trần Thị B', 'dev1@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', '11111111-1111-1111-1111-111111111111', 0.88),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Dev Lê Văn C', 'dev2@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', '11111111-1111-1111-1111-111111111111', 0.95),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Designer Phạm Thị D', 'designer1@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', '22222222-2222-2222-2222-222222222222', 0.90),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Designer Hoàng Văn E', 'designer2@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', '22222222-2222-2222-2222-222222222222', 0.85),
  ('10101010-1010-1010-1010-101010101010', 'Marketing Vũ Thị F', 'marketing1@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', '33333333-3333-3333-3333-333333333333', 0.87);

-- Insert Kỹ Năng
INSERT INTO ky_nang_nguoi_dung (nguoi_dung_id, ten_ky_nang, trinh_do, nam_kinh_nghiem) VALUES
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'React', 'expert', 5),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'TypeScript', 'advanced', 4),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Node.js', 'advanced', 4),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Python', 'expert', 6),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'PostgreSQL', 'advanced', 5),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Docker', 'intermediate', 3),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Figma', 'expert', 4),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'UI Design', 'expert', 5),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'UX Research', 'advanced', 3);

-- Insert Dự Án
INSERT INTO du_an (id, ten, mo_ta, deadline, trang_thai, nguoi_tao_id, phan_tram_hoan_thanh) VALUES
  ('d1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', 'Website Redesign 2026', 'Thiết kế lại website chính của công ty', '2026-03-31 23:59:59+00', 'in-progress', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 35.0),
  ('d2d2d2d2-d2d2-d2d2-d2d2-d2d2d2d2d2d2', 'Mobile App MVP', 'Phát triển MVP cho ứng dụng mobile', '2026-04-30 23:59:59+00', 'in-progress', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 20.0),
  ('d3d3d3d3-d3d3-d3d3-d3d3-d3d3d3d3d3d3', 'Marketing Campaign Q1', 'Chiến dịch marketing quý 1', '2026-03-31 23:59:59+00', 'todo', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 0.0);

-- Insert Phần Dự Án
INSERT INTO phan_du_an (id, ten, mo_ta, deadline, du_an_id, phong_ban_id, trang_thai, phan_tram_hoan_thanh) VALUES
  ('11111111-2222-3333-4444-555555555555', 'Frontend Development', 'Phát triển giao diện người dùng', '2026-02-28 23:59:59+00', 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', '11111111-1111-1111-1111-111111111111', 'in-progress', 40.0),
  ('22222222-3333-4444-5555-666666666666', 'UI/UX Design', 'Thiết kế giao diện và trải nghiệm', '2026-02-15 23:59:59+00', 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', '22222222-2222-2222-2222-222222222222', 'in-progress', 60.0),
  ('33333333-4444-5555-6666-777777777777', 'Backend API', 'Phát triển API backend', '2026-03-15 23:59:59+00', 'd1d1d1d1-d1d1-d1d1-d1d1-d1d1d1d1d1d1', '11111111-1111-1111-1111-111111111111', 'todo', 0.0);

-- Insert Tasks
INSERT INTO task (id, ten, mo_ta, deadline, phan_du_an_id, assignee_id, trang_thai, priority, progress, risk_score, risk_level) VALUES
  ('11111111-aaaa-bbbb-cccc-dddddddddddd', 'Implement Homepage UI', 'Xây dựng giao diện trang chủ', '2026-02-05 23:59:59+00', '11111111-2222-3333-4444-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'in-progress', 'high', 60, 25, 'low'),
  ('22222222-aaaa-bbbb-cccc-dddddddddddd', 'Setup Responsive Design', 'Thiết lập responsive cho mobile', '2026-02-10 23:59:59+00', '11111111-2222-3333-4444-555555555555', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'todo', 'medium', 0, 15, 'low'),
  ('33333333-aaaa-bbbb-cccc-dddddddddddd', 'Design Homepage Mockup', 'Tạo mockup cho trang chủ', '2026-02-01 23:59:59+00', '22222222-3333-4444-5555-666666666666', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'done', 'high', 100, 0, 'low'),
  ('44444444-aaaa-bbbb-cccc-dddddddddddd', 'User Flow Diagram', 'Vẽ user flow cho các trang chính', '2026-02-08 23:59:59+00', '22222222-3333-4444-5555-666666666666', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'in-progress', 'medium', 70, 30, 'low'),
  ('55555555-aaaa-bbbb-cccc-dddddddddddd', 'API Endpoint Design', 'Thiết kế các REST API endpoints', '2026-02-20 23:59:59+00', '33333333-4444-5555-6666-777777777777', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'todo', 'high', 0, 45, 'medium'),
  ('66666666-aaaa-bbbb-cccc-dddddddddddd', 'Database Schema Design', 'Thiết kế schema cho PostgreSQL', '2026-02-15 23:59:59+00', '33333333-4444-5555-6666-777777777777', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'in-progress', 'urgent', 30, 75, 'high');

-- Insert Lịch Sử Task (một vài ví dụ)
INSERT INTO lich_su_task (task_id, hanh_dong, nguoi_thuc_hien_id, gia_tri_moi) VALUES
  ('11111111-aaaa-bbbb-cccc-dddddddddddd', 'created', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{"trang_thai": "todo"}'::jsonb),
  ('11111111-aaaa-bbbb-cccc-dddddddddddd', 'assigned', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '{"assignee_id": "cccccccc-cccc-cccc-cccc-cccccccccccc"}'::jsonb),
  ('11111111-aaaa-bbbb-cccc-dddddddddddd', 'status_changed', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '{"trang_thai": "in-progress"}'::jsonb),
  ('33333333-aaaa-bbbb-cccc-dddddddddddd', 'completed', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '{"trang_thai": "done", "progress": 100}'::jsonb);

-- Insert Thông Báo (một vài ví dụ)
INSERT INTO thong_bao (nguoi_dung_id, loai, noi_dung, task_lien_quan_id, da_doc) VALUES
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'risk_alert', 'Task "Database Schema Design" có 75% nguy cơ trễ hạn. Vui lòng kiểm tra!', '66666666-aaaa-bbbb-cccc-dddddddddddd', false),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'assignment', 'Bạn được giao task mới: "Implement Homepage UI"', '11111111-aaaa-bbbb-cccc-dddddddddddd', true),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'assignment', 'Bạn được giao task mới: "User Flow Diagram"', '44444444-aaaa-bbbb-cccc-dddddddddddd', false);
