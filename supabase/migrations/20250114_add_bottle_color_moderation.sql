-- Add bottle_size and color columns to moderation_items_wines table
ALTER TABLE moderation_items_wines 
ADD COLUMN IF NOT EXISTS bottle_size varchar(50),
ADD COLUMN IF NOT EXISTS color varchar(50);

COMMENT ON COLUMN moderation_items_wines.bottle_size IS 'Bottle size (e.g., 750ml, 1.5L)';
COMMENT ON COLUMN moderation_items_wines.color IS 'Wine color/type (e.g., Red, White, Rosé, Sparkling)';

