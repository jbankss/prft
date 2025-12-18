-- Add current order tracking fields to import_progress
ALTER TABLE public.import_progress
ADD COLUMN IF NOT EXISTS current_order_number text,
ADD COLUMN IF NOT EXISTS current_order_date timestamp with time zone;