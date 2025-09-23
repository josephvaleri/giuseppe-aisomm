'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Send, ThumbsUp, ThumbsDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import GiuseppeAvatar from '@/components/GiuseppeAvatar'
import GrapeDetail from '@/components/GrapeDetail'
import { detectGrapeNames, getAllGrapeVarieties, createGrapeLinks, GrapeMatch } from '@/lib/grape-linking'

type AvatarState = 'WAITING' | 'ANSWERING' | 'ERROR'

interface Answer {
  id: string
  content: string
  qaId?: number
  timestamp: Date
}

// Extend Window interface for SpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: any
  }
}

export default function HomePageContent() {
  const [question, setQuestion] = useState('')
  const [avatarState, setAvatarState] = useState<AvatarState>('WAITING')
  const [answers, setAnswers] = useState<Answer[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, boolean | null>>({})
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({})
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [grapeVarieties, setGrapeVarieties] = useState<string[]>([])
  const [selectedGrapeId, setSelectedGrapeId] = useState<number | null>(null)
  
  const recognitionRef = useRef<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadAvatarUrls()
    loadGrapeVarieties()
  }, [])

  // Load grape varieties for linking
  const loadGrapeVarieties = async () => {
    try {
      const varieties = await getAllGrapeVarieties()
      setGrapeVarieties(varieties)
    } catch (error) {
      console.error('Error loading grape varieties:', error)
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      recognitionRef.current = new window.webkitSpeechRecognition()
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false
      recognitionRef.current.lang = 'en-US'

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setQuestion(transcript)
        setIsListening(false)
      }

      recognitionRef.current.onerror = () => {
        setIsListening(false)
      }

      recognitionRef.current.onend = () => {
        setIsListening(false)
      }
    }
  }, [])

  const loadAvatarUrls = async () => {
    try {
      const avatarTypes = ['waiting', 'answering', 'error']
      const urls: Record<string, string> = {}
      
      for (const type of avatarTypes) {
        const { data } = supabase.storage
          .from('giuseppe-avatars')
          .getPublicUrl(`${type}.png`)
        urls[type] = data.publicUrl
      }
      
      setAvatarUrls(urls)
    } catch (error) {
      console.error('Error loading avatar URLs:', error)
    }
  }

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true)
      recognitionRef.current.start()
    }
  }

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
      setIsListening(false)
    }
  }

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return

    // Reset to answers view when asking a new question
    setSelectedGrapeId(null)
    
    setIsLoading(true)
    setAvatarState('ANSWERING')
    
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ question }),
      })

      const data = await response.json()

      if (response.ok) {
        const newAnswer: Answer = {
          id: Date.now().toString(),
          content: data.answer,
          qaId: data.qaId,
          timestamp: new Date()
        }
        
        setAnswers(prev => [newAnswer, ...prev])
        setAvatarState('WAITING')
        setQuestion('')
      } else {
        setAvatarState('ERROR')
        const errorAnswer: Answer = {
          id: Date.now().toString(),
          content: data.error || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        }
        setAnswers(prev => [errorAnswer, ...prev])
      }
    } catch (error) {
      console.error('Error asking question:', error)
      setAvatarState('ERROR')
      const errorAnswer: Answer = {
        id: Date.now().toString(),
        content: 'Sorry, I encountered a network error. Please try again.',
        timestamp: new Date()
      }
      setAnswers(prev => [errorAnswer, ...prev])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (answerId: string, thumbsUp: boolean, qaId?: number) => {
    console.log('handleFeedback called:', { answerId, thumbsUp, qaId })
    
    if (!qaId) {
      console.error('No qaId provided for feedback')
      return
    }

    // Update UI immediately
    setFeedback(prev => ({ ...prev, [answerId]: thumbsUp }))

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ qaId, thumbsUp }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('Feedback API error:', errorData)
        setFeedback(prev => ({ ...prev, [answerId]: null }))
        return
      }

      const result = await response.json()
      console.log('Feedback submitted successfully:', result)
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setFeedback(prev => ({ ...prev, [answerId]: null }))
    }
  }

  const getAvatarImage = () => {
    const stateKey = avatarState.toLowerCase() as keyof typeof avatarUrls
    return avatarUrls[stateKey] || '/Giuseppe_001.png'
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
  }

  // Handle grape link clicks
  const handleGrapeClick = (grapeId: number) => {
    setSelectedGrapeId(grapeId)
  }

  // Handle back from grape detail
  const handleBackFromGrape = () => {
    setSelectedGrapeId(null)
  }

  const formatAnswer = (content: string) => {
    // Detect grape names and create links
    const grapeMatches = detectGrapeNames(content, grapeVarieties)
    
    // For now, we'll create a simple version without async linking
    // The full async version would require state management for linked content
    let linkedContent = content
    
    if (grapeMatches.length > 0) {
      // Create simple links without grape IDs for now
      const sortedMatches = grapeMatches.sort((a, b) => b.grape_variety.length - a.grape_variety.length)
      
      for (const match of sortedMatches) {
        const regex = new RegExp(`\\b${match.grape_variety}\\b`, 'gi')
        linkedContent = linkedContent.replace(regex, `<span class="grape-link" data-grape-name="${match.grape_variety}" style="color: #7c2d12; text-decoration: underline; cursor: pointer; font-weight: 500;">${match.grape_variety}</span>`)
      }
    }

    // Split by lines and format
    const lines = linkedContent.split('\n')
    return lines.map((line, index) => {
      if (line.startsWith('*(') && line.endsWith(')*')) {
        return (
          <em key={index} className="text-amber-600 italic">
            {line}
          </em>
        )
      }
      
      // Check if line contains grape links
      if (line.includes('grape-link')) {
        return (
          <span 
            key={index}
            dangerouslySetInnerHTML={{ __html: line }}
            onClick={async (e) => {
              const target = e.target as HTMLElement
              if (target.classList.contains('grape-link')) {
                const grapeName = target.getAttribute('data-grape-name')
                if (grapeName) {
                  // Get grape ID from database
                  const { data } = await supabase
                    .from('grapes')
                    .select('grape_id')
                    .eq('grape_variety', grapeName)
                    .single()
                  
                  if (data?.grape_id) {
                    handleGrapeClick(data.grape_id)
                  }
                }
              }
            }}
          />
        )
      }
      
      return (
        <span key={index}>
          {line}
          {index < lines.length - 1 && <br />}
        </span>
      )
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              Giuseppe the AISomm
            </h1>
            <p className="text-amber-700 text-lg">
              Your personal wine expert, ready to answer any question
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Giuseppe and Question Input */}
            <div className="flex flex-col space-y-6">
              {/* Giuseppe Avatar Card */}
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 relative">
                <div className="text-center">
                  {/* Animated Giuseppe Avatar */}
                  <div className="relative mb-4 flex justify-center">
                    <GiuseppeAvatar 
                      className="max-w-full max-h-80 w-auto h-auto object-contain rounded-lg shadow-lg"
                      src={getAvatarImage()}
                      alt="Giuseppe"
                      isThinking={avatarState === 'ANSWERING'}
                    />
                  </div>
                  
                  <Badge 
                    variant={avatarState === 'ERROR' ? 'destructive' : 'default'}
                    className="mb-4"
                  >
                    {avatarState === 'WAITING' && 'Ready to help'}
                    {avatarState === 'ANSWERING' && 'Thinking...'}
                    {avatarState === 'ERROR' && 'Oops!'}
                  </Badge>
                  
                  <p className="text-amber-800 text-sm">
                    {avatarState === 'WAITING' && 'Ask me anything about wine!'}
                    {avatarState === 'ANSWERING' && 'Let me think about that...'}
                    {avatarState === 'ERROR' && 'Something went wrong'}
                  </p>
                </div>
                
                {/* Voice Button - Bottom Right */}
                <div className="absolute bottom-4 right-4">
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    variant={isListening ? 'destructive' : 'outline'}
                    size="sm"
                    disabled={isLoading}
                    className="rounded-full w-12 h-12 p-0 shadow-lg"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </div>
              </Card>

              {/* Question Input Card */}
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                <div className="space-y-4">
                  <Textarea
                    placeholder={
                      selectedGrapeId 
                        ? "Ask a new question to return to answers, or ask about this grape..."
                        : "Ask Giuseppe anything about wine... (e.g., 'What wine pairs with pasta?', 'Tell me about Chianti', 'How do I build a wine cellar?')"
                    }                                                   
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="min-h-[120px] resize-none border-amber-300 focus:border-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit()
                      }
                    }}
                  />
                  
                  <div className="flex justify-center">
                    <Button
                      onClick={handleSubmit}
                      disabled={!question.trim() || isLoading}
                      className="bg-amber-600 hover:bg-amber-700 px-8"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Ask Giuseppe!
                    </Button>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Column: Answers or Grape Detail */}
            <div className="flex flex-col">
              {selectedGrapeId ? (
                <GrapeDetail 
                  grapeId={selectedGrapeId} 
                  onBack={handleBackFromGrape}
                />
              ) : (
                <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 h-full">
                  <div className="space-y-4">
                    <AnimatePresence>
                      {answers.map((answer) => (
                        <motion.div
                          key={answer.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -20, scale: 0.95 }}
                          transition={{ duration: 0.3 }}
                          className="p-4 bg-amber-50/50 rounded-lg border border-amber-200"
                        >
                          <div className="space-y-4">
                            <div className="prose prose-amber max-w-none">
                              {formatAnswer(answer.content)}
                            </div>
                            
                            {answer.qaId && (
                              <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
                                <span className="text-sm text-amber-600">Was this helpful?</span>
                                <span className="text-xs text-gray-500">(ID: {answer.qaId})</span>
                                {console.log('Rendering feedback buttons for answer:', answer.id, 'qaId:', answer.qaId, 'feedback state:', feedback[answer.id])}
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      console.log('Thumbs up clicked for answer:', answer.id, 'qaId:', answer.qaId)
                                      console.log('Current feedback state:', feedback)
                                      handleFeedback(answer.id, true, answer.qaId)
                                    }}
                                    disabled={feedback[answer.id] !== null}
                                    className={`h-8 w-8 p-0 rounded border flex items-center justify-center ${
                                      feedback[answer.id] === true 
                                        ? 'bg-amber-600 text-white border-amber-600' 
                                        : 'bg-white text-amber-600 border-amber-300 hover:bg-amber-50'
                                    } ${feedback[answer.id] !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      console.log('Thumbs down clicked for answer:', answer.id, 'qaId:', answer.qaId)
                                      console.log('Current feedback state:', feedback)
                                      handleFeedback(answer.id, false, answer.qaId)
                                    }}
                                    disabled={feedback[answer.id] !== null}
                                    className={`h-8 w-8 p-0 rounded border flex items-center justify-center ${
                                      feedback[answer.id] === false 
                                        ? 'bg-red-600 text-white border-red-600' 
                                        : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
                                    } ${feedback[answer.id] !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    <ThumbsDown className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
