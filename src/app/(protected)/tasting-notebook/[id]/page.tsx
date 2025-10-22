import { getTastingNote } from "../_actions";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, MapPin, DollarSign, Wine } from "lucide-react";

export default async function NoteDetail({ 
  params 
}: { 
  params: Promise<{ id: string }>
}) {
  const { id } = await params;
  const note = await getTastingNote(Number(id));

  if (!note) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Note Not Found</h1>
          <p className="text-gray-600 mb-6">The tasting note you're looking for doesn't exist or you don't have permission to view it.</p>
          <Link href="/tasting-notebook">
            <Button className="bg-amber-600 hover:bg-amber-700 text-white">
              Back to Notebook
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderRating = (rating: number | null) => {
    if (!rating) return "Not rated";
    
    const fullBottles = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;
    
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={`text-2xl ${
              i < fullBottles
                ? "text-amber-500"
                : i === fullBottles && hasHalf
                ? "text-amber-300"
                : "text-gray-300"
            }`}
          >
            🍷
          </span>
        ))}
        <span className="ml-2 text-lg font-medium text-gray-700">
          {rating.toFixed(1)} / 5
        </span>
      </div>
    );
  };

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
          {formatDate(note.tasting_date)}
        </div>
      </div>

      {/* Wine Info */}
      <div className="bg-white border border-amber-200 rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">
          {note.wine_name || "Untitled Wine"}
        </h1>
        <div className="text-xl text-gray-600 mb-4">
          {note.producer || "Unknown Producer"}
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Vintage:</span>
            <span className="font-medium">{note.vintage || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Wine className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Grapes:</span>
            <span className="font-medium">{note.grapes || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Alcohol:</span>
            <span className="font-medium">{note.alcohol_pct || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Price:</span>
            <span className="font-medium">{note.price ? `$${note.price}` : "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Bottle Size:</span>
            <span className="font-medium">{note.bottle_size || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Bubbly:</span>
            <span className="font-medium">{note.is_bubbly ? "Yes" : "No"}</span>
          </div>
          {note.location && (
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              <span className="text-gray-600">Location:</span>
              <span className="font-medium">{note.location}</span>
            </div>
          )}
        </div>

        {(note.drink_starting || note.drink_by) && (
          <div className="mt-4 pt-4 border-t border-amber-100">
            <div className="text-sm text-gray-600 mb-2">Drink Window:</div>
            <div className="flex gap-4 text-sm">
              {note.drink_starting && (
                <div>
                  <span className="text-gray-600">Starting:</span>
                  <span className="ml-1 font-medium">{note.drink_starting}</span>
                </div>
              )}
              {note.drink_by && (
                <div>
                  <span className="text-gray-600">By:</span>
                  <span className="ml-1 font-medium">{note.drink_by}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Appearance */}
      {note.appearance_color && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">Appearance</h2>
          <div className="text-gray-700">
            <span className="font-medium">Color:</span> {note.appearance_color}
          </div>
        </div>
      )}

      {/* Aroma */}
      {note.aroma_tags && note.aroma_tags.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">Aroma</h2>
          <div className="flex flex-wrap gap-2">
            {note.aroma_tags.map((aroma, index) => (
              <span
                key={index}
                className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm"
              >
                {aroma}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Palate */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-amber-900 mb-4">Palate</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {note.sweetness && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Sweetness:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-amber-500 rounded-full" 
                    style={{ width: `${(note.sweetness / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-6">{note.sweetness}</span>
              </div>
            </div>
          )}
          {note.acidity && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Acidity:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-amber-500 rounded-full" 
                    style={{ width: `${(note.acidity / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-6">{note.acidity}</span>
              </div>
            </div>
          )}
          {note.body && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Body:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-amber-500 rounded-full" 
                    style={{ width: `${(note.body / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-6">{note.body}</span>
              </div>
            </div>
          )}
          {note.tannin && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Tannin:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-amber-500 rounded-full" 
                    style={{ width: `${(note.tannin / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-6">{note.tannin}</span>
              </div>
            </div>
          )}
          {note.oak && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Oak:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-amber-500 rounded-full" 
                    style={{ width: `${(note.oak / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-6">{note.oak}</span>
              </div>
            </div>
          )}
          {note.old_world_bias && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Old World Bias:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-amber-500 rounded-full" 
                    style={{ width: `${(note.old_world_bias / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-6">{note.old_world_bias}</span>
              </div>
            </div>
          )}
          {note.finish_len && (
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Finish Length:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-2 bg-amber-500 rounded-full" 
                    style={{ width: `${(note.finish_len / 10) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium w-6">{note.finish_len}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rating */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-amber-900 mb-3">Rating</h2>
        {renderRating(note.rating_bottles)}
      </div>

      {/* Notes */}
      {note.my_notes && (
        <div className="bg-white border border-amber-200 rounded-2xl p-5">
          <h2 className="text-lg font-semibold text-amber-900 mb-3">My Notes</h2>
          <div className="text-gray-700 whitespace-pre-wrap">
            {note.my_notes}
          </div>
        </div>
      )}
    </div>
  );
}
