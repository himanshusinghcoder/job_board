// Custom hook for sign out functionality
// This provides a consistent sign out experience across the app

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export const useSignOut = () => {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async (redirectTo: string = '/') => {
    if (isSigningOut) return

    setIsSigningOut(true)
    console.log('useSignOut: Starting sign out process...')
    
    try {
      const { error } = await signOut()
      
      if (error) {
        console.error('Sign out error:', error)
      }
      
      console.log('useSignOut: Navigating to:', redirectTo)
      
      // Use setTimeout to ensure auth state is cleared before navigation
      setTimeout(() => {
        navigate(redirectTo, { replace: true })
        setIsSigningOut(false)
      }, 100)
      
    } catch (error) {
      console.error('Sign out failed:', error)
      // Force navigation even on complete failure
      setTimeout(() => {
        navigate(redirectTo, { replace: true })
        setIsSigningOut(false)
      }, 100)
    }
  }

  return {
    signOut: handleSignOut,
    isSigningOut
  }
}