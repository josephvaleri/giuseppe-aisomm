# Giuseppe AISomm Question-Answering System Flow

## Complete Function Call Map

```
POST /api/ask
├── 1. AUTHENTICATION & VALIDATION
│   ├── createClient() → Supabase client
│   ├── supabase.auth.getUser() → User authentication
│   ├── AskSchema.parse(body) → Input validation (Zod)
│   └── openai.moderations.create() → Content moderation
│
├── 2. ML MODEL LOADING
│   ├── getMLInference() → Load ML models
│   │   ├── loadModels() → Load intent, reranker, route models
│   │   └── loadEntityDictionaries() → Load wine entity dictionaries
│   └── extractQuestionFeatures(question, dicts) → Extract question features
│
├── 3. INTENT CLASSIFICATION
│   ├── mlInference.predictIntent(questionFeatures) → Classify intent
│   │   ├── pairing, region, grape, cellar, recommendation, joke, non_wine
│   └── mlInference.shouldRedirectNonWine(intentScores) → Check for non-wine redirect
│
├── 4. DOCUMENT RETRIEVAL (RAG)
│   ├── searchDocuments(question, 6) → Vector search
│   │   ├── embedText(question) → Generate embeddings
│   │   ├── vectorSearch(queryEmbedding, limit) → Vector similarity search
│   │   └── supabase.rpc('match_all_documents') → Database vector search
│   └── extractRetrievalFeatures(question, retrievedChunks, 'db') → Extract retrieval features
│
├── 5. CONTENT RERANKING
│   └── mlInference.rerankCandidates() → ML-based reranking
│       ├── Create features for each candidate
│       ├── Apply reranker model
│       └── Sort by rerank score
│
├── 6. DATABASE SYNTHESIS
│   └── synthesizeFromDB(question) → Try database first
│       ├── determineSearchType(question) → Determine search type
│       │   ├── 'wine' → searchWines() [NEW]
│       │   ├── 'grape' → searchGrapes()
│       │   ├── 'country' → searchCountries()
│       │   ├── 'region' → searchRegions()
│       │   └── 'appellation' → searchAppellations()
│       ├── checkConfidenceLevel() → Validate result confidence
│       └── formatAsParagraph() → Format results into narrative
│
├── 7. ROUTE PREDICTION
│   ├── extractRouteFeatures() → Extract route decision features
│   └── mlInference.predictRoute() → Predict answer source
│
├── 8. ANSWER GENERATION DECISION TREE
│   ├── isWineTopic(question) → Check if wine-related (350+ keywords)
│   │
│   ├── A. NON-WINE TOPICS
│   │   └── Return error: "I am sorry, I cannot answer this question..."
│   │
│   ├── B. FOOD PAIRING QUESTIONS
│   │   ├── buildUserPrompt(question, context)
│   │   └── openai.chat.completions.create() → Giuseppe persona
│   │
│   ├── C. GENERIC FALLBACK DETECTION
│   │   ├── Complex logic to detect generic responses
│   │   ├── Check route score, answer patterns, list formatting
│   │   └── Route to OpenAI if generic
│   │
│   ├── D. HIGH-QUALITY DATABASE ANSWERS
│   │   └── Use database synthesis result
│   │
│   └── E. OPENAI WITH RAG
│       ├── buildUserPrompt(question, context)
│       └── openai.chat.completions.create() → Giuseppe persona
│
├── 9. RESPONSE FORMATTING
│   ├── getRandomItalianStarter() → Add Italian encouragement
│   └── Giuseppe persona formatting → Authentic Italian wine expert personality
│
├── 10. LOGGING & ANALYTICS
│   ├── questions_answers table → Log Q&A for authenticated users
│   ├── ml_events table → Log ML predictions
│   └── moderation_items table → Add to moderation queue
│
└── 11. ERROR HANDLING
    ├── Try-catch blocks for all operations
    ├── Zod validation error handling
    ├── OpenAI API error handling
    └── Database error handling
```

## Key Function Descriptions

### Authentication & Validation
- **createClient()**: Creates Supabase client for database operations
- **getUser()**: Authenticates user and checks trial status
- **AskSchema.parse()**: Validates question format (3-1000 characters)
- **moderations.create()**: OpenAI content moderation

### ML Processing
- **getMLInference()**: Loads trained ML models (intent, reranker, route)
- **predictIntent()**: Classifies question intent into 7 categories
- **rerankCandidates()**: Uses ML to rerank retrieved content by relevance
- **predictRoute()**: Decides between database vs OpenAI for final answer

### RAG System
- **embedText()**: Creates embeddings using OpenAI text-embedding-3-large
- **vectorSearch()**: Performs vector similarity search in database
- **searchDocuments()**: Main document retrieval function
- **extractRetrievalFeatures()**: Extracts features from retrieved content

### Database Operations
- **synthesizeFromDB()**: Attempts to answer from structured database
- **determineSearchType()**: Routes to appropriate search function
- **searchGrapes()**: Searches grape varieties with complex joins
- **searchCountries()**: Searches country information with appellations
- **searchRegions()**: Searches regional information with grapes
- **searchAppellations()**: Searches appellation details
- **checkConfidenceLevel()**: Validates result confidence (70% threshold)

### Wine Search (NEW)
- **searchWines()**: Searches specific wines in the wines table
- **isWineQuestion()**: Detects wine questions (wine name + producer, or wine name + vintage)
- **extractWineName()**: Extracts wine names from questions
- **extractProducer()**: Extracts producer names from questions  
- **extractVintage()**: Extracts vintage years from questions
- **checkWineConfidence()**: Validates wine search result confidence
- **Wine Detection Patterns**: 
  - Wine name + producer: "Casanova di Neri Cerretalto"
  - Wine name + vintage: "2018 Lungorotti Rubesco"
  - Question patterns: "tell me about", "what is", "about this wine"

### Giuseppe Persona
- **getRandomItalianStarter()**: Adds randomized Italian encouragement
- **buildUserPrompt()**: Creates context-aware prompts for OpenAI
- **isFoodPairingQuestion()**: Detects food pairing questions
- **GIUSEPPE_SYSTEM_PROMPT**: Defines Giuseppe's personality and style

### Answer Routing Logic
1. **Wine Topic Detection**: 350+ wine keywords determine if question is wine-related
2. **Non-Wine Redirect**: Returns error message for non-wine topics
3. **Food Pairing**: Routes to OpenAI with Giuseppe persona
4. **Generic Fallback**: Detects when database answer is too generic
5. **High-Quality DB**: Uses database synthesis for specific wine data
6. **OpenAI RAG**: Uses OpenAI with retrieved context for comprehensive answers

### Logging & Analytics
- **questions_answers**: Logs all Q&A interactions for authenticated users
- **ml_events**: Tracks ML predictions and scores
- **moderation_items**: Adds new Q&A to moderation queue
- **retrieval_debug**: Stores debugging information for analysis

## Performance Optimizations

1. **Parallel Processing**: ML model loading and entity dictionary loading happen in parallel
2. **Confidence Thresholds**: 70% confidence threshold prevents low-quality answers
3. **Fallback Hierarchy**: Database → Document Search → OpenAI ensures comprehensive coverage
4. **Caching**: ML models are cached as singleton instances
5. **Early Returns**: Non-wine topics are filtered early to save processing

## Error Handling Strategy

1. **Input Validation**: Zod schema validation with clear error messages
2. **Content Moderation**: OpenAI moderation prevents inappropriate content
3. **Graceful Degradation**: Fallback to OpenAI when database fails
4. **User-Friendly Errors**: Giuseppe personality maintained even in error states
5. **Comprehensive Logging**: All errors logged for debugging and improvement
