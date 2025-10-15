'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { PreviewResponse, CommitRequest } from '@/lib/zod/cellar-import';

interface ImportStepProps {
  preview: PreviewResponse;
  onComplete: () => void;
  onBack: () => void;
}

export function ImportStep({ preview, onComplete, onBack }: ImportStepProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [acceptLikelyMatches, setAcceptLikelyMatches] = useState(false);

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);

    try {
      const commitRequest: CommitRequest = {
        preview,
        acceptLikelyMatches,
      };

      const response = await fetch('/api/cellar/import/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(commitRequest),
      });

      if (!response.ok) {
        throw new Error('Failed to import data');
      }

      const result = await response.json();
      setImportResult(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setIsImporting(false);
    }
  };

  if (importResult) {
    return (
      <div className="text-center">
        <div className="mb-6">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-amber-900 mb-2">
            Import Complete!
          </h2>
          <p className="text-amber-700">
            Your CellarTracker data has been successfully imported to your cellar.
          </p>
        </div>

        <Card className="bg-green-50 border-green-200 mb-6">
          <CardContent className="p-6">
            <h4 className="font-semibold text-green-900 mb-4">Import Summary</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.summary.insertedWines}</div>
                <div className="text-green-700">New Wines Created</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.summary.upsertedItems}</div>
                <div className="text-green-700">Cellar Items Updated</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{importResult.summary.totalQuantity}</div>
                <div className="text-green-700">Total Bottles Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-600">{importResult.summary.skippedRows}</div>
                <div className="text-amber-700">Rows Skipped</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {importResult.summary.errorRows > 0 && (
          <Card className="bg-yellow-50 border-yellow-200 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-800 mb-2">
                <AlertCircle className="w-5 h-5" />
                <span className="font-semibold">Import Warnings</span>
              </div>
              <p className="text-sm text-yellow-700">
                {importResult.summary.errorRows} rows had errors and were skipped. 
                {importResult.errorCsvUrl && (
                  <span> You can download the error report to review them.</span>
                )}
              </p>
              {importResult.errorCsvUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 border-yellow-300 text-yellow-700 hover:bg-yellow-100"
                  onClick={() => window.open(importResult.errorCsvUrl, '_blank')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Error Report
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        <Button
          onClick={onComplete}
          className="bg-amber-600 hover:bg-amber-700"
        >
          View My Cellar
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">
          Confirm Import
        </h2>
        <p className="text-amber-700">
          Review the import details and confirm to add these wines to your cellar.
        </p>
      </div>

      {/* Import Summary */}
      <Card className="bg-white/80 backdrop-blur-sm border-amber-200 mb-6">
        <CardHeader>
          <CardTitle className="text-amber-900">Import Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{preview.stats.exactMatches}</div>
              <div className="text-sm text-amber-600">Exact Matches</div>
              <Badge className="bg-green-100 text-green-800 text-xs mt-1">Will be added</Badge>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{preview.stats.likelyMatches}</div>
              <div className="text-sm text-amber-600">Likely Matches</div>
              <Badge className="bg-yellow-100 text-yellow-800 text-xs mt-1">
                {acceptLikelyMatches ? 'Will be added' : 'Review recommended'}
              </Badge>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{preview.stats.noMatches}</div>
              <div className="text-sm text-amber-600">New Wines</div>
              <Badge className="bg-red-100 text-red-800 text-xs mt-1">Will be created</Badge>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-900">
                {preview.rows.reduce((sum, row) => sum + row.quantity, 0)}
              </div>
              <div className="text-sm text-amber-600">Total Bottles</div>
              <Badge className="bg-blue-100 text-blue-800 text-xs mt-1">Will be imported</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Likely Matches Option */}
      {preview.stats.likelyMatches > 0 && (
        <Card className="bg-yellow-50 border-yellow-200 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-yellow-900 mb-2">
                  Likely Matches Found
                </h4>
                <p className="text-sm text-yellow-800 mb-3">
                  {preview.stats.likelyMatches} wines have likely matches in your cellar. 
                  You can choose to accept these matches or create new wines instead.
                </p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={acceptLikelyMatches}
                    onChange={(e) => setAcceptLikelyMatches(e.target.checked)}
                    className="rounded border-yellow-300 text-yellow-600 focus:ring-yellow-500"
                  />
                  <span className="text-sm text-yellow-800">
                    Accept likely matches ({preview.stats.likelyMatches} wines)
                  </span>
                </label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Rows Warning */}
      {preview.stats.errors > 0 && (
        <Card className="bg-red-50 border-red-200 mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">
                  Import Warnings
                </h4>
                <p className="text-sm text-red-800">
                  {preview.stats.errors} rows have errors and will be skipped during import. 
                  You can review these in the preview step.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Confirmation */}
      <Card className="bg-blue-50 border-blue-200 mb-6">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Important Notes</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Wines you already have will have their quantities increased</li>
            <li>• Notes, ratings, and other details will be intelligently merged</li>
            <li>• You can always edit or remove imported wines later</li>
            <li>• This action cannot be undone (but you can delete imported wines)</li>
          </ul>
        </CardContent>
      </Card>

      {error && (
        <Card className="bg-red-50 border-red-200 mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5" />
              <span className="font-medium">Import Error:</span>
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          disabled={isImporting}
          className="border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Preview
        </Button>
        
        <Button
          onClick={handleImport}
          disabled={isImporting}
          className="bg-amber-600 hover:bg-amber-700"
        >
          {isImporting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              Importing...
            </>
          ) : (
            <>
              Import to My Cellar
              <CheckCircle className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
