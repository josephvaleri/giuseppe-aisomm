'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Camera, PenTool, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import WineScanner from '@/components/wine/WineScanner'
import ManualWineEntry from '@/components/wine/ManualWineEntry'

export default function AddWinePage() {
  const [mode, setMode] = useState<'choose' | 'scan' | 'manual'>('choose')
  const [scannedData, setScannedData] = useState<any>(null)
  const router = useRouter()

  const handleScanComplete = (data: any) => {
    setScannedData(data)
    setMode('manual') // Switch to manual entry with scanned data
  }

  const handleBackToChoose = () => {
    setMode('choose')
    setScannedData(null)
  }

  const handleBackToHome = () => {
    router.push('/cellar')
  }

  if (mode === 'choose') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToHome}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Cellar
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Add Wine to Cellar</h1>
          <p className="text-gray-600 mt-2">Choose how you'd like to add your wine</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setMode('scan')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-xl">Scan Wine Label</CardTitle>
              <CardDescription>
                Use your camera to scan the wine label and automatically extract wine information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg">
                <Camera className="w-4 h-4 mr-2" />
                Start Scanning
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setMode('manual')}
          >
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <PenTool className="w-8 h-8 text-green-600" />
              </div>
              <CardTitle className="text-xl">Enter Manually</CardTitle>
              <CardDescription>
                Manually enter all wine details including name, vintage, appellation, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" size="lg" variant="outline">
                <PenTool className="w-4 h-4 mr-2" />
                Enter Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (mode === 'scan') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToChoose}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Options
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Scan Wine Label</h1>
          <p className="text-gray-600 mt-2">Position the wine label in the camera view and tap to scan</p>
        </div>

        <WineScanner onScanComplete={handleScanComplete} />
      </div>
    )
  }

  if (mode === 'manual') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToChoose}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Options
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">
            {scannedData ? 'Review & Complete Wine Details' : 'Enter Wine Details'}
          </h1>
          <p className="text-gray-600 mt-2">
            {scannedData 
              ? 'Review the scanned information and complete any missing fields'
              : 'Enter all the wine details manually'
            }
          </p>
        </div>

        <ManualWineEntry 
          initialData={scannedData}
          onComplete={() => router.push('/cellar')}
        />
      </div>
    )
  }

  return null
}
