-- ============================================================================
-- Batch 10: Currency preference, Import/Export support
-- ============================================================================

-- Add currency preference to app_settings
alter table app_settings add column if not exists currency text not null default 'USD';
