// Common utilities for edge functions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

// Environment configuration
export const getEnvConfig = () => ({
  supabaseUrl: Deno.env.get('SUPABASE_URL')!,
  supabaseServiceKey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  openaiApiKey: Deno.env.get('OPENAI_API_KEY')!,
  embedModel: Deno.env.get('EMBED_MODEL') || 'text-embedding-3-large',
  rerankModel: Deno.env.get('RERANK_MODEL') || 'gpt-4o-mini',
  vectorDims: parseInt(Deno.env.get('VECTOR_DIMS') || '3072'),
})

// Create Supabase client with service role
export const createSupabaseClient = () => {
  const { supabaseUrl, supabaseServiceKey } = getEnvConfig()
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// JWT verification and user extraction
export const verifyJWT = async (request: Request) => {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing or invalid authorization header')
  }

  const token = authHeader.slice(7)
  const supabase = createSupabaseClient()
  
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) {
    throw new Error('Invalid or expired token')
  }

  return user
}

// OpenAI API client
export class OpenAIClient {
  private apiKey: string
  private baseUrl = 'https://api.openai.com/v1'

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async createEmbedding(text: string, model: string = 'text-embedding-ada-002'): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: text.trim(),
        encoding_format: 'float',
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }

  async chatCompletion(messages: any[], model: string = 'gpt-4o-mini', responseFormat?: any): Promise<any> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.1,
        max_tokens: 4000,
        response_format: responseFormat,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`)
    }

    const data = await response.json()
    return data.choices[0].message.content
  }
}

// Common response helpers
export const createResponse = (data: any, status = 200) => {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    }
  )
}

export const createErrorResponse = (message: string, status = 400) => {
  return createResponse({ error: message }, status)
}

// Validation schemas
export const EmbedCandidateSchema = z.object({
  candidate_id: z.string().uuid(),
})

export const EmbedJobSchema = z.object({
  job_id: z.string().uuid(),
})

export const MatchJobCandidatesSchema = z.object({
  job_id: z.string().uuid(),
  limit: z.number().min(1).max(50).optional().default(20),
})

export const MatchCandidateJobsSchema = z.object({
  candidate_id: z.string().uuid(),
  limit: z.number().min(1).max(50).optional().default(20),
})

export const ExtractResumeSchema = z.object({
  file_url: z.string().url(),
  candidate_id: z.string().uuid(),
})

export const SecureChatSchema = z.object({
  application_id: z.string().uuid(),
  body: z.string().min(1).max(5000),
})

// Utility functions
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export const extractSkillsFromText = (text: string): string[] => {
  const commonSkills = [
    'javascript', 'typescript', 'python', 'java', 'react', 'nodejs', 'angular', 'vue',
    'html', 'css', 'sql', 'postgresql', 'mongodb', 'aws', 'docker', 'kubernetes',
    'git', 'agile', 'scrum', 'machine learning', 'data science', 'ai', 'analytics',
    'project management', 'leadership', 'communication', 'problem solving'
  ]
  
  const normalizedText = normalizeText(text)
  const foundSkills: string[] = []
  
  commonSkills.forEach(skill => {
    if (normalizedText.includes(skill.toLowerCase())) {
      foundSkills.push(skill)
    }
  })
  
  return [...new Set(foundSkills)]
}

// CORS handler
export const handleCORS = (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }
}