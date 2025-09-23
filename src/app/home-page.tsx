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
  
  const recognitionRef = useRef<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadAvatarUrls()
  }, [])

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

    setIsLoading(true)
    setAvatarState('ANSWERING')
    
    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    if (!qaId) return

    setFeedback(prev => ({ ...prev, [answerId]: thumbsUp }))

    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ qaId, thumbsUp }),
      })
    } catch (error) {
      console.error('Error submitting feedback:', error)
      setFeedback(prev => ({ ...prev, [answerId]: null }))
    }
  }

  const getAvatarImage = () => {
    const stateKey = avatarState.toLowerCase() as keyof typeof avatarUrls
    return avatarUrls[stateKey] || '/avatars/waiting.png'
  }

  const handleImageLoad = () => {
    setImageLoaded(true)
    setImageError(false)
  }

  const handleImageError = () => {
    setImageError(true)
    setImageLoaded(false)
  }

  const formatAnswer = (content: string) => {
    // Split by lines and format
    const lines = content.split('\n')
    return lines.map((line, index) => {
      if (line.startsWith('*(') && line.endsWith(')*')) {
        return (
          <em key={index} className="text-amber-600 italic">
            {line}
          </em>
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
            {/* Left: Avatar */}
            <div className="flex flex-col items-center">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200 w-full max-w-md">
                <div className="text-center">
                  {/* Dynamic Avatar Container */}
                  <div className="relative mb-4 flex justify-center">
                    {!imageError ? (
                      <div className="relative">
                        <img
                          src={getAvatarImage()}
                          alt="Giuseppe"
                          className="max-w-full max-h-80 w-auto h-auto object-contain rounded-lg shadow-lg"
                          onLoad={handleImageLoad}
                          onError={handleImageError}
                          style={{
                            minHeight: imageLoaded ? 'auto' : '200px',
                            minWidth: imageLoaded ? 'auto' : '200px'
                          }}
                        />
                        {!imageLoaded && !imageError && (
                          <div className="absolute inset-0 flex items-center justify-center bg-amber-50 rounded-lg">
                            <div className="animate-pulse text-amber-600">Loading...</div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <Avatar className="w-32 h-32 mx-auto">
                        <AvatarFallback className="bg-amber-600 text-white text-2xl font-bold">
                          GS
                        </AvatarFallback>
                      </Avatar>
                    )}
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
              </Card>
            </div>

            {/* Right: Question Input */}
            <div className="space-y-6">
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-amber-200">
                <div className="space-y-4">
                  <Textarea
                    placeholder="Ask Giuseppe anything about wine... (e.g., 'What wine pairs with pasta?', 'Tell me about Chianti', 'How do I build a wine cellar?')"                                                   
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
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={isListening ? stopListening : startListening}
                      variant={isListening ? 'destructive' : 'outline'}
                      size="sm"
                      disabled={isLoading}
                    >
                      {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      {isListening ? 'Stop' : 'Voice'}
                    </Button>
                    
                    <Button
                      onClick={handleSubmit}
                      disabled={!question.trim() || isLoading}
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Ask Giuseppe!
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Answers */}
              <div className="space-y-4">
                <AnimatePresence>
                  {answers.map((answer) => (
                    <motion.div
                      key={answer.id}
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -20, scale: 0.95 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Card className="p-6 bg-white/90 backdrop-blur-sm border-amber-200">
                        <div className="space-y-4">
                          <div className="prose prose-amber max-w-none">
                            {formatAnswer(answer.content)}
                          </div>
                          
                          {answer.qaId && (
                            <div className="flex items-center gap-2 pt-2 border-t border-amber-200">
                              <span className="text-sm text-amber-600">Was this helpful?</span>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant={feedback[answer.id] === true ? 'default' : 'outline'}
                                  onClick={() => handleFeedback(answer.id, true, answer.qaId)}
                                  disabled={feedback[answer.id] !== null}
                                  className="h-8 w-8 p-0"
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant={feedback[answer.id] === false ? 'destructive' : 'outline'}
                                  onClick={() => handleFeedback(answer.id, false, answer.qaId)}
                                  disabled={feedback[answer.id] !== null}
                                  className="h-8 w-8 p-0"
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
