'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { createClient } from '@/lib/supabase/client'
import { CSVWineData, BatchInsertResult } from '@/types/cellar'
import { Upload, Download, AlertCircle, CheckCircle, X } from 'lucide-react'
import Papa from 'papaparse'

interface CSVUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onWinesImported: () => void
}

interface UploadResult {
  total: number
  matched: number
  created: number
  errors: string[]
}

export function CSVUploadModal({ isOpen, onClose, onWinesImported }: CSVUploadModalProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  // Function to match text fields to IDs
  const matchTextToIds = async (csvData: CSVWineData[]): Promise<{ matched: any[], errors: string[] }> => {
    const errors: string[] = []
    const matched: any[] = []

    try {
      // Load reference data
      const [countriesResult, regionsResult, appellationsResult] = await Promise.all([
        supabase.from('countries_regions').select('country_id, country_name').not('country_name', 'is', null),
        supabase.from('countries_regions').select('region_id, wine_region, country_id').not('wine_region', 'is', null),
        supabase.from('appellation').select('appellation_id, appellation, region_id').not('appellation', 'is', null)
      ])

      const countries = countriesResult.data || []
      const regions = regionsResult.data || []
      const appellations = appellationsResult.data || []

      for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i]
        const rowNum = i + 2 // +2 because CSV starts at row 1 and we skip header
        let matchedRow = { ...row }

        // Match country
        if (row.country) {
          const matchedCountry = countries.find(c => 
            c.country_name.toLowerCase() === row.country!.toLowerCase()
          )
          if (matchedCountry) {
            matchedRow.country_id = matchedCountry.country_id
          } else {
            errors.push(`Row ${rowNum}: Country "${row.country}" not found`)
          }
        }

        // Match region
        if (row.region) {
          const matchedRegion = regions.find(r => 
            r.wine_region.toLowerCase() === row.region!.toLowerCase()
          )
          if (matchedRegion) {
            matchedRow.region_id = matchedRegion.region_id
          } else {
            errors.push(`Row ${rowNum}: Region "${row.region}" not found`)
          }
        }

        // Match appellation
        if (row.appellation) {
          const matchedAppellation = appellations.find(a => 
            a.appellation.toLowerCase() === row.appellation!.toLowerCase()
          )
          if (matchedAppellation) {
            matchedRow.appellation_id = matchedAppellation.appellation_id
          } else {
            errors.push(`Row ${rowNum}: Appellation "${row.appellation}" not found`)
          }
        }

        matched.push(matchedRow)
      }

      return { matched, errors }
    } catch (error) {
      console.error('Error matching text to IDs:', error)
      return { matched: [], errors: ['Error loading reference data for matching'] }
    }
  }

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
        my_notes: 'Excellent vintage, full-bodied with notes of blackcurrant',
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

    console.log('Downloading sample CSV with data:', sampleData)
    const csvContent = Papa.unparse(sampleData)
    console.log('Generated CSV content:', csvContent)
    
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample_cellar_import_v2.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const validateCSVData = (data: any[]): { valid: CSVWineData[], errors: string[] } => {
    const valid: CSVWineData[] = []
    const errors: string[] = []

    data.forEach((row, index) => {
      const rowNum = index + 2 // +2 because CSV starts at row 1 and we skip header

      // Required field validation
      if (!row.wine_name || row.wine_name.trim() === '') {
        errors.push(`Row ${rowNum}: Wine name is required`)
        return
      }

      // Numeric field validation
      if (row.vintage && isNaN(Number(row.vintage))) {
        errors.push(`Row ${rowNum}: Vintage must be a number`)
      }

      if (row.quantity && (isNaN(Number(row.quantity)) || Number(row.quantity) < 0)) {
        errors.push(`Row ${rowNum}: Quantity must be a positive number`)
      }

      if (row.value && (isNaN(Number(row.value)) || Number(row.value) < 0)) {
        errors.push(`Row ${rowNum}: Value must be a positive number`)
      }

      if (row.my_rating && (isNaN(Number(row.my_rating)) || Number(row.my_rating) < 1 || Number(row.my_rating) > 10)) {
        errors.push(`Row ${rowNum}: Rating must be between 1 and 10`)
      }

      // Status validation
      if (row.status && !['stored', 'drank', 'lost'].includes(row.status)) {
        errors.push(`Row ${rowNum}: Status must be 'stored', 'drank', or 'lost'`)
      }

      // Bottle size validation
      if (row.bottle_size && !['750ml', '375ml', '187ml', 'other'].includes(row.bottle_size)) {
        errors.push(`Row ${rowNum}: Bottle size must be '750ml', '375ml', '187ml', or 'other'`)
      }

      if (errors.length === 0 || !errors.some(err => err.includes(`Row ${rowNum}`))) {
        valid.push({
          wine_name: row.wine_name.trim(),
          producer: row.producer?.trim(),
          vintage: row.vintage ? Number(row.vintage) : undefined,
          appellation: row.appellation?.trim(),
          country: row.country?.trim(),
          region: row.region?.trim(),
          quantity: row.quantity ? Number(row.quantity) : 1,
          where_stored: row.where_stored?.trim(),
          value: row.value ? Number(row.value) : undefined,
          currency: row.currency?.trim() || 'USD',
          my_notes: row.my_notes?.trim(),
          my_rating: row.my_rating ? Number(row.my_rating) : undefined,
          status: row.status || 'stored',
          bottle_size: row.bottle_size,
          alcohol: row.alcohol?.trim(),
          barcode: row.barcode?.trim()
        })
      }
    })

    return { valid, errors }
  }

  const handleFileUpload = async (file: File) => {
    setIsUploading(true)
    setUploadProgress(0)
    setUploadResult(null)

    try {
      // Parse CSV
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          setUploadProgress(25)

          // Validate data
          const { valid, errors } = validateCSVData(results.data)
          setUploadProgress(25)

          if (errors.length > 0) {
            setUploadResult({
              total: results.data.length,
              matched: 0,
              created: 0,
              errors
            })
            setIsUploading(false)
            return
          }

          if (valid.length === 0) {
            setUploadResult({
              total: results.data.length,
              matched: 0,
              created: 0,
              errors: ['No valid rows found in CSV']
            })
            setIsUploading(false)
            return
          }

          // Match text fields to IDs
          const { matched: matchedData, errors: matchingErrors } = await matchTextToIds(valid)
          setUploadProgress(50)

          if (matchingErrors.length > 0) {
            setUploadResult({
              total: results.data.length,
              matched: 0,
              created: 0,
              errors: matchingErrors
            })
            setIsUploading(false)
            return
          }

          // Get current user
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) {
            setUploadResult({
              total: results.data.length,
              matched: 0,
              created: 0,
              errors: ['User not authenticated']
            })
            setIsUploading(false)
            return
          }

          // Process each wine individually
          let matched = 0
          let created = 0
          const processingErrors: string[] = []

          for (let i = 0; i < matchedData.length; i++) {
            const wineData = matchedData[i]
            const rowNum = i + 2

            try {
              // First, try to find existing wine
              const { data: existingWines } = await supabase
                .from('wines')
                .select('wine_id')
                .ilike('wine_name', `%${wineData.wine_name}%`)
                .limit(1)

              let wineId: number

              if (existingWines && existingWines.length > 0) {
                // Use existing wine
                wineId = existingWines[0].wine_id
                matched++
              } else {
                // Create new wine
                const { data: newWine, error: wineError } = await supabase
                  .from('wines')
                  .insert({
                    wine_name: wineData.wine_name,
                    producer: wineData.producer || null,
                    vintage: wineData.vintage || null,
                    alcohol: wineData.alcohol || null,
                    country_id: wineData.country_id || null,
                    region_id: wineData.region_id || null,
                    appellation_id: wineData.appellation_id || null,
                    bottle_size: wineData.bottle_size || null,
                    barcode: wineData.barcode || null,
                    created_from_analysis: false,
                    analysis_confidence: 1.0
                  })
                  .select()
                  .single()

                if (wineError) throw wineError
                wineId = newWine.wine_id
                created++
              }

              // Create cellar item
              const { error: cellarError } = await supabase
                .from('cellar_items')
                .insert({
                  wine_id: wineId,
                  user_id: user.id,
                  quantity: wineData.quantity || 1,
                  where_stored: wineData.where_stored || null,
                  value: wineData.value || null,
                  currency: wineData.currency || 'USD',
                  my_notes: wineData.my_notes || null,
                  my_rating: wineData.my_rating || null,
                  status: wineData.status || 'stored'
                })

              if (cellarError) throw cellarError

            } catch (error) {
              console.error(`Error processing row ${rowNum}:`, error)
              processingErrors.push(`Row ${rowNum}: Failed to process wine - ${error}`)
            }

            setUploadProgress(50 + (i / matchedData.length) * 40)
          }

          setUploadProgress(100)

          setUploadResult({
            total: matchedData.length,
            matched,
            created,
            errors: processingErrors
          })

          if (processingErrors.length === 0) {
            onWinesImported()
          }
        },
        error: (error) => {
          setUploadResult({
            total: 0,
            matched: 0,
            created: 0,
            errors: [`CSV parsing error: ${error.message}`]
          })
          setIsUploading(false)
        }
      })
    } catch (error) {
      console.error('Error uploading CSV:', error)
      setUploadResult({
        total: 0,
        matched: 0,
        created: 0,
        errors: ['Error processing CSV file']
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    
    const files = e.dataTransfer.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files[0]) {
      handleFileUpload(files[0])
    }
  }

  const resetModal = () => {
    setUploadProgress(0)
    setUploadResult(null)
    setIsUploading(false)
    setDragActive(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClose = () => {
    onClose()
    resetModal()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-amber-900 flex items-center">
            <Upload className="w-6 h-6 mr-2" />
            Import Wines from CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sample CSV Download */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <Download className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Need a template?</h3>
                <p className="text-sm text-blue-700 mb-2">
                  Download our sample CSV file to see the correct format and column names.
                </p>
                <Button
                  onClick={downloadSampleCSV}
                  variant="outline"
                  size="sm"
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Sample CSV
                </Button>
              </div>
            </div>
          </div>

          {/* Upload Area */}
          {!isUploading && !uploadResult && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-amber-400 bg-amber-50'
                  : 'border-gray-300 hover:border-amber-400 hover:bg-amber-25'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-amber-900 mb-2">
                Upload your CSV file
              </h3>
              <p className="text-amber-700 mb-4">
                Drag and drop your CSV file here, or click to browse
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-amber-600 hover:bg-amber-700"
              >
                Choose File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-amber-900 mb-2">
                  Processing your wines...
                </h3>
                <p className="text-amber-700">
                  This may take a moment while we match wines and add them to your cellar.
                </p>
              </div>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-center text-sm text-amber-600">
                {uploadProgress < 25 && 'Parsing CSV file...'}
                {uploadProgress >= 25 && uploadProgress < 50 && 'Validating and matching data...'}
                {uploadProgress >= 50 && uploadProgress < 100 && 'Adding wines to cellar...'}
                {uploadProgress >= 100 && 'Complete!'}
              </p>
            </div>
          )}

          {/* Upload Results */}
          {uploadResult && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {uploadResult.errors.length > 0 ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                <h3 className="text-lg font-semibold text-amber-900">
                  Upload Complete
                </h3>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-amber-900">{uploadResult.total}</div>
                  <div className="text-sm text-gray-600">Total Wines</div>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-900">{uploadResult.matched}</div>
                  <div className="text-sm text-blue-600">Matched</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-900">{uploadResult.created}</div>
                  <div className="text-sm text-green-600">New Wines</div>
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-2">Errors found:</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {uploadResult.errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              {uploadResult.errors.length === 0 && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-green-700">
                    Successfully imported {uploadResult.total} wine{uploadResult.total !== 1 ? 's' : ''} to your cellar!
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {uploadResult ? 'Close' : 'Cancel'}
          </Button>
          {uploadResult && uploadResult.errors.length === 0 && (
            <Button
              onClick={handleClose}
              className="bg-amber-600 hover:bg-amber-700"
            >
              View My Cellar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
