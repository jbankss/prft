-- Create brand_integrations table to store integration credentials per brand
CREATE TABLE IF NOT EXISTS public.brand_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  integration_type TEXT NOT NULL,
  webhook_secret TEXT,
  shop_domain TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, integration_type)
);

-- Enable RLS
ALTER TABLE public.brand_integrations ENABLE ROW LEVEL SECURITY;

-- Users can view integrations for their brands
CREATE POLICY "Users can view integrations in their brands"
  ON public.brand_integrations
  FOR SELECT
  USING (
    user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid())
  );

-- Brand admins and managers can manage integrations
CREATE POLICY "Brand admins and managers can manage integrations"
  ON public.brand_integrations
  FOR ALL
  USING (
    user_has_brand_role(auth.uid(), brand_id, 'admin') OR 
    user_has_brand_role(auth.uid(), brand_id, 'manager') OR 
    is_mj_admin(auth.uid())
  );

-- Add trigger for updated_at
CREATE TRIGGER update_brand_integrations_updated_at
  BEFORE UPDATE ON public.brand_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();