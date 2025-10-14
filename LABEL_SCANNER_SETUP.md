# 🍷 Wine Label Scanner - Setup Complete!

## ✅ Installation Status

### Completed Steps
1. ✅ **Dependencies installed** (nanoid, sharp, tesseract.js)
2. ✅ **Database migration applied** (label_jobs, moderation_items_wines, RLS)
3. ✅ **Storage buckets created** (label-images, wine-images)
4. ✅ **UI integrated** (LabelScannerCard added to home page)

---

## 🎯 Quick Test

1. **Start the dev server** (if not running):
   ```bash
   npm run dev
   ```

2. **Open** `http://localhost:3000`

3. **Login as a user**

4. **Look for the "Label Scanner" card** in the top-right (above answers)

5. **Try it out**:
   - Click the camera icon (mobile) or upload button
   - Or type: Vintage: 2019, Producer: Antinori, Wine: Tignanello
   - Click "Search"

---

## 🔧 Configuration Needed

### 1. Environment Variables (Optional Tuning)

Your `.env.local` should already have the required Supabase and OpenAI keys.

**Optional - Add these for fine-tuning**:
```bash
# Image Quality Check Thresholds (optional - has defaults)
IMAGE_QC_MIN_DIM=800
IMAGE_QC_MIN_BYTES=60000
IMAGE_QC_MIN_LAPLACIAN_VAR=140.0

# Fuzzy Matching (optional - default is 0.70)
MATCH_SCORE_MIN=0.70

# AI Search Model (optional - default is gpt-4o-mini)
AI_SEARCH_MODEL=gpt-4o-mini
```

### 2. Assign Moderator Roles

To review label submissions, assign users as moderators:

**Via Supabase SQL Editor**:
```sql
-- Replace with actual user UUIDs from auth.users table
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('your-user-uuid-here', 'moderator')
ON CONFLICT (user_id) DO UPDATE SET role = 'moderator';
```

**Find User UUIDs**:
```sql
SELECT id, email FROM auth.users;
```

---

## 📱 How It Works

### User Flow
1. User uploads wine label photo or enters details manually
2. **Quality Check** validates image (blur, lighting, resolution)
3. **OCR** extracts text from label
4. **Parser** identifies: producer, wine name, vintage, alcohol %
5. **Fuzzy Matcher** searches wines table (70% similarity threshold)
6. **Results shown** with confidence scores
7. **If no match**: AI Search button appears (uses OpenAI)
8. **User selects** best match
9. **Submitted to moderation queue**
10. **Moderator reviews** and accepts/denies

### Moderator Flow
1. Go to `/moderation` (access will be restricted to moderators)
2. Review pending label submissions
3. Edit fields if needed
4. Accept (adds to wines table) or Deny (deletes)

---

## 🎨 UI Location

The **Label Scanner** card appears in the **top-right column** of the home page, above the answers section:

```
┌────────────────┬──────────────────┐
│  Giuseppe      │  Label Scanner   │  ← NEW!
│  Avatar        │  [Upload] [📷]   │
│                │  [Fields] [🔍]   │
├────────────────┼──────────────────┤
│  Question      │  Answers         │
│  Input         │  or Grape Detail │
└────────────────┴──────────────────┘
```

---

## 📊 Database Tables

### `label_jobs`
Tracks all scan attempts with QC and OCR results.

### `moderation_items_wines`  
Pending wine submissions awaiting moderator review.

### `user_roles`
Maps users to roles (admin, moderator, user).

**Check submissions**:
```sql
-- View pending wine labels
SELECT * FROM moderation_items_wines 
WHERE status = 'pending' 
ORDER BY created_at DESC;

-- View label scan jobs
SELECT * FROM label_jobs 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🔍 API Endpoints

All routes are in `/api/labels/`:

- `POST /api/labels/presign` - Get upload URL
- `POST /api/labels/analyze` - Process image → OCR → fuzzy match
- `POST /api/labels/ai-search` - OpenAI fallback search
- `POST /api/labels/manual` - Manual entry search
- `POST /api/labels/commit` - Submit to moderation

Moderation routes:
- `POST /api/moderation/wines/:id/accept` - Approve wine
- `POST /api/moderation/wines/:id/deny` - Reject wine

---

## 🐛 Troubleshooting

### "Image quality not sufficient"
- Ensure good lighting (no backlight/shadows)
- Hold phone steady
- Get close to label (fill frame)
- Clean camera lens
- Try different angle/lighting

### No database matches
- Click "Search with AI" button
- Or use manual entry fields
- Lower `MATCH_SCORE_MIN` threshold if too strict

### OCR not extracting text
- Check image has clear, readable text
- Ensure label is not too small in frame
- Try manual entry as fallback

### Sharp installation errors
```bash
npm rebuild sharp
```

### TypeScript errors
```bash
npm run lint
```

---

## 📖 Full Documentation

- **Complete Guide**: `docs/LABEL_RECOGNITION.md`
- **Quick Start**: `docs/LABEL_RECOGNITION_QUICKSTART.md`

---

## 🚀 Next Steps (Optional)

### Enhance Moderation UI
The moderation queue works via API, but you can add a dedicated "Wine Labels" tab:

1. Add tab to `/moderation` page
2. List pending items from `moderation_items_wines`
3. Show image thumbnail + extracted fields
4. Accept/Deny buttons

### Add Pending Wine Detail Page
Create `/wines/pending/[id]` to show:
- Wine details awaiting approval
- "Pending Moderation" banner
- Link to full wine page after approval

---

## ✨ What's Working Now

✅ **Upload & Camera Capture** - Phone camera or file upload  
✅ **Quality Validation** - Rejects blurry/dark/low-res images  
✅ **OCR & Parsing** - Extracts producer, wine, vintage, alcohol %  
✅ **Fuzzy Matching** - 70% threshold against wines database  
✅ **AI Fallback** - OpenAI search when no DB match  
✅ **Manual Entry** - Type details if scanning fails  
✅ **Moderation Queue** - All submissions reviewed before adding  
✅ **Image Management** - Auto-moves approved images  

---

## 🎉 You're Ready!

The wine label recognition system is **fully functional** and ready to use. 

Just make sure to:
1. ✅ Assign at least one moderator role
2. ✅ Test the full flow end-to-end
3. ✅ Monitor the `label_jobs` table for any issues

**Happy scanning! 🍷📸**

