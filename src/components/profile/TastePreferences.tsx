'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'
import { TasteData } from '@/lib/zod/profile'

interface TastePreferencesProps {
  data: TasteData
  onChange: (data: Partial<TasteData>) => void
}

const STYLE_OPTIONS = [
  'crisp', 'earthy', 'oaky', 'funky', 'mineral', 'fruity', 'spicy', 'smooth',
  'bold', 'elegant', 'complex', 'simple', 'rich', 'light', 'full-bodied'
]

const COLOR_OPTIONS = [
  'red', 'white', 'rosé', 'orange', 'sparkling', 'dessert', 'fortified'
]

const GRAPE_OPTIONS = [
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah', 'Chardonnay',
  'Sauvignon Blanc', 'Riesling', 'Pinot Grigio', 'Sangiovese', 'Tempranillo',
  'Malbec', 'Zinfandel', 'Gewürztraminer', 'Viognier', 'Chenin Blanc'
]

const REGION_OPTIONS = [
  'Bordeaux', 'Burgundy', 'Champagne', 'Tuscany', 'Napa Valley',
  'Sonoma', 'Piedmont', 'Rioja', 'Mosel', 'Barossa Valley',
  'Marlborough', 'Douro', 'Priorat', 'Willamette Valley', 'Finger Lakes'
]

export function TastePreferences({ data, onChange }: TastePreferencesProps) {
  const [newStyle, setNewStyle] = useState('')
  const [newColor, setNewColor] = useState('')
  const [newGrape, setNewGrape] = useState('')
  const [newRegion, setNewRegion] = useState('')

  const addTag = (field: keyof Pick<TasteData, 'styles' | 'colors' | 'grapes' | 'regions'>, value: string, setter: (val: string) => void) => {
    if (value.trim() && !data[field].includes(value.trim())) {
      onChange({ [field]: [...data[field], value.trim()] })
      setter('')
    }
  }

  const removeTag = (field: keyof Pick<TasteData, 'styles' | 'colors' | 'grapes' | 'regions'>, value: string) => {
    onChange({ [field]: data[field].filter(item => item !== value) })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-amber-900">Taste & Style Preferences</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Styles */}
        <div>
          <Label className="text-sm font-medium">Wine Styles</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.styles.map((style) => (
              <Badge key={style} variant="secondary" className="flex items-center gap-1">
                {style}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => removeTag('styles', style)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add style..."
              value={newStyle}
              onChange={(e) => setNewStyle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag('styles', newStyle, setNewStyle)}
              className="flex-1"
            />
            <button
              onClick={() => addTag('styles', newStyle, setNewStyle)}
              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-md"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {STYLE_OPTIONS.map((style) => (
              <button
                key={style}
                onClick={() => addTag('styles', style, setNewStyle)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        {/* Colors */}
        <div>
          <Label className="text-sm font-medium">Colors</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.colors.map((color) => (
              <Badge key={color} variant="secondary" className="flex items-center gap-1">
                {color}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => removeTag('colors', color)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add color..."
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag('colors', newColor, setNewColor)}
              className="flex-1"
            />
            <button
              onClick={() => addTag('colors', newColor, setNewColor)}
              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-md"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color}
                onClick={() => addTag('colors', color, setNewColor)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                {color}
              </button>
            ))}
          </div>
        </div>

        {/* Grapes */}
        <div>
          <Label className="text-sm font-medium">Grape Varieties</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.grapes.map((grape) => (
              <Badge key={grape} variant="secondary" className="flex items-center gap-1">
                {grape}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => removeTag('grapes', grape)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add grape variety..."
              value={newGrape}
              onChange={(e) => setNewGrape(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag('grapes', newGrape, setNewGrape)}
              className="flex-1"
            />
            <button
              onClick={() => addTag('grapes', newGrape, setNewGrape)}
              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-md"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {GRAPE_OPTIONS.map((grape) => (
              <button
                key={grape}
                onClick={() => addTag('grapes', grape, setNewGrape)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                {grape}
              </button>
            ))}
          </div>
        </div>

        {/* Regions */}
        <div>
          <Label className="text-sm font-medium">Regions</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {data.regions.map((region) => (
              <Badge key={region} variant="secondary" className="flex items-center gap-1">
                {region}
                <X 
                  className="w-3 h-3 cursor-pointer" 
                  onClick={() => removeTag('regions', region)}
                />
              </Badge>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <Input
              placeholder="Add region..."
              value={newRegion}
              onChange={(e) => setNewRegion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addTag('regions', newRegion, setNewRegion)}
              className="flex-1"
            />
            <button
              onClick={() => addTag('regions', newRegion, setNewRegion)}
              className="px-3 py-2 bg-amber-100 hover:bg-amber-200 rounded-md"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {REGION_OPTIONS.map((region) => (
              <button
                key={region}
                onClick={() => addTag('regions', region, setNewRegion)}
                className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded"
              >
                {region}
              </button>
            ))}
          </div>
        </div>

        {/* Wine Characteristics */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium">Sweetness: {data.sweetness}/10</Label>
            <Slider
              value={[data.sweetness]}
              onValueChange={([value]) => onChange({ sweetness: value })}
              max={10}
              step={1}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Acidity: {data.acidity}/10</Label>
            <Slider
              value={[data.acidity]}
              onValueChange={([value]) => onChange({ acidity: value })}
              max={10}
              step={1}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Tannin: {data.tannin}/10</Label>
            <Slider
              value={[data.tannin]}
              onValueChange={([value]) => onChange({ tannin: value })}
              max={10}
              step={1}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Body: {data.body}/10</Label>
            <Slider
              value={[data.body]}
              onValueChange={([value]) => onChange({ body: value })}
              max={10}
              step={1}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Oak: {data.oak}/10</Label>
            <Slider
              value={[data.oak]}
              onValueChange={([value]) => onChange({ oak: value })}
              max={10}
              step={1}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">Old World Bias: {data.old_world_bias > 0 ? '+' : ''}{data.old_world_bias}/10</Label>
            <Slider
              value={[data.old_world_bias]}
              onValueChange={([value]) => onChange({ old_world_bias: value })}
              min={-10}
              max={10}
              step={1}
              className="mt-2"
            />
          </div>
        </div>

        {/* Price Range */}
        <div>
          <Label className="text-sm font-medium">Price Range</Label>
          <div className="flex gap-4 mt-2">
            <div className="flex-1">
              <Label className="text-xs text-gray-600">Min ($)</Label>
              <Input
                type="number"
                value={data.price_min}
                onChange={(e) => onChange({ price_min: parseInt(e.target.value) || 0 })}
                min={0}
                max={100000}
              />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-gray-600">Max ($)</Label>
              <Input
                type="number"
                value={data.price_max}
                onChange={(e) => onChange({ price_max: parseInt(e.target.value) || 0 })}
                min={0}
                max={100000}
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Preferences</Label>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Sparkling wines</Label>
              <Switch
                checked={data.sparkling_preference}
                onCheckedChange={(checked) => onChange({ sparkling_preference: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Natural wines</Label>
              <Switch
                checked={data.natural_pref}
                onCheckedChange={(checked) => onChange({ natural_pref: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Organic wines</Label>
              <Switch
                checked={data.organic_pref}
                onCheckedChange={(checked) => onChange({ organic_pref: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">Biodynamic wines</Label>
              <Switch
                checked={data.biodynamic_pref}
                onCheckedChange={(checked) => onChange({ biodynamic_pref: checked })}
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <Label className="text-sm font-medium">Additional Notes</Label>
          <Textarea
            value={data.notes || ''}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Any other preferences or notes..."
            className="mt-2"
            rows={3}
          />
        </div>
      </CardContent>
    </Card>
  )
}
