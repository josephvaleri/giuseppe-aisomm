'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface AnimationSettings {
  // Idle animation
  idle_rotate_min: number
  idle_rotate_max: number
  idle_y_min: number
  idle_y_max: number
  idle_duration: number
  
  // Blink animation
  blink_base_min: number
  blink_base_max: number
  blink_duration: number
  blink_speed_multiplier: number
  
  // Answering animation
  answering_y_base: number
  answering_y_amp_multiplier: number
  answering_rotate_base: number
  answering_rotate_amp_multiplier: number
  answering_duration_base: number
  answering_duration_amp_factor: number
  
  // Emphasis animation
  emphasis_rotate_keyframes: number[]
  emphasis_y_keyframes: number[]
  emphasis_duration: number
  
  // Audio reactive
  audio_sensitivity: number
  audio_clamp_min: number
  audio_clamp_max: number
}

const defaultSettings: AnimationSettings = {
  // Idle animation
  idle_rotate_min: -1.2,
  idle_rotate_max: 1.2,
  idle_y_min: 0,
  idle_y_max: 3,
  idle_duration: 4000,
  
  // Blink animation
  blink_base_min: 2200,
  blink_base_max: 5200,
  blink_duration: 140,
  blink_speed_multiplier: 1.35,
  
  // Answering animation
  answering_y_base: 2,
  answering_y_amp_multiplier: 6,
  answering_rotate_base: 0.8,
  answering_rotate_amp_multiplier: 2,
  answering_duration_base: 0.38,
  answering_duration_amp_factor: 0.22,
  
  // Emphasis animation
  emphasis_rotate_keyframes: [0, -2.5, 1.5, 0],
  emphasis_y_keyframes: [0, -2, 0],
  emphasis_duration: 420,
  
  // Audio reactive
  audio_sensitivity: 8,
  audio_clamp_min: 0,
  audio_clamp_max: 1,
}

export default function AnimationSettingsPage() {
  const [settings, setSettings] = useState<AnimationSettings>(defaultSettings)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('animation_settings')
        .eq('id', 1)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading settings:', error)
        return
      }

      if (data?.animation_settings) {
        setSettings({ ...defaultSettings, ...data.animation_settings })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    setMessage('')
    
    try {
      const { error } = await supabase
        .from('settings')
        .update({
          animation_settings: settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', 1)

      if (error) {
        console.error('Error saving settings:', error)
        setMessage('Error saving settings')
        return
      }

      setMessage('Settings saved successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error saving settings:', error)
      setMessage('Error saving settings')
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setSettings(defaultSettings)
    setMessage('Reset to defaults')
    setTimeout(() => setMessage(''), 3000)
  }

  const updateSetting = (key: keyof AnimationSettings, value: number | number[]) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-900 mb-2">Animation Settings</h1>
          <p className="text-amber-700">Configure Giuseppe's avatar animations</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.includes('Error') 
              ? 'bg-red-100 text-red-800 border border-red-200' 
              : 'bg-green-100 text-green-800 border border-green-200'
          }`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Idle Animation */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 p-6">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">Idle Animation</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Rotation Range (degrees)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.idle_rotate_min}
                    onChange={(e) => updateSetting('idle_rotate_min', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={settings.idle_rotate_max}
                    onChange={(e) => updateSetting('idle_rotate_max', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Vertical Movement Range (pixels)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    value={settings.idle_y_min}
                    onChange={(e) => updateSetting('idle_y_min', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={settings.idle_y_max}
                    onChange={(e) => updateSetting('idle_y_max', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Duration (ms)
                </label>
                <input
                  type="number"
                  value={settings.idle_duration}
                  onChange={(e) => updateSetting('idle_duration', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Blink Animation */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 p-6">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">Blink Animation</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Blink Interval Range (ms)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={settings.blink_base_min}
                    onChange={(e) => updateSetting('blink_base_min', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Min"
                  />
                  <input
                    type="number"
                    value={settings.blink_base_max}
                    onChange={(e) => updateSetting('blink_base_max', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="Max"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Blink Duration (ms)
                </label>
                <input
                  type="number"
                  value={settings.blink_duration}
                  onChange={(e) => updateSetting('blink_duration', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Speed Multiplier (when answering)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.blink_speed_multiplier}
                  onChange={(e) => updateSetting('blink_speed_multiplier', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Answering Animation */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 p-6">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">Answering Animation</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Vertical Bob Base (pixels)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.answering_y_base}
                  onChange={(e) => updateSetting('answering_y_base', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Vertical Bob Amplitude Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.answering_y_amp_multiplier}
                  onChange={(e) => updateSetting('answering_y_amp_multiplier', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Rotation Base (degrees)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.answering_rotate_base}
                  onChange={(e) => updateSetting('answering_rotate_base', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Rotation Amplitude Multiplier
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.answering_rotate_amp_multiplier}
                  onChange={(e) => updateSetting('answering_rotate_amp_multiplier', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Duration Base (seconds)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.answering_duration_base}
                  onChange={(e) => updateSetting('answering_duration_base', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Duration Amplitude Factor
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.answering_duration_amp_factor}
                  onChange={(e) => updateSetting('answering_duration_amp_factor', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Emphasis Animation */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 p-6">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">Start Speaking Emphasis</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Emphasis Duration (ms)
                </label>
                <input
                  type="number"
                  value={settings.emphasis_duration}
                  onChange={(e) => updateSetting('emphasis_duration', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Rotation Keyframes (degrees, comma-separated)
                </label>
                <input
                  type="text"
                  value={settings.emphasis_rotate_keyframes.join(', ')}
                  onChange={(e) => {
                    const values = e.target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
                    updateSetting('emphasis_rotate_keyframes', values)
                  }}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="0, -2.5, 1.5, 0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Vertical Keyframes (pixels, comma-separated)
                </label>
                <input
                  type="text"
                  value={settings.emphasis_y_keyframes.join(', ')}
                  onChange={(e) => {
                    const values = e.target.value.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v))
                    updateSetting('emphasis_y_keyframes', values)
                  }}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  placeholder="0, -2, 0"
                />
              </div>
            </div>
          </div>

          {/* Audio Reactive */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-200 p-6 lg:col-span-2">
            <h2 className="text-xl font-semibold text-amber-900 mb-4">Audio Reactive Settings</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Audio Sensitivity
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.audio_sensitivity}
                  onChange={(e) => updateSetting('audio_sensitivity', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Audio Clamp Min
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.audio_clamp_min}
                  onChange={(e) => updateSetting('audio_clamp_min', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-amber-800 mb-1">
                  Audio Clamp Max
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.audio_clamp_max}
                  onChange={(e) => updateSetting('audio_clamp_max', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border border-amber-300 rounded-md focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-medium rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button
            onClick={resetToDefaults}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  )
}
