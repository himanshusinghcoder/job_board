import { Outlet, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { SignOutButton } from '@/components/auth/SignOutButton'


export function Layout() {
  const { user, profile } = useAuth()



  const navigation = [
    { name: 'Dashboard', href: '/dashboard', roles: ['candidate', 'employer', 'admin'] },
    { name: 'Jobs', href: '/jobs', roles: ['candidate', 'employer', 'admin'] },
    { name: 'Candidates', href: '/candidates', roles: ['employer', 'admin'] },
    { name: 'Applications', href: '/applications', roles: ['employer', 'admin'] },
    { name: 'Admin', href: '/admin', roles: ['admin'] },
  ]

  const filteredNavigation = navigation.filter(item => 
    !item.roles || item.roles.includes(profile?.role || '')
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="text-2xl font-bold text-gray-900">
                JobFinder
              </Link>
              
              <nav className="hidden md:ml-6 md:flex md:space-x-8">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                Welcome, {profile?.full_name || user?.email}
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                  {profile?.role}
                </span>
              </div>
              
              <Link to="/profile">
                <Button variant="ghost" size="sm">
                  Profile
                </Button>
              </Link>
              
              <SignOutButton variant="ghost" size="sm">
                Sign Out
              </SignOutButton>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}