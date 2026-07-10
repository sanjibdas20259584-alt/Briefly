-- ============================================================================
-- Add theme preference to app_settings
-- ============================================================================

alter table app_settings
add column if not exists theme text not null default 'system'
check (theme in ('light', 'dark', 'system'));