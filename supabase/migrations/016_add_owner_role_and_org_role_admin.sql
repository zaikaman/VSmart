ALTER TABLE public.nguoi_dung
DROP CONSTRAINT IF EXISTS nguoi_dung_vai_tro_check;

ALTER TABLE public.nguoi_dung
ADD CONSTRAINT nguoi_dung_vai_tro_check
CHECK (
  vai_tro::text = ANY (
    ARRAY[
      'owner'::character varying,
      'admin'::character varying,
      'manager'::character varying,
      'member'::character varying
    ]::text[]
  )
);

UPDATE public.nguoi_dung AS nd
SET vai_tro = 'owner'
FROM public.to_chuc AS tc
WHERE tc.nguoi_tao_id = nd.id
  AND nd.to_chuc_id = tc.id;
