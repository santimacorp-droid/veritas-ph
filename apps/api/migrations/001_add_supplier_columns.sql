-- apps/api/migrations/001_add_supplier_columns.sql
-- Add business_classification and geography_codes columns to suppliers table for existing deployments.

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS business_classification TEXT;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS geography_codes JSONB;
