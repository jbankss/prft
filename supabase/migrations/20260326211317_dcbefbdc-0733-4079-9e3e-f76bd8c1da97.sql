CREATE OR REPLACE FUNCTION public.user_has_brand_access(_user_id uuid, _brand_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT (_user_id IS NULL)
    OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = _user_id
        AND p.email = 'josiah@gomrkt.com'
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.brand_id = _brand_id
        AND ur.approved = true
    )
$function$;