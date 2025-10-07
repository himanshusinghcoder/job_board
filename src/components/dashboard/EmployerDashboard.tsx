import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface Job {
  id: string
  title: string
  description: string
  location: string
  remote: boolean
  job_type: string
  salary_min: number | null
  salary_max: number | null
  active: boolean
  created_at: string
  applications_count?: number
}

interface Candidate {
  id: string
  full_name: string
  headline: string
  location: string
  candidate_profiles?: {
    years_experience: number
    skills: string[]
    visible: boolean
  }
}

interface Stats {
  activeJobs: number
  totalApplications: number
  aiMatchedCandidates: number
  scheduledInterviews: number
}

export function EmployerDashboard() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [stats, setStats] = useState<Stats>({
    activeJobs: 0,
    totalApplications: 0,
    aiMatchedCandidates: 0,
    scheduledInterviews: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [user])

  const loadDashboardData = async () => {
    if (!user) return

    try {
      setLoading(true)

      // First get the employer profile
      const { data: employer } = await supabase
        .from('employers')
        .select('id')
        .eq('owner_id', user.id)
        .single()

      if (!employer) {
        setLoading(false)
        return
      }

      // Load recent jobs
      const { data: jobsData } = await supabase
        .from('jobs')
        .select(`
          *,
          applications(count)
        `)
        .eq('employer_id', employer.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Load top candidates (simplified for now - in real app would use AI matching)
      const { data: candidatesData } = await supabase
        .from('profiles')
        .select(`
          *,
          candidate_profiles(*)
        `)
        .eq('role', 'candidate')
        .not('candidate_profiles', 'is', null)
        .limit(5)

      // Calculate stats
      const { data: allJobs } = await supabase
        .from('jobs')
        .select('id, active')
        .eq('employer_id', employer.id)

      const { data: allApplications } = await supabase
        .from('applications')
        .select('id')
        .in('job_id', (allJobs || []).map(j => j.id))

      const activeJobsCount = (allJobs || []).filter(j => j.active).length
      const applicationsCount = (allApplications || []).length

      setJobs(jobsData || [])
      setCandidates(candidatesData || [])
      setStats({
        activeJobs: activeJobsCount,
        totalApplications: applicationsCount,
        aiMatchedCandidates: (candidatesData || []).length,
        scheduledInterviews: 0 // TODO: implement interviews table
      })

    } catch (error) {
      console.error('Error loading dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Not specified'
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
  }

  const formatJobType = (type: string) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Employer Dashboard</h1>
        <Link to="/jobs/new">
          <Button>Post New Job</Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Active Jobs</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.activeJobs}</p>
          <p className="text-sm text-gray-500 mt-1">Currently published</p>
        </div>
        <Link to="/applications" className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <h3 className="text-lg font-medium text-gray-900">Applications</h3>
          <p className="text-3xl font-bold text-green-600">{stats.totalApplications}</p>
          <p className="text-sm text-gray-500 mt-1">Click to manage</p>
        </Link>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Candidates</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.aiMatchedCandidates}</p>
          <p className="text-sm text-gray-500 mt-1">AI-matched profiles</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Interviews</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.scheduledInterviews}</p>
          <p className="text-sm text-gray-500 mt-1">Scheduled this week</p>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Recent Job Postings</h2>
            <Link to="/jobs">
              <Button variant="outline" size="sm">Manage All</Button>
            </Link>
          </div>
        </div>
        <div className="p-6">
          {jobs.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6.414M16 6H8m0 0v-.172a2 2 0 00-.586-1.414l-2-2M8 6v6.414A2 2 0 01.586 14.828l-2 2" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No job postings yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Start by posting your first job to attract qualified candidates.
              </p>
              <Link to="/jobs/new" className="mt-4 inline-block">
                <Button>Post Your First Job</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="font-medium text-gray-900">
                        <Link to={`/jobs/${job.id}`} className="hover:text-blue-600">
                          {job.title}
                        </Link>
                      </h4>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        job.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {job.active ? 'Active' : 'Inactive'}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {formatJobType(job.job_type)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {job.location}
                        {job.remote && (
                          <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Remote
                          </span>
                        )}
                      </span>
                      <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                      <Link to={`/applications?job=${job.id}`} className="text-green-600 hover:text-green-800">
                        {job.applications_count || 0} applications
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                    {(job.applications_count || 0) > 0 && (
                      <Link to={`/applications?job=${job.id}`}>
                        <Button size="sm">
                          View Applications
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* AI-Matched Candidates */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Top AI-Matched Candidates</h2>
            <Link to="/candidates">
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          </div>
        </div>
        <div className="p-6">
          {candidates.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">No candidate matches yet</h3>
              <p className="mt-2 text-sm text-gray-500">
                Post jobs to start finding AI-matched candidates for your positions.
              </p>
              <Link to="/candidates" className="mt-4 inline-block">
                <Button variant="outline">Browse Candidates</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {candidates.map((candidate) => (
                <div key={candidate.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        <Link to={`/candidates/${candidate.id}`} className="hover:text-blue-600">
                          {candidate.full_name}
                        </Link>
                      </h4>
                      <p className="text-sm text-gray-600">{candidate.headline}</p>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {candidate.location}
                        </span>
                        {candidate.candidate_profiles && (
                          <>
                            <span>{candidate.candidate_profiles.years_experience} years exp.</span>
                            <span>{candidate.candidate_profiles.skills.slice(0, 3).join(', ')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link to={`/candidates/${candidate.id}`}>
                      <Button variant="outline" size="sm">
                        View Profile
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}