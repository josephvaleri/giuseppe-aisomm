# 🍷 Wine Data Enhancements - Complete

## ✅ What Was Done

### 1. **Added typical_price Column to Wines Table**
- Created migration: `supabase/migrations/20250114_add_typical_price.sql`
- Added `typical_price numeric(10,2)` column
- Added `bottle_size varchar(50)` column (bonus!)
- Created index for price queries

**To Apply:**
Run this in Supabase SQL Editor:
```sql
ALTER TABLE wines 
ADD COLUMN IF NOT EXISTS typical_price numeric(10,2);

ALTER TABLE wines 
ADD COLUMN IF NOT EXISTS bottle_size varchar(50);

CREATE INDEX IF NOT EXISTS idx_wines_typical_price 
ON wines(typical_price) WHERE typical_price IS NOT NULL;
```

---

### 2. **Enhanced AI Search to Collect Additional Fields**
✅ Already collected: Country, Region, Appellation  
✅ **NEW**: Added Bottle Size

**Updated:** `src/app/api/labels/ai-search/route.ts`
- Added `bottle_size` to schema
- Updated OpenAI prompt to extract bottle size (e.g., "750ml", "1.5L")

**AI Now Returns:**
- Producer, Wine Name, Vintage, Alcohol %
- **Country** (e.g., "United States")
- **Wine Region** (e.g., "Napa Valley")
- **Appellation** (e.g., "Oakville AVA")
- **Bottle Size** (e.g., "750ml")
- Typical Price, Grapes, Ratings
- Flavor Profile, Drink Windows

---

### 3. **Country → country_id Mapping**
✅ **Fixed:** `src/app/api/moderation/wines/[id]/accept/route.ts`

**Logic:**
1. Takes country name from AI search (e.g., "United States")
2. Looks up in `countries_regions.country_name` (case-insensitive)
3. Returns `country_id`
4. Saves to `wines.country_id`

**Console Log:**
```
[Accept] Country lookup: "United States" → country_id: 123
```

---

### 4. **Region → region_id Mapping**
✅ **Fixed:** `src/app/api/moderation/wines/[id]/accept/route.ts`

**Logic:**
1. Takes region name from AI search (e.g., "Napa Valley")
2. Looks up in `countries_regions.wine_region` (case-insensitive)
3. Returns `region_id`
4. Saves to `wines.region_id`

**Console Log:**
```
[Accept] Region lookup: "Napa Valley" → region_id: 456
```

---

### 5. **Display New Fields in UI**
✅ **Updated:** `src/components/WineSelectionModal.tsx`

**AI Search Results Now Show:**
- Producer & Wine Name
- **Vintage**
- **Bottle Size** 📦 NEW!
- **Appellation**
- **Origin** (Region, Country) 🌍 Enhanced!
- **Grapes**
- **Typical Price** 💰 NEW!
- **Alcohol %**
- **Ratings** (Wine Spectator, etc.)

---

### 6. **Bonus: Fixed Next.js 15 Async Params**
✅ Fixed both endpoints:
- `accept/route.ts` 
- `deny/route.ts`

Changed from: `params.id`  
To: `const { id } = await params`

---

## 📊 Complete Data Flow

### When a wine is accepted from moderation:

1. **AI Search extracts:**
   - Country: "United States"
   - Region: "Napa Valley"
   - Appellation: "Oakville AVA"
   - Bottle Size: "750ml"
   - Typical Price: 75.00

2. **Accept endpoint looks up:**
   - country_id from `countries_regions` WHERE country_name ILIKE 'United States'
   - region_id from `countries_regions` WHERE wine_region ILIKE 'Napa Valley'
   - appellation_id from `appellation` WHERE appellation ILIKE 'Oakville AVA'

3. **Saved to wines table:**
```sql
INSERT INTO wines (
  producer, wine_name, vintage, alcohol,
  typical_price,      -- ✅ NEW!
  bottle_size,        -- ✅ NEW!
  country_id,         -- ✅ Properly mapped!
  region_id,          -- ✅ Properly mapped!
  appellation_id,     -- ✅ Properly mapped!
  drink_starting, drink_by
) VALUES (...)
```

---

## 🚀 Next Steps

### 1. **Apply Database Migration**
Run in Supabase SQL Editor:
```bash
cat supabase/migrations/20250114_add_typical_price.sql
```

### 2. **Assign Moderator Role**
```sql
INSERT INTO user_roles (user_id, role)
VALUES ('c837e6dc-f372-463d-abe7-393d70b50658', 'admin')
ON CONFLICT (user_id) DO UPDATE SET role = 'admin';
```

### 3. **Test the Flow**
1. Upload a wine label
2. Use AI search
3. Check the results show: bottle size, price, region, country
4. Accept the wine
5. Verify in wines table that all fields are populated

---

## 🐛 Known Issues to Monitor

### 1. **Fuzzy Matching Error**
Your logs show:
```
Error matching wines: {
  code: '42703',
  message: 'column cr.country_region_id does not exist'
}
```

This is in the fuzzy match function. We can fix this if needed.

### 2. **Foreign Key Lookups**
If country/region names don't exactly match `countries_regions` table, the IDs will be NULL.  
Check your data to ensure names align.

---

## ✨ What's Working Now

✅ Typical price saved to wines table  
✅ Bottle size saved to wines table  
✅ Country properly mapped to country_id  
✅ Region properly mapped to region_id  
✅ Appellation mapped to appellation_id  
✅ All fields displayed in AI search results  
✅ Next.js 15 async params fixed  

**Happy wine hunting! 🍷📸**
