import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

interface JobFormData {
  title: string
  description: string
  requirements: string
  location: string
  remote: boolean
  job_type: 'full-time' | 'part-time' | 'contract' | 'internship'
  salary_min: number | null
  salary_max: number | null
  skills_required: string[]
}

export function NewJobPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [skillInput, setSkillInput] = useState('')
  const [showEmployerSetup, setShowEmployerSetup] = useState(false)
  const [employerData, setEmployerData] = useState({
    name: '',
    website: '',
    description: ''
  })
  
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    description: '',
    requirements: '',
    location: '',
    remote: false,
    job_type: 'full-time',
    salary_min: null,
    salary_max: null,
    skills_required: []
  })

  // Only employers should be able to create jobs
  if (profile?.role !== 'employer') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only employers can create job postings.</p>
          <Button onClick={() => navigate('/jobs')}>
            Back to Jobs
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // First, check if user has an employer profile
      const { data: employers, error: employerError } = await supabase
        .from('employers')
        .select('id')
        .eq('owner_id', profile.id)

      if (employerError) {
        console.error('Error checking employer profile:', employerError)
        setMessage('Error checking your company profile. Please try again.')
        setLoading(false)
        return
      }

      if (!employers || employers.length === 0) {
        setMessage('You need to set up your company profile first. Please provide your company details.')
        setShowEmployerSetup(true)
        setLoading(false)
        return
      }

      const employer = employers[0]

      // Create the job
      const { data, error } = await supabase
        .from('jobs')
        .insert({
          employer_id: employer.id,
          title: formData.title,
          description: formData.description,
          requirements: formData.requirements,
          location: formData.location,
          remote: formData.remote,
          job_type: formData.job_type,
          salary_min: formData.salary_min,
          salary_max: formData.salary_max,
          skills_required: formData.skills_required
        })
        .select()

      if (error) {
        console.error('Error creating job:', error)
        setMessage(`Failed to create job: ${error.message}`)
      } else if (data && data.length > 0) {
        console.log('Job created successfully:', data[0])
        setMessage('Job created successfully!')
        
        // Navigate to the new job
        setTimeout(() => {
          navigate(`/jobs/${data[0].id}`)
        }, 1000)
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills_required.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills_required: [...prev.skills_required, skillInput.trim()]
      }))
      setSkillInput('')
    }
  }

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills_required: prev.skills_required.filter(s => s !== skill)
    }))
  }

  const handleInputChange = (field: keyof JobFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleEmployerSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // Create employer profile
      const { data, error } = await supabase
        .from('employers')
        .insert({
          owner_id: profile.id,
          name: employerData.name,
          website: employerData.website
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating employer profile:', error)
        setMessage(`Failed to create company profile: ${error.message}`)
      } else {
        console.log('Employer profile created successfully:', data)
        setMessage('Company profile created successfully! You can now create job postings.')
        setShowEmployerSetup(false)
        
        // Clear the employer setup form
        setEmployerData({ name: '', website: '', description: '' })
      }
    } catch (error) {
      console.error('Unexpected error:', error)
      setMessage('An unexpected error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Create New Job</h1>
        <p className="text-gray-600 mt-2">Post a new job to find the perfect candidate</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.includes('successfully') 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message}
        </div>
      )}

      {showEmployerSetup && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Set Up Company Profile</h2>
          <p className="text-blue-700 mb-4">Before creating jobs, please provide your company information.</p>
          
          <form onSubmit={handleEmployerSetup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={employerData.name}
                onChange={(e) => setEmployerData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your company name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-blue-900 mb-2">
                Website (Optional)
              </label>
              <input
                type="url"
                value={employerData.website}
                onChange={(e) => setEmployerData(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-3 py-2 border border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourcompany.com"
              />
            </div>

            <div className="flex gap-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Company Profile'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowEmployerSetup(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`space-y-6 ${showEmployerSetup ? 'opacity-50 pointer-events-none' : ''}`}>
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Job Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Senior Frontend Developer"
            />
          </div>

          {/* Job Type and Remote */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Job Type
              </label>
              <select
                value={formData.job_type}
                onChange={(e) => handleInputChange('job_type', e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Work Arrangement
              </label>
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="remote"
                    checked={!formData.remote}
                    onChange={() => handleInputChange('remote', false)}
                    className="mr-2"
                  />
                  On-site
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="remote"
                    checked={formData.remote}
                    onChange={() => handleInputChange('remote', true)}
                    className="mr-2"
                  />
                  Remote
                </label>
              </div>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location {!formData.remote && '*'}
            </label>
            <input
              type="text"
              required={!formData.remote}
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={formData.remote ? "Optional for remote positions" : "e.g. San Francisco, CA"}
            />
          </div>

          {/* Salary Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Salary Range (Annual USD)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="number"
                  value={formData.salary_min || ''}
                  onChange={(e) => handleInputChange('salary_min', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min salary"
                  min="0"
                />
              </div>
              <div>
                <input
                  type="number"
                  value={formData.salary_max || ''}
                  onChange={(e) => handleInputChange('salary_max', e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Max salary"
                  min="0"
                />
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Job Description *
            </label>
            <textarea
              required
              rows={6}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the role, responsibilities, and what the candidate will be working on..."
            />
          </div>

          {/* Requirements */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Requirements *
            </label>
            <textarea
              required
              rows={4}
              value={formData.requirements}
              onChange={(e) => handleInputChange('requirements', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="List the required skills, experience, education, and qualifications..."
            />
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Required Skills
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a skill (e.g. React, Python, etc.)"
              />
              <Button type="button" onClick={addSkill}>
                Add
              </Button>
            </div>
            
            {formData.skills_required.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills_required.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
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
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading}
            className="flex-1"
          >
            {loading ? 'Creating Job...' : 'Create Job'}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/jobs')}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}