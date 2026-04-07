do $$
begin
  update public.to_chuc
  set ten = regexp_replace(btrim(ten), '\s+', ' ', 'g')
  where ten is not null
    and ten <> regexp_replace(btrim(ten), '\s+', ' ', 'g');

  with duplicated_organizations as (
    select
      id,
      regexp_replace(btrim(ten), '\s+', ' ', 'g') as normalized_name,
      row_number() over (
        partition by lower(regexp_replace(btrim(ten), '\s+', ' ', 'g'))
        order by ngay_tao asc nulls last, id asc
      ) as duplicate_rank
    from public.to_chuc
  )
  update public.to_chuc as organization
  set ten =
    left(
      duplicated_organizations.normalized_name,
      120 - length(' (' || left(organization.id::text, 8) || ')')
    ) || ' (' || left(organization.id::text, 8) || ')'
  from duplicated_organizations
  where organization.id = duplicated_organizations.id
    and duplicated_organizations.duplicate_rank > 1;
end $$;

create unique index if not exists to_chuc_ten_normalized_unique_idx
  on public.to_chuc (lower(regexp_replace(btrim(ten), '\s+', ' ', 'g')));
