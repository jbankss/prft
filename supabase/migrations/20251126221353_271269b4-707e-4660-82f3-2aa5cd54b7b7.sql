-- Create storage bucket for brand logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brand-logos',
  'brand-logos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload logos for their brands
CREATE POLICY "Users can upload logos for their brands"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-logos' AND
  (auth.uid()::text = (storage.foldername(name))[1] OR 
   EXISTS (
     SELECT 1 FROM brands
     WHERE brands.id::text = (storage.foldername(name))[1]
     AND (
       user_has_brand_role(auth.uid(), brands.id, 'admin') OR
       user_has_brand_role(auth.uid(), brands.id, 'manager') OR
       is_mj_admin(auth.uid())
     )
   ))
);

-- Allow public access to view logos
CREATE POLICY "Anyone can view brand logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'brand-logos');

-- Allow users to update logos for their brands
CREATE POLICY "Users can update logos for their brands"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-logos' AND
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id::text = (storage.foldername(name))[1]
    AND (
      user_has_brand_role(auth.uid(), brands.id, 'admin') OR
      user_has_brand_role(auth.uid(), brands.id, 'manager') OR
      is_mj_admin(auth.uid())
    )
  )
);

-- Allow users to delete logos for their brands
CREATE POLICY "Users can delete logos for their brands"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-logos' AND
  EXISTS (
    SELECT 1 FROM brands
    WHERE brands.id::text = (storage.foldername(name))[1]
    AND (
      user_has_brand_role(auth.uid(), brands.id, 'admin') OR
      is_mj_admin(auth.uid())
    )
  )
);