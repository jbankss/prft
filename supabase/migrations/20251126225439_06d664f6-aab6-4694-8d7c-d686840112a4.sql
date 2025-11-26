-- Create webhook_logs table for monitoring all webhook events
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  integration_type TEXT NOT NULL,
  event_type TEXT NOT NULL,
  status TEXT NOT NULL,
  request_data JSONB,
  response_summary TEXT,
  error_message TEXT,
  shopify_order_id TEXT,
  invoices_created INTEGER DEFAULT 0,
  accounts_created INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Allow users to view webhook logs for their brands
CREATE POLICY "Users can view webhook logs in their brands"
  ON public.webhook_logs
  FOR SELECT
  USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

-- System can create webhook logs (edge functions)
CREATE POLICY "System can create webhook logs"
  ON public.webhook_logs
  FOR INSERT
  WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX idx_webhook_logs_brand_id ON public.webhook_logs(brand_id);
CREATE INDEX idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX idx_webhook_logs_status ON public.webhook_logs(status);

-- Enable realtime for webhook logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_logs;