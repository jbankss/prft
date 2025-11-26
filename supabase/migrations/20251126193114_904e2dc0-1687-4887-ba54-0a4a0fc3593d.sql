-- Create storage buckets for creative assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('creative-assets', 'creative-assets', true, 524288000, ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/tiff', 'image/bmp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska',
    'application/pdf', 'application/postscript',
    'application/vnd.adobe.photoshop', 'image/vnd.adobe.photoshop',
    'application/x-indesign', 'application/illustrator'
  ]),
  ('design-assets', 'design-assets', true, 104857600, ARRAY[
    'image/jpeg', 'image/png', 'image/svg+xml', 'application/pdf',
    'application/vnd.adobe.photoshop', 'image/vnd.adobe.photoshop'
  ]);

-- Create creative_assets table
CREATE TABLE public.creative_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  bucket TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  duration INTEGER,
  title TEXT,
  description TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deployed', 'archived', 'submitted')),
  category TEXT NOT NULL DEFAULT 'photography' CHECK (category IN ('photography', 'video', 'design', 'logo', 'rules')),
  metadata JSONB DEFAULT '{}'::jsonb,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create collections table for organizing assets
CREATE TABLE public.asset_collections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  cover_asset_id UUID REFERENCES public.creative_assets(id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create junction table for assets in collections
CREATE TABLE public.collection_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  collection_id UUID NOT NULL REFERENCES public.asset_collections(id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.creative_assets(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(collection_id, asset_id)
);

-- Enable RLS
ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for creative_assets
CREATE POLICY "Authenticated users can view assets" ON public.creative_assets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload assets" ON public.creative_assets
  FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own assets" ON public.creative_assets
  FOR UPDATE USING (auth.uid() = uploaded_by);

CREATE POLICY "Admins can update all assets" ON public.creative_assets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete assets" ON public.creative_assets
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for asset_collections
CREATE POLICY "Authenticated users can view collections" ON public.asset_collections
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage collections" ON public.asset_collections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- RLS Policies for collection_assets
CREATE POLICY "Authenticated users can view collection assets" ON public.collection_assets
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage collection assets" ON public.collection_assets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Storage policies for creative-assets bucket
CREATE POLICY "Authenticated users can view creative assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'creative-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload creative assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'creative-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own creative assets"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'creative-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete creative assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'creative-assets' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Storage policies for design-assets bucket
CREATE POLICY "Authenticated users can view design assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'design-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload design assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'design-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins and managers can manage design assets"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'design-assets' AND 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

-- Create triggers
CREATE TRIGGER update_creative_assets_updated_at BEFORE UPDATE ON public.creative_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_asset_collections_updated_at BEFORE UPDATE ON public.asset_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.creative_assets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.asset_collections;