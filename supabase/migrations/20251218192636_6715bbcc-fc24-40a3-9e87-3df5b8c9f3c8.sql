-- Add api_access_token column to brand_integrations table for storing Shopify Admin API token
ALTER TABLE public.brand_integrations ADD COLUMN IF NOT EXISTS api_access_token text;