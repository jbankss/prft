-- Create import_progress table for real-time import tracking
CREATE TABLE public.import_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  total_orders INTEGER DEFAULT 0,
  orders_processed INTEGER DEFAULT 0,
  invoices_created INTEGER DEFAULT 0,
  accounts_created INTEGER DEFAULT 0,
  skipped INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.import_progress ENABLE ROW LEVEL SECURITY;

-- Create policy for users with brand access
CREATE POLICY "Users can view import progress for their brands"
ON public.import_progress
FOR SELECT
USING (public.user_has_brand_access(auth.uid(), brand_id));

CREATE POLICY "Service role can manage import progress"
ON public.import_progress
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.import_progress;

-- Add index for faster queries
CREATE INDEX idx_import_progress_brand_id ON public.import_progress(brand_id);
CREATE INDEX idx_import_progress_status ON public.import_progress(status);