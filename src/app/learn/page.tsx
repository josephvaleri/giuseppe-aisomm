import LearnWineIntro from './components/LearnWineIntro';
import QuizTypeSelector from './components/QuizTypeSelector';
import Link from 'next/link';

export default async function LearnPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50/30 to-orange-50/20">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="space-y-12">
          <LearnWineIntro />
          <QuizTypeSelector />
          
          {/* Giuseppe's additional explanation */}
          <section className="max-w-5xl mx-auto text-center space-y-6">
            <p className="text-muted-foreground text-lg leading-relaxed px-4">
              Ah, this is the part I love — learning about wine without the boring lectures. Here, you'll find two kinds of quizzes:
            </p>
            
            <div className="bg-white/80 backdrop-blur-sm border border-amber-200 rounded-3xl p-8 space-y-4 shadow-lg">
              <h3 className="text-2xl font-semibold text-amber-900">Earn Rewards</h3>
              <p className="text-muted-foreground leading-relaxed text-lg">
                As you play, you'll earn badges for your progress and you can see your{' '}
                <Link 
                  href="/learn/mastery" 
                  className="text-amber-700 hover:text-amber-800 font-medium underline decoration-2 underline-offset-2 hover:decoration-amber-600 transition-colors"
                >
                  Mastery Gauges
                </Link>{' '}
                fill up like a fine glass.
              </p>
            </div>
            
            <p className="text-muted-foreground text-xl leading-relaxed font-medium px-4">
              So, shall we begin? Choose your quiz, and let's make your next glass even more delicious.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
