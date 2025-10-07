import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

interface EmployerFormData {
  name: string
  website: string
  description: string
  location: string
  logo_url: string
}

export function EmployerProfilePageFull() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [employer, setEmployer] = useState<any>(null)
  
  const [employerForm, setEmployerForm] = useState<EmployerFormData>({
    name: '',
    website: '',
    description: '',
    location: '',
    logo_url: ''
  })

  useEffect(() => {
    if (profile?.role === 'employer') {
      loadEmployerProfile()
    }
  }, [profile])

  const loadEmployerProfile = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('employers')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading employer profile:', error)
        return
      }

      if (data) {
        setEmployer(data)
        setEmployerForm({
          name: data.name || '',
          website: data.website || '',
          description: data.description || '',
          location: data.location || '',
          logo_url: data.logo_url || ''
        })
      }
    } catch (error) {
      console.error('Unexpected error loading employer profile:', error)
    }
  }

  const updateEmployerProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage('')

    try {
      const profileData = {
        name: employerForm.name,
        website: employerForm.website,
        description: employerForm.description,
        location: employerForm.location,
        logo_url: employerForm.logo_url
      }
      
      if (employer) {
        // Update existing employer profile
        const { error } = await supabase
          .from('employers')
          .update(profileData)
          .eq('owner_id', user.id)
        
        if (error) throw error
        setMessage('Company profile updated successfully!')
      } else {
        // Create new employer profile
        const { error } = await supabase
          .from('employers')
          .insert({ ...profileData, owner_id: user.id })
          .single()
        
        if (error) throw error
        setMessage('Company profile created successfully!')
        loadEmployerProfile()
      }

    } catch (error) {
      console.error('Error updating employer profile:', error)
      setMessage('Error updating profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getCompletionStatus = () => {
    const fields = [employerForm.name, employerForm.website, employerForm.description, employerForm.location]
    const completed = fields.filter(field => field.trim() !== '').length
    return (completed / fields.length) * 100
  }

  if (profile?.role !== 'employer') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Access denied. This page is only available to employers.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
          <p className="text-gray-600 mt-1">
            Manage your company information and settings
          </p>
          
          {/* Profile Completion Status */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-700">Profile Completion</span>
              <span className="text-sm text-gray-500">{Math.round(getCompletionStatus())}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${getCompletionStatus()}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-6">
          {message && (
            <div className={`mb-6 p-4 rounded-lg ${
              message.includes('Error') 
                ? 'bg-red-50 border border-red-200 text-red-800' 
                : 'bg-green-50 border border-green-200 text-green-800'
            }`}>
              {message}
            </div>
          )}

          <form onSubmit={updateEmployerProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                required
                value={employerForm.name}
                onChange={(e) => setEmployerForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                value={employerForm.website}
                onChange={(e) => setEmployerForm(prev => ({ ...prev, website: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourcompany.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                type="text"
                value={employerForm.location}
                onChange={(e) => setEmployerForm(prev => ({ ...prev, location: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="San Francisco, CA"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Description
              </label>
              <textarea
                value={employerForm.description}
                onChange={(e) => setEmployerForm(prev => ({ ...prev, description: e.target.value }))}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Tell candidates about your company, mission, and culture..."
              />
              <p className="text-sm text-gray-500 mt-1">
                This description will be shown to candidates when they view your job postings.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Logo URL
              </label>
              <input
                type="url"
                value={employerForm.logo_url}
                onChange={(e) => setEmployerForm(prev => ({ ...prev, logo_url: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://yourcompany.com/logo.png"
              />
              {employerForm.logo_url && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Logo Preview:</p>
                  <img 
                    src={employerForm.logo_url} 
                    alt="Company logo preview" 
                    className="w-16 h-16 object-cover rounded border"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Saving...' : employer ? 'Update Profile' : 'Create Profile'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}