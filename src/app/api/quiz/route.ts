import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const study = url.searchParams.get('study_area') ?? 'Grapes';
    const type = url.searchParams.get('type') ?? 'pop';
    const limit = type === 'pop' ? 5 : 10;
    const usedQuestions = url.searchParams.get('used_questions') ?? '';
    
    // Parse used question IDs to avoid duplicates
    const usedQuestionIds = usedQuestions ? usedQuestions.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
    
    // Use service client for API routes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Build query with exclusion of used questions
    let query = supabase
      .from('wine_quiz')
      .select('*');
    
    // For pop quizzes, get questions from ALL categories, not just one
    // For Sip & Learn, get questions from the specific study area
    if (type === 'pop') {
      // Pop quiz gets questions from ALL categories - no filter needed
    } else {
      // Sip & Learn gets questions from specific study area
      query = query.eq('study_area', study);
    }
    
    // Exclude already used questions if any
    if (usedQuestionIds.length > 0) {
      query = query.not('question_id', 'in', `(${usedQuestionIds.join(',')})`);
    }
    
    // Get ALL questions for the study area, no ordering bias
    const { data, error } = await query;
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Shuffle the questions at the API level to ensure different order each time
    const shuffledData = [...(data || [])];
    for (let i = shuffledData.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledData[i], shuffledData[j]] = [shuffledData[j], shuffledData[i]];
    }
    
    const sourceDescription = type === 'pop' ? 'ALL categories' : `study_area=${study}`;
    console.log(`Quiz API: Found ${shuffledData?.length || 0} questions from ${sourceDescription}, type=${type}, usedQuestions=${usedQuestions}`);
    console.log('Question IDs being returned (shuffled):', shuffledData?.slice(0, 20).map(q => q.question_id) || []);
    
    return NextResponse.json({ items: shuffledData || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
