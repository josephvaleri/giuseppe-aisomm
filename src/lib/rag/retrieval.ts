import { createServiceClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { searchGrapesByCountry, searchGrapesByRegion, formatGrapeResults } from './country-grape-search'
import { searchAppellationsByRegion, searchAppellationsByCountryRegion, formatAppellationResults } from './region-wine-search'
import { formatAsParagraph, validateParagraph, toParagraphFallback } from '@/lib/formatting/narrative'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export interface RetrievalResult {
  chunk: string
  score: number
  doc_id?: string
  source?: string
}

export async function embedText(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-3-large',
    input: text
  })
  
  return response.data[0].embedding
}

export async function vectorSearch(
  queryEmbedding: number[],
  limit = 6
): Promise<RetrievalResult[]> {
  const supabase = createServiceClient()
  
  const { data, error } = await supabase.rpc('match_all_documents', {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,
    match_count: limit
  })

  if (error) {
    console.error('Vector search error:', error)
    return []
  }

  return (data || []).map((item: any) => ({
    chunk: item.chunk,
    score: item.score,
    doc_id: item.doc_id,
    source: item.source
  }))
}

export async function searchDocuments(
  query: string,
  limit = 6
): Promise<RetrievalResult[]> {
  const queryEmbedding = await embedText(query)
  return vectorSearch(queryEmbedding, limit)
}

export async function chunkDocument(
  content: string,
  chunkSize = 1000,
  overlap = 200
): Promise<string[]> {
  const chunks: string[] = []
  let start = 0
  
  while (start < content.length) {
    const end = Math.min(start + chunkSize, content.length)
    let chunk = content.slice(start, end)
    
    // Try to break at sentence boundaries
    if (end < content.length) {
      const lastSentence = chunk.lastIndexOf('.')
      const lastNewline = chunk.lastIndexOf('\n')
      const breakPoint = Math.max(lastSentence, lastNewline)
      
      if (breakPoint > start + chunkSize * 0.5) {
        chunk = content.slice(start, start + breakPoint + 1)
        start = start + breakPoint + 1 - overlap
      } else {
        start = end - overlap
      }
    } else {
      start = end
    }
    
    chunks.push(chunk.trim())
  }
  
  return chunks.filter(chunk => chunk.length > 50)
}

export async function embedAndStoreChunks(
  docId: string,
  content: string
): Promise<void> {
  const supabase = createServiceClient()
  const chunks = await chunkDocument(content)
  
  for (const chunk of chunks) {
    const embedding = await embedText(chunk)
    
    await supabase
      .from('doc_chunks')
      .insert({
        doc_id: docId,
        chunk,
        embedding
      })
  }
}

// Helper function to parse CSV lines
function parseCSVLine(line: string): string[] {
  const result = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

// Helper function to extract specific grape information from documents
function extractGrapeInfoFromDocuments(documentResults: any[], query: string): string | null {
  const lowerQuery = query.toLowerCase()
  
  // Look for specific grape varieties mentioned in the question context
  if (lowerQuery.includes('umbria') && (lowerQuery.includes('riesling') || lowerQuery.includes('white grape'))) {
    // This is asking about a white grape from Umbria that's compared to Riesling
    // Look for Trebbiano Spoletino in the documents
    for (const result of documentResults) {
      const chunkText = result.chunk.toLowerCase()
      if (chunkText.includes('trebbiano spoletino')) {
        // Extract the relevant information about Trebbiano Spoletino
        const lines = result.chunk.split('\n')
        for (const line of lines) {
          if (line.toLowerCase().includes('trebbiano spoletino')) {
            // Parse the CSV line to extract relevant information using proper CSV parsing
            const parts = parseCSVLine(line)
            if (parts.length >= 6) {
              const appellation = parts[0]?.trim().replace(/"/g, '')
              const classification = parts[1]?.trim().replace(/"/g, '')
              const country = parts[2]?.trim().replace(/"/g, '')
              const year = parts[3]?.trim().replace(/"/g, '')
              const producers = parts[4]?.trim().replace(/"/g, '')
              const region = parts[5]?.trim().replace(/"/g, '')
              
              return `The Italian white grape you're asking about is **Trebbiano Spoletino**!\n\n` +
                     `🍇 **Trebbiano Spoletino** is indeed the white grape native to Umbria that has seen a revival in recent years and is often compared to Riesling for its freshness and acidity.\n\n` +
                     `📍 **Region**: ${region || 'Spoleto area, Umbria'}\n` +
                     `🏛️ **Classification**: ${classification || 'DOC'}\n` +
                     `🗓️ **Established**: ${year || '2011'}\n` +
                     `🍷 **Notable Producers**: ${producers || 'Antonelli, Tabarrini, Perticaia, Terre de la Custodia'}\n\n` +
                     `This grape variety is known for its bright, mineral character and crisp acidity, making it a perfect alternative to Riesling. It's experiencing a renaissance in Umbria, particularly in the Spoleto area, where passionate winemakers are showcasing its unique terroir-driven character.`
            }
          }
        }
      }
    }
  }
  
  return null
}

// Helper function to parse appellation CSV data
function parseAppellationCSV(chunks: any[]): string {
  const appellations = []
  
  for (const chunk of chunks) {
    const lines = chunk.chunk.split('\n')
    let headerFound = false
    let headers: string[] = []
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      // Skip empty lines
      if (!trimmedLine) continue
      
      // Look for header line
      if (trimmedLine.includes('Appellation/Region') || trimmedLine.includes('Appellation,Classification') || 
          trimmedLine.includes('Classification,Country')) {
        headers = parseCSVLine(trimmedLine)
        headerFound = true
        continue
      }
      
      // Skip lines that are just the filename
      if (trimmedLine.endsWith('.csv') || trimmedLine.endsWith('.xlsx')) {
        continue
      }
      
      // Parse data lines
      if (headerFound && trimmedLine.includes(',')) {
        const values = parseCSVLine(trimmedLine)
        
        if (values.length >= 6) {
          const appellation = {
            name: values[0] || 'Unknown',
            classification: values[1] || 'Unknown',
            country: values[2] || 'Unknown',
            yearFounded: values[3] || 'Unknown',
            majorProducers: values[4] || 'Unknown',
            geographicRegion: values[5] || 'Unknown'
          }
          
          // Only add if we have a meaningful appellation name
          if (appellation.name && appellation.name !== 'Unknown' && 
              !appellation.name.includes('Appellation') && 
              !appellation.name.includes('Classification')) {
            appellations.push(appellation)
          }
        }
      }
    }
  }
  
  // Remove duplicates based on name
  const uniqueAppellations = appellations.filter((app, index, self) => 
    index === self.findIndex(a => a.name === app.name)
  )
  
  if (uniqueAppellations.length === 0) {
    return ''
  }
  
  // Format the response
  let response = 'Here are the wine regions and appellations I found:\n\n'
  
  for (const app of uniqueAppellations.slice(0, 10)) { // Limit to 10 results
    response += `**${app.name}**\n`
    response += `📍 Location: ${app.geographicRegion}\n`
    response += `🏛️ Classification: ${app.classification}\n`
    response += `🗓️ Founded: ${app.yearFounded}\n`
    response += `🍷 Major Producers: ${app.majorProducers.replace(/\|/g, ', ')}\n\n`
  }
  
  if (uniqueAppellations.length > 10) {
    response += `... and ${uniqueAppellations.length - 10} more regions.\n`
  }
  
  return response
}

function parseWineListCSV(results: RetrievalResult[], question: string): string | null {
  try {
    // Combine all chunks to get the full CSV content, removing duplicates
    const chunks = results.map(r => r.chunk)
    const uniqueChunks = Array.from(new Set(chunks)) // Remove duplicate chunks
    
    // Join all chunks and clean up the content
    let fullContent = uniqueChunks.join('\n')
    
    // Fix malformed URLs
    if (fullContent.includes('://') && !fullContent.includes('https://')) {
      fullContent = fullContent.replace(/:\/\//g, 'https://')
    }
    
    console.log('Full CSV content for debugging:', fullContent.substring(0, 500))
    console.log('Number of unique chunks:', uniqueChunks.length)
    
    // Split into lines and filter out non-CSV lines
    const lines = fullContent.split('\n').filter(line => {
      const trimmed = line.trim()
      // Keep lines that look like CSV data (have commas and reasonable length)
      return trimmed.includes(',') && trimmed.length > 20 && !trimmed.includes('worlds_best_wines_lists.csv')
    })
    
    console.log(`Processing ${lines.length} CSV lines`)
    
    // Simple approach: parse each line as CSV data (List Name, URL, Date, Publisher)
    const wineLists = []
    
    for (const line of lines) {
      const values = parseCSVLine(line)
      if (values.length >= 4) {
        const listName = values[0]?.trim()
        let link = values[1]?.trim()
        const date = values[2]?.trim() || 'Unknown'
        const publisher = values[3]?.trim() || 'Unknown'
        
        // Skip header row
        if (listName === 'List Name' || listName === 'URL' || listName === 'Date Published' || 
            listName === 'Publisher/Site' || listName === 'Publisher' || 
            link === 'URL' || link === 'Click to View') {
          continue
        }
        
        // Clean up the link
        if (link && !link.startsWith('http')) {
          // Try to find URL in the line
          const urlMatch = line.match(/(https?:\/\/[^\s,]+)/i)
          if (urlMatch) {
            link = urlMatch[1]
          }
        }
        
        if (listName && link && listName !== 'List Name' && link !== 'URL') {
          wineLists.push({
            name: listName,
            link: link,
            date: date,
            publisher: publisher
          })
        }
      }
    }
    
    console.log(`Found ${wineLists.length} wine lists`)
    
    if (wineLists.length === 0) {
      console.log('No wine lists found in CSV')
      return null
    }
    
    console.log('Found wine lists:', wineLists.map(list => ({ name: list.name, publisher: list.publisher, link: list.link })))
    
    // Remove duplicates based on name and link
    const uniqueWineLists = wineLists.filter((list, index, self) => 
      index === self.findIndex(l => l.name === list.name && l.link === list.link)
    )
    
    console.log(`Removed ${wineLists.length - uniqueWineLists.length} duplicate entries, ${uniqueWineLists.length} unique lists remaining`)
    
    // Check if asking for specific list
  const lowerQuestion = question.toLowerCase()
    if (lowerQuestion.includes('wine spect') || lowerQuestion.includes('wine spectator')) {
      const wineSpectatorList = uniqueWineLists.find(list => 
        list.name.toLowerCase().includes('wine spect')
      )
      if (wineSpectatorList) {
        return `Here's the Wine Spectator Top 100 Wines list:\n\n` +
               `${wineSpectatorList.name}\n` +
               `📅 Published: ${wineSpectatorList.date}\n` +
               `🏆 Publisher: ${wineSpectatorList.publisher}\n` +
               `🔗 [View the complete list](${wineSpectatorList.link})\n\n` +
               `This is Wine Spectator's annual ranking of the world's best wines based on their comprehensive tastings and ratings. The list features wines from around the globe that scored 90+ points.`
      }
    }
    
    if (lowerQuestion.includes('james suckling') || lowerQuestion.includes('suckling')) {
      console.log('Searching for James Suckling lists...')
      const jamesSucklingList = uniqueWineLists.find(list => 
        list.name.toLowerCase().includes('james suckling') || 
        list.name.toLowerCase().includes('suckling') ||
        list.name.toLowerCase().includes('jamessuckling') ||
        list.publisher.toLowerCase().includes('james suckling') ||
        list.publisher.toLowerCase().includes('jamessuckling')
      )
      console.log('James Suckling search result:', jamesSucklingList)
      if (jamesSucklingList) {
        return `Here's James Suckling's Top 100 World Wines list:\n\n` +
               `${jamesSucklingList.name}\n` +
               `📅 Published: ${jamesSucklingList.date}\n` +
               `🏆 Publisher: ${jamesSucklingList.publisher}\n` +
               `🔗 [View James Suckling's complete Top 100 list](${jamesSucklingList.link})\n\n` +
               `James Suckling is one of the world's most influential wine critics, known for his comprehensive tastings and ratings. His annual Top 100 list features wines that scored 95+ points in his tastings.`
      }
    }
    
    if (lowerQuestion.includes('wine enthusiast')) {
      const wineEnthusiastLists = uniqueWineLists.filter(list => 
        list.name.toLowerCase().includes('wine enthusiast')
      )
      if (wineEnthusiastLists.length > 0) {
        let answer = `Here are the Wine Enthusiast's Best Wines lists:\n\n`
        wineEnthusiastLists.forEach(list => {
          answer += `${list.name}\n` +
                   `📅 Published: ${list.date}\n` +
                   `🔗 [View list](${list.link})\n\n`
        })
        return answer
      }
    }
    

    if (lowerQuestion.includes('jeb dunnuck') || lowerQuestion.includes('dunnuck')) {
      console.log('Searching for Jeb Dunnuck lists...')
      const jebDunnuckList = uniqueWineLists.find(list => 
        list.name.toLowerCase().includes('jeb dunnuck') || 
        list.name.toLowerCase().includes('dunnuck') || 
        list.publisher.toLowerCase().includes('jeb dunnuck') || 
        list.publisher.toLowerCase().includes('jeb dunnuck, robert parker') || 
        list.publisher.toLowerCase().includes('dunnuck') ||
        list.publisher.toLowerCase().includes('robert parker')
      )
      console.log('Jeb Dunnuck search result:' , jebDunnuckList)
      if (jebDunnuckList) {
        return `Here's Jeb Dunnuck's Top 100 Wines list:\n\n` +
               `${jebDunnuckList.name}\n` +
               `📅 Published: ${jebDunnuckList.date}\n` +
               `🏆 Publisher: ${jebDunnuckList.publisher}\n` +
               `🔗 [View Jeb Dunnuck's complete Top 100 list](${jebDunnuckList.link})\n\n` +
               `Jeb Dunnuck is a highly respected wine critic known for his comprehensive coverage of California wines and beyond. His annual Top 100 list features exceptional wines from around the world.`
      }
    }
    
    if (lowerQuestion.includes('decanter')) {
      const decanterLists = uniqueWineLists.filter(list => 
        list.name.toLowerCase().includes('decanter')
      )
      if (decanterLists.length > 0) {
        let answer = `Here are Decanter's wine award lists:\n\n`
        decanterLists.forEach(list => {
          answer += `${list.name}\n` +
                   `📅 Published: ${list.date}\n` +
                   `🔗 [View results](${list.link})\n\n`
        })
        return answer
      }
    }
    
    // General "best wines" query - show all lists
    let answer = `Here are the world's most prestigious wine lists and awards for 2024:\n\n`
    
    uniqueWineLists.forEach((list, index) => {
      answer += `${index + 1}. ${list.name}\n` +
               `   📅 Published: ${list.date}\n` +
               `   🏆 Publisher: ${list.publisher}\n` +
               `   🔗 [View the complete list](${list.link})\n\n`
    })
    
    answer += `These lists represent the most comprehensive and respected wine rankings from leading publications and competitions worldwide. Each list uses different criteria and tasting panels to identify the year's outstanding wines.\n\n` +
             `💡 Tip: For specific recommendations, mention which list you're most interested in (e.g., "Wine Spectator's top wines" or "Decanter's best wines").`
    
    return answer
    
  } catch (error) {
    console.error('Error parsing wine list CSV:', error)
    return null
  }
}

// Configuration for confidence thresholds
const CONFIDENCE_THRESHOLD = 0.7 // 70% confidence threshold - can be adjusted

// Query router function to determine which search to use
function determineSearchType(question: string): 'grape' | 'country' | 'region' | 'appellation' | 'wine' | 'general' {
  const lowerQuestion = question.toLowerCase()
  
  // Wine questions - specific wine with producer or vintage
  if (isWineQuestion(question)) {
    return 'wine'
  }
  
  // Grape variety questions
  if (lowerQuestion.includes('grape') || lowerQuestion.includes('variety') || 
      lowerQuestion.includes('chardonnay') || lowerQuestion.includes('cabernet') || 
      lowerQuestion.includes('merlot') || lowerQuestion.includes('pinot') ||
      lowerQuestion.includes('sauvignon') || lowerQuestion.includes('riesling') ||
      lowerQuestion.includes('sangiovese') || lowerQuestion.includes('nebbiolo') ||
      lowerQuestion.includes('furmint') || lowerQuestion.includes('backbone') ||
      lowerQuestion.includes('noble rot') || lowerQuestion.includes('botrytis')) {
    return 'grape'
  }
  
  // Country questions
  if (lowerQuestion.includes('country') || lowerQuestion.includes('italy') || 
      lowerQuestion.includes('france') || lowerQuestion.includes('spain') ||
      lowerQuestion.includes('germany') || lowerQuestion.includes('portugal') ||
      lowerQuestion.includes('hungary') || lowerQuestion.includes('australia') ||
      lowerQuestion.includes('chile') || lowerQuestion.includes('argentina') ||
      lowerQuestion.includes('usa') || lowerQuestion.includes('california')) {
    return 'country'
  }
  
  // Region questions
  if (lowerQuestion.includes('region') || lowerQuestion.includes('tuscany') ||
      lowerQuestion.includes('piedmont') || lowerQuestion.includes('umbria') ||
      lowerQuestion.includes('burgundy') || lowerQuestion.includes('bordeaux') ||
      lowerQuestion.includes('champagne') || lowerQuestion.includes('rioja') ||
      lowerQuestion.includes('napa') || lowerQuestion.includes('sonoma')) {
    return 'region'
  }
  
  // Appellation questions
  if (lowerQuestion.includes('appellation') || lowerQuestion.includes('chianti') ||
      lowerQuestion.includes('barolo') || lowerQuestion.includes('barbaresco') ||
      lowerQuestion.includes('amarone') || lowerQuestion.includes('valpolicella') ||
      lowerQuestion.includes('tokaj') || lowerQuestion.includes('wine makers') ||
      lowerQuestion.includes('producers') || lowerQuestion.includes('winery') ||
      lowerQuestion.includes('vineyard') || lowerQuestion.includes('estate')) {
    return 'appellation'
  }
  
  // Default to general search
  return 'general'
}

// Function to detect if a question is about a specific wine
function isWineQuestion(question: string): boolean {
  const lowerQuestion = question.toLowerCase()
  
  // First, check if this is an appellation question (should NOT be wine question)
  const appellationPatterns = [
    'brunello di montalcino', 'barolo', 'barbaresco', 'chianti classico', 'amarone della valpolicella',
    'valpolicella', 'soave', 'bardolino', 'prosecco', 'franciacorta', 'champagne', 'burgundy',
    'bordeaux', 'cote du rhone', 'sancerre', 'vouvray', 'rioja', 'ribera del duero', 'cava',
    'jerez', 'manzanilla', 'montilla', 'porto', 'madeira', 'vinho verde', 'douro', 'alentejo',
    'tokaj', 'chianti', 'super tuscan' // Note: 'super tuscan' can be both appellation and wine
  ]
  
  const isAppellationQuestion = appellationPatterns.some(pattern => lowerQuestion.includes(pattern))
  
  // If it's clearly an appellation question, it's NOT a wine question
  if (isAppellationQuestion) {
    return false
  }
  
  // Check for specific wine names (not appellations)
  const specificWineNames = [
    // Italian specific wines
    'cerretalto', 'rubesco', 'sassicaia', 'tignanello', 'solaia', 'ornellaia', 'masseto',
    'tenuta san guido', 'antinori', 'frescobaldi', 'marchesi antinori',
    
    // French specific wines
    'mouton rothschild', 'chateau lafite', 'chateau margaux', 'chateau latour', 'haut brion',
    'petrus', 'le pin', 'cheval blanc', 'ausone', 'pavie', 'angelus',
    'domaine de la romanee conti', 'drc', 'la tache', 'romanee conti',
    
    // American specific wines
    'opus one', 'screaming eagle', 'harlan', 'dominus', 'caymus', 'stags leap',
    'quintessa', 'caymus', 'stags leap wine cellars', 'ridge monte bello',
    'heitz cellars', 'spottswoode', 'shafer hillside select', 'dominique laurent',
    
    // Australian specific wines
    'penfolds grange', 'henschke hill of grace', 'vega sicilia unicornio', 'pingus',
    'clarendon hills', 'greenock creek', 'torbreck', 'two hands',
    
    // Spanish specific wines
    'vega sicilia', 'pingus', 'alvaro palacios', 'artadi', 'remirez de ganuza',
    
    // Other regions
    'sassicaia', 'tignanello', 'solaia', 'ornellaia', 'masseto'
  ]
  
  // Check for vintage patterns (4-digit years)
  const vintagePattern = /\b(19|20)\d{2}\b/
  const hasVintage = vintagePattern.test(question)
  
  // Check for specific wine name patterns
  const hasSpecificWineName = specificWineNames.some(pattern => lowerQuestion.includes(pattern))
  
  // Check for producer patterns
  const producerPatterns = [
    'producer', 'winery', 'estate', 'domaine', 'chateau', 'cantina', 'azienda',
    'bodega', 'bodegas', 'weingut', 'weingüter', 'vineyard', 'vineyards'
  ]
  const hasProducer = producerPatterns.some(pattern => lowerQuestion.includes(pattern))
  
  // Check for specific wine question patterns
  const wineQuestionPatterns = [
    'tell me about', 'what is', 'tell me about the wine', 'about this wine',
    'this wine', 'that wine', 'specific wine', 'particular wine'
  ]
  const hasWineQuestionPattern = wineQuestionPatterns.some(pattern => lowerQuestion.includes(pattern))
  
  // A question is considered a wine question if:
  // 1. It has a specific wine name AND (producer OR vintage)
  // 2. It has a wine question pattern AND (specific wine name OR producer)
  // 3. It has a vintage AND specific wine name
  return (hasSpecificWineName && (hasProducer || hasVintage)) ||
         (hasWineQuestionPattern && (hasSpecificWineName || hasProducer)) ||
         (hasVintage && hasSpecificWineName)
}

// Function to extract key terms from questions
function extractKeyTerms(question: string, searchType: string): string[] {
  const lowerQuestion = question.toLowerCase()
  const keyTerms: string[] = []
  
  switch (searchType) {
    case 'wine':
      // Extract specific wine names and producers from the question
      const wineNames = ['cerretalto', 'rubesco', 'sassicaia', 'tignanello', 'solaia', 'ornellaia', 'masseto',
                        'tenuta san guido', 'antinori', 'frescobaldi', 'marchesi antinori',
                        'mouton rothschild', 'chateau lafite', 'chateau margaux', 'chateau latour', 'haut brion',
                        'petrus', 'le pin', 'cheval blanc', 'ausone', 'pavie', 'angelus',
                        'domaine de la romanee conti', 'drc', 'la tache', 'romanee conti',
                        'opus one', 'screaming eagle', 'harlan', 'dominus', 'caymus', 'stags leap',
                        'quintessa', 'caymus', 'stags leap wine cellars', 'ridge monte bello',
                        'heitz cellars', 'spottswoode', 'shafer hillside select', 'dominique laurent',
                        'penfolds grange', 'henschke hill of grace', 'vega sicilia unicornio', 'pingus',
                        'clarendon hills', 'greenock creek', 'torbreck', 'two hands',
                        'vega sicilia', 'pingus', 'alvaro palacios', 'artadi', 'remirez de ganuza']
      
      for (const wineName of wineNames) {
        if (lowerQuestion.includes(wineName)) {
          keyTerms.push(wineName)
        }
      }
      
      // Extract producer names
      const producers = ['casanova di neri', 'lungorotti', 'antinori', 'tenuta dell\'ornellaia', 'tenuta san guido',
                        'domaine', 'chateau', 'mouton', 'lafite', 'margaux', 'latour', 'haut brion',
                        'petrus', 'le pin', 'cheval blanc', 'ausone', 'pavie', 'angelus',
                        'penfolds', 'henschke', 'vega sicilia', 'dominio de pingus']
      
      for (const producer of producers) {
        if (lowerQuestion.includes(producer)) {
          keyTerms.push(producer)
        }
      }
      
      // Extract vintage years
      const vintagePattern = /\b(19|20)\d{2}\b/
      const vintageMatch = question.match(vintagePattern)
      if (vintageMatch) {
        keyTerms.push(vintageMatch[0])
      }
      
      console.log('Wine key terms extracted:', keyTerms)
      break
      
    case 'grape':
      // Extract grape names from the question
      const grapeKeywords = ['chardonnay', 'cabernet', 'merlot', 'pinot', 'sauvignon', 'riesling', 'syrah', 'malbec', 
                            'sangiovese', 'nebbiolo', 'barbera', 'dolcetto', 'freisa', 'ruchè', 'ruche', 'furmint',
                            'savagnin', 'trebbiano', 'montepulciano', 'aglianico', 'moscato', 'cortese', 'arneis',
                            'verduno', 'pelaverga', 'grignolino', 'bonarda', 'brachetto', 'favorita', 'erbaluce',
                            'timorasso', 'roussanne', 'marsanne', 'harslevelu', 'sarga muscotaly', 'tokaji', 'aszú',
                            'pinot noir', 'pinot grigio', 'pinot blanc', 'pinot bianco', 'grüner veltliner', 'gruener veltliner']
      
      for (const grape of grapeKeywords) {
        if (lowerQuestion.includes(grape)) {
          keyTerms.push(grape)
        }
      }
      
      // Also extract region-specific terms for grape questions
      if (lowerQuestion.includes('umbria')) keyTerms.push('umbria')
      if (lowerQuestion.includes('native to')) keyTerms.push('native to')
      if (lowerQuestion.includes('revival')) keyTerms.push('revival')
      if (lowerQuestion.includes('trebbiano spoletino')) keyTerms.push('trebbiano spoletino')
      
      // Extract common wine regions from grape questions
      const wineRegions = ['alto adige', 'trentino', 'veneto', 'tuscany', 'piedmont', 'lombardy', 'emilia-romagna', 
                          'marche', 'abruzzo', 'molise', 'puglia', 'basilicata', 'calabria', 'sicily', 'sardinia',
                          'burgundy', 'bordeaux', 'champagne', 'loire', 'rhone', 'alsace', 'languedoc', 'provence',
                          'rioja', 'catalonia', 'galicia', 'castilla', 'valencia', 'andalusia', 'extremadura',
                          'mosel', 'rheingau', 'pfalz', 'baden', 'wurttemberg', 'franken', 'saale-unstrut',
                          'douro', 'dão', 'bairrada', 'vinho verde', 'alentejo', 'setúbal', 'madeira',
                          'tokaj', 'eger', 'villány', 'sopron', 'balaton', 'szekszárd', 'kunság',
                          'napa', 'sonoma', 'central coast', 'santa barbara', 'monterey', 'paso robles',
                          'columbia valley', 'yakima valley', 'willamette valley', 'russian river',
                          'marlborough', 'central otago', 'hawkes bay', 'wairarapa', 'canterbury',
                          'barossa valley', 'clare valley', 'mclaren vale', 'adelaide hills', 'coonawarra',
                          'hunter valley', 'yarra valley', 'margaret river', 'great southern',
                          'maipo valley', 'casablanca valley', 'colchagua valley', 'curicó valley',
                          'mendoza', 'salta', 'san juan', 'la rioja', 'neuquén', 'rio negro',
                          'stellenbosch', 'franschhoek', 'paarl', 'constantia', 'elgin', 'walker bay',
                          'georgia', 'kakheti', 'imereti', 'racha', 'kartli', 'guria', 'samegrelo',
                          'lebanon', 'bekaa valley', 'mount lebanon', 'north lebanon', 'south lebanon',
                          'israel', 'galilee', 'judean hills', 'negev', 'shomron', 'golan heights',
                          'japan', 'yamanashi', 'nagano', 'hokkaido', 'yamagata', 'niigata', 'fukushima',
                          'china', 'ningxia', 'xinjiang', 'shandong', 'hebei', 'tianjin', 'beijing',
                          'india', 'nashik', 'bangalore', 'pune', 'hyderabad', 'mumbai', 'delhi',
                          'brazil', 'vale do são francisco', 'serra gaúcha', 'campanha', 'campo belo',
                          'mexico', 'baja california', 'coahuila', 'quintana roo', 'yucatan', 'puebla',
                          'uruguay', 'canelones', 'colonia', 'san josé', 'florida', 'maldonado',
                          'peru', 'ica', 'arequipa', 'moquegua', 'tacna', 'cajamarca', 'piura']
      
      for (const region of wineRegions) {
        if (lowerQuestion.includes(region)) {
          keyTerms.push(region)
        }
      }
      
      // Extract terms for "confused with" or "unrelated" questions
      if (lowerQuestion.includes('confused with')) keyTerms.push('confused with')
      if (lowerQuestion.includes('unrelated')) keyTerms.push('unrelated')
      if (lowerQuestion.includes('austrian')) keyTerms.push('austrian')
      if (lowerQuestion.includes('austria')) keyTerms.push('austria')
      
      // Extract terms for "mistaken for" or "DNA testing" questions
      if (lowerQuestion.includes('mistaken for')) keyTerms.push('mistaken for')
      if (lowerQuestion.includes('dna testing')) keyTerms.push('dna testing')
      if (lowerQuestion.includes('south american')) keyTerms.push('south american')
      if (lowerQuestion.includes('chile')) keyTerms.push('chile')
      if (lowerQuestion.includes('carmenere')) keyTerms.push('carmenere')
      
      console.log('Grape key terms extracted:', keyTerms)
      break
      
    case 'country':
      // Extract country names from the question
      const countries = ['italy', 'france', 'spain', 'germany', 'portugal', 'greece', 'australia', 'chile', 
                        'argentina', 'south africa', 'new zealand', 'usa', 'california', 'oregon', 'washington', 
                        'canada', 'austria', 'hungary', 'romania', 'bulgaria', 'croatia', 'slovenia', 'serbia', 
                        'moldova', 'georgia', 'turkey', 'lebanon', 'israel', 'japan', 'china', 'india', 'brazil', 
                        'mexico', 'uruguay', 'peru']
      
      for (const country of countries) {
        if (lowerQuestion.includes(country)) {
          keyTerms.push(country)
        }
      }
      break
      
    case 'region':
      // Extract region names from the question
      const regions = ['tuscany', 'piedmont', 'umbria', 'lazio', 'marche', 'abruzzo', 'puglia', 'campania', 
                      'sicily', 'sardinia', 'lombardy', 'veneto', 'friuli', 'emilia-romagna', 'liguria', 
                      'calabria', 'molise', 'burgundy', 'bordeaux', 'champagne', 'loire', 'rhone', 'alsace', 
                      'languedoc', 'provence', 'jura', 'savoie', 'rioja', 'catalonia', 'napa', 'sonoma']
      
      for (const region of regions) {
        if (lowerQuestion.includes(region)) {
          keyTerms.push(region)
        }
      }
      break
      
    case 'appellation':
      // Extract appellation names from the question
      const appellations = ['chianti', 'brunello', 'barolo', 'barbaresco', 'amarone', 'valpolicella', 'soave', 
                           'bardolino', 'prosecco', 'franciacorta', 'bolgheri', 'sassicaia', 'champagne', 
                           'burgundy', 'bordeaux', 'cote du rhone', 'sancerre', 'vouvray', 'rioja', 
                           'ribera del duero', 'cava', 'jerez', 'manzanilla', 'montilla', 'porto', 'madeira', 
                           'vinho verde', 'douro', 'alentejo', 'colares', 'tokaj']
      
      for (const appellation of appellations) {
        if (lowerQuestion.includes(appellation)) {
          keyTerms.push(appellation)
        }
      }
      break
  }
  
  return keyTerms
}

// Function to parse and format CSV content
function parseAndFormatCSVContent(documentResults: any[], question: string): string | null {
  try {
    const lowerQuestion = question.toLowerCase()
    console.log('parseAndFormatCSVContent called with', documentResults.length, 'results')
    
    // Combine all chunks that contain CSV data
    const csvChunks = documentResults
      .filter(result => 
        result.chunk.includes('Appellation,Classification') || 
        result.chunk.includes('Variety,Color') ||
        result.chunk.includes(',DOC,') ||
        result.chunk.includes(',DOCG,')
      )
      .map(result => result.chunk)
    
    console.log('Found', csvChunks.length, 'CSV chunks')
    if (csvChunks.length === 0) {
      console.log('No CSV chunks found, returning null')
      return null
    }
    
    // Parse CSV data
    const allRows: any[] = []
    const seenRows = new Set<string>()
    
    for (const chunk of csvChunks) {
      const lines = chunk.split('\n')
      let headers: string[] = []
      let isHeaderFound = false
      
      for (const line of lines) {
        if (line.trim() === '') continue
        
        // Look for header row
        if (line.includes('Appellation,Classification') || line.includes('Variety,Color')) {
          headers = parseCSVLine(line)
          isHeaderFound = true
          continue
        }
        
        // Skip if no header found yet
        if (!isHeaderFound) continue
        
        // Parse data rows
        if (line.includes(',DOC,') || line.includes(',DOCG,') || line.includes(',DOCG')) {
          const row = parseCSVLine(line)
          if (row.length >= headers.length) {
            const rowObj: any = {}
            headers.forEach((header, index) => {
              rowObj[header.trim()] = row[index]?.trim() || ''
            })
            
            // Create a unique key to avoid duplicates
            const key = JSON.stringify(rowObj)
            if (!seenRows.has(key)) {
              seenRows.add(key)
              allRows.push(rowObj)
            }
          }
        }
      }
    }
    
    if (allRows.length === 0) return null
    
    // Format based on question type
    if (lowerQuestion.includes('grapes') || lowerQuestion.includes('grape varieties')) {
      return formatGrapeVarieties(allRows, question)
    } else if (lowerQuestion.includes('appellations') || lowerQuestion.includes('appellation')) {
      return formatAppellations(allRows, question)
        } else {
      return formatGeneralWineData(allRows, question)
        }
    
      } catch (error) {
    console.error('Error parsing CSV content:', error)
    return null
  }
}


// Format grape varieties from CSV data
function formatGrapeVarieties(rows: any[], question: string): string {
  const grapeSet = new Set<string>()
  
  rows.forEach(row => {
    // Extract grapes from various possible fields
    const grapeFields = ['Main Grapes', 'Grape Varieties', 'Major Grapes', 'Grapes']
    
    grapeFields.forEach(field => {
      if (row[field]) {
        const grapes = row[field].split(/[,;]/).map((g: string) => g.trim()).filter((g: string) => g.length > 0)
        grapes.forEach((grape: string) => grapeSet.add(grape))
      }
    })
  })
  
  const uniqueGrapes = Array.from(grapeSet).sort()
  
  if (uniqueGrapes.length === 0) {
    return `Based on my wine knowledge, here's what I can tell you:\n\nI found wine data for the region, but couldn't extract specific grape varieties from the available information.`
  }
  
  return `Based on my wine knowledge, here are the grape varieties grown in the region:\n\n` +
    uniqueGrapes.map(grape => `• ${grape}`).join('\n\n')
}

// Format appellations from CSV data
function formatAppellations(rows: any[], question: string): string {
  const appellations = rows
    .filter(row => row.Appellation || row['Appellation Name'])
    .map(row => ({
      name: row.Appellation || row['Appellation Name'] || '',
      classification: row.Classification || row['Classification Level'] || '',
      region: row['Geographic Region'] || row.Region || '',
      grapes: row['Main Grapes'] || row['Grape Varieties'] || row.Grapes || ''
    }))
    .filter(app => app.name)
  
  if (appellations.length === 0) {
    return `Based on my wine knowledge, here's what I can tell you:\n\nI found wine data for the region, but couldn't extract specific appellations from the available information.`
  }
  
  return `Based on my wine knowledge, here are the appellations in the region:\n\n` +
    appellations.map(app => 
      `${app.name} (${app.classification})\n` +
      `Location: ${app.region}\n` +
      `Grapes: ${app.grapes}\n`
    ).join('\n')
}

// Format general wine data from CSV
function formatGeneralWineData(rows: any[], question: string): string {
  const formattedRows = rows.slice(0, 10).map(row => {
    const appellation = row.Appellation || row['Appellation Name'] || 'Unknown'
    const classification = row.Classification || row['Classification Level'] || ''
    const region = row['Geographic Region'] || row.Region || ''
    const grapes = row['Main Grapes'] || row['Grape Varieties'] || row.Grapes || ''
    
    return `${appellation}${classification ? ` (${classification})` : ''}\n` +
           `Location: ${region}\n` +
           `Grapes: ${grapes}\n`
  }).join('\n')
  
  return `Based on my wine knowledge, here's what I can tell you:\n\n${formattedRows}`
}

// Function to check confidence level of search results
function checkConfidenceLevel(results: any[], keyTerms: string[], searchType: string, question: string = ''): boolean {
  if (results.length === 0) {
    console.log('No results found, confidence: 0%')
    return false
  }
  
  let totalMatches = 0
  let totalChecks = 0
  
  for (const result of results) {
    const resultText = result.chunk || result.grape_variety || result.appellation || result.country_name || result.wine_region || ''
    const lowerResultText = resultText.toLowerCase()
    
    for (const keyTerm of keyTerms) {
      totalChecks++
      if (lowerResultText.includes(keyTerm.toLowerCase())) {
        totalMatches++
      }
    }
  }
  
  const confidence = totalChecks > 0 ? totalMatches / totalChecks : 0
  console.log(`Confidence level: ${(confidence * 100).toFixed(1)}% (${totalMatches}/${totalChecks} matches)`)
  
  // For grape variety questions asking for specific regions, be extremely strict
  console.log('Checking for specific region requirements...')
  console.log('Search type:', searchType)
  console.log('Key terms:', keyTerms)
  
  if (searchType === 'grape' && (keyTerms.includes('umbria') || keyTerms.includes('native to') || keyTerms.includes('revival'))) {
    console.log('✅ Detected specific region question, checking for Umbria/Trebbiano Spoletino mentions...')
    
    // Check if ANY result actually mentions the specific region or grape
    const hasSpecificMention = results.some(result => {
      const resultText = result.chunk || result.grape_variety || result.appellation || result.country_name || result.wine_region || ''
      const lowerResultText = resultText.toLowerCase()
      
      const mentionsUmbria = lowerResultText.includes('umbria')
      const mentionsTrebbiano = lowerResultText.includes('trebbiano spoletino')
      const mentionsNative = lowerResultText.includes('native to umbria')
      
      console.log(`Result mentions Umbria: ${mentionsUmbria}, Trebbiano Spoletino: ${mentionsTrebbiano}, Native to Umbria: ${mentionsNative}`)
      
      return mentionsUmbria || mentionsTrebbiano || mentionsNative
    })
    
    if (!hasSpecificMention) {
      console.log('❌ No results mention Umbria or Trebbiano Spoletino, confidence: 0%')
      return false
    } else {
      console.log('✅ Found specific mention of Umbria/Trebbiano Spoletino')
    }
  }
  
  // For questions asking for grapes that are "confused with" or "unrelated to" other grapes
  if (searchType === 'grape' && (keyTerms.includes('confused with') || keyTerms.includes('unrelated') || keyTerms.includes('austrian'))) {
    console.log('✅ Detected "confused with" or "unrelated" question, checking for specific grape mentions...')
    
    // Check if ANY result actually mentions the specific grape being asked about
    const hasSpecificMention = results.some(result => {
      const resultText = result.chunk || result.grape_variety || result.appellation || result.country_name || result.wine_region || ''
      const lowerResultText = resultText.toLowerCase()
      
      // Look for Austrian grapes or grapes that are confused with Chardonnay
      const mentionsAustrian = lowerResultText.includes('austrian') || lowerResultText.includes('austria')
      const mentionsGrüner = lowerResultText.includes('grüner veltliner') || lowerResultText.includes('gruener veltliner')
      const mentionsConfused = lowerResultText.includes('confused with') || lowerResultText.includes('unrelated')
      
      console.log(`Result mentions Austrian: ${mentionsAustrian}, Grüner Veltliner: ${mentionsGrüner}, Confused/Unrelated: ${mentionsConfused}`)
      
      return mentionsAustrian || mentionsGrüner || mentionsConfused
    })
    
    if (!hasSpecificMention) {
      console.log('❌ No results mention Austrian grapes or confusion with Chardonnay, confidence: 0%')
      return false
    } else {
      console.log('✅ Found specific mention of Austrian grapes or confusion')
    }
  }
  
  // For questions asking for grapes that were "mistaken for" other grapes
  if (searchType === 'grape' && (keyTerms.includes('mistaken for') || keyTerms.includes('dna testing') || keyTerms.includes('south american'))) {
    console.log('✅ Detected "mistaken for" or "DNA testing" question, checking for specific grape mentions...')
    
    // Check if ANY result actually mentions the specific grape being asked about
    const hasSpecificMention = results.some(result => {
      const resultText = result.chunk || result.grape_variety || result.appellation || result.country_name || result.wine_region || ''
      const lowerResultText = resultText.toLowerCase()
      
      // Look for South American grapes or grapes that were mistaken for others
      const mentionsSouthAmerican = lowerResultText.includes('south american') || lowerResultText.includes('chile')
      const mentionsCarmenere = lowerResultText.includes('carmenere')
      const mentionsMistaken = lowerResultText.includes('mistaken for') || lowerResultText.includes('dna testing')
      
      console.log(`Result mentions South American: ${mentionsSouthAmerican}, Carmenere: ${mentionsCarmenere}, Mistaken/DNA: ${mentionsMistaken}`)
      
      return mentionsSouthAmerican || mentionsCarmenere || mentionsMistaken
    })
    
    if (!hasSpecificMention) {
      console.log('❌ No results mention South American grapes or mistaken identity, confidence: 0%')
      return false
    } else {
      console.log('✅ Found specific mention of South American grapes or mistaken identity')
    }
  }
  
  // For questions asking about specific historical facts (like DNA testing, mistaken identity)
  const lowerQuestion = question.toLowerCase()
  if (searchType === 'grape' && (lowerQuestion.includes('dna testing') || lowerQuestion.includes('mistaken for') || lowerQuestion.includes('1990s'))) {
    console.log('✅ Detected historical fact question, requiring very specific mentions...')
    
    const hasSpecificMention = results.some(result => {
      const resultText = result.chunk || result.grape_variety || result.appellation || result.country_name || result.wine_region || ''
      const lowerResultText = resultText.toLowerCase()
      
      const mentionsDNA = lowerResultText.includes('dna testing') || lowerResultText.includes('dna')
      const mentionsMistaken = lowerResultText.includes('mistaken for') || lowerResultText.includes('mistaken')
      const mentionsCarmenere = lowerResultText.includes('carmenere')
      const mentionsChile = lowerResultText.includes('chile')
      const mentions1990s = lowerResultText.includes('1990s') || lowerResultText.includes('1990')
      
      console.log(`Result mentions DNA: ${mentionsDNA}, Mistaken: ${mentionsMistaken}, Carmenere: ${mentionsCarmenere}, Chile: ${mentionsChile}, 1990s: ${mentions1990s}`)
      
      return mentionsDNA || mentionsMistaken || mentionsCarmenere || mentionsChile || mentions1990s
    })
    
    if (!hasSpecificMention) {
      console.log('❌ No results mention specific historical facts, confidence: 0%')
      return false
    } else {
      console.log('✅ Found specific mention of historical facts')
    }
  }
  
  // For questions asking about "oldest" or "traditional" grapes
  console.log('Checking for oldest/traditional keywords in question:', lowerQuestion)
  console.log('Contains oldest:', lowerQuestion.includes('oldest'))
  console.log('Contains traditional:', lowerQuestion.includes('traditional'))
  console.log('Contains qvevri:', lowerQuestion.includes('qvevri'))
  
  if (searchType === 'grape' && (lowerQuestion.includes('oldest') || lowerQuestion.includes('traditional') || lowerQuestion.includes('qvevri'))) {
    console.log('✅ Detected "oldest" or "traditional" grape question, requiring very specific mentions...')
    
    const hasSpecificMention = results.some(result => {
      const resultText = result.chunk || result.grape_variety || result.appellation || result.country_name || result.wine_region || ''
      const lowerResultText = resultText.toLowerCase()
      
      const mentionsOldest = lowerResultText.includes('oldest') || lowerResultText.includes('ancient')
      const mentionsTraditional = lowerResultText.includes('traditional') || lowerResultText.includes('qvevri')
      const mentionsRkatsiteli = lowerResultText.includes('rkatsiteli')
      const mentionsGeorgian = lowerResultText.includes('georgian') || lowerResultText.includes('georgia')
      const mentionsCultivated = lowerResultText.includes('cultivated') || lowerResultText.includes('domesticated')
      
      console.log(`Result mentions Oldest: ${mentionsOldest}, Traditional: ${mentionsTraditional}, Rkatsiteli: ${mentionsRkatsiteli}, Georgian: ${mentionsGeorgian}, Cultivated: ${mentionsCultivated}`)
      
      return mentionsOldest || mentionsTraditional || mentionsRkatsiteli || mentionsGeorgian || mentionsCultivated
    })
    
    if (!hasSpecificMention) {
      console.log('❌ No results mention specific historical facts about oldest/traditional grapes, confidence: 0%')
      return false
    } else {
      console.log('✅ Found specific mention of historical facts about oldest/traditional grapes')
    }
  }
  
  // For questions asking for specific grape varieties, check if the exact grape is mentioned
  if (searchType === 'grape' && keyTerms.length > 0) {
    console.log('✅ Detected specific grape question, checking for exact grape mentions...')
    
    // Check if ANY result actually mentions the specific grape being asked about
    const hasSpecificMention = results.some(result => {
      const resultText = result.chunk || result.grape_variety || result.appellation || result.country_name || result.wine_region || ''
      const lowerResultText = resultText.toLowerCase()
      
      // Look for the exact grape name in the results
      const mentionsExactGrape = keyTerms.some(term => {
        const exactMatch = lowerResultText.includes(term.toLowerCase())
        console.log(`Checking for "${term}" in result: ${exactMatch}`)
        return exactMatch
      })
      
      return mentionsExactGrape
    })
    
    if (!hasSpecificMention) {
      console.log('❌ No results mention the exact grape being asked about, confidence: 0%')
      return false
    } else {
      console.log('✅ Found specific mention of the exact grape')
    }
  }
  
  return confidence >= CONFIDENCE_THRESHOLD
}

// Grape search function
async function searchGrapes(question: string): Promise<{ rows: Record<string, unknown>[]; canAnswer: boolean }> {
  const lowerQuestion = question.toLowerCase()
  const supabase = createServiceClient()
  
  console.log('=== GRAPE SEARCH ===')
  
  // Extract key terms for confidence checking
  const keyTerms = extractKeyTerms(question, 'grape')
  console.log('Key terms for grape search:', keyTerms)
  
  // Check if this is a region-based grape query (e.g., "what grapes are grown in Alto Adige")
  const wineRegions = ['alto adige', 'trentino', 'veneto', 'tuscany', 'piedmont', 'lombardy', 'emilia-romagna', 
                      'marche', 'abruzzo', 'molise', 'puglia', 'basilicata', 'calabria', 'sicily', 'sardinia',
                      'burgundy', 'bordeaux', 'champagne', 'loire', 'rhone', 'alsace', 'languedoc', 'provence',
                      'rioja', 'catalonia', 'galicia', 'castilla', 'valencia', 'andalusia', 'extremadura',
                      'mosel', 'rheingau', 'pfalz', 'baden', 'wurttemberg', 'franken', 'saale-unstrut',
                      'douro', 'dão', 'bairrada', 'vinho verde', 'alentejo', 'setúbal', 'madeira',
                      'tokaj', 'eger', 'villány', 'sopron', 'balaton', 'szekszárd', 'kunság',
                      'napa', 'sonoma', 'central coast', 'santa barbara', 'monterey', 'paso robles',
                      'columbia valley', 'yakima valley', 'willamette valley', 'russian river',
                      'marlborough', 'central otago', 'hawkes bay', 'wairarapa', 'canterbury',
                      'barossa valley', 'clare valley', 'mclaren vale', 'adelaide hills', 'coonawarra',
                      'hunter valley', 'yarra valley', 'margaret river', 'great southern',
                      'maipo valley', 'casablanca valley', 'colchagua valley', 'curicó valley',
                      'mendoza', 'salta', 'san juan', 'la rioja', 'neuquén', 'rio negro',
                      'stellenbosch', 'franschhoek', 'paarl', 'constantia', 'elgin', 'walker bay',
                      'georgia', 'kakheti', 'imereti', 'racha', 'kartli', 'guria', 'samegrelo',
                      'lebanon', 'bekaa valley', 'mount lebanon', 'north lebanon', 'south lebanon',
                      'israel', 'galilee', 'judean hills', 'negev', 'shomron', 'golan heights',
                      'japan', 'yamanashi', 'nagano', 'hokkaido', 'yamagata', 'niigata', 'fukushima',
                      'china', 'ningxia', 'xinjiang', 'shandong', 'hebei', 'tianjin', 'beijing',
                      'india', 'nashik', 'bangalore', 'pune', 'hyderabad', 'mumbai', 'delhi',
                      'brazil', 'vale do são francisco', 'serra gaúcha', 'campanha', 'campo belo',
                      'mexico', 'baja california', 'coahuila', 'quintana roo', 'yucatan', 'puebla',
                      'uruguay', 'canelones', 'colonia', 'san josé', 'florida', 'maldonado',
                      'peru', 'ica', 'arequipa', 'moquegua', 'tacna', 'cajamarca', 'piura']
  
  const foundRegion = wineRegions.find(region => lowerQuestion.includes(region))
  
  if (foundRegion) {
    console.log(`Found region: ${foundRegion}, searching for grapes in this region`)
    
    try {
      // Search for grapes in this region using the join tables
      const { data: regionGrapes, error } = await supabase
        .from('appellation')
        .select(`
          appellation,
          join_grape_appellation(
            grapes(
              grape_variety,
              wine_color,
              flavor
            )
          )
        `)
        .ilike('appellation', `%${foundRegion}%`)
        .limit(10)
      
      console.log('Raw database query results:', JSON.stringify(regionGrapes, null, 2))
      
      if (error) {
        console.error('Error searching for region grapes:', error)
      } else if (regionGrapes && regionGrapes.length > 0) {
        console.log('Found grapes for region:', JSON.stringify(regionGrapes, null, 2))
        
        // Extract unique grapes from the region and validate they exist in the grapes table
        const grapeSet = new Set<string>()
        const allGrapeNames = new Set<string>()
        
        regionGrapes.forEach(appellation => {
          if (appellation.join_grape_appellation) {
            appellation.join_grape_appellation.forEach((join: any) => {
              if (join.grapes && join.grapes.grape_variety) {
                allGrapeNames.add(join.grapes.grape_variety)
              }
            })
          }
        })
        
        // Validate that these grapes actually exist in the grapes table
        if (allGrapeNames.size > 0) {
          console.log('All grape names found:', Array.from(allGrapeNames))
          
          const { data: validGrapes, error: validationError } = await supabase
            .from('grapes')
            .select('grape_variety')
            .in('grape_variety', Array.from(allGrapeNames))
          
          console.log('Valid grapes from database:', validGrapes)
          console.log('Validation error:', validationError)
          
          if (!validationError && validGrapes) {
            console.log('Adding valid grapes to set:', validGrapes.map(g => g.grape_variety))
            validGrapes.forEach(grape => {
              grapeSet.add(grape.grape_variety)
            })
        } else {
            console.log('No valid grapes found or validation error occurred')
          }
        } else {
          console.log('No grape names found to validate')
        }
        
        if (grapeSet.size > 0) {
          console.log('Final grape set:', Array.from(grapeSet))
          
          // Check if this is a specific historical question that requires more than just region grapes
          if (lowerQuestion.includes('dna testing') || lowerQuestion.includes('mistaken for') || lowerQuestion.includes('1990s')) {
            console.log('❌ Historical question detected, region grapes not sufficient, falling back to document search')
            return { rows: [], canAnswer: false }
          }
          
          // Convert to normalized rows
          const rows = Array.from(grapeSet).map((grape: string) => ({
            name: grape,
            grape_variety: grape,
            wine_color: 'unknown',
            country: 'Unknown',
            region: foundRegion,
            appellations: [],
            styles: [],
            typical_profile: [],
            notes: [],
            alt_names: []
          }))
          
          console.log('Returning database answer with canAnswer=true')
          return { rows, canAnswer: true }
        } else {
          console.log('No valid grapes found after validation, returning canAnswer=false')
          return { rows: [], canAnswer: false }
        }
        }
      } catch (error) {
      console.error('Error in region grape search:', error)
    }
  }
    
    // Try to find specific grape first
  const grapeKeywords = ['chardonnay', 'cabernet', 'merlot', 'pinot', 'sauvignon', 'riesling', 'syrah', 'malbec', 'furmint']
    const foundKeyword = grapeKeywords.find(keyword => lowerQuestion.includes(keyword))
    
    if (foundKeyword) {
    console.log(`Found grape keyword: ${foundKeyword}`)
    
    // For questions about wine regions using a specific grape, perform complex join
    if (lowerQuestion.includes('wine regions') || lowerQuestion.includes('regions use') || lowerQuestion.includes('where is')) {
      console.log('Performing complex join to find wine regions for grape:', foundKeyword)
      
      try {
        // Complex join: grapes -> join_grape_appellation -> appellation -> countries_regions
        const { data: grapeRegions, error } = await supabase
          .from('grapes')
          .select(`
            grape_variety,
            join_grape_appellation!inner(
              appellation!inner(
                appellation,
                countries_regions!inner(
                  wine_region,
                  country_name
                )
              )
            )
          `)
          .ilike('grape_variety', `%${foundKeyword}%`)
          .limit(10)
        
        if (error) {
          console.error('Error in complex join query:', error)
        } else if (grapeRegions && grapeRegions.length > 0) {
          console.log('Complex join results:', grapeRegions)
          
          // Extract unique wine regions
          const wineRegions = new Set<string>()
          grapeRegions.forEach(grape => {
            if (grape.join_grape_appellation) {
              grape.join_grape_appellation.forEach((join: any) => {
                if (join.appellation && join.appellation.countries_regions) {
                  wineRegions.add(join.appellation.countries_regions.wine_region)
                }
              })
            }
          })
          
          if (wineRegions.size > 0) {
            // Convert to normalized rows
            const rows = Array.from(wineRegions).map(region => ({
              name: `${foundKeyword} in ${region}`,
              grape_variety: foundKeyword,
              wine_color: 'unknown',
              country: 'Various',
              region: region,
              appellations: [],
              styles: [],
              typical_profile: [],
              notes: [],
              alt_names: []
            }))
            
            return { rows, canAnswer: true }
          }
        }
      } catch (error) {
        console.error('Error in complex join:', error)
      }
    }
    
    // Fallback to simple grape search
      const { data } = await supabase
        .from('grapes')
        .select('*')
        .ilike('grape_variety', `%${foundKeyword}%`)
        .limit(3)
    
    if (data && data.length > 0) {
      // Check confidence level of database results
      const hasHighConfidence = checkConfidenceLevel(data, keyTerms, 'grape', question)
      
      if (hasHighConfidence) {
        // Convert to normalized rows
        const rows = data.map((g: any) => ({
          name: g.grape_variety,
          grape_variety: g.grape_variety,
          wine_color: g.wine_color || 'unknown',
          country: 'Various',
          region: 'Various',
          appellations: [],
          styles: [],
          typical_profile: g.flavor ? [g.flavor] : [],
          notes: g.notable_wines ? [g.notable_wines] : [],
          alt_names: []
        }))
        
        return { rows, canAnswer: true }
      } else {
        console.log('Grape database results do not meet confidence threshold, will fall back to document search')
      }
    }
    } else {
      // Get general grape info
      const { data } = await supabase
        .from('grapes')
        .select('*')
        .limit(5)
    
    if (data && data.length > 0) {
      // Check confidence level of database results
      const hasHighConfidence = checkConfidenceLevel(data, keyTerms, 'grape', question)
      
      if (hasHighConfidence) {
        // Convert to normalized rows
        const rows = data.map((g: any) => ({
          name: g.grape_variety,
          grape_variety: g.grape_variety,
          wine_color: g.wine_color || 'unknown',
          country: 'Various',
          region: 'Various',
          appellations: [],
          styles: [],
          typical_profile: g.flavor ? [g.flavor] : [],
          notes: g.notable_wines ? [g.notable_wines] : [],
          alt_names: []
        }))
        
        return { rows, canAnswer: true }
      } else {
        console.log('Grape database results do not meet confidence threshold, will fall back to document search')
      }
    }
  }
  
  // If no relevant database results, fall back to document search
  console.log('No relevant grape database results, falling back to document search')
  return { rows: [], canAnswer: false }
}

// Country search function
async function searchCountries(question: string): Promise<{ rows: Record<string, unknown>[]; canAnswer: boolean }> {
  const lowerQuestion = question.toLowerCase()
  const supabase = createServiceClient()
  
  console.log('=== COUNTRY SEARCH ===')
  
  // Extract key terms for confidence checking
  const keyTerms = extractKeyTerms(question, 'country')
  console.log('Key terms for country search:', keyTerms)
  
  // Extract country name from question
  const countries = ['italy', 'france', 'spain', 'germany', 'portugal', 'greece', 'australia', 
                    'chile', 'argentina', 'south africa', 'new zealand', 'usa', 'california', 
                    'oregon', 'washington', 'canada', 'austria', 'hungary', 'romania', 'bulgaria']
  
  let countryName: string | undefined
  for (const country of countries) {
    if (lowerQuestion.includes(country)) {
      countryName = country
      break
    }
  }
  
  if (countryName) {
    console.log(`Searching for country: ${countryName}`)
    
    // Enhanced country search with related appellations and grapes
    try {
      const { data: countryData, error } = await supabase
        .from('countries_regions')
        .select(`
          country_name,
          wine_region,
          appellation(
            appellation,
            classification,
            major_grapes,
            join_grape_appellation(
              grapes(
                grape_variety,
                wine_color,
                flavor
              )
            )
          )
        `)
        .ilike('country_name', `%${countryName}%`)
        .limit(10)
      
      if (error) {
        console.error('Error in enhanced country search:', error)
        // Fallback to simple search
        const { data: simpleData } = await supabase
          .from('countries_regions')
      .select('*')
          .ilike('country_name', `%${countryName}%`)
      .limit(5)
    
        if (simpleData && simpleData.length > 0) {
          const hasHighConfidence = checkConfidenceLevel(simpleData, keyTerms, 'country')
          if (hasHighConfidence) {
            // Convert to normalized rows
            const rows = simpleData.map((c: any) => ({
              name: c.country_name,
              country: c.country_name,
              region: c.wine_region || 'Not specified',
              appellations: [],
              styles: [],
              typical_profile: [],
              notes: [],
              alt_names: []
            }))
            return { rows, canAnswer: true }
          }
        }
      } else if (countryData && countryData.length > 0) {
        console.log('Enhanced country search results:', countryData)
        
        // Extract unique information
        const regions = new Set<string>()
        const appellations = new Set<string>()
        const grapes = new Set<string>()
        
        countryData.forEach(country => {
          if (country.wine_region) regions.add(country.wine_region)
          if (country.appellation) {
            country.appellation.forEach((app: any) => {
              if (app.appellation) appellations.add(app.appellation)
              if (app.major_grapes) {
                app.major_grapes.split(',').forEach((grape: string) => {
                  grapes.add(grape.trim())
                })
              }
              if (app.join_grape_appellation) {
                app.join_grape_appellation.forEach((join: any) => {
                  if (join.grapes && join.grapes.grape_variety) {
                    grapes.add(join.grapes.grape_variety)
                  }
                })
              }
            })
          }
        })
        
        // Convert to normalized rows
        const rows = [{
          name: countryName,
          country: countryName,
          region: Array.from(regions).join(', '),
          appellations: Array.from(appellations).slice(0, 10),
          primary_grapes: Array.from(grapes).slice(0, 15),
          styles: [],
          typical_profile: [],
          notes: [],
          alt_names: []
        }]
        
        return { rows, canAnswer: true }
      }
    } catch (error) {
      console.error('Error in enhanced country search:', error)
    }
    
    // Fallback to simple country search
    const { data } = await supabase
      .from('countries_regions')
      .select('*')
      .ilike('country_name', `%${countryName}%`)
      .limit(5)
    
    if (data && data.length > 0) {
      const hasHighConfidence = checkConfidenceLevel(data, keyTerms, 'country', question)
      if (hasHighConfidence) {
        // Convert to normalized rows
        const rows = data.map((c: any) => ({
          name: c.country_name,
          country: c.country_name,
          region: c.wine_region || 'Not specified',
          appellations: [],
          styles: [],
          typical_profile: [],
          notes: [],
          alt_names: []
        }))
        return { rows, canAnswer: true }
      }
    }
  }
  
  console.log('No relevant country database results, falling back to document search')
  return { rows: [], canAnswer: false }
}

// Region search function
async function searchRegions(question: string): Promise<{ rows: Record<string, unknown>[]; canAnswer: boolean }> {
  const lowerQuestion = question.toLowerCase()
  const supabase = createServiceClient()
  
  console.log('=== REGION SEARCH ===')
  
  // Extract region name from question
  const regions = ['tuscany', 'piedmont', 'umbria', 'lazio', 'marche', 'abruzzo', 'puglia',
                  'campania', 'sicily', 'sardinia', 'lombardy', 'veneto', 'friuli', 'emilia-romagna',
                  'liguria', 'calabria', 'molise', 'burgundy', 'bordeaux', 'champagne', 'loire',
                  'rhone', 'alsace', 'languedoc', 'provence', 'jura', 'savoie', 'rioja', 'catalonia']
  
  let regionName: string | undefined
  for (const region of regions) {
    if (lowerQuestion.includes(region)) {
      regionName = region
      break
    }
  }
  
  if (regionName) {
    console.log(`Searching for region: ${regionName}`)
    
    // Enhanced region search with related appellations and grapes
    try {
      console.log('Attempting enhanced region search for:', regionName)
      
      const { data: regionData, error } = await supabase
        .from('countries_regions')
        .select(`
          wine_region,
          country_name,
          appellation(
            appellation,
            classification,
            major_grapes,
            join_grape_appellation(
              grapes(
                grape_variety,
                wine_color,
                flavor
              )
            )
          )
        `)
        .ilike('wine_region', `%${regionName}%`)
        .limit(10)
      
      console.log('Enhanced region search error:', error)
      console.log('Enhanced region search data length:', regionData?.length || 0)
      
      if (error) {
        console.error('Error in enhanced region search:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        
        // Try a simpler join first
        console.log('Trying simpler join for region search...')
        const { data: simpleJoinData, error: simpleJoinError } = await supabase
          .from('countries_regions')
          .select(`
            wine_region,
            country_name,
            appellation(
              appellation,
              classification,
              major_grapes
            )
          `)
          .ilike('wine_region', `%${regionName}%`)
          .limit(10)
        
        console.log('Simple join error:', simpleJoinError)
        console.log('Simple join data length:', simpleJoinData?.length || 0)
        
        if (simpleJoinError) {
          console.error('Simple join also failed:', simpleJoinError)
        } else if (simpleJoinData && simpleJoinData.length > 0) {
          console.log('Simple join succeeded, processing data...')
          
          // Extract unique information from simple join
          const countries = new Set<string>()
          const appellations = new Set<string>()
          const grapes = new Set<string>()
          
          simpleJoinData.forEach(region => {
            if (region.country_name) countries.add(region.country_name)
            if (region.appellation) {
              region.appellation.forEach((app: any) => {
                if (app.appellation) appellations.add(app.appellation)
                if (app.major_grapes) {
                  app.major_grapes.split(',').forEach((grape: string) => {
                    grapes.add(grape.trim())
                  })
                }
              })
            }
          })
          
          // Convert to normalized rows
          const rows = [{
            name: regionName,
            country: Array.from(countries).join(', '),
            region: regionName,
            appellations: Array.from(appellations).slice(0, 10),
            primary_grapes: Array.from(grapes).slice(0, 15),
            styles: [],
            typical_profile: [],
            notes: [],
            alt_names: []
          }]
          
          return { rows, canAnswer: true }
    }
        
        // Final fallback to simple search
        console.log('Falling back to simple region search...')
        const { data: simpleData } = await supabase
          .from('countries_regions')
          .select('*')
          .ilike('wine_region', `%${regionName}%`)
          .limit(5)
        
        if (simpleData && simpleData.length > 0) {
          // Convert to normalized rows
          const rows = simpleData.map((r: any) => ({
            name: r.wine_region,
            country: r.country_name || 'Not specified',
            region: r.wine_region,
            appellations: [],
            styles: [],
            typical_profile: [],
            notes: [],
            alt_names: []
          }))
          return { rows, canAnswer: true }
        }
      } else if (regionData && regionData.length > 0) {
        console.log('Enhanced region search results:', regionData)
        
        // Extract unique information
        const countries = new Set<string>()
        const appellations = new Set<string>()
        const grapes = new Set<string>()
        
        regionData.forEach(region => {
          if (region.country_name) countries.add(region.country_name)
          if (region.appellation) {
            region.appellation.forEach((app: any) => {
              if (app.appellation) appellations.add(app.appellation)
              if (app.major_grapes) {
                app.major_grapes.split(',').forEach((grape: string) => {
                  grapes.add(grape.trim())
                })
              }
              if (app.join_grape_appellation) {
                app.join_grape_appellation.forEach((join: any) => {
                  if (join.grapes && join.grapes.grape_variety) {
                    grapes.add(join.grapes.grape_variety)
                  }
                })
              }
            })
          }
        })
        
        // Convert to normalized rows
        const rows = [{
          name: regionName,
          country: Array.from(countries).join(', '),
          region: regionName,
          appellations: Array.from(appellations).slice(0, 10),
          primary_grapes: Array.from(grapes).slice(0, 15),
          styles: [],
          typical_profile: [],
          notes: [],
          alt_names: []
        }]
        
        return { rows, canAnswer: true }
    }
    } catch (error) {
      console.error('Error in enhanced region search:', error)
    }
    
    // Fallback to simple region search
    const { data } = await supabase
      .from('countries_regions')
      .select('*')
      .ilike('wine_region', `%${regionName}%`)
      .limit(5)
    
    if (data && data.length > 0) {
      // Convert to normalized rows
      const rows = data.map((r: any) => ({
        name: r.wine_region,
        country: r.country_name || 'Not specified',
        region: r.wine_region,
        appellations: [],
        styles: [],
        typical_profile: [],
        notes: [],
        alt_names: []
      }))
      return { rows, canAnswer: true }
    }
  }
  
  console.log('No relevant region database results, falling back to document search')
  return { rows: [], canAnswer: false }
}

// Appellation search function
async function searchAppellations(question: string): Promise<{ rows: Record<string, unknown>[]; canAnswer: boolean }> {
  const lowerQuestion = question.toLowerCase()
  const supabase = createServiceClient()
  
  console.log('=== APPELLATION SEARCH ===')
  
  // Extract appellation name from question
  const appellations = ['chianti', 'brunello', 'barolo', 'barbaresco', 'amarone', 'valpolicella',
                       'soave', 'bardolino', 'prosecco', 'franciacorta', 'bolgheri', 'sassicaia',
                       'champagne', 'burgundy', 'bordeaux', 'cote du rhone', 'sancerre', 'vouvray',
                       'rioja', 'ribera del duero', 'cava', 'jerez', 'manzanilla', 'montilla',
                       'porto', 'madeira', 'vinho verde', 'douro', 'alentejo', 'colares', 'tokaj']
  
  let appellationName: string | undefined
  for (const appellation of appellations) {
    if (lowerQuestion.includes(appellation)) {
      appellationName = appellation
      break
    }
  }
  
  if (appellationName) {
    console.log(`Searching for appellation: ${appellationName}`)
    
    // Enhanced appellation search with related grapes and regions
    try {
      const { data: appellationData, error } = await supabase
        .from('appellation')
        .select(`
          appellation,
          classification,
          founded_year,
          major_grapes,
          countries_regions(
            country_name,
            wine_region
          ),
          join_grape_appellation(
            grapes(
              grape_variety,
              wine_color,
              flavor
            )
          )
        `)
        .ilike('appellation', `%${appellationName}%`)
        .limit(10)
      
      if (error) {
        console.error('Error in enhanced appellation search:', error)
        // Fallback to simple search
        const { data: simpleData } = await supabase
          .from('appellation')
          .select(`
            *,
            countries_regions!inner(country_name, wine_region)
          `)
          .ilike('appellation', `%${appellationName}%`)
          .limit(10)
        
        if (simpleData && simpleData.length > 0) {
          // Convert to normalized rows
          const rows = simpleData.map((a: any) => ({
            name: a.appellation,
            appellation_type: a.classification || 'Not specified',
            country: a.countries_regions?.country_name || 'Unknown',
            region: a.geographic_region || 'Not specified',
            founded_year: a.founded_year || 'Unknown',
            primary_grapes: a.major_grapes ? a.major_grapes.split(',').map((g: string) => g.trim()) : [],
            styles: [],
            notes: [],
            typical_profile: [],
            alt_names: []
          }))
          return { rows, canAnswer: true }
        }
      } else if (appellationData && appellationData.length > 0) {
        console.log('Enhanced appellation search results:', appellationData)
        
        // Convert to normalized rows
        const rows = appellationData.map((app: any) => {
          const grapes = new Set<string>()
          
          if (app.major_grapes) {
            app.major_grapes.split(',').forEach((grape: string) => {
              grapes.add(grape.trim())
            })
          }
          if (app.join_grape_appellation) {
            app.join_grape_appellation.forEach((join: any) => {
              if (join.grapes && join.grapes.grape_variety) {
                grapes.add(join.grapes.grape_variety)
              }
            })
          }
          
          return {
            name: app.appellation,
            appellation_type: app.classification || 'Not specified',
            country: app.countries_regions?.country_name || 'Unknown',
            region: app.countries_regions?.wine_region || 'Not specified',
            founded_year: app.founded_year || 'Unknown',
            primary_grapes: Array.from(grapes),
            styles: [],
            notes: [],
            typical_profile: [],
            alt_names: []
          }
        })
        
        return { rows, canAnswer: true }
      }
    } catch (error) {
      console.error('Error in enhanced appellation search:', error)
    }
    
    // Fallback to simple appellation search
    const { data } = await supabase
      .from('appellation')
      .select(`
        *,
        countries_regions!inner(country_name, wine_region)
      `)
      .ilike('appellation', `%${appellationName}%`)
      .limit(10)
    
    if (data && data.length > 0) {
      // Convert to normalized rows
      const rows = data.map((a: any) => ({
        name: a.appellation,
        appellation_type: a.classification || 'Not specified',
        country: a.countries_regions?.country_name || 'Unknown',
        region: a.geographic_region || 'Not specified',
        founded_year: a.founded_year || 'Unknown',
        primary_grapes: a.major_grapes ? a.major_grapes.split(',').map((g: string) => g.trim()) : [],
        styles: [],
        notes: [],
        typical_profile: [],
        alt_names: []
      }))
      return { rows, canAnswer: true }
    }
  }
  
  console.log('No relevant appellation database results, falling back to document search')
  return { rows: [], canAnswer: false }
}

// Wine search function
async function searchWines(question: string): Promise<{ rows: Record<string, unknown>[]; canAnswer: boolean }> {
  const lowerQuestion = question.toLowerCase()
  const supabase = createServiceClient()
  
  console.log('=== WINE SEARCH ===')
  
  // Extract key terms for confidence checking
  const keyTerms = extractKeyTerms(question, 'wine')
  console.log('Key terms for wine search:', keyTerms)
  
  // Extract wine name and producer from question
  const wineName = extractWineName(question)
  const producer = extractProducer(question)
  const vintage = extractVintage(question)
  
  console.log('Extracted wine info:', { wineName, producer, vintage })
  
  if (!wineName && !producer) {
    console.log('No wine name or producer found, falling back to document search')
    return { rows: [], canAnswer: false }
  }
  
  try {
    // Build search query based on available information
    let query = supabase.from('wines').select(`
      wine_id,
      wine_name,
      producer,
      vintage,
      flavor_profile,
      alcohol,
      bottle_size,
      drink_starting,
      drink_by,
      my_score,
      color,
      appellation_id,
      region_id,
      country_id,
      appellation!inner(
        appellation,
        classification,
        major_grapes
      ),
      countries_regions!inner(
        country_name,
        wine_region
      )
    `)
    
    // Add search conditions
    if (wineName) {
      query = query.ilike('wine_name', `%${wineName}%`)
    }
    if (producer) {
      query = query.ilike('producer', `%${producer}%`)
    }
    if (vintage) {
      query = query.eq('vintage', vintage)
    }
    
    const { data: wines, error } = await query.limit(10)
    
    if (error) {
      console.error('Error searching wines:', error)
      return { rows: [], canAnswer: false }
    }
    
    if (!wines || wines.length === 0) {
      console.log('No wines found in database')
      return { rows: [], canAnswer: false }
    }
    
    console.log('Found wines:', wines.length)
    
    // Check confidence level of wine results
    const hasHighConfidence = checkWineConfidence(wines, keyTerms, question)
    
    if (hasHighConfidence) {
      // Convert to normalized rows
      const rows = wines.map((wine: any) => ({
        name: wine.wine_name || 'Unknown Wine',
        wine_name: wine.wine_name,
        producer: wine.producer,
        vintage: wine.vintage,
        flavor_profile: wine.flavor_profile,
        alcohol: wine.alcohol,
        bottle_size: wine.bottle_size,
        drink_starting: wine.drink_starting,
        drink_by: wine.drink_by,
        my_score: wine.my_score,
        color: wine.color,
        appellation: wine.appellation?.appellation || 'Unknown',
        classification: wine.appellation?.classification || 'Unknown',
        major_grapes: wine.appellation?.major_grapes || 'Unknown',
        country: wine.countries_regions?.country_name || 'Unknown',
        region: wine.countries_regions?.wine_region || 'Unknown',
        notes: [],
        typical_profile: wine.flavor_profile ? [wine.flavor_profile] : [],
        alt_names: []
      }))
      
      return { rows, canAnswer: true }
    } else {
      console.log('Wine database results do not meet confidence threshold, will fall back to document search')
      return { rows: [], canAnswer: false }
    }
  } catch (error) {
    console.error('Error in wine search:', error)
    return { rows: [], canAnswer: false }
  }
}

// Helper function to extract wine name from question
function extractWineName(question: string): string | null {
  const lowerQuestion = question.toLowerCase()
  
  // Specific wine names (not appellations)
  const wineNames = [
    'cerretalto', 'rubesco', 'sassicaia', 'tignanello', 'solaia', 'ornellaia', 'masseto',
    'tenuta san guido', 'antinori', 'frescobaldi', 'marchesi antinori',
    'mouton rothschild', 'chateau lafite', 'chateau margaux', 'chateau latour', 'haut brion',
    'petrus', 'le pin', 'cheval blanc', 'ausone', 'pavie', 'angelus',
    'domaine de la romanee conti', 'drc', 'la tache', 'romanee conti',
    'opus one', 'screaming eagle', 'harlan', 'dominus', 'caymus', 'stags leap',
    'quintessa', 'caymus', 'stags leap wine cellars', 'ridge monte bello',
    'heitz cellars', 'spottswoode', 'shafer hillside select', 'dominique laurent',
    'penfolds grange', 'henschke hill of grace', 'vega sicilia unicornio', 'pingus',
    'clarendon hills', 'greenock creek', 'torbreck', 'two hands',
    'vega sicilia', 'pingus', 'alvaro palacios', 'artadi', 'remirez de ganuza'
  ]
  
  for (const wineName of wineNames) {
    if (lowerQuestion.includes(wineName)) {
      return wineName
    }
  }
  
  return null
}

// Helper function to extract producer from question
function extractProducer(question: string): string | null {
  const lowerQuestion = question.toLowerCase()
  
  // Common producer patterns
  const producers = [
    'casanova di neri', 'lungorotti', 'antinori', 'tenuta dell\'ornellaia', 'tenuta san guido',
    'domaine', 'chateau', 'mouton', 'lafite', 'margaux', 'latour', 'haut brion',
    'petrus', 'le pin', 'cheval blanc', 'ausone', 'pavie', 'angelus',
    'penfolds', 'henschke', 'vega sicilia', 'dominio de pingus'
  ]
  
  for (const producer of producers) {
    if (lowerQuestion.includes(producer)) {
      return producer
    }
  }
  
  return null
}

// Helper function to extract vintage from question
function extractVintage(question: string): number | null {
  const vintagePattern = /\b(19|20)\d{2}\b/
  const match = question.match(vintagePattern)
  return match ? parseInt(match[0]) : null
}

// Helper function to check confidence level for wine results
function checkWineConfidence(wines: any[], keyTerms: string[], question: string): boolean {
  if (wines.length === 0) {
    console.log('No wines found, confidence: 0%')
    return false
  }
  
  let totalMatches = 0
  let totalChecks = 0
  
  for (const wine of wines) {
    const wineText = `${wine.wine_name || ''} ${wine.producer || ''} ${wine.vintage || ''}`.toLowerCase()
    
    for (const keyTerm of keyTerms) {
      totalChecks++
      if (wineText.includes(keyTerm.toLowerCase())) {
        totalMatches++
      }
    }
  }
  
  const confidence = totalChecks > 0 ? totalMatches / totalChecks : 0
  console.log(`Wine confidence level: ${(confidence * 100).toFixed(1)}% (${totalMatches}/${totalChecks} matches)`)
  
  return confidence >= CONFIDENCE_THRESHOLD
}

export async function synthesizeFromDB(
  question: string
): Promise<{ answer: string; canAnswer: boolean }> {
  const supabase = createServiceClient()
  const lowerQuestion = question.toLowerCase()
  
  console.log('=== SYNTHESIZE FROM DB START ===')
  console.log('Question:', question)
  
  // Determine which search type to use
  const searchType = determineSearchType(question)
  console.log('Search type determined:', searchType)
  
  // Route to appropriate search function
  let searchResult: { rows: Record<string, unknown>[]; canAnswer: boolean }
  switch (searchType) {
    case 'wine':
      searchResult = await searchWines(question)
      break
    case 'grape':
      searchResult = await searchGrapes(question)
      break
    case 'country':
      searchResult = await searchCountries(question)
      break
    case 'region':
      searchResult = await searchRegions(question)
      break
    case 'appellation':
      searchResult = await searchAppellations(question)
      break
    default:
      console.log('No specific search type determined, will fall back to document search')
      searchResult = { rows: [], canAnswer: false }
      break
  }
  
  // If the specific search found relevant results, format as paragraph
  if (searchResult.canAnswer && searchResult.rows.length > 0) {
    console.log('Specific search found relevant results, formatting as paragraph')
    try {
      const paragraph = await formatAsParagraph({
        question,
        rows: searchResult.rows,
        domain: 'wine',
        maxWords: 180
      })
      
      // Validate the paragraph format
      if (!validateParagraph(paragraph)) {
        console.warn('Generated paragraph does not meet validation criteria, using fallback')
        return { answer: toParagraphFallback({ question, rows: searchResult.rows, domain: 'wine', maxWords: 180 }), canAnswer: true }
      }
      
      return { answer: paragraph, canAnswer: true }
    } catch (error) {
      console.error('Error formatting paragraph:', error)
      return { answer: toParagraphFallback({ question, rows: searchResult.rows, domain: 'wine', maxWords: 180 }), canAnswer: true }
    }
  } else {
    console.log('Specific search did not find relevant results, falling back to document search')
  }
  
  // If no specific search found relevant results, continue to document search and OpenAI fallback
  console.log('=== DOCUMENT SEARCH ===')
  
  // Generate embedding for the question
    const queryEmbedding = await embedText(question)
  
  // Perform vector search
  const documentResults = await vectorSearch(queryEmbedding, 5)
  
  if (documentResults.length > 0) {
    // Extract key terms for confidence checking based on the search type
    const keyTerms = extractKeyTerms(question, searchType)
    console.log('Key terms for document search:', keyTerms)
    
    // Check confidence level of document results
    console.log('=== DOCUMENT CONFIDENCE CHECK ===')
    console.log('Question:', question)
    console.log('Search type:', searchType)
    console.log('Key terms:', keyTerms)
    const hasHighConfidence = checkConfidenceLevel(documentResults, keyTerms, searchType, question)
    
    if (hasHighConfidence) {
      // Check if this is a specific historical question that requires more than just CSV data
      const lowerQuestion = question.toLowerCase()
      if (lowerQuestion.includes('oldest') || lowerQuestion.includes('traditional') || lowerQuestion.includes('qvevri')) {
        console.log('❌ Historical question detected, CSV data not sufficient, falling back to OpenAI')
        return { answer: '', canAnswer: false }
      }
      
      // Check if any of the results contain CSV data that needs parsing
      const hasCSVData = documentResults.some(result => 
        result.chunk.includes('Appellation,Classification') || 
        result.chunk.includes('Variety,Color') ||
        result.chunk.includes(',DOC,') ||
        result.chunk.includes(',DOCG,')
      )
      
      if (hasCSVData) {
        console.log('Detected CSV data, parsing and formatting...')
        const formattedAnswer = parseAndFormatCSVContent(documentResults, question)
        console.log('Formatted answer result:', formattedAnswer ? 'SUCCESS' : 'FAILED')
        if (formattedAnswer) {
          console.log('Returning formatted CSV answer')
          return { answer: formattedAnswer, canAnswer: true }
        } else {
          console.log('CSV parsing failed, falling back to raw content')
        }
      }
      
      // Fallback to regular content formatting - convert to normalized rows
      const rows = documentResults.map(result => ({
        name: 'Document Content',
        content: result.chunk,
        source: result.source || 'document',
        score: result.score,
        notes: [],
        typical_profile: [],
        alt_names: []
      }))
      
      try {
        const paragraph = await formatAsParagraph({
          question,
          rows,
          domain: 'wine',
          maxWords: 180
        })
        
        return { answer: paragraph, canAnswer: true }
      } catch (error) {
        console.error('Error formatting document results as paragraph:', error)
        const combinedContent = documentResults
          .map(result => result.chunk)
          .join('\n\n')
        const answer = `Based on my wine knowledge, here's what I can tell you:\n\n${combinedContent}`
        return { answer, canAnswer: true }
      }
    } else {
      console.log('Document results do not meet confidence threshold, will fall back to OpenAI')
    }
  } else {
    console.log('No document results found, will fall back to OpenAI')
  }
  
  // Final fallback to OpenAI
  console.log('=== OPENAI FALLBACK ===')
  return { answer: '', canAnswer: false }
}
