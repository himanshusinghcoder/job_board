// OpenAI-powered job matching service
import OpenAI from 'openai'

// Initialize OpenAI client
let openai: OpenAI | null = null

try {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY
  if (apiKey) {
    openai = new OpenAI({
      apiKey,
      dangerouslyAllowBrowser: true // Allow browser usage for client-side requests
    })
  } else {
    console.warn('⚠️ OpenAI API key not found. Using fallback matching.')
  }
} catch (error) {
  console.error('❌ Failed to initialize OpenAI client:', error)
}

export interface CandidateProfile {
  skills: string[]
  years_experience?: number
  work_type?: string[]
  bio?: string
  full_name?: string
}

export interface JobPosting {
  id: string
  title: string
  description: string
  skills_required: string[]
  remote: boolean
  location?: string
  salary_min?: number
  salary_max?: number
  employers?: {
    name: string
    description?: string
  }
}

export interface MatchResult {
  score: number
  reasoning: string
  strengths: string[]
  gaps: string[]
}

/**
 * Uses OpenAI to analyze job match compatibility
 */
export async function analyzeJobMatch(
  candidate: CandidateProfile,
  job: JobPosting
): Promise<MatchResult> {
  // Fallback to simple matching if OpenAI is not available
  if (!openai) {
    console.log('🔄 OpenAI not available, using fallback matching')
    return fallbackJobMatch(candidate, job)
  }

  try {
    // Prepare candidate summary
    const candidateText = `
Candidate Profile:
- Name: ${candidate.full_name || 'Not provided'}
- Skills: ${candidate.skills?.join(', ') || 'Not specified'}
- Experience: ${candidate.years_experience || 'Not specified'} years
- Work Preference: ${candidate.work_type?.join(', ') || 'Not specified'}
- Bio: ${candidate.bio || 'Not provided'}
    `.trim()

    // Prepare job summary
    const jobText = `
Job Posting:
- Title: ${job.title}
- Company: ${job.employers?.name || 'Company name not provided'}
- Location: ${job.location || 'Location not specified'} (${job.remote ? 'Remote' : 'On-site'})
- Required Skills: ${job.skills_required?.join(', ') || 'Not specified'}
- Salary Range: ${job.salary_min && job.salary_max ? `$${job.salary_min.toLocaleString()} - $${job.salary_max.toLocaleString()}` : 'Not specified'}
- Description: ${job.description || 'No description available'}
    `.trim()

    const prompt = `
You are an expert career counselor and job matching specialist. Analyze the compatibility between this candidate and job posting.

${candidateText}

${jobText}

Please provide a detailed analysis in the following JSON format:
{
  "score": [number between 0-100],
  "reasoning": "[2-3 sentence explanation of the match quality]",
  "strengths": ["strength1", "strength2", "strength3"],
  "gaps": ["gap1", "gap2"]
}

Scoring Guidelines:
- 90-100: Exceptional match - candidate perfectly aligns with all requirements
- 80-89: Excellent match - strong alignment with minor gaps
- 70-79: Good match - solid fit with some skill/experience gaps
- 60-69: Fair match - reasonable fit but notable gaps
- 40-59: Weak match - significant gaps in key requirements
- 20-39: Poor match - major misalignment
- 0-19: No match - fundamental incompatibility

Consider:
- Technical skill alignment (most important)
- Experience level appropriateness
- Work type preference compatibility
- Career progression logic
- Industry/domain experience
- Soft skills and cultural fit indicators

Respond only with valid JSON.`

    console.log('🤖 Calling OpenAI for job match analysis...')
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert job matching AI that provides precise compatibility scores and detailed analysis. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent scoring
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })

    const result = response.choices[0]?.message?.content
    if (!result) {
      throw new Error('No response from OpenAI')
    }

    console.log('✅ OpenAI response received:', result.substring(0, 100) + '...')

    const parsed = JSON.parse(result) as MatchResult
    
    // Validate the response
    if (typeof parsed.score !== 'number' || parsed.score < 0 || parsed.score > 100) {
      throw new Error('Invalid score from OpenAI')
    }

    return {
      score: Math.round(parsed.score),
      reasoning: parsed.reasoning || 'No reasoning provided',
      strengths: parsed.strengths || [],
      gaps: parsed.gaps || []
    }

  } catch (error) {
    console.error('❌ OpenAI job match analysis failed:', error)
    
    // Fallback to simple matching algorithm
    return fallbackJobMatch(candidate, job)
  }
}

/**
 * Fallback matching algorithm when OpenAI is unavailable
 */
function fallbackJobMatch(candidate: CandidateProfile, job: JobPosting): MatchResult {
  let score = 0
  const strengths: string[] = []
  const gaps: string[] = []

  // Skills match (70% weight)
  if (candidate.skills && job.skills_required) {
    const matchingSkills = candidate.skills.filter((candidateSkill: string) =>
      job.skills_required.some((jobSkill: string) =>
        candidateSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(candidateSkill.toLowerCase())
      )
    )
    
    if (matchingSkills.length > 0) {
      const skillScore = (matchingSkills.length / job.skills_required.length) * 70
      score += skillScore
      strengths.push(`Matches ${matchingSkills.length}/${job.skills_required.length} required skills`)
    } else {
      gaps.push('Limited skill alignment with job requirements')
    }
  }

  // Work type match (20% weight)
  if (candidate.work_type && job.remote !== undefined) {
    const jobWorkType = job.remote ? 'remote' : 'onsite'
    if (candidate.work_type.includes(jobWorkType) || candidate.work_type.includes('hybrid')) {
      score += 20
      strengths.push(`Work preference aligns (${jobWorkType})`)
    } else {
      gaps.push('Work location preference mismatch')
    }
  }

  // Base score (10% weight)
  score += 10

  const finalScore = Math.max(0, Math.min(100, Math.round(score)))

  return {
    score: finalScore,
    reasoning: `Compatibility score based on skill overlap and work preferences. ${strengths.length > 0 ? 'Key strengths identified.' : ''} ${gaps.length > 0 ? 'Some areas for consideration.' : ''}`,
    strengths,
    gaps
  }
}

/**
 * Batch analyze multiple jobs for a candidate
 */
export async function batchAnalyzeJobMatches(
  candidate: CandidateProfile,
  jobs: JobPosting[],
  limit: number = 5
): Promise<Array<JobPosting & { match_score: number; match_analysis: MatchResult }>> {
  console.log(`🔍 Analyzing ${jobs.length} jobs for candidate match...`)
  
  const results = []
  
  // Process jobs in batches to avoid rate limits
  const batchSize = 3
  for (let i = 0; i < jobs.length && results.length < limit * 2; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize)
    
    const batchPromises = batch.map(async (job) => {
      const analysis = await analyzeJobMatch(candidate, job)
      return {
        ...job,
        match_score: analysis.score,
        match_analysis: analysis
      }
    })
    
    try {
      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
      
      // Small delay between batches to be respectful to API limits
      if (i + batchSize < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    } catch (error) {
      console.error('❌ Batch processing error:', error)
      // Continue with next batch
    }
  }
  
  // Sort by match score and return top results
  return results
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, limit)
}