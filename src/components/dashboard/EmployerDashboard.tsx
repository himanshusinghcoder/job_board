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

interface EmployerProfile {
  id: string
  name: string
  website?: string
  logo_url?: string
  verified: boolean
  created_at: string
}

interface Stats {
  activeJobs: number
  totalApplications: number
  aiMatchedCandidates: number
  scheduledInterviews: number
}

// AI Matching Algorithm for candidates
function calculateCandidateJobMatch(candidateProfile: any, job: any): number {
  if (!candidateProfile) return 0
  
  let score = 0
  
  // Skills match (40% weight)
  if (candidateProfile.skills && job.skills) {
    const matchingSkills = candidateProfile.skills.filter((candidateSkill: string) =>
      job.skills.some((jobSkill: string) =>
        candidateSkill.toLowerCase().includes(jobSkill.toLowerCase()) ||
        jobSkill.toLowerCase().includes(candidateSkill.toLowerCase())
      )
    )
    const skillScore = job.skills.length > 0 ? (matchingSkills.length / job.skills.length) * 40 : 0
    score += skillScore
  }

  // Experience level match (25% weight)
  if (candidateProfile.years_experience !== null && job.experience_level) {
    let expScore = 0
    const years = candidateProfile.years_experience
    
    switch (job.experience_level) {
      case 'entry':
        expScore = years <= 2 ? 25 : Math.max(0, 25 - (years - 2) * 5)
        break
      case 'mid':
        expScore = years >= 2 && years <= 7 ? 25 : Math.max(0, 25 - Math.abs(4.5 - years) * 3)
        break
      case 'senior':
        expScore = years >= 5 ? 25 : Math.max(0, 25 - (5 - years) * 5)
        break
      case 'lead':
      case 'executive':
        expScore = years >= 8 ? 25 : Math.max(0, 25 - (8 - years) * 3)
        break
    }
    score += expScore
  }

  // Work type match (20% weight)
  if (candidateProfile.work_type && job.work_type) {
    if (candidateProfile.work_type.includes(job.work_type)) {
      score += 20
    }
  }

  // Base compatibility score (15% weight)
  score += 15

  return Math.round(Math.min(100, score))
}

export function EmployerDashboard() {
  const { user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [employerProfile, setEmployerProfile] = useState<EmployerProfile | null>(null)
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
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!employer) {
        setLoading(false)
        return
      }

      setEmployerProfile(employer)

      // Load recent jobs
      const { data: jobsData } = await supabase
        .from('jobs')
        .select('*')
        .eq('employer_id', employer.id)
        .order('created_at', { ascending: false })
        .limit(5)

      // Load all applications for these jobs in a single query
      const jobIds = (jobsData || []).map(job => job.id)
      console.log('Loading applications for job IDs:', jobIds)
      
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('job_id')
        .in('job_id', jobIds)
      
      console.log('Applications data:', applicationsData)
      console.log('Applications error:', appsError)

      // Count applications for each job
      const applicationCounts: Record<string, number> = {}
      if (applicationsData) {
        applicationsData.forEach(app => {
          applicationCounts[app.job_id] = (applicationCounts[app.job_id] || 0) + 1
        })
      }

      // Add application counts to jobs
      const processedJobs = (jobsData || []).map(job => ({
        ...job,
        applications_count: applicationCounts[job.id] || 0
      }))
      
      console.log('Processed jobs with counts:', processedJobs)

      // Load top candidates with AI matching
      const { data: candidatesData } = await supabase
        .from('profiles')
        .select(`
          *,
          candidate_profiles(years_experience, skills, work_type, visible)
        `)
        .eq('role', 'candidate')
        .not('candidate_profiles', 'is', null)
        .eq('candidate_profiles.visible', true)
        .limit(20) // Get more candidates to score and rank

      // Calculate AI match scores for each candidate against employer's jobs
      const candidatesWithScores = (candidatesData || []).map(candidate => {
        const candidateProfile = candidate.candidate_profiles?.[0]
        if (!candidateProfile || !jobsData || jobsData.length === 0) {
          return {
            ...candidate,
            match_score: 0,
            best_matching_job: null
          }
        }

        // Find the best matching job for this candidate
        let bestScore = 0
        let bestJobTitle = null
        
        jobsData.forEach(job => {
          const score = calculateCandidateJobMatch(candidateProfile, job)
          if (score > bestScore) {
            bestScore = score
            bestJobTitle = job.title
          }
        })

        return {
          ...candidate,
          match_score: bestScore,
          best_matching_job: bestJobTitle,
          candidate_profiles: candidateProfile
        }
      })

      // Sort by match score and take top 5
      const topMatchedCandidates = candidatesWithScores
        .filter(candidate => candidate.match_score > 30) // Only show decent matches
        .sort((a, b) => (b.match_score || 0) - (a.match_score || 0))
        .slice(0, 5)

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

      setJobs(processedJobs || [])
      setStats({
        activeJobs: activeJobsCount,
        totalApplications: applicationsCount,
        aiMatchedCandidates: topMatchedCandidates?.length || 0,
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
        <div className="flex gap-3">
          <Link to="/company-profile">
            <Button variant="outline">Edit Company Profile</Button>
          </Link>
          <Link to="/jobs/new">
            <Button>Post New Job</Button>
          </Link>
        </div>
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

      {/* Company Information */}
      {employerProfile && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
              <Link to="/company-profile">
                <Button variant="outline" size="sm">Edit Profile</Button>
              </Link>
            </div>
          </div>
          <div className="p-6">
            <div className="flex items-start space-x-6">
              {employerProfile.logo_url ? (
                <img 
                  src={employerProfile.logo_url} 
                  alt={`${employerProfile.name} logo`}
                  className="w-16 h-16 rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-gray-500 text-xl font-bold">
                    {employerProfile.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{employerProfile.name}</h3>
                {employerProfile.website && (
                  <p className="text-sm text-blue-600 mt-1">
                    <a href={employerProfile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {employerProfile.website}
                    </a>
                  </p>
                )}
                <div className="flex items-center space-x-4 mt-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {employerProfile.verified ? 'Verified' : 'Unverified'}
                  </span>
                  {employerProfile.website && (
                    <a 
                      href={employerProfile.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Visit Website
                    </a>
                  )}
                </div>
                <p className="text-gray-700 mt-3 text-sm leading-relaxed">
                  Created on {new Date(employerProfile.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  )
}