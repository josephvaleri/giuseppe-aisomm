'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Mic, MicOff, Send, ThumbsUp, ThumbsDown, LogIn, UserPlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import GrapeDetail from '@/components/GrapeDetail'
import GrapeLinkedText from '@/components/GrapeLinkedText'
import { getAllGrapeVarieties } from '@/lib/grape-linking'
import { useRouter } from 'next/navigation'
import { LabelScannerCard } from '@/components/LabelScannerCard'


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
  const [answers, setAnswers] = useState<Answer[]>([])
  const [isListening, setIsListening] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [feedback, setFeedback] = useState<Record<string, boolean | null>>({})
  const [grapeVarieties, setGrapeVarieties] = useState<string[]>([])
  const [selectedGrapeId, setSelectedGrapeId] = useState<number | null>(null)
  const [welcomeMessage, setWelcomeMessage] = useState<string>('')
  const [user, setUser] = useState<any>(null)
  const [trialDays, setTrialDays] = useState<number>(7)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  
  const recognitionRef = useRef<any>(null)
  const supabase = createClient()
  const router = useRouter()
  

  useEffect(() => {
    loadGrapeVarieties()
    loadWelcomeMessage()
    checkAuth()
    loadTrialDays()
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  // Check authentication status
  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    } catch (error) {
      console.error('Error checking auth:', error)
    } finally {
      setIsAuthLoading(false)
    }
  }

  // Load trial days from settings
  const loadTrialDays = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('trial_days')
        .eq('id', 1)
        .single()

      if (error) throw error
      setTrialDays(data?.trial_days || 7)
    } catch (error) {
      console.error('Error loading trial days:', error)
    }
  }

  // Load welcome message from settings
  const loadWelcomeMessage = async () => {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('announcement')
        .eq('id', 1)
        .single()

      if (error) throw error
      setWelcomeMessage(data?.announcement || '')
    } catch (error) {
      console.error('Error loading welcome message:', error)
    }
  }

  // Load grape varieties for linking
  const loadGrapeVarieties = async () => {
    try {
      const varieties = await getAllGrapeVarieties()
      console.log('Loaded grape varieties:', varieties.length, 'varieties')
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
        setQuestion('')
      } else {
        const errorAnswer: Answer = {
          id: Date.now().toString(),
          content: data.error || 'Sorry, I encountered an error. Please try again.',
          timestamp: new Date()
        }
        setAnswers(prev => [errorAnswer, ...prev])
      }
    } catch (error) {
      console.error('Error asking question:', error)
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


  // Handle grape link clicks
  const handleGrapeClick = (grapeId: number) => {
    setSelectedGrapeId(grapeId)
  }

  // Handle back from grape detail
  const handleBackFromGrape = () => {
    setSelectedGrapeId(null)
  }

  const formatAnswer = (content: string) => {
    // First, convert markdown links to HTML
    let linkedContent = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #7c2d12; text-decoration: underline;">$1</a>')
    
    // Split by lines and format
    const lines = linkedContent.split('\n')
    return lines.map((line, index) => {
      // Skip empty lines
      if (line.trim() === '') {
        return <br key={index} />
      }
      
      if (line.startsWith('*(') && line.endsWith(')*')) {
        return (
          <em key={index} className="text-amber-600 italic">
            {line}
          </em>
        )
      }
      
      // Always render GrapeLinkedText component to maintain hooks order
      return (
        <div key={index} className="mb-1">
          <GrapeLinkedText text={line} grapeVarieties={grapeVarieties} onGrapeClick={handleGrapeClick} />
        </div>
      )
    })
  }


  // Show loading state while checking authentication
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">G</span>
          </div>
          <p className="text-amber-700">Loading Giuseppe...</p>
        </div>
      </div>
    )
  }

  // Non-authenticated users see Giuseppe on left, login on right
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-amber-900 mb-2">
                Giuseppe AI Sommelier
              </h1>
              <p className="text-amber-700 text-lg">
                Your personal wine expert, ready to answer any question
              </p>
              {/* Free Trial Message */}
              <div className="mt-4 p-4 bg-amber-100 border border-amber-300 rounded-lg">
                <p className="text-amber-800 font-semibold">
                  🍷 Free {trialDays} Day Trial • No credit card required
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column: Giuseppe */}
              <div className="flex flex-col space-y-6">
                <Card className="p-6 bg-transparent border-0 relative">
                  <div className="text-center">
                    {/* Static Giuseppe Avatar */}
                    <div className="relative mb-4 flex justify-center">
                      <img
                        src="/img/giuseppe-avatar.png"
                        alt="Giuseppe AI Sommelier"
                        className="max-w-full max-h-40 w-auto h-auto object-contain rounded-lg"
                      />
                    </div>
                    
                    <Badge 
                      variant="default"
                      className="mb-4"
                    >
                      Ready to help
                    </Badge>
                    
                    <p className="text-amber-800 text-sm">
                      Sign up for your free trial to start asking me questions about wine!
                    </p>
                    
                    {/* Ask Giuseppe Input */}
                    <div className="mt-6 space-y-4">
                      <Textarea
                        placeholder={
                          selectedGrapeId 
                            ? "Ask a new question to return to answers, or ask about this grape..."
                            : "Ask Giuseppe anything about wine... (e.g., 'What wine pairs with pasta?', 'Tell me about Chianti', 'How do I build a wine cellar?')"
                        }                                                   
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        className="min-h-[120px] resize-none border-amber-300 focus:border-amber-500 bg-white/70"
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
                          className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600 disabled:opacity-100 px-8"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Ask Giuseppe!
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Right Column: Login/Auth */}
              <div className="flex flex-col">
                <Card className="p-6 bg-white/70 backdrop-blur-sm border-amber-200 h-full">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-amber-900 mb-2">
                      Get Started with Giuseppe
                    </h2>
                    <p className="text-amber-700">
                      Sign up for your free trial and start exploring the world of wine
                    </p>
                  </div>

                  <div className="space-y-4">
                    <Button
                      onClick={() => router.push('/auth')}
                      className="w-full bg-amber-600 hover:bg-amber-700 py-3"
                      size="lg"
                    >
                      <UserPlus className="w-5 h-5 mr-2" />
                      Start Free Trial
                    </Button>

                    <Button
                      onClick={() => router.push('/auth')}
                      variant="outline"
                      className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 py-3"
                      size="lg"
                    >
                      <LogIn className="w-5 h-5 mr-2" />
                      Sign In
                    </Button>
                  </div>

                  <div className="mt-6 p-4 bg-amber-50 rounded-lg">
                    <h3 className="font-semibold text-amber-900 mb-2">What you get:</h3>
                    <ul className="text-sm text-amber-700 space-y-1">
                      <li>• Unlimited wine questions</li>
                      <li>• Personalized recommendations</li>
                      <li>• Food pairing suggestions</li>
                      <li>• Wine education and tips</li>
                    </ul>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Authenticated users see the full interface
  return (
    <div className="min-h-screen bg-[url('/background_03.jpg')] bg-cover bg-center bg-no-repeat relative">
      {/* 50% fade overlay */}
      <div className="absolute inset-0 bg-white/50"></div>
      
      {/* Content with proper layering */}
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              Giuseppe AI Sommelier
            </h1>
            <p className="text-amber-700 text-lg">
              Your personal wine expert, ready to answer any question
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column: Giuseppe and Question Input */}
            <div className="flex flex-col space-y-6">
              {/* Giuseppe Avatar Card */}
              <Card className="p-6 bg-transparent border-0 relative">
                <div className="text-center">
                  {/* Static Giuseppe Avatar */}
                  <div className="relative mb-4 flex justify-center">
                    <img
                      src="/img/giuseppe-avatar.png"
                      alt="Giuseppe AI Sommelier"
                      className="max-w-full max-h-40 w-auto h-auto object-contain rounded-lg"
                    />
                  </div>
                  
                  <Badge 
                    variant="default"
                    className="mb-4"
                  >
                    <button 
                      onClick={() => router.push('/about')}
                      className="hover:underline cursor-pointer"
                    >
                      Meet Giuseppe
                    </button>
                  </Badge>
                  
                  <p className="text-amber-800 text-sm">
                    Ask me anything about wine!
                  </p>
                  
                  {/* Ask Giuseppe Input */}
                  <div className="mt-6 space-y-4">
                    <Textarea
                      placeholder={
                        selectedGrapeId 
                          ? "Ask a new question to return to answers, or ask about this grape..."
                          : "Ask Giuseppe anything about wine... (e.g., 'What wine pairs with pasta?', 'Tell me about Chianti', 'How do I build a wine cellar?')"
                      }                                                   
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="min-h-[120px] resize-none border-amber-300 focus:border-amber-500 bg-white/70"
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
                        className="bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600 disabled:opacity-100 px-8"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Ask Giuseppe!
                      </Button>
                    </div>
                  </div>
                </div>
                
                {/* Voice Button - Bottom Right */}
                <div className="absolute bottom-4 right-4">
                  <Button
                    onClick={isListening ? stopListening : startListening}
                    variant={isListening ? 'destructive' : 'outline'}
                    size="sm"
                    disabled={isLoading}
                    className="rounded-full w-12 h-12 p-0"
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </Button>
                </div>
              </Card>


            </div>

            {/* Right Column: Label Scanner + Answers or Grape Detail */}
            <div className="flex flex-col space-y-6">
              {/* Label Scanner - NEW */}
              <LabelScannerCard />
              
              {selectedGrapeId ? (
                <GrapeDetail 
                  grapeId={selectedGrapeId} 
                  onBack={handleBackFromGrape}
                />
              ) : (
                <Card className="p-6 bg-white/70 backdrop-blur-sm border-amber-200 h-full">
                  <div className="space-y-4">
                    {answers.length === 0 && welcomeMessage ? (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200"
                      >
                        <div className="prose prose-amber max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: welcomeMessage }} />
                        </div>
                      </motion.div>
                    ) : (
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
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
      e.preventDefault()
      e.stopPropagation()
      
                                      console.log('Thumbs up clicked for answer:', answer.id, 'qaId:', answer.qaId)
                                      console.log('Current feedback state:', feedback)
                                      handleFeedback(answer.id, true, answer.qaId)
                                    }}
                                    disabled={feedback[answer.id] === true || feedback[answer.id] === false}
                                    className={`h-8 w-8 p-0 rounded border flex items-center justify-center ${
                                      feedback[answer.id] === true 
                                        ? 'bg-amber-600 text-white border-amber-600' 
                                        : 'bg-white text-amber-600 border-amber-300 hover:bg-amber-50'
                                    } ${(feedback[answer.id] === true || feedback[answer.id] === false) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                  >
                                    <ThumbsUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onMouseDown={(e) => {
      e.preventDefault()
      e.stopPropagation()
      
                                      console.log('Thumbs down clicked for answer:', answer.id, 'qaId:', answer.qaId)
                                      console.log('Current feedback state:', feedback)
                                      handleFeedback(answer.id, false, answer.qaId)
                                    }}
                                    disabled={feedback[answer.id] === true || feedback[answer.id] === false}
                                    className={`h-8 w-8 p-0 rounded border flex items-center justify-center ${
                                      feedback[answer.id] === false 
                                        ? 'bg-red-600 text-white border-red-600' 
                                        : 'bg-white text-red-600 border-red-300 hover:bg-red-50'
                                    } ${(feedback[answer.id] === true || feedback[answer.id] === false) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                    )}
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
