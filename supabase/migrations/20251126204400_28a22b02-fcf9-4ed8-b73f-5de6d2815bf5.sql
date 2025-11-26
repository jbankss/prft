-- Add website field to brands table
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS website TEXT;

-- Create brand documents table
CREATE TABLE IF NOT EXISTS public.brand_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES public.profiles(id),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create brand chat messages table
CREATE TABLE IF NOT EXISTS public.brand_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id),
  message TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.brand_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for brand_documents
CREATE POLICY "Users can view documents in their brands"
ON public.brand_documents FOR SELECT
USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "Brand admins and managers can manage documents"
ON public.brand_documents FOR ALL
USING (
  user_has_brand_role(auth.uid(), brand_id, 'admin') OR 
  user_has_brand_role(auth.uid(), brand_id, 'manager') OR 
  is_mj_admin(auth.uid())
);

-- RLS policies for brand_chat_messages
CREATE POLICY "Users can view chat messages in their brands"
ON public.brand_chat_messages FOR SELECT
USING (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()));

CREATE POLICY "Users can create chat messages in their brands"
ON public.brand_chat_messages FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND 
  (user_has_brand_access(auth.uid(), brand_id) OR is_mj_admin(auth.uid()))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_brand_documents_brand_id ON public.brand_documents(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_chat_messages_brand_id ON public.brand_chat_messages(brand_id);
CREATE INDEX IF NOT EXISTS idx_brand_chat_messages_created_at ON public.brand_chat_messages(created_at);

-- Add updated_at trigger for brand_documents
CREATE TRIGGER update_brand_documents_updated_at
BEFORE UPDATE ON public.brand_documents
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();