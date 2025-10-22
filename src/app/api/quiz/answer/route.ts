import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { recomputeBadges } from '@/lib/badges/events';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, question_id, study_area, user_choice, correct_answer } = body;
    
    if (!user_id || !question_id || !study_area || !user_choice || !correct_answer) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    const is_correct = user_choice === correct_answer;
    
    // Use service client for API routes
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { error } = await supabase
      .from('user_quiz_progress')
      .insert({ user_id, question_id, study_area, is_correct });
    
    // Ignore duplicate key errors (user already answered this question)
    if (error && error.code !== '23505') {
      console.error('Database error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    // Recompute badges after quiz progress update
    try {
      await recomputeBadges(user_id);
    } catch (badgeError) {
      console.error('Badge recomputation error:', badgeError);
      // Don't fail the request if badge recomputation fails
    }
    
    return NextResponse.json({ is_correct });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
