'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AvatarUpload } from '@/components/profile/AvatarUpload'
import { TastePreferences } from '@/components/profile/TastePreferences'
import { useToast } from '@/components/ui/use-toast'
import { combinedProfileSchema, ProfileData, DetailsData, TasteData } from '@/lib/zod/profile'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, User, Settings, Wine, Mail, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface ProfilePageData {
  profile: any
  details: DetailsData
  taste: TasteData
}

export default function ProfilePage() {
  const [data, setData] = useState<ProfilePageData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('account')
  const { toast } = useToast()
  const supabase = createClient()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(combinedProfileSchema),
    defaultValues: {
      profile: {
        full_name: '',
        email: ''
      },
      details: {
        preferred_name: '',
        phone: '',
        experience: 'newbie' as const,
        time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        people_count: 1,
        share_cellar: false
      },
      taste: {
        styles: [],
        colors: [],
        grapes: [],
        regions: [],
        sweetness: 2,
        acidity: 6,
        tannin: 4,
        body: 5,
        oak: 3,
        price_min: 10,
        price_max: 50,
        old_world_bias: 0,
        sparkling_preference: false,
        natural_pref: false,
        organic_pref: false,
        biodynamic_pref: false,
        notes: ''
      }
    }
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)

        const response = await fetch('/api/profile')
        if (!response.ok) throw new Error('Failed to load profile')

        const profileData = await response.json()
        setData(profileData)

        // Set form values
        setValue('profile.full_name', profileData.profile.full_name || '')
        setValue('profile.email', profileData.profile.email || '')
        setValue('details.preferred_name', profileData.details.preferred_name || '')
        setValue('details.phone', profileData.details.phone || '')
        setValue('details.experience', profileData.details.experience)
        setValue('details.time_zone', profileData.details.time_zone)
        setValue('details.people_count', profileData.details.people_count)
        setValue('details.share_cellar', profileData.details.share_cellar)
        setValue('taste', profileData.taste)
      } catch (error) {
        console.error('Error loading profile:', error)
        toast({
          title: 'Error',
          description: 'Failed to load profile data',
          variant: 'destructive'
        })
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [setValue, supabase, toast])

  const onSubmit = async (formData: any) => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to save profile')

      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully'
      })
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: 'Error',
        description: 'Failed to save profile. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDetailsChange = (updates: Partial<DetailsData>) => {
    Object.entries(updates).forEach(([key, value]) => {
      setValue(`details.${key}` as any, value)
    })
  }

  const handleTasteChange = (updates: Partial<TasteData>) => {
    Object.entries(updates).forEach(([key, value]) => {
      setValue(`taste.${key}` as any, value)
    })
  }

  const handleAvatarUpdate = (url: string) => {
    // Avatar is handled separately via the AvatarUpload component
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto mb-4"></div>
            <p className="text-amber-700">Loading profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">Failed to load profile data</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-[url('/background_09.png')] bg-cover bg-center bg-no-repeat relative">
      {/* 60% fade overlay */}
      <div className="absolute inset-0 bg-white/60"></div>
      
      {/* Content with proper layering */}
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-amber-300">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-amber-900">My Profile</h1>
              <p className="text-amber-700">Manage your account and preferences</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="account">Account Information</TabsTrigger>
              <TabsTrigger value="personal">Personal Details</TabsTrigger>
              <TabsTrigger value="taste">Taste & Style Preferences</TabsTrigger>
            </TabsList>

            {/* Account Information Tab */}
            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-900">
                    <User className="w-5 h-5 mr-2" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        {...register('profile.full_name')}
                        className="mt-1"
                      />
                      {errors.profile?.full_name && (
                        <p className="text-red-600 text-sm mt-1">{errors.profile.full_name.message}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        {...register('profile.email')}
                        className="mt-1"
                      />
                      {errors.profile?.email && (
                        <p className="text-red-600 text-sm mt-1">{errors.profile.email.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Read-only account info */}
                  <div className="pt-4 border-t border-amber-200">
                    <h4 className="font-medium text-amber-900 mb-3">Account Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <Label className="text-gray-600">Role</Label>
                        <div className="mt-1">
                          <Badge variant="secondary">{data.profile.role}</Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-600">Subscription Status</Label>
                        <div className="mt-1">
                          <Badge variant="secondary">{data.profile.subscription_status}</Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-gray-600">Trial Expires</Label>
                        <p className="mt-1 text-gray-900">
                          {data.profile.trial_expires_at ? new Date(data.profile.trial_expires_at).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-gray-600">Member Since</Label>
                        <p className="mt-1 text-gray-900">
                          {new Date(data.profile.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Personal Details Tab */}
            <TabsContent value="personal" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center text-amber-900">
                    <Settings className="w-5 h-5 mr-2" />
                    Personal Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Photo */}
                  <div>
                    <Label className="text-sm font-medium">Profile Photo</Label>
                    <div className="mt-2">
                      <AvatarUpload
                        currentAvatarUrl={data.details.avatar_url}
                        onAvatarUpdate={handleAvatarUpdate}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="preferred_name">Preferred Name</Label>
                      <Input
                        id="preferred_name"
                        {...register('details.preferred_name')}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        {...register('details.phone')}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="experience">Wine Experience</Label>
                      <Select
                        value={watch('details.experience')}
                        onValueChange={(value) => setValue('details.experience', value as any)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newbie">Newbie - Just getting started</SelectItem>
                          <SelectItem value="casual_fan">Casual Fan - Love it but don't know it</SelectItem>
                          <SelectItem value="appellation_aware">Appellation Aware - I know what an appellation is</SelectItem>
                          <SelectItem value="case_pro">Case Pro - I know a bushel</SelectItem>
                          <SelectItem value="sommelier">Sommelier - I am a Somm</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="time_zone">Time Zone</Label>
                      <Input
                        id="time_zone"
                        {...register('details.time_zone')}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="people_count">People Count</Label>
                      <Input
                        id="people_count"
                        type="number"
                        min="1"
                        {...register('details.people_count', { valueAsNumber: true })}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="share_cellar">Share My Cellar</Label>
                        <p className="text-sm text-gray-600">When enabled, others can search your cellar</p>
                      </div>
                      <Switch
                        id="share_cellar"
                        checked={watch('details.share_cellar')}
                        onCheckedChange={(checked) => setValue('details.share_cellar', checked)}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Taste & Style Preferences Tab */}
            <TabsContent value="taste" className="space-y-6">
              <TastePreferences
                data={watch('taste')}
                onChange={handleTasteChange}
              />
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="flex justify-end mt-8">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Profile
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </main>
  )
}
