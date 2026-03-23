create table if not exists public.loi_moi_to_chuc (
  id uuid primary key default uuid_generate_v4(),
  to_chuc_id uuid not null references public.to_chuc(id) on delete cascade,
  nguoi_dung_id uuid references public.nguoi_dung(id) on delete set null,
  email character varying not null,
  vai_tro character varying not null default 'member'
    check (vai_tro::text = any (array['admin'::character varying, 'manager'::character varying, 'member'::character varying]::text[])),
  trang_thai character varying not null default 'pending'
    check (trang_thai::text = any (array['pending'::character varying, 'accepted'::character varying, 'declined'::character varying, 'cancelled'::character varying]::text[])),
  nguoi_moi_id uuid not null references public.nguoi_dung(id),
  ngay_moi timestamp with time zone not null default now(),
  ngay_phan_hoi timestamp with time zone
);

create index if not exists loi_moi_to_chuc_to_chuc_id_idx
  on public.loi_moi_to_chuc (to_chuc_id);

create index if not exists loi_moi_to_chuc_email_idx
  on public.loi_moi_to_chuc (lower(email));

create unique index if not exists loi_moi_to_chuc_pending_unique_idx
  on public.loi_moi_to_chuc (to_chuc_id, lower(email))
  where trang_thai = 'pending';
