-- Add pdf_url and paid_amount columns to invoices table for BrandBoom integration
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS pdf_url TEXT,
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.invoices.pdf_url IS 'Storage path to the invoice PDF file';
COMMENT ON COLUMN public.invoices.paid_amount IS 'Amount paid so far (for partial payments)';