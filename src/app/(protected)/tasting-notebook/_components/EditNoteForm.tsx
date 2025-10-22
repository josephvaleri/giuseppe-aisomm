"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { WineGlassRating } from "@/components/ui/wine-glass-rating";
import { Edit3, Save, X, Calendar, MapPin, DollarSign, Wine } from "lucide-react";
import { updateTastingNote } from "../_actions";
import { type TastingNoteInput } from "../schemas";
import { useRouter } from "next/navigation";

interface EditNoteFormProps {
  note: any;
  countries: any[];
  regions: any[];
  userProfile: any;
}

const COLOR_GUIDE = [
  "Water White","Lemon Green","Lemon","Gold","Amber",
  "Pale Salmon","Salmon","Pink","Ruby","Garnet","Tawny","Mahogany","Opaque Purple","Deep Inky"
];

const DEFAULT_AROMAS = [
  "Citrus","Green Apple","Stone Fruit","Tropical","Red Berry","Blackberry","Blackcurrant","Cherry","Plum","Dried Fruit","Floral","Violet","Rose","Herbal","Mint","Eucalyptus","Vegetal","Bell Pepper","Savory","Meaty","Spice","Black Pepper","Clove","Cinnamon","Vanilla","Oak","Smoke","Toast","Coffee","Chocolate","Cocoa","Nutty","Honey","Mineral","Saline","Petrol","Earth","Mushroom","Leather","Tobacco"
];

export function EditNoteForm({ note, countries, regions, userProfile }: EditNoteFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [input, setInput] = useState<TastingNoteInput>({
    wine_name: note.wine_name || "",
    producer: note.producer || "",
    grapes: note.grapes || "",
    vintage: note.vintage || "",
    alcohol_pct: note.alcohol_pct || "",
    country_id: note.country_id || "",
    region_id: note.region_id || undefined,
    price: note.price || undefined,
    my_notes: note.my_notes || "",
    drink_starting: note.drink_starting || "",
    drink_by: note.drink_by || "",
    bottle_size: note.bottle_size || "",
    is_bubbly: note.is_bubbly || false,
    appearance_color: note.appearance_color || "",
    aroma_tags: note.aroma_tags || [],
    sweetness: note.sweetness || 5,
    acidity: note.acidity || 5,
    body: note.body || 5,
    tannin: note.tannin || 5,
    oak: note.oak || 5,
    old_world_bias: note.old_world_bias || 5,
    finish_len: note.finish_len || 5,
    rating_bottles: note.rating_bottles || 0,
    add_to_cellar: false,
    add_to_cellar_qty: 1,
    location: note.location || "",
  });

  const [filteredRegions, setFilteredRegions] = useState(regions);

  // Initialize filtered regions when component mounts or regions prop changes
  useEffect(() => {
    setFilteredRegions(regions);
  }, [regions]);
  const router = useRouter();

  const handleCountryChange = async (countryId: string) => {
    setInput(prev => ({ ...prev, country_id: countryId, region_id: undefined }));
    
    try {
      const response = await fetch(`/api/countries-regions?country_id=${countryId}`);
      if (response.ok) {
        const data = await response.json();
        const uniqueRegions = data.reduce((acc: any[], item: any) => {
          if (!acc.find(r => r.region_id === item.region_id)) {
            acc.push({
              region_id: item.region_id,
              wine_region: item.wine_region
            });
          }
          return acc;
        }, []);
        setFilteredRegions(uniqueRegions);
      }
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  };

  const slider = (label: string, key: keyof Pick<TastingNoteInput,'sweetness'|'acidity'|'body'|'tannin'|'oak'|'old_world_bias'|'finish_len'>, left: string, right: string, profileKey?: string) => {
    const profileValue = userProfile && profileKey ? userProfile[profileKey] : null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-700">{label}</div>
          {profileValue && (
            <div className="text-xs text-amber-600 bg-amber-100 px-2 py-1 rounded">
              Your preference: {profileValue}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500 w-24">{left}</span>
          <Slider 
            value={[Number(input[key] ?? 5)]} 
            min={1} 
            max={10} 
            step={1} 
            onValueChange={v => setInput(s => ({...s, [key]: v[0]}))}
            className="flex-1"
            disabled={!isEditing}
          />
          <span className="text-xs text-gray-500 w-24 text-right">{right}</span>
        </div>
      </div>
    );
  };

  const toggleAroma = (a: string) => {
    setInput(s => {
      const set = new Set(s.aroma_tags ?? []);
      set.has(a) ? set.delete(a) : set.add(a);
      return { ...s, aroma_tags: Array.from(set) };
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateTastingNote(note.note_id, input);
      setIsEditing(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating tasting note:", error);
      alert("Failed to update tasting note. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset to original values
    setInput({
      wine_name: note.wine_name || "",
      producer: note.producer || "",
      grapes: note.grapes || "",
      vintage: note.vintage || "",
      alcohol_pct: note.alcohol_pct || "",
      country_id: note.country_id || "",
      region_id: note.region_id || undefined,
      price: note.price || undefined,
      my_notes: note.my_notes || "",
      drink_starting: note.drink_starting || "",
      drink_by: note.drink_by || "",
      bottle_size: note.bottle_size || "",
      is_bubbly: note.is_bubbly || false,
      appearance_color: note.appearance_color || "",
      aroma_tags: note.aroma_tags || [],
      sweetness: note.sweetness || 5,
      acidity: note.acidity || 5,
      body: note.body || 5,
      tannin: note.tannin || 5,
      oak: note.oak || 5,
      old_world_bias: note.old_world_bias || 5,
      finish_len: note.finish_len || 5,
      rating_bottles: note.rating_bottles || 0,
      add_to_cellar: false,
      add_to_cellar_qty: 1,
      location: note.location || "",
    });
  };

  return (
    <div className="space-y-6">
      {/* Edit Button */}
      <div className="flex justify-end">
        {!isEditing ? (
          <Button
            onClick={() => setIsEditing(true)}
            variant="outline"
            className="text-amber-600 border-amber-600 hover:bg-amber-50"
          >
            <Edit3 className="w-4 h-4 mr-2" />
            Edit Note
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleCancel}
              variant="outline"
              disabled={isSaving}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </div>

      {/* Wine Info */}
      <div className="bg-white border border-amber-200 rounded-2xl p-6">
        <h1 className="text-3xl font-bold text-amber-900 mb-2">
          {isEditing ? (
            <Input 
              value={input.wine_name} 
              onChange={e => setInput({...input, wine_name: e.target.value})}
              placeholder="Wine Name"
              className="text-3xl font-bold border-none shadow-none p-0 h-auto"
            />
          ) : (
            note.wine_name || "Untitled Wine"
          )}
        </h1>
        <div className="text-xl text-gray-600 mb-4">
          {isEditing ? (
            <Input 
              value={input.producer} 
              onChange={e => setInput({...input, producer: e.target.value})}
              placeholder="Producer"
              className="text-xl border-none shadow-none p-0 h-auto"
            />
          ) : (
            note.producer || "Unknown Producer"
          )}
        </div>
        
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Vintage:</span>
            <span className="font-medium">
              {isEditing ? (
                <Input 
                  value={input.vintage} 
                  onChange={e => setInput({...input, vintage: e.target.value})}
                  placeholder="Vintage"
                  className="w-20 h-6 text-sm"
                />
              ) : (
                note.vintage || "-"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Wine className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Grapes:</span>
            <span className="font-medium">
              {isEditing ? (
                <Input 
                  value={input.grapes} 
                  onChange={e => setInput({...input, grapes: e.target.value})}
                  placeholder="Grapes"
                  className="flex-1 h-6 text-sm"
                />
              ) : (
                note.grapes || "-"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Alcohol:</span>
            <span className="font-medium">
              {isEditing ? (
                <Input 
                  value={input.alcohol_pct} 
                  onChange={e => setInput({...input, alcohol_pct: e.target.value})}
                  placeholder="Alcohol %"
                  className="w-20 h-6 text-sm"
                />
              ) : (
                note.alcohol_pct || "-"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Price:</span>
            <span className="font-medium">
              {isEditing ? (
                <Input 
                  value={input.price?.toString() || ""} 
                  onChange={e => setInput({...input, price: e.target.value ? Number(e.target.value) : undefined})}
                  placeholder="Price"
                  type="number"
                  className="w-20 h-6 text-sm"
                />
              ) : (
                note.price ? `$${note.price}` : "-"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Country:</span>
            <span className="font-medium">
              {isEditing ? (
                <Select 
                  value={input.country_id || ""} 
                  onValueChange={handleCountryChange}
                >
                  <SelectTrigger className="w-40 h-6 text-sm">
                    <SelectValue placeholder="Select Country"/>
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map(country => (
                      <SelectItem key={country.country_id} value={country.country_id}>
                        {country.country_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                countries.find(c => c.country_id === note.country_id)?.country_name || "-"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Region:</span>
            <span className="font-medium">
              {isEditing ? (
                <Select 
                  value={input.region_id?.toString() || ""} 
                  onValueChange={(v) => setInput({...input, region_id: v ? Number(v) : undefined})}
                  disabled={!input.country_id}
                >
                  <SelectTrigger className="w-40 h-6 text-sm">
                    <SelectValue placeholder="Select Region"/>
                  </SelectTrigger>
                  <SelectContent>
                    {filteredRegions.map(region => (
                      <SelectItem key={region.region_id} value={region.region_id.toString()}>
                        {region.wine_region}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                filteredRegions.find(r => r.region_id === note.region_id)?.wine_region || "-"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Bottle Size:</span>
            <span className="font-medium">
              {isEditing ? (
                <Input 
                  value={input.bottle_size} 
                  onChange={e => setInput({...input, bottle_size: e.target.value})}
                  placeholder="Bottle Size"
                  className="w-24 h-6 text-sm"
                />
              ) : (
                note.bottle_size || "-"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Is Bubbly:</span>
            <span className="font-medium">
              {isEditing ? (
                <Checkbox 
                  checked={input.is_bubbly} 
                  onCheckedChange={v => setInput({...input, is_bubbly: !!v})}
                />
              ) : (
                note.is_bubbly ? "Yes" : "No"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Drink Starting:</span>
            <span className="font-medium">
              {isEditing ? (
                <Input 
                  value={input.drink_starting} 
                  onChange={e => setInput({...input, drink_starting: e.target.value})}
                  placeholder="Drink Starting"
                  className="w-24 h-6 text-sm"
                />
              ) : (
                note.drink_starting || "-"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-600">Drink By:</span>
            <span className="font-medium">
              {isEditing ? (
                <Input 
                  value={input.drink_by} 
                  onChange={e => setInput({...input, drink_by: e.target.value})}
                  placeholder="Drink By"
                  className="w-24 h-6 text-sm"
                />
              ) : (
                note.drink_by || "-"
              )}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            <span className="text-gray-600">Location:</span>
            <span className="font-medium">
              {isEditing ? (
                <Input 
                  value={input.location} 
                  onChange={e => setInput({...input, location: e.target.value})}
                  placeholder="Location"
                  className="flex-1 h-6 text-sm"
                />
              ) : (
                note.location || "-"
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Palate Section */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-5">
        <h2 className="text-lg font-semibold text-amber-900">Palate</h2>
        {isEditing ? (
          <>
            {slider("Sweetness","sweetness","Extra Dry","Very Sweet","sweetness")}
            {slider("Acidity","acidity","No acidity","High acidity","acidity")}
            {slider("Body","body","Light","Bold","body")}
            {slider("Tannins","tannin","Easy Drinking","Puckering","tannin")}
            {slider("Oak","oak","No oak","Bit an oak tree","oak")}
            {slider("Old World Bias","old_world_bias","New World","Old World Favorite","old_world_bias")}
            {slider("Finish","finish_len","Short as a cork","Long as a vineyard")}
          </>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Sweetness:</span>
              <span className="font-medium">{note.sweetness}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Acidity:</span>
              <span className="font-medium">{note.acidity}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Body:</span>
              <span className="font-medium">{note.body}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tannins:</span>
              <span className="font-medium">{note.tannin}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Oak:</span>
              <span className="font-medium">{note.oak}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Old World Bias:</span>
              <span className="font-medium">{note.old_world_bias}/10</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Finish Length:</span>
              <span className="font-medium">{note.finish_len}/10</span>
            </div>
          </div>
        )}
      </div>

      {/* Rating Section */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-lg font-semibold text-amber-900">Rating</h2>
        <div className="flex items-center gap-4">
          {isEditing ? (
            <WineGlassRating 
              rating={input.rating_bottles || 0}
              onRatingChange={(rating) => setInput({...input, rating_bottles: rating})}
              maxRating={5}
              size="lg"
              interactive={true}
            />
          ) : (
            <WineGlassRating 
              rating={note.rating_bottles || 0}
              onRatingChange={() => {}}
              maxRating={5}
              size="lg"
              interactive={false}
            />
          )}
        </div>
      </div>

      {/* Appearance Section */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-lg font-semibold text-amber-900">Appearance</h2>
        {isEditing ? (
          <div className="space-y-2">
            <Select 
              value={input.appearance_color || ""} 
              onValueChange={(v)=>setInput({...input, appearance_color:v})}
            >
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Color (lightest → darkest)"/>
              </SelectTrigger>
              <SelectContent>
                {COLOR_GUIDE.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div>
            <span className="text-gray-600">Color: </span>
            <span className="font-medium">{note.appearance_color || "Not specified"}</span>
          </div>
        )}
      </div>

      {/* Aroma Section */}
      <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3">
        <h2 className="text-lg font-semibold text-amber-900">Aroma</h2>
        {isEditing ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {DEFAULT_AROMAS.map(a => (
              <label key={a} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-amber-100/50 p-1 rounded">
                <Checkbox 
                  checked={!!(input.aroma_tags ?? []).includes(a)} 
                  onCheckedChange={()=>toggleAroma(a)} 
                /> 
                {a}
              </label>
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {note.aroma_tags && note.aroma_tags.length > 0 ? (
              note.aroma_tags.map((aroma: string) => (
                <span key={aroma} className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-sm">
                  {aroma}
                </span>
              ))
            ) : (
              <span className="text-gray-500 italic">No aromas selected</span>
            )}
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white border border-amber-200 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-amber-900 mb-3">My Notes</h2>
        {isEditing ? (
          <Textarea 
            value={input.my_notes} 
            onChange={e => setInput({...input, my_notes: e.target.value})}
            placeholder="Share your thoughts about this wine..."
            rows={4}
            className="w-full"
          />
        ) : (
          <p className="text-gray-700 whitespace-pre-wrap">
            {note.my_notes || "No notes added yet."}
          </p>
        )}
      </div>

      {/* Metadata Section */}
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Note Details</h2>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Created:</span>
            <span className="font-medium">
              {new Date(note.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Last Updated:</span>
            <span className="font-medium">
              {new Date(note.updated_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
