"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TastingNoteSchema, type TastingNoteInput } from "../schemas";
import { createTastingNote } from "../_actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { WineGlassRating } from "@/components/ui/wine-glass-rating";
import { motion } from "framer-motion";
import { Camera, Upload, Loader2, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const COLOR_GUIDE = [
  "Water White","Lemon Green","Lemon","Gold","Amber",
  "Pale Salmon","Salmon","Pink","Ruby","Garnet","Tawny","Mahogany","Opaque Purple","Deep Inky"
];

const DEFAULT_AROMAS = [
  "Citrus","Green Apple","Stone Fruit","Tropical","Red Berry","Blackberry","Blackcurrant","Cherry","Plum","Dried Fruit","Floral","Violet","Rose","Herbal","Mint","Eucalyptus","Vegetal","Bell Pepper","Savory","Meaty","Spice","Black Pepper","Clove","Cinnamon","Vanilla","Oak","Smoke","Toast","Coffee","Chocolate","Cocoa","Nutty","Honey","Mineral","Saline","Petrol","Earth","Mushroom","Leather","Tobacco"
];

export default function NewNotePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [hasScannedData, setHasScannedData] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [countries, setCountries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const { toast } = useToast();
  const [input, setInput] = useState<TastingNoteInput>({
    wine_name: "",
    producer: "",
    grapes: "",
    vintage: "",
    alcohol_pct: "",
    country_id: undefined,
    region_id: undefined,
    price: undefined,
    my_notes: "",
    drink_starting: "",
    drink_by: "",
    bottle_size: "",
    is_bubbly: false,
    appearance_color: "",
    aroma_tags: [],
    sweetness: 5, acidity: 5, body: 5, tannin: 5, oak: 5, old_world_bias: 5, finish_len: 5,
    rating_bottles: 0,
    add_to_cellar: false,
    add_to_cellar_qty: 1,
    location: "",
  });

  // Load user profile for palate preferences
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded user profile taste preferences:', data.taste);
          setUserProfile(data.taste); // Access the taste preferences from the response
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    
    loadUserProfile();
  }, []);

  // Load countries data
  useEffect(() => {
    const loadCountries = async () => {
      try {
        console.log('Loading countries...');
        const response = await fetch('/api/countries-regions');
        console.log('Countries response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Countries data received:', data);
          
          // Get unique countries
          const uniqueCountries = data.reduce((acc: any[], item: any) => {
            if (!acc.find(c => c.country_id === item.country_id)) {
              acc.push({
                country_id: item.country_id,
                country_name: item.country_name
              });
            }
            return acc;
          }, []);
          
          console.log('Unique countries processed:', uniqueCountries);
          setCountries(uniqueCountries);
        } else {
          console.error('Failed to fetch countries:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Error loading countries:', error);
      }
    };
    
    loadCountries();
  }, []);

  // Pre-populate from search params (for integration with cellar/label scanner)
  useEffect(() => {
    const wineName = searchParams.get('wine_name');
    const producer = searchParams.get('producer');
    const vintage = searchParams.get('vintage');
    const alcoholPct = searchParams.get('alcohol_pct');
    const countryId = searchParams.get('country_id');
    const regionId = searchParams.get('region_id');
    const bottleSize = searchParams.get('bottle_size');
    const isBubbly = searchParams.get('is_bubbly');

    if (wineName || producer || vintage || alcoholPct || countryId || regionId || bottleSize || isBubbly) {
      setInput(prev => ({
        ...prev,
        wine_name: wineName || prev.wine_name,
        producer: producer || prev.producer,
        vintage: vintage || prev.vintage,
        alcohol_pct: alcoholPct || prev.alcohol_pct,
        country_id: countryId || prev.country_id,
        region_id: regionId ? parseInt(regionId) : prev.region_id,
        bottle_size: bottleSize || prev.bottle_size,
        is_bubbly: isBubbly === 'true' || prev.is_bubbly,
      }));
    }
  }, [searchParams]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      console.log('Submitting tasting note with data:', input);
      TastingNoteSchema.parse(input);
      const id = await createTastingNote(input);
      router.push(`/tasting-notebook/${id}`);
    } catch (error: any) {
      console.error("Error creating tasting note:", error);
      console.error("Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint
      });
      alert(`Error creating tasting note: ${error.message || error.toString()}. Please try again.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const slider = (label:string, key: keyof Pick<TastingNoteInput,'sweetness'|'acidity'|'body'|'tannin'|'oak'|'old_world_bias'|'finish_len'>, left:string, right:string, profileKey?: string) => {
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

  const handleCountryChange = async (countryId: string) => {
    console.log('Country selected:', countryId);
    setInput(prev => ({ ...prev, country_id: countryId, region_id: undefined }));
    
    // Load regions for selected country
    try {
      console.log('Fetching regions for country:', countryId);
      const response = await fetch(`/api/countries-regions?country_id=${countryId}`);
      console.log('Regions response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Regions data received:', data);
        
        // Get unique regions for this country
        const uniqueRegions = data.reduce((acc: any[], item: any) => {
          if (!acc.find(r => r.region_id === item.region_id)) {
            acc.push({
              region_id: item.region_id,
              wine_region: item.wine_region
            });
          }
          return acc;
        }, []);
        
        console.log('Unique regions processed:', uniqueRegions);
        setRegions(uniqueRegions);
      } else {
        console.error('Failed to fetch regions:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Error loading regions:', error);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    // Validate file type and size
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (JPEG, PNG, or WebP)',
        variant: 'destructive'
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      toast({
        title: 'File too large',
        description: 'Image must be less than 10MB',
        variant: 'destructive'
      });
      return;
    }

    setIsScanning(true);

    try {
      // Step 1: Get presigned upload URL
      const presignRes = await fetch('/api/labels/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mimeType: file.type })
      });

      if (!presignRes.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { imageKey, uploadUrl } = await presignRes.json();

      // Step 2: Upload file to Supabase Storage
      const uploadResult = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type }
      });

      if (!uploadResult.ok) {
        throw new Error('Failed to upload image');
      }

      // Step 3: Analyze the image
      const analyzeRes = await fetch('/api/labels/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageKey,
          hint: {
            vintage: input.vintage ? parseInt(input.vintage) : undefined,
            producer: input.producer || undefined,
            wine_name: input.wine_name || undefined
          }
        })
      });

      if (!analyzeRes.ok) {
        throw new Error('Failed to analyze image');
      }

      const result = await analyzeRes.json();

      // Handle different response types from the analyze endpoint
      if (result.type === 'ai_result' && result.wineData) {
        // AI found detailed wine information - use all available data
        const wineData = result.wineData;
        setInput(prev => ({
          ...prev,
          wine_name: wineData.wine_name || prev.wine_name,
          producer: wineData.producer || prev.producer,
          vintage: wineData.vintage?.toString() || prev.vintage,
          alcohol_pct: wineData.alcohol_percent?.toString() || prev.alcohol_pct,
          bottle_size: wineData.bottle_size || prev.bottle_size,
          is_bubbly: wineData.bubbly === 'Yes' || prev.is_bubbly,
          // Additional fields from detailed AI analysis
          grapes: wineData.grapes?.join(', ') || prev.grapes,
          price: wineData.typical_price || prev.price,
          drink_starting: wineData.drink_starting || prev.drink_starting,
          drink_by: wineData.drink_by || prev.drink_by,
          // Set appearance color if available
          appearance_color: wineData.color || prev.appearance_color,
        }));

        setHasScannedData(true);
        
        // Count how many fields were populated
        const populatedFields = [];
        if (wineData.wine_name) populatedFields.push('wine name');
        if (wineData.producer) populatedFields.push('producer');
        if (wineData.vintage) populatedFields.push('vintage');
        if (wineData.alcohol_percent) populatedFields.push('alcohol %');
        if (wineData.grapes?.length) populatedFields.push('grapes');
        if (wineData.typical_price) populatedFields.push('price');
        if (wineData.bottle_size) populatedFields.push('bottle size');
        if (wineData.color) populatedFields.push('color');
        if (wineData.drink_starting) populatedFields.push('drink window');
        
        toast({
          title: 'Label scanned successfully!',
          description: `Detailed wine information populated: ${wineData.producer} ${wineData.wine_name}${wineData.vintage ? ` (${wineData.vintage})` : ''}. ${populatedFields.length} fields auto-filled.`,
        });
      } else if (result.parsed) {
        // Basic parsed information available
        setInput(prev => ({
          ...prev,
          wine_name: result.parsed.wine_name || prev.wine_name,
          producer: result.parsed.producer || prev.producer,
          vintage: result.parsed.vintage || prev.vintage,
          alcohol_pct: result.parsed.alcohol_percent || prev.alcohol_pct,
          bottle_size: result.parsed.bottle_size || prev.bottle_size,
          is_bubbly: result.parsed.bubbly === 'Yes' || prev.is_bubbly,
        }));

        setHasScannedData(true);
        toast({
          title: 'Label scanned successfully!',
          description: 'Wine information has been populated in the form.',
        });
      } else {
        toast({
          title: 'No wine information found',
          description: 'Please try a clearer image or enter the information manually.',
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Label scanning error:', error);
      toast({
        title: 'Scanning failed',
        description: error.message || 'Please try again or enter information manually.',
        variant: 'destructive'
      });
    } finally {
      setIsScanning(false);
      setShowScanner(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-6 space-y-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-amber-900">Add Tasting Note</h1>
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isSubmitting ? "Saving..." : "Save Note"}
        </Button>
      </div>

      {/* Label Scanner Section */}
      <motion.div 
        initial={{opacity:0, y:6}} 
        animate={{opacity:1, y:0}} 
        className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-amber-900">Quick Scan Wine Label</h2>
            {hasScannedData && (
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                ✓ Data populated
              </span>
            )}
          </div>
          {!showScanner && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowScanner(true)}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              <Camera className="w-4 h-4 mr-2" />
              Scan Label
            </Button>
          )}
        </div>
        
        {showScanner && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-amber-700">Upload a photo of the wine label to auto-fill the form</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowScanner(false)}
                className="text-amber-600 hover:text-amber-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                id="file-upload"
                disabled={isScanning}
              />
              <label
                htmlFor="file-upload"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100/50 transition-colors"
              >
                <Upload className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-700">
                  {isScanning ? "Scanning..." : "Choose Image"}
                </span>
              </label>
              
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
                className="hidden"
                id="camera-upload"
                disabled={isScanning}
              />
              <label
                htmlFor="camera-upload"
                className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-amber-300 rounded-lg cursor-pointer hover:bg-amber-100/50 transition-colors"
              >
                <Camera className="w-5 h-5 text-amber-600" />
                <span className="text-sm text-amber-700">
                  {isScanning ? "Scanning..." : "Take Photo"}
                </span>
              </label>
            </div>
            
            {isScanning && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="w-5 h-5 text-amber-600 animate-spin" />
                <span className="text-sm text-amber-700">Analyzing wine label...</span>
              </div>
            )}
            
            <div className="text-xs text-amber-600 leading-tight">
              <strong>Tips:</strong> Good lighting, steady phone, fill frame with label, straight-on view, no glare.
            </div>
          </div>
        )}
      </motion.div>

      {/* Core fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="relative">
          <Input 
            placeholder="Wine Name *" 
            value={input.wine_name} 
            onChange={e=>setInput({...input, wine_name:e.target.value})}
            required
            className={hasScannedData && input.wine_name ? "border-green-300 bg-green-50/30" : ""}
          />
          {hasScannedData && input.wine_name && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
        </div>
        <div className="relative">
          <Input 
            placeholder="Producer" 
            value={input.producer ?? ""} 
            onChange={e=>setInput({...input, producer:e.target.value})}
            className={hasScannedData && input.producer ? "border-green-300 bg-green-50/30" : ""}
          />
          {hasScannedData && input.producer && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
        </div>
        <div className="relative">
          <Input 
            placeholder="Grape(s)" 
            value={input.grapes ?? ""} 
            onChange={e=>setInput({...input, grapes:e.target.value})}
            className={hasScannedData && input.grapes ? "border-green-300 bg-green-50/30" : ""}
          />
          {hasScannedData && input.grapes && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
        </div>
        <div className="relative">
          <Input 
            placeholder="Vintage" 
            value={input.vintage ?? ""} 
            onChange={e=>setInput({...input, vintage:e.target.value})}
            className={hasScannedData && input.vintage ? "border-green-300 bg-green-50/30" : ""}
          />
          {hasScannedData && input.vintage && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
        </div>
        <div className="relative">
          <Select 
            value={input.country_id || ""} 
            onValueChange={handleCountryChange}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder="Select Country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map(country => (
                <SelectItem key={country.country_id} value={country.country_id}>
                  {country.country_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Select 
            value={input.region_id ? input.region_id.toString() : ""} 
            onValueChange={(regionId) => {
              console.log('Region selected:', regionId);
              setInput({...input, region_id: parseInt(regionId)});
            }}
            disabled={!input.country_id}
          >
            <SelectTrigger className="bg-white">
              <SelectValue placeholder={input.country_id ? "Select Region" : "Select country first"} />
            </SelectTrigger>
            <SelectContent>
              {regions.map(region => (
                <SelectItem key={region.region_id} value={region.region_id.toString()}>
                  {region.wine_region}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="relative">
          <Input 
            placeholder="Alcohol %" 
            value={input.alcohol_pct ?? ""} 
            onChange={e=>setInput({...input, alcohol_pct:e.target.value})}
            className={hasScannedData && input.alcohol_pct ? "border-green-300 bg-green-50/30" : ""}
          />
          {hasScannedData && input.alcohol_pct && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
        </div>
        <div className="relative">
          <Input 
            placeholder="Price (USD)" 
            type="number" 
            inputMode="decimal" 
            value={input.price?.toString() ?? ""} 
            onChange={e=>setInput({...input, price: e.target.value ? Number(e.target.value) : undefined})}
            className={hasScannedData && input.price ? "border-green-300 bg-green-50/30" : ""}
          />
          {hasScannedData && input.price && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
        </div>
        <div className="relative">
          <Input 
            placeholder="Bottle size (e.g., 750ml)" 
            value={input.bottle_size ?? ""} 
            onChange={e=>setInput({...input, bottle_size:e.target.value})}
            className={hasScannedData && input.bottle_size ? "border-green-300 bg-green-50/30" : ""}
          />
          {hasScannedData && input.bottle_size && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Checkbox 
            checked={!!input.is_bubbly} 
            onCheckedChange={v => setInput({...input, is_bubbly: !!v})}
          />
          <span className="text-sm">Is Bubbly?</span>
        </div>
        <div className="relative">
          <Input 
            placeholder="Drink starting (e.g., 2026)" 
            value={input.drink_starting ?? ""} 
            onChange={e=>setInput({...input, drink_starting:e.target.value})}
            className={hasScannedData && input.drink_starting ? "border-green-300 bg-green-50/30" : ""}
          />
          {hasScannedData && input.drink_starting && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
        </div>
        <div className="relative">
          <Input 
            placeholder="Drink by (e.g., 2032)" 
            value={input.drink_by ?? ""} 
            onChange={e=>setInput({...input, drink_by:e.target.value})}
            className={hasScannedData && input.drink_by ? "border-green-300 bg-green-50/30" : ""}
          />
          {hasScannedData && input.drink_by && (
            <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
        </div>
      </div>

      {/* Location */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Tasting Location</label>
        <Input 
          placeholder="Where did this tasting take place? (e.g., Restaurant, Home, Winery)" 
          value={input.location ?? ""} 
          onChange={e=>setInput({...input, location:e.target.value})}
        />
      </div>

      {/* Appearance */}
      <motion.div 
        initial={{opacity:0, y:6}} 
        animate={{opacity:1, y:0}} 
        className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-amber-900">Appearance</h2>
          <span className="text-xs text-amber-600">(hover for Wine Color Guide)</span>
        </div>
        <div className="group relative">
          <Select 
            value={input.appearance_color ?? ""} 
            onValueChange={(v)=>setInput({...input, appearance_color:v})}
          >
            <SelectTrigger className={`bg-white ${hasScannedData && input.appearance_color ? "border-green-300 bg-green-50/30" : ""}`}>
              <SelectValue placeholder="Color (lightest → darkest)"/>
            </SelectTrigger>
            <SelectContent>
              {COLOR_GUIDE.map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasScannedData && input.appearance_color && (
            <span className="absolute right-8 top-1/2 transform -translate-y-1/2 text-green-600 text-xs">
              ✓
            </span>
          )}
          {/* Tooltip with illustrative note (no external image included) */}
          <div className="absolute left-0 mt-2 hidden group-hover:block text-xs bg-white border border-amber-200 rounded-lg p-3 shadow-lg w-80 z-10">
            A wine color guide ranges from Water White/Lemon Green → deep Ruby/Garnet/Tawny and into Opaque Purple. Use the dropdown to choose the closest match.
          </div>
        </div>
      </motion.div>

      {/* Aroma */}
      <motion.div 
        initial={{opacity:0, y:6}} 
        animate={{opacity:1, y:0}} 
        className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-3"
      >
        <h2 className="text-lg font-semibold text-amber-900">Aroma</h2>
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
      </motion.div>

      {/* Palate */}
      <motion.div 
        initial={{opacity:0, y:6}} 
        animate={{opacity:1, y:0}} 
        className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 space-y-5"
      >
        <h2 className="text-lg font-semibold text-amber-900">Palate</h2>
        {slider("Sweetness","sweetness","Extra Dry","Very Sweet","sweetness")}
        {slider("Acidity","acidity","No acidity","High acidity","acidity")}
        {slider("Body","body","Light","Bold","body")}
        {slider("Tannins","tannin","Easy Drinking","Puckering","tannin")}
        {slider("Oak","oak","No oak","Bit an oak tree","oak")}
        {slider("Old World Bias","old_world_bias","New World","Old World Favorite","old_world_bias")}
        {slider("Finish","finish_len","Short as a cork","Long as a vineyard")}
      </motion.div>

      {/* Rating + Notes */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Rating (0–5 bottles)</label>
          <div className="flex items-center gap-4">
            <WineGlassRating 
              rating={input.rating_bottles || 0}
              onRatingChange={(rating) => setInput({...input, rating_bottles: rating})}
              maxRating={5}
              size="lg"
              interactive={true}
            />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">My Notes</label>
          <Textarea 
            placeholder="My Notes" 
            value={input.my_notes ?? ""} 
            onChange={e=>setInput({...input, my_notes:e.target.value})}
            rows={3}
          />
        </div>
      </div>

      {/* Add to cellar */}
      <div className="flex items-center gap-3 p-4 bg-amber-50/30 border border-amber-200 rounded-lg">
        <Checkbox 
          checked={!!input.add_to_cellar} 
          onCheckedChange={v=>setInput({...input, add_to_cellar: !!v})}
        />
        <span className="text-sm font-medium text-gray-700">Add to cellar?</span>
        {input.add_to_cellar && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Quantity:</span>
            <Input 
              className="w-20" 
              type="number" 
              min={1} 
              max={999} 
              value={input.add_to_cellar_qty?.toString() ?? "1"}
              onChange={e=>setInput({...input, add_to_cellar_qty: Number(e.target.value) || 1})}
            />
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="bg-amber-600 hover:bg-amber-700 text-white px-8"
        >
          {isSubmitting ? "Saving..." : "Save Note"}
        </Button>
      </div>
    </form>
  );
}
