# JobFinder - AI-Powered Job Matching Platform

A production-ready job platform that connects employers and candidates using advanced AI matching with OpenAI embeddings and GPT-based scoring.

## 🚀 Features

### Core Features
- **🤖 AI Job-Candidate Matching**: Advanced matching using OpenAI embeddings and GPT-4 scoring
- **👥 Multi-Role Support**: Candidates, Employers, and Admins with role-based access
- **🔐 Secure Authentication**: Email/password + OAuth with Supabase Auth
- **📊 Real-time Analytics**: Match scores with explanations and missing skills analysis
- **💬 Messaging System**: Application-threaded communication
- **📱 Responsive Design**: Mobile-first with Tailwind CSS

### For Candidates
- Complete profile management with resume upload
- AI-powered job recommendations
- Application tracking and status updates
- Match score explanations
- Skill gap analysis

### For Employers
- Company profile and team management
- Advanced job posting with rich text descriptions
- AI-matched candidate discovery
- Application pipeline management
- Candidate communication

### For Admins
- User and job management
- Platform analytics
- Verification controls

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Auth/DB/Storage**: Supabase (PostgreSQL + Row Level Security)
- **API/Server**: Supabase Edge Functions (TypeScript/Deno)
- **AI**: OpenAI API (GPT-4o-mini + text-embedding-3-large)
- **State Management**: React Query (TanStack Query)
- **Forms**: React Hook Form + Zod validation
- **Vector Search**: pgvector extension
- **Development**: ESLint, Prettier, Vitest + React Testing Library

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase CLI
- OpenAI API key
- Git

## 🚀 Quick Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- OpenAI API key (optional, for AI features)

### Installation

1. **Clone and install**
   ```bash
   git clone https://github.com/himanshusinghcoder/job_board.git
   cd job_board
   npm install
   ```

2. **Environment setup**
   ```bash
   # Copy the environment template
   cp .env.example .env
   
   # Edit .env file with your credentials:
   # VITE_SUPABASE_URL=your_supabase_project_url
   # VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   # OPENAI_API_KEY=your_openai_api_key
   # VITE_APP_URL=http://localhost:3000
   ```

3. **Database setup**
   - Create a new project on [supabase.com](https://supabase.com)
   - Run these SQL files in order in your Supabase SQL Editor:
     1. `step1-basic-auth.sql`
     2. `step2-add-missing-tables.sql` 
     3. `dashboard-test-data.sql` (optional - adds jobs, employers, and applications for testing)
   
   - Add this essential policy:
   ```sql
   CREATE POLICY "Read profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
   ```

4. **Start development**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:3000](http://localhost:3000)

## 🔧 Development

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run linting
npm test         # Run tests
```

## 📊 Database Schema

### Key Tables

- `profiles` - User profiles with roles
- `candidate_profiles` - Extended candidate data with embeddings
- `employers` - Company information
- `jobs` - Job postings with embeddings
- `applications` - Job applications with status tracking
- `matches` - AI-generated job-candidate match scores
- `messages` - Application-threaded messaging

### Extensions Used

- `pgvector` - Vector similarity search
- `uuid-ossp` - UUID generation
- `pgcrypto` - Cryptographic functions

## 🔄 AI Matching Pipeline

### 1. Embedding Generation
- Candidate profiles → OpenAI embeddings (skills, experience, resume)
- Job postings → OpenAI embeddings (requirements, description)

### 2. Vector Search (Recall)
- pgvector cosine similarity for initial candidate/job filtering
- Returns top 100 candidates for each job

### 3. LLM Re-ranking (Precision)
- GPT-4o-mini scores each candidate-job pair (0-100)
- Considers skills match, experience, location, salary fit
- Returns explanations and missing skills analysis

### 4. Scoring Factors
- **Skills Match** (40%): Technical and soft skills alignment
- **Experience Level** (25%): Years of experience vs requirements
- **Location Compatibility** (15%): Remote vs onsite preferences
- **Work Type Preferences** (10%): Full-time, contract, etc.
- **Salary Alignment** (10%): Expected vs offered compensation

## 🔐 Security Features

### Row Level Security (RLS)
- Users can only access their own data
- Candidates control profile visibility
- Employers can only see applicants to their jobs
- Admins have elevated access for platform management

### Authentication
- JWT-based authentication via Supabase Auth
- Password requirements and validation
- Protected routes with role-based access control

### Data Privacy
- Resume files stored securely in Supabase Storage
- Sensitive data encrypted at rest
- API rate limiting and validation

## � Deployment

### Production Setup
1. **Frontend**: Deploy to Vercel/Netlify with environment variables
2. **Database**: Create production Supabase project and run migrations
3. **Environment**: Update `.env` with production URLs

## � Troubleshooting

**Common Issues:**
- Supabase connection errors → Check environment variables
- Missing tables → Re-run SQL migration files  
- Build errors → `rm -rf node_modules && npm install`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

---

Built with React, TypeScript, Supabase, and AI.