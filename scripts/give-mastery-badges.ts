import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const STUDY_AREAS = [
  'Regions & Appellations',
  'Grapes', 
  'Styles',
  'Pairings',
  'Classifications'
] as const;

async function giveMasteryBadges() {
  try {
    console.log('🎯 Giving mastery badges to your account...');
    
    // Your user ID
    const YOUR_USER_ID = 'c837e6dc-f372-463d-abe7-393d70b50658';

    // Get some sample quiz questions to use for progress
    const { data: questions, error: questionsError } = await supabase
      .from('wine_quiz')
      .select('question_id, study_area')
      .limit(50);

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return;
    }

    if (!questions || questions.length === 0) {
      console.log('❌ No quiz questions found. Make sure the wine_quiz table has data.');
      return;
    }

    console.log(`📚 Found ${questions.length} questions to work with`);

    // Create progress entries for different study areas
    const progressEntries = [];
    
    // Give different amounts of progress to each area to show the badge system
    const progressByArea = {
      'Grapes': 15,           // Degustatore level (tier 2)
      'Styles': 25,           // Conoscitore level (tier 3) 
      'Pairings': 35,         // Esperto level (tier 4)
      'Classifications': 45,  // Maestro di Vino level (tier 5)
      'Regions & Appellations': 8 // Apprendista level (tier 1)
    };

    for (const [studyArea, correctCount] of Object.entries(progressByArea)) {
      // Get questions for this study area
      const areaQuestions = questions.filter(q => q.study_area === studyArea);
      
      if (areaQuestions.length === 0) {
        console.log(`⚠️  No questions found for ${studyArea}`);
        continue;
      }

      // Create progress entries for this area
      for (let i = 0; i < Math.min(correctCount, areaQuestions.length); i++) {
        const question = areaQuestions[i];
        progressEntries.push({
          user_id: YOUR_USER_ID,
          question_id: question.question_id,
          study_area: studyArea,
          is_correct: true // All correct answers to show mastery
        });
      }
    }

    console.log(`📝 Creating ${progressEntries.length} progress entries...`);

    // Insert progress entries in batches
    const batchSize = 20;
    let inserted = 0;

    for (let i = 0; i < progressEntries.length; i += batchSize) {
      const batch = progressEntries.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('user_quiz_progress')
        .insert(batch);

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        continue;
      }

      inserted += batch.length;
      console.log(`✅ Inserted batch ${Math.floor(i / batchSize) + 1}: ${batch.length} entries`);
    }

    console.log(`🎉 Successfully created ${inserted} progress entries!`);
    
    // Show the resulting mastery levels
    console.log('\n🏆 Your new mastery levels:');
    const { data: mastery } = await supabase
      .from('user_study_mastery')
      .select('study_area, correct_unique_count, badge_tier')
      .eq('user_id', YOUR_USER_ID)
      .order('correct_unique_count', { ascending: false });

    if (mastery) {
      mastery.forEach(area => {
        const tierNames = ['', 'Apprendista', 'Degustatore', 'Conoscitore', 'Esperto', 'Maestro di Vino'];
        console.log(`  ${area.study_area}: ${area.correct_unique_count}/50 (${tierNames[area.badge_tier]})`);
      });
    }

    console.log('\n🍷 Visit /learn/mastery to see your new badges!');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

// Run the script
giveMasteryBadges();
