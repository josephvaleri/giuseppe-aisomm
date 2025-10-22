import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findUserIds() {
  try {
    console.log('🔍 Finding all user IDs in your database...\n');
    
    // Get all users from the auth.users table
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }

    if (!users || users.length === 0) {
      console.log('❌ No users found in the database.');
      return;
    }

    console.log('👥 Users in your database:');
    console.log('=====================================');
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'No email'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}`);
      console.log('   -----------------------------------');
    });

    console.log('\n💡 Copy one of the User IDs above and paste it into the give-mastery-badges.ts script');
    console.log('📝 Replace "YOUR_USER_ID_HERE" with your actual user ID');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
findUserIds();
