import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(() => {
    // Handle the auth callback (email verification, etc.)
    const handleAuthCallback = async () => {
      console.log('🔄 Handling auth callback...')
      
      // Wait a moment for auth state to settle
      setTimeout(() => {
        if (user) {
          console.log('✅ User verified, redirecting to dashboard')
          navigate('/dashboard', { replace: true })
        } else {
          console.log('❌ No user found, redirecting to sign in')
          navigate('/auth/signin', { replace: true })
        }
      }, 1000)
    }

    handleAuthCallback()
  }, [user, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Verifying your account...
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we confirm your email verification.
          </p>
        </div>
      </div>
    </div>
  )
}