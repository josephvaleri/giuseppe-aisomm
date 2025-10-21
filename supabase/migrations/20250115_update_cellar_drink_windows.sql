-- Update cellar_items drink window fields from wines table
-- This script copies drink_starting and drink_by from wines table to cellar_items
-- where cellar_items doesn't already have these values set

-- Update drink_starting from wines table where cellar_items.drink_starting is NULL or set to 9999-01-01
-- Only updates if wines.drink_starting has a valid value, otherwise leaves cellar_items.drink_starting as NULL
UPDATE public.cellar_items 
SET drink_starting = w.drink_starting
FROM public.wines w
WHERE cellar_items.wine_id = w.wine_id 
  AND (cellar_items.drink_starting IS NULL OR cellar_items.drink_starting = '9999-01-01' OR cellar_items.drink_starting = '9999-01-01T00:00:00.000Z')
  AND w.drink_starting IS NOT NULL 
  AND w.drink_starting != '9999-01-01'
  AND w.drink_starting != '9999-01-01T00:00:00.000Z';

-- Update drink_by from wines table where cellar_items.drink_by is NULL or set to 9999-01-01  
-- Only updates if wines.drink_by has a valid value, otherwise leaves cellar_items.drink_by as NULL
UPDATE public.cellar_items 
SET drink_by = w.drink_by
FROM public.wines w
WHERE cellar_items.wine_id = w.wine_id 
  AND (cellar_items.drink_by IS NULL OR cellar_items.drink_by = '9999-01-01' OR cellar_items.drink_by = '9999-01-01T00:00:00.000Z')
  AND w.drink_by IS NOT NULL 
  AND w.drink_by != '9999-01-01'
  AND w.drink_by != '9999-01-01T00:00:00.000Z';

-- Show summary of updated records
SELECT 
  'Updated cellar_items with drink windows from wines table' as message,
  COUNT(*) as total_cellar_items,
  COUNT(drink_starting) as items_with_drink_starting,
  COUNT(drink_by) as items_with_drink_by,
  COUNT(CASE WHEN drink_starting IS NOT NULL AND drink_by IS NOT NULL THEN 1 END) as items_with_both_dates
FROM public.cellar_items;
