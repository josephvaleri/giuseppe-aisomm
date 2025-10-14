# Label Recognition - Quick Start Guide

## Installation

```bash
# 1. Install new dependencies
npm install

# 2. Run database migration
# Via Supabase Dashboard: SQL Editor → Run migration file
# Or via psql/command line

# 3. Setup storage buckets
npm run setup-label-storage

# 4. Configure environment
cp .env.local.example .env.local
# Edit .env.local with your keys
```

## Integration

### Add to Home Page

In `src/app/home-page.tsx`, add the scanner component:

```tsx
import { LabelScannerCard } from '@/components/LabelScannerCard'

// In the authenticated users section, add before answers:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
  <div className="flex flex-col space-y-6">
    {/* Existing Giuseppe avatar card */}
    {/* Existing question input card */}
  </div>

  <div className="flex flex-col space-y-6">
    {/* NEW: Label Scanner - add here */}
    <LabelScannerCard />
    
    {/* Existing answers or grape detail */}
  </div>
</div>
```

### Assign Moderator Roles

```sql
-- Set users as moderators
INSERT INTO public.user_roles (user_id, role)
VALUES 
  ('your-user-uuid-1', 'moderator'),
  ('your-user-uuid-2', 'admin');
```

## How It Works

1. **User scans label** → Uploads to `label-images` bucket
2. **QC check** → Validates image quality (blur, brightness, resolution)
3. **OCR** → Extracts text from label
4. **Parsing** → Identifies producer, wine name, vintage, alcohol %
5. **Fuzzy matching** → Searches wines table (70% threshold)
6. **AI fallback** → If no match, offers OpenAI search
7. **Selection** → User picks best match
8. **Moderation** → Goes to moderation queue
9. **Approval** → Moderator accepts → Added to wines table

## Files Created

### Database
- `supabase/migrations/20250113_label_recognition_system.sql` - Full schema

### API Routes
- `/api/labels/presign` - Get upload URL
- `/api/labels/analyze` - Process image
- `/api/labels/ai-search` - OpenAI fallback
- `/api/labels/manual` - Manual entry
- `/api/labels/commit` - Submit to moderation
- `/api/moderation/wines/[id]/accept` - Approve wine
- `/api/moderation/wines/[id]/deny` - Reject wine

### Components
- `src/components/LabelScannerCard.tsx` - Main UI
- `src/components/WineSelectionModal.tsx` - Selection dialog

### Libraries
- `src/lib/labels/image-qc.ts` - Quality check
- `src/lib/labels/ocr-parser.ts` - OCR & parsing
- `src/lib/labels/fuzzy-match.ts` - Matching logic

### Scripts
- `scripts/setup-label-storage.ts` - Bucket setup

### Documentation
- `docs/LABEL_RECOGNITION.md` - Full documentation
- `docs/LABEL_RECOGNITION_QUICKSTART.md` - This file

## Testing

### Test Image Upload
1. Go to Giuseppe homepage
2. Find "Label Scanner" card
3. Click camera/upload icon
4. Take photo of any wine label
5. Review detected fields
6. Select a match or try AI search

### Test Manual Entry
1. Type: Vintage: 2019, Producer: Antinori, Wine: Tignanello
2. Click Search
3. Should show database matches

### Test Moderation
1. As moderator, go to `/moderation`
2. Click "Wine Labels" tab (pending implementation)
3. Review submitted wines
4. Accept or deny

## Troubleshooting

**"Image quality not sufficient"**
- Ensure good lighting
- Hold phone steady
- Fill frame with label
- Check resolution >= 800px

**No database matches**
- Try AI Search button
- Fall back to manual entry
- Check MATCH_SCORE_MIN threshold

**OCR errors**
- Ensure tesseract.js installed
- Check image has clear text
- Try manual entry fallback

## Next Steps

Still TODO (lower priority):
- [ ] Wine Labels tab in moderation dashboard UI
- [ ] Pending wine detail page (`/wines/pending/[id]`)
- [ ] Edge Function (optional - currently using API route)
- [ ] Unit tests for parsing/matching
- [ ] Integration tests for full pipeline

## Production Checklist

- [ ] Run migration on production DB
- [ ] Setup buckets in production Supabase
- [ ] Set environment variables
- [ ] Assign moderator roles
- [ ] Test full flow end-to-end
- [ ] Monitor `label_jobs` table for errors
- [ ] Set up alerts for QC failures

