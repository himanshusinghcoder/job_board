import { 
  createSupabaseClient, 
  verifyJWT, 
  OpenAIClient, 
  getEnvConfig, 
  createResponse, 
  createErrorResponse, 
  MatchCandidateJobsSchema,
  handleCORS
} from '../_shared/utils.ts'

// Similar matching logic but from candidate perspective
const MATCHING_SYSTEM_PROMPT = `You are an expert AI assistant that scores job-candidate fit from the candidate's perspective on a scale of 0-100.

Consider these factors:
- Skills alignment with job requirements - 40% weight
- Experience level match - 25% weight  
- Location and remote work compatibility - 15% weight
- Job type and work preferences - 10% weight
- Salary alignment with expectations - 10% weight

Scoring guidelines:
- 90-100: Dream job, excellent alignment
- 70-89: Great opportunity, strong match
- 50-69: Good fit with minor compromises
- 30-49: Acceptable with significant trade-offs
- 0-29: Poor match, major misalignment

Provide a score, one paragraph explanation, and up to 5 skills the candidate should develop.
Respond with valid JSON only.`

interface JobMatch {
  job_id: string
  score: number
  explanation: string
  top_missing_skills: string[]
}

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCORS(req)
  if (corsResponse) return corsResponse

  try {
    // Verify JWT and extract user
    const user = await verifyJWT(req)
    
    // Parse and validate request body
    const body = await req.json()
    const { candidate_id, limit } = MatchCandidateJobsSchema.parse(body)
    
    const supabase = createSupabaseClient()
    
    // Check authorization - user must be the candidate or admin
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (userProfile?.role !== 'admin' && user.id !== candidate_id) {
      return createErrorResponse('Unauthorized', 403)
    }
    
    // Get candidate data
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
    if (!candidateProfile || !candidateProfile.embedding) {
      return createErrorResponse('Candidate embedding not found. Please generate candidate embedding first.', 400)
    }
    
    // Vector search for similar jobs
    const { data: jobs, error: searchError } = await supabase.rpc(
      'match_jobs_to_candidate',
      {
        candidate_embedding: candidateProfile.embedding,
        match_threshold: 0.3,
        match_count: 50
      }
    )
    
    if (searchError) {
      console.error('Vector search error:', searchError)
      return createErrorResponse('Failed to search jobs', 500)
    }
    
    if (!jobs || jobs.length === 0) {
      return createResponse({
        success: true,
        candidate_id,
        matches: [],
        total_processed: 0
      })
    }
    
    // Get full job data
    const jobIds = jobs.map((j: any) => j.job_id)
    const { data: fullJobs, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        employers (*)
      `)
      .in('id', jobIds)
      .eq('status', 'published')
    
    if (jobError) throw new Error('Failed to fetch job details')
    
    // Process jobs for LLM scoring
    const { openaiApiKey, rerankModel } = getEnvConfig()
    const openai = new OpenAIClient(openaiApiKey)
    
    const candidateData = {
      name: candidate.full_name,
      headline: candidate.headline,
      location: candidate.location,
      about: candidate.about?.substring(0, 500),
      years_experience: candidateProfile.years_experience || 0,
      skills: candidateProfile.skills || [],
      work_type: candidateProfile.work_type || [],
      salary_range: candidateProfile.salary_min && candidateProfile.salary_max 
        ? `${candidateProfile.salary_min}-${candidateProfile.salary_max}` 
        : null
    }
    
    const jobMatches: JobMatch[] = []
    
    for (const job of fullJobs.slice(0, limit)) {
      try {
        const jobData = {
          title: job.title,
          description: job.description.substring(0, 1500),
          skills: job.skills || [],
          location: job.location,
          remote: job.remote,
          job_type: job.job_type,
          experience_level: job.experience_level,
          salary_range: job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max}` : null,
          company: job.employers?.name
        }
        
        const prompt = `Candidate: ${JSON.stringify(candidateData)}
        
Job: ${JSON.stringify(jobData)}

Score this job-candidate match from the candidate's perspective (0-100) and provide explanation. Response format:
{
  "score": number,
  "explanation": "one paragraph explanation",
  "top_missing_skills": ["skill1", "skill2", "skill3"]
}`
        
        const responseText = await openai.chatCompletion(
          [
            { role: 'system', content: MATCHING_SYSTEM_PROMPT },
            { role: 'user', content: prompt }
          ],
          rerankModel,
          { type: 'json_object' }
        )
        
        const llmResult = JSON.parse(responseText)
        
        jobMatches.push({
          job_id: job.id,
          score: Math.max(0, Math.min(100, llmResult.score || 50)),
          explanation: llmResult.explanation || 'Job match based on skills, experience, and preferences.',
          top_missing_skills: (llmResult.top_missing_skills || []).slice(0, 5)
        })
        
      } catch (error) {
        console.error(`Error scoring job ${job.id}:`, error)
        // Fallback scoring
        jobMatches.push({
          job_id: job.id,
          score: 50,
          explanation: 'Job match based on basic compatibility analysis.',
          top_missing_skills: []
        })
      }
    }
    
    // Sort by score
    jobMatches.sort((a, b) => b.score - a.score)
    
    // Store matches in database
    const matchRecords = jobMatches.map(match => ({
      job_id: match.job_id,
      candidate_id,
      match_score: match.score,
      explanation: match.explanation,
      top_missing_skills: match.top_missing_skills
    }))
    
    const { error: upsertError } = await supabase
      .from('matches')
      .upsert(matchRecords, { 
        onConflict: 'job_id,candidate_id',
        ignoreDuplicates: false 
      })
    
    if (upsertError) {
      console.error('Error upserting matches:', upsertError)
    }
    
    return createResponse({
      success: true,
      candidate_id,
      matches: jobMatches,
      total_processed: fullJobs.length,
      matched_count: jobMatches.length
    })
    
  } catch (error) {
    console.error('Error in match-candidate-jobs:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})