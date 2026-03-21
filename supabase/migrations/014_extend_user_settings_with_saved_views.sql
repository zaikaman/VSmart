ALTER TABLE public.nguoi_dung
ALTER COLUMN settings
SET DEFAULT '{
  "appearance": {
    "theme": "system",
    "language": "vi"
  },
  "dashboard": {
    "defaultPage": "/dashboard",
    "itemsPerPage": 10
  },
  "notifications": {
    "pushEnabled": false,
    "emailComments": true,
    "emailTeamDigest": true,
    "emailTaskAssigned": true,
    "emailReviewRequests": true,
    "emailApprovalResults": true,
    "emailDeadlineReminder": true
  },
  "savedViews": {
    "kanban": [],
    "planning": [],
    "analytics": []
  }
}'::jsonb;

UPDATE public.nguoi_dung
SET settings =
  (
    COALESCE(settings, '{}'::jsonb)
    - 'notifications'
    - 'appearance'
    - 'dashboard'
    - 'savedViews'
  )
  || jsonb_build_object(
    'notifications',
    '{
      "pushEnabled": false,
      "emailComments": true,
      "emailTeamDigest": true,
      "emailTaskAssigned": true,
      "emailReviewRequests": true,
      "emailApprovalResults": true,
      "emailDeadlineReminder": true
    }'::jsonb || COALESCE(settings->'notifications', '{}'::jsonb),
    'appearance',
    '{
      "theme": "system",
      "language": "vi"
    }'::jsonb || COALESCE(settings->'appearance', '{}'::jsonb),
    'dashboard',
    '{
      "defaultPage": "/dashboard",
      "itemsPerPage": 10
    }'::jsonb || COALESCE(settings->'dashboard', '{}'::jsonb),
    'savedViews',
    '{
      "kanban": [],
      "planning": [],
      "analytics": []
    }'::jsonb || COALESCE(settings->'savedViews', '{}'::jsonb)
  );
