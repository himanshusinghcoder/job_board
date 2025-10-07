import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
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
    owner_id: string
  }
}

interface Application {
  id: string
  status: 'pending' | 'reviewed' | 'interviewed' | 'offered' | 'accepted' | 'rejected'
  cover_letter: string | null
  created_at: string
}

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [job, setJob] = useState<Job | null>(null)
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [showApplicationForm, setShowApplicationForm] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (id) {
      loadJobDetails()
    }
  }, [id, user])

  const loadJobDetails = async () => {
    try {
      setLoading(true)

      // Load job details with employer info
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          *,
          employer:employers(*)
        `)
        .eq('id', id)
        .single()

      if (jobError) {
        console.error('Error loading job:', jobError)
        if (jobError.code === 'PGRST116') {
          setMessage('Job not found.')
        } else {
          setMessage('Error loading job details.')
        }
        return
      }

      setJob(jobData)

      // If user is a candidate, check if they've already applied
      if (user && profile?.role === 'candidate') {
        const { data: applicationData } = await supabase
          .from('applications')
          .select('*')
          .eq('job_id', id)
          .eq('candidate_id', user.id)
          .single()

        if (applicationData) {
          setApplication(applicationData)
        }
      }

    } catch (error) {
      console.error('Error loading job details:', error)
      setMessage('An error occurred while loading job details.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !job) return

    try {
      setApplying(true)
      setMessage('')

      const { data, error } = await supabase
        .from('applications')
        .insert({
          job_id: job.id,
          candidate_id: user.id,
          cover_letter: coverLetter.trim() || null
        })
        .select()
        .single()

      if (error) {
        console.error('Error applying for job:', error)
        setMessage('Failed to submit application. Please try again.')
      } else {
        setApplication(data)
        setShowApplicationForm(false)
        setMessage('Application submitted successfully!')
      }
    } catch (error) {
      console.error('Error applying for job:', error)
      setMessage('An error occurred while submitting your application.')
    } finally {
      setApplying(false)
    }
  }

  const toggleJobStatus = async () => {
    if (!job) return

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ active: !job.active })
        .eq('id', job.id)

      if (error) {
        console.error('Error updating job status:', error)
        setMessage('Failed to update job status.')
      } else {
        setJob({ ...job, active: !job.active })
        setMessage(`Job ${job.active ? 'deactivated' : 'activated'} successfully.`)
      }
    } catch (error) {
      console.error('Error updating job status:', error)
      setMessage('An error occurred while updating job status.')
    }
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Salary not specified'
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
  }

  const formatJobType = (type: string) => {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
  }

  const getApplicationStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'reviewed': return 'bg-blue-100 text-blue-800'
      case 'interviewed': return 'bg-purple-100 text-purple-800'
      case 'offered': return 'bg-green-100 text-green-800'
      case 'accepted': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading job details...</p>
        </div>
      </div>
    )
  }

  if (!job) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Job Not Found</h1>
          <p className="text-gray-600 mb-4">{message || 'The job you\'re looking for doesn\'t exist or has been removed.'}</p>
          <Link to="/jobs">
            <Button>Back to Jobs</Button>
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = profile?.role === 'employer' && job.employer.owner_id === user?.id
  const canApply = profile?.role === 'candidate' && job.active && !application

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                job.active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {job.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="flex items-center gap-6 text-gray-600 mb-4">
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-6a1 1 0 00-1-1H9a1 1 0 00-1 1v6a1 1 0 01-1 1H4a1 1 0 110-2V4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{job.employer.name}</span>
                {job.employer.verified && (
                  <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                <span>{job.location}</span>
                {job.remote && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    Remote
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {formatJobType(job.job_type)}
              </span>
              <span className="text-lg font-semibold text-gray-900">
                {formatSalary(job.salary_min, job.salary_max)}
              </span>
              <span className="text-sm text-gray-500">
                Posted {new Date(job.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {isOwner ? (
              <>
                <Button onClick={toggleJobStatus} variant="outline">
                  {job.active ? 'Deactivate Job' : 'Activate Job'}
                </Button>
                <Link to={`/jobs/${job.id}/edit`}>
                  <Button variant="outline" className="w-full">
                    Edit Job
                  </Button>
                </Link>
              </>
            ) : canApply ? (
              <Button onClick={() => setShowApplicationForm(true)}>
                Apply Now
              </Button>
            ) : application ? (
              <div className="text-center">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getApplicationStatusColor(application.status)}`}>
                  Application {application.status}
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Applied {new Date(application.created_at).toLocaleDateString()}
                </p>
              </div>
            ) : !user ? (
              <Link to="/auth/signin">
                <Button>Sign In to Apply</Button>
              </Link>
            ) : profile?.role === 'employer' ? (
              <span className="text-sm text-gray-500">Employer view</span>
            ) : (
              <span className="text-sm text-gray-500">Not accepting applications</span>
            )}
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-md ${
            message.includes('success') || message.includes('successfully') 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </div>

      {/* Application Form */}
      {showApplicationForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Apply for this position</h3>
          <form onSubmit={handleApply}>
            <div className="mb-4">
              <label htmlFor="coverLetter" className="block text-sm font-medium text-gray-700 mb-2">
                Cover Letter (Optional)
              </label>
              <textarea
                id="coverLetter"
                rows={5}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Tell the employer why you're interested in this position and what makes you a great fit..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={applying}>
                {applying ? 'Submitting...' : 'Submit Application'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowApplicationForm(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Job Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Job Description</h2>
            <div className="prose prose-gray max-w-none">
              <p className="whitespace-pre-wrap">{job.description}</p>
            </div>
          </div>

          {/* Requirements */}
          {job.requirements && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Requirements</h2>
              <div className="prose prose-gray max-w-none">
                <p className="whitespace-pre-wrap">{job.requirements}</p>
              </div>
            </div>
          )}

          {/* Skills Required */}
          {job.skills_required.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills Required</h2>
              <div className="flex flex-wrap gap-2">
                {job.skills_required.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Company Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">About {job.employer.name}</h3>
            <div className="space-y-3">
              {job.employer.website && (
                <div>
                  <span className="block text-sm font-medium text-gray-500 mb-1">Website</span>
                  <a
                    href={job.employer.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm break-all"
                  >
                    {job.employer.website}
                  </a>
                </div>
              )}
              <div>
                <span className="block text-sm font-medium text-gray-500 mb-1">Company Status</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  job.employer.verified 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {job.employer.verified ? 'Verified Company' : 'Unverified'}
                </span>
              </div>
            </div>
          </div>

          {/* Job Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Job Type:</span>
                <span className="font-medium">{formatJobType(job.job_type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Location:</span>
                <span className="font-medium">{job.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Remote:</span>
                <span className="font-medium">{job.remote ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Salary:</span>
                <span className="font-medium">{formatSalary(job.salary_min, job.salary_max)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Posted:</span>
                <span className="font-medium">{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link to="/jobs" className="block">
                <Button variant="outline" className="w-full">
                  Back to Jobs
                </Button>
              </Link>
              {profile?.role === 'candidate' && (
                <Link to="/profile" className="block">
                  <Button variant="outline" className="w-full">
                    Update Profile
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}