import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

interface CandidateProfile {
  id: string
  full_name: string
  headline: string | null
  location: string | null
  about: string | null
  role: string
  created_at: string
  candidate_profiles: {
    years_experience: number | null
    salary_min: number | null
    salary_max: number | null
    work_type: string[]
    skills: string[]
    resume_url: string | null
    visible: boolean
  } | null
}

export function CandidateProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()
  const [candidate, setCandidate] = useState<CandidateProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (id) {
      loadCandidateProfile()
    }
  }, [id])

  const loadCandidateProfile = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          candidate_profiles(*)
        `)
        .eq('id', id)
        .eq('role', 'candidate')
        .single()

      if (error) {
        console.error('Error loading candidate profile:', error)
        if (error.code === 'PGRST116') {
          setMessage('Candidate profile not found.')
        } else {
          setMessage('Error loading candidate profile.')
        }
        return
      }

      // Check if profile is visible (for non-owners)
      if (data.candidate_profiles && !data.candidate_profiles.visible && data.id !== profile?.id) {
        setMessage('This candidate profile is not publicly visible.')
        return
      }

      setCandidate(data)

    } catch (error) {
      console.error('Error loading candidate profile:', error)
      setMessage('An error occurred while loading the candidate profile.')
    } finally {
      setLoading(false)
    }
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Salary expectations not specified'
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
  }

  // Only employers should see candidate profiles
  if (profile?.role !== 'employer' && profile?.id !== id) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only employers can view candidate profiles.</p>
          <Link to="/jobs">
            <Button>Browse Jobs</Button>
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
          <p className="mt-2 text-sm text-gray-600">Loading candidate profile...</p>
        </div>
      </div>
    )
  }

  if (!candidate) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Candidate Not Found</h1>
          <p className="text-gray-600 mb-4">{message || 'The candidate profile you\'re looking for doesn\'t exist or is not available.'}</p>
          <Link to="/candidates">
            <Button>Back to Candidates</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start gap-6">
          <div className="h-24 w-24 bg-gray-300 rounded-full flex items-center justify-center">
            <svg className="h-12 w-12 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{candidate.full_name}</h1>
            {candidate.headline && (
              <p className="text-xl text-gray-600 mb-2">{candidate.headline}</p>
            )}
            <div className="flex items-center gap-4 text-gray-500">
              {candidate.location && (
                <div className="flex items-center gap-1">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  {candidate.location}
                </div>
              )}
              <span>Joined {new Date(candidate.created_at).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Link to="/candidates">
              <Button variant="outline">Back to Candidates</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* About */}
          {candidate.about && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{candidate.about}</p>
            </div>
          )}

          {/* Skills */}
          {candidate.candidate_profiles?.skills && candidate.candidate_profiles.skills.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills</h2>
              <div className="flex flex-wrap gap-2">
                {candidate.candidate_profiles.skills.map((skill) => (
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

          {/* Work Preferences */}
          {candidate.candidate_profiles?.work_type && candidate.candidate_profiles.work_type.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Work Preferences</h2>
              <div className="flex flex-wrap gap-2">
                {candidate.candidate_profiles.work_type.map((type) => (
                  <span
                    key={type}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 capitalize"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Professional Info */}
          {candidate.candidate_profiles && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Professional Info</h3>
              <div className="space-y-3 text-sm">
                {candidate.candidate_profiles.years_experience !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Experience:</span>
                    <span className="font-medium">{candidate.candidate_profiles.years_experience} years</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Salary Range:</span>
                  <span className="font-medium text-right">
                    {formatSalary(candidate.candidate_profiles.salary_min, candidate.candidate_profiles.salary_max)}
                  </span>
                </div>
                {candidate.candidate_profiles.resume_url && (
                  <div className="pt-2">
                    <a
                      href={candidate.candidate_profiles.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800"
                    >
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      View Resume
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Contact Actions */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
            <div className="space-y-2">
              <Button className="w-full">
                Contact Candidate
              </Button>
              <Button variant="outline" className="w-full">
                Add to Favorites
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}