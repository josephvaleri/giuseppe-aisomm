'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import { ColumnMapping, MappingTarget } from '@/lib/zod/cellar-import';
import { getMappingConfidence } from '@/lib/cellar/import/mapping';

interface MappingStepProps {
  headers: string[];
  mapping: ColumnMapping;
  onMappingChange: (mapping: ColumnMapping) => void;
  onComplete: () => void;
  isLoading: boolean;
}

const REQUIRED_FIELDS: MappingTarget[] = ['wine_name'];
const RECOMMENDED_FIELDS: MappingTarget[] = ['producer', 'vintage', 'quantity'];

export function MappingStep({ headers, mapping, onMappingChange, onComplete, isLoading }: MappingStepProps) {
  const [showAll, setShowAll] = useState(false);

  const handleMappingChange = (target: MappingTarget, value: string | undefined) => {
    const newMapping = { ...mapping };
    if (value && value.trim() !== '' && value !== 'none') {
      newMapping[target] = value;
    } else {
      delete newMapping[target];
    }
    onMappingChange(newMapping);
  };

  const isMappingValid = () => {
    return REQUIRED_FIELDS.every(field => mapping[field]);
  };

  const getFieldStatus = (target: MappingTarget) => {
    if (REQUIRED_FIELDS.includes(target)) {
      return mapping[target] ? 'required-complete' : 'required-missing';
    }
    if (RECOMMENDED_FIELDS.includes(target)) {
      return mapping[target] ? 'recommended-complete' : 'recommended-missing';
    }
    return mapping[target] ? 'optional-complete' : 'optional-missing';
  };

  const getStatusBadge = (target: MappingTarget) => {
    const status = getFieldStatus(target);
    
    switch (status) {
      case 'required-complete':
        return <Badge className="bg-green-100 text-green-800">Required</Badge>;
      case 'required-missing':
        return <Badge className="bg-red-100 text-red-800">Required</Badge>;
      case 'recommended-complete':
        return <Badge className="bg-blue-100 text-blue-800">Recommended</Badge>;
      case 'recommended-missing':
        return <Badge className="bg-yellow-100 text-yellow-800">Recommended</Badge>;
      case 'optional-complete':
        return <Badge className="bg-gray-100 text-gray-800">Optional</Badge>;
      default:
        return null;
    }
  };

  const getConfidenceBadge = (header: string) => {
    const confidence = getMappingConfidence(header);
    
    switch (confidence) {
      case 'high':
        return <Badge className="bg-green-100 text-green-800">High Match</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800">Medium Match</Badge>;
      case 'low':
        return <Badge className="bg-gray-100 text-gray-600">Low Match</Badge>;
      default:
        return null;
    }
  };

  const allFields: { target: MappingTarget; label: string; description: string }[] = [
    { target: 'alcohol', label: 'Alcohol %', description: 'Alcohol percentage' },
    { target: 'barcode', label: 'Barcode', description: 'Product barcode for matching' },
    { target: 'bottle_size', label: 'Bottle Size', description: 'Size of the bottle (750ml, etc.)' },
    { target: 'color', label: 'Color/Type', description: 'Wine color (Red, White, Rosé, etc.)' },
    { target: 'currency', label: 'Currency', description: 'Currency code (USD, EUR, etc.)' },
    { target: 'drink_from', label: 'Drink From', description: 'Earliest recommended drinking date' },
    { target: 'drink_to', label: 'Drink To', description: 'Latest recommended drinking date' },
    { target: 'my_notes', label: 'My Notes', description: 'Your tasting notes or comments' },
    { target: 'my_rating', label: 'My Rating', description: 'Your personal rating (1-5 or 50-100)' },
    { target: 'producer', label: 'Producer', description: 'Winery or producer name' },
    { target: 'quantity', label: 'Quantity', description: 'Number of bottles' },
    { target: 'ratings_blob', label: 'Professional Ratings', description: 'Critic scores (WA, WS, etc.)' },
    { target: 'status', label: 'Status', description: 'Current status (stored, drank, lost)' },
    { target: 'typical_price', label: 'Typical Price', description: 'Estimated retail price' },
    { target: 'upc', label: 'UPC', description: 'Product barcode for matching' },
    { target: 'url', label: 'URL', description: 'Wine URL or link' },
    { target: 'value', label: 'Purchase Price', description: 'Price you paid for the wine' },
    { target: 'vintage', label: 'Vintage', description: 'Year the wine was produced' },
    { target: 'where_stored', label: 'Location', description: 'Where the wine is stored' },
    { target: 'wine_name', label: 'Wine Name', description: 'The name of the wine' },
  ];

  const visibleFields = showAll ? allFields : allFields.filter(f => 
    REQUIRED_FIELDS.includes(f.target) || 
    RECOMMENDED_FIELDS.includes(f.target) || 
    mapping[f.target]
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">
          Map CSV Columns
        </h2>
        <p className="text-amber-700">
          Match your CSV columns to wine data fields. Required fields must be mapped to continue.
        </p>
      </div>

      <div className="space-y-4 mb-6">
        {visibleFields.map((field) => (
          <div key={field.target} className="flex items-center gap-4 p-4 border border-amber-200 rounded-lg">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-amber-900">{field.label}</span>
                {getFieldStatus(field.target) === 'required-missing' && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
                {getFieldStatus(field.target) === 'required-complete' && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
                {getFieldStatus(field.target) === 'recommended-complete' && (
                  <CheckCircle className="w-4 h-4 text-blue-500" />
                )}
              </div>
              <p className="text-sm text-amber-600">{field.description}</p>
              {getStatusBadge(field.target)}
            </div>
            
            <div className="w-64">
              <Select
                value={mapping[field.target] || 'none'}
                onValueChange={(value) => handleMappingChange(field.target, value === 'none' ? undefined : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select CSV column" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {headers
                    .filter(header => header && header.trim() !== '')
                    .map((header) => (
                      <SelectItem key={header} value={header}>
                        <div className="flex items-center justify-between w-full">
                          <span>{header}</span>
                          {getConfidenceBadge(header)}
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))}
      </div>

      {!showAll && (
        <Button
          variant="outline"
          onClick={() => setShowAll(true)}
          className="w-full mb-6 border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          Show All Fields ({allFields.length - visibleFields.length} more)
        </Button>
      )}

      <div className="flex justify-between">
        <div className="text-sm text-amber-600">
          {isMappingValid() ? (
            <span className="text-green-600 font-medium">✓ All required fields mapped</span>
          ) : (
            <span className="text-red-600">⚠ Please map all required fields</span>
          )}
        </div>
        
        <Button
          onClick={onComplete}
          disabled={!isMappingValid() || isLoading}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Processing...
            </>
          ) : (
            <>
              Preview Import
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
