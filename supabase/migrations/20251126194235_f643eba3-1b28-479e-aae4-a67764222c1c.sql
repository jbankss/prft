-- Create user_roles table for multi-tenant permissions
CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  approved BOOLEAN NOT NULL DEFAULT false,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, brand_id)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Add current_brand_id to profiles for store switching
ALTER TABLE public.profiles ADD COLUMN current_brand_id UUID REFERENCES public.brands(id);

-- Create security definer function to check if user has access to a brand
CREATE OR REPLACE FUNCTION public.user_has_brand_access(_user_id UUID, _brand_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND brand_id = _brand_id
      AND approved = true
  )
$$;

-- Create security definer function to check if user has specific role in brand
CREATE OR REPLACE FUNCTION public.user_has_brand_role(_user_id UUID, _brand_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND brand_id = _brand_id
      AND role = _role
      AND approved = true
  )
$$;

-- Create security definer function to check if user is MJ Fashion Team admin
CREATE OR REPLACE FUNCTION public.is_mj_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.brands b ON ur.brand_id = b.id
    WHERE ur.user_id = _user_id
      AND b.name = 'MJ Fashion Team'
      AND ur.role = 'admin'
      AND ur.approved = true
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role requests"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "MJ admins can view all role requests"
ON public.user_roles FOR SELECT
USING (public.is_mj_admin(auth.uid()));

CREATE POLICY "Users can request access to brands"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "MJ admins can approve role requests"
ON public.user_roles FOR UPDATE
USING (public.is_mj_admin(auth.uid()));

CREATE POLICY "MJ admins can manage all roles"
ON public.user_roles FOR ALL
USING (public.is_mj_admin(auth.uid()));

-- Update accounts RLS to use brand-based access
DROP POLICY IF EXISTS "Authenticated users can view accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins and managers can create accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins and managers can update accounts" ON public.accounts;
DROP POLICY IF EXISTS "Admins can delete accounts" ON public.accounts;

CREATE POLICY "Users can view accounts in their brands"
ON public.accounts FOR SELECT
USING (
  public.user_has_brand_access(auth.uid(), brand_id) OR
  public.is_mj_admin(auth.uid())
);

CREATE POLICY "Brand admins and managers can create accounts"
ON public.accounts FOR INSERT
WITH CHECK (
  public.user_has_brand_role(auth.uid(), brand_id, 'admin') OR
  public.user_has_brand_role(auth.uid(), brand_id, 'manager') OR
  public.is_mj_admin(auth.uid())
);

CREATE POLICY "Brand admins and managers can update accounts"
ON public.accounts FOR UPDATE
USING (
  public.user_has_brand_role(auth.uid(), brand_id, 'admin') OR
  public.user_has_brand_role(auth.uid(), brand_id, 'manager') OR
  public.is_mj_admin(auth.uid())
);

CREATE POLICY "Brand admins can delete accounts"
ON public.accounts FOR DELETE
USING (
  public.user_has_brand_role(auth.uid(), brand_id, 'admin') OR
  public.is_mj_admin(auth.uid())
);

-- Update brands RLS
DROP POLICY IF EXISTS "Authenticated users can view brands" ON public.brands;
DROP POLICY IF EXISTS "Admins and managers can create brands" ON public.brands;
DROP POLICY IF EXISTS "Admins and managers can update brands" ON public.brands;
DROP POLICY IF EXISTS "Admins can delete brands" ON public.brands;

CREATE POLICY "Users can view brands they have access to"
ON public.brands FOR SELECT
USING (
  public.user_has_brand_access(auth.uid(), id) OR
  public.is_mj_admin(auth.uid())
);

CREATE POLICY "MJ admins can manage brands"
ON public.brands FOR ALL
USING (public.is_mj_admin(auth.uid()));

-- Update charges RLS
DROP POLICY IF EXISTS "Authenticated users can view charges" ON public.charges;
DROP POLICY IF EXISTS "Admins and managers can manage charges" ON public.charges;

CREATE POLICY "Users can view charges in their brands"
ON public.charges FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = charges.account_id
      AND (public.user_has_brand_access(auth.uid(), a.brand_id) OR public.is_mj_admin(auth.uid()))
  )
);

CREATE POLICY "Brand admins and managers can manage charges"
ON public.charges FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = charges.account_id
      AND (
        public.user_has_brand_role(auth.uid(), a.brand_id, 'admin') OR
        public.user_has_brand_role(auth.uid(), a.brand_id, 'manager') OR
        public.is_mj_admin(auth.uid())
      )
  )
);

-- Update invoices RLS
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON public.invoices;
DROP POLICY IF EXISTS "Admins and managers can manage invoices" ON public.invoices;

CREATE POLICY "Users can view invoices in their brands"
ON public.invoices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = invoices.account_id
      AND (public.user_has_brand_access(auth.uid(), a.brand_id) OR public.is_mj_admin(auth.uid()))
  )
);

CREATE POLICY "Brand admins and managers can manage invoices"
ON public.invoices FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = invoices.account_id
      AND (
        public.user_has_brand_role(auth.uid(), a.brand_id, 'admin') OR
        public.user_has_brand_role(auth.uid(), a.brand_id, 'manager') OR
        public.is_mj_admin(auth.uid())
      )
  )
);

-- Update creative_assets RLS
DROP POLICY IF EXISTS "Authenticated users can view assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Authenticated users can upload assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Admins can update all assets" ON public.creative_assets;
DROP POLICY IF EXISTS "Admins can delete assets" ON public.creative_assets;

-- Add brand_id to creative_assets
ALTER TABLE public.creative_assets ADD COLUMN brand_id UUID REFERENCES public.brands(id);

CREATE POLICY "Users can view assets in their brands"
ON public.creative_assets FOR SELECT
USING (
  public.user_has_brand_access(auth.uid(), brand_id) OR
  public.is_mj_admin(auth.uid())
);

CREATE POLICY "Users can upload assets to their brands"
ON public.creative_assets FOR INSERT
WITH CHECK (
  auth.uid() = uploaded_by AND
  (public.user_has_brand_access(auth.uid(), brand_id) OR public.is_mj_admin(auth.uid()))
);

CREATE POLICY "Users can update their own assets"
ON public.creative_assets FOR UPDATE
USING (
  auth.uid() = uploaded_by AND
  (public.user_has_brand_access(auth.uid(), brand_id) OR public.is_mj_admin(auth.uid()))
);

CREATE POLICY "Brand admins can update all assets"
ON public.creative_assets FOR UPDATE
USING (
  public.user_has_brand_role(auth.uid(), brand_id, 'admin') OR
  public.is_mj_admin(auth.uid())
);

CREATE POLICY "Brand admins can delete assets"
ON public.creative_assets FOR DELETE
USING (
  public.user_has_brand_role(auth.uid(), brand_id, 'admin') OR
  public.is_mj_admin(auth.uid())
);

-- Update asset_collections RLS
DROP POLICY IF EXISTS "Authenticated users can view collections" ON public.asset_collections;
DROP POLICY IF EXISTS "Admins and managers can manage collections" ON public.asset_collections;

ALTER TABLE public.asset_collections ADD COLUMN brand_id UUID REFERENCES public.brands(id);

CREATE POLICY "Users can view collections in their brands"
ON public.asset_collections FOR SELECT
USING (
  public.user_has_brand_access(auth.uid(), brand_id) OR
  public.is_mj_admin(auth.uid())
);

CREATE POLICY "Brand admins and managers can manage collections"
ON public.asset_collections FOR ALL
USING (
  public.user_has_brand_role(auth.uid(), brand_id, 'admin') OR
  public.user_has_brand_role(auth.uid(), brand_id, 'manager') OR
  public.is_mj_admin(auth.uid())
);

-- Update activity_logs RLS
DROP POLICY IF EXISTS "Authenticated users can view activity logs" ON public.activity_logs;

CREATE POLICY "Users can view activity logs in their brands"
ON public.activity_logs FOR SELECT
USING (
  public.is_mj_admin(auth.uid()) OR
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.approved = true
  )
);

-- Update chat_messages RLS
DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Authenticated users can create chat messages" ON public.chat_messages;

CREATE POLICY "Users can view chat messages in their brands"
ON public.chat_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = chat_messages.account_id
      AND (public.user_has_brand_access(auth.uid(), a.brand_id) OR public.is_mj_admin(auth.uid()))
  )
);

CREATE POLICY "Users can create chat messages in their brands"
ON public.chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM public.accounts a
    WHERE a.id = chat_messages.account_id
      AND (public.user_has_brand_access(auth.uid(), a.brand_id) OR public.is_mj_admin(auth.uid()))
  )
);

-- Trigger for user_roles updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert the 4 brands if they don't exist
INSERT INTO public.brands (name, description) 
VALUES 
  ('Icon Milwaukee', 'Icon Milwaukee store'),
  ('Enzo Milwaukee', 'Enzo Milwaukee store'),
  ('Hypeboys Milwaukee', 'Hypeboys Milwaukee store'),
  ('MJ Fashion Team', 'MJ Fashion Team administrative store')
ON CONFLICT DO NOTHING;