'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import { Menu, X, Wine, Settings, Shield, Plus, User, Info } from 'lucide-react'
import Link from 'next/link'

interface HamburgerMenuProps {
  user: any
}

export function HamburgerMenu({ user }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (user) {
      const getUserRole = async () => {
        try {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .single()
          
          setUserRole(roleData?.role || null)
        } catch (error) {
          console.error('Error fetching user role:', error)
        }
      }
      
      getUserRole()
    }
  }, [user, supabase])

  const toggleMenu = () => {
    setIsOpen(!isOpen)
  }

  const closeMenu = () => {
    setIsOpen(false)
  }

  if (!user) {
    return null
  }

  return (
    <div className="relative">
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleMenu}
        className="p-2 hover:bg-amber-50"
      >
        {isOpen ? (
          <X className="w-5 h-5 text-amber-700" />
        ) : (
          <Menu className="w-5 h-5 text-amber-700" />
        )}
      </Button>

      {/* Menu Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={closeMenu}
          />
          
          {/* Menu Content */}
          <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-amber-200 rounded-lg shadow-lg z-50">
            <div className="py-2">
              {/* Add Wine Button */}
              <Link href="/add-wine" onClick={closeMenu}>
                <div className="flex items-center px-4 py-3 text-amber-700 hover:bg-amber-50 cursor-pointer">
                  <Plus className="w-4 h-4 mr-3" />
                  <span className="text-sm font-medium">Add Wine to Cellar</span>
                </div>
              </Link>

              {/* My Cellar Link */}
              <Link href="/cellar" onClick={closeMenu}>
                <div className="flex items-center px-4 py-3 text-amber-700 hover:bg-amber-50 cursor-pointer">
                  <Wine className="w-4 h-4 mr-3" />
                  <span className="text-sm font-medium">My Cellar</span>
                </div>
              </Link>

              {/* My Profile Link */}
              <Link href="/profile" onClick={closeMenu}>
                <div className="flex items-center px-4 py-3 text-amber-700 hover:bg-amber-50 cursor-pointer">
                  <User className="w-4 h-4 mr-3" />
                  <span className="text-sm font-medium">My Profile</span>
                </div>
              </Link>

              {/* Meet Giuseppe Link */}
              <Link href="/about" onClick={closeMenu}>
                <div className="flex items-center px-4 py-3 text-amber-700 hover:bg-amber-50 cursor-pointer">
                  <Info className="w-4 h-4 mr-3" />
                  <span className="text-sm font-medium">Meet Giuseppe</span>
                </div>
              </Link>

              {/* Admin Link - Only for Admins */}
              {userRole === 'admin' && (
                <Link href="/admin" onClick={closeMenu}>
                  <div className="flex items-center px-4 py-3 text-amber-700 hover:bg-amber-50 cursor-pointer">
                    <Settings className="w-4 h-4 mr-3" />
                    <span className="text-sm font-medium">Admin</span>
                  </div>
                </Link>
              )}

              {/* Moderate Link - For Admins and Moderators */}
              {(userRole === 'admin' || userRole === 'moderator') && (
                <Link href="/moderation" onClick={closeMenu}>
                  <div className="flex items-center px-4 py-3 text-amber-700 hover:bg-amber-50 cursor-pointer">
                    <Shield className="w-4 h-4 mr-3" />
                    <span className="text-sm font-medium">Moderate</span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
