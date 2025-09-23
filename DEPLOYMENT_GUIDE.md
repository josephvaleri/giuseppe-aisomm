# Giuseppe the AISomm - Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `giuseppe-aisomm`
3. Description: `Giuseppe the AISomm - AI Wine Expert with RAG and ML`
4. Make it **Public**
5. **Don't** initialize with README, .gitignore, or license
6. Click "Create repository"

### 2. Connect Local Repository to GitHub
```bash
# Replace YOUR_USERNAME with your actual GitHub username
git remote add origin https://github.com/YOUR_USERNAME/giuseppe-aisomm.git
git push -u origin main
```

### 3. Deploy to Vercel
1. Go to https://vercel.com/new
2. Import from GitHub: `giuseppe-aisomm`
3. Framework: Next.js (auto-detected)
4. Add Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `OPENAI_API_KEY`
   - `PADDLE_VENDOR_ID`
   - `PADDLE_VENDOR_AUTH_CODE`
   - `PADDLE_WEBHOOK_SECRET`
5. Click "Deploy"

### 4. Post-Deployment
1. Run SQL migrations in Supabase SQL editor
2. Test the live application
3. Update any hardcoded URLs if needed

## 📁 Project Structure
- ✅ Complete Next.js 14 application
- ✅ Supabase integration with RLS policies
- ✅ Authentication system with role-based access
- ✅ Admin panel with avatar management
- ✅ Wine jokes management system
- ✅ Responsive UI with TailwindCSS
- ✅ All dependencies configured

## 🔧 Environment Variables Needed
Copy these from your `.env.local` to Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key
PADDLE_VENDOR_ID=your_paddle_vendor_id
PADDLE_VENDOR_AUTH_CODE=your_paddle_auth_code
PADDLE_WEBHOOK_SECRET=your_paddle_webhook_secret
```

## 📋 SQL Migrations to Run
Run these in your Supabase SQL editor after deployment:
1. `001_initial_schema.sql`
2. `002_vector_search_function.sql`
3. `003_roles_and_trial.sql`
4. `008_seed_wine_jokes_complete.sql`
5. `015_simple_storage_fix.sql`

## 🎯 Ready for Production!
Your application is fully configured and ready for deployment.
