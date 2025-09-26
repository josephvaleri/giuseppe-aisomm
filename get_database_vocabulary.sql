-- Get all appellations from the appellation table
SELECT 'appellation' as table_name, appellation as term FROM appellation 
WHERE appellation IS NOT NULL AND appellation != ''
UNION ALL
-- Get all grape varieties from the grapes table  
SELECT 'grape' as table_name, grape_variety as term FROM grapes
WHERE grape_variety IS NOT NULL AND grape_variety != ''
UNION ALL
-- Get all wine regions from the countries_regions table
SELECT 'region' as table_name, wine_region as term FROM countries_regions
WHERE wine_region IS NOT NULL AND wine_region != ''
ORDER BY table_name, term;
