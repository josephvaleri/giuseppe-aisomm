-- Add typical_price column to wines table
ALTER TABLE wines 
ADD COLUMN IF NOT EXISTS typical_price numeric(10,2);

-- Add bottle_size column if it doesn't exist
ALTER TABLE wines 
ADD COLUMN IF NOT EXISTS bottle_size varchar(50);

-- Add index for price queries
CREATE INDEX IF NOT EXISTS idx_wines_typical_price 
ON wines(typical_price) WHERE typical_price IS NOT NULL;

COMMENT ON COLUMN wines.typical_price IS 'Typical retail price in USD';
COMMENT ON COLUMN wines.bottle_size IS 'Bottle size (e.g., 750ml, 1.5L)';
