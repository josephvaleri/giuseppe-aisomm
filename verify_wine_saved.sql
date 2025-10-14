-- Check if wine was successfully saved
SELECT wine_id, producer, wine_name, vintage, alcohol, country_id, appellation_id, drink_starting, drink_by
FROM wines 
ORDER BY wine_id DESC 
LIMIT 3;

-- Also check what columns exist in wines table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'wines' 
ORDER BY ordinal_position;
