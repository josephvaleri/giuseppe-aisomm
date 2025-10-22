'use client';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MasteryGauge from './MasteryGauge';
import { getBadgeTierName, getMasteryColor } from '@/lib/mastery';
import { supabaseBrowser } from '@/lib/supabase-browser';

interface MasteryData {
  count: number;
  tier: number;
}

const STUDY_AREAS = [
  'Regions & Appellations',
  'Grapes', 
  'Styles',
  'Pairings',
  'Classifications'
] as const;

export default function MasteryGrid() {
  const [masteryData, setMasteryData] = useState<Record<string, MasteryData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = supabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsLoading(false);
          return;
        }
        
        setUser(user);
        
        // Fetch mastery data using API route
        const response = await fetch(`/api/mastery?user_id=${user.id}`);
        const { items: data } = await response.json();

        // Create a map of study areas to mastery data
        const masteryMap: Record<string, MasteryData> = {};
        (data || []).forEach((row: any) => {
          masteryMap[row.study_area] = {
            count: row.correct_unique_count,
            tier: row.badge_tier
          };
        });

        // Fill in missing areas with default values
        STUDY_AREAS.forEach(area => {
          if (!masteryMap[area]) {
            masteryMap[area] = { count: 0, tier: 1 };
          }
        });

        setMasteryData(masteryMap);
      } catch (error) {
        console.error('Failed to fetch mastery data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your mastery progress...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Please log in</h2>
        <p className="text-muted-foreground">You need to be logged in to view your mastery progress.</p>
      </div>
    );
  }
  const studyAreas = [
    { key: 'Regions & Appellations', color: 'from-blue-500 to-blue-600' },
    { key: 'Grapes', color: 'from-purple-500 to-purple-600' },
    { key: 'Styles', color: 'from-red-500 to-red-600' },
    { key: 'Pairings', color: 'from-green-500 to-green-600' },
    { key: 'Classifications', color: 'from-yellow-500 to-yellow-600' }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
      {studyAreas.map((area, index) => {
        const data = masteryData[area.key];
        const badgeName = getBadgeTierName(data.tier);
        const textColor = getMasteryColor(data.count);

        return (
          <motion.div
            key={area.key}
            className="px-3 pt-3 pb-2 rounded-2xl bg-white shadow-lg border border-gray-100 hover:shadow-xl transition-shadow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
          >
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-1 text-center leading-tight">
                {area.key}
              </h3>
              
              <div className="mb-2">
                <MasteryGauge value={data.count} />
              </div>
              
              <div className="space-y-1">
                <div className={`text-sm font-medium ${textColor}`}>
                  {data.count}/50
                </div>
                <div className="text-xs text-gray-600 font-medium">
                  {badgeName}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
