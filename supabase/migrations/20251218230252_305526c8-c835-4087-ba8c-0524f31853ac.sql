-- Add system message columns to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS is_system boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS system_action text;