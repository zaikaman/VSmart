create table if not exists public.yeu_cau_gia_nhap_to_chuc (
  id uuid primary key default uuid_generate_v4(),
  to_chuc_id uuid not null references public.to_chuc(id) on delete cascade,
  nguoi_dung_id uuid not null references public.nguoi_dung(id) on delete cascade,
  email character varying not null,
  trang_thai character varying not null default 'pending'
    check (trang_thai::text = any (array['pending'::character varying, 'approved'::character varying, 'rejected'::character varying, 'cancelled'::character varying]::text[])),
  nguoi_duyet_id uuid references public.nguoi_dung(id) on delete set null,
  ngay_gui timestamp with time zone not null default now(),
  ngay_phan_hoi timestamp with time zone
);

create index if not exists yeu_cau_gia_nhap_to_chuc_to_chuc_id_idx
  on public.yeu_cau_gia_nhap_to_chuc (to_chuc_id);

create index if not exists yeu_cau_gia_nhap_to_chuc_nguoi_dung_id_idx
  on public.yeu_cau_gia_nhap_to_chuc (nguoi_dung_id);

create unique index if not exists yeu_cau_gia_nhap_to_chuc_pending_unique_idx
  on public.yeu_cau_gia_nhap_to_chuc (to_chuc_id, nguoi_dung_id)
  where trang_thai = 'pending';
