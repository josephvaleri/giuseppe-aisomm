# Giuseppe the AISomm

A production-ready wine expert AI assistant built with Next.js 14, Supabase, and OpenAI.

## Features

- **Giuseppe Persona**: Authentic Italian wine expert with randomized Italian encouragements
- **RAG System**: Vector search with pgvector for wine knowledge retrieval
- **ML Pipeline**: Intent classification, reranking, and route selection
- **Authentication**: Role-based access with trial system
- **Moderation**: Admin tools for content moderation and feedback
- **Payments**: Paddle integration for subscriptions (7-day free trial)

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS, shadcn/ui, Framer Motion
- **Backend**: Supabase (Postgres, Auth, Storage, pgvector)
- **AI**: OpenAI (GPT-4o-mini, text-embedding-3-large)
- **Payments**: Paddle
- **Deploy**: Vercel

## Setup

1. **Environment Variables**
   ```bash
   cp .env.local.example .env.local
   # Fill in your Supabase and OpenAI credentials
   ```

2. **Database Setup**
   ```bash
   # Run migrations in Supabase dashboard or CLI
   # Files are in supabase/migrations/
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```

4. **Seed Data**
   ```bash
   npx tsx scripts/seed-jokes.ts
   ```

5. **Run Development Server**
   ```bash
   npm run dev
   ```

## Database Schema

The app uses existing wine domain tables from the CSV:
- `countries_regions`, `appellation`, `grapes`, `wines`, etc.

Plus new operational tables:
- `doc_chunks` - Vector embeddings for RAG
- `questions_answers` - Q&A logging with feedback
- `moderation_items` - Content moderation workflow
- `ml_models` - ML model storage
- `settings` - Admin configuration

## API Routes

- `POST /api/ask` - Main question answering endpoint
- `POST /api/feedback` - User feedback on answers
- `POST /api/admin/retrain` - Force ML model retraining
- `POST /api/paddle/webhook` - Payment webhooks

## Pages

- `/` - Main Giuseppe interface
- `/auth/login` - Authentication
- `/admin` - Admin dashboard
- `/moderation` - Content moderation queue

## ML System

The app includes a complete ML pipeline:

1. **Intent Classification**: Categorizes user questions
2. **Reranking**: Improves retrieval relevance
3. **Route Selection**: Chooses between DB synthesis vs LLM
4. **Active Learning**: Retrains on user feedback

## Deployment

1. Deploy to Vercel
2. Set environment variables
3. Run database migrations
4. Seed initial data

## License

MIT
