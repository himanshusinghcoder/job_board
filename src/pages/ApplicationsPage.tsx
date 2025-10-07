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
      resume_url: string | null
      visible?: boolean
    } | null
  }
}

export function ApplicationsPage() {
  const { profile } = useAuth()
  const [searchParams] = useSearchParams()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [jobFilter, setJobFilter] = useState<string>(searchParams.get('job') || 'all')
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

  // Basic client-side filtering for now
  const filteredApplications = applications.filter(app => {
    if (statusFilter !== 'all' && app.status !== statusFilter) {
      return false
    }
    if (jobFilter !== 'all' && app.job.id !== jobFilter) {
      return false
    }
    return true
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

      if (employerError || !employer) {
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

      if (jobsError) {
        console.error('Error fetching employer jobs:', jobsError)
        setApplications([])
        setLoading(false)
        return
      }

      if (!employerJobs || employerJobs.length === 0) {
        setApplications([])
        setLoading(false)
        return
      }

      const jobIds = employerJobs.map(job => job.id)

      // Step 4: Filter applications for this employer's jobs
      const employerApplications = allApplications?.filter(app => 
        jobIds.includes(app.job_id)
      ) || []

      if (employerApplications.length === 0) {
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
        .select('user_id, years_experience, skills, resume_url, visible')
        .in('user_id', uniqueCandidateIds)

      if (candidateExtraError) {
        console.error('Error fetching candidate extra profiles:', candidateExtraError)
      }

      // Step 8: Fetch job details
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



        return {
          id: app.id,
          status: app.status,
          cover_letter: app.cover_letter,
          created_at: app.created_at,
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
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId)

      if (error) throw error

      // Refresh applications
      loadApplications()
    } catch (error) {
      console.error('Error updating application status:', error)
    }
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
      {/* Debug Info */}
      <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
        <strong>Debug:</strong> Total: {applications.length}, Filtered: {filteredApplications.length}, 
        Loading: {loading ? 'yes' : 'no'}, Role: {profile?.role || 'none'}
      </div>
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
          <p className="text-gray-600">Manage applications for your job postings ({applications.length} total)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        <div className="mt-4 flex gap-2">
          <Button 
            onClick={() => {
              setStatusFilter('all')
              setJobFilter('all')
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
                ? 'No candidates have applied to your jobs yet.'
                : `Filters are hiding all ${applications.length} applications. Try adjusting your filters.`}
            </p>
            <div className="mt-2 text-xs text-gray-400">
              Debug: Total: {applications.length}, Filtered: {filteredApplications.length}, Status: "{statusFilter}", Job: "{jobFilter}"
            </div>
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

                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                        </span>
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
                    <div className="flex flex-col gap-1 mt-2">
                      {application.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateApplicationStatus(application.id, 'reviewed')}
                            className="text-xs text-blue-600 hover:text-blue-800"
                          >
                            Mark Reviewed
                          </button>
                          <button
                            onClick={() => updateApplicationStatus(application.id, 'rejected')}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      {application.status === 'reviewed' && (
                        <>
                          <button
                            onClick={() => updateApplicationStatus(application.id, 'interviewed')}
                            className="text-xs text-purple-600 hover:text-purple-800"
                          >
                            Schedule Interview
                          </button>
                          <button
                            onClick={() => updateApplicationStatus(application.id, 'rejected')}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      {application.status === 'interviewed' && (
                        <>
                          <button
                            onClick={() => updateApplicationStatus(application.id, 'offered')}
                            className="text-xs text-green-600 hover:text-green-800"
                          >
                            Make Offer
                          </button>
                          <button
                            onClick={() => updateApplicationStatus(application.id, 'rejected')}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Reject
                          </button>
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