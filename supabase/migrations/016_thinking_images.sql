-- Create thinking_images table
CREATE TABLE IF NOT EXISTS public.thinking_images (
  id BIGSERIAL PRIMARY KEY,
  stage_order INTEGER NOT NULL UNIQUE CHECK (stage_order >= 1 AND stage_order <= 7),
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add thinking_interval_ms to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS thinking_interval_ms INTEGER DEFAULT 2000;

-- RLS Policies for thinking_images
ALTER TABLE public.thinking_images ENABLE ROW LEVEL SECURITY;

-- Allow all users to read thinking images
CREATE POLICY "read thinking images" ON public.thinking_images
FOR SELECT USING (true);

-- Only admins can manage thinking images
CREATE POLICY "admin thinking images" ON public.thinking_images
FOR ALL USING (
  EXISTS(
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
) WITH CHECK (
  EXISTS(
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.role = 'admin'
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_thinking_images_stage_order ON public.thinking_images(stage_order);
