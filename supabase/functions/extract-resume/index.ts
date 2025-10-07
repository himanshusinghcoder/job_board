import { 
  createSupabaseClient, 
  verifyJWT, 
  OpenAIClient, 
  getEnvConfig, 
  createResponse, 
  createErrorResponse, 
  ExtractResumeSchema,
  handleCORS
} from '../_shared/utils.ts'

const SKILL_EXTRACTION_PROMPT = `Extract skills and experience information from this resume text. 
Return a JSON object with:
- skills: array of technical and professional skills mentioned
- years_experience: total years of professional experience (number)
- suggested_headline: a professional headline (50 chars max)
- key_achievements: array of 3 key achievements or accomplishments

Focus on concrete skills, technologies, frameworks, and quantifiable experience.`

Deno.serve(async (req) => {
  // Handle CORS
  const corsResponse = handleCORS(req)
  if (corsResponse) return corsResponse

  try {
    // Verify JWT and extract user
    const user = await verifyJWT(req)
    
    // Parse and validate request body
    const body = await req.json()
    const { candidate_id, file_path } = ExtractResumeSchema.parse(body)
    
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
    
    // Download resume file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('resumes')
      .download(file_path)
    
    if (downloadError) {
      return createErrorResponse('Failed to download resume file', 400)
    }
    
    // Convert file to text (simplified - in production use PDF.js or similar)
    let resumeText = ''
    try {
      const arrayBuffer = await fileData.arrayBuffer()
      const decoder = new TextDecoder()
      resumeText = decoder.decode(arrayBuffer)
      
      // If it's a PDF or other binary format, we'd need to use proper parsing here
      // For now, assume it's a text file or handle basic text extraction
      if (resumeText.includes('%PDF')) {
        resumeText = 'This appears to be a PDF file. In production, this would be parsed using PDF.js or similar library to extract text content including skills, experience, education, and work history.'
      }
    } catch (error) {
      return createErrorResponse('Failed to extract text from resume', 400)
    }
    
    if (!resumeText || resumeText.length < 50) {
      return createErrorResponse('Resume text is too short or could not be extracted', 400)
    }
    
    // Use OpenAI to extract structured information
    const { openaiApiKey, rerankModel } = getEnvConfig()
    const openai = new OpenAIClient(openaiApiKey)
    
    try {
      const responseText = await openai.chatCompletion(
        [
          { role: 'system', content: SKILL_EXTRACTION_PROMPT },
          { role: 'user', content: `Resume text: ${resumeText.substring(0, 3000)}` }
        ],
        rerankModel,
        { type: 'json_object' }
      )
      
      const extractedData = JSON.parse(responseText)
      
      // Update candidate profile with extracted information
      const updateData: any = {}
      
      if (extractedData.skills && Array.isArray(extractedData.skills)) {
        updateData.skills = extractedData.skills.slice(0, 20) // Limit to 20 skills
      }
      
      if (extractedData.years_experience && typeof extractedData.years_experience === 'number') {
        updateData.years_experience = Math.min(50, Math.max(0, extractedData.years_experience))
      }
      
      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('candidate_profiles')
          .update(updateData)
          .eq('user_id', candidate_id)
        
        if (updateError) {
          console.error('Failed to update candidate profile:', updateError)
        }
      }
      
      // Update profile headline if suggested
      if (extractedData.suggested_headline) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            headline: extractedData.suggested_headline.substring(0, 100)
          })
          .eq('id', candidate_id)
        
        if (profileError) {
          console.error('Failed to update profile headline:', profileError)
        }
      }
      
      // Trigger embedding generation for the updated profile
      try {
        const embedResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/embed-candidate`, {
          method: 'POST',
          headers: {
            'Authorization': req.headers.get('Authorization') || '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ candidate_id })
        })
        
        if (!embedResponse.ok) {
          console.warn('Failed to generate embeddings for candidate')
        }
      } catch (error) {
        console.warn('Error calling embed-candidate function:', error)
      }
      
      return createResponse({
        success: true,
        candidate_id,
        extracted_data: {
          skills: extractedData.skills || [],
          years_experience: extractedData.years_experience || 0,
          suggested_headline: extractedData.suggested_headline || '',
          key_achievements: extractedData.key_achievements || []
        },
        updated_profile: Object.keys(updateData).length > 0
      })
      
    } catch (error) {
      console.error('Error extracting resume data with AI:', error)
      
      // Fallback: basic text analysis
      const words = resumeText.toLowerCase().split(/\s+/)
      const commonSkills = [
        'javascript', 'python', 'react', 'node.js', 'sql', 'aws', 'docker', 
        'kubernetes', 'typescript', 'java', 'c++', 'go', 'rust', 'vue.js', 
        'angular', 'mongodb', 'postgresql', 'redis', 'git', 'linux'
      ]
      
      const foundSkills = commonSkills.filter(skill => 
        words.some(word => word.includes(skill.toLowerCase()))
      )
      
      // Basic year extraction
      const yearMatches = resumeText.match(/(\d+)\s*(?:years?|yrs?)\s*(?:of\s*)?(?:experience|exp)/gi)
      const years = yearMatches ? 
        Math.max(...yearMatches.map(match => parseInt(match.match(/\d+/)?.[0] || '0'))) : 0
      
      return createResponse({
        success: true,
        candidate_id,
        extracted_data: {
          skills: foundSkills,
          years_experience: years,
          suggested_headline: '',
          key_achievements: []
        },
        updated_profile: false,
        fallback_extraction: true
      })
    }
    
  } catch (error) {
    console.error('Error in extract-resume:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})