-- Personnel System Tables

-- Add user status field to profiles
ALTER TABLE public.profiles ADD COLUMN status text DEFAULT 'online';

-- Add user activity tracking table
CREATE TABLE public.user_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_activity_user ON public.user_activity_logs(user_id);
CREATE INDEX idx_user_activity_brand ON public.user_activity_logs(brand_id);
CREATE INDEX idx_user_activity_time ON public.user_activity_logs(created_at DESC);

-- Add flagging system table
CREATE TABLE public.user_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  severity text NOT NULL,
  description text,
  metadata jsonb,
  auto_flagged boolean DEFAULT false,
  reviewed boolean DEFAULT false,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_flags_user ON public.user_flags(user_id);
CREATE INDEX idx_user_flags_brand ON public.user_flags(brand_id);
CREATE INDEX idx_user_flags_rev ON public.user_flags(reviewed);

-- Add user invitations table
CREATE TABLE public.user_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  email text,
  phone_number text,
  role text NOT NULL DEFAULT 'user',
  status text NOT NULL DEFAULT 'pending',
  invitation_code text UNIQUE NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  accepted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);