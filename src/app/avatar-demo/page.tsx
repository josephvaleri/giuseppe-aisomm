'use client'

import GiuseppeAvatar from '@/components/GiuseppeAvatar'

export default function AvatarDemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-amber-900 mb-8">
          Giuseppe Avatar Demo
        </h1>
        
        <div className="space-y-8">
          {/* Default Giuseppe Avatar */}
          <div>
            <h2 className="text-xl font-semibold text-amber-800 mb-4">
              Default Giuseppe Avatar
            </h2>
            <GiuseppeAvatar />
          </div>
          
          {/* Custom sized Giuseppe Avatar */}
          <div>
            <h2 className="text-xl font-semibold text-amber-800 mb-4">
              Custom Sized Giuseppe Avatar
            </h2>
            <GiuseppeAvatar 
              className="w-32 h-auto"
            />
          </div>
          
          {/* Giuseppe Avatar with custom image */}
          <div>
            <h2 className="text-xl font-semibold text-amber-800 mb-4">
              Giuseppe Avatar with Custom Image
            </h2>
            <GiuseppeAvatar 
              src="/avatars/waiting.png"
              alt="Giuseppe Waiting"
              className="w-48 h-auto"
            />
          </div>
        </div>
        
        <div className="mt-8 p-4 bg-white/80 rounded-lg border border-amber-200">
          <p className="text-amber-700 text-sm">
            <strong>Features:</strong> Subtle breathing animation (4-second cycle) and natural blinking (every 7-10 seconds)
          </p>
        </div>
      </div>
    </div>
  )
}
