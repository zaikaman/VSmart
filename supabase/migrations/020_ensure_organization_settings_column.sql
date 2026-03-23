alter table public.to_chuc
  add column if not exists settings jsonb;

update public.to_chuc
set settings = jsonb_build_object(
  'allow_external_project_invites',
  coalesce((settings ->> 'allow_external_project_invites')::boolean, false),
  'allow_join_requests',
  coalesce((settings ->> 'allow_join_requests')::boolean, false)
)
where settings is null
   or jsonb_typeof(settings) <> 'object'
   or not (settings ? 'allow_external_project_invites')
   or not (settings ? 'allow_join_requests');

alter table public.to_chuc
  alter column settings set default '{"allow_external_project_invites": false, "allow_join_requests": false}'::jsonb;

alter table public.to_chuc
  alter column settings set not null;
