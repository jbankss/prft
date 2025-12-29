-- Add creative_role column to user_roles
ALTER TABLE public.user_roles 
ADD COLUMN creative_role TEXT CHECK (creative_role IN ('creative', 'senior_creative', 'creative_director'));

-- Create security definer function for creative role checks
CREATE OR REPLACE FUNCTION public.has_creative_role(_user_id uuid, _brand_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND brand_id = _brand_id
      AND creative_role = _role
      AND approved = true
  )
$$;

-- Function to get creative role level (director=3, senior=2, creative=1, none=0)
CREATE OR REPLACE FUNCTION public.get_creative_role_level(_user_id uuid, _brand_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT 
      CASE creative_role
        WHEN 'creative_director' THEN 3
        WHEN 'senior_creative' THEN 2
        WHEN 'creative' THEN 1
        ELSE 0
      END
    FROM public.user_roles
    WHERE user_id = _user_id
      AND brand_id = _brand_id
      AND approved = true
    LIMIT 1),
    0
  )
$$;

-- Create upload_sessions table for batch uploads
CREATE TABLE public.upload_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE NOT NULL,
  uploaded_by UUID NOT NULL,
  title TEXT,
  status TEXT DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected')),
  file_count INTEGER DEFAULT 0,
  total_size BIGINT DEFAULT 0,
  source_folder_name TEXT,
  detected_date_range JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT
);

-- Add upload_session_id to creative_assets
ALTER TABLE public.creative_assets
ADD COLUMN upload_session_id UUID REFERENCES public.upload_sessions(id) ON DELETE SET NULL;

-- Enable RLS for upload_sessions
ALTER TABLE public.upload_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view upload sessions in their brands"
ON public.upload_sessions FOR SELECT
USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "Users can create upload sessions"
ON public.upload_sessions FOR INSERT
WITH CHECK (auth.uid() = uploaded_by AND (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid())));

CREATE POLICY "Directors can update sessions"
ON public.upload_sessions FOR UPDATE
USING (has_creative_role(auth.uid(), brand_id, 'creative_director') OR is_mj_admin(auth.uid()));

-- Create asset_annotations table
CREATE TABLE public.asset_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.creative_assets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  x_percent DECIMAL NOT NULL,
  y_percent DECIMAL NOT NULL,
  comment TEXT NOT NULL,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for asset_annotations
ALTER TABLE public.asset_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view annotations in their brands"
ON public.asset_annotations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM creative_assets ca
  WHERE ca.id = asset_annotations.asset_id
  AND (user_has_brand_access(auth.uid(), ca.brand_id) OR is_mj_admin(auth.uid()))
));

CREATE POLICY "Senior creatives and directors can create annotations"
ON public.asset_annotations FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM creative_assets ca
    WHERE ca.id = asset_id
    AND (get_creative_role_level(auth.uid(), ca.brand_id) >= 2 OR is_mj_admin(auth.uid()))
  )
);

CREATE POLICY "Users can update their own annotations"
ON public.asset_annotations FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own annotations"
ON public.asset_annotations FOR DELETE
USING (auth.uid() = user_id);

-- Add parent_id and mentions to asset_comments for threading
ALTER TABLE public.asset_comments
ADD COLUMN parent_id UUID REFERENCES public.asset_comments(id) ON DELETE CASCADE,
ADD COLUMN mentions UUID[] DEFAULT '{}';

-- Enable realtime for activity tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.creative_activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.upload_sessions;