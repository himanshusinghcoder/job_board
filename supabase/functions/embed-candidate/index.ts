import { 
  createSupabaseClient, 
  verifyJWT, 
  OpenAIClient, 
  getEnvConfig, 
  createResponse, 
  createErrorResponse, 
  EmbedCandidateSchema,
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
    const { candidate_id } = EmbedCandidateSchema.parse(body)
    
    // Check if user can embed this candidate (must be the candidate themselves or admin)
    const supabase = createSupabaseClient()
    
    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (profileError) throw new Error('Failed to get user profile')
    
    // Authorization check
    if (userProfile.role !== 'admin' && user.id !== candidate_id) {
      return createErrorResponse('Unauthorized', 403)
    }
    
    // Get candidate profile and related data
    const { data: candidate, error: candidateError } = await supabase
      .from('profiles')
      .select(`
        *,
        candidate_profiles (*)
      `)
      .eq('id', candidate_id)
      .eq('role', 'candidate')
      .single()
    
    if (candidateError || !candidate) {
      return createErrorResponse('Candidate not found', 404)
    }
    
    const candidateProfile = candidate.candidate_profiles?.[0]
    if (!candidateProfile) {
      return createErrorResponse('Candidate profile not found', 404)
    }
    
    // Extract resume text if available
    let resumeText = ''
    if (candidateProfile.resume_url) {
      try {
        // Download resume file from storage
        const { data: resumeFile, error: downloadError } = await supabase.storage
          .from('resumes')
          .download(candidateProfile.resume_url.replace('/storage/v1/object/public/resumes/', ''))
        
        if (downloadError) {
          console.warn('Failed to download resume:', downloadError)
        } else {
          // For now, just use a placeholder - in production you'd use PDF.js or similar
          resumeText = 'Resume content would be extracted here using PDF.js or similar library'
        }
      } catch (error) {
        console.warn('Error processing resume:', error)
      }
    }
    
    // Build embedding text from candidate data
    const embeddingText = [
      candidate.full_name || '',
      candidate.headline || '',
      candidate.location || '',
      candidate.about || '',
      `${candidateProfile.years_experience || 0} years experience`,
      candidateProfile.skills?.join(' ') || '',
      candidateProfile.work_type?.join(' ') || '',
      resumeText
    ]
      .filter(text => text.trim().length > 0)
      .map(normalizeText)
      .join(' ')
    
    // Generate embedding using OpenAI
    const { openaiApiKey, embedModel } = getEnvConfig()
    const openai = new OpenAIClient(openaiApiKey)
    
    const embedding = await openai.createEmbedding(embeddingText, embedModel)
    
    // Update candidate profile with embedding
    const { error: updateError } = await supabase
      .from('candidate_profiles')
      .update({ 
        embedding: `[${embedding.join(',')}]`,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', candidate_id)
    
    if (updateError) throw new Error(`Failed to update embedding: ${updateError.message}`)
    
    return createResponse({
      success: true,
      candidate_id,
      embedding_dimensions: embedding.length,
      text_length: embeddingText.length
    })
    
  } catch (error) {
    console.error('Error in embed-candidate:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})