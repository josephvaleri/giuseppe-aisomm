import { getTastingNote } from "../_actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { EditNoteForm } from "../_components/EditNoteForm";
import { createClient } from "@/lib/supabase/server";

export default async function NoteDetail({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const note = await getTastingNote(Number(id));

  // Load countries and user profile for edit form
  const supabase = await createClient();
  
  // Get countries data
  const { data: countriesData } = await supabase
    .from('countries_regions')
    .select('country_id, country_name')
    .order('country_name');

  // Get unique countries
  const countries = countriesData?.reduce((acc: any[], item: any) => {
    if (!acc.find(c => c.country_id === item.country_id)) {
      acc.push({
        country_id: item.country_id,
        country_name: item.country_name
      });
    }
    return acc;
  }, []) || [];

  // Get user profile taste preferences
  const { data: { user } } = await supabase.auth.getUser();
  let userProfile = null;
  
  if (user) {
    const { data: tasteData } = await supabase
      .from('profile_taste_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    userProfile = tasteData;
  }

  // Get regions for the current note's country
  let regions = [];
  if (note.country_id) {
    const { data: regionsData } = await supabase
      .from('countries_regions')
      .select('region_id, wine_region')
      .eq('country_id', note.country_id)
      .order('wine_region');
    
    regions = regionsData || [];
  }

  if (!note) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Note Not Found</h1>
          <p className="text-gray-600 mb-6">The tasting note you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link href="/tasting-notebook">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              Back to Tasting Notebook
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/tasting-notebook">
          <Button variant="outline" className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Notebook
          </Button>
        </Link>
        <div className="text-sm text-amber-600">
          {new Date(note.tasting_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </div>
      </div>

      {/* Edit Form */}
      <EditNoteForm 
        note={note} 
        countries={countries} 
        regions={regions} 
        userProfile={userProfile}
      />
    </div>
  );
}