import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { format } from 'date-fns'

export function CandidateApplicationsPage() {
  const { profile } = useAuth()

  const { data: applications, isLoading, error } = useQuery({
    queryKey: ['candidateApplications', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return []

      console.log('🔍 Fetching applications for candidate:', profile.id)

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          created_at,
          updated_at,
          cover_letter,
          jobs (
            id,
            title,
            description,
            location,
            salary_min,
            salary_max,
            remote,
            employers (
              id,
              name,
              logo_url
            )
          )
        `)
        .eq('candidate_id', profile.id)
        .order('created_at', { ascending: false })

      console.log('📊 Applications query result:', { applications: data?.length, error })

      if (error) {
        console.error('❌ Applications query error:', error)
        throw error
      }

      return data || []
    },
    enabled: !!profile?.id && profile.role === 'candidate'
  })

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      case 'reviewed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
          </svg>
        )
      case 'interviewed':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        )
      case 'offered':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      case 'rejected':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="outline">← Back to Dashboard</Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        </div>
        
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-1/3 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/5"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="outline">← Back to Dashboard</Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-red-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Error Loading Applications</h3>
            <p className="mt-2 text-sm text-gray-500">
              {error.message || 'Unable to load your applications. Please try again later.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/dashboard">
            <Button variant="outline">← Back to Dashboard</Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>{applications?.length || 0} total applications</span>
        </div>
      </div>

      {applications && applications.length > 0 ? (
        <div className="space-y-4">
          {applications.map((application) => {
            const job = Array.isArray(application.jobs) ? application.jobs[0] : application.jobs
            const employer = job?.employers && Array.isArray(job.employers) ? job.employers[0] : job?.employers
            
            const getEmployerName = () => {
              if (!employer) return 'Unknown Company'
              if (typeof employer === 'object' && 'name' in employer) return employer.name
              return 'Unknown Company'
            }

            return (
              <div key={application.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{job?.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(application.status)}`}>
                          {getStatusIcon(application.status)}
                          <span className="ml-1">{application.status.charAt(0).toUpperCase() + application.status.slice(1)}</span>
                        </span>
                      </div>
                      
                      <p className="text-gray-600 mb-1">{getEmployerName()}</p>
                      <p className="text-sm text-gray-500 mb-2">{job?.location}</p>
                      
                      {job?.salary_min && job?.salary_max && (
                        <p className="text-sm text-gray-600 mb-2">
                          ${job.salary_min.toLocaleString()} - ${job.salary_max.toLocaleString()}
                        </p>
                      )}
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Applied: {format(new Date(application.created_at), 'MMM d, yyyy')}</span>
                        {application.updated_at !== application.created_at && (
                          <span>Updated: {format(new Date(application.updated_at), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <Link to={`/applications/${application.id}`}>
                        <Button size="sm">View Details</Button>
                      </Link>
                      <Link to={`/jobs/${job?.id}`}>
                        <Button variant="outline" size="sm">View Job</Button>
                      </Link>
                    </div>
                  </div>
                  
                  {application.cover_letter && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Cover Letter Preview</h4>
                      <p className="text-sm text-gray-600 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {application.cover_letter.length > 200 
                          ? `${application.cover_letter.substring(0, 200)}...` 
                          : application.cover_letter
                        }
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-12">
          <div className="text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-medium text-gray-900">No Applications Yet</h3>
            <p className="mt-2 text-sm text-gray-500">
              You haven't applied to any jobs yet. Start by browsing available positions.
            </p>
            <div className="mt-6">
              <Link to="/jobs">
                <Button>Browse Jobs</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}