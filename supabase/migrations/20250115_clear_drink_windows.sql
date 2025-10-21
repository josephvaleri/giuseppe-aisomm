-- Clear all drink window fields in cellar_items table
-- This will set all drink_starting and drink_by values to NULL

-- Clear drink_starting field
UPDATE public.cellar_items 
SET drink_starting = NULL;

-- Clear drink_by field  
UPDATE public.cellar_items 
SET drink_by = NULL;

-- Show summary of cleared records
SELECT 
  'Cleared all drink window fields in cellar_items' as message,
  COUNT(*) as total_cellar_items,
  COUNT(drink_starting) as items_with_drink_starting,
  COUNT(drink_by) as items_with_drink_by
FROM public.cellar_items;
