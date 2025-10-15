'use client'

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import Papa from 'papaparse';
import { ColumnMapping, MappingTarget, PreviewRow, PreviewResponse } from '@/lib/zod/cellar-import';
import { autoMapColumns, getMappingConfidence } from '@/lib/cellar/import/mapping';
import { UploadStep } from '@/components/cellar/import/UploadStep';
import { MappingStep } from '@/components/cellar/import/MappingStep';
import { PreviewStep } from '@/components/cellar/import/PreviewStep';
import { ImportStep } from '@/components/cellar/import/ImportStep';

type ImportStep = 'upload' | 'mapping' | 'preview' | 'import';

export default function CellarImportPage() {
  const [currentStep, setCurrentStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const router = useRouter();

  const steps = [
    { id: 'upload', title: 'Upload CSV', description: 'Select your CellarTracker CSV file' },
    { id: 'mapping', title: 'Map Fields', description: 'Match CSV columns to wine data fields' },
    { id: 'preview', title: 'Preview', description: 'Review and validate your data' },
    { id: 'import', title: 'Import', description: 'Import wines to your cellar' },
  ];

  const handleFileUpload = useCallback((file: File) => {
    setIsLoading(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          setError(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`);
          setIsLoading(false);
          return;
        }

        const data = results.data as any[];
        const csvHeaders = Object.keys(data[0] || {})
          .filter(header => header && header.trim() !== '');
        
        setCsvData(data);
        setHeaders(csvHeaders);
        
        // Auto-map columns
        const autoMapping = autoMapColumns(csvHeaders);
        setMapping(autoMapping);
        
        setCurrentStep('mapping');
        setIsLoading(false);
      },
      error: (error) => {
        setError(`Error parsing CSV: ${error.message}`);
        setIsLoading(false);
      },
    });
  }, []);

  const handleMappingComplete = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/cellar/import/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData, mapping }),
      });

      if (!response.ok) {
        throw new Error('Failed to preview data');
      }

      const previewData = await response.json() as PreviewResponse;
      setPreview(previewData);
      setCurrentStep('preview');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImportComplete = () => {
    router.push('/cellar?imported=true');
  };

  const getStepIndex = (step: ImportStep) => steps.findIndex(s => s.id === step);

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="outline"
              onClick={() => router.back()}
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cellar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-amber-900">
                Import CellarTracker Data
              </h1>
              <p className="text-amber-700 mt-1">
                Import your wine collection from CellarTracker CSV export
              </p>
            </div>
          </div>

          {/* Progress */}
          <Card className="mb-8 bg-white/80 backdrop-blur-sm border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                {steps.map((step, index) => {
                  const isActive = step.id === currentStep;
                  const isCompleted = getStepIndex(step.id) < getStepIndex(currentStep);
                  const isUpcoming = getStepIndex(step.id) > getStepIndex(currentStep);

                  return (
                    <div key={step.id} className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center border-2 mb-2 ${
                          isCompleted
                            ? 'bg-green-500 border-green-500 text-white'
                            : isActive
                            ? 'bg-amber-600 border-amber-600 text-white'
                            : 'bg-white border-amber-300 text-amber-400'
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : isActive ? (
                          <span className="text-sm font-semibold">{index + 1}</span>
                        ) : (
                          <span className="text-sm font-semibold">{index + 1}</span>
                        )}
                      </div>
                      <div className="text-center">
                        <div className={`text-sm font-medium ${
                          isActive ? 'text-amber-900' : isCompleted ? 'text-green-700' : 'text-amber-500'
                        }`}>
                          {step.title}
                        </div>
                        <div className="text-xs text-amber-600 mt-1">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Progress 
                value={(getStepIndex(currentStep) + 1) / steps.length * 100} 
                className="h-2"
              />
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 bg-red-50 border-red-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">Error:</span>
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step Content */}
          <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
            <CardContent className="p-8">
              {currentStep === 'upload' && (
                <UploadStep
                  onFileUpload={handleFileUpload}
                  isLoading={isLoading}
                />
              )}

              {currentStep === 'mapping' && (
                <MappingStep
                  headers={headers}
                  mapping={mapping}
                  onMappingChange={setMapping}
                  onComplete={handleMappingComplete}
                  isLoading={isLoading}
                />
              )}

              {currentStep === 'preview' && preview && (
                <PreviewStep
                  preview={preview}
                  onImport={() => setCurrentStep('import')}
                  onBack={() => setCurrentStep('mapping')}
                />
              )}

              {currentStep === 'import' && preview && (
                <ImportStep
                  preview={preview}
                  onComplete={handleImportComplete}
                  onBack={() => setCurrentStep('preview')}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
