import { useAuth } from '@/contexts/AuthContext'
import { CandidateDashboard } from '@/components/dashboard/CandidateDashboard'
import { EmployerDashboard } from '@/components/dashboard/EmployerDashboard'

export function DashboardPage() {
  const { profile } = useAuth()

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  switch (profile.role) {
    case 'candidate':
      return <CandidateDashboard />
    case 'employer':
      return <EmployerDashboard />
    case 'admin':
      return <AdminDashboard />
    default:
      return (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to JobFinder</h1>
          <p className="mt-2 text-gray-600">Your dashboard will appear here once your profile is set up.</p>
        </div>
      )
  }
}

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Total Users</h3>
          <p className="text-3xl font-bold text-blue-600">1,234</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Active Jobs</h3>
          <p className="text-3xl font-bold text-green-600">456</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900">Applications</h3>
          <p className="text-3xl font-bold text-purple-600">2,890</p>
        </div>
      </div>
    </div>
  )
}