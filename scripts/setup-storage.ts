import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function setupStorage() {
  try {
    console.log('Setting up Supabase Storage...')
    
    // Create the giuseppe-avatars bucket
    const { data, error } = await supabase.storage.createBucket('giuseppe-avatars', {
      public: true,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'],
      fileSizeLimit: 5242880 // 5MB
    })

    if (error && !error.message.includes('already exists')) {
      throw error
    }

    console.log('✅ Storage bucket "giuseppe-avatars" is ready!')
    console.log('')
    console.log('Next steps:')
    console.log('1. Go to your Supabase dashboard')
    console.log('2. Navigate to Storage > giuseppe-avatars')
    console.log('3. Upload your avatar images:')
    console.log('   - waiting.png (default state)')
    console.log('   - answering.png (thinking state)')
    console.log('   - error.png (error state)')
    console.log('')
    console.log('Or use the Admin > Manage Avatars page in the app!')
    
  } catch (error) {
    console.error('Error setting up storage:', error)
  }
}

setupStorage()
