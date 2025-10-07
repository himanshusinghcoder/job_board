import { 
  createSupabaseClient, 
  verifyJWT, 
  OpenAIClient, 
  getEnvConfig, 
  createResponse, 
  createErrorResponse, 
  EmbedJobSchema,
  handleCORS,
  normalizeText
} from '../_shared/utils.ts'

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCORS(req)
  if (corsResponse) return corsResponse

  try {
    // Verify JWT and extract user
    const user = await verifyJWT(req)
    
    // Parse and validate request body
    const body = await req.json()
    const { job_id } = EmbedJobSchema.parse(body)
    
    const supabase = createSupabaseClient()
    
    // Get job and check if user has access to it
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        employers (*)
      `)
      .eq('id', job_id)
      .single()
    
    if (jobError || !job) {
      return createErrorResponse('Job not found', 404)
    }
    
    // Check if user is authorized to embed this job
    const { data: membership } = await supabase
      .from('employer_members')
      .select('role')
      .eq('employer_id', job.employer_id)
      .eq('user_id', user.id)
      .single()
    
    // Check if user is admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!membership && userProfile?.role !== 'admin') {
      return createErrorResponse('Unauthorized', 403)
    }
    
    // Build embedding text from job data
    const employer = job.employers
    const embeddingText = [
      job.title,
      job.description,
      employer?.name || '',
      job.location || '',
      job.remote ? 'remote work' : 'onsite work',
      job.job_type.replace('-', ' '),
      job.experience_level ? `${job.experience_level} level` : '',
      job.skills?.join(' ') || '',
      job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max} salary` : ''
    ]
      .filter(text => text.trim().length > 0)
      .map(normalizeText)
      .join(' ')
    
    // Generate embedding using OpenAI
    const { openaiApiKey, embedModel } = getEnvConfig()
    const openai = new OpenAIClient(openaiApiKey)
    
    const embedding = await openai.createEmbedding(embeddingText, embedModel)
    
    // Update job with embedding
    const { error: updateError } = await supabase
      .from('jobs')
      .update({ 
        embedding: `[${embedding.join(',')}]`,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id)
    
    if (updateError) throw new Error(`Failed to update embedding: ${updateError.message}`)
    
    return createResponse({
      success: true,
      job_id,
      embedding_dimensions: embedding.length,
      text_length: embeddingText.length
    })
    
  } catch (error) {
    console.error('Error in embed-job:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})