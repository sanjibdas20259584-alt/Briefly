-- ============================================================================
-- Google Drive integration — store OAuth tokens per user
-- ============================================================================

alter table app_settings
  add column if not exists google_drive_access_enc text,
  add column if not exists google_drive_refresh_enc text,
  add column if not exists google_drive_token_type text default 'Bearer',
  add column if not exists google_drive_expiry timestamptz,
  add column if not exists google_drive_user_email text;
