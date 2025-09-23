'use client'

import Link from 'next/link'
import { useUserRole } from '@/components/auth/user-role'

export function Footer() {
  const { isAdmin, isLoading } = useUserRole()

  if (isLoading) {
    return null
  }

  return (
    <footer className="bg-amber-900 text-amber-100 py-8 mt-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold mb-2">Giuseppe the AISomm</h3>
            <p className="text-amber-200 text-sm">
              Your personal wine expert, powered by AI
            </p>
          </div>
          
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
            <div className="flex space-x-4">
              <Link 
                href="/" 
                className="text-amber-200 hover:text-white transition-colors text-sm"
              >
                Home
              </Link>
              <Link 
                href="/auth/login" 
                className="text-amber-200 hover:text-white transition-colors text-sm"
              >
                Sign In
              </Link>
            </div>
            
            {isAdmin && (
              <div className="flex space-x-4 border-l border-amber-700 pl-4">
                <Link 
                  href="/admin" 
                  className="text-amber-200 hover:text-white transition-colors text-sm font-medium"
                >
                  Admin
                </Link>
                <Link 
                  href="/moderation" 
                  className="text-amber-200 hover:text-white transition-colors text-sm font-medium"
                >
                  Moderate
                </Link>
              </div>
            )}
          </div>
        </div>
        
        <div className="border-t border-amber-800 mt-6 pt-6 text-center">
          <p className="text-amber-300 text-xs">
            © 2024 Giuseppe the AISomm. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
