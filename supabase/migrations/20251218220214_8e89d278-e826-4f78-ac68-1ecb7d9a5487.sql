-- Add columns to import_progress for chunked import architecture
ALTER TABLE public.import_progress 
ADD COLUMN IF NOT EXISTS expected_new_orders INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS page_cursor TEXT,
ADD COLUMN IF NOT EXISTS chunk_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS total_chunks_estimate INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS avg_order_time_ms INTEGER,
ADD COLUMN IF NOT EXISTS estimated_completion_at TIMESTAMPTZ;