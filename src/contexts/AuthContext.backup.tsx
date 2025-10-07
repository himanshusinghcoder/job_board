import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Profile, UserRole } from '@/types'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<{ user: User | null; error: AuthError | null }>
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: AuthError | null }>
  signOut: () => Promise<{ error: AuthError | null }>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  hasRole: (role: UserRole) => boolean
  isEmployer: boolean
  isCandidate: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch user profile
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching profile:', error)
        
        // If profile doesn't exist, try to create it
        if (error.code === 'PGRST116') {
          console.log('Profile not found, attempting to create...')
          const { data: currentUser } = await supabase.auth.getUser()
          if (currentUser.user) {
            console.log('Creating profile for user:', userId)
            
            // Try multiple approaches to create the profile
            let newProfile: Profile | null = null
            
            // Approach 1: Try the RPC function first
            try {
              console.log('Trying RPC function...')
              const { data: rpcProfile, error: rpcError } = await supabase
                .rpc('create_user_profile', {
                  user_id: userId,
                  user_role: 'candidate',
                  user_name: currentUser.user.email?.split('@')[0] || 'User'
                })
              
              if (!rpcError && rpcProfile) {
                console.log('RPC profile creation successful')
                newProfile = rpcProfile
              } else {
                console.log('RPC failed:', rpcError)
              }
            } catch (rpcErr) {
              console.log('RPC approach failed:', rpcErr)
            }
            
            // Approach 2: Direct insert if RPC failed
            if (!newProfile) {
              try {
                console.log('Trying direct insert...')
                const { data: insertProfile, error: insertError } = await supabase
                  .from('profiles')
                  .insert({
                    id: userId,
                    role: 'candidate',
                    full_name: currentUser.user.email?.split('@')[0] || 'User'
                  })
                  .select()
                  .single()
                
                if (!insertError && insertProfile) {
                  console.log('Direct insert successful')
                  newProfile = insertProfile as Profile
                } else {
                  console.log('Direct insert failed:', insertError)
                }
              } catch (insertErr) {
                console.log('Direct insert approach failed:', insertErr)
              }
            }
            
            // Return the created profile or null
            if (newProfile) {
              console.log('Profile created successfully:', newProfile.id)
              return newProfile
            } else {
              console.error('All profile creation methods failed')
            }
          }
        }
        return null
      }

      return data as Profile
    } catch (error) {
      console.error('Error fetching profile:', error)
      return null
    }
  }

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('No user logged in')

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)

    if (error) throw error

    // Update local profile state
    setProfile(prev => prev ? { ...prev, ...updates } : null)
  }

  // Auth methods
  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })

    // If user was created successfully but no error, check if profile exists
    if (data.user && !error) {
      try {
        // Check if profile was created by trigger
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        // If no profile exists, create one manually
        if (!existingProfile) {
          await supabase
            .from('profiles')
            .insert({
              id: data.user.id,
              role: (metadata?.role as UserRole) || 'candidate',
              full_name: metadata?.full_name || email.split('@')[0]
            })
        }
      } catch (profileError) {
        console.warn('Profile creation failed, but user was created:', profileError)
        // Don't return error here since user creation succeeded
      }
    }

    return { user: data.user, error }
  }

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { user: data.user, error }
  }

  const signOut = async () => {
    try {
      // Don't set loading during sign out as it interferes with navigation
      console.log('Starting sign out process...')
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      // Always clear all auth state, regardless of error
      setUser(null)
      setProfile(null)
      setSession(null)
      
      // Clear any localStorage items if they exist
      if (typeof window !== 'undefined') {
        localStorage.removeItem('supabase.auth.token')
        // Clear any other cached auth data
        const keys = Object.keys(localStorage)
        keys.forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      if (error) {
        console.error('Sign out error:', error)
        // Don't throw error, just log it since we cleared state anyway
      }
      
      console.log('Sign out completed successfully')
      return { error }
    } catch (error) {
      console.error('Sign out failed:', error)
      // Still clear all state on complete failure
      setUser(null)
      setProfile(null)
      setSession(null)
      return { error: error as any }
    }
  }

  // Role checking helpers
  const hasRole = (role: UserRole): boolean => {
    return profile?.role === role
  }

  const isEmployer = hasRole('employer')
  const isCandidate = hasRole('candidate')
  const isAdmin = hasRole('admin')

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        
        // Set a timeout to prevent infinite loading
        const timeoutId = setTimeout(() => {
          console.warn('Auth initialization timeout, setting loading to false')
          setLoading(false)
        }, 10000) // 10 second timeout
        
        // Get initial session
        const { data: { session: initialSession } } = await supabase.auth.getSession()
        
        // Clear the timeout since we got a response
        clearTimeout(timeoutId)
        
        if (initialSession?.user) {
          console.log('Found existing session for user:', initialSession.user.id)
          setUser(initialSession.user)
          setSession(initialSession)
          
          // Fetch user profile with timeout
          try {
            const userProfile = await Promise.race([
              fetchProfile(initialSession.user.id),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 5000))
            ])
            setProfile(userProfile as Profile)
          } catch (profileError) {
            console.error('Profile fetch failed or timed out:', profileError)
            setProfile(null)
          }
        } else {
          console.log('No existing session found')
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
      } finally {
        console.log('Auth initialization completed, setting loading to false')
        setLoading(false)
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Only fetch profile if we don't have one or it's a different user
          if (!profile || profile.id !== session.user.id) {
            try {
              const userProfile = await fetchProfile(session.user.id)
              setProfile(userProfile)
            } catch (error) {
              console.error('Failed to fetch profile on auth change:', error)
              setProfile(null)
            }
          }
        } else {
          // Clear profile when logged out
          setProfile(null)
        }
        
        // Always set loading to false after processing auth change
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const value: AuthContextType = {
    user,
    profile,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    hasRole,
    isEmployer,
    isCandidate,
    isAdmin
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}