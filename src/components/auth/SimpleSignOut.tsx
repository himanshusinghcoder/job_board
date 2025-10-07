// Simple, reliable sign out component
// This bypasses potential loading state issues

import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { useState } from 'react'

export function SimpleSignOut() {
  const [signing, setSigning] = useState(false)

  const handleSignOut = async () => {
    if (signing) return
    
    setSigning(true)
    console.log('SimpleSignOut: Starting...')
    
    // Fallback timeout to prevent getting stuck
    const fallbackTimeout = setTimeout(() => {
      console.log('SimpleSignOut: Fallback timeout triggered')
      window.location.href = '/'
    }, 3000) // 3 second fallback
    
    try {
      console.log('SimpleSignOut: Calling supabase.auth.signOut()')
      
      // Use signOut with scope: 'local' to ensure it works
      const { error } = await supabase.auth.signOut({ scope: 'local' })
      
      if (error) {
        console.error('SimpleSignOut: Supabase error:', error)
      } else {
        console.log('SimpleSignOut: Supabase sign out completed successfully')
      }
      
      // Clear localStorage regardless of supabase result
      if (typeof window !== 'undefined') {
        console.log('SimpleSignOut: Clearing localStorage')
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            console.log('SimpleSignOut: Removing key:', key)
            localStorage.removeItem(key)
          }
        })
        
        // Also clear session storage
        const sessionKeys = Object.keys(sessionStorage)
        sessionKeys.forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            sessionStorage.removeItem(key)
          }
        })
      }
      
      console.log('SimpleSignOut: Redirecting to home page')
      clearTimeout(fallbackTimeout)
      
      // Force redirect immediately
      window.location.replace('/')
      
    } catch (error) {
      console.error('SimpleSignOut: Unexpected error:', error)
      clearTimeout(fallbackTimeout)
      // Force redirect on any error
      window.location.replace('/')
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={signing}
    >
      {signing ? 'Signing Out...' : 'Sign Out'}
    </Button>
  )
}