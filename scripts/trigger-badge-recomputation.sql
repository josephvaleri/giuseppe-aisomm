-- Script to manually trigger badge recomputation for user c837e6dc-f372-463d-abe7-393d70b50658
-- This will compute and insert the badges based on the existing data

-- First, let's check what data we have
SELECT 'Current Data Summary:' as info;

SELECT 'Label Scans:' as metric, count(*) as count 
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

-- Now let's manually compute and insert the badges
-- We'll use the same logic as the badge engine

-- Get the user's metrics from the views
SELECT 'User Metrics from Views:' as info;
SELECT * FROM v_user_badge_metrics WHERE user_id = 'c837e6dc-f372-463d-abe7-393d70b50658';

SELECT 'User Milestones from Views:' as info;
SELECT * FROM v_user_badge_milestones WHERE user_id = 'c837e6dc-f372-463d-abe7-393d70b50658';

-- Manually insert the badges based on the data
-- Label Whisperer (11 scans = Bronze tier)
SELECT upsert_user_badge('c837e6dc-f372-463d-abe7-393d70b50658', 'LABEL_WHISPERER', 11, 1);

-- Giuseppe's Favorite Student (12 correct answers = Bronze tier)
SELECT upsert_user_badge('c837e6dc-f372-463d-abe7-393d70b50658', 'GIUSEPPES_FAVORITE_STUDENT', 12, 1);

-- The Archivist (30 wines = Bronze tier)
SELECT upsert_user_badge('c837e6dc-f372-463d-abe7-393d70b50658', 'THE_ARCHIVIST', 30, 1);

-- Milestone badges
-- La Prima Bottiglia (first scan detected)
SELECT upsert_user_badge('c837e6dc-f372-463d-abe7-393d70b50658', 'LA_PRIMA_BOTTIGLIA', 1, 1);

-- Wine Time Traveler (pre-1980 wine detected)
SELECT upsert_user_badge('c837e6dc-f372-463d-abe7-393d70b50658', 'WINE_TIME_TRAVELER', 1, 1);

-- Check the results
SELECT 'Final Badge Status:' as info;
SELECT 
    ub.badge_code,
    b.name,
    b.category,
    b.icon_emoji,
    ub.current_value,
    ub.current_tier,
    ub.best_tier,
    ub.first_awarded_at
FROM user_badges ub
JOIN badges b ON b.badge_code = ub.badge_code
WHERE ub.user_id = 'c837e6dc-f372-463d-abe7-393d70b50658'
ORDER BY b.category, b.name;
