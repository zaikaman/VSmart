alter table public.thong_bao
  drop constraint if exists thong_bao_loai_check;

alter table public.thong_bao
  add constraint thong_bao_loai_check
  check (
    loai::text = any (
      array[
        'risk_alert'::character varying::text,
        'stale_task'::character varying::text,
        'assignment'::character varying::text,
        'overload'::character varying::text,
        'project_invitation'::character varying::text,
        'organization_join_request'::character varying::text
      ]
    )
  );
