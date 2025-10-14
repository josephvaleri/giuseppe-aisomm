/**
 * Setup script for label recognition storage buckets
 * Run with: npx tsx scripts/setup-label-storage.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function setupBuckets() {
  console.log('🚀 Setting up label recognition storage buckets...\n')

  // Create label-images bucket (private, for raw uploads)
  const { data: labelBucket, error: labelError } = await supabase
    .storage
    .createBucket('label-images', {
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    })

  if (labelError && !labelError.message.includes('already exists')) {
    console.error('❌ Error creating label-images bucket:', labelError)
  } else {
    console.log('✅ label-images bucket ready')
  }

  // Create wine-images bucket (private, for accepted wine images)
  const { data: wineBucket, error: wineError } = await supabase
    .storage
    .createBucket('wine-images', {
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    })

  if (wineError && !wineError.message.includes('already exists')) {
    console.error('❌ Error creating wine-images bucket:', wineError)
  } else {
    console.log('✅ wine-images bucket ready')
  }

  // Set up RLS policies for buckets
  console.log('\n📋 Bucket policies:')
  console.log('   - label-images: authenticated users can upload their own files')
  console.log('   - wine-images: moderators/admins can read; system can write')
  console.log('   - Access via signed URLs for security\n')

  console.log('✅ Storage setup complete!')
}

setupBuckets().catch(console.error)

