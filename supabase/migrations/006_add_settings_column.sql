-- Migration: Add settings column to nguoi_dung table
-- Created: 2026-01-17

ALTER TABLE public.nguoi_dung
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{
    "notifications": {
        "emailTaskAssigned": true,
        "emailDeadlineReminder": true,
        "pushEnabled": false,
        "emailComments": true
    },
    "dashboard": {
        "defaultPage": "/dashboard",
        "itemsPerPage": 10
    }
}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.nguoi_dung.settings IS 'User settings stored as JSON including notifications, dashboard preferences';
