// Debug component to help identify auth loading issues
// Add this temporarily to see what's happening with auth state

import { useAuth } from '@/contexts/AuthContext'

export function AuthDebug() {
  const { user, profile, session, loading } = useAuth()

  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div className="fixed top-0 right-0 bg-black bg-opacity-75 text-white p-2 text-xs z-50 max-w-xs">
      <div><strong>Auth Debug:</strong></div>
      <div>Loading: {loading ? 'true' : 'false'}</div>
      <div>User: {user ? user.id.slice(0, 8) + '...' : 'null'}</div>
      <div>Profile: {profile ? profile.role : 'null'}</div>
      <div>Session: {session ? 'exists' : 'null'}</div>
      <div>Timestamp: {new Date().toLocaleTimeString()}</div>
    </div>
  )
}

// Add this to your Layout component temporarily:
// import { AuthDebug } from './path/to/AuthDebug'
// 
// And in your JSX:
// <AuthDebug />