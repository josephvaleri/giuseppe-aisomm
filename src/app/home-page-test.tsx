'use client'

import { useState, useEffect } from 'react'

export default function HomePageTest() {
  const [message, setMessage] = useState('Loading...')

  useEffect(() => {
    setMessage('Component loaded successfully!')
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              Giuseppe the AISomm - Test
            </h1>
            <p className="text-amber-700 text-lg">
              {message}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
