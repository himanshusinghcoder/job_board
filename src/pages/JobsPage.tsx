import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

interface Job {
  id: string
  title: string
  description: string
  requirements: string
  location: string
  remote: boolean
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship'
  salary_min: number | null
  salary_max: number | null
  skills_required: string[]
  active: boolean
  created_at: string
  updated_at: string
  employer: {
    id: string
    name: string
    website: string | null
    verified: boolean
  }
}

export function JobsPage() {
  const { profile, user } = useAuth()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [jobTypeFilter, setJobTypeFilter] = useState<string>('')
  const [remoteFilter, setRemoteFilter] = useState<string>('')

  useEffect(() => {
    loadJobs()
  }, [profile])

  const loadJobs = async () => {
    try {
      setLoading(true)
      
      let query = supabase
        .from('jobs')
        .select(`
          *,
          employer:employers(id, name, website, verified)
        `)
        .eq('active', true)
        .order('created_at', { ascending: false })

      // If user is an employer, show their jobs (including inactive ones)
      if (profile?.role === 'employer') {
        // First get the employer profile
        const { data: employerData } = await supabase
          .from('employers')
          .select('id')
          .eq('owner_id', user?.id)
          .single()

        if (employerData) {
          query = supabase
            .from('jobs')
            .select(`
              *,
              employer:employers(id, name, website, verified)
            `)
            .eq('employer_id', employerData.id)
            .order('created_at', { ascending: false })
        }
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading jobs:', error)
      } else {
        setJobs(data || [])
      }
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = 
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.employer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.skills_required.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesLocation = !locationFilter || 
      job.location.toLowerCase().includes(locationFilter.toLowerCase())

    const matchesJobType = !jobTypeFilter || job.job_type === jobTypeFilter

    const matchesRemote = !remoteFilter || 
      (remoteFilter === 'remote' && job.remote) ||
      (remoteFilter === 'onsite' && !job.remote)

    return matchesSearch && matchesLocation && matchesJobType && matchesRemote
  })

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Salary not specified'
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
          <p className="mt-2 text-sm text-gray-600">Loading jobs...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {profile?.role === 'employer' ? 'My Jobs' : 'Jobs'}
          </h1>
          <p className="text-gray-600">
            {profile?.role === 'employer' 
              ? 'Manage your job postings' 
              : 'Find your next opportunity'
            }
          </p>
        </div>
        {profile?.role === 'employer' && (
          <Link to="/jobs/new">
            <Button>
              Create Job
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              id="search"
              placeholder="Job title, company, skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              id="location"
              placeholder="City, state, country..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="jobType" className="block text-sm font-medium text-gray-700 mb-1">
              Job Type
            </label>
            <select
              id="jobType"
              value={jobTypeFilter}
              onChange={(e) => setJobTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All types</option>
              <option value="full-time">Full Time</option>
              <option value="part-time">Part Time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          <div>
            <label htmlFor="remote" className="block text-sm font-medium text-gray-700 mb-1">
              Work Style
            </label>
            <select
              id="remote"
              value={remoteFilter}
              onChange={(e) => setRemoteFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All locations</option>
              <option value="remote">Remote</option>
              <option value="onsite">On-site</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </p>
        {searchTerm || locationFilter || jobTypeFilter || remoteFilter ? (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setLocationFilter('')
              setJobTypeFilter('')
              setRemoteFilter('')
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {/* Jobs list */}
      {filteredJobs.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0V6a2 2 0 012 2v6.414M16 6H8m0 0v-.172a2 2 0 00-.586-1.414l-2-2M8 6v6.414A2 2 0 01.586 14.828l-2 2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {jobs.length === 0 ? 'No jobs posted yet' : 'No jobs match your filters'}
          </h3>
          <p className="text-gray-600 mb-4">
            {profile?.role === 'employer' 
              ? 'Start by creating your first job posting to attract great candidates.'
              : 'Try adjusting your search criteria or check back later for new opportunities.'
            }
          </p>
          {profile?.role === 'employer' && jobs.length === 0 && (
            <Link to="/jobs/new">
              <Button>
                Create Your First Job
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div key={job.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-1">
                      <Link to={`/jobs/${job.id}`} className="hover:text-blue-600">
                        {job.title}
                      </Link>
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4z" clipRule="evenodd" />
                        </svg>
                        {job.employer.name}
                        {job.employer.verified && (
                          <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        )}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {job.location}
                        {job.remote && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                            Remote
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {formatJobType(job.job_type)}
                    </span>
                    {profile?.role === 'employer' && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        job.active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {job.active ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-gray-600 mb-4 line-clamp-2">
                  {job.description}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-2">
                    {job.skills_required.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                      >
                        {skill}
                      </span>
                    ))}
                    {job.skills_required.length > 4 && (
                      <span className="text-xs text-gray-500">
                        +{job.skills_required.length - 4} more
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-gray-900">
                      {formatSalary(job.salary_min, job.salary_max)}
                    </span>
                    <Link to={`/jobs/${job.id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}