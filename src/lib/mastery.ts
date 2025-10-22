import { UserStudyMastery, StudyArea } from './types';

export async function getUserMastery(user_id: string): Promise<UserStudyMastery[]> {
  // Use API route instead of direct database access
  const response = await fetch(`/api/mastery?user_id=${user_id}`);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch user mastery');
  }
  
  return data.items || [];
}

export function getMasteryColor(value: number): string {
  if (value >= 40) return 'text-green-600'; // Green for Maestro
  if (value >= 30) return 'text-yellow-600'; // Yellow for Esperto
  if (value >= 20) return 'text-orange-600'; // Orange for Conoscitore
  if (value >= 10) return 'text-pink-600'; // Pink for Degustatore
  return 'text-red-600'; // Red for Apprendista
}

export function getBadgeTierName(tier: number): string {
  switch (tier) {
    case 5: return 'Maestro di Vino';
    case 4: return 'Esperto';
    case 3: return 'Conoscitore';
    case 2: return 'Degustatore';
    default: return 'Apprendista';
  }
}

export function getMasteryProgressColor(value: number): string {
  if (value >= 40) return 'from-green-400 to-green-600';
  if (value >= 30) return 'from-yellow-400 to-yellow-600';
  if (value >= 20) return 'from-orange-400 to-orange-600';
  if (value >= 10) return 'from-pink-400 to-pink-600';
  return 'from-red-400 to-red-600';
}
