-- Migration: Thêm soft delete cho dự án và phần dự án

ALTER TABLE du_an
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE phan_du_an
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_du_an_deleted_at
ON du_an(deleted_at)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_phan_du_an_deleted_at
ON phan_du_an(deleted_at)
WHERE deleted_at IS NULL;

COMMENT ON COLUMN du_an.deleted_at IS 'Thời điểm dự án bị soft delete';
COMMENT ON COLUMN phan_du_an.deleted_at IS 'Thời điểm phần dự án bị soft delete';
