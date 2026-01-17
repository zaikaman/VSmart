-- Fix RLS Policy for to_chuc table
-- Vấn đề: Policy INSERT đang dùng auth.role() sai, cần sửa lại

-- Drop policy cũ
DROP POLICY IF EXISTS "Users can create organization" ON to_chuc;

-- Tạo policy mới đúng
CREATE POLICY "Users can create organization" 
  ON to_chuc FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Hoặc có thể dùng cách này nếu muốn check email
-- CREATE POLICY "Users can create organization" 
--   ON to_chuc FOR INSERT 
--   WITH CHECK (
--     auth.jwt() ->> 'email' IS NOT NULL
--   );
