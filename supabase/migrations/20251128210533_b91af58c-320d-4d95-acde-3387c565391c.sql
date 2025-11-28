-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete brand logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view brand logos" ON storage.objects;

-- Allow admins and managers to upload brand logos
CREATE POLICY "Brand admins can upload logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-logos' 
  AND (
    user_has_brand_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin')
    OR user_has_brand_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'manager')
    OR is_mj_admin(auth.uid())
  )
);

-- Allow admins and managers to update brand logos
CREATE POLICY "Brand admins can update logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'brand-logos'
  AND (
    user_has_brand_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin')
    OR user_has_brand_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'manager')
    OR is_mj_admin(auth.uid())
  )
);

-- Allow admins to delete brand logos
CREATE POLICY "Brand admins can delete logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'brand-logos'
  AND (
    user_has_brand_role(auth.uid(), (storage.foldername(name))[1]::uuid, 'admin')
    OR is_mj_admin(auth.uid())
  )
);

-- Allow anyone to view brand logos (public bucket)
CREATE POLICY "Anyone can view brand logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'brand-logos');