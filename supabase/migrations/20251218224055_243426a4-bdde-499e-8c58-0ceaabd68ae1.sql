-- Create shopify_orders table to store order data (REVENUE)
CREATE TABLE public.shopify_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  shopify_order_id TEXT NOT NULL,
  order_number TEXT NOT NULL,
  order_date TIMESTAMPTZ NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  vendor TEXT NOT NULL,
  product_name TEXT,
  line_item_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'online',
  status TEXT NOT NULL DEFAULT 'completed',
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(brand_id, order_number, line_item_id)
);

-- Enable RLS
ALTER TABLE public.shopify_orders ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view orders in their brands"
ON public.shopify_orders FOR SELECT
USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "System can manage orders"
ON public.shopify_orders FOR ALL
USING (is_mj_admin(auth.uid()));

-- Allow service role to insert (for edge function imports)
CREATE POLICY "Service role can insert orders"
ON public.shopify_orders FOR INSERT
WITH CHECK (true);

-- Add indexes for performance
CREATE INDEX idx_shopify_orders_brand_id ON public.shopify_orders(brand_id);
CREATE INDEX idx_shopify_orders_order_date ON public.shopify_orders(order_date);
CREATE INDEX idx_shopify_orders_vendor ON public.shopify_orders(vendor);
CREATE INDEX idx_shopify_orders_source ON public.shopify_orders(source);

-- Add manual_balance column to accounts for tracking what's owed to vendors
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS manual_balance NUMERIC DEFAULT 0;
ALTER TABLE public.accounts ADD COLUMN IF NOT EXISTS balance_notes TEXT;

-- Enable realtime for orders
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopify_orders;