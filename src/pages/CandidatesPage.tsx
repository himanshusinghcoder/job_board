import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

interface Candidate {
  id: string
  full_name: string
  headline: string | null
  location: string | null
  about: string | null
  created_at: string
  candidate_profiles: {
    years_experience: number | null
    salary_min: number | null
    salary_max: number | null
    work_type: string[]
    skills: string[]
    visible: boolean
  } | null
}

export function CandidatesPage() {
  const { profile } = useAuth()
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [experienceFilter, setExperienceFilter] = useState<string>('')

  useEffect(() => {
    loadCandidates()
  }, [])

  const loadCandidates = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          candidate_profiles(*)
        `)
        .eq('role', 'candidate')
        .eq('candidate_profiles.visible', true)
        .not('candidate_profiles', 'is', null)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading candidates:', error)
      } else {
        setCandidates(data || [])
      }
    } catch (error) {
      console.error('Error loading candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = 
      candidate.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.headline?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      candidate.candidate_profiles?.skills?.some(skill => 
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      )

    const matchesSkill = !skillFilter || 
      candidate.candidate_profiles?.skills?.some(skill =>
        skill.toLowerCase().includes(skillFilter.toLowerCase())
      )

    const matchesLocation = !locationFilter || 
      candidate.location?.toLowerCase().includes(locationFilter.toLowerCase())

    const matchesExperience = !experienceFilter || 
      (candidate.candidate_profiles?.years_experience !== null &&
        candidate.candidate_profiles?.years_experience !== undefined &&
        checkExperienceRange(candidate.candidate_profiles.years_experience, experienceFilter))

    return matchesSearch && matchesSkill && matchesLocation && matchesExperience
  })

  const checkExperienceRange = (years: number, range: string) => {
    switch (range) {
      case '0-2': return years >= 0 && years <= 2
      case '3-5': return years >= 3 && years <= 5
      case '6-10': return years >= 6 && years <= 10
      case '10+': return years > 10
      default: return true
    }
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Salary not specified'
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
  }

  // Only employers should see candidates page
  if (profile?.role !== 'employer') {
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
          <p className="mt-2 text-sm text-gray-600">Loading candidates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidates</h1>
          <p className="text-gray-600">Discover talented professionals for your team</p>
        </div>
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
              placeholder="Name, title, skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label htmlFor="skill" className="block text-sm font-medium text-gray-700 mb-1">
              Skills
            </label>
            <input
              type="text"
              id="skill"
              placeholder="React, Python, etc..."
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
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
            <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
              Experience
            </label>
            <select
              id="experience"
              value={experienceFilter}
              onChange={(e) => setExperienceFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Any experience</option>
              <option value="0-2">0-2 years</option>
              <option value="3-5">3-5 years</option>
              <option value="6-10">6-10 years</option>
              <option value="10+">10+ years</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-600">
          Showing {filteredCandidates.length} of {candidates.length} candidates
        </p>
        {searchTerm || skillFilter || locationFilter || experienceFilter ? (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setSearchTerm('')
              setSkillFilter('')
              setLocationFilter('')
              setExperienceFilter('')
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      {/* Candidates list */}
      {filteredCandidates.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {candidates.length === 0 ? 'No candidates available' : 'No candidates match your filters'}
          </h3>
          <p className="text-gray-600">
            {candidates.length === 0 
              ? 'Check back later as new candidates join the platform.'
              : 'Try adjusting your search criteria to find more candidates.'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCandidates.map((candidate) => (
            <div key={candidate.id} className="bg-white rounded-lg shadow hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-gray-300 rounded-full flex items-center justify-center">
                      <svg className="h-6 w-6 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        <Link to={`/candidates/${candidate.id}`} className="hover:text-blue-600">
                          {candidate.full_name}
                        </Link>
                      </h3>
                      {candidate.headline && (
                        <p className="text-gray-600">{candidate.headline}</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {candidate.location && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      {candidate.location}
                    </div>
                  )}

                  {candidate.candidate_profiles && (
                    <>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {candidate.candidate_profiles.years_experience !== null && (
                          <span className="flex items-center gap-1">
                            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                            {candidate.candidate_profiles.years_experience} years exp.
                          </span>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {formatSalary(candidate.candidate_profiles.salary_min, candidate.candidate_profiles.salary_max)}
                        </span>
                      </div>

                      {candidate.candidate_profiles.skills.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {candidate.candidate_profiles.skills.slice(0, 5).map((skill) => (
                            <span
                              key={skill}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.candidate_profiles.skills.length > 5 && (
                            <span className="text-xs text-gray-500 py-0.5">
                              +{candidate.candidate_profiles.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="mt-6 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Joined {new Date(candidate.created_at).toLocaleDateString()}
                  </div>
                  <Link to={`/candidates/${candidate.id}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}