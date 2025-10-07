import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { CandidateProfile, WorkType, JobType } from '../types'

interface ProfileFormData {
  full_name: string
  headline: string
  location: string
  about: string
}

interface CandidateFormData {
  years_experience: number | null
  salary_min: number | null
  salary_max: number | null
  work_type: WorkType[]
  job_type: JobType[]
  skills: string[]
  visible: boolean
}

export function ProfileSettingsPage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfile | null>(null)
  
  const [profileForm, setProfileForm] = useState<ProfileFormData>({
    full_name: '',
    headline: '',
    location: '',
    about: ''
  })
  
  const [candidateForm, setCandidateForm] = useState<CandidateFormData>({
    years_experience: null,
    salary_min: null,
    salary_max: null,
    work_type: [],
    job_type: [],
    skills: [],
    visible: true
  })

  const [skillInput, setSkillInput] = useState('')

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || '',
        headline: profile.headline || '',
        location: profile.location || '',
        about: profile.about || ''
      })
      
      // Only load candidate profile if user is a candidate and we have a user
      if (profile.role === 'candidate' && user) {
        loadCandidateProfile()
      }
    }
  }, [profile, user])

  const loadCandidateProfile = async () => {
    if (!user) return
    
    try {
      // Add timeout to prevent hanging
      const fetchPromise = supabase
        .from('candidate_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Candidate profile fetch timeout')), 5000)
      })

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any
      
      if (error) {
        // Handle different types of errors gracefully
        if (error.code === 'PGRST116') {
          // No candidate profile found - this is ok, user hasn't created one yet
          console.log('No candidate profile found for user - this is normal for new users')
        } else if (error.code === 'PGRST205') {
          // Table doesn't exist - this means the schema migration hasn't been run
          console.warn('candidate_profiles table not found - please run step2-add-missing-tables.sql')
        } else {
          console.error('Error loading candidate profile:', error)
        }
        return
      }
      
      if (data) {
        setCandidateProfile(data)
        setCandidateForm({
          years_experience: data.years_experience,
          salary_min: data.salary_min,
          salary_max: data.salary_max,
          work_type: data.work_type || [],
          job_type: [],
          skills: data.skills || [],
          visible: data.visible
        })
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Candidate profile fetch timeout') {
        console.warn('Candidate profile fetch timed out - this may indicate database performance issues')
      } else {
        console.error('Unexpected error loading candidate profile:', error)
      }
    }
  }

  const updateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !profile) return

    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          headline: profileForm.headline,
          location: profileForm.location,
          about: profileForm.about
        })
        .eq('id', user.id)

      if (error) throw error
      setMessage('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      setMessage('Error updating profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const updateCandidateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || profile?.role !== 'candidate') return

    setLoading(true)
    setMessage('')

    try {
      const profileData = {
        user_id: user.id,
        years_experience: candidateForm.years_experience,
        salary_min: candidateForm.salary_min,
        salary_max: candidateForm.salary_max,
        work_type: candidateForm.work_type,
        skills: candidateForm.skills,
        visible: candidateForm.visible
      }

      if (candidateProfile) {
        const { error } = await supabase
          .from('candidate_profiles')
          .update(profileData)
          .eq('user_id', user.id)
        
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('candidate_profiles')
          .insert(profileData)
        
        if (error) throw error
        await loadCandidateProfile()
      }
      
      setMessage('Candidate profile updated successfully!')
    } catch (error) {
      console.error('Error updating candidate profile:', error)
      setMessage('Error updating candidate profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (skillInput.trim() && !candidateForm.skills.includes(skillInput.trim())) {
      setCandidateForm(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }))
      setSkillInput('')
    }
  }

  const removeSkill = (skillToRemove: string) => {
    setCandidateForm(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }))
  }

  const handleWorkTypeChange = (workType: WorkType) => {
    setCandidateForm(prev => ({
      ...prev,
      work_type: prev.work_type.includes(workType)
        ? prev.work_type.filter(wt => wt !== workType)
        : [...prev.work_type, workType]
    }))
  }

  const handleJobTypeChange = (jobType: JobType) => {
    setCandidateForm(prev => ({
      ...prev,
      job_type: prev.job_type.includes(jobType)
        ? prev.job_type.filter(jt => jt !== jobType)
        : [...prev.job_type, jobType]
    }))
  }

  if (!user || !profile) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-600">Please sign in to view your profile.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
      
      {message && (
        <div className={`p-4 rounded-md ${message.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* Basic Profile Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
        </div>
        <form onSubmit={updateProfile} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profileForm.full_name}
              onChange={(e) => setProfileForm(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your full name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Professional Headline
            </label>
            <input
              type="text"
              value={profileForm.headline}
              onChange={(e) => setProfileForm(prev => ({ ...prev, headline: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., Senior Software Developer"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              value={profileForm.location}
              onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., San Francisco, CA"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              About
            </label>
            <textarea
              value={profileForm.about}
              onChange={(e) => setProfileForm(prev => ({ ...prev, about: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Tell us about yourself..."
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Candidate-specific profile */}
      {profile.role === 'candidate' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Candidate Details</h2>
          </div>
          <form onSubmit={updateCandidateProfile} className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Years of Experience
                </label>
                <input
                  type="number"
                  value={candidateForm.years_experience || ''}
                  onChange={(e) => setCandidateForm(prev => ({ 
                    ...prev, 
                    years_experience: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="50"
                />
              </div>
              
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={candidateForm.visible}
                    onChange={(e) => setCandidateForm(prev => ({ ...prev, visible: e.target.checked }))}
                    className="mr-2"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Make profile visible to employers
                  </span>
                </label>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Salary ($)
                </label>
                <input
                  type="number"
                  value={candidateForm.salary_min || ''}
                  onChange={(e) => setCandidateForm(prev => ({ 
                    ...prev, 
                    salary_min: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Salary ($)
                </label>
                <input
                  type="number"
                  value={candidateForm.salary_max || ''}
                  onChange={(e) => setCandidateForm(prev => ({ 
                    ...prev, 
                    salary_max: e.target.value ? parseInt(e.target.value) : null 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Work Location
              </label>
              <div className="flex flex-wrap gap-2 mb-4">
                {(['onsite', 'remote', 'hybrid'] as WorkType[]).map((workType) => (
                  <label key={workType} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={candidateForm.work_type.includes(workType)}
                      onChange={() => handleWorkTypeChange(workType)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {workType}
                    </span>
                  </label>
                ))}
              </div>
              
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preferred Job Types
              </label>
              <div className="flex flex-wrap gap-2">
                {(['full-time', 'part-time', 'contract', 'internship'] as JobType[]).map((jobType) => (
                  <label key={jobType} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={candidateForm.job_type.includes(jobType)}
                      onChange={() => handleJobTypeChange(jobType)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {jobType.replace('-', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skills
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a skill..."
                />
                <button
                  type="button"
                  onClick={addSkill}
                  className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {candidateForm.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Candidate Profile'}
            </button>
          </form>
        </div>
      )}

      {/* Account Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Account Information</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <p className="text-gray-900">{user.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <p className="text-gray-900 capitalize">{profile.role}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <p className="text-gray-900">
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}