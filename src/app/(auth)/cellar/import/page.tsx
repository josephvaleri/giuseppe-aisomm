'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Download, Upload, FileText, Database, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { CSVUploadModal } from '@/components/cellar/CSVUploadModal'
import Papa from 'papaparse'

export default function ImportPage() {
  const [showCSVModal, setShowCSVModal] = useState(false)
  const router = useRouter()

  const downloadSampleCSV = () => {
    const sampleData = [
      {
        wine_name: 'Château Margaux',
        producer: 'Château Margaux',
        vintage: 2015,
        appellation: 'Margaux',
        country: 'France',
        region: 'Bordeaux',
        quantity: 1,
        where_stored: 'Wine cellar',
        value: 500.00,
        currency: 'USD',
        my_notes: 'Excellent vintage with full-bodied notes',
        my_rating: 9,
        status: 'stored',
        bottle_size: '750ml',
        alcohol: '13.5%',
        barcode: '123456789012'
      },
      {
        wine_name: 'Barolo Brunate',
        producer: 'Vietti',
        vintage: 2018,
        appellation: 'Barolo',
        country: 'Italy',
        region: 'Piedmont',
        quantity: 2,
        where_stored: 'Wine cellar',
        value: 120.00,
        currency: 'USD',
        my_notes: 'Classic Barolo with great aging potential',
        my_rating: 8,
        status: 'stored',
        bottle_size: '750ml',
        alcohol: '14.0%',
        barcode: '123456789013'
      }
    ]

    const csvContent = Papa.unparse(sampleData)
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sample_cellar_import_v${Date.now()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <Button 
              onClick={() => router.push('/cellar')} 
              variant="outline"
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Cellar
            </Button>
            
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              Import Wine Data
            </h1>
            <p className="text-amber-700 text-lg">
              Import your wine collection from CSV files or CellarTracker
            </p>
          </div>

          {/* Import Methods */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* CSV Import */}
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-900 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  CSV Import
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-amber-700">
                  Import your wine collection using a CSV file. Download our sample template to get started.
                </p>
                
                <div className="space-y-3">
                  <Button
                    onClick={downloadSampleCSV}
                    variant="outline"
                    className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Sample CSV
                  </Button>
                  
                  <Button
                    onClick={() => setShowCSVModal(true)}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Your CSV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* CellarTracker Import */}
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-900 flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  CellarTracker Import
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-amber-700">
                  Import directly from CellarTracker with our specialized import tool.
                </p>
                
                <Button
                  onClick={() => router.push('/cellar/import/cellartracker')}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Import from CellarTracker
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <div className="space-y-6">
            {/* CSV Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-900">CSV Import Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-amber-800 font-semibold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900">Download Sample CSV</h4>
                      <p className="text-amber-700 text-sm">Click "Download Sample CSV" to get our template with the correct column headers.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-amber-800 font-semibold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900">Fill Out Your Data</h4>
                      <p className="text-amber-700 text-sm">Open the CSV file in Excel, Google Sheets, or any spreadsheet application. Fill in your wine data following the sample format.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-amber-800 font-semibold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900">Save and Upload</h4>
                      <p className="text-amber-700 text-sm">Save your file as a CSV and click "Upload Your CSV" to import your wines.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Required Fields
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm text-amber-700">
                    <div>• wine_name</div>
                    <div>• producer</div>
                    <div>• vintage</div>
                    <div>• quantity</div>
                    <div>• status</div>
                    <div>• currency</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CellarTracker Instructions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-amber-900">CellarTracker Import Instructions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-800 font-semibold text-sm">1</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900">Export from CellarTracker</h4>
                      <p className="text-amber-700 text-sm">Log into your CellarTracker account and export your cellar data as a CSV file.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-800 font-semibold text-sm">2</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900">Use Our Import Tool</h4>
                      <p className="text-amber-700 text-sm">Click "Import from CellarTracker" to use our specialized import tool that automatically maps CellarTracker fields.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-green-800 font-semibold text-sm">3</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-900">Review and Import</h4>
                      <p className="text-amber-700 text-sm">Review the mapped data, make any necessary adjustments, and import your wines.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Smart Mapping
                  </h4>
                  <p className="text-green-700 text-sm">
                    Our CellarTracker import tool automatically maps your data fields and uses intelligent matching to find existing wines in our database.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tips */}
          <Card className="mt-6 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle className="text-blue-900">💡 Pro Tips</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-blue-800">
                <li>• <strong>Backup your data:</strong> Always keep a copy of your original export files</li>
                <li>• <strong>Review before importing:</strong> Check the preview carefully before confirming the import</li>
                <li>• <strong>Start small:</strong> Test with a few wines first to ensure everything works correctly</li>
                <li>• <strong>Check for duplicates:</strong> Our system will help identify and merge duplicate wines</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* CSV Upload Modal */}
      <CSVUploadModal
        isOpen={showCSVModal}
        onClose={() => setShowCSVModal(false)}
        onWinesImported={() => {
          setShowCSVModal(false)
          router.push('/cellar')
        }}
      />
    </div>
  )
}
