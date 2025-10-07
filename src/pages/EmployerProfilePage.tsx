import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Button } from '../components/ui/Button'

interface EmployerFormData {
  name: string
  website: string
  logo_url: string
}

export function EmployerProfilePage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [employer, setEmployer] = useState<any>(null)
  
  const [employerForm, setEmployerForm] = useState<EmployerFormData>({
    name: '',
    website: '',
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
          .insert({
            ...profileData,
            owner_id: user.id
          })
        
        if (error) throw error
        setMessage('Company profile created successfully!')
        await loadEmployerProfile()
      }
      
    } catch (error) {
      console.error('Error updating employer profile:', error)
      setMessage('Error updating company profile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Only employers should access this page
  if (profile?.role !== 'employer') {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">Only employers can access company profile settings.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Company Profile Settings</h1>
        <p className="text-gray-600 mt-2">Manage your company information and branding</p>
      </div>
      
      {message && (
        <div className={`mb-6 p-4 rounded-md ${
          message.includes('Error') || message.includes('Failed') 
            ? 'bg-red-50 text-red-700 border border-red-200' 
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          {message}
        </div>
      )}

      {/* Company Profile Information */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
        </div>
        <form onSubmit={updateEmployerProfile} className="p-6 space-y-6">
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
              placeholder="Enter your company name"
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
              Company Logo URL
            </label>
            <input
              type="url"
              value={employerForm.logo_url}
              onChange={(e) => setEmployerForm(prev => ({ ...prev, logo_url: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://yourcompany.com/logo.png"
            />
            <p className="text-sm text-gray-500 mt-1">
              Add a direct link to your company logo image. Recommended size: 200x200px.
            </p>
          </div>

          {/* Logo Preview */}
          {employerForm.logo_url && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Logo Preview
              </label>
              <div className="flex items-center space-x-4">
                <img 
                  src={employerForm.logo_url} 
                  alt="Company logo preview" 
                  className="w-16 h-16 object-contain rounded-lg border border-gray-200"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                  }}
                />
                <div className="text-sm text-gray-500">
                  <p>Logo preview (actual size may vary)</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : employer ? 'Update Company Profile' : 'Create Company Profile'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      {/* Profile Status */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Profile Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              employer?.name ? 'bg-green-500' : 'bg-red-500'
            }`}></span>
            Company Name: {employer?.name ? 'Complete' : 'Required'}
          </div>
          <div className="flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              employer?.description ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            Description: {employer?.description ? 'Complete' : 'Recommended'}
          </div>
          <div className="flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              employer?.website ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            Website: {employer?.website ? 'Complete' : 'Recommended'}
          </div>
          <div className="flex items-center">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${
              employer?.logo_url ? 'bg-green-500' : 'bg-yellow-500'
            }`}></span>
            Logo: {employer?.logo_url ? 'Complete' : 'Recommended'}
          </div>
        </div>
        <p className="text-blue-700 text-sm mt-3">
          Complete all sections to make your company more attractive to candidates!
        </p>
      </div>
    </div>
  )
}