import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

export function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const { data: application, isLoading, error } = useQuery({
    queryKey: ['application', id],
    queryFn: async () => {
      if (!id) throw new Error('Application ID is required')

      console.log('🔍 Fetching application details for ID:', id)

      // First, get the application with job details
      const { data: applicationData, error: appError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          cover_letter,
          candidate_id,
          jobs (
            id,
            title,
            description,
            location,
            salary_min,
            salary_max,
            remote,
            skills_required,
            employers (
              id,
              name,
              description,
              logo_url
            )
          )
        `)
        .eq('id', id)
        .single()

      console.log('📊 Application query result:', { applicationData, appError })

      if (appError) {
        console.error('❌ Application query error:', appError)
        throw appError
      }
      if (!applicationData) {
        console.error('❌ No application data found')
        throw new Error('Application not found')
      }

      console.log('👤 Fetching candidate profile for user_id:', applicationData.candidate_id)

      // Then, get the candidate profile separately using the candidate_id
      const { data: candidateProfile, error: candidateError } = await supabase
        .from('candidate_profiles')
        .select(`
          full_name,
          email,
          phone,
          skills,
          years_experience,
          resume_url
        `)
        .eq('user_id', applicationData.candidate_id)
        .single()

      console.log('📊 Candidate profile query result:', { candidateProfile, candidateError })

      // Don't throw error if candidate profile doesn't exist - it's optional
      if (candidateError && candidateError.code !== 'PGRST116') {
        console.warn('⚠️ Could not fetch candidate profile:', candidateError)
      }

      // Combine the data
      const result = {
        ...applicationData,
        candidate_profiles: candidateProfile || null
      }

      console.log('✅ Final application data:', result)
      return result
    },
    enabled: !!id
  })

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    )
  }

  if (error || !application) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(-1)}>
            ← Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Application Not Found</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">
            {error?.message || 'The application you are looking for does not exist or you do not have permission to view it.'}
          </p>
        </div>
      </div>
    )
  }

  const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs
  const employer = job?.employers && Array.isArray(job.employers) ? job.employers[0] : job?.employers
  const candidate = application.candidate_profiles // Now it's a single object, not an array
  
  // Helper to get employer name safely
  const getEmployerName = () => {
    if (!employer) return 'Unknown Company'
    if (typeof employer === 'object' && 'name' in employer) return employer.name
    return 'Unknown Company'
  }
  
  const isCandidate = profile?.role === 'candidate'
  const isOwnApplication = isCandidate && application.candidate_id === profile?.id

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'interviewed': return 'bg-purple-100 text-purple-800'
      case 'offered': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(-1)}>
          ← Back
        </Button>
        <h1 className="text-3xl font-bold text-gray-900">Application Details</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Application Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{job?.title}</h2>
                <p className="text-gray-600">{getEmployerName()}</p>
                <p className="text-sm text-gray-500">{job?.location}</p>
              </div>
              <div className="text-right">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(application.status)}`}>
                  {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                </span>
                {job?.salary_min && job?.salary_max && (
                  <p className="text-sm text-gray-600 mt-1">
                    ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between text-sm text-gray-500 mb-4">
                <span>Applied: {format(new Date(application.created_at), 'MMM d, yyyy')}</span>
                <span>Updated: {format(new Date(application.updated_at), 'MMM d, yyyy')}</span>
              </div>

              <Link to={`/jobs/${job?.id}`}>
                <Button variant="outline" size="sm">View Full Job Description</Button>
              </Link>
            </div>
          </div>

          {/* Application Materials */}
          {(application.cover_letter || candidate?.resume_url) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Materials</h3>
              
              {application.cover_letter && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-900 mb-2">Cover Letter</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700 whitespace-pre-wrap">{application.cover_letter}</p>
                  </div>
                </div>
              )}

              {candidate?.resume_url && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Resume</h4>
                  <a 
                    href={candidate.resume_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:text-blue-700"
                  >
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8.5L18 5.5V18a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm4 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1zm1 3a1 1 0 100 2h2a1 1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                    View Resume
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Candidate Information (for employers) */}
          {!isCandidate && candidate && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Candidate Information</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-sm font-medium text-gray-500">Name</span>
                  <p className="text-gray-900">{candidate.full_name}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Email</span>
                  <p className="text-gray-900">{candidate.email}</p>
                </div>
                {candidate.phone && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Phone</span>
                    <p className="text-gray-900">{candidate.phone}</p>
                  </div>
                )}
                {candidate.years_experience && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Experience</span>
                    <p className="text-gray-900">{candidate.years_experience} years</p>
                  </div>
                )}
                {candidate.skills && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Skills</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {candidate.skills.map((skill: string) => (
                        <span key={skill} className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-700">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Application Timeline */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Application Timeline</h3>
            <div className="space-y-3">
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <div>
                  <p className="font-medium">Application Submitted</p>
                  <p className="text-gray-500">{format(new Date(application.created_at), 'MMM d, yyyy - h:mm a')}</p>
                </div>
              </div>
              {application.updated_at !== application.created_at && (
                <div className="flex items-center text-sm">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <div>
                    <p className="font-medium">Status Updated</p>
                    <p className="text-gray-500">{format(new Date(application.updated_at), 'MMM d, yyyy - h:mm a')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {isOwnApplication && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
              <div className="space-y-3">
                <Link to={`/jobs/${job?.id}`} className="block">
                  <Button variant="outline" className="w-full">View Job Posting</Button>
                </Link>
                <Link to="/my-applications" className="block">
                  <Button variant="outline" className="w-full">All My Applications</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}