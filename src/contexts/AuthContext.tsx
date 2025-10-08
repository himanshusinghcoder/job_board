import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User, AuthError } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { warmupDatabase } from '../lib/db-health'

// Simplified types for basic auth
export type UserRole = 'candidate' | 'employer' | 'admin'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ user: User | null; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Profile cache to avoid redundant fetches
  const profileCache = useRef<{ [userId: string]: Profile }>({})

  useEffect(() => {
    let mounted = true
    let timeoutId: NodeJS.Timeout

    const initializeAuth = async () => {
      try {
        // Warm up database connection early (don't wait for it)
        warmupDatabase().catch(err => console.warn('Database warmup failed:', err))

        // Set a timeout to prevent infinite loading
        timeoutId = setTimeout(() => {
          if (mounted) {
            console.warn('Auth initialization timeout - setting loading to false')
            setLoading(false)
          }
        }, 10000) // 10 second timeout

        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (!mounted) return

        if (error) {
          console.error('Error getting session:', error)
          setLoading(false)
          return
        }

        setUser(session?.user ?? null)
        
        if (session?.user) {
          await fetchProfile(session.user.id)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('Error in auth initialization:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, session?.user?.id)
      
      if (!mounted) return

      setUser(session?.user ?? null)
      
      if (session?.user) {
        await fetchProfile(session.user.id)
        
        // Handle automatic redirection for candidates after authentication
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          // Small delay to ensure profile is loaded
          setTimeout(() => {
            const currentPath = window.location.pathname
            const isAuthPage = currentPath.includes('/auth/') || currentPath === '/'
            
            // Only redirect if user is on auth pages or landing page
            if (isAuthPage) {
              console.log('🔄 Redirecting authenticated user to dashboard')
              window.location.href = '/dashboard'
            }
          }, 500)
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      subscription.unsubscribe()
    }
  }, [])

  const fetchProfile = async (userId: string) => {
    let profileTimeout: NodeJS.Timeout | undefined

    try {
      console.log('Fetching profile for user:', userId)
      
      // Check cache first for faster loading
      if (profileCache.current[userId]) {
        console.log('Using cached profile for user:', userId)
        setProfile(profileCache.current[userId])
        setLoading(false)
        return
      }
      
      // Create a timeout promise to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        profileTimeout = setTimeout(() => {
          reject(new Error('Profile fetch timeout'))
        }, 8000) // 8 second timeout for profile fetch
      })

      // Race between the actual fetch and timeout
      const fetchPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any

      if (profileTimeout) {
        clearTimeout(profileTimeout)
      }

      if (error) {
        console.error('Profile fetch error:', error)
        
        if (error.code === 'PGRST116') {
          console.log('Profile not found - attempting to create profile')
          
          // Get user data to extract metadata with timeout
          const userDataPromise = supabase.auth.getUser()
          const userTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('User data fetch timeout')), 5000)
          })

          try {
            const { data: userData } = await Promise.race([userDataPromise, userTimeoutPromise]) as any
            
            if (userData.user) {
              const role = userData.user.user_metadata?.role || 'candidate'
              const fullName = userData.user.user_metadata?.full_name || userData.user.email?.split('@')[0]
              
              console.log('Creating profile with role:', role, 'name:', fullName)
              
              // Try to create the profile with timeout
              const createPromise = supabase
                .from('profiles')
                .insert({
                  id: userId,
                  role: role as UserRole,
                  full_name: fullName
                })
                .select()
                .single()

              const createTimeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Profile create timeout')), 5000)
              })

              const { data: newProfile, error: createError } = await Promise.race([createPromise, createTimeoutPromise]) as any
              
              if (createError) {
                console.error('Error creating profile:', createError)
              } else {
                console.log('Profile created successfully:', newProfile)
                // Cache the new profile
                profileCache.current[userId] = newProfile
                setProfile(newProfile)
              }
            }
          } catch (userError) {
            console.error('Error getting user data for profile creation:', userError)
          }
        }
      } else {
        console.log('Profile fetched successfully:', data)
        // Cache the fetched profile
        profileCache.current[userId] = data
        setProfile(data)
      }
    } catch (err) {
      console.error('Unexpected error fetching profile:', err)
      if (err instanceof Error && err.message === 'Profile fetch timeout') {
        console.error('Profile fetch timed out - this may indicate database connectivity issues')
      }
    } finally {
      if (profileTimeout) {
        clearTimeout(profileTimeout)
      }
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    console.log('SignUp called with metadata:', metadata)
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata || {}
      }
    })

    console.log('SignUp result:', { user: data.user?.id, error })
    return { user: data.user, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('SignIn result:', { user: data.user?.id, error })
    return { user: data.user, error }
  }

  const signOut = async () => {
    // Clear profile cache on sign out
    profileCache.current = {}
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      loading,
      signUp,
      signIn,
      signOut
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}