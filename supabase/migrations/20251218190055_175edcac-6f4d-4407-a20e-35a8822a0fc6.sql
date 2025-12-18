-- Add import tracking to brand_integrations
ALTER TABLE brand_integrations 
ADD COLUMN IF NOT EXISTS import_from_date date,
ADD COLUMN IF NOT EXISTS last_import_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS import_status text DEFAULT 'none';

-- Add theme preference to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS theme_preference text DEFAULT 'default';