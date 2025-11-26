-- Add attachments column to brandboom_payments table for PDF invoices
ALTER TABLE brandboom_payments 
ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;

-- Add notes column for payment details
ALTER TABLE brandboom_payments 
ADD COLUMN IF NOT EXISTS notes text;

-- Add invoice_number column for tracking
ALTER TABLE brandboom_payments 
ADD COLUMN IF NOT EXISTS invoice_number text;

-- Update status enum values to match new system (Cleared, Submitted, Upcoming)
-- Note: existing 'pending' and 'completed' statuses will remain valid
COMMENT ON COLUMN brandboom_payments.status IS 'Valid values: cleared, submitted, upcoming, pending, completed';