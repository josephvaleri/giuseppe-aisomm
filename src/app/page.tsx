'use client'

import AuthWrapper from '@/components/auth-wrapper'
import HomePageContent from './home-page'

export default function HomePage() {
  return (
    <AuthWrapper>
      <HomePageContent />
    </AuthWrapper>
  )
}
