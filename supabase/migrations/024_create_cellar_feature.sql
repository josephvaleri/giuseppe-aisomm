-- =====================================================
-- Giuseppe the AISomm - Cellar Feature Migration
-- =====================================================
-- This migration creates the cellar_items table and related functionality
-- for users to manage their personal wine collections

-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create the touch_updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION tg_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create cellar_items table
CREATE TABLE public.cellar_items (
  bottle_id bigserial PRIMARY KEY,
  user_id uuid NOT NULL,
  wine_id bigint NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  where_stored text NULL,
  value numeric(12, 2) NULL,
  status text NOT NULL DEFAULT 'stored' CHECK (status IN ('stored', 'drank', 'lost')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  currency text NOT NULL DEFAULT 'USD',
  my_notes text NULL,
  my_rating integer CHECK (my_rating BETWEEN 1 AND 10),
  CONSTRAINT cellar_items_user_id_wine_id_key UNIQUE (user_id, wine_id),
  FOREIGN KEY (user_id) REFERENCES profiles (user_id) ON DELETE CASCADE,
  FOREIGN KEY (wine_id) REFERENCES wines (wine_id) ON DELETE CASCADE,
  CHECK (quantity >= 0)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cellar_user_status
  ON public.cellar_items USING btree (user_id, status);

CREATE INDEX IF NOT EXISTS idx_cellar_wine_id
  ON public.cellar_items USING btree (wine_id);

CREATE INDEX IF NOT EXISTS idx_cellar_user_id
  ON public.cellar_items USING btree (user_id);

-- Create trigger for updated_at
CREATE TRIGGER trg_cellar_items_touch
  BEFORE UPDATE ON cellar_items
  FOR EACH ROW EXECUTE FUNCTION tg_touch_updated_at();

-- Enable Row Level Security
ALTER TABLE public.cellar_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage their own cellar"
  ON public.cellar_items
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create fuzzy matching function for wine comparison
CREATE OR REPLACE FUNCTION fuzzy_match_wines(
  input_wine_name text,
  input_producer text,
  input_vintage integer DEFAULT NULL,
  match_threshold numeric DEFAULT 0.7
)
RETURNS TABLE (
  wine_id bigint,
  wine_name varchar,
  producer varchar,
  vintage integer,
  match_score numeric,
  total_score numeric
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.wine_id,
    w.wine_name,
    w.producer,
    w.vintage,
    GREATEST(
      similarity(w.wine_name, input_wine_name),
      CASE WHEN input_producer IS NOT NULL AND w.producer IS NOT NULL 
           THEN similarity(w.producer, input_producer) 
           ELSE 0 END
    )::numeric as match_score,
    (
      similarity(w.wine_name, input_wine_name) * 0.5 +
      CASE WHEN input_producer IS NOT NULL AND w.producer IS NOT NULL 
           THEN similarity(w.producer, input_producer) * 0.3 
           ELSE 0 END +
      CASE WHEN input_vintage IS NOT NULL AND w.vintage IS NOT NULL 
           THEN CASE WHEN w.vintage = input_vintage THEN 0.2 ELSE 0 END 
           ELSE 0.2 END
    )::numeric as total_score
  FROM wines w
  WHERE (
    similarity(w.wine_name, input_wine_name) >= match_threshold OR
    (input_producer IS NOT NULL AND w.producer IS NOT NULL AND 
     similarity(w.producer, input_producer) >= match_threshold)
  )
  ORDER BY total_score DESC
  LIMIT 10;
END;
$$;

-- Create function to batch insert cellar items with fuzzy matching
CREATE OR REPLACE FUNCTION batch_insert_cellar_items(
  items jsonb,
  match_threshold numeric DEFAULT 0.7
)
RETURNS TABLE (
  bottle_id bigint,
  wine_id bigint,
  wine_name varchar,
  status text,
  match_type text
)
LANGUAGE plpgsql
AS $$
DECLARE
  item jsonb;
  existing_wine_id bigint;
  new_wine_id bigint;
  match_score numeric;
  best_match record;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(items)
  LOOP
    -- Try to find existing wine
    SELECT wine_id, total_score INTO best_match
    FROM fuzzy_match_wines(
      item->>'wine_name',
      item->>'producer',
      (item->>'vintage')::integer,
      match_threshold
    )
    LIMIT 1;
    
    IF best_match.wine_id IS NOT NULL AND best_match.total_score >= match_threshold THEN
      -- Use existing wine
      existing_wine_id := best_match.wine_id;
      
      -- Insert cellar item
      INSERT INTO cellar_items (
        user_id, wine_id, quantity, where_stored, value, 
        currency, my_notes, my_rating, status
      ) VALUES (
        auth.uid(),
        existing_wine_id,
        COALESCE((item->>'quantity')::integer, 1),
        item->>'where_stored',
        (item->>'value')::numeric,
        COALESCE(item->>'currency', 'USD'),
        item->>'my_notes',
        (item->>'my_rating')::integer,
        COALESCE(item->>'status', 'stored')
      ) ON CONFLICT (user_id, wine_id) 
      DO UPDATE SET
        quantity = cellar_items.quantity + EXCLUDED.quantity,
        updated_at = now()
      RETURNING bottle_id, wine_id INTO bottle_id, wine_id;
      
      -- Return match info
      wine_name := item->>'wine_name';
      status := 'matched';
      match_type := 'existing_wine';
      RETURN NEXT;
      
    ELSE
      -- Create new wine
      INSERT INTO wines (
        wine_name, producer, vintage, alcohol, country_id, region_id,
        appellation_id, bottle_size, drink_starting, drink_by, barcode,
        my_score, created_from_analysis, analysis_confidence
      ) VALUES (
        item->>'wine_name',
        item->>'producer',
        (item->>'vintage')::integer,
        item->>'alcohol',
        item->>'country_id',
        (item->>'region_id')::integer,
        (item->>'appellation_id')::integer,
        item->>'bottle_size',
        item->>'drink_starting',
        item->>'drink_by',
        item->>'barcode',
        (item->>'my_score')::integer,
        true,
        COALESCE((item->>'analysis_confidence')::numeric, 0.0)
      ) RETURNING wine_id INTO new_wine_id;
      
      -- Insert cellar item
      INSERT INTO cellar_items (
        user_id, wine_id, quantity, where_stored, value, 
        currency, my_notes, my_rating, status
      ) VALUES (
        auth.uid(),
        new_wine_id,
        COALESCE((item->>'quantity')::integer, 1),
        item->>'where_stored',
        (item->>'value')::numeric,
        COALESCE(item->>'currency', 'USD'),
        item->>'my_notes',
        (item->>'my_rating')::integer,
        COALESCE(item->>'status', 'stored')
      ) RETURNING bottle_id, wine_id INTO bottle_id, wine_id;
      
      -- Return new wine info
      wine_name := item->>'wine_name';
      status := 'created';
      match_type := 'new_wine';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- Create function to get user's cellar with wine details
CREATE OR REPLACE FUNCTION get_user_cellar()
RETURNS TABLE (
  bottle_id bigint,
  wine_id bigint,
  wine_name varchar,
  producer varchar,
  vintage integer,
  appellation varchar,
  region_name varchar,
  country_name varchar,
  quantity integer,
  where_stored text,
  value numeric,
  currency text,
  status text,
  my_notes text,
  my_rating integer,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ci.bottle_id,
    ci.wine_id,
    w.wine_name,
    w.producer,
    w.vintage,
    a.appellation,
    cr.wine_region as region_name,
    cr.country_name,
    ci.quantity,
    ci.where_stored,
    ci.value,
    ci.currency,
    ci.status,
    ci.my_notes,
    ci.my_rating,
    ci.created_at,
    ci.updated_at
  FROM cellar_items ci
  JOIN wines w ON ci.wine_id = w.wine_id
  LEFT JOIN appellation a ON w.appellation_id = a.appellation_id
  LEFT JOIN countries_regions cr ON w.region_id = cr.region_id
  WHERE ci.user_id = auth.uid()
  ORDER BY ci.created_at DESC;
END;
$$;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cellar_items TO authenticated;
GRANT USAGE ON SEQUENCE cellar_items_bottle_id_seq TO authenticated;
GRANT EXECUTE ON FUNCTION fuzzy_match_wines TO authenticated;
GRANT EXECUTE ON FUNCTION batch_insert_cellar_items TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_cellar TO authenticated;
