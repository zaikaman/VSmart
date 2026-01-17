-- Seed Data cho VSmart
-- Chạy sau khi đã chạy 001_initial_schema.sql

-- Insert Phòng Ban
INSERT INTO phong_ban (id, ten, mo_ta, so_luong_thanh_vien) VALUES
  ('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'Engineering', 'Phòng phát triển phần mềm', 5),
  ('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Design', 'Phòng thiết kế UX/UI', 3),
  ('c3d4e5f6-a7b8-4c9d-ae1f-2a3b4c5d6e7f', 'Marketing', 'Phòng marketing và truyền thông', 2);

-- Insert Người Dùng (password: "password123" - bcrypt hash)
INSERT INTO nguoi_dung (id, ten, email, mat_khau_hash, vai_tro, phong_ban_id, ty_le_hoan_thanh) VALUES
  ('d4e5f6a7-b8c9-4d0e-9f2a-3b4c5d6e7f8a', 'Admin User', 'admin@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'admin', NULL, 1.0),
  ('e5f6a7b8-c9d0-4e1f-aa3b-4c5d6e7f8a9b', 'Manager Nguyễn Văn A', 'manager@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'manager', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 0.92),
  ('f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c', 'Dev Trần Thị B', 'dev1@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 0.88),
  ('a7b8c9d0-e1f2-4a3b-9c5d-6e7f8a9b0c1d', 'Dev Lê Văn C', 'dev2@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 0.95),
  ('b8c9d0e1-f2a3-4b4c-ad6e-7f8a9b0c1d2e', 'Designer Phạm Thị D', 'designer1@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 0.90),
  ('c9d0e1f2-a3b4-4c5d-be7f-8a9b0c1d2e3f', 'Designer Hoàng Văn E', 'designer2@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 0.85),
  ('d0e1f2a3-b4c5-4d6e-8f8a-9b0c1d2e3f4a', 'Marketing Vũ Thị F', 'marketing1@vsmart.vn', '$2a$10$rV8qKZqKZqKZqKZqKZqKZe', 'member', 'c3d4e5f6-a7b8-4c9d-ae1f-2a3b4c5d6e7f', 0.87);

-- Insert Kỹ Năng
INSERT INTO ky_nang_nguoi_dung (nguoi_dung_id, ten_ky_nang, trinh_do, nam_kinh_nghiem) VALUES
  ('f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c', 'React', 'expert', 5),
  ('f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c', 'TypeScript', 'advanced', 4),
  ('f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c', 'Node.js', 'advanced', 4),
  ('a7b8c9d0-e1f2-4a3b-9c5d-6e7f8a9b0c1d', 'Python', 'expert', 6),
  ('a7b8c9d0-e1f2-4a3b-9c5d-6e7f8a9b0c1d', 'PostgreSQL', 'advanced', 5),
  ('a7b8c9d0-e1f2-4a3b-9c5d-6e7f8a9b0c1d', 'Docker', 'intermediate', 3),
  ('b8c9d0e1-f2a3-4b4c-ad6e-7f8a9b0c1d2e', 'Figma', 'expert', 4),
  ('b8c9d0e1-f2a3-4b4c-ad6e-7f8a9b0c1d2e', 'UI Design', 'expert', 5),
  ('c9d0e1f2-a3b4-4c5d-be7f-8a9b0c1d2e3f', 'UX Research', 'advanced', 3);

-- Insert Dự Án
INSERT INTO du_an (id, ten, mo_ta, deadline, trang_thai, nguoi_tao_id, phan_tram_hoan_thanh) VALUES
  ('e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', 'Website Redesign 2026', 'Thiết kế lại website chính của công ty', '2026-03-31 23:59:59+00', 'in-progress', 'e5f6a7b8-c9d0-4e1f-aa3b-4c5d6e7f8a9b', 35.0),
  ('f2a3b4c5-d6e7-4f8a-9b0c-1d2e3f4a5b6c', 'Mobile App MVP', 'Phát triển MVP cho ứng dụng mobile', '2026-04-30 23:59:59+00', 'in-progress', 'e5f6a7b8-c9d0-4e1f-aa3b-4c5d6e7f8a9b', 20.0),
  ('a3b4c5d6-e7f8-4a9b-8c1d-2e3f4a5b6c7d', 'Marketing Campaign Q1', 'Chiến dịch marketing quý 1', '2026-03-31 23:59:59+00', 'todo', 'e5f6a7b8-c9d0-4e1f-aa3b-4c5d6e7f8a9b', 0.0);

-- Insert Phần Dự Án
INSERT INTO phan_du_an (id, ten, mo_ta, deadline, du_an_id, phong_ban_id, trang_thai, phan_tram_hoan_thanh) VALUES
  ('b4c5d6e7-f8a9-4b0c-9d2e-3f4a5b6c7d8e', 'Frontend Development', 'Phát triển giao diện người dùng', '2026-02-28 23:59:59+00', 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'in-progress', 40.0),
  ('c5d6e7f8-a9b0-4c1d-ae3f-4a5b6c7d8e9f', 'UI/UX Design', 'Thiết kế giao diện và trải nghiệm', '2026-02-15 23:59:59+00', 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'in-progress', 60.0),
  ('d6e7f8a9-b0c1-4d2e-bf4a-5b6c7d8e9f0a', 'Backend API', 'Phát triển API backend', '2026-03-15 23:59:59+00', 'e1f2a3b4-c5d6-4e7f-8a9b-0c1d2e3f4a5b', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'todo', 0.0);

-- Insert Tasks
INSERT INTO task (id, ten, mo_ta, deadline, phan_du_an_id, assignee_id, trang_thai, priority, progress, risk_score, risk_level) VALUES
  ('e7f8a9b0-c1d2-4e3f-8a5b-6c7d8e9f0a1b', 'Implement Homepage UI', 'Xây dựng giao diện trang chủ', '2026-02-05 23:59:59+00', 'b4c5d6e7-f8a9-4b0c-9d2e-3f4a5b6c7d8e', 'f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c', 'in-progress', 'high', 60, 25, 'low'),
  ('f8a9b0c1-d2e3-4f4a-9b6c-7d8e9f0a1b2c', 'Setup Responsive Design', 'Thiết lập responsive cho mobile', '2026-02-10 23:59:59+00', 'b4c5d6e7-f8a9-4b0c-9d2e-3f4a5b6c7d8e', 'f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c', 'todo', 'medium', 0, 15, 'low'),
  ('a9b0c1d2-e3f4-4a5b-8c7d-8e9f0a1b2c3d', 'Design Homepage Mockup', 'Tạo mockup cho trang chủ', '2026-02-01 23:59:59+00', 'c5d6e7f8-a9b0-4c1d-ae3f-4a5b6c7d8e9f', 'b8c9d0e1-f2a3-4b4c-ad6e-7f8a9b0c1d2e', 'done', 'high', 100, 0, 'low'),
  ('b0c1d2e3-f4a5-4b6c-9d8e-9f0a1b2c3d4e', 'User Flow Diagram', 'Vẽ user flow cho các trang chính', '2026-02-08 23:59:59+00', 'c5d6e7f8-a9b0-4c1d-ae3f-4a5b6c7d8e9f', 'c9d0e1f2-a3b4-4c5d-be7f-8a9b0c1d2e3f', 'in-progress', 'medium', 70, 30, 'low'),
  ('c1d2e3f4-a5b6-4c7d-ae9f-0a1b2c3d4e5f', 'API Endpoint Design', 'Thiết kế các REST API endpoints', '2026-02-20 23:59:59+00', 'd6e7f8a9-b0c1-4d2e-bf4a-5b6c7d8e9f0a', 'a7b8c9d0-e1f2-4a3b-9c5d-6e7f8a9b0c1d', 'todo', 'high', 0, 45, 'medium'),
  ('d2e3f4a5-b6c7-4d8e-8f0a-1b2c3d4e5f6a', 'Database Schema Design', 'Thiết kế schema cho PostgreSQL', '2026-02-15 23:59:59+00', 'd6e7f8a9-b0c1-4d2e-bf4a-5b6c7d8e9f0a', 'a7b8c9d0-e1f2-4a3b-9c5d-6e7f8a9b0c1d', 'in-progress', 'urgent', 30, 75, 'high');

-- Insert Lịch Sử Task (một vài ví dụ)
INSERT INTO lich_su_task (task_id, hanh_dong, nguoi_thuc_hien_id, gia_tri_moi) VALUES
  ('e7f8a9b0-c1d2-4e3f-8a5b-6c7d8e9f0a1b', 'created', 'e5f6a7b8-c9d0-4e1f-aa3b-4c5d6e7f8a9b', '{"trang_thai": "todo"}'::jsonb),
  ('e7f8a9b0-c1d2-4e3f-8a5b-6c7d8e9f0a1b', 'assigned', 'e5f6a7b8-c9d0-4e1f-aa3b-4c5d6e7f8a9b', '{"assignee_id": "f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c"}'::jsonb),
  ('e7f8a9b0-c1d2-4e3f-8a5b-6c7d8e9f0a1b', 'status_changed', 'f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c', '{"trang_thai": "in-progress"}'::jsonb),
  ('a9b0c1d2-e3f4-4a5b-8c7d-8e9f0a1b2c3d', 'completed', 'b8c9d0e1-f2a3-4b4c-ad6e-7f8a9b0c1d2e', '{"trang_thai": "done", "progress": 100}'::jsonb);

-- Insert Thông Báo (một vài ví dụ)
INSERT INTO thong_bao (nguoi_dung_id, loai, noi_dung, task_lien_quan_id, da_doc) VALUES
  ('a7b8c9d0-e1f2-4a3b-9c5d-6e7f8a9b0c1d', 'risk_alert', 'Task "Database Schema Design" có 75% nguy cơ trễ hạn. Vui lòng kiểm tra!', 'd2e3f4a5-b6c7-4d8e-8f0a-1b2c3d4e5f6a', false),
  ('f6a7b8c9-d0e1-4f2a-8b4c-5d6e7f8a9b0c', 'assignment', 'Bạn được giao task mới: "Implement Homepage UI"', 'e7f8a9b0-c1d2-4e3f-8a5b-6c7d8e9f0a1b', true),
  ('c9d0e1f2-a3b4-4c5d-be7f-8a9b0c1d2e3f', 'assignment', 'Bạn được giao task mới: "User Flow Diagram"', 'b0c1d2e3-f4a5-4b6c-9d8e-9f0a1b2c3d4e', false);
