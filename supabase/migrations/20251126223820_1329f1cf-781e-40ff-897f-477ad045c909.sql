-- Add Shopify tracking columns to invoices table
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS shopify_order_id text,
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_shopify_order_id ON public.invoices(shopify_order_id);