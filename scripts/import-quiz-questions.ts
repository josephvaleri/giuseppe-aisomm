import { createClient } from '@supabase/supabase-js';
import { parse } from 'papaparse';
import { readFileSync } from 'fs';
import { join } from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Supabase client with service role key for admin operations
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface QuizQuestion {
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  incorrect_answer: string;
  study_area: string;
}

async function importQuizQuestions() {
  try {
    console.log('Starting quiz questions import...');
    
    // Read the CSV file
    const csvPath = join(process.cwd(), 'content', 'giuseppe_fun_quiz_questions_with_theme_and_d.csv');
    const csvContent = readFileSync(csvPath, 'utf-8');
    
    // Parse CSV
    const { data, errors } = parse<QuizQuestion>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });
    
    if (errors.length > 0) {
      console.error('CSV parsing errors:', errors);
      return;
    }
    
    console.log(`Found ${data.length} questions to import`);
    
    // Transform data to match database schema
    const questionsToInsert = data.map((row, index) => ({
      study_area: row.study_area,
      question: row.question,
      answer_a: row.option_a,
      answer_b: row.option_b,
      answer_c: row.option_c,
      answer_d: row.option_d,
      correct_answer: row.correct_answer,
      incorrect_answer_response: row.incorrect_answer,
      upvotes: 0,
      downvotes: 0,
    }));
    
    // Insert in batches to avoid overwhelming the database
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < questionsToInsert.length; i += batchSize) {
      const batch = questionsToInsert.slice(i, i + batchSize);
      
      const { data: insertData, error } = await supabase
        .from('wine_quiz')
        .insert(batch)
        .select('question_id');
      
      if (error) {
        console.error(`Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error);
        continue;
      }
      
      inserted += insertData?.length || 0;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}: ${insertData?.length || 0} questions`);
    }
    
    console.log(`✅ Successfully imported ${inserted} quiz questions!`);
    
    // Show summary by study area
    const { data: summary } = await supabase
      .from('wine_quiz')
      .select('study_area')
      .order('study_area');
    
    if (summary) {
      const areaCounts = summary.reduce((acc, item) => {
        acc[item.study_area] = (acc[item.study_area] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n📊 Questions by study area:');
      Object.entries(areaCounts).forEach(([area, count]) => {
        console.log(`  ${area}: ${count} questions`);
      });
    }
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

// Run the import
importQuizQuestions();
