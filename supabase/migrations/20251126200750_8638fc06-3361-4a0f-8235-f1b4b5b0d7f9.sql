-- Create tables for BrandBoom integration

-- Orders table
CREATE TABLE public.brandboom_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brandboom_order_id TEXT NOT NULL UNIQUE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  order_date TIMESTAMPTZ NOT NULL,
  ship_date TIMESTAMPTZ,
  cancel_date TIMESTAMPTZ,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  shipping_status TEXT,
  order_type TEXT,
  notes TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.brandboom_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.brandboom_orders(id) ON DELETE CASCADE NOT NULL,
  product_name TEXT NOT NULL,
  style_number TEXT,
  color TEXT,
  size TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Payments table
CREATE TABLE public.brandboom_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.brandboom_orders(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shipments table
CREATE TABLE public.brandboom_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.brandboom_orders(id) ON DELETE CASCADE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  carrier TEXT,
  tracking_number TEXT,
  ship_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  cost NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sync logs table
CREATE TABLE public.brandboom_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  sync_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running',
  records_synced INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brandboom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brandboom_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brandboom_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brandboom_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brandboom_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brandboom_orders
CREATE POLICY "Users can view orders in their brands"
  ON public.brandboom_orders FOR SELECT
  USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "System can manage orders"
  ON public.brandboom_orders FOR ALL
  USING (is_mj_admin(auth.uid()));

-- RLS Policies for brandboom_order_items
CREATE POLICY "Users can view order items in their brands"
  ON public.brandboom_order_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.brandboom_orders o
    WHERE o.id = brandboom_order_items.order_id
    AND (user_has_brand_access(auth.uid(), o.brand_id) OR is_mj_admin(auth.uid()))
  ));

CREATE POLICY "System can manage order items"
  ON public.brandboom_order_items FOR ALL
  USING (is_mj_admin(auth.uid()));

-- RLS Policies for brandboom_payments
CREATE POLICY "Users can view payments in their brands"
  ON public.brandboom_payments FOR SELECT
  USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "System can manage payments"
  ON public.brandboom_payments FOR ALL
  USING (is_mj_admin(auth.uid()));

-- RLS Policies for brandboom_shipments
CREATE POLICY "Users can view shipments in their brands"
  ON public.brandboom_shipments FOR SELECT
  USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "System can manage shipments"
  ON public.brandboom_shipments FOR ALL
  USING (is_mj_admin(auth.uid()));

-- RLS Policies for brandboom_sync_logs
CREATE POLICY "Users can view sync logs in their brands"
  ON public.brandboom_sync_logs FOR SELECT
  USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "System can manage sync logs"
  ON public.brandboom_sync_logs FOR ALL
  USING (is_mj_admin(auth.uid()));

-- Indexes for performance
CREATE INDEX idx_brandboom_orders_brand_id ON public.brandboom_orders(brand_id);
CREATE INDEX idx_brandboom_orders_order_date ON public.brandboom_orders(order_date);
CREATE INDEX idx_brandboom_order_items_order_id ON public.brandboom_order_items(order_id);
CREATE INDEX idx_brandboom_payments_brand_id ON public.brandboom_payments(brand_id);
CREATE INDEX idx_brandboom_payments_payment_date ON public.brandboom_payments(payment_date);
CREATE INDEX idx_brandboom_shipments_order_id ON public.brandboom_shipments(order_id);
CREATE INDEX idx_brandboom_shipments_brand_id ON public.brandboom_shipments(brand_id);

-- Triggers for updated_at
CREATE TRIGGER update_brandboom_orders_updated_at
  BEFORE UPDATE ON public.brandboom_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brandboom_payments_updated_at
  BEFORE UPDATE ON public.brandboom_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_brandboom_shipments_updated_at
  BEFORE UPDATE ON public.brandboom_shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();