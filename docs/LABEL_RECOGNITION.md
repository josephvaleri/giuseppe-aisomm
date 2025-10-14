# Wine Label Recognition System

## Overview

The label recognition system allows users to scan wine labels using their phone camera or upload images, automatically extracting wine information and matching against the database.

## Features

- **Image Upload & Camera Capture**: Upload from gallery or use phone camera
- **Quality Check (QC)**: Detects blur, poor lighting, low resolution
- **OCR & Parsing**: Extracts producer, wine name, vintage, alcohol %
- **Fuzzy Matching**: 70% similarity threshold for database matching
- **AI Fallback**: OpenAI search when database match fails
- **Moderation Queue**: All submissions reviewed before adding to database
- **Manual Entry**: Fallback option when scanning fails

## Setup

### 1. Install Dependencies

```bash
npm install
```

New dependencies added:
- `nanoid` - Unique ID generation
- `tesseract.js` - OCR engine
- `sharp` - Image processing

### 2. Run Database Migrations

```bash
# Apply the label recognition migration
psql -h your-db-host -U postgres -d your-db -f supabase/migrations/20250113_label_recognition_system.sql
```

Or via Supabase dashboard: SQL Editor → paste migration content → Run.

### 3. Setup Storage Buckets

```bash
npm run setup-label-storage
```

This creates two private buckets:
- `label-images` - Raw user uploads
- `wine-images` - Approved wine images

### 4. Configure Environment Variables

Copy `.env.local.example` to `.env.local` and fill in:

```bash
# Image QC Thresholds
IMAGE_QC_MIN_DIM=800
IMAGE_QC_MIN_BYTES=60000
IMAGE_QC_MIN_LAPLACIAN_VAR=140.0

# Fuzzy Matching
MATCH_SCORE_MIN=0.70

# AI Search
AI_SEARCH_MODEL=gpt-4o-mini
```

### 5. Set User Roles

Assign moderator/admin roles to users:

```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('user-uuid-here', 'moderator');
```

## Usage

### For End Users

1. **Navigate to Giuseppe homepage**
2. **Find Label Scanner** card (top-right above answers)
3. **Three options**:
   - Click camera icon (mobile capture)
   - Click upload icon (choose from gallery)
   - Type manually (vintage, producer, wine name)

4. **Review results**:
   - Database matches shown with confidence scores
   - Click a match to select
   - If no match, click "Search with AI"

5. **Submit for moderation**:
   - Optional: Check "Save to my cellar"
   - Wine goes to moderation queue
   - Redirected to pending wine page

### For Moderators

1. **Navigate to `/moderation`**
2. **Click "Wine Labels" tab**
3. **Review each submission**:
   - View label image
   - Check extracted fields
   - Edit if needed (producer, name, vintage, etc.)
   - See candidate matches if any

4. **Actions**:
   - **Accept**: Adds to wines table, moves image
   - **Deny**: Deletes record and image
   - **Save (then Accept)**: Edit fields first

## API Endpoints

### `/api/labels/presign` (POST)
Get presigned upload URL for image.

**Request**:
```json
{
  "mimeType": "image/jpeg"
}
```

**Response**:
```json
{
  "imageKey": "user-id/timestamp-id.jpg",
  "uploadUrl": "https://...",
  "expiresIn": 300
}
```

### `/api/labels/analyze` (POST)
Analyze uploaded label image.

**Request**:
```json
{
  "imageKey": "user-id/timestamp-id.jpg",
  "hint": {
    "vintage": 2019,
    "producer": "Antinori"
  }
}
```

**Response (with candidates)**:
```json
{
  "type": "candidates",
  "parsed": {
    "producer": "Marchesi Antinori",
    "wine_name": "Tignanello",
    "vintage": 2019,
    "alcohol_percent": 14.0,
    "confidence": { ... }
  },
  "candidates": [
    {
      "wine_id": 123,
      "producer": "Marchesi Antinori",
      "wine_name": "Tignanello",
      "vintage": 2019,
      "score": 0.95,
      "confidence": 0.98
    }
  ]
}
```

**Response (no match)**:
```json
{
  "type": "no_match",
  "parsed": { ... },
  "allowAiSearch": true
}
```

### `/api/labels/ai-search` (POST)
Search for wine using OpenAI.

**Request**:
```json
{
  "parsed": {
    "producer": "Antinori",
    "wine_name": "Tignanello",
    "vintage": 2019
  }
}
```

**Response**:
```json
{
  "type": "ai_result",
  "wineData": {
    "producer": "Marchesi Antinori",
    "wine_name": "Tignanello",
    "vintage": 2019,
    "grapes": ["Sangiovese", "Cabernet Sauvignon", "Cabernet Franc"],
    "typical_price": 120.00,
    "ratings": {
      "Wine Spectator": 95,
      "Wine Enthusiast": 94
    },
    ...
  },
  "traceId": "ai-search-..."
}
```

### `/api/labels/manual` (POST)
Manual entry search.

**Request**:
```json
{
  "producer": "Antinori",
  "wine_name": "Tignanello",
  "vintage": "2019"
}
```

### `/api/labels/commit` (POST)
Commit selection to moderation queue.

**Request**:
```json
{
  "selection": { ... },
  "imageKey": "...",
  "source": "label_scan",
  "saveToCellar": false
}
```

**Response**:
```json
{
  "success": true,
  "modId": 456,
  "redirectUrl": "/wines/pending/456"
}
```

### `/api/moderation/wines/:id/accept` (POST)
Accept wine (moderators only).

**Request**:
```json
{
  "editedData": {
    "producer": "Corrected Producer",
    "wine_name": "Corrected Name"
  }
}
```

### `/api/moderation/wines/:id/deny` (POST)
Deny wine (moderators only).

## Image Quality Tips

### Good Practices
✅ Good, even lighting (avoid backlight)
✅ Hold phone steady 1-2 seconds after capture
✅ Fill frame with label
✅ Perpendicular to label (straight-on)
✅ Clean lens

### Avoid
❌ Motion blur (hold steady!)
❌ Harsh glare or shadows
❌ Too dark or too bright
❌ Angled/skewed shots
❌ Too far away (low resolution)

## Quality Check (QC) Metrics

The system checks:
- **Blur**: Laplacian variance >= 140
- **Brightness**: Mean 40-220
- **Resolution**: Min dimension >= 800px
- **File Size**: >= 60KB

If QC fails, user sees:
> "The image quality is not sufficient for an accurate scan. Please take the image again or type in the vintage, producer and wine name."

## Fuzzy Matching Algorithm

### 70% Rule
Combines producer and wine name similarity:
```
score = 0.5 * similarity(producer) + 0.5 * similarity(wine_name)
```

Match threshold: **0.70** (70%)

### Database Function
Uses `pg_trgm` extension for trigram similarity:
```sql
SELECT fuzzy_score('Antinori', 'Marchesi Antinori')
-- Returns: 0.72
```

Vintage match gives +10% confidence bonus.

## Database Schema

### `label_jobs`
Tracks all label recognition jobs with QC and OCR results.

### `moderation_items_wines`
Wines pending moderation approval.

**Key fields**:
- `source`: label_scan | manual | ai_search
- `confidence`: Per-field confidence scores
- `candidate_json`: Serialized candidate list
- `status`: pending | accepted | denied

## Troubleshooting

### OCR Not Working
```bash
# Check Tesseract is loaded
npm list tesseract.js
```

### Image QC Too Strict
Adjust thresholds in `.env.local`:
```bash
IMAGE_QC_MIN_LAPLACIAN_VAR=100  # Lower = more lenient
```

### No Database Matches
- Check fuzzy_score function exists
- Lower MATCH_SCORE_MIN (e.g., 0.60)
- Use AI Search fallback

### Sharp Installation Issues
```bash
# Reinstall sharp with platform-specific binary
npm rebuild sharp
```

## Integration with Home Page

Add to `src/app/home-page.tsx`:

```tsx
import { LabelScannerCard } from '@/components/LabelScannerCard'

// In authenticated user view, add above answers section:
<LabelScannerCard />
```

## Security Considerations

- All buckets are **private** (signed URLs only)
- OCR/AI calls are **server-side only**
- Moderator-only access to accept/deny
- Rate limiting on analyze endpoints (TODO)
- RLS policies enforce user/moderator permissions

## Performance

- Image upload: ~2-3 seconds
- QC check: ~500ms
- OCR + parsing: ~3-5 seconds
- Fuzzy matching: ~100-200ms
- AI search: ~2-4 seconds

Total: **~5-10 seconds** for full pipeline

## Future Enhancements

- [ ] Batch label scanning
- [ ] Mobile app with native camera
- [ ] Confidence-based auto-approval (>95%)
- [ ] User feedback loop for ML training
- [ ] Multi-label detection (multiple wines in one image)
- [ ] Barcode scanning integration
- [ ] Price tracking integration

## Support

For issues or questions:
1. Check logs in Supabase dashboard
2. Review `label_jobs` table for failed jobs
3. Test with known wine labels first
4. Verify all migrations ran successfully

