import { 
  createSupabaseClient, 
  verifyJWT, 
  createResponse, 
  createErrorResponse, 
  SecureChatSchema,
  handleCORS
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
    const { application_id, body: messageBody } = SecureChatSchema.parse(body)
    
    const supabase = createSupabaseClient()
    
    // Get application details and verify access
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        jobs (
          employer_id,
          title
        )
      `)
      .eq('id', application_id)
      .single()
    
    if (appError || !application) {
      return createErrorResponse('Application not found', 404)
    }
    
    // Check if user is authorized to send message
    let isAuthorized = false
    let senderRole = ''
    
    // Check if user is the candidate
    if (user.id === application.candidate_id) {
      isAuthorized = true
      senderRole = 'candidate'
    } else {
      // Check if user is a member of the employer organization
      const { data: membership } = await supabase
        .from('employer_members')
        .select('role')
        .eq('employer_id', application.jobs.employer_id)
        .eq('user_id', user.id)
        .single()
      
      if (membership) {
        isAuthorized = true
        senderRole = 'employer'
      }
    }
    
    if (!isAuthorized) {
      return createErrorResponse('Unauthorized to send message in this application thread', 403)
    }
    
    // Insert the message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        application_id,
        sender_id: user.id,
        body: messageBody
      })
      .select(`
        *,
        sender:profiles(full_name, role)
      `)
      .single()
    
    if (messageError) {
      console.error('Failed to create message:', messageError)
      return createErrorResponse('Failed to send message', 500)
    }
    
    // Update application's updated_at timestamp to indicate recent activity
    await supabase
      .from('applications')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', application_id)
    
    // In production, you might want to:
    // 1. Send real-time notifications via Supabase Realtime
    // 2. Send email notifications if the recipient is offline
    // 3. Log the activity for audit purposes
    
    return createResponse({
      success: true,
      message: {
        id: message.id,
        application_id: message.application_id,
        sender: {
          id: message.sender_id,
          name: message.sender.full_name,
          role: senderRole
        },
        body: message.body,
        created_at: message.created_at
      },
      application: {
        id: application.id,
        job_title: application.jobs.title,
        status: application.status
      }
    })
    
  } catch (error) {
    console.error('Error in secure-chat:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})