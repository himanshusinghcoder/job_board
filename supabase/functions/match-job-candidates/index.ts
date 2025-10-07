import { 
  createSupabaseClient, 
  verifyJWT, 
  OpenAIClient, 
  getEnvConfig, 
  createResponse, 
  createErrorResponse, 
  MatchJobCandidatesSchema,
  handleCORS
} from '../_shared/utils.ts'

// LLM scoring prompt for candidate-job matching
const MATCHING_SYSTEM_PROMPT = `You are an expert AI assistant that scores candidate-job fit on a scale of 0-100.

Consider these factors:
- Skills match (technical and soft skills) - 40% weight
- Years of experience vs required level - 25% weight  
- Location compatibility (remote vs onsite) - 15% weight
- Work type preferences - 10% weight
- Salary expectations vs offered range - 10% weight

Scoring guidelines:
- 90-100: Exceptional fit, candidate exceeds requirements
- 70-89: Strong fit, candidate meets most requirements well
- 50-69: Good fit, candidate meets basic requirements with some gaps
- 30-49: Moderate fit, significant gaps but potential
- 0-29: Poor fit, major misalignment

Provide a score, one paragraph explanation, and up to 5 most critical missing skills.
Respond with valid JSON only.`

interface MatchingCandidate {
  candidate_id: string
  score: number
  explanation: string
  top_missing_skills: string[]
}

const calculateBaseScore = (job: any, candidate: any): number => {
  let score = 50 // Base score
  
  // Skills matching (simple keyword overlap)
  const jobSkills = job.skills || []
  const candidateSkills = candidate.candidate_profiles?.skills || []
  
  if (jobSkills.length > 0) {
    const matches = jobSkills.filter((skill: string) => 
      candidateSkills.some((cSkill: string) => 
        cSkill.toLowerCase().includes(skill.toLowerCase()) ||
        skill.toLowerCase().includes(cSkill.toLowerCase())
      )
    ).length
    const skillsScore = (matches / jobSkills.length) * 40
    score += skillsScore - 20 // Adjust baseline
  }
  
  // Experience level matching
  const candidateYears = candidate.candidate_profiles?.years_experience || 0
  const requiredLevel = job.experience_level
  
  let experienceBonus = 0
  switch (requiredLevel) {
    case 'entry':
      experienceBonus = candidateYears >= 0 && candidateYears <= 2 ? 15 : 
                       candidateYears > 2 && candidateYears <= 5 ? 5 : -10
      break
    case 'mid':
      experienceBonus = candidateYears >= 2 && candidateYears <= 7 ? 15 :
                       candidateYears < 2 ? -10 : -5
      break
    case 'senior':
      experienceBonus = candidateYears >= 5 ? 15 : candidateYears >= 3 ? 5 : -15
      break
    case 'lead':
    case 'executive':
      experienceBonus = candidateYears >= 8 ? 15 : candidateYears >= 5 ? 0 : -15
      break
  }
  score += experienceBonus
  
  // Location matching
  if (job.remote || candidate.candidate_profiles?.work_type?.includes('remote')) {
    score += 10
  } else if (job.location && candidate.location) {
    // Simple location match (would use geocoding in production)
    if (job.location.toLowerCase().includes(candidate.location.toLowerCase()) ||
        candidate.location.toLowerCase().includes(job.location.toLowerCase())) {
      score += 10
    } else {
      score -= 15
    }
  }
  
  // Salary matching
  const jobMin = job.salary_min
  const jobMax = job.salary_max
  const candidateMin = candidate.candidate_profiles?.salary_min
  const candidateMax = candidate.candidate_profiles?.salary_max
  
  if (jobMin && jobMax && candidateMin && candidateMax) {
    const jobMid = (jobMin + jobMax) / 2
    const candidateMid = (candidateMin + candidateMax) / 2
    const diff = Math.abs(jobMid - candidateMid) / jobMid
    
    if (diff <= 0.15) score += 5  // Within 15%
    else if (diff <= 0.3) score += 0  // Within 30%
    else score -= 10  // Major gap
  }
  
  return Math.max(0, Math.min(100, Math.round(score)))
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
    const { job_id, limit } = MatchJobCandidatesSchema.parse(body)
    
    const supabase = createSupabaseClient()
    
    // Get job and verify access
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
    
    // Check authorization
    const { data: membership } = await supabase
      .from('employer_members')
      .select('role')
      .eq('employer_id', job.employer_id)
      .eq('user_id', user.id)
      .single()
    
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    
    if (!membership && userProfile?.role !== 'admin') {
      return createErrorResponse('Unauthorized', 403)
    }
    
    // Check if job has embedding
    if (!job.embedding) {
      return createErrorResponse('Job embedding not found. Please generate job embedding first.', 400)
    }
    
    // Vector search for similar candidates using pgvector
    const { data: candidates, error: searchError } = await supabase.rpc(
      'match_candidates_to_job',
      {
        job_embedding: job.embedding,
        match_threshold: 0.3,
        match_count: 100 // Get top 100 for LLM reranking
      }
    )
    
    if (searchError) {
      console.error('Vector search error:', searchError)
      return createErrorResponse('Failed to search candidates', 500)
    }
    
    if (!candidates || candidates.length === 0) {
      return createResponse({
        success: true,
        job_id,
        matches: [],
        total_processed: 0
      })
    }
    
    // Get full candidate data
    const candidateIds = candidates.map((c: any) => c.candidate_id)
    const { data: fullCandidates, error: candidateError } = await supabase
      .from('profiles')
      .select(`
        *,
        candidate_profiles (*)
      `)
      .in('id', candidateIds)
      .eq('role', 'candidate')
    
    if (candidateError) throw new Error('Failed to fetch candidate details')
    
    // Calculate base scores for all candidates
    const candidatesWithScores = fullCandidates
      .map(candidate => ({
        ...candidate,
        base_score: calculateBaseScore(job, candidate),
        similarity: candidates.find((c: any) => c.candidate_id === candidate.id)?.similarity || 0
      }))
      .filter(c => c.base_score > 20) // Filter out very poor matches
      .sort((a, b) => (b.base_score + b.similarity * 20) - (a.base_score + a.similarity * 20))
      .slice(0, Math.min(20, limit)) // Top candidates for LLM reranking
    
    if (candidatesWithScores.length === 0) {
      return createResponse({
        success: true,
        job_id,
        matches: [],
        total_processed: fullCandidates.length
      })
    }
    
    // Prepare data for LLM reranking
    const jobData = {
      title: job.title,
      description: job.description.substring(0, 1500), // Truncate for token limit
      skills: job.skills || [],
      location: job.location,
      remote: job.remote,
      job_type: job.job_type,
      experience_level: job.experience_level,
      salary_range: job.salary_min && job.salary_max ? `${job.salary_min}-${job.salary_max}` : null,
      company: job.employers?.name
    }
    
    // Process candidates in batches for LLM scoring
    const { openaiApiKey, rerankModel } = getEnvConfig()
    const openai = new OpenAIClient(openaiApiKey)
    
    const llmMatches: MatchingCandidate[] = []
    
    for (const candidate of candidatesWithScores) {
      try {
        const candidateData = {
          name: candidate.full_name,
          headline: candidate.headline,
          location: candidate.location,
          about: candidate.about?.substring(0, 500),
          years_experience: candidate.candidate_profiles?.[0]?.years_experience || 0,
          skills: candidate.candidate_profiles?.[0]?.skills || [],
          work_type: candidate.candidate_profiles?.[0]?.work_type || [],
          salary_range: candidate.candidate_profiles?.[0]?.salary_min && candidate.candidate_profiles?.[0]?.salary_max 
            ? `${candidate.candidate_profiles[0].salary_min}-${candidate.candidate_profiles[0].salary_max}` 
            : null,
          base_score: candidate.base_score
        }
        
        const prompt = `Job: ${JSON.stringify(jobData)}
        
Candidate: ${JSON.stringify(candidateData)}

Score this candidate-job match (0-100) and provide explanation. Response format:
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
        
        llmMatches.push({
          candidate_id: candidate.id,
          score: Math.max(0, Math.min(100, llmResult.score || candidate.base_score)),
          explanation: llmResult.explanation || 'Match score calculated based on skills, experience, and job requirements.',
          top_missing_skills: (llmResult.top_missing_skills || []).slice(0, 5)
        })
        
      } catch (error) {
        console.error(`Error scoring candidate ${candidate.id}:`, error)
        // Fallback to base score
        llmMatches.push({
          candidate_id: candidate.id,
          score: candidate.base_score,
          explanation: 'Match score calculated based on skills, experience, and job requirements.',
          top_missing_skills: []
        })
      }
    }
    
    // Sort by final score
    llmMatches.sort((a, b) => b.score - a.score)
    
    // Store matches in database
    const matchRecords = llmMatches.map(match => ({
      job_id,
      candidate_id: match.candidate_id,
      match_score: match.score,
      explanation: match.explanation,
      top_missing_skills: match.top_missing_skills
    }))
    
    // Upsert matches (insert or update if exists)
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
      job_id,
      matches: llmMatches,
      total_processed: fullCandidates.length,
      matched_count: llmMatches.length
    })
    
  } catch (error) {
    console.error('Error in match-job-candidates:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})