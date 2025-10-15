'use client'

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface UploadStepProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export function UploadStep({ onFileUpload, isLoading }: UploadStepProps) {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        onFileUpload(file);
      }
    }
  }, [onFileUpload]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      onFileUpload(files[0]);
    }
  }, [onFileUpload]);

  return (
    <div className="text-center">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">
          Upload CellarTracker CSV
        </h2>
        <p className="text-amber-700">
          Select your CellarTracker CSV export file to import your wine collection
        </p>
      </div>

      <div
        className={`border-2 border-dashed rounded-lg p-12 transition-colors ${
          dragActive
            ? 'border-amber-400 bg-amber-50'
            : 'border-amber-300 bg-amber-25'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center">
          <Upload className="w-16 h-16 text-amber-400 mb-4" />
          <h3 className="text-lg font-semibold text-amber-900 mb-2">
            Drop your CSV file here
          </h3>
          <p className="text-amber-600 mb-6">
            or click to browse files
          </p>
          
          <input
            type="file"
            accept=".csv"
            onChange={handleFileInput}
            className="hidden"
            id="csv-upload"
            disabled={isLoading}
          />
          
          <Button
            onClick={() => document.getElementById('csv-upload')?.click()}
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Choose CSV File
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="mt-8 text-left">
        <h4 className="font-semibold text-amber-900 mb-3">Supported CSV Formats:</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• CellarTracker standard export format</li>
          <li>• CSV files with headers in the first row</li>
          <li>• Common fields: Wine Name, Producer, Vintage, Quantity, etc.</li>
        </ul>
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <strong>Tip:</strong> If you have multiple wines of the same type, 
            the import will automatically combine them and sum the quantities. 
            All other details (notes, ratings, etc.) will be merged intelligently.
          </div>
        </div>
      </div>
    </div>
  );
}
