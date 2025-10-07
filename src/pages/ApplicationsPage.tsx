import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

interface Application {
  id: string
  status: string
  cover_letter: string | null
  created_at: string
  match_score?: number
  job: {
    id: string
    title: string
    job_type: string
    location: string
    description?: string
    requirements?: string
    salary_min?: number | null
    salary_max?: number | null
    remote?: boolean
    skills_required?: string[]
    work_type?: string
    active?: boolean
    employer?: {
      id: string
      name: string
      website?: string
      verified?: boolean
    } | null
  }
  candidate: {
    id: string
    full_name: string
    headline: string | null
    location: string | null
    about?: string | null
    role?: string
    candidate_profiles: {
      years_experience: number | null
      skills: string[]
      work_type?: string[]
      resume_url: string | null
      visible?: boolean
    } | null
  }
}

// AI Job Matching Algorithm - same as used in candidate dashboard
function calculateJobMatch(candidateProfile: any, job: any): number {
    console.log(">>>>>", candidateProfile, job);
    
  if (!candidateProfile) return 0
  
  let score = 0
  
    // Skills match (60% weight) - increased since we removed experience matching
  if (candidateProfile.skills && job.skills_required) {
    const matchingSkills = candidateProfile.skills.filter((candidateSkill: string) =>
      job.skills_required!.some((jobSkill: string) =>
        candidateSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(candidateSkill.toLowerCase())
      )
    )
    const skillScore = (matchingSkills.length / job.skills_required.length) * 60
    score += skillScore
  }



  // Work type match (25% weight) - increased weight
  if (candidateProfile.work_type && job.work_type) {
    if (candidateProfile.work_type.includes(job.work_type)) {
      score += 25
    }
  }

  // Base compatibility score (15% weight) - gives everyone a base score
  score += 15

  return Math.round(Math.min(100, score))
}

export function ApplicationsPage() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [jobFilter, setJobFilter] = useState<string>(searchParams.get('job') || 'all')
  const [sortBy, setSortBy] = useState<string>('date') // date, match_score, name
  const [jobs, setJobs] = useState<{id: string, title: string}[]>([])

  useEffect(() => {
    if (profile?.role === 'employer') {
      loadApplications()
      loadEmployerJobs()
    }
  }, [profile])

  useEffect(() => {
    // Update filter when URL params change
    const jobParam = searchParams.get('job')
    if (jobParam) {
      setJobFilter(jobParam)
    }
  }, [searchParams])

  const loadEmployerJobs = async () => {
    try {
      // Get employer ID first
      const { data: employer } = await supabase
        .from('employers')
        .select('id')
        .eq('owner_id', profile?.id)
        .single()

      if (!employer) return

      const { data } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('employer_id', employer.id)
        .order('created_at', { ascending: false })

      setJobs(data || [])
    } catch (error) {
      console.error('Error loading jobs:', error)
    }
  }

  // Filter and sort applications
  const filteredApplications = applications
    .filter(app => {
      if (statusFilter !== 'all' && app.status !== statusFilter) {
        return false
      }
      if (jobFilter !== 'all' && app.job.id !== jobFilter) {
        return false
      }
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'match_score':
          return (b.match_score || 0) - (a.match_score || 0)
        case 'name':
          return (a.candidate?.full_name || '').localeCompare(b.candidate?.full_name || '')
        case 'date':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })



  const loadApplications = async () => {
    try {
      setLoading(true)

      // Step 1: Get employer ID first
      const { data: employer, error: employerError } = await supabase
        .from('employers')
        .select('id')
        .eq('owner_id', profile?.id)
        .single()

      console.log('Employer query result:', employer)
      console.log('Employer error:', employerError)

      if (employerError || !employer) {
        console.log('No employer found for profile:', profile?.id)
        setApplications([])
        setLoading(false)
        return
      }

      // Step 2: Get all applications in the database first (simple query)
      const { data: allApplications, error: appError } = await supabase
        .from('applications')
        .select('*')

      if (appError) {
        console.error('Error fetching applications:', appError)
        setApplications([])
        setLoading(false)
        return
      }

      // Step 3: Get this employer's jobs
      const { data: employerJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('id, title')
        .eq('employer_id', employer.id)

      console.log('Employer jobs:', employerJobs)

      if (jobsError) {
        console.error('Error fetching employer jobs:', jobsError)
        setApplications([])
        setLoading(false)
        return
      }

      if (!employerJobs || employerJobs.length === 0) {
        console.log('No jobs found for employer:', employer.id)
        setApplications([])
        setLoading(false)
        return
      }

      const jobIds = employerJobs.map(job => job.id)

      console.log('Employer job IDs:', jobIds)
      console.log('All applications count:', allApplications?.length || 0)

      // Step 4: Filter applications for this employer's jobs
      const employerApplications = allApplications?.filter(app => 
        jobIds.includes(app.job_id)
      ) || []

      console.log('Filtered applications for employer:', employerApplications.length)
      console.log('Applications:', employerApplications)

      if (employerApplications.length === 0) {
        console.log('No applications found for employer jobs')
        setApplications([])
        setLoading(false)
        return
      }

      // Step 5: Extract unique candidate IDs and job IDs
      const uniqueCandidateIds = [...new Set(employerApplications.map(app => app.candidate_id))]
      const uniqueJobIds = [...new Set(employerApplications.map(app => app.job_id))]

      // Step 6: Fetch candidate profiles
      const { data: candidateProfiles, error: candidateError } = await supabase
        .from('profiles')
        .select('id, full_name, role, headline, location, about, created_at')
        .in('id', uniqueCandidateIds)

      if (candidateError) {
        console.error('Error fetching candidate profiles:', candidateError)
      }



      // Step 7: Fetch candidate_profiles for additional info
      const { data: candidateProfilesExtra, error: candidateExtraError } = await supabase
        .from('candidate_profiles')
        .select('user_id, years_experience, skills, work_type, resume_url, visible')
        .in('user_id', uniqueCandidateIds)

      if (candidateExtraError) {
        console.error('Error fetching candidate extra profiles:', candidateExtraError)
      }

      // Step 8: Fetch job details (including fields needed for AI matching)
      const { data: jobDetails, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          employers (
            id,
            name,
            website,
            verified
          )
        `)
        .in('id', uniqueJobIds)

      if (jobError) {
        console.error('Error fetching job details:', jobError)
      }

      // Step 9: Combine all the data
      const completeApplications = employerApplications.map(app => {
        const candidateProfile = candidateProfiles?.find(cp => cp.id === app.candidate_id)
        const candidateExtra = candidateProfilesExtra?.find(cpe => cpe.user_id === app.candidate_id)
        const jobDetail = jobDetails?.find(jd => jd.id === app.job_id)
console.log("candidateExtra", candidateExtra);
console.log("jobDetail", jobDetail);
        // Calculate AI match score
        const matchScore = candidateExtra && jobDetail ? calculateJobMatch(candidateExtra, jobDetail) : 0

        return {
          id: app.id,
          status: app.status,
          cover_letter: app.cover_letter,
          created_at: app.created_at,
          match_score: matchScore,
          job: jobDetail ? {
            id: jobDetail.id,
            title: jobDetail.title || 'Unknown Job',
            job_type: jobDetail.job_type || 'unknown',
            location: jobDetail.location || 'Unknown Location',
            description: jobDetail.description,
            requirements: jobDetail.requirements,
            salary_min: jobDetail.salary_min,
            salary_max: jobDetail.salary_max,
            remote: jobDetail.remote,
            skills_required: jobDetail.skills_required || [],
            work_type: jobDetail.work_type,
            active: jobDetail.active,
            employer: jobDetail.employers?.[0] || null
          } : {
            id: app.job_id,
            title: 'Job Not Found',
            job_type: 'unknown',
            location: 'Unknown'
          },
          candidate: candidateProfile ? {
            id: candidateProfile.id,
            full_name: candidateProfile.full_name || 'Name Not Available',
            headline: candidateProfile.headline,
            location: candidateProfile.location,
            about: candidateProfile.about,
            role: candidateProfile.role,
            candidate_profiles: candidateExtra ? {
              years_experience: candidateExtra.years_experience,
              skills: candidateExtra.skills || [],
              work_type: candidateExtra.work_type || [],
              resume_url: candidateExtra.resume_url,
              visible: candidateExtra.visible
            } : null
          } : {
            id: app.candidate_id,
            full_name: 'Candidate Not Found',
            headline: 'Profile missing',
            location: null,
            candidate_profiles: null
          }
        }
      })


      setApplications(completeApplications as any)
      
    } catch (error) {
      console.error('Error in loadApplications:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateApplicationStatus = async (applicationId: string, newStatus: string) => {
    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
      const notification = document.createElement('div')
      const bgColor = type === 'success' ? 'bg-green-100 border-green-400 text-green-700' : 'bg-red-100 border-red-400 text-red-700'
      const iconColor = type === 'success' ? 'text-green-600' : 'text-red-600'
      const icon = type === 'success' 
        ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
        : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
      
      notification.className = `fixed top-4 right-4 ${bgColor} border px-4 py-3 rounded z-50 shadow-lg`
      notification.innerHTML = `
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 ${iconColor}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${icon}
          </svg>
          <span class="font-medium">${message}</span>
        </div>
      `
      document.body.appendChild(notification)
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, type === 'success' ? 3000 : 5000)
    }

    try {
      console.log('🔄 Starting application status update:', { applicationId, newStatus, userId: profile?.id })
      
      // Store original status for potential rollback
      const originalApplication = applications.find(app => app.id === applicationId)
      const originalStatus = originalApplication?.status || 'pending'
      
      console.log('📋 Original application status:', originalStatus)
      
      // Run debug function on first click to help diagnose issues
      if (originalStatus === 'pending' && newStatus === 'reviewed') {
        console.log('🐛 Running permission debug (first update only)...')
        await debugApplicationPermissions(applicationId)
      }

      // First, verify user permissions
      console.log('🔐 Checking user permissions...')
      const { data: employer, error: employerError } = await supabase
        .from('employers')
        .select('id')
        .eq('owner_id', profile?.id)
        .single()

      if (employerError || !employer) {
        console.error('❌ User is not an employer:', employerError)
        showNotification('Permission denied: Only employers can update application status', 'error')
        return
      }

      console.log('✅ User employer verification passed:', employer.id)

      // Verify the application belongs to this employer's jobs
      console.log('🔍 Verifying application ownership...')
      const { data: applicationCheck, error: appCheckError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          jobs!inner(id, employer_id, title)
        `)
        .eq('id', applicationId)
        .eq('jobs.employer_id', employer.id)
        .single()

      if (appCheckError || !applicationCheck) {
        console.error('❌ Application not found or not owned by employer:', appCheckError)
        showNotification('Application not found or access denied', 'error')
        return
      }

      console.log('✅ Application ownership verified:', applicationCheck)

      // Update the local state optimistically
      console.log('🔄 Updating local state optimistically...')
      setApplications(prevApps => 
        prevApps.map(app => 
          app.id === applicationId 
            ? { ...app, status: newStatus }
            : app
        )
      )

      // Perform the database update
      console.log('💾 Updating database...')
      const updatePayload = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      }
      console.log('📝 Update payload:', updatePayload)
      console.log('🎯 Target application ID:', applicationId)

      const { data, error, count } = await supabase
        .from('applications')
        .update(updatePayload)
        .eq('id', applicationId)
        .select('*')

      console.log('📊 Update result:', { data, error, count, rowsAffected: data?.length })

      if (error) {
        console.error('❌ Database update failed:', error)
        console.error('Error details:', {
          code: error.code,
          message: error.message,
          hint: error.hint,
          details: error.details
        })
        
        // Revert the optimistic update
        console.log('🔄 Reverting optimistic update...')
        setApplications(prevApps => 
          prevApps.map(app => 
            app.id === applicationId 
              ? { ...app, status: originalStatus }
              : app
          )
        )
        
        showNotification(`Database error: ${error.message}`, 'error')
        return
      }

      // Check if any rows were actually affected
      if (!data || data.length === 0) {
        console.warn('⚠️ Database update returned no rows - this might indicate RLS policy issues')
        console.log('🔍 Attempting to verify the update with a separate query...')
        
        // Try to fetch the record to see if it was actually updated
        const { data: verifyData, error: verifyError } = await supabase
          .from('applications')
          .select('id, status, updated_at')
          .eq('id', applicationId)
          .single()
        
        console.log('🔍 Verification query result:', { verifyData, verifyError })
        
        if (verifyError) {
          console.error('❌ Could not verify update - record might not exist or access denied')
          showNotification('Update failed: Record not found or access denied', 'error')
          
          // Revert optimistic update
          setApplications(prevApps => 
            prevApps.map(app => 
              app.id === applicationId 
                ? { ...app, status: originalStatus }
                : app
            )
          )
          return
        }
        
        if (verifyData?.status !== newStatus) {
          console.error('❌ Update verification failed - status not changed in database')
          console.log('Expected status:', newStatus, 'Actual status:', verifyData?.status)
          showNotification('Update failed: Database not updated (possible RLS issue)', 'error')
          
          // Revert optimistic update
          setApplications(prevApps => 
            prevApps.map(app => 
              app.id === applicationId 
                ? { ...app, status: originalStatus }
                : app
            )
          )
          return
        }
        
        console.log('✅ Verification successful - update was applied')
      } else {
        console.log('✅ Database update successful:', data)
        console.log('📋 Updated record details:', data[0])
      }

      // Final verification after a short delay to ensure database consistency
      console.log('🔄 Performing final verification...')
      setTimeout(async () => {
        try {
          const { data: finalCheck, error: finalError } = await supabase
            .from('applications')
            .select('id, status, updated_at')
            .eq('id', applicationId)
            .single()
          
          console.log('🎯 Final verification result:', { finalCheck, finalError })
          
          if (finalCheck?.status === newStatus) {
            console.log('✅ Final verification PASSED - database is consistent')
          } else {
            console.warn('⚠️ Final verification FAILED - database inconsistency detected')
            console.log('Expected:', newStatus, 'Found:', finalCheck?.status)
          }
        } catch (err) {
          console.warn('⚠️ Final verification failed:', err)
        }
      }, 1000)

      // Show success message
      const statusMessages: { [key: string]: string } = {
        'reviewed': 'Application marked as reviewed',
        'rejected': 'Application rejected',
        'interviewed': 'Interview scheduled',
        'offered': 'Job offer sent'
      }
      
      showNotification(statusMessages[newStatus] || 'Status updated successfully')

    } catch (error: any) {
      console.error('❌ Unexpected error in updateApplicationStatus:', error)
      showNotification(`Unexpected error: ${error?.message || 'Unknown error'}`, 'error')
      
      // Revert optimistic update if there was an error
      const originalApplication = applications.find(app => app.id === applicationId)
      if (originalApplication) {
        setApplications(prevApps => 
          prevApps.map(app => 
            app.id === applicationId 
              ? { ...app, status: originalApplication.status }
              : app
          )
        )
      }
    }
  }

  // Debug function to test RLS policies and permissions
  const debugApplicationPermissions = async (applicationId: string) => {
    console.log('🔍 DEBUGGING APPLICATION PERMISSIONS')
    console.log('='.repeat(50))
    
    try {
      // 1. Check current user
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 Current auth user:', user?.id)
      console.log('📧 User email:', user?.email)
      
      // 2. Check profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single()
      console.log('👤 User profile:', profile)
      
      // 3. Check employer
      const { data: employer } = await supabase
        .from('employers')
        .select('*')
        .eq('owner_id', user?.id)
        .single()
      console.log('🏢 User employer:', employer)
      
      // 4. Check employer members
      const { data: members } = await supabase
        .from('employer_members')
        .select('*')
        .eq('user_id', user?.id)
      console.log('👥 Employer memberships:', members)
      
      // 5. Check the specific application
      const { data: app } = await supabase
        .from('applications')
        .select('*')
        .eq('id', applicationId)
        .single()
      console.log('📄 Target application:', app)
      
      // 6. Check the job for this application
      if (app) {
        const { data: job } = await supabase
          .from('jobs')
          .select('*')
          .eq('id', app.job_id)
          .single()
        console.log('💼 Application job:', job)
        
        // 7. Check if employer owns this job
        if (job && employer) {
          console.log('🔗 Job belongs to employer?', job.employer_id === employer.id)
        }
      }
      
      // 8. Test direct update capability
      console.log('🧪 Testing direct update capability...')
      const { data: updateTest, error: updateError } = await supabase
        .from('applications')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', applicationId)
        .select()
      
      console.log('🧪 Update test result:', { updateTest, updateError })
      
    } catch (error) {
      console.error('❌ Debug function error:', error)
    }
    
    console.log('='.repeat(50))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'interviewed': return 'bg-purple-100 text-purple-800'
      case 'offered': return 'bg-green-100 text-green-800'
      case 'accepted': return 'bg-green-200 text-green-900'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatJobType = (type: string) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const formatSalary = (min: number | null | undefined, max: number | null | undefined) => {
    if (!min && !max) return 'Salary not specified'
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
    return 'Salary not specified'
  }

  // Check if user is employer
  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Loading...</h1>
          <p className="text-gray-600 mb-4">Loading user profile...</p>
        </div>
      </div>
    )
  }

  if (profile?.role !== 'employer') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only employers can view job applications.</p>
          <p className="text-sm text-gray-500 mb-4">
            Current role: {profile?.role || 'none'} | Profile ID: {profile?.id}
          </p>
          <Link to="/dashboard">
            <Button>Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
          <p className="text-gray-600">Manage applications for your job postings ({applications.length} total)</p>
          <p className="text-sm text-gray-500 mt-1">
            🤖 AI Match Scores help you identify the best candidates based on skills, experience, and job requirements.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="interviewed">Interviewed</option>
              <option value="offered">Offered</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Job
            </label>
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Jobs</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sort by
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Application Date</option>
              <option value="match_score">AI Match Score</option>
              <option value="name">Candidate Name</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <Button 
            onClick={() => {
              setStatusFilter('all')
              setJobFilter('all')
              setSortBy('date')
              loadApplications()
            }}
            variant="outline"
            size="sm"
          >
            Clear Filters
          </Button>
          <Button onClick={loadApplications} variant="outline" size="sm">
            Refresh
          </Button>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No applications found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {applications.length === 0 
                ? (jobFilter !== 'all' 
                    ? `No candidates have applied to this specific job yet.`
                    : 'No candidates have applied to your jobs yet.')
                : `Filters are hiding all ${applications.length} applications. Try adjusting your filters.`}
            </p>
            {applications.length === 0 && jobFilter !== 'all' && (
              <div className="mt-4">
                <p className="text-xs text-gray-400">Job ID: {jobFilter}</p>
                <Button 
                  onClick={() => setJobFilter('all')} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  View All Applications
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredApplications.map((application: Application) => (
              <div key={application.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    {/* Candidate Avatar */}
                    <div className="h-12 w-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="h-7 w-7 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>

                    {/* Application Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            <Link 
                              to={`/candidates/${application.candidate?.id}`}
                              className="hover:text-blue-600"
                            >
                              {application.candidate?.full_name || 'Unknown Candidate'}
                            </Link>
                          </h3>
                          <p className="text-sm text-gray-600">{application.candidate?.headline || ''}</p>
                          <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                            <span>Applied {formatDate(application.created_at)}</span>
                            {application.candidate?.location && (
                              <span className="flex items-center gap-1">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                {application.candidate.location}
                              </span>
                            )}
                            {application.candidate?.candidate_profiles?.years_experience && (
                              <span>{application.candidate.candidate_profiles.years_experience} years exp.</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                            {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                          </span>
                          {/* AI Match Score */}
                          {application.match_score !== undefined && (
                            <div className="flex items-center gap-1">
                              <svg className="h-4 w-4 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                              <span className={`text-xs font-semibold ${
                                application.match_score >= 80 ? 'text-green-600' :
                                application.match_score >= 60 ? 'text-yellow-600' :
                                application.match_score >= 40 ? 'text-orange-600' : 'text-red-600'
                              }`}>
                                {application.match_score}% Match
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Job Info */}
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-gray-900">
                                <Link to={`/jobs/${application.job?.id}`} className="hover:text-blue-600">
                                  {application.job?.title || 'Unknown Job'}
                                </Link>
                              </h4>
                              {application.job?.employer?.verified && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  ✓ Verified
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                              <span>{application.job?.job_type ? formatJobType(application.job.job_type) : 'Unknown Type'}</span>
                              <span>•</span>
                              <span>{application.job?.location || 'Unknown Location'}</span>
                              {application.job?.remote && (
                                <>
                                  <span>•</span>
                                  <span className="text-green-600">Remote OK</span>
                                </>
                              )}
                            </div>
                            
                            {application.job?.employer && (
                              <p className="text-sm text-gray-600 mt-1">
                                at <span className="font-medium">{application.job.employer.name}</span>
                                {application.job.employer.website && (
                                  <a 
                                    href={application.job.employer.website} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="ml-1 text-blue-600 hover:text-blue-800"
                                  >
                                    🌐
                                  </a>
                                )}
                              </p>
                            )}
                            
                            {(application.job?.salary_min || application.job?.salary_max) && (
                              <p className="text-sm text-gray-600 mt-1">
                                💰 {formatSalary(application.job.salary_min, application.job.salary_max)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Skills */}
                      {application.candidate?.candidate_profiles?.skills && application.candidate.candidate_profiles.skills.length > 0 && (
                        <div className="mt-3">
                          <div className="flex flex-wrap gap-1">
                            {application.candidate.candidate_profiles.skills.slice(0, 5).map((skill: string) => (
                              <span key={skill} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {skill}
                              </span>
                            ))}
                            {application.candidate.candidate_profiles.skills.length > 5 && (
                              <span className="text-xs text-gray-500">+{application.candidate.candidate_profiles.skills.length - 5} more</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Cover Letter */}
                      {application.cover_letter && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-700 line-clamp-2">{application.cover_letter}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="ml-4 flex flex-col gap-2">
                    <Link to={`/candidates/${application.candidate?.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Profile
                      </Button>
                    </Link>
                    
                    {application.candidate?.candidate_profiles?.resume_url && (
                      <a
                        href={application.candidate.candidate_profiles.resume_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="w-full">
                          View Resume
                        </Button>
                      </a>
                    )}

                    {/* Status Actions */}
                    <div className="flex flex-col gap-2 mt-3">
                      {application.status === 'pending' && (
                        <>
                          <Button
                            onClick={() => updateApplicationStatus(application.id, 'reviewed')}
                            size="sm"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Mark Reviewed
                          </Button>
                          <Button
                            onClick={() => updateApplicationStatus(application.id, 'rejected')}
                            variant="outline"
                            size="sm"
                            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {application.status === 'reviewed' && (
                        <>
                          <Button
                            onClick={() => updateApplicationStatus(application.id, 'interviewed')}
                            size="sm"
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            Schedule Interview
                          </Button>
                          <Button
                            onClick={() => updateApplicationStatus(application.id, 'rejected')}
                            variant="outline"
                            size="sm"
                            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </Button>
                        </>
                      )}
                      
                      {application.status === 'interviewed' && (
                        <>
                          <Button
                            onClick={() => updateApplicationStatus(application.id, 'offered')}
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                            </svg>
                            Make Offer
                          </Button>
                          <Button
                            onClick={() => updateApplicationStatus(application.id, 'rejected')}
                            variant="outline"
                            size="sm"
                            className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 font-medium py-2 px-3 rounded-md transition-colors duration-200 flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ApplicationsPage