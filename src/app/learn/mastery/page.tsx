import MasteryGrid from './components/MasteryGrid';

const STUDY_AREAS = [
  'Regions & Appellations',
  'Grapes', 
  'Styles',
  'Pairings',
  'Classifications'
] as const;

export default async function MasteryPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-amber-50/30 to-orange-50/20">
      <div className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-amber-900 mb-6">Subject Mastery</h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Track your progress across different wine knowledge areas
          </p>
        </div>
        
        <MasteryGrid />
      </div>
    </main>
  );
}
