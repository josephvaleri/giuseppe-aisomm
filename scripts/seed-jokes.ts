import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const wineJokes = [
  {
    category: 'general',
    joke: 'Why did the wine go to therapy? Because it had too many issues with its vintage!'
  },
  {
    category: 'red',
    joke: 'What do you call a red wine that\'s always late? A procrastinating Cabernet!'
  },
  {
    category: 'white',
    joke: 'Why don\'t white wines ever get cold? Because they\'re always chilled!'
  },
  {
    category: 'sparkling',
    joke: 'What\'s a sparkling wine\'s favorite type of music? Pop!'
  },
  {
    category: 'relationships',
    joke: 'Why did the wine break up with the beer? Because it said "You\'re too bitter for me!"'
  },
  {
    category: 'work',
    joke: 'What do you call a wine that works in IT? A server!'
  },
  {
    category: 'food',
    joke: 'Why did the wine go well with the cheese? Because they were both aged to perfection!'
  },
  {
    category: 'travel',
    joke: 'What do you call a wine that travels a lot? A globe-trotting grape!'
  },
  {
    category: 'vineyard',
    joke: 'Why did the grape refuse to leave the vineyard? Because it was having too much fun hanging around!'
  },
  {
    category: 'misc',
    joke: 'What\'s a wine\'s favorite type of exercise? Grape-vine!'
  },
  {
    category: 'general',
    joke: 'Why did the sommelier go to art school? To learn how to paint with wine!'
  },
  {
    category: 'red',
    joke: 'What do you call a red wine that tells jokes? A comedian Cabernet!'
  },
  {
    category: 'white',
    joke: 'Why did the white wine go to the beach? To get a tan!'
  },
  {
    category: 'sparkling',
    joke: 'What\'s a sparkling wine\'s favorite dance? The bubbly!'
  },
  {
    category: 'relationships',
    joke: 'Why did the wine and the glass get married? Because they were a perfect match!'
  },
  {
    category: 'work',
    joke: 'What do you call a wine that\'s always working? A hard-working grape!'
  },
  {
    category: 'food',
    joke: 'Why did the wine love the pasta? Because they were both Italian!'
  },
  {
    category: 'travel',
    joke: 'What do you call a wine that visits France? A French tourist!'
  },
  {
    category: 'vineyard',
    joke: 'Why did the grapevine go to the doctor? Because it was feeling a little vine!'
  },
  {
    category: 'misc',
    joke: 'What\'s a wine\'s favorite type of weather? Grape weather!'
  }
]

async function seedJokes() {
  try {
    console.log('Seeding wine jokes...')
    
    for (const joke of wineJokes) {
      const { error } = await supabase
        .from('wine_jokes')
        .insert(joke)
      
      if (error) {
        console.error('Error inserting joke:', error)
      } else {
        console.log(`Inserted joke: ${joke.joke}`)
      }
    }
    
    console.log('Jokes seeded successfully!')
  } catch (error) {
    console.error('Error seeding jokes:', error)
  }
}

seedJokes()
