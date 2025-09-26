-- Fix wine_region_documents table (assuming it was created with wrong name)
-- First, let's create the proper wine_region_documents table

CREATE TABLE IF NOT EXISTS public.wine_region_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  filename text NOT NULL,
  original_filename text NOT NULL,
  file_size integer NOT NULL,
  mime_type text NOT NULL,
  storage_path text NOT NULL,
  extracted_content text NULL,
  upload_date timestamp with time zone NOT NULL DEFAULT now(),
  processed boolean NULL DEFAULT false,
  category text NULL DEFAULT 'wine_region'::text,
  embedding vector(3072), -- Add embedding column for vector search
  CONSTRAINT wine_region_documents_pkey PRIMARY KEY (id),
  CONSTRAINT wine_region_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users (id)
) TABLESPACE pg_default;

-- Create indexes for wine_region_documents
CREATE INDEX IF NOT EXISTS idx_wine_region_documents_category ON public.wine_region_documents USING btree (category) TABLESPACE pg_default;
-- Note: Index creation skipped for 3072-dimensional vectors
-- The functions will work without indexes, though they may be slower for large datasets

-- Enable RLS for wine_region_documents
ALTER TABLE public.wine_region_documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for wine_region_documents
CREATE POLICY "read own documents" ON public.wine_region_documents
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own documents" ON public.wine_region_documents
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own documents" ON public.wine_region_documents
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "delete own documents" ON public.wine_region_documents
FOR DELETE USING (auth.uid() = user_id);

-- Also ensure documents table has proper RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for documents table
CREATE POLICY "read own documents" ON public.documents
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "insert own documents" ON public.documents
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update own documents" ON public.documents
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "delete own documents" ON public.documents
FOR DELETE USING (auth.uid() = user_id);
