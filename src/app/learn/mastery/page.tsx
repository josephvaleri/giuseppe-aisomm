import MasteryGrid from './components/MasteryGrid';
import BadgeCard from '@/components/badges/BadgeCard';
import { createClient } from '@/lib/supabase/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const STUDY_AREAS = [
  'Regions and Appellations',
  'Grapes', 
  'Styles',
  'Pairings',
  'Classifications'
] as const;

export default async function MasteryPage() {
  const supabase = await createClient();

  const [{ data: defs }, { data: tiers }, { data: mine }] = await Promise.all([
    supabase.from("badges").select("*").order("category"),
    supabase.from("badge_tiers").select("*"),
    supabase.from("user_badges").select("*")
  ]);

  const tiersByCode: Record<string, any[]> = {};
  (tiers || []).forEach((t: any) => {
    (tiersByCode[t.badge_code] ||= []).push(t);
  });
  Object.values(tiersByCode).forEach(arr => arr.sort((a: any, b: any) => a.threshold - b.threshold));

  const mineByCode: Record<string, any> = {};
  (mine || []).forEach((ub: any) => { mineByCode[ub.badge_code] = ub; });

  const milestones = (defs || []).filter((d: any) => !d.is_tiered);
  const tiered = (defs || []).filter((d: any) => d.is_tiered);

  return (
    <main className="min-h-screen bg-[url('/Background_03.jpg')] bg-cover bg-center bg-no-repeat relative">
      {/* 40% blur effect */}
      <div className="absolute inset-0 backdrop-blur-[4px]"></div>
      
      {/* Content with proper layering */}
      <div className="relative z-10 container mx-auto px-6 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-amber-900 mb-6">My Awards</h1>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Track your progress across different wine knowledge areas and earn badges
          </p>
        </div>
        
        <Tabs defaultValue="badges" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 max-w-md mx-auto">
            <TabsTrigger value="badges" className="text-sm py-2">
              🏆 Badges & Milestones
            </TabsTrigger>
            <TabsTrigger value="mastery" className="text-sm py-2">
              📊 Subject Mastery
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="badges" className="space-y-12">
            {/* Milestones Section */}
            <section>
              <h2 className="text-3xl font-bold text-amber-900 mb-8 text-center">Milestones</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {milestones.map((b: any) => (
                  <BadgeCard
                    key={b.badge_code}
                    def={b}
                    tiers={[]}
                    progress={mineByCode[b.badge_code] || null}
                    milestoneVibeMap={{
                      LA_PRIMA_BOTTIGLIA: '"The journey begins..."',
                      WINE_TIME_TRAVELER: '"Respect for the ancients."',
                      POLYGLOT_PALATE: '"You taste the world."',
                    }}
                  />
                ))}
              </div>
            </section>

            {/* Progress Badges Section */}
            <section>
              <h2 className="text-3xl font-bold text-amber-900 mb-8 text-center">Progress Badges</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tiered.map((b: any) => (
                  <BadgeCard
                    key={b.badge_code}
                    def={b}
                    tiers={tiersByCode[b.badge_code] || []}
                    progress={mineByCode[b.badge_code] || null}
                  />
                ))}
              </div>
            </section>
          </TabsContent>
          
          <TabsContent value="mastery">
            <section>
              <h2 className="text-3xl font-bold text-amber-900 mb-8 text-center">Subject Mastery</h2>
              <MasteryGrid />
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
