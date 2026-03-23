-- Migration: Thêm settings cho tổ chức
-- Mục đích: kiểm soát việc có cho phép mời người ngoài tổ chức vào dự án hay không

ALTER TABLE to_chuc
ADD COLUMN settings JSONB NOT NULL DEFAULT '{"allow_external_project_invites": false}'::jsonb;

COMMENT ON COLUMN to_chuc.settings IS 'Cấu hình cấp tổ chức, ví dụ cho phép mời người ngoài tổ chức vào dự án';
