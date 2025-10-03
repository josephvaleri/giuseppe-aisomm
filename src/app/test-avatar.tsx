'use client'

import { AvatarLayered } from '@/components/AvatarLayered'
import { useBlink } from '@/hooks/useBlink'

export default function TestAvatar() {
  const blinking = useBlink()
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-amber-900 mb-4">Avatar Test</h1>
        <AvatarLayered
          baseSrc="/giuseppe_v3_layers/giuseppe_root/base_open.png"
          eyesClosedSrc="/giuseppe_v3_layers/giuseppe_root/eyes_closed.png"
          answering={false}
          level={0}
          blinking={blinking}
          className="w-64 h-64"
        />
        <p className="text-amber-700 mt-4">If you can see Giuseppe, the avatar is working!</p>
      </div>
    </div>
  )
}
