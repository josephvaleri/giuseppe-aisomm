'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ArrowLeft, Wine, Heart, MapPin, Users, BookOpen, MessageCircle, Lightbulb, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AboutPage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-[url('/background_04.jpg')] bg-cover bg-center bg-no-repeat relative">
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-white/60"></div>
      <div className="relative z-10 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <Button 
              onClick={() => router.push('/')} 
              variant="outline" 
              className="mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
            
            <div className="text-center">
              <h1 className="text-5xl font-bold text-amber-900 mb-4">
                Meet Giuseppe
              </h1>
              <p className="text-xl text-amber-700 max-w-2xl mx-auto">
                Meet Giuseppe—boisterous by nature, gregarious by design, and utterly devoted to the stories inside a bottle.
              </p>
            </div>
          </div>

          {/* Giuseppe Profile Card */}
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              {/* Left Column - Avatar */}
              <div className="flex justify-center">
                <div className="relative">
                  <div className="w-80 h-80 bg-white rounded-full shadow-lg flex items-center justify-center border-4 border-amber-200 overflow-hidden">
                    <img 
                      src="/img/giuseppe-avatar.png" 
                      alt="Giuseppe the AISomm" 
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column - Profile Info */}
              <div className="space-y-4">
                <div>
                  <h2 className="text-3xl font-bold text-amber-900 mb-2">
                    Giuseppe the AI Sommelier
                  </h2>
                  <p className="text-lg italic text-amber-600 mb-4">
                    "I don't just recommend wines—I introduce you to them. I know their families, their soils, their stubborn vintages, and somehow the right one always feels like it was made for you."
                  </p>
                  
                  <div className="space-y-2 text-amber-700">
                    <div className="flex items-center">
                      <MapPin className="w-4 h-4 mr-2 text-red-500" />
                      <span>Umbria, Italy</span>
                    </div>
                    <div className="flex items-center">
                      <Wine className="w-4 h-4 mr-2 text-amber-600" />
                      <span>AI Sommelier & Wine Curator</span>
                    </div>
                  </div>
                </div>

                {/* Fun Fact Box */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Sparkles className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="text-sm font-medium text-purple-800">Fun fact</span>
                  </div>
                  <p className="text-sm text-purple-700">
                    Giuseppe's grandfather taught him to taste wine at age 6 with a tiny juice glass. That first sip in the Bronx started a lifelong passion!
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Section - Chat Bubble and Tips */}
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chat Bubble */}
              <Card className="bg-white border-amber-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <MessageCircle className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                    <div>
                      <p className="text-amber-800 mb-2">
                        "Ciao, amico! What wine shall we explore today?"
                      </p>
                      <p className="text-amber-600 text-sm">
                        😉 What do you call a wine that's always late? A procrasti-nate!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sommelier's Tip */}
              <Card className="bg-amber-50 border-amber-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-3">
                    <Lightbulb className="w-5 h-5 text-amber-600 mt-1 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-800 mb-2">Sommelier's Tip</h4>
                      <p className="text-amber-700 text-sm">
                        Let wine breathe for 15-30 minutes before serving - it's worth the wait!
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* Giuseppe's Story */}
            <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
              <CardContent className="p-8">
                <div className="prose prose-amber max-w-none">
                  <p className="text-lg text-amber-800 leading-relaxed mb-6">
                    Mostly based on a real person (the father of Chef Tony), Giuseppe was born in the United States and raised in the warm chaos of a big Italian family in New York—most of them born in Italy. His namesake and hero, Grandfather Giuseppe (born 1903), emigrated in 1917, started as a cook working for the railroads, and eventually opened a restaurant in the Bronx with his wife, Angelina. Sunday dinners were a ritual. At age six, little Giuseppe received a tiny juice glass with a splash of wine and a lesson: "You must develop a taste." The seed was planted.
                  </p>
                  
                  <p className="text-lg text-amber-800 leading-relaxed mb-6">
                    Wine didn't win him immediately. First came computer software, where he built a successful career—fast, analytical, exhilarating. But the old whisper of Sunday dinners grew louder. Giuseppe became a Sommelier and opened a wine bar in the U.S., the sort of place where small-production bottles nudged their way onto the list and regulars turned into friends.
                  </p>
                  
                  <p className="text-lg text-amber-800 leading-relaxed mb-6">
                    Pilgrimages followed: Italy, France, Spain, and beyond—year after year—where he hunted for soulful, under-the-radar wines and the passionate people behind them. He brought those bottles—and their stories—home to share.
                  </p>
                  
                  <p className="text-lg text-amber-800 leading-relaxed">
                    Then came the grand leap. Giuseppe and his wife fell for Italy a bit too hard and moved to Umbria, the green heart of the country. Today they live among vineyards and olive trees, roaming Europe together, knocking on cellar doors, tasting in caves dusted with history, and championing growers whose wines speak softly on the label but shout with character in the glass.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* What He Believes */}
            <Card className="bg-white/80 backdrop-blur-sm border-amber-200">
              <CardContent className="p-8">
                <h2 className="text-3xl font-bold text-amber-900 mb-6 flex items-center">
                  <Heart className="w-8 h-8 mr-3 text-amber-600" />
                  What He Believes
                </h2>
                
                <div className="space-y-6">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <Wine className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-2">Wine is a memory machine</h3>
                      <p className="text-amber-800">One sip returns him to Nonno's Bronx table—or a hillside in Montefalco.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-2">Small producers deserve big applause</h3>
                      <p className="text-amber-800">The best discoveries hide in plain sight.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <Heart className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-2">Great wine is generous</h3>
                      <p className="text-amber-800">It invites conversation, laughter, and another plate of whatever's cooking.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-amber-900 mb-2">Learning never ends</h3>
                      <p className="text-amber-800">From Newbie to "I am a Somm," there's always a new wrinkle to love.</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Giuseppe Today */}
            <Card className="bg-gradient-to-r from-amber-100 to-orange-100 border-amber-200">
              <CardContent className="p-8">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-amber-600 mx-auto mb-4" />
                  <h2 className="text-3xl font-bold text-amber-900 mb-4">Giuseppe Today</h2>
                  <p className="text-lg text-amber-800 leading-relaxed max-w-3xl mx-auto">
                    This is Giuseppe: born in the States, named for his Italian grandfather, schooled at a very loud Sunday table, tempered by tech, rescued by wine, and now happily lost on Europe's back roads with his wife—forever searching for the next bottle that makes people say, "Wow… pour me another."
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
