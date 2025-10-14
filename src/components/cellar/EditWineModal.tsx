'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { CellarItem } from '@/types/cellar'

interface EditWineModalProps {
  isOpen: boolean
  onClose: () => void
  cellarItem: CellarItem | null
  onWineUpdated: () => void
}

export function EditWineModal({ isOpen, onClose, cellarItem, onWineUpdated }: EditWineModalProps) {
  const [cellarData, setCellarData] = useState({
    quantity: 1,
    where_stored: '',
    value: '',
    currency: 'USD',
    my_notes: '',
    my_rating: '',
    status: 'stored' as 'stored' | 'drank' | 'lost'
  })

  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const supabase = createClient()

  useEffect(() => {
    if (cellarItem && isOpen) {
      setCellarData({
        quantity: cellarItem.quantity,
        where_stored: cellarItem.where_stored || '',
        value: cellarItem.value?.toString() || '',
        currency: cellarItem.currency,
        my_notes: cellarItem.my_notes || '',
        my_rating: cellarItem.my_rating?.toString() || '',
        status: cellarItem.status
      })
    }
  }, [cellarItem, isOpen])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (cellarData.quantity && (isNaN(Number(cellarData.quantity)) || Number(cellarData.quantity) < 0)) {
      newErrors.quantity = 'Quantity must be a positive number'
    }

    if (cellarData.value && (isNaN(Number(cellarData.value)) || Number(cellarData.value) < 0)) {
      newErrors.value = 'Value must be a positive number'
    }

    if (cellarData.my_rating && (isNaN(Number(cellarData.my_rating)) || Number(cellarData.my_rating) < 1 || Number(cellarData.my_rating) > 10)) {
      newErrors.my_rating = 'Rating must be between 1 and 10'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm() || !cellarItem) return

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('cellar_items')
        .update({
          quantity: Number(cellarData.quantity),
          where_stored: cellarData.where_stored || null,
          value: cellarData.value ? Number(cellarData.value) : null,
          currency: cellarData.currency,
          my_notes: cellarData.my_notes || null,
          my_rating: cellarData.my_rating ? Number(cellarData.my_rating) : null,
          status: cellarData.status
        })
        .eq('bottle_id', cellarItem.bottle_id)

      if (error) throw error

      onWineUpdated()
      onClose()
    } catch (error) {
      console.error('Error updating cellar item:', error)
      alert('Error updating wine in cellar')
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    if (cellarItem) {
      setCellarData({
        quantity: cellarItem.quantity,
        where_stored: cellarItem.where_stored || '',
        value: cellarItem.value?.toString() || '',
        currency: cellarItem.currency,
        my_notes: cellarItem.my_notes || '',
        my_rating: cellarItem.my_rating?.toString() || '',
        status: cellarItem.status
      })
    }
    setErrors({})
  }

  const handleClose = () => {
    onClose()
    resetForm()
  }

  if (!cellarItem) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-amber-900">
            Edit Wine in Cellar
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wine Info Display */}
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <h3 className="font-semibold text-amber-900 mb-2">Wine Information</h3>
            <div className="text-amber-800">
              <p className="font-medium">{cellarItem.wine_name}</p>
              {cellarItem.producer && <p>Producer: {cellarItem.producer}</p>}
              {cellarItem.vintage && <p>Vintage: {cellarItem.vintage}</p>}
              {cellarItem.appellation && <p>Appellation: {cellarItem.appellation}</p>}
            </div>
          </div>

          {/* Editable Cellar Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-amber-800">Cellar Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={cellarData.quantity}
                  onChange={(e) => setCellarData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                  className={errors.quantity ? 'border-red-500' : ''}
                />
                {errors.quantity && <p className="text-sm text-red-500">{errors.quantity}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={cellarData.status} onValueChange={(value: any) => setCellarData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stored">Stored</SelectItem>
                    <SelectItem value="drank">Drank</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="where_stored">Where Stored</Label>
                <Input
                  id="where_stored"
                  placeholder="e.g., Wine cellar, Kitchen"
                  value={cellarData.where_stored}
                  onChange={(e) => setCellarData(prev => ({ ...prev, where_stored: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Value</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={cellarData.value}
                  onChange={(e) => setCellarData(prev => ({ ...prev, value: e.target.value }))}
                  className={errors.value ? 'border-red-500' : ''}
                />
                {errors.value && <p className="text-sm text-red-500">{errors.value}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Select value={cellarData.currency} onValueChange={(value) => setCellarData(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="my_rating">My Rating</Label>
                <Select value={cellarData.my_rating} onValueChange={(value) => setCellarData(prev => ({ ...prev, my_rating: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your rating (1-10)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No rating</SelectItem>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating}/10
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="my_notes">Flavor Profile & Notes</Label>
              <Textarea
                id="my_notes"
                placeholder="Describe the wine's flavor profile, tasting notes, etc."
                value={cellarData.my_notes}
                onChange={(e) => setCellarData(prev => ({ ...prev, my_notes: e.target.value }))}
                className="min-h-[100px] resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {isLoading ? 'Updating...' : 'Update Wine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


