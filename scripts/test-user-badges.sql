-- Test script to add badge progress for testing
-- This will give you progress toward 3 different badges
-- User ID: c837e6dc-f372-463d-abe7-393d70b50658

-- ============================================
-- BADGE 1: Label Whisperer (Bronze tier - 10+ scans)
-- ============================================
-- Add some label scan events to moderation_items_wines
INSERT INTO moderation_items_wines (
    user_id, 
    source, 
    producer, 
    wine_name, 
    vintage, 
    status,
    created_at
) VALUES 
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 1', 'Test Wine 1', 2020, 'approved', now() - interval '10 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 2', 'Test Wine 2', 2019, 'approved', now() - interval '9 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 3', 'Test Wine 3', 2021, 'approved', now() - interval '8 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 4', 'Test Wine 4', 2018, 'approved', now() - interval '7 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 5', 'Test Wine 5', 2022, 'approved', now() - interval '6 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 6', 'Test Wine 6', 2017, 'approved', now() - interval '5 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 7', 'Test Wine 7', 2023, 'approved', now() - interval '4 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 8', 'Test Wine 8', 2016, 'approved', now() - interval '3 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 9', 'Test Wine 9', 2024, 'approved', now() - interval '2 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 10', 'Test Wine 10', 2015, 'approved', now() - interval '1 day'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 'label_scan', 'Test Producer 11', 'Test Wine 11', 2020, 'approved', now())
ON CONFLICT DO NOTHING;

-- ============================================
-- BADGE 2: Giuseppe's Favorite Student (Bronze tier - 10+ correct answers)
-- ============================================
-- Add some correct quiz answers
INSERT INTO user_quiz_progress (
    user_id,
    question_id,
    study_area,
    is_correct,
    created_at
) VALUES 
    ('c837e6dc-f372-463d-abe7-393d70b50658', 1, 'Regions and Appellations', true, now() - interval '10 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 2, 'Grapes', true, now() - interval '9 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 3, 'Styles', true, now() - interval '8 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 4, 'Pairings', true, now() - interval '7 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 5, 'Classifications', true, now() - interval '6 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 6, 'Regions and Appellations', true, now() - interval '5 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 7, 'Grapes', true, now() - interval '4 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 8, 'Styles', true, now() - interval '3 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 9, 'Pairings', true, now() - interval '2 days'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 10, 'Classifications', true, now() - interval '1 day'),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 11, 'Regions and Appellations', true, now()),
    ('c837e6dc-f372-463d-abe7-393d70b50658', 12, 'Grapes', true, now())
ON CONFLICT (user_id, question_id) DO NOTHING;

-- ============================================
-- BADGE 3: The Archivist (Bronze tier - 25+ wines in cellar)
-- ============================================
-- First, let's add some wines to the wines table
INSERT INTO wines (
    producer,
    wine_name,
    vintage,
    color,
    bottle_size,
    alcohol,
    typical_price,
    created_at
) VALUES 
    ('Test Cellar Producer 1', 'Test Cellar Wine 1', 2020, 'Red', '750ml', '13.5', 25.00, now() - interval '10 days'),
    ('Test Cellar Producer 2', 'Test Cellar Wine 2', 2019, 'White', '750ml', '12.0', 30.00, now() - interval '9 days'),
    ('Test Cellar Producer 3', 'Test Cellar Wine 3', 2021, 'Red', '750ml', '14.0', 35.00, now() - interval '8 days'),
    ('Test Cellar Producer 4', 'Test Cellar Wine 4', 2018, 'White', '750ml', '11.5', 28.00, now() - interval '7 days'),
    ('Test Cellar Producer 5', 'Test Cellar Wine 5', 2022, 'Red', '750ml', '13.0', 32.00, now() - interval '6 days'),
    ('Test Cellar Producer 6', 'Test Cellar Wine 6', 2017, 'White', '750ml', '12.5', 40.00, now() - interval '5 days'),
    ('Test Cellar Producer 7', 'Test Cellar Wine 7', 2023, 'Red', '750ml', '14.5', 45.00, now() - interval '4 days'),
    ('Test Cellar Producer 8', 'Test Cellar Wine 8', 2016, 'White', '750ml', '11.0', 38.00, now() - interval '3 days'),
    ('Test Cellar Producer 9', 'Test Cellar Wine 9', 2024, 'Red', '750ml', '13.8', 42.00, now() - interval '2 days'),
    ('Test Cellar Producer 10', 'Test Cellar Wine 10', 2015, 'White', '750ml', '12.2', 50.00, now() - interval '1 day'),
    ('Test Cellar Producer 11', 'Test Cellar Wine 11', 2020, 'Red', '750ml', '14.2', 48.00, now()),
    ('Test Cellar Producer 12', 'Test Cellar Wine 12', 2019, 'White', '750ml', '11.8', 55.00, now()),
    ('Test Cellar Producer 13', 'Test Cellar Wine 13', 2021, 'Red', '750ml', '13.2', 52.00, now()),
    ('Test Cellar Producer 14', 'Test Cellar Wine 14', 2018, 'White', '750ml', '12.8', 58.00, now()),
    ('Test Cellar Producer 15', 'Test Cellar Wine 15', 2022, 'Red', '750ml', '14.8', 60.00, now()),
    ('Test Cellar Producer 16', 'Test Cellar Wine 16', 2017, 'White', '750ml', '11.2', 65.00, now()),
    ('Test Cellar Producer 17', 'Test Cellar Wine 17', 2023, 'Red', '750ml', '13.6', 62.00, now()),
    ('Test Cellar Producer 18', 'Test Cellar Wine 18', 2016, 'White', '750ml', '12.6', 68.00, now()),
    ('Test Cellar Producer 19', 'Test Cellar Wine 19', 2024, 'Red', '750ml', '14.6', 70.00, now()),
    ('Test Cellar Producer 20', 'Test Cellar Wine 20', 2015, 'White', '750ml', '11.6', 72.00, now()),
    ('Test Cellar Producer 21', 'Test Cellar Wine 21', 2020, 'Red', '750ml', '13.4', 75.00, now()),
    ('Test Cellar Producer 22', 'Test Cellar Wine 22', 2019, 'White', '750ml', '12.4', 78.00, now()),
    ('Test Cellar Producer 23', 'Test Cellar Wine 23', 2021, 'Red', '750ml', '14.4', 80.00, now()),
    ('Test Cellar Producer 24', 'Test Cellar Wine 24', 2018, 'White', '750ml', '11.4', 82.00, now()),
    ('Test Cellar Producer 25', 'Test Cellar Wine 25', 2022, 'Red', '750ml', '13.4', 85.00, now()),
    ('Test Cellar Producer 26', 'Test Cellar Wine 26', 2017, 'White', '750ml', '12.4', 88.00, now()),
    ('Test Cellar Producer 27', 'Test Cellar Wine 27', 2023, 'Red', '750ml', '14.4', 90.00, now()),
    ('Test Cellar Producer 28', 'Test Cellar Wine 28', 2016, 'White', '750ml', '11.4', 92.00, now()),
    ('Test Cellar Producer 29', 'Test Cellar Wine 29', 2024, 'Red', '750ml', '13.4', 95.00, now()),
    ('Test Cellar Producer 30', 'Test Cellar Wine 30', 2015, 'White', '750ml', '12.4', 98.00, now())
ON CONFLICT DO NOTHING;

-- Now add these wines to your cellar
INSERT INTO cellar_items (
    user_id,
    wine_id,
    quantity,
    status,
    created_at
)
SELECT 
    'c837e6dc-f372-463d-abe7-393d70b50658'::uuid,
    w.wine_id,
    1,
    'stored',
    now() - (random() * interval '10 days')
FROM wines w
WHERE w.producer LIKE 'Test Cellar Producer%'
ON CONFLICT DO NOTHING;

-- ============================================
-- MILESTONE: La Prima Bottiglia (First scan)
-- ============================================
-- This should be automatically detected since we added label scans above

-- ============================================
-- MILESTONE: Wine Time Traveler (Wine older than 1980)
-- ============================================
-- Add a very old wine to trigger this milestone
INSERT INTO wines (
    producer,
    wine_name,
    vintage,
    color,
    bottle_size,
    alcohol,
    typical_price,
    created_at
) VALUES 
    ('Vintage Test Producer', 'Ancient Test Wine', 1975, 'Red', '750ml', '12.0', 150.00, now())
ON CONFLICT DO NOTHING;

-- Add it to your cellar
INSERT INTO cellar_items (
    user_id,
    wine_id,
    quantity,
    status,
    created_at
)
SELECT 
    'c837e6dc-f372-463d-abe7-393d70b50658'::uuid,
    w.wine_id,
    1,
    'stored',
    now()
FROM wines w
WHERE w.producer = 'Vintage Test Producer' AND w.wine_name = 'Ancient Test Wine'
ON CONFLICT DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the data was added correctly:

SELECT 'Label Scans Count:' as metric, count(*) as count 
FROM moderation_items_wines 
WHERE user_id = 'c837e6dc-f372-463d-abe7-393d70b50658' AND source = 'label_scan';

SELECT 'Correct Quiz Answers:' as metric, count(*) as count 
FROM user_quiz_progress 
WHERE user_id = 'c837e6dc-f372-463d-abe7-393d70b50658' AND is_correct = true;

SELECT 'Wines in Cellar:' as metric, count(*) as count 
FROM cellar_items 
WHERE user_id = 'c837e6dc-f372-463d-abe7-393d70b50658';

SELECT 'Pre-1980 Wines:' as metric, count(*) as count 
FROM cellar_items ci
JOIN wines w ON w.wine_id = ci.wine_id
WHERE ci.user_id = 'c837e6dc-f372-463d-abe7-393d70b50658' AND w.vintage < 1980;

-- ============================================
-- INSTRUCTIONS
-- ============================================
/*
TO USE THIS SCRIPT:

1. Run this script in your Supabase SQL editor
2. After running, visit /learn/mastery to see your badges!

EXPECTED RESULTS:
- Label Whisperer: Bronze tier (11 scans)
- Giuseppe's Favorite Student: Bronze tier (12 correct answers)  
- The Archivist: Bronze tier (30 wines in cellar)
- La Prima Bottiglia: Unlocked (first scan)
- Wine Time Traveler: Unlocked (wine from 1975)

The badge system should automatically compute and display these badges!
*/
