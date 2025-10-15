'use client'

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { CheckCircle, AlertTriangle, XCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { PreviewResponse } from '@/lib/zod/cellar-import';

interface PreviewStepProps {
  preview: PreviewResponse;
  onImport: () => void;
  onBack: () => void;
}

export function PreviewStep({ preview, onImport, onBack }: PreviewStepProps) {
  const [filter, setFilter] = useState<'all' | 'errors' | 'exact' | 'likely' | 'no-match'>('all');
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  const filteredRows = preview.rows.filter(row => {
    switch (filter) {
      case 'errors':
        return row.errors.length > 0;
      case 'exact':
        return row.match_status === 'EXACT_MATCH';
      case 'likely':
        return row.match_status === 'LIKELY_MATCH';
      case 'no-match':
        return row.match_status === 'NO_MATCH';
      default:
        return true;
    }
  });

  const paginatedRows = filteredRows.slice(page * rowsPerPage, (page + 1) * rowsPerPage);
  const totalPages = Math.ceil(filteredRows.length / rowsPerPage);

  const getMatchBadge = (status: string, score?: number) => {
    switch (status) {
      case 'EXACT_MATCH':
        return <Badge className="bg-green-100 text-green-800">Exact Match</Badge>;
      case 'LIKELY_MATCH':
        return <Badge className="bg-yellow-100 text-yellow-800">
          Likely Match {score ? `(${Math.round(score * 100)}%)` : ''}
        </Badge>;
      case 'NO_MATCH':
        return <Badge className="bg-red-100 text-red-800">No Match</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXACT_MATCH':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'LIKELY_MATCH':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case 'NO_MATCH':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-amber-900 mb-2">
          Preview Import
        </h2>
        <p className="text-amber-700">
          Review your data and matching results before importing to your cellar.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-900">{preview.stats.total}</div>
            <div className="text-sm text-amber-600">Total Rows</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{preview.stats.exactMatches}</div>
            <div className="text-sm text-amber-600">Exact Matches</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{preview.stats.likelyMatches}</div>
            <div className="text-sm text-amber-600">Likely Matches</div>
          </CardContent>
        </Card>
        
        <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{preview.stats.noMatches}</div>
            <div className="text-sm text-amber-600">New Wines</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-amber-600' : 'border-amber-300 text-amber-700'}
        >
          All ({preview.stats.total})
        </Button>
        <Button
          variant={filter === 'exact' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('exact')}
          className={filter === 'exact' ? 'bg-green-600' : 'border-green-300 text-green-700'}
        >
          Exact ({preview.stats.exactMatches})
        </Button>
        <Button
          variant={filter === 'likely' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('likely')}
          className={filter === 'likely' ? 'bg-yellow-600' : 'border-yellow-300 text-yellow-700'}
        >
          Likely ({preview.stats.likelyMatches})
        </Button>
        <Button
          variant={filter === 'no-match' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('no-match')}
          className={filter === 'no-match' ? 'bg-red-600' : 'border-red-300 text-red-700'}
        >
          New ({preview.stats.noMatches})
        </Button>
        <Button
          variant={filter === 'errors' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('errors')}
          className={filter === 'errors' ? 'bg-red-600' : 'border-red-300 text-red-700'}
        >
          Errors ({preview.stats.errors})
        </Button>
      </div>

      {/* Preview Table */}
      <Card className="bg-white/80 backdrop-blur-sm border-amber-200 mb-6">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-amber-50 border-b border-amber-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">Row</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">Wine</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">Producer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">Vintage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">Qty</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">Match</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-amber-700 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-200">
                {paginatedRows.map((row) => (
                  <tr key={row.__rowIndex} className="hover:bg-amber-50/50">
                    <td className="px-4 py-3 text-sm text-amber-700">{row.__rowIndex + 1}</td>
                    <td className="px-4 py-3 text-sm text-amber-900">
                      {row.wine_name || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-amber-700">
                      {row.producer || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-amber-700">
                      {row.vintage || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-4 py-3 text-sm text-amber-700">{row.quantity}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(row.match_status)}
                        {getMatchBadge(row.match_status, row.match_score)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {row.errors.length > 0 ? (
                        <div className="text-xs text-red-600">
                          {row.errors.join(', ')}
                        </div>
                      ) : (
                        <span className="text-green-600 text-xs">✓ Valid</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-amber-200">
              <div className="text-sm text-amber-600">
                Showing {page * rowsPerPage + 1} to {Math.min((page + 1) * rowsPerPage, filteredRows.length)} of {filteredRows.length} rows
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="border-amber-300 text-amber-700"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page === totalPages - 1}
                  className="border-amber-300 text-amber-700"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Summary */}
      <Card className="bg-blue-50 border-blue-200 mb-6">
        <CardContent className="p-4">
          <h4 className="font-semibold text-blue-900 mb-2">Import Summary</h4>
          <div className="text-sm text-blue-800 space-y-1">
            <p>• <strong>{preview.stats.exactMatches}</strong> wines will be matched to existing wines in your cellar</p>
            <p>• <strong>{preview.stats.likelyMatches}</strong> wines have likely matches (review recommended)</p>
            <p>• <strong>{preview.stats.noMatches}</strong> new wines will be created</p>
            <p>• Quantities will be aggregated for wines you already have</p>
            {preview.stats.errors > 0 && (
              <p>• <strong>{preview.stats.errors}</strong> rows have errors and will be skipped</p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onBack}
          className="border-amber-300 text-amber-700 hover:bg-amber-50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Mapping
        </Button>
        
        <Button
          onClick={onImport}
          className="bg-amber-600 hover:bg-amber-700"
        >
          Continue to Import
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
