-- Create asset approvals table for permissions system
CREATE TABLE IF NOT EXISTS public.asset_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.creative_assets(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),
  reviewed_by UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'changes_requested')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Create asset comments/revisions table
CREATE TABLE IF NOT EXISTS public.asset_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID NOT NULL REFERENCES public.creative_assets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  comment TEXT NOT NULL,
  is_revision BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create creative activity logs table
CREATE TABLE IF NOT EXISTS public.creative_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage analytics table
CREATE TABLE IF NOT EXISTS public.storage_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  total_files INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  files_by_type JSONB DEFAULT '{}',
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, user_id, date)
);

-- Enable RLS
ALTER TABLE public.asset_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for asset_approvals
CREATE POLICY "Users can view approvals in their brands"
  ON public.asset_approvals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creative_assets ca
      WHERE ca.id = asset_approvals.asset_id
      AND (user_has_brand_access(auth.uid(), ca.brand_id) OR is_mj_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can request approvals"
  ON public.asset_approvals FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

CREATE POLICY "Admins can review approvals"
  ON public.asset_approvals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.creative_assets ca
      WHERE ca.id = asset_approvals.asset_id
      AND (user_has_brand_role(auth.uid(), ca.brand_id, 'admin') OR is_mj_admin(auth.uid()))
    )
  );

-- RLS Policies for asset_comments
CREATE POLICY "Users can view comments in their brands"
  ON public.asset_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.creative_assets ca
      WHERE ca.id = asset_comments.asset_id
      AND (user_has_brand_access(auth.uid(), ca.brand_id) OR is_mj_admin(auth.uid()))
    )
  );

CREATE POLICY "Users can create comments"
  ON public.asset_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.asset_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.asset_comments FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for creative_activity_logs
CREATE POLICY "Users can view activity logs in their brands"
  ON public.creative_activity_logs FOR SELECT
  USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "System can create activity logs"
  ON public.creative_activity_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for storage_analytics
CREATE POLICY "Users can view analytics in their brands"
  ON public.storage_analytics FOR SELECT
  USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "System can manage analytics"
  ON public.storage_analytics FOR ALL
  USING (is_mj_admin(auth.uid()));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_approvals_asset_id ON public.asset_approvals(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_approvals_status ON public.asset_approvals(status);
CREATE INDEX IF NOT EXISTS idx_asset_comments_asset_id ON public.asset_comments(asset_id);
CREATE INDEX IF NOT EXISTS idx_creative_activity_logs_brand_id ON public.creative_activity_logs(brand_id);
CREATE INDEX IF NOT EXISTS idx_creative_activity_logs_created_at ON public.creative_activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_storage_analytics_brand_id ON public.storage_analytics(brand_id);
CREATE INDEX IF NOT EXISTS idx_storage_analytics_date ON public.storage_analytics(date DESC);