import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getTastingNotes } from "./_actions";
import { DeleteButton } from "./_components/DeleteButton";
import { RatingDisplay } from "./_components/RatingDisplay";

export const dynamic = "force-dynamic";

export default async function NotebookPage({ 
  searchParams 
}: { 
  searchParams: { q?: string; min?: string; max?: string }
}) {
  const q = (searchParams.q ?? "").trim();
  const notes = await getTastingNotes(q);

  return (
    <div className="min-h-screen bg-[url('/background_02.jpg')] bg-cover bg-center bg-no-repeat relative">
      {/* 50% fade overlay */}
      <div className="absolute inset-0 bg-white/50"></div>
      
      {/* Content with proper layering */}
      <div className="relative z-10 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-amber-900">My Tasting Notebook</h1>
        <Link href="/tasting-notebook/new">
          <Button className="bg-amber-600 hover:bg-amber-700 text-white">
            Add Tasting Note
          </Button>
        </Link>
      </div>

      <form className="flex gap-3">
        <Input 
          name="q" 
          placeholder="Search by wine, producer, or notes…" 
          defaultValue={q}
          className="flex-1"
        />
        <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
          Search
        </Button>
      </form>

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-amber-600 text-lg mb-2">No tasting notes yet</div>
          <p className="text-gray-600 mb-4">Start building your wine knowledge by adding your first tasting note!</p>
          <Link href="/tasting-notebook/new">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              Add Your First Note
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => (
            <div 
              key={note.note_id} 
              className="rounded-2xl border border-amber-200 bg-white p-4 hover:shadow-lg hover:border-amber-300 transition-all duration-200 relative"
            >
              {/* Delete Button */}
              <div className="absolute top-2 right-2 z-10">
                <DeleteButton 
                  noteId={note.note_id} 
                  noteTitle={note.wine_name || "Untitled Wine"}
                />
              </div>
              
              {/* Clickable Content */}
              <Link 
                href={`/tasting-notebook/${note.note_id}`} 
                className="block"
              >
                <div className="text-sm text-amber-600 mb-1">
                  {new Date(note.tasting_date).toLocaleDateString()}
                </div>
                <div className="font-medium text-gray-900 mb-1">
                  {note.wine_name || "Untitled Wine"}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {note.producer || "Unknown Producer"}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm text-gray-500">Rating:</span>
                  <RatingDisplay rating={Number(note.rating_bottles ?? 0)} />
                  <span className="text-sm text-gray-600 ml-1">
                    {Number(note.rating_bottles ?? 0).toFixed(1)}
                  </span>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
