DO $$
DECLARE
  table_name text;
  tables text[] := ARRAY[
    'activity_log',
    'binh_luan',
    'du_an',
    'ky_nang_nguoi_dung',
    'loi_moi_to_chuc',
    'nguoi_dung',
    'phan_du_an',
    'phong_ban',
    'recurring_task_rule',
    'task',
    'task_attachment',
    'task_checklist_item',
    'task_template',
    'thanh_vien_du_an',
    'thong_bao',
    'to_chuc',
    'yeu_cau_gia_nhap_to_chuc'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = table_name
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', table_name);
    END IF;
  END LOOP;
END $$;
